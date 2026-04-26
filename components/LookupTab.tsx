"use client";

import { useState, useCallback, useMemo } from "react";
import type { CreatorProfile } from "@/lib/types";
import FilterBar from "./FilterBar";
import CreatorList from "./CreatorList";

export default function LookupTab() {
  const [urlText, setUrlText] = useState("");
  const [loading, setLoading] = useState(false);
  const [totalLookupCount, setTotalLookupCount] = useState(0);
  const [allProfiles, setAllProfiles] = useState<CreatorProfile[]>([]);
  const [failedPopupUrls, setFailedPopupUrls] = useState<string[] | null>(null);
  const [selectedUsernames, setSelectedUsernames] = useState<Set<string>>(new Set());
  const [followerMin, setFollowerMin] = useState("");
  const [inactiveDays, setInactiveDays] = useState("");
  const [fewVideos, setFewVideos] = useState(false);
  const [copied, setCopied] = useState(false);
  const [selectAll, setSelectAll] = useState(false);

  const handleLookup = useCallback(async () => {
    const urls = urlText.split("\n").map((l) => l.trim()).filter(Boolean);
    if (urls.length === 0) return;

    setLoading(true);
    setAllProfiles([]);
    setSelectedUsernames(new Set());
    setTotalLookupCount(urls.length);
    const failedUrls: string[] = [];

    try {
      const res = await fetch("/api/lookup", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ urls }),
      });

      const reader = res.body?.getReader();
      if (!reader) throw new Error("No reader");

      const decoder = new TextDecoder();
      let buffer = "";

      while (true) {
        const { done, value } = await reader.read();
        if (done) break;

        buffer += decoder.decode(value, { stream: true });
        const parts = buffer.split("\n\n");
        buffer = parts.pop() || "";

        for (const part of parts) {
          const dataLines = part.split("\n").filter((l) => l.startsWith("data: "));
          for (const dataLine of dataLines) {
            const dataStr = dataLine.slice(6).trim();
            if (!dataStr) continue;
            try {
              const event = JSON.parse(dataStr);
              if (event.type === "status") {
                // 프로그레스 바로 표시되므로 별도 처리 불필요
              } else if (event.type === "profile" && event.profile) {
                if (event.total) setTotalLookupCount(event.total);
                setAllProfiles((prev) => [...prev, event.profile]);
                // 전체선택 모드면 새로 들어오는 프로필도 자동 선택
                setSelectAll((cur) => {
                  if (cur) {
                    setSelectedUsernames((prev) => new Set([...prev, event.profile.username]));
                  }
                  return cur;
                });
              } else if (event.type === "error") {
                if (event.total) setTotalLookupCount(event.total);
                failedUrls.push(`https://www.tiktok.com/@${event.username}`);
              } else if (event.type === "done") {
                // 완료 처리
              }
            } catch { /* ignore */ }
          }
        }
      }

      if (failedUrls.length > 0) setFailedPopupUrls(failedUrls);
      setUrlText("");
    } catch {
      alert("조회 중 오류가 발생했습니다");
    } finally {
      setLoading(false);
    }
  }, [urlText]);

  const { visibleProfiles, hiddenCount } = useMemo(() => {
    const hidden = { follower: 0, inactive: 0 };
    const visible = allProfiles.filter((p) => {
      if (followerMin && p.followerCount < Number(followerMin)) { hidden.follower++; return false; }
      if (inactiveDays && p.lastPostDate) {
        const daysSincePost = Math.floor((Date.now() - new Date(p.lastPostDate).getTime()) / (1000 * 60 * 60 * 24));
        if (daysSincePost > Number(inactiveDays)) { hidden.inactive++; return false; }
      }
      if (inactiveDays && !p.lastPostDate) { hidden.inactive++; return false; }
      if (fewVideos && (p.recentVideos?.length || 0) < 10) { hidden.follower++; return false; }
      return true;
    });
    return { visibleProfiles: visible, hiddenCount: hidden };
  }, [allProfiles, followerMin, inactiveDays, fewVideos]);

  const handleToggle = useCallback((username: string) => {
    setSelectedUsernames((prev) => {
      const next = new Set(prev);
      if (next.has(username)) next.delete(username);
      else next.add(username);
      return next;
    });
    // 개별 해제 시 전체선택 해제
    setSelectAll(false);
  }, []);

  const selectedCount = visibleProfiles.filter((p) => selectedUsernames.has(p.username)).length;

  const handleSelectAll = useCallback((checked: boolean) => {
    setSelectAll(checked);
    if (checked) {
      setSelectedUsernames(new Set(visibleProfiles.map((p) => p.username)));
    } else {
      setSelectedUsernames(new Set());
    }
  }, [visibleProfiles]);

  const handleExport = useCallback(() => {
    const selected = visibleProfiles.filter((p) => selectedUsernames.has(p.username));
    if (selected.length === 0) return;

    const header = "닉네임\t틱톡아이디\t틱톡주소\t이메일";
    const rows = selected.map((p) =>
      [p.nickname, p.username, p.url, p.email || ""].join("\t")
    );
    const text = [header, ...rows].join("\n");
    navigator.clipboard.writeText(text);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  }, [visibleProfiles, selectedUsernames]);

  return (
    <div className="space-y-5">
      {/* URL 입력 */}
      <div className="space-y-3">
        <label className="block text-sm font-semibold text-foreground">
          TikTok URL 입력
        </label>
        <textarea
          value={urlText}
          onChange={(e) => setUrlText(e.target.value)}
          placeholder="틱톡 URL을 한 줄에 하나씩 붙여넣기"
          rows={6}
          className="w-full resize-y font-mono"
        />
        <div className="text-xs text-muted mt-2 space-y-0.5">
          <p>ex) https://www.tiktok.com/@username</p>
          <p>@username 형태로도 입력 가능합니다</p>
        </div>
        <div className="flex gap-2 mt-4">
          <button
            onClick={handleLookup}
            disabled={loading || !urlText.trim()}
            className="px-6 py-2.5 bg-accent text-white rounded-lg text-sm font-semibold hover:bg-accent-hover disabled:bg-accent-light disabled:cursor-not-allowed transition-all"
          >
            {loading ? "조회 중..." : "조회하기"}
          </button>
          {urlText.trim() && !loading && (
            <button
              onClick={() => setUrlText("")}
              className="px-4 py-2.5 bg-btn-gray text-foreground rounded-lg text-sm font-semibold hover:bg-btn-gray-hover transition-all"
            >
              초기화
            </button>
          )}
        </div>
      </div>

      {/* 진행상황 */}
      {loading && (
        <div className="space-y-2">
          <div className="w-full h-2 bg-input-bg rounded-full overflow-hidden">
            <div
              className="h-full bg-accent rounded-full transition-all duration-300"
              style={{ width: `${totalLookupCount > 0 ? Math.round((allProfiles.length / totalLookupCount) * 100) : 0}%` }}
            />
          </div>
          <p className="text-sm text-muted text-center">
            {allProfiles.length} / {totalLookupCount}명 조회 완료
          </p>
        </div>
      )}

      {/* 조회 결과 */}
      {allProfiles.length > 0 && (
        <div className="space-y-5">
          <FilterBar
            followerMin={followerMin}
            inactiveDays={inactiveDays}
            fewVideos={fewVideos}
            onFollowerMinChange={setFollowerMin}
            onInactiveDaysChange={setInactiveDays}
            onFewVideosChange={setFewVideos}
          />

          {/* 전체선택 */}
          <label className="flex items-center gap-2 cursor-pointer select-none">
            <input
              type="checkbox"
              checked={selectAll}
              onChange={(e) => handleSelectAll(e.target.checked)}
              className="w-4 h-4 accent-accent"
            />
            <span className="text-sm font-semibold text-foreground">
              전체선택
              {selectAll && loading && (
                <span className="text-muted font-normal ml-1.5">
                  (조회 완료되는 프로필도 자동 선택됩니다)
                </span>
              )}
            </span>
          </label>

          <CreatorList
            profiles={visibleProfiles}
            selectedUsernames={selectedUsernames}
            onToggle={handleToggle}
            hiddenCount={hiddenCount}
          />

          {loading && (
            <div className="flex items-center justify-center gap-2 py-4 text-muted">
              <svg className="w-5 h-5 animate-spin" viewBox="0 0 24 24" fill="none">
                <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
              </svg>
              <span className="text-sm">조회 중...</span>
            </div>
          )}

          {!loading && (
            <button
              onClick={handleExport}
              disabled={selectedCount === 0}
              className={`px-6 py-2.5 rounded-lg text-sm font-semibold transition-all ${
                copied
                  ? "bg-green-500 text-white"
                  : "bg-accent text-white hover:bg-accent-hover disabled:bg-accent-light disabled:cursor-not-allowed"
              }`}
            >
              {copied ? "복사 완료!" : `내보내기 (복사) - ${selectedCount}명`}
            </button>
          )}
        </div>
      )}

      {/* 플로팅 배지 */}
      {allProfiles.length > 0 && (
        <div className="fixed bottom-6 right-6">
          <div className="bg-accent text-white px-5 py-2.5 rounded-lg shadow-lg text-[13px] font-semibold">
            {loading
              ? `${allProfiles.length} / 총 ${totalLookupCount}명 조회 중`
              : `${selectedCount} / ${visibleProfiles.length}명 선택`}
          </div>
        </div>
      )}

      {/* 실패 URL 팝업 */}
      {failedPopupUrls && (
        <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-50">
          <div className="bg-card rounded-lg shadow-2xl p-6 max-w-lg w-full mx-4 border border-border">
            <h3 className="text-lg font-bold mb-1">조회 실패 {failedPopupUrls.length}건</h3>
            <p className="text-sm text-muted mb-4">아래 URL을 복사해서 다시 조회할 수 있습니다.</p>
            <textarea
              readOnly
              value={failedPopupUrls.join("\n")}
              className="w-full h-40 font-mono bg-input-bg resize-none"
              onFocus={(e) => e.target.select()}
            />
            <div className="mt-5 flex justify-end gap-2">
              <button
                onClick={() => {
                  navigator.clipboard.writeText(failedPopupUrls.join("\n"));
                  setCopied(true);
                  setTimeout(() => setCopied(false), 2000);
                }}
                className={`px-5 py-2.5 rounded-lg text-sm font-semibold transition-all ${
                  copied
                    ? "bg-green-500 text-white"
                    : "bg-btn-gray text-foreground hover:bg-btn-gray-hover"
                }`}
              >
                {copied ? "복사 완료!" : "전체 복사"}
              </button>
              <button
                onClick={() => setFailedPopupUrls(null)}
                className="px-5 py-2.5 bg-accent text-white rounded-lg text-sm font-semibold hover:bg-accent-hover transition-all"
              >
                확인
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
