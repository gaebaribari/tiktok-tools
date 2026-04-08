import { NextRequest, NextResponse } from "next/server";
import { parseTiktokUrls, downloadAll, createTaskId } from "@/lib/downloader";

export async function POST(req: NextRequest) {
  const { urls, template, skipMetadata } = (await req.json()) as {
    urls: string;
    template: string;
    skipMetadata: boolean;
  };

  const items = parseTiktokUrls(urls);
  if (items.length === 0) {
    return NextResponse.json({ error: "유효한 TikTok URL이 없습니다." }, { status: 400 });
  }

  const taskId = createTaskId();

  downloadAll(items, taskId, template || "", skipMetadata ?? false).catch((e) =>
    console.error(`[download] task ${taskId} failed:`, e)
  );

  return NextResponse.json({ taskId, total: items.length });
}
