import { NextResponse } from "next/server";
import { getSession } from "@/lib/auth";

export async function GET(req: Request) {
  try {
    const session = await getSession(req);
    if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    let supabaseUrl = process.env.SUPABASE_URL || "";
    if (supabaseUrl.includes("/rest/v1")) {
      supabaseUrl = supabaseUrl.split("/rest/v1")[0];
    }
    if (supabaseUrl.endsWith("/")) {
      supabaseUrl = supabaseUrl.slice(0, -1);
    }
    const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
    const supabaseBucket = process.env.SUPABASE_BUCKET;

    if (!supabaseUrl || !supabaseKey) {
      return NextResponse.json({ error: "Supabase environment variables missing" });
    }

    const res = await fetch(`${supabaseUrl}/storage/v1/bucket`, {
      headers: {
        Authorization: `Bearer ${supabaseKey}`,
        apikey: supabaseKey,
      },
    });

    const buckets = await res.json();
    return NextResponse.json({
      success: true,
      supabaseUrl,
      supabaseBucket,
      buckets,
    });
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
