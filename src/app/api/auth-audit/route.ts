import { NextResponse } from "next/server";

export async function GET() {
  if (process.env.NODE_ENV === "production") {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }

  return NextResponse.json({
    status: "audit",
    timestamp: new Date().toISOString(),
    note: "Dev-only endpoint. Disabled in production.",
  });
}
