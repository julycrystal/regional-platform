const express = require("express");
const maxmind = require("maxmind");
const path = require("path");

const app = express();

let cityLookup;

// Initialize MaxMind database
async function initializeDatabase() {
  try {
    // For Vercel, place the database file in the same directory as server.js
    const dbPath = path.join(__dirname, "GeoLite2-Country.mmdb");
    cityLookup = await maxmind.open(dbPath);
    console.log("MaxMind database loaded successfully");
  } catch (error) {
    console.error("Failed to load MaxMind database:", error.message);
    console.log(
      "Please ensure you have GeoLite2-Country.mmdb in the root directory"
    );
  }
}

// Helper function to get client IP
function getClientIP(req) {
  // Vercel provides the real IP in x-forwarded-for header
  const forwarded = req.headers["x-forwarded-for"];
  if (forwarded) {
    return forwarded.split(",")[0].trim();
  }

  return (
    req.headers["x-real-ip"] ||
    req.connection.remoteAddress ||
    req.socket.remoteAddress ||
    req.ip
  );
}

// Helper function to check if country is allowed
function isAllowedCountry(countryCode) {
  const allowedCountries = ["IN", "PK"]; // India and Pakistan
  return allowedCountries.includes(countryCode);
}

// Middleware to check country and serve appropriate content
function checkCountryMiddleware(req, res, next) {
  try {
    if (!cityLookup) {
      // If database not loaded, block access in production
      console.log("Database not loaded, blocking access");
      return res.status(404).send("Not Found");
    }

    let clientIP = getClientIP(req);

    // Remove IPv6 prefix if present
    if (clientIP && clientIP.startsWith("::ffff:")) {
      clientIP = clientIP.substring(7);
    }

    // For Vercel preview deployments, you might want to allow localhost for testing
    // Remove this in production
    if (
      process.env.VERCEL_ENV === "preview" &&
      (!clientIP || clientIP === "127.0.0.1" || clientIP === "::1")
    ) {
      console.log("Preview environment - allowing localhost");
      return next();
    }

    // Lookup IP in database
    const geoData = cityLookup.get(clientIP);

    if (!geoData || !geoData.country) {
      console.log(`Unknown country for IP: ${clientIP}, blocking access`);
      return res.status(404).send("Not Found");
    }

    const countryCode = geoData.country.iso_code;
    const countryName = geoData.country.names.en;

    console.log(
      `Visitor from ${countryName} (${countryCode}) - IP: ${clientIP}`
    );

    if (isAllowedCountry(countryCode)) {
      // Add country info to request for use in templates
      req.geoData = {
        ip: clientIP,
        country: countryName,
        countryCode: countryCode,
        city: geoData.city ? geoData.city.names.en : "Unknown",
      };
      return next();
    } else {
      console.log(`Access denied for ${countryName} (${countryCode})`);
      return res.status(404).send("Not Found");
    }
  } catch (error) {
    console.error("Error in country check middleware:", error);
    // On error, block access
    return res.status(404).send("Not Found");
  }
}

// Apply country check middleware to main routes
app.use(checkCountryMiddleware);

// Main route - serve the Tailwind CSS page
app.get("/", (req, res) => {
  const countryData = req.geoData ? ` - ${req.geoData.country}` : "";

  const htmlContent = `
<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>BusyBee Web Design - Developer Network</title>
    <script src="https://cdn.tailwindcss.com"></script>
    <script>
        tailwind.config = {
            theme: {
                extend: {
                    fontFamily: {
                        sans: ['Inter', 'system-ui', 'sans-serif']
                    }
                }
            }
        }
    </script>
</head>
<body class="font-sans">
    <div class="min-h-screen bg-gradient-to-br from-slate-50 to-blue-50">
        <!-- Header -->
        <header class="bg-white shadow-sm border-b border-gray-100">
            <div class="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4">
                <div class="flex items-center justify-between">
                    <div class="flex items-center space-x-3">
                        <div class="w-8 h-8 bg-yellow-400 rounded-lg flex items-center justify-center">
                            <span class="text-black font-bold text-sm">🐝</span>
                        </div>
                        <h1 class="text-xl font-bold text-gray-900">
                            BusyBee Web Design${countryData}
                        </h1>
                    </div>
                </div>
            </div>
        </header>

        <!-- Hero Section -->
        <main class="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-16">
            <div class="text-center mb-16">
                <h2 class="text-4xl md:text-6xl font-bold text-gray-900 mb-6">
                    Join Our
                    <span class="text-yellow-500 block">Developer Network</span>
                </h2>
                <p class="text-xl text-gray-600 max-w-3xl mx-auto mb-8">
                    Are you a skilled developer looking for exciting opportunities?
                    We're building a network of talented professionals for innovative
                    web projects.
                </p>
            </div>

            <!-- Main Content -->
            <div class="grid lg:grid-cols-2 gap-12 items-center">
                <!-- Left Side - Image -->
                <div class="order-2 lg:order-1">
                    <div class="relative">
                        <div class="aspect-square bg-gradient-to-br from-yellow-100 to-yellow-200 rounded-2xl shadow-2xl overflow-hidden">
                            <div class="absolute inset-0 flex items-center justify-center">
                                <div class="text-center">
                                    <div class="text-8xl mb-4">👨‍💻</div>
                                    <p class="text-gray-600 font-medium">
                                        Developer Network
                                    </p>
                                </div>
                            </div>
                        </div>
                        <!-- Decorative elements -->
                        <div class="absolute -top-4 -right-4 w-24 h-24 bg-yellow-400 rounded-full opacity-20"></div>
                        <div class="absolute -bottom-6 -left-6 w-32 h-32 bg-blue-400 rounded-full opacity-10"></div>
                    </div>
                </div>

                <!-- Right Side - Call to Action -->
                <div class="order-1 lg:order-2">
                    <div class="bg-white rounded-2xl shadow-xl p-8 md:p-10">
                        <h3 class="text-3xl font-bold text-gray-900 mb-6">
                            Ready to Get Started?
                        </h3>

                        <div class="space-y-6 mb-8">
                            <div class="flex items-start space-x-3">
                                <div class="w-6 h-6 bg-green-100 rounded-full flex items-center justify-center mt-1">
                                    <span class="text-green-600 text-sm">✓</span>
                                </div>
                                <p class="text-gray-700">
                                    High-quality web development projects
                                </p>
                            </div>

                            <div class="flex items-start space-x-3">
                                <div class="w-6 h-6 bg-green-100 rounded-full flex items-center justify-center mt-1">
                                    <span class="text-green-600 text-sm">✓</span>
                                </div>
                                <p class="text-gray-700">
                                    Flexible collaboration opportunities
                                </p>
                            </div>

                            <div class="flex items-start space-x-3">
                                <div class="w-6 h-6 bg-green-100 rounded-full flex items-center justify-center mt-1">
                                    <span class="text-green-600 text-sm">✓</span>
                                </div>
                                <p class="text-gray-700">Work with modern technologies</p>
                            </div>
                        </div>

                        <!-- Contact Info -->
                        <div class="border-t pt-6">
                            <p class="text-sm text-gray-600 mb-4">
                                Get in touch via WhatsApp to discuss opportunities:
                            </p>

                            <div class="bg-green-50 rounded-lg p-4 mb-6">
                                <div class="flex items-center space-x-3 mb-2">
                                    <div class="w-8 h-8 bg-green-500 rounded-full flex items-center justify-center">
                                        <span class="text-white text-sm">📱</span>
                                    </div>
                                    <div>
                                        <p class="font-semibold text-gray-900">
                                            BusyBee Web Design
                                        </p>
                                        <p class="text-gray-600">+1 (830) 743-1011</p>
                                    </div>
                                </div>
                            </div>

                            <!-- WhatsApp Button -->
                            <a
                                href="https://wa.me/18307431011"
                                target="_blank"
                                rel="noopener noreferrer"
                                class="inline-flex items-center justify-center w-full bg-green-500 hover:bg-green-600 text-white font-semibold py-4 px-6 rounded-xl transition duration-200 transform hover:scale-105 shadow-lg hover:shadow-xl"
                            >
                                <svg
                                    class="w-6 h-6 mr-3"
                                    fill="currentColor"
                                    viewBox="0 0 24 24"
                                >
                                    <path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 005.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893A11.821 11.821 0 0020.885 3.488" />
                                </svg>
                                Message us on WhatsApp
                            </a>
                        </div>
                    </div>
                </div>
            </div>

            <!-- Skills Section -->
            <div class="mt-20">
                <h3 class="text-3xl font-bold text-center text-gray-900 mb-12">
                    Skills We're Looking For
                </h3>

                <div class="grid md:grid-cols-2 lg:grid-cols-4 gap-6">
                    <div class="bg-white rounded-xl p-6 shadow-lg hover:shadow-xl transition duration-200">
                        <div class="text-4xl mb-3">⚛️</div>
                        <h4 class="font-semibold text-gray-900 mb-2">React/Next.js</h4>
                        <p class="text-gray-600 text-sm">Modern frontend frameworks</p>
                    </div>

                    <div class="bg-white rounded-xl p-6 shadow-lg hover:shadow-xl transition duration-200">
                        <div class="text-4xl mb-3">🎨</div>
                        <h4 class="font-semibold text-gray-900 mb-2">UI/UX Design</h4>
                        <p class="text-gray-600 text-sm">Beautiful, functional interfaces</p>
                    </div>

                    <div class="bg-white rounded-xl p-6 shadow-lg hover:shadow-xl transition duration-200">
                        <div class="text-4xl mb-3">⚡</div>
                        <h4 class="font-semibold text-gray-900 mb-2">Python/Node.js/AWS</h4>
                        <p class="text-gray-600 text-sm">Backend development</p>
                    </div>

                    <div class="bg-white rounded-xl p-6 shadow-lg hover:shadow-xl transition duration-200">
                        <div class="text-4xl mb-3">💡</div>
                        <h4 class="font-semibold text-gray-900 mb-2">Many more technologies</h4>
                        <p class="text-gray-600 text-sm">Lets talk!</p>
                    </div>
                </div>
            </div>
        </main>

        <!-- Footer -->
        <footer class="bg-gray-900 text-white py-12 mt-20">
            <div class="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 text-center">
                <div class="flex items-center justify-center space-x-3 mb-4">
                    <div class="w-8 h-8 bg-yellow-400 rounded-lg flex items-center justify-center">
                        <span class="text-black font-bold text-sm">🐝</span>
                    </div>
                    <h3 class="text-xl font-bold">BusyBee Web Design</h3>
                </div>
                <p class="text-gray-400">
                    Building the future of web development, one project at a time.
                </p>
            </div>
        </footer>
    </div>
</body>
</html>`;

  res.send(htmlContent);
});

// API endpoint to get country info (optional - for debugging)
app.get("/api/country", (req, res) => {
  if (req.geoData) {
    res.json(req.geoData);
  } else {
    res.json({
      message: "Country information not available",
      note: "Database might not be loaded",
    });
  }
});

// Health check route (bypass country restriction for monitoring)
app.get("/health", (req, res) => {
  res.json({
    status: "OK",
    databaseLoaded: !!cityLookup,
    environment: process.env.VERCEL_ENV || "local",
    timestamp: new Date().toISOString(),
  });
});

// 404 handler for all other routes
// app.all("*", (req, res) => {
//   res.status(404).send("Not Found");
// });

// Initialize database
initializeDatabase();

// Export the Express app for Vercel
module.exports = app;
