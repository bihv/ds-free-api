import { NextResponse } from "next/server";
import { resetData } from "@/lib/db";

export async function POST() {
  try {
    resetData();
    return NextResponse.json({ success: true });
  } catch (error) {
    return NextResponse.json(
      { error: "Failed to reset data", detail: String(error) },
      { status: 500 }
    );
  }
}
