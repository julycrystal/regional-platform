"use server";

import maxmind from "maxmind";
import path from "path";
import fs from "fs";

let geoLookup = null;

async function initGeoLite() {
  if (!geoLookup) {
    try {
      // Path to your GeoLite2-Country.mmdb file
      const dbPath = path.join(process.cwd(), "GeoLite2-Country.mmdb");

      // Check if file exists
      if (!fs.existsSync(dbPath)) {
        throw new Error(`GeoLite2 database not found at ${dbPath}`);
      }

      geoLookup = await maxmind.open(dbPath);
      console.log("GeoLite2 database initialized successfully");
    } catch (error) {
      console.error("Failed to initialize GeoLite2 database:", error);
      throw error;
    }
  }
  return geoLookup;
}

export async function getCountryFromIP(ip) {
  try {
    // Skip local IPs
    if (
      ip === "127.0.0.1" ||
      ip === "::1" ||
      ip.startsWith("192.168.") ||
      ip.startsWith("10.")
    ) {
      return { country: "LOCAL", countryName: "Local Network" };
    }

    const lookup = await initGeoLite();
    const result = lookup.get(ip);

    if (result && result.country) {
      return {
        country: result.country.iso_code,
        countryName: result.country.names?.en || "Unknown",
      };
    }

    return { country: null, countryName: "Unknown" };
  } catch (error) {
    console.error("Error looking up country:", error);
    return { country: null, countryName: "Error" };
  }
}

export function getClientIP(request) {
  // Check various headers for the real IP
  const forwarded = request.headers.get("x-forwarded-for");
  const realIP = request.headers.get("x-real-ip");
  const cfConnectingIP = request.headers.get("cf-connecting-ip");

  if (cfConnectingIP) return cfConnectingIP;
  if (realIP) return realIP;
  if (forwarded) return forwarded.split(",")[0].trim();

  // Fallback
  return "127.0.0.1";
}
