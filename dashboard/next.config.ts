import type { NextConfig } from "next";

const devOrigins = ["localhost:3000", "127.0.0.1:3000", "localhost", "127.0.0.1"];
if (process.env.NEXT_PUBLIC_SITE_URL) {
  try {
    const url = new URL(process.env.NEXT_PUBLIC_SITE_URL);
    const host = url.host; // e.g. "10.10.3.29:3000"
    const hostname = url.hostname; // e.g. "10.10.3.29"
    if (host && !devOrigins.includes(host)) {
      devOrigins.push(host);
    }
    if (hostname && !devOrigins.includes(hostname)) {
      devOrigins.push(hostname);
    }
  } catch (e) {}
}

const nextConfig: NextConfig = {
  /* config options here */
  output: "standalone",
  allowedDevOrigins: devOrigins,
};

export default nextConfig;
