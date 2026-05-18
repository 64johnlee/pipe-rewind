import { NextResponse } from "next/server";
import { calculateTimeTracking } from "@/lib/rewind";
import { pipe } from "@screenpipe/js";

export async function GET() {
  try {
    const now = new Date();
    const thirtyMinutesAgo = new Date(now.getTime() - 30 * 60 * 1000).toISOString();

    const tracking = await calculateTimeTracking(thirtyMinutesAgo, now.toISOString());

    if (tracking.totalMinutes === 0) {
      return NextResponse.json({ ok: true, status: "no_activity" });
    }

    const topApp = tracking.byApp[0];
    if (topApp && topApp.minutes >= 10) {
      await pipe.inbox.send({
        title: `⏱️ Last 30min: ${topApp.appName} (${topApp.minutes}m)`,
        body: tracking.byApp
          .slice(0, 4)
          .map((a) => `${a.appName}: ${a.minutes}m`)
          .join(" · "),
      });
    }

    return NextResponse.json({ ok: true, tracking });
  } catch (error) {
    console.error("[rewind] cron error:", error);
    return NextResponse.json({ ok: false, error: String(error) }, { status: 500 });
  }
}
