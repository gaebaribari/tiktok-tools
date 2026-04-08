import { NextRequest, NextResponse } from "next/server";
import { getTaskStatus, getZipPath } from "@/lib/downloader";
import * as fs from "fs";

export async function GET(
  _req: NextRequest,
  { params }: { params: Promise<{ taskId: string }> }
) {
  const { taskId } = await params;
  const status = getTaskStatus(taskId);

  if (!status) {
    return NextResponse.json({ error: "작업을 찾을 수 없습니다." }, { status: 404 });
  }

  if (status.status !== "done") {
    return NextResponse.json({ error: "아직 다운로드가 진행 중입니다." }, { status: 400 });
  }

  const zipPath = getZipPath(taskId);
  if (!fs.existsSync(zipPath)) {
    return NextResponse.json({ error: "파일을 찾을 수 없습니다." }, { status: 404 });
  }

  const fileBuffer = fs.readFileSync(zipPath);

  return new NextResponse(fileBuffer, {
    headers: {
      "Content-Type": "application/zip",
      "Content-Disposition": 'attachment; filename="videos.zip"',
      "Content-Length": String(fileBuffer.length),
    },
  });
}
