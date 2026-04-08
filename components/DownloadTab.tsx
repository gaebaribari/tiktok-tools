"use client";

import { useState, useCallback } from "react";

interface Block {
  value: string;
  label: string;
}

export default function DownloadTab() {
  const [urlText, setUrlText] = useState("");
  const [blocks, setBlocks] = useState<Block[]>([
    { value: "{number}", label: "넘버링" },
    { value: ".", label: "." },
    { value: " ", label: "띄어쓰기" },
    { value: "{nickname}", label: "닉네임" },
  ]);
  const [skipFilename, setSkipFilename] = useState(false);
  const [downloading, setDownloading] = useState(false);
  const [progress, setProgress] = useState({ completed: 0, total: 0, pct: 0 });
  const [statusText, setStatusText] = useState("");
  const [errorPopup, setErrorPopup] = useState<{ title: string; body: string } | null>(null);
  const [errorCopied, setErrorCopied] = useState(false);

  const addBlock = (value: string, label: string) => setBlocks((prev) => [...prev, { value, label }]);
  const removeBlock = (index: number) => setBlocks((prev) => prev.filter((_, i) => i !== index));
  const clearBlocks = () => setBlocks([]);

  const template = blocks.map((b) => b.value).join("");

  const getPreview = () => {
    if (!template) return "-";
    const usernames = urlText.split("\n").filter((l) => l.trim()).map((line) => {
      const m = line.match(/@([^/]+)/);
      return m ? m[1] : "";
    });
    const totalCount = urlText.split("\n").filter((l) => l.trim()).length;
    const digits = String(totalCount || 1).length;
    let name = template;
    name = name.replace(/\{number\}/g, "1".padStart(digits, "0"));
    name = name.replace(/\{tiktok_id\}/g, usernames[0] || "username");
    name = name.replace(/\{nickname\}/g, usernames[0] || "닉네임");
    return name + ".mp4";
  };

  const startDownload = useCallback(async () => {
    const urls = urlText.trim();
    if (!urls) return alert("URL을 입력해주세요.");
    if (!skipFilename && !template) return alert("파일명 형식을 설정해주세요.");

    setDownloading(true);
    setProgress({ completed: 0, total: 0, pct: 0 });
    setStatusText("작업 시작 중...");

    try {
      const res = await fetch("/api/download", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ urls, template: skipFilename ? "" : template, skipMetadata: skipFilename }),
      });
      const data = await res.json();
      if (data.error) { alert(data.error); setDownloading(false); return; }

      const taskId = data.taskId;
      setProgress((prev) => ({ ...prev, total: data.total }));

      const pollOnce = async () => {
        try {
          const statusRes = await fetch(`/api/download/${taskId}/status`);
          const status = await statusRes.json();

          if (status.error) {
            setStatusText("작업이 중단되었습니다. 다시 시도해주세요.");
            setTimeout(() => {
              setDownloading(false);
              setStatusText("");
              setProgress({ completed: 0, total: 0, pct: 0 });
            }, 2000);
            return;
          } else if (status.status === "downloading") {
            const pct = Math.round((status.completed / status.total) * 100);
            setProgress({ completed: status.completed, total: status.total, pct });
            setStatusText(`다운로드 ${status.completed} / ${status.total}`);
          } else if (status.status === "failed") {
            setStatusText(status.errorMessage || "다운로드 실패");
            if (status.errors?.length > 0) {
              const body = status.errors.map((e: { index: number; url: string; error: string }) =>
                `#${e.index} ${e.url}\n→ ${e.error}`
              ).join("\n\n");
              setErrorPopup({ title: `전체 실패 (${status.errors.length}건)`, body });
            }
            setTimeout(() => {
              setDownloading(false);
              setStatusText("");
              setProgress({ completed: 0, total: 0, pct: 0 });
            }, 1000);
            return;
          } else if (status.status === "done") {
            const errorCount = status.errors?.length || 0;
            if (errorCount > 0) {
              setStatusText(`완료! (${errorCount}건 실패)`);
              const body = status.errors.map((e: { index: number; url: string; error: string }) =>
                `#${e.index} ${e.url}\n→ ${e.error}`
              ).join("\n\n");
              setErrorPopup({ title: `${status.total - errorCount}건 성공, ${errorCount}건 실패`, body });
            } else {
              setStatusText("완료!");
            }
            setProgress((prev) => ({ ...prev, pct: 100 }));

            const a = document.createElement("a");
            a.href = `/api/download/${taskId}/file`;
            a.download = "videos.zip";
            document.body.appendChild(a);
            a.click();
            document.body.removeChild(a);

            setTimeout(() => {
              setDownloading(false);
              setUrlText("");
              setStatusText("");
              setProgress({ completed: 0, total: 0, pct: 0 });
            }, 3000);
            return;
          }
        } catch {
          // 폴링 실패 무시
        }
        setTimeout(pollOnce, 1000);
      };
      setTimeout(pollOnce, 1000);
    } catch (e) {
      alert("오류가 발생했습니다: " + String(e));
      setDownloading(false);
    }
  }, [urlText, template, skipFilename]);

  return (
    <div className="space-y-5">
      {/* URL 입력 */}
      <div className="space-y-3">
        <label className="block text-sm font-semibold text-foreground">
          URL 입력
        </label>
        <textarea
          value={urlText}
          onChange={(e) => setUrlText(e.target.value)}
          placeholder={`TikTok URL을 한 줄에 하나씩 붙여넣으세요.\n\nhttps://www.tiktok.com/@username/video/1234567890\n...`}
          rows={8}
          className="w-full resize-y font-mono"
        />
      </div>

      {/* 파일명 형식 설정 */}
      <div className="space-y-4">
        <div className="flex items-center gap-3">
          <label className="text-sm font-semibold text-foreground">
            파일명 형식 설정
          </label>
          <label className="flex items-center gap-1.5 cursor-pointer text-xs text-muted">
            <input
              type="checkbox"
              checked={skipFilename}
              onChange={(e) => setSkipFilename(e.target.checked)}
            />
            생략
          </label>
        </div>

        {!skipFilename && (
          <>
            <div className="flex gap-2 flex-wrap mb-4">
              {[
                ["{number}", "넘버링"],
                [".", "마침표"],
                [" ", "띄어쓰기"],
                ["{tiktok_id}", "아이디"],
                ["{nickname}", "닉네임"],
              ].map(([value, label]) => (
                <button
                  key={value}
                  onClick={() => addBlock(value, label)}
                  className="px-4 py-2 bg-btn-gray border border-border rounded-lg text-sm font-medium text-foreground hover:border-accent hover:text-accent transition-all"
                >
                  {label}
                </button>
              ))}
            </div>

            <div className="relative flex items-center flex-wrap gap-1.5 min-h-[48px] px-3 py-2.5 bg-input-bg border border-border rounded-lg pr-16 mb-3">
              {blocks.length === 0 ? (
                <span className="text-muted text-sm">위 블록을 클릭하여 파일명 형식을 만드세요</span>
              ) : (
                blocks.map((block, i) => (
                  <span
                    key={i}
                    className={`inline-flex items-center gap-1 px-2.5 py-1 rounded-lg text-sm font-medium ${
                      block.value.startsWith("{") ? "bg-blue-100 text-accent" : "bg-white text-foreground shadow-sm"
                    }`}
                  >
                    {block.label}
                    <span
                      className="cursor-pointer text-muted hover:text-accent ml-0.5 transition-colors"
                      onClick={() => removeBlock(i)}
                    >
                      ×
                    </span>
                  </span>
                ))
              )}
              <button
                onClick={clearBlocks}
                className="absolute right-2 top-1/2 -translate-y-1/2 px-2.5 py-1 bg-btn-gray border border-border rounded-lg text-[11px] text-muted hover:text-foreground hover:border-foreground/30 transition-all"
              >
                초기화
              </button>
            </div>

            <div className="flex items-center gap-2 px-4 py-3 bg-input-bg rounded-lg">
              <span className="text-xs text-muted">미리보기</span>
              <span className="text-sm font-medium text-foreground">{getPreview()}</span>
            </div>
          </>
        )}
      </div>

      {/* 다운로드 */}
      <div className="space-y-4">
        {downloading && (
          <div className="mb-4">
            <div className="w-full h-2 bg-input-bg rounded-full overflow-hidden">
              <div
                className="h-full bg-accent rounded-full transition-all duration-300"
                style={{ width: `${progress.pct}%` }}
              />
            </div>
            <div className="text-sm text-muted mt-2 text-center">{statusText}</div>
          </div>
        )}
        <button
          onClick={startDownload}
          disabled={downloading || !urlText.trim()}
          className="w-full py-2.5 bg-accent text-white rounded-lg font-semibold text-sm hover:bg-accent-hover disabled:bg-accent-light disabled:cursor-not-allowed transition-all"
        >
          {downloading ? (
            <span className="flex items-center justify-center gap-2">
              <svg className="w-4 h-4 animate-spin" viewBox="0 0 24 24" fill="none">
                <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
              </svg>
              {statusText || "다운로드 중..."}
            </span>
          ) : (
            "다운로드"
          )}
        </button>
      </div>

      {/* 오류 팝업 */}
      {errorPopup && (
        <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-50">
          <div className="bg-card rounded-lg shadow-2xl p-6 max-w-lg w-full mx-4 border border-border">
            <h3 className="text-lg font-bold mb-1">{errorPopup.title}</h3>
            <p className="text-sm text-muted mb-4">오류 내용을 복사할 수 있습니다.</p>
            <textarea
              readOnly
              value={errorPopup.body}
              className="w-full h-48 font-mono bg-input-bg resize-none text-sm"
              onFocus={(e) => e.target.select()}
            />
            <div className="mt-5 flex justify-end gap-2">
              <button
                onClick={() => {
                  navigator.clipboard.writeText(errorPopup.body);
                  setErrorCopied(true);
                  setTimeout(() => setErrorCopied(false), 2000);
                }}
                className={`px-5 py-2.5 rounded-lg text-sm font-semibold transition-all ${
                  errorCopied
                    ? "bg-green-500 text-white"
                    : "bg-btn-gray text-foreground hover:bg-btn-gray-hover"
                }`}
              >
                {errorCopied ? "복사 완료!" : "전체 복사"}
              </button>
              <button
                onClick={() => setErrorPopup(null)}
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
