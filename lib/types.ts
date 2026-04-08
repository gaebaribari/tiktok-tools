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
  url: string;
  uniqueUrl: string;
  recentVideos: VideoInfo[];
  lastPostDate: string | null;
}

export interface ProgressEvent {
  type: "status" | "profile" | "done" | "error";
  username?: string;
  step?: string;
  profile?: CreatorProfile;
  total?: number;
  completed?: number;
}
