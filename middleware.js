import { NextResponse } from "next/server";

export async function middleware(request) {
  try {
    // Get the client's IP address
    const forwarded = request.headers.get("x-forwarded-for");
    const realIp = request.headers.get("x-real-ip");
    const ip =
      forwarded?.split(",")[0]?.trim() || realIp || request.ip || "127.0.0.1";

    console.log(`Checking IP: ${ip}`);

    // Dynamic import for the GeoIP API
    const { getGeoIPAPI } = await import("./app/lib/geoip-api.js");
    const geoAPI = getGeoIPAPI();

    // Get country information from API
    let geoData;
    try {
      geoData = await geoAPI.lookupIP(ip);
    } catch (error) {
      console.error("GeoIP API error:", error);
      // On API error, deny access by default
      const url = request.nextUrl.clone();
      url.pathname = "/blocked";
      const response = NextResponse.rewrite(url);
      response.headers.set("x-geo-error", "true");
      response.headers.set("x-error-message", error.message);
      return response;
    }

    const countryCode = geoData.country_code;
    const countryName = geoData.country_name;
    const city = geoData.city;
    const region = geoData.region;
    const source = geoData.source;

    console.log(
      `Detected country: ${countryName} (${countryCode}) for IP: ${ip} via ${source}`
    );

    // Check if user is from India (IN) or Pakistan (PK)
    if (countryCode !== "IN" && countryCode !== "PK") {
      // Redirect to blocked page for users outside India/Pakistan
      const url = request.nextUrl.clone();
      url.pathname = "/blocked";
      const response = NextResponse.rewrite(url);

      // Add geo data to headers for the blocked page
      response.headers.set("x-user-country", countryCode || "Unknown");
      response.headers.set("x-user-country-name", countryName || "Unknown");
      response.headers.set("x-user-city", city || "Unknown");
      response.headers.set("x-user-region", region || "Unknown");
      response.headers.set("x-user-ip", ip);
      response.headers.set("x-geo-source", source || "unknown");
      response.headers.set("x-access-denied", "true");

      return response;
    }

    // Allow access and pass geo data to the page
    const response = NextResponse.next();
    response.headers.set("x-user-country", countryCode);
    response.headers.set("x-user-country-name", countryName || "Unknown");
    response.headers.set("x-user-city", city || "Unknown");
    response.headers.set("x-user-region", region || "Unknown");
    response.headers.set("x-user-ip", ip);
    response.headers.set("x-geo-source", source || "unknown");
    response.headers.set("x-access-granted", "true");

    return response;
  } catch (error) {
    console.error("Middleware error:", error);

    // On unexpected error, deny access
    const url = request.nextUrl.clone();
    url.pathname = "/blocked";
    const response = NextResponse.rewrite(url);
    response.headers.set("x-geo-error", "true");
    response.headers.set("x-error-message", "Unexpected error");
    return response;
  }
}

export const config = {
  matcher: [
    /*
     * Match all request paths except for the ones starting with:
     * - api (API routes)
     * - _next/static (static files)
     * - _next/image (image optimization files)
     * - favicon.ico, sitemap.xml, robots.txt (metadata files)
     */
    "/((?!api|_next/static|_next/image|favicon.ico|sitemap.xml|robots.txt).*)",
  ],
};
