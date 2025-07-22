import { NextResponse } from "next/server";
import { getCountryFromIP, getClientIP } from "@/lib/geolite";

export async function GET(request) {
  try {
    const ip = getClientIP(request);
    const countryData = await getCountryFromIP(ip);

    const response = {
      ip,
      ...countryData,
      timestamp: new Date().toISOString(),
    };

    return NextResponse.json(response, {
      headers: {
        "Cache-Control": "no-cache, no-store, must-revalidate",
        Pragma: "no-cache",
        Expires: "0",
      },
    });
  } catch (error) {
    console.error("Country detection error:", error);
    return NextResponse.json(
      {
        error: "Failed to detect country",
        details: error.message,
      },
      { status: 500 }
    );
  }
}

export async function POST(request) {
  try {
    const { ip } = await request.json();

    if (!ip) {
      return NextResponse.json(
        { error: "IP address is required" },
        { status: 400 }
      );
    }

    const countryData = await getCountryFromIP(ip);

    return NextResponse.json({
      ip,
      ...countryData,
      timestamp: new Date().toISOString(),
    });
  } catch (error) {
    console.error("Country detection error:", error);
    return NextResponse.json(
      { error: "Failed to detect country" },
      { status: 500 }
    );
  }
}
