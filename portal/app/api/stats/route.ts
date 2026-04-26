import { NextRequest, NextResponse } from "next/server";
import { getStatsOverview } from "@/lib/db";
import { getConfig } from "@/lib/config";

export async function GET(_request: NextRequest) {
  try {
    const stats = getStatsOverview();
    const config = getConfig();

    return NextResponse.json({
      ...stats,
      accounts: config.accounts.map((a) => ({
        email: a.email || "",
        mobile: a.mobile || "",
      })),
      total_accounts: config.accounts.length,
      upstream_url: config.upstream_url,
    });
  } catch (error) {
    return NextResponse.json(
      { error: "Failed to fetch stats", detail: String(error) },
      { status: 500 }
    );
  }
}
