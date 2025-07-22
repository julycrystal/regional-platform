"use server";

import { headers } from "next/headers";
import { getCountryFromIP, getClientIP } from "./geolite";

export async function detectCountryFromHeaders() {
  const headersList = headers();

  // Extract IP from headers
  const forwarded = headersList.get("x-forwarded-for");
  const realIP = headersList.get("x-real-ip");
  const cfConnectingIP = headersList.get("cf-connecting-ip");

  let ip = "127.0.0.1";
  if (cfConnectingIP) ip = cfConnectingIP;
  else if (realIP) ip = realIP;
  else if (forwarded) ip = forwarded.split(",")[0].trim();

  const countryData = await getCountryFromIP(ip);

  return {
    ip,
    ...countryData,
    timestamp: new Date().toISOString(),
  };
}
