import type { CreatorProfile, VideoInfo, ProgressEvent } from "./types";

const USER_AGENTS = [
  "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/131.0.0.0 Safari/537.36",
  "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/131.0.0.0 Safari/537.36",
  "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/18.2 Safari/605.1.15",
  "Mozilla/5.0 (Windows NT 10.0; Win64; x64; rv:134.0) Gecko/20100101 Firefox/134.0",
  "Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/131.0.0.0 Safari/537.36",
];

function randomUA() {
  return USER_AGENTS[Math.floor(Math.random() * USER_AGENTS.length)];
}

function delay(ms: number) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

function extractUsername(input: string): string | null {
  const trimmed = input.trim();
  if (trimmed.startsWith("@")) return trimmed.slice(1);
  const match = trimmed.match(/tiktok\.com\/@([a-zA-Z0-9_.]+)/);
  return match ? match[1] : null;
}

export function extractUsernames(inputs: string[]): string[] {
  const usernames = inputs.map(extractUsername).filter(Boolean) as string[];
  return [...new Set(usernames)];
}

async function fetchProfileAndVideos(username: string): Promise<{
  profile: {
    username: string;
    nickname: string;
    avatar: string;
    followerCount: number;
    userId: string;
  };
  videos: VideoInfo[];
} | null> {
  const url = `https://www.tiktok.com/@${username}`;
  const res = await fetch(url, {
    headers: {
      "User-Agent": randomUA(),
      Accept: "text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8",
      "Accept-Language": "en-US,en;q=0.9",
    },
    signal: AbortSignal.timeout(15000),
  });

  if (!res.ok) return null;
  const html = await res.text();

  const scriptMatch = html.match(
    new RegExp('<script id="__UNIVERSAL_DATA_FOR_REHYDRATION__"[^>]*>([\\s\\S]*?)</script>')
  );
  if (!scriptMatch) return null;

  const data = JSON.parse(scriptMatch[1]);
  const userDetail = data?.["__DEFAULT_SCOPE__"]?.["webapp.user-detail"];
  const userInfo = userDetail?.userInfo;
  if (!userInfo) return null;

  const user = userInfo.user;
  const stats = userInfo.stats;

  // Extract videos from the same HTML data
  const videos: VideoInfo[] = [];
  try {
    const itemList = userDetail?.itemList;
    if (Array.isArray(itemList)) {
      for (const item of itemList.slice(0, 10)) {
        const cover = item.video?.cover || item.video?.originCover || "";
        videos.push({
          id: item.id || "",
          cover,
          title: item.desc || "",
          createTime: item.createTime || 0,
        });
      }
    }
  } catch {
    // ignore video parse errors
  }

  return {
    profile: {
      username: user.uniqueId as string,
      nickname: user.nickname as string,
      avatar: (user.avatarLarger || user.avatarMedium || user.avatarThumb || "") as string,
      followerCount: (stats.followerCount || 0) as number,
      userId: (user.id || "") as string,
    },
    videos,
  };
}

const MAX_RETRIES = 2;

export async function fetchSingleProfile(
  username: string,
  onProgress: (event: ProgressEvent) => void
): Promise<CreatorProfile | null> {
  onProgress({ type: "status", username, step: "프로필 조회 중..." });
  const t1 = Date.now();

  let result = await fetchProfileAndVideos(username).catch(() => null);

  for (let attempt = 1; !result && attempt <= MAX_RETRIES; attempt++) {
    const waitMs = 1000 + Math.random() * 1000;
    onProgress({ type: "status", username, step: `재시도 ${attempt}/${MAX_RETRIES} (${Math.round(waitMs / 1000)}초 대기)...` });
    await delay(waitMs);
    result = await fetchProfileAndVideos(username).catch(() => null);
  }

  const elapsed = Date.now() - t1;

  if (!result) {
    onProgress({ type: "status", username, step: `실패 (${elapsed}ms, ${MAX_RETRIES}회 재시도 후)` });
    return null;
  }

  const { profile, videos: recentVideos } = result;

  onProgress({
    type: "status",
    username,
    step: `완료 — ${elapsed}ms, 영상 ${recentVideos.length}개`,
  });

  const lastPostDate =
    recentVideos.length > 0 && recentVideos[0].createTime > 0
      ? new Date(recentVideos[0].createTime * 1000).toISOString()
      : null;

  return {
    ...profile,
    url: `https://www.tiktok.com/@${profile.username}`,
    uniqueUrl: profile.userId
      ? `https://www.tiktok.com/@${profile.userId}`
      : `https://www.tiktok.com/@${profile.username}`,
    recentVideos,
    lastPostDate,
  };
}
