import { exec } from "child_process";
import { promisify } from "util";
import path from "path";
import type { CreatorProfile, VideoInfo, ProgressEvent } from "./types";

const execAsync = promisify(exec);

const PYTHON_BIN =
  process.env.TIKTOK_PYTHON ||
  "/opt/homebrew/opt/yt-dlp/libexec/bin/python3";
const FETCH_SCRIPT = path.join(process.cwd(), "scripts", "fetch_tiktok_html.py");

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

interface YtDlpVideoJson {
  id: string;
  title?: string;
  thumbnail?: string;
  timestamp?: number;
  thumbnails?: { id?: string; url: string }[];
}

async function fetchProfileHtml(username: string): Promise<string> {
  const url = `https://www.tiktok.com/@${username}`;
  const { stdout } = await execAsync(
    `"${PYTHON_BIN}" "${FETCH_SCRIPT}" "${url}"`,
    { encoding: "utf-8", timeout: 20000, maxBuffer: 20 * 1024 * 1024 }
  );
  return stdout;
}

async function fetchProfileInfo(username: string) {
  const html = await fetchProfileHtml(username);

  const scriptMatch = html.match(
    new RegExp('<script id="__UNIVERSAL_DATA_FOR_REHYDRATION__"[^>]*>([\\s\\S]*?)</script>')
  );
  if (!scriptMatch) return null;

  const data = JSON.parse(scriptMatch[1]);
  const userInfo = data?.["__DEFAULT_SCOPE__"]?.["webapp.user-detail"]?.userInfo;
  if (!userInfo) return null;

  const user = userInfo.user;
  const stats = userInfo.stats;

  const bio = (user.signature || "") as string;
  const emailMatch = bio.match(/[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}/);

  return {
    username: user.uniqueId as string,
    nickname: user.nickname as string,
    avatar: (user.avatarLarger || user.avatarMedium || user.avatarThumb || "") as string,
    followerCount: (stats.followerCount || 0) as number,
    followingCount: (stats.followingCount || 0) as number,
    heartCount: (stats.heartCount || stats.heart || 0) as number,
    videoCount: (stats.videoCount || 0) as number,
    verified: Boolean(user.verified),
    privateAccount: Boolean(user.privateAccount ?? user.secret),
    userId: (user.id || "") as string,
    bio,
    email: emailMatch ? emailMatch[0] : null,
  };
}

async function runYtDlp(username: string): Promise<string> {
  const { stdout } = await execAsync(
    `yt-dlp --flat-playlist --dump-json --impersonate chrome "https://www.tiktok.com/@${username}" --playlist-items 1:10 2>/dev/null`,
    { encoding: "utf-8", timeout: 30000, maxBuffer: 10 * 1024 * 1024 }
  );
  return stdout;
}

async function fetchVideosWithYtDlp(username: string): Promise<VideoInfo[]> {
  let stdout = "";
  for (let attempt = 0; attempt < 2; attempt++) {
    try {
      stdout = await runYtDlp(username);
      if (stdout.trim()) break;
    } catch {
      // retry
    }
    if (attempt === 0) await delay(1000 + Math.random() * 1000);
  }

  if (!stdout.trim()) return [];

  const lines = stdout.trim().split("\n").filter(Boolean);
  return lines
    .map((line) => {
      try {
        const d: YtDlpVideoJson = JSON.parse(line);
        const originCover = d.thumbnails?.find((t) => t.id === "originCover")?.url;
        const cover = d.thumbnails?.find((t) => t.id === "cover")?.url;
        return {
          id: d.id,
          cover: cover || originCover || d.thumbnail || "",
          title: d.title || "",
          createTime: d.timestamp || 0,
        };
      } catch {
        return null;
      }
    })
    .filter((v): v is VideoInfo => v !== null);
}

const MAX_RETRIES = 2;

export async function fetchSingleProfile(
  username: string,
  onProgress: (event: ProgressEvent) => void
): Promise<CreatorProfile | null> {
  onProgress({ type: "status", username, step: "프로필 조회 중..." });
  const t1 = Date.now();

  let profile = await fetchProfileInfo(username).catch(() => null);

  for (let attempt = 1; !profile && attempt <= MAX_RETRIES; attempt++) {
    const waitMs = 1000 + Math.random() * 1000;
    onProgress({ type: "status", username, step: `프로필 재시도 ${attempt}/${MAX_RETRIES} (${Math.round(waitMs / 1000)}초 대기)...` });
    await delay(waitMs);
    profile = await fetchProfileInfo(username).catch(() => null);
  }

  const profileMs = Date.now() - t1;

  if (!profile) {
    onProgress({ type: "status", username, step: `프로필 실패 (${profileMs}ms)` });
    return null;
  }
  onProgress({ type: "status", username, step: `프로필 완료 (${profileMs}ms), 영상 조회 중...` });

  const t2 = Date.now();
  const recentVideos = await fetchVideosWithYtDlp(username);
  const videoMs = Date.now() - t2;

  onProgress({
    type: "status",
    username,
    step: `완료 — 프로필 ${profileMs}ms + 영상 ${recentVideos.length}개 ${videoMs}ms`,
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
