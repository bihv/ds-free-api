import { NextRequest, NextResponse } from "next/server";
import { getTimeline } from "@/lib/db";

export async function GET(request: NextRequest) {
  try {
    const range = request.nextUrl.searchParams.get("range") || "24h";
    const timeline = getTimeline(range);
    return NextResponse.json(timeline);
  } catch (error) {
    return NextResponse.json(
      { error: "Failed to fetch timeline", detail: String(error) },
      { status: 500 }
    );
  }
}
