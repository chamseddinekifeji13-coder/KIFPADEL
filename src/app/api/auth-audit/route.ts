import { NextResponse } from "next/server";
import { publicEnv } from "@/lib/config/env";

export async function GET() {
  return NextResponse.json({
    status: "audit",
    timestamp: new Date().toISOString(),
    env: {
      supabaseUrl: {
        length: publicEnv.supabaseUrl.length,
        prefix: publicEnv.supabaseUrl.substring(0, 10),
        isMissing: publicEnv.supabaseUrl.includes("MISSING"),
      },
      supabaseAnonKey: {
        length: publicEnv.supabaseAnonKey.length,
        prefix: publicEnv.supabaseAnonKey.substring(0, 10),
        isMissing: publicEnv.supabaseAnonKey.includes("MISSING"),
      },
      nodeEnv: process.env.NODE_ENV,
    },
    raw_checks: {
      has_url_var: !!process.env.NEXT_PUBLIC_SUPABASE_URL,
      has_key_var: !!process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY,
    }
  });
}
