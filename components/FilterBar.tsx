"use client";

import { useState, useEffect } from "react";

interface FilterBarProps {
  followerMin: string;
  inactiveDays: string;
  fewVideos: boolean;
  onFollowerMinChange: (v: string) => void;
  onInactiveDaysChange: (v: string) => void;
  onFewVideosChange: (v: boolean) => void;
}

export default function FilterBar({
  followerMin,
  inactiveDays,
  fewVideos,
  onFollowerMinChange,
  onInactiveDaysChange,
  onFewVideosChange,
}: FilterBarProps) {
  const [draftMin, setDraftMin] = useState(followerMin);
  const [draftDays, setDraftDays] = useState(inactiveDays);

  useEffect(() => { setDraftMin(followerMin); }, [followerMin]);
  useEffect(() => { setDraftDays(inactiveDays); }, [inactiveDays]);

  const hasChanges = draftMin !== followerMin || draftDays !== inactiveDays;

  const handleApply = () => {
    onFollowerMinChange(draftMin);
    onInactiveDaysChange(draftDays);
  };

  const isApplied = followerMin !== "" || inactiveDays !== "" || fewVideos;

  const handleReset = () => {
    setDraftMin("");
    setDraftDays("");
    onFollowerMinChange("");
    onInactiveDaysChange("");
    onFewVideosChange(false);
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "Enter" && hasChanges) handleApply();
  };

  return (
    <div className="bg-card rounded-lg p-5 border border-border space-y-3">
      <div className="flex flex-wrap items-center gap-x-5 gap-y-3">
        <div className="flex items-center gap-2">
          <span className="text-sm font-semibold text-foreground whitespace-nowrap">팔로워</span>
          <input
            type="number"
            placeholder="명"
            value={draftMin}
            onChange={(e) => setDraftMin(e.target.value)}
            onKeyDown={handleKeyDown}
            className="w-24"
          />
          <span className="text-sm text-muted whitespace-nowrap">이하 제외</span>
        </div>

        <div className="flex items-center gap-2">
          <span className="text-sm font-semibold text-foreground whitespace-nowrap">비활동</span>
          <input
            type="number"
            placeholder="일"
            value={draftDays}
            onChange={(e) => setDraftDays(e.target.value)}
            onKeyDown={handleKeyDown}
            className="w-20"
          />
          <span className="text-sm text-muted whitespace-nowrap">일 이상 제외</span>
        </div>

        {hasChanges && (
          <button
            onClick={handleApply}
            className="px-4 py-2 bg-accent text-white text-sm font-semibold rounded-lg hover:bg-accent-hover transition-all"
          >
            적용
          </button>
        )}
      </div>

      <div className="flex items-center justify-between">
        <label className="flex items-center gap-2 cursor-pointer select-none">
          <input
            type="checkbox"
            checked={fewVideos}
            onChange={(e) => onFewVideosChange(e.target.checked)}
          />
          <span className="text-sm text-muted">영상 10개 이하 제외</span>
        </label>

        {isApplied && !hasChanges && (
          <button
            onClick={handleReset}
            className="text-sm text-muted hover:text-foreground transition-colors"
          >
            필터 초기화
          </button>
        )}
      </div>
    </div>
  );
}
