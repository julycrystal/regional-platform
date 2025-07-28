const express = require("express");
const maxmind = require("maxmind");
const path = require("path");
const fs = require("fs");
const https = require("https");

const app = express();
const PORT = process.env.PORT || 3000;

let cityLookup = null;

// Function to download file from URL
function downloadFile(url, dest) {
  return new Promise((resolve, reject) => {
    const file = fs.createWriteStream(dest);

    https
      .get(url, (response) => {
        if (response.statusCode !== 200) {
          reject(new Error(`Failed to download: ${response.statusCode}`));
          return;
        }

        response.pipe(file);

        file.on("finish", () => {
          file.close();
          resolve();
        });

        file.on("error", (err) => {
          fs.unlink(dest, () => {}); // Delete the file on error
          reject(err);
        });
      })
      .on("error", (err) => {
        reject(err);
      });
  });
}

// Initialize MaxMind database
async function initializeDatabase() {
  if (cityLookup) return;

  try {
    // Load the database
    cityLookup = await maxmind.open("GeoLite2-Country.mmdb");
    console.log("MaxMind database loaded successfully");
  } catch (error) {
    console.error("Failed to load MaxMind database:", error.message);
    console.log("Error details:", error);

    // Fallback: If no database, block all access in production
    if (process.env.VERCEL_ENV === "production") {
      console.log(
        "Production environment: blocking all access without database"
      );
    }
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

const NOT_FOUND_PAGE = `<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Not Found</title>
    <script src="https://cdn.tailwindcss.com"></script>
</head>
<body class="bg-gray-100 min-h-screen flex items-center justify-center">
    <div class="text-center p-8 bg-white rounded-lg shadow-lg max-w-md mx-4">
        <div class="mb-6">
            <svg class="mx-auto h-16 w-16 text-red-500" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-2.5L13.732 4c-.77-.833-1.964-.833-2.732 0L3.732 16.5c-.77.833.192 2.5 1.732 2.5z" />
            </svg>
        </div>
        <h1 class="text-3xl font-bold text-gray-900 mb-4">Not Found</h1>
        <p class="text-gray-600 text-lg leading-relaxed">
            Please try visiting without VPN or proxy
        </p>
    </div>
</body>
</html>`;

// Middleware to check country and serve appropriate content
function checkCountryMiddleware(req, res, next) {
  try {
    if (!cityLookup) {
      // If database not loaded, block access in production
      console.log("Database not loaded, blocking access");
      return res.status(404).send(NOT_FOUND_PAGE);
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
      return res.status(404).send(NOT_FOUND_PAGE);
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
        city: "N/A", // Country DB doesn't have city info
      };
      return next();
    } else {
      console.log(`Access denied for ${countryName} (${countryCode})`);
      return res.status(404).send(NOT_FOUND_PAGE);
    }
  } catch (error) {
    console.error("Error in country check middleware:", error);
    // On error, block access
    return res.status(404).send(NOT_FOUND_PAGE);
  }
}

// Apply country check middleware to main routes
app.use(checkCountryMiddleware);

// Main route - serve the Tailwind CSS page
app.get("/", (req, res) => {
  const countryData = req.geoData ? ` - ${req.geoData.country}` : "";

  const htmlContent = `<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>BusyBee Collective - Elite Developer Community</title>
    <script src="https://cdn.tailwindcss.com"></script>
    <script>
        tailwind.config = {
            theme: {
                extend: {
                    fontFamily: {
                        sans: ['Inter', 'system-ui', 'sans-serif']
                    },
                    animation: {
                        'float': 'float 6s ease-in-out infinite',
                        'glow': 'glow 2s ease-in-out infinite alternate',
                        'gradient': 'gradient 15s ease infinite',
                        'pulse-slow': 'pulse 3s ease-in-out infinite',
                    },
                    keyframes: {
                        float: {
                            '0%, 100%': { transform: 'translateY(0px)' },
                            '50%': { transform: 'translateY(-20px)' }
                        },
                        glow: {
                            'from': { boxShadow: '0 0 20px #fbbf24' },
                            'to': { boxShadow: '0 0 30px #f59e0b, 0 0 40px #f59e0b' }
                        },
                        gradient: {
                            '0%, 100%': { backgroundPosition: '0% 50%' },
                            '50%': { backgroundPosition: '100% 50%' }
                        }
                    }
                }
            }
        }
    </script>
    <style>
        .gradient-bg {
            background: linear-gradient(-45deg, #0f0f23, #1a1a2e, #16213e, #0f3460);
            background-size: 400% 400%;
            animation: gradient 15s ease infinite;
        }
        
        .glass {
            backdrop-filter: blur(20px);
            background: rgba(255, 255, 255, 0.1);
            border: 1px solid rgba(255, 255, 255, 0.2);
        }
        
        .neon-text {
            text-shadow: 0 0 10px #fbbf24, 0 0 20px #fbbf24, 0 0 30px #fbbf24;
        }

        .typewriter {
            overflow: hidden;
            border-right: .15em solid #fbbf24;
            white-space: nowrap;
            margin: 0 auto;
            letter-spacing: .15em;
            animation: typing 3.5s steps(40, end), blink-caret .75s step-end infinite;
        }

        @keyframes typing {
            from { width: 0 }
            to { width: 100% }
        }

        @keyframes blink-caret {
            from, to { border-color: transparent }
            50% { border-color: #fbbf24; }
        }
    </style>
</head>
<body class="font-sans overflow-x-hidden">
    <div class="min-h-screen gradient-bg relative">
        <!-- Animated background elements -->
        <div class="absolute inset-0 overflow-hidden">
            <div class="absolute top-20 left-10 w-72 h-72 bg-yellow-400 rounded-full mix-blend-multiply filter blur-xl opacity-20 animate-float"></div>
            <div class="absolute top-40 right-20 w-80 h-80 bg-blue-400 rounded-full mix-blend-multiply filter blur-xl opacity-20 animate-float" style="animation-delay: 2s;"></div>
            <div class="absolute -bottom-10 left-1/3 w-96 h-96 bg-purple-400 rounded-full mix-blend-multiply filter blur-xl opacity-20 animate-float" style="animation-delay: 4s;"></div>
        </div>

        <!-- Header -->
        <header class="relative z-10 glass border-b border-white/10">
            <div class="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
                <div class="flex items-center justify-between">
                    <div class="flex items-center space-x-4">
                        <div class="w-12 h-12 bg-gradient-to-br from-yellow-400 to-orange-500 rounded-2xl flex items-center justify-center shadow-lg animate-glow">
                            <span class="text-black font-bold text-lg">🐝</span>
                        </div>
                        <h1 class="text-2xl font-bold text-white neon-text">
                            BusyBee Collective
                        </h1>
                    </div>
                    <nav class="hidden md:flex space-x-8">
                        <a href="#collective" class="text-white/80 hover:text-yellow-400 transition duration-300">The Collective</a>
                        <a href="#opportunities" class="text-white/80 hover:text-yellow-400 transition duration-300">Opportunities</a>
                        <a href="#connect" class="text-white/80 hover:text-yellow-400 transition duration-300">Connect</a>
                    </nav>
                </div>
            </div>
        </header>

        <!-- Hero Section -->
        <main class="relative z-10 max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-20">
            <div class="text-center mb-20">
                <div class="mb-6">
                    <span class="inline-block px-6 py-2 bg-gradient-to-r from-yellow-400/20 to-orange-500/20 border border-yellow-400/30 rounded-full text-yellow-400 font-medium mb-8">
                        🚀 Elite Developer Community
                    </span>
                </div>
                <h2 class="text-5xl md:text-7xl font-bold text-white mb-8 leading-tight">
                    Where Code Meets
                    <span class="bg-gradient-to-r from-yellow-400 via-orange-500 to-pink-500 bg-clip-text text-transparent animate-pulse block mt-2">
                        Creativity
                    </span>
                </h2>
                <p class="text-xl text-white/80 max-w-4xl mx-auto mb-12 leading-relaxed">
                    Join an exclusive network of visionary developers who don't just write code—they craft digital experiences that transform businesses and inspire users. Ready to turn your passion into profit?
                </p>
                <div class="flex flex-col sm:flex-row gap-4 justify-center items-center">
                    <div class="glass px-4 py-2 rounded-lg">
                        <span class="text-yellow-400 font-bold">💰 $50-150/hour</span>
                        <span class="text-white/70 ml-2">Premium Rates</span>
                    </div>
                    <div class="glass px-4 py-2 rounded-lg">
                        <span class="text-blue-400 font-bold">🌍 Remote First</span>
                        <span class="text-white/70 ml-2">Work Anywhere</span>
                    </div>
                    <div class="glass px-4 py-2 rounded-lg">
                        <span class="text-purple-400 font-bold">🎯 Top 5%</span>
                        <span class="text-white/70 ml-2">Elite Projects</span>
                    </div>
                </div>
            </div>

            <!-- Main Content -->
            <div class="grid lg:grid-cols-2 gap-16 items-center mb-24" id="collective">
                <!-- Left Side - Interactive Visual -->
                <div class="order-2 lg:order-1">
                    <div class="relative group">
                        <div class="aspect-square glass rounded-3xl shadow-2xl overflow-hidden transform group-hover:scale-105 transition duration-500">
                            <div class="absolute inset-0 bg-gradient-to-br from-purple-600/20 to-blue-600/20"></div>
                            <div class="absolute inset-0 flex items-center justify-center">
                                <div class="text-center transform group-hover:scale-110 transition duration-500">
                                    <div class="text-8xl mb-6 animate-float">🚀</div>
                                    <p class="text-white font-bold text-xl tracking-wide mb-2">
                                        Elite Collective
                                    </p>
                                    <p class="text-white/70 text-sm px-4">
                                        Where talent meets opportunity
                                    </p>
                                    <div class="mt-6 flex justify-center space-x-2">
                                        <div class="w-3 h-3 bg-yellow-400 rounded-full animate-pulse"></div>
                                        <div class="w-3 h-3 bg-blue-400 rounded-full animate-pulse" style="animation-delay: 0.5s;"></div>
                                        <div class="w-3 h-3 bg-purple-400 rounded-full animate-pulse" style="animation-delay: 1s;"></div>
                                    </div>
                                </div>
                            </div>
                        </div>
                        <!-- Enhanced decorative elements -->
                        <div class="absolute -top-6 -right-6 w-32 h-32 bg-gradient-to-r from-yellow-400 to-orange-500 rounded-full opacity-30 animate-float blur-sm"></div>
                        <div class="absolute -bottom-8 -left-8 w-40 h-40 bg-gradient-to-r from-blue-400 to-purple-500 rounded-full opacity-20 animate-float blur-sm" style="animation-delay: 3s;"></div>
                    </div>
                </div>

                <!-- Right Side - Enhanced Value Proposition -->
                <div class="order-1 lg:order-2">
                    <div class="glass rounded-3xl shadow-2xl p-8 md:p-12 border border-white/20">
                        <h3 class="text-4xl font-bold text-white mb-8 bg-gradient-to-r from-white to-yellow-400 bg-clip-text text-transparent">
                            Your Next Chapter Starts Here
                        </h3>

                        <div class="space-y-6 mb-10">
                            <div class="flex items-start space-x-4 group">
                                <div class="w-10 h-10 bg-gradient-to-r from-green-400 to-emerald-500 rounded-2xl flex items-center justify-center mt-1 shadow-lg group-hover:scale-110 transition duration-300">
                                    <span class="text-white text-sm font-bold">💎</span>
                                </div>
                                <div>
                                    <h4 class="text-white font-semibold text-lg mb-1">Premium Projects Only</h4>
                                    <p class="text-white/80">Work on cutting-edge applications for Fortune 500 companies and innovative startups that are shaping tomorrow.</p>
                                </div>
                            </div>

                            <div class="flex items-start space-x-4 group">
                                <div class="w-10 h-10 bg-gradient-to-r from-blue-400 to-cyan-500 rounded-2xl flex items-center justify-center mt-1 shadow-lg group-hover:scale-110 transition duration-300">
                                    <span class="text-white text-sm font-bold">⚡</span>
                                </div>
                                <div>
                                    <h4 class="text-white font-semibold text-lg mb-1">Lightning-Fast Payouts</h4>
                                    <p class="text-white/80">Get paid within 48 hours of project completion. No more waiting weeks for invoices to process.</p>
                                </div>
                            </div>

                            <div class="flex items-start space-x-4 group">
                                <div class="w-10 h-10 bg-gradient-to-r from-purple-400 to-pink-500 rounded-2xl flex items-center justify-center mt-1 shadow-lg group-hover:scale-110 transition duration-300">
                                    <span class="text-white text-sm font-bold">🌟</span>
                                </div>
                                <div>
                                    <h4 class="text-white font-semibold text-lg mb-1">Growth & Recognition</h4>
                                    <p class="text-white/80">Build your reputation in our community and get exclusive access to higher-tier projects and mentorship opportunities.</p>
                                </div>
                            </div>
                        </div>

                        <!-- Enhanced Contact Info -->
                        <div class="border-t border-white/20 pt-8" id="connect">
                            <p class="text-white/70 mb-6 text-center font-medium">
                                Ready to elevate your career? Let's talk:
                            </p>

                            <div class="glass rounded-2xl p-6 mb-8 border border-white/10">
                                <div class="flex items-center space-x-4">
                                    <div class="w-12 h-12 bg-gradient-to-r from-green-400 to-emerald-500 rounded-2xl flex items-center justify-center shadow-lg">
                                        <span class="text-white text-lg">💬</span>
                                    </div>
                                    <div>
                                        <p class="font-bold text-white text-lg">
                                            BusyBee Collective
                                        </p>
                                        <p class="text-white/80 text-lg">+1 (830) 743-1011</p>
                                        <p class="text-white/60 text-sm">Response time: Under 2 hours</p>
                                    </div>
                                </div>
                            </div>

                            <!-- Enhanced WhatsApp Button -->
                            <a
                                href="https://wa.me/18307431011?text=Hi%20BusyBee!%20I'm%20interested%20in%20joining%20your%20elite%20developer%20collective.%20Can%20you%20tell%20me%20more%20about%20current%20opportunities?"
                                target="_blank"
                                rel="noopener noreferrer"
                                class="group relative inline-flex items-center justify-center w-full bg-gradient-to-r from-green-500 to-emerald-600 hover:from-green-600 hover:to-emerald-700 text-white font-bold py-5 px-8 rounded-2xl transition duration-300 transform hover:scale-105 shadow-2xl hover:shadow-green-500/25 overflow-hidden"
                            >
                                <div class="absolute inset-0 bg-gradient-to-r from-green-400 to-emerald-500 opacity-0 group-hover:opacity-100 transition duration-300"></div>
                                <svg
                                    class="w-6 h-6 mr-3 relative z-10 group-hover:rotate-12 transition duration-300"
                                    fill="currentColor"
                                    viewBox="0 0 24 24"
                                >
                                    <path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 005.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893A11.821 11.821 0 0020.885 3.488" />
                                </svg>
                                <span class="relative z-10 text-lg">Start Your Journey Today</span>
                            </a>
                        </div>
                    </div>
                </div>
            </div>

            <!-- Opportunities Section -->
            <div class="mt-24" id="opportunities">
                <div class="text-center mb-16">
                    <h3 class="text-4xl font-bold text-white mb-4 bg-gradient-to-r from-white via-yellow-400 to-orange-500 bg-clip-text text-transparent">
                        Current Hot Technologies
                    </h3>
                    <p class="text-white/70 text-lg">Master these skills and command premium rates</p>
                </div>

                <div class="grid md:grid-cols-2 lg:grid-cols-4 gap-8">
                    <div class="group glass rounded-2xl p-8 shadow-xl hover:shadow-2xl transition duration-300 transform hover:scale-105 border border-white/10">
                        <div class="text-5xl mb-4 group-hover:scale-110 transition duration-300">⚛️</div>
                        <h4 class="font-bold text-white mb-3 text-xl">React Ecosystem</h4>
                        <p class="text-white/70 group-hover:text-white/90 transition duration-300 mb-3">Next.js, Remix, React Native</p>
                        <div class="text-green-400 font-bold text-sm">$80-150/hr</div>
                    </div>

                    <div class="group glass rounded-2xl p-8 shadow-xl hover:shadow-2xl transition duration-300 transform hover:scale-105 border border-white/10">
                        <div class="text-5xl mb-4 group-hover:scale-110 transition duration-300">🧠</div>
                        <h4 class="font-bold text-white mb-3 text-xl">AI Integration</h4>
                        <p class="text-white/70 group-hover:text-white/90 transition duration-300 mb-3">ChatGPT APIs, Machine Learning</p>
                        <div class="text-green-400 font-bold text-sm">$100-200/hr</div>
                    </div>

                    <div class="group glass rounded-2xl p-8 shadow-xl hover:shadow-2xl transition duration-300 transform hover:scale-105 border border-white/10">
                        <div class="text-5xl mb-4 group-hover:scale-110 transition duration-300">☁️</div>
                        <h4 class="font-bold text-white mb-3 text-xl">Cloud Architecture</h4>
                        <p class="text-white/70 group-hover:text-white/90 transition duration-300 mb-3">AWS, Azure, Serverless</p>
                        <div class="text-green-400 font-bold text-sm">$90-160/hr</div>
                    </div>

                    <div class="group glass rounded-2xl p-8 shadow-xl hover:shadow-2xl transition duration-300 transform hover:scale-105 border border-white/10">
                        <div class="text-5xl mb-4 group-hover:scale-110 transition duration-300">🔗</div>
                        <h4 class="font-bold text-white mb-3 text-xl">Blockchain & Web3</h4>
                        <p class="text-white/70 group-hover:text-white/90 transition duration-300 mb-3">Smart contracts, DeFi, NFTs</p>
                        <div class="text-green-400 font-bold text-sm">$120-250/hr</div>
                    </div>
                </div>

                <!-- Success Stories -->
                <div class="mt-20">
                    <h4 class="text-3xl font-bold text-center text-white mb-12">
                        Success Stories From Our Collective
                    </h4>
                    <div class="grid md:grid-cols-3 gap-8">
                        <div class="glass rounded-2xl p-6 border border-white/10">
                            <div class="flex items-center mb-4">
                                <div class="w-12 h-12 bg-gradient-to-r from-blue-400 to-purple-500 rounded-full flex items-center justify-center text-white font-bold mr-4">
                                    JS
                                </div>
                                <div>
                                    <p class="text-white font-semibold">Jake S.</p>
                                    <p class="text-white/60 text-sm">React Developer</p>
                                </div>
                            </div>
                            <p class="text-white/80 italic mb-3">"Went from $40/hr freelancing to $120/hr with premium clients in just 6 months."</p>
                            <div class="text-yellow-400 text-sm">⭐⭐⭐⭐⭐</div>
                        </div>

                        <div class="glass rounded-2xl p-6 border border-white/10">
                            <div class="flex items-center mb-4">
                                <div class="w-12 h-12 bg-gradient-to-r from-green-400 to-emerald-500 rounded-full flex items-center justify-center text-white font-bold mr-4">
                                    MR
                                </div>
                                <div>
                                    <p class="text-white font-semibold">Maria R.</p>
                                    <p class="text-white/60 text-sm">Full-Stack Engineer</p>
                                </div>
                            </div>
                            <p class="text-white/80 italic mb-3">"The projects here actually challenge me. Plus, working with other elite devs has leveled up my skills."</p>
                            <div class="text-yellow-400 text-sm">⭐⭐⭐⭐⭐</div>
                        </div>

                        <div class="glass rounded-2xl p-6 border border-white/10">
                            <div class="flex items-center mb-4">
                                <div class="w-12 h-12 bg-gradient-to-r from-purple-400 to-pink-500 rounded-full flex items-center justify-center text-white font-bold mr-4">
                                    DK
                                </div>
                                <div>
                                    <p class="text-white font-semibold">David K.</p>
                                    <p class="text-white/60 text-sm">AI Specialist</p>
                                </div>
                            </div>
                            <p class="text-white/80 italic mb-3">"Finally found a network that values quality over quantity. The compensation reflects that."</p>
                            <div class="text-yellow-400 text-sm">⭐⭐⭐⭐⭐</div>
                        </div>
                    </div>
                </div>
            </div>
        </main>

        <!-- Enhanced Footer -->
        <footer class="relative z-10 glass border-t border-white/10 py-16 mt-32">
            <div class="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
                <div class="text-center mb-12">
                    <div class="flex items-center justify-center space-x-4 mb-6">
                        <div class="w-12 h-12 bg-gradient-to-br from-yellow-400 to-orange-500 rounded-2xl flex items-center justify-center shadow-lg animate-glow">
                            <span class="text-black font-bold text-lg">🐝</span>
                        </div>
                        <h3 class="text-2xl font-bold text-white neon-text">BusyBee Collective</h3>
                    </div>
                    <p class="text-white/70 text-lg mb-8 max-w-2xl mx-auto">
                        Connecting visionary developers with transformative projects. Your code, amplified.
                    </p>
                </div>
                
                <div class="grid md:grid-cols-3 gap-8 mb-12">
                    <div class="text-center">
                        <h4 class="text-white font-semibold mb-3">Quick Response</h4>
                        <p class="text-white/60">We reply within 2 hours, guaranteed</p>
                    </div>
                    <div class="text-center">
                        <h4 class="text-white font-semibold mb-3">Selective Process</h4>
                        <p class="text-white/60">Only top 5% of applicants join our collective</p>
                    </div>
                    <div class="text-center">
                        <h4 class="text-white font-semibold mb-3">Premium Rates</h4>
                        <p class="text-white/60">Earn 2-3x more than traditional freelancing</p>
                    </div>
                </div>
                
                <div class="flex justify-center space-x-8 pt-8 border-t border-white/10">
                    <a href="#" class="text-white/60 hover:text-yellow-400 transition duration-300">Privacy Policy</a>
                    <a href="#" class="text-white/60 hover:text-yellow-400 transition duration-300">Terms of Service</a>
                    <a href="#" class="text-white/60 hover:text-yellow-400 transition duration-300">Developer Support</a>
                </div>
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

// 404 handler for all other routes
// app.all("*", (req, res) => {
//   res.status(404).send("Not Found");
// });

// Initialize database
initializeDatabase();

// Start the server
app.listen(PORT, () => {
  console.log(`Server is running on port ${PORT}`);
});
