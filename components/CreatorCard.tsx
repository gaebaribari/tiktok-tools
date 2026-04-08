"use client";

import Image from "next/image";
import type { CreatorProfile } from "@/lib/types";

interface CreatorCardProps {
  profile: CreatorProfile;
  selected: boolean;
  onToggle: () => void;
}

function formatFollowers(count: number): string {
  if (count >= 10000) return `${(count / 10000).toFixed(1)}만`;
  if (count >= 1000) return `${(count / 1000).toFixed(1)}K`;
  return count.toString();
}

function daysAgo(dateStr: string | null): string {
  if (!dateStr) return "정보없음";
  const diff = Date.now() - new Date(dateStr).getTime();
  const days = Math.floor(diff / (1000 * 60 * 60 * 24));
  if (days === 0) return "오늘";
  return `${days}일 전`;
}

export default function CreatorCard({ profile, selected, onToggle }: CreatorCardProps) {
  return (
    <div
      className={`flex gap-4 p-4 rounded-lg border transition-all cursor-pointer ${
        selected
          ? "border-accent bg-blue-50/60"
          : "border-border bg-card hover:bg-input-bg"
      }`}
      onClick={onToggle}
    >
      <div className="flex items-start pt-1">
        <input
          type="checkbox"
          checked={selected}
          onChange={onToggle}
          onClick={(e) => e.stopPropagation()}
        />
      </div>

      <div className="flex-shrink-0">
        {profile.avatar ? (
          <Image
            src={profile.avatar}
            alt={profile.nickname}
            width={72}
            height={72}
            className="rounded-lg object-cover"
            unoptimized
          />
        ) : (
          <div className="w-[72px] h-[72px] rounded-lg bg-input-bg flex items-center justify-center text-muted text-2xl">
            ?
          </div>
        )}
      </div>

      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-3 mb-2 flex-wrap">
          <a
            href={profile.url}
            target="_blank"
            rel="noopener noreferrer"
            className="font-bold text-accent hover:underline"
            onClick={(e) => e.stopPropagation()}
          >
            @{profile.username}
          </a>
          <span className="text-foreground font-medium">{profile.nickname}</span>
          <span className="text-sm text-muted">
            {formatFollowers(profile.followerCount)} 팔로워
          </span>
          <span className="text-sm text-muted">
            최근 {daysAgo(profile.lastPostDate)}
          </span>
        </div>

        {profile.recentVideos.length > 0 ? (
          <div className="flex gap-2 overflow-x-auto pb-1">
            {profile.recentVideos.map((video) => (
              <div key={video.id} className="flex-shrink-0">
                <Image
                  src={video.cover}
                  alt={video.title}
                  width={110}
                  height={148}
                  className="rounded-lg object-cover"
                  unoptimized
                />
              </div>
            ))}
          </div>
        ) : (
          <a
            href={profile.url}
            target="_blank"
            rel="noopener noreferrer"
            className="text-sm text-accent hover:underline"
            onClick={(e) => e.stopPropagation()}
          >
            TikTok에서 영상 보기 →
          </a>
        )}
      </div>
    </div>
  );
}
