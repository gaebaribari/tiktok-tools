"use client";

import type { CreatorProfile } from "@/lib/types";
import CreatorCard from "./CreatorCard";

interface CreatorListProps {
  profiles: CreatorProfile[];
  selectedUsernames: Set<string>;
  onToggle: (username: string) => void;
  hiddenCount: { follower: number; inactive: number };
}

export default function CreatorList({
  profiles,
  selectedUsernames,
  onToggle,
  hiddenCount,
}: CreatorListProps) {
  const totalHidden = hiddenCount.follower + hiddenCount.inactive;

  return (
    <div className="space-y-3">
      {profiles.map((profile) => (
        <CreatorCard
          key={profile.username}
          profile={profile}
          selected={selectedUsernames.has(profile.username)}
          onToggle={() => onToggle(profile.username)}
        />
      ))}

      {totalHidden > 0 && (
        <div className="text-center py-4 text-sm text-muted">
          숨겨짐:
          {hiddenCount.follower > 0 && ` 팔로워 부족 ${hiddenCount.follower}명`}
          {hiddenCount.inactive > 0 && ` 활동없음 ${hiddenCount.inactive}명`}
        </div>
      )}

      {profiles.length === 0 && totalHidden === 0 && (
        <div className="text-center py-10 text-muted">
          조회 결과가 없습니다
        </div>
      )}
    </div>
  );
}
