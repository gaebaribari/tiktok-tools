import { NextRequest, NextResponse } from "next/server";
import { getTaskStatus } from "@/lib/downloader";

export async function GET(
  _req: NextRequest,
  { params }: { params: Promise<{ taskId: string }> }
) {
  const { taskId } = await params;
  const status = getTaskStatus(taskId);

  if (!status) {
    return NextResponse.json({ error: "작업을 찾을 수 없습니다." }, { status: 404 });
  }

  return NextResponse.json({
    status: status.status,
    total: status.total,
    completed: status.completed,
    errors: status.errors,
    errorMessage: status.errorMessage || "",
  });
}
