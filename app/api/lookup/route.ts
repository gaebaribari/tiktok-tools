import { NextRequest } from "next/server";
import { extractUsernames, fetchSingleProfile } from "@/lib/tiktok";
import type { ProgressEvent } from "@/lib/types";

export async function POST(req: NextRequest) {
  const { urls } = (await req.json()) as { urls: string[] };

  if (!urls || !Array.isArray(urls) || urls.length === 0) {
    return new Response(JSON.stringify({ error: "urls 배열이 필요합니다" }), {
      status: 400,
      headers: { "Content-Type": "application/json" },
    });
  }

  const usernames = extractUsernames(urls);

  const stream = new ReadableStream({
    async start(controller) {
      const encoder = new TextEncoder();
      const send = (event: ProgressEvent) => {
        controller.enqueue(encoder.encode(`data: ${JSON.stringify(event)}\n\n`));
      };

      send({ type: "status", step: `${usernames.length}명 조회 시작` });

      const CONCURRENCY = 3;
      let completed = 0;

      for (let i = 0; i < usernames.length; i += CONCURRENCY) {
        if (i > 0) {
          const gap = 1000 + Math.random() * 500;
          send({ type: "status", step: `차단 방지 대기 (${Math.round(gap / 1000)}초)...` });
          await new Promise((r) => setTimeout(r, gap));
        }

        const batch = usernames.slice(i, i + CONCURRENCY);
        const results = await Promise.all(
          batch.map((handle) => fetchSingleProfile(handle, send))
        );

        for (let j = 0; j < batch.length; j++) {
          completed++;
          const profile = results[j];
          if (profile) {
            send({ type: "profile", username: batch[j], profile, total: usernames.length, completed });
          } else {
            send({ type: "error", username: batch[j], step: "조회 실패", total: usernames.length, completed });
          }
        }
      }

      send({ type: "done", total: usernames.length, completed });
      controller.close();
    },
  });

  return new Response(stream, {
    headers: {
      "Content-Type": "text/event-stream",
      "Cache-Control": "no-cache",
      Connection: "keep-alive",
    },
  });
}
