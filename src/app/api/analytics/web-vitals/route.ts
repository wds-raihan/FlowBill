import { NextRequest, NextResponse } from "next/server";
import { env } from "@/lib/config/environment";

export async function POST(request: NextRequest) {
  try {
    // Only collect in production
    if (env.NODE_ENV !== "production") {
      return NextResponse.json({ success: true });
    }

    const webVital = await request.json();
    
    // Validate the web vital data
    if (!webVital.name || typeof webVital.value !== "number") {
      return NextResponse.json(
        { error: "Invalid web vital data" },
        { status: 400 }
      );
    }

    // Get client information
    const userAgent = request.headers.get("user-agent") || "";
    const referer = request.headers.get("referer") || "";
    const clientIP = request.headers.get("x-forwarded-for") || 
                    request.headers.get("x-real-ip") || 
                    "unknown";

    // Create analytics event
    const analyticsEvent = {
      ...webVital,
      timestamp: Date.now(),
      userAgent,
      referer,
      clientIP: clientIP.split(",")[0], // Take first IP if multiple
      sessionId: request.headers.get("x-session-id"),
    };

    // Log for debugging in development
    if (env.NODE_ENV === "development") {
      console.log("Web Vital received:", analyticsEvent);
    }

    // Here you would typically send to your analytics service
    // Examples:
    // - Google Analytics 4
    // - Mixpanel
    // - Custom analytics database
    // - Vercel Analytics
    
    // For now, we'll just log it
    console.log(`Web Vital - ${webVital.name}: ${webVital.value}ms`);

    // If using Vercel Analytics, you can send it there
    if (process.env.VERCEL_ANALYTICS_ID) {
      // Send to Vercel Analytics
      try {
        await fetch("https://vitals.vercel-analytics.com/v1/vitals", {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            dsn: process.env.VERCEL_ANALYTICS_ID,
            id: webVital.id,
            page: referer,
            href: referer,
            event_name: webVital.name,
            value: webVital.value.toString(),
            speed: getConnectionSpeed(request),
          }),
        });
      } catch (error) {
        console.error("Failed to send to Vercel Analytics:", error);
      }
    }

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("Error processing web vital:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}

function getConnectionSpeed(request: NextRequest): string {
  const connection = request.headers.get("downlink");
  if (!connection) return "unknown";
  
  const speed = parseFloat(connection);
  if (speed >= 10) return "4g";
  if (speed >= 1.5) return "3g";
  if (speed >= 0.4) return "2g";
  return "slow-2g";
}