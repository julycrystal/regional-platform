class GeoIPAPI {
  constructor() {
    // Using ipapi.co as primary, with fallbacks
    this.primaryAPI = "https://ipapi.co";
    this.fallbackAPIs = [
      "https://ip-api.com/json",
      "https://ipinfo.io/json",
      "https://api.ipgeolocation.io/ipgeo",
    ];
  }

  async lookupIP(ip) {
    // Handle localhost and private IPs
    if (this.isLocalIP(ip)) {
      return {
        country_code: "IN", // Default to India for testing
        country_name: "India",
        city: "Mumbai",
        region: "Maharashtra",
        ip: ip,
        source: "localhost-default",
      };
    }

    // Try primary API first
    try {
      const result = await this.fetchFromPrimaryAPI(ip);
      if (result) {
        return { ...result, source: "ipapi.co" };
      }
    } catch (error) {
      console.warn("Primary API failed:", error.message);
    }

    // Try fallback APIs
    for (const apiUrl of this.fallbackAPIs) {
      try {
        const result = await this.fetchFromFallbackAPI(apiUrl, ip);
        if (result) {
          return { ...result, source: apiUrl };
        }
      } catch (error) {
        console.warn(`Fallback API ${apiUrl} failed:`, error.message);
      }
    }

    // If all APIs fail, deny access by default
    throw new Error("All geolocation APIs failed");
  }

  async fetchFromPrimaryAPI(ip) {
    const url = `${this.primaryAPI}/${ip}/json/`;
    const response = await fetch(url, {
      timeout: 5000,
      headers: {
        "User-Agent": "Next.js Geo App/1.0",
      },
    });

    if (!response.ok) {
      throw new Error(`HTTP ${response.status}`);
    }

    const data = await response.json();

    if (data.error) {
      throw new Error(data.reason || "API Error");
    }

    return {
      country_code: data.country_code,
      country_name: data.country_name,
      city: data.city,
      region: data.region,
      ip: data.ip,
    };
  }

  async fetchFromFallbackAPI(apiUrl, ip) {
    let url;

    if (apiUrl.includes("ip-api.com")) {
      url = `${apiUrl}/${ip}?fields=status,country,countryCode,regionName,city,query`;
    } else if (apiUrl.includes("ipinfo.io")) {
      url = `${apiUrl}/${ip}`;
    } else if (apiUrl.includes("ipgeolocation.io")) {
      // You'll need to add your API key for this service
      url = `${apiUrl}?apiKey=YOUR_API_KEY&ip=${ip}`;
    } else {
      url = `${apiUrl}/${ip}`;
    }

    const response = await fetch(url, {
      timeout: 5000,
      headers: {
        "User-Agent": "Next.js Geo App/1.0",
      },
    });

    if (!response.ok) {
      throw new Error(`HTTP ${response.status}`);
    }

    const data = await response.json();

    // Handle different API response formats
    if (apiUrl.includes("ip-api.com")) {
      if (data.status === "fail") {
        throw new Error(data.message || "API Error");
      }
      return {
        country_code: data.countryCode,
        country_name: data.country,
        city: data.city,
        region: data.regionName,
        ip: data.query,
      };
    } else if (apiUrl.includes("ipinfo.io")) {
      return {
        country_code: data.country,
        country_name: this.getCountryName(data.country),
        city: data.city,
        region: data.region,
        ip: data.ip,
      };
    } else if (apiUrl.includes("ipgeolocation.io")) {
      return {
        country_code: data.country_code2,
        country_name: data.country_name,
        city: data.city,
        region: data.state_prov,
        ip: data.ip,
      };
    }

    // Generic format
    return {
      country_code: data.country_code || data.countryCode || data.country,
      country_name: data.country_name || data.country,
      city: data.city,
      region: data.region || data.regionName,
      ip: data.ip || ip,
    };
  }

  isLocalIP(ip) {
    return (
      ip === "127.0.0.1" ||
      ip === "::1" ||
      ip.startsWith("192.168.") ||
      ip.startsWith("10.") ||
      ip.startsWith("172.16.") ||
      ip.startsWith("172.17.") ||
      ip.startsWith("172.18.") ||
      ip.startsWith("172.19.") ||
      ip.startsWith("172.2") ||
      ip.startsWith("172.30.") ||
      ip.startsWith("172.31.")
    );
  }

  getCountryName(countryCode) {
    const countryNames = {
      IN: "India",
      PK: "Pakistan",
      US: "United States",
      GB: "United Kingdom",
      CA: "Canada",
      AU: "Australia",
      DE: "Germany",
      FR: "France",
      JP: "Japan",
      CN: "China",
      BR: "Brazil",
      MX: "Mexico",
      ES: "Spain",
      IT: "Italy",
      RU: "Russia",
    };
    return countryNames[countryCode] || "Unknown";
  }
}

// Create singleton instance
let geoIPInstance = null;

function getGeoIPAPI() {
  if (!geoIPInstance) {
    geoIPInstance = new GeoIPAPI();
  }
  return geoIPInstance;
}

module.exports = { getGeoIPAPI };
