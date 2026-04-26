import { NextRequest, NextResponse } from "next/server";
import { getRequests } from "@/lib/db";

export async function GET(request: NextRequest) {
  try {
    const params = request.nextUrl.searchParams;
    const page = parseInt(params.get("page") || "1");
    const limit = Math.min(parseInt(params.get("limit") || "50"), 100);
    const model = params.get("model") || undefined;
    const status = params.get("status") || undefined;

    const result = getRequests(page, limit, model, status);
    return NextResponse.json(result);
  } catch (error) {
    return NextResponse.json(
      { error: "Failed to fetch requests", detail: String(error) },
      { status: 500 }
    );
  }
}
