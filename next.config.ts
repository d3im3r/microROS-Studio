import type { NextConfig } from "next";
const config: NextConfig = { distDir: process.env.NEXT_E2E ? ".next-e2e" : ".next" };
export default config;
