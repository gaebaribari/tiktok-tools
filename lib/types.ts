export interface VideoInfo {
  id: string;
  cover: string;
  title: string;
  createTime: number;
}

export interface CreatorProfile {
  username: string;
  nickname: string;
  avatar: string;
  followerCount: number;
  followingCount: number;
  heartCount: number;
  videoCount: number;
  verified: boolean;
  privateAccount: boolean;
  url: string;
  uniqueUrl: string;
  recentVideos: VideoInfo[];
  lastPostDate: string | null;
  bio: string;
  email: string | null;
}

export interface ProgressEvent {
  type: "status" | "profile" | "done" | "error";
  username?: string;
  step?: string;
  profile?: CreatorProfile;
  total?: number;
  completed?: number;
}
