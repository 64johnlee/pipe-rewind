import { NextResponse } from "next/server";
import { fetchTimeline, calculateTimeTracking } from "@/lib/rewind";

export async function POST(request: Request) {
  try {
    const { startTime, endTime, mode = "timeline" } = await request.json() as {
      startTime: string;
      endTime: string;
      mode?: "timeline" | "tracking";
    };
    if (!startTime || !endTime) {
      return NextResponse.json({ error: "startTime and endTime required" }, { status: 400 });
    }
    if (mode === "tracking") {
      const tracking = await calculateTimeTracking(startTime, endTime);
      return NextResponse.json(tracking);
    }
    const entries = await fetchTimeline(startTime, endTime);
    return NextResponse.json({ entries });
  } catch (error) {
    return NextResponse.json({ error: String(error) }, { status: 500 });
  }
}
