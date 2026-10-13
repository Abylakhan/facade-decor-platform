import type { NextConfig } from "next";

// Static export: the public site is deployed to GitHub Pages.
// BASE_PATH is set by CI (e.g. "/facade-decor-platform"); empty for local dev.
const basePath = process.env.NEXT_PUBLIC_BASE_PATH ?? "";

const config: NextConfig = {
  output: "export",
  basePath,
  trailingSlash: true,
  images: { unoptimized: true },
  reactStrictMode: true,
  // `*.dev.tsx` pages (the render lab) exist only in development builds
  pageExtensions: process.env.NODE_ENV === "development" ? ["dev.tsx", "tsx", "ts"] : ["tsx", "ts"],
};

export default config;
