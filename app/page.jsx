import { headers } from "next/headers";
import styles from "./page.module.css";

export default async function Home() {
  // Get headers from the middleware
  // const headersList = await headers();

  // const geoData = {
  //   country: headersList.get("x-user-country") || "Unknown",
  //   countryName: headersList.get("x-user-country-name") || "Unknown",
  //   city: headersList.get("x-user-city") || "Unknown",
  //   region: headersList.get("x-user-region") || "Unknown",
  //   ip: headersList.get("x-user-ip") || "Unknown",
  //   source: headersList.get("x-geo-source") || "unknown",
  // };

  return (
    <div className={styles.container}>
      <main className={styles.main}>
        <div className={styles.content}>
          <div className={styles.flag}>🌍</div>

          <h1 className={styles.title}>Welcome to Our Exclusive Platform!</h1>

          <p className={styles.description}>
            Greetings! Lorem ipsum dolor sit amet, consectetur adipiscing elit.
            Sed do eiusmod tempor incididunt ut labore et dolore magna aliqua.
            Ut enim ad minim veniam, quis nostrud exercitation ullamco laboris
            nisi ut aliquip ex ea commodo consequat. Duis aute irure dolor in
            reprehenderit in voluptate velit esse cillum dolore eu fugiat nulla
            pariatur. Excepteur sint occaecat cupidatat non proident, sunt in
            culpa qui officia deserunt mollit anim id est laborum. Vestibulum
            ante ipsum primis in faucibus orci luctus et ultrices posuere
            cubilia curae; Mauris viverra veniam sit amet massa. Suspendisse
            potenti nullam ac tortor vitae purus faucibus ornare suspendisse sed
            nisi lacus. Pellentesque habitant morbi tristique senectus et netus
            et malesuada fames ac turpis egestas. Proin pharetra nonummy pede.
            Mauris et orci. Aenean nec lorem. In porttitor sed faucibus ut,
            tincidunt eu, pretium quis, sem.
          </p>

          {/* <div className={styles.features}>
            <div className={styles.feature}>
              <h3>🎯 Regional Content</h3>
              <p>
                Content tailored specifically for your region with local
                relevance and cultural context.
              </p>
            </div>
            <div className={styles.feature}>
              <h3>🌟 Premium Features</h3>
              <p>
                Access to exclusive tools and services available only in
                selected regions.
              </p>
            </div>
            <div className={styles.feature}>
              <h3>🔒 Secure Access</h3>
              <p>
                Server-side verification ensures you get the right content for
                your region.
              </p>
            </div>
            <div className={styles.feature}>
              <h3>📱 Mobile Optimized</h3>
              <p>
                Fully responsive design that works perfectly on all your
                devices.
              </p>
            </div>
          </div> */}

          {/* <div className={styles.geoInfo}>
            <h3>Access Information</h3>
            <div className={styles.infoGrid}>
              <span>Country:</span>{" "}
              <span>
                {geoData.countryName} ({geoData.country})
              </span>
              <span>Location:</span>{" "}
              <span>
                {geoData.city}, {geoData.region}
              </span>
              <span>IP Address:</span> <span>{geoData.ip}</span>
              <span>Data Source:</span> <span>{geoData.source}</span>
              <span>Status:</span>{" "}
              <span className={styles.granted}>✅ Access Granted</span>
            </div>
          </div> */}
        </div>
      </main>
    </div>
  );
}
