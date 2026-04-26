import Papa from "papaparse";
import type { CreatorProfile } from "./types";

export function generateCSV(profiles: CreatorProfile[], includeEmail = false): string {
  const data = profiles.map((p) => {
    const row: Record<string, string> = {
      닉네임: p.nickname,
      아이디: p.username,
      고유주소: p.uniqueUrl,
    };
    if (includeEmail) {
      row["이메일"] = p.email || "";
      row["소개"] = p.bio;
    }
    return row;
  });

  return Papa.unparse(data);
}
