import Papa from "papaparse";
import type { CreatorProfile } from "./types";

export function generateCSV(profiles: CreatorProfile[]): string {
  const data = profiles.map((p) => ({
    닉네임: p.nickname,
    아이디: p.username,
    고유주소: p.uniqueUrl,
  }));

  return Papa.unparse(data);
}
