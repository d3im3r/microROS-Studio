import { betterAuth } from "better-auth";
import { memoryAdapter } from "better-auth/adapters/memory";
import { nextCookies } from "better-auth/next-js";
import { Pool } from "pg";

type MemoryStore = {
  user: Record<string, unknown>[];
  session: Record<string, unknown>[];
  account: Record<string, unknown>[];
  verification: Record<string, unknown>[];
};

const globalForAuth = globalThis as unknown as {
  __microrosPgPool?: Pool;
  __microrosMemoryDb?: MemoryStore;
  __microrosWarnedPlaceholderDb?: boolean;
};

function hasValidDatabaseUrl(url: string | undefined): url is string {
  if (!url) return false;
  const trimmed = url.trim();
  if (!trimmed) return false;
  if (trimmed.includes("[YOUR-PASSWORD]") || trimmed.includes("[YOUR-PROJECT-REF]")) {
    if (!globalForAuth.__microrosWarnedPlaceholderDb) {
      globalForAuth.__microrosWarnedPlaceholderDb = true;
      console.warn(
        "[Better Auth] DATABASE_URL still contains a placeholder ([YOUR-PASSWORD]). Using in-memory storage until you set your real Supabase database password in .env.local."
      );
    }
    return false;
  }
  return true;
}

function getDatabase() {
  const connectionString = process.env.DATABASE_URL?.trim();
  const isBuildPhase = process.env.NEXT_PHASE === "phase-production-build";
  if (!process.env.NEXT_E2E && !isBuildPhase && hasValidDatabaseUrl(connectionString)) {
    const normalizedConnectionString = connectionString.replace(/:(\[)([^\][]+)(\])@/, ":$2@");
    if (!globalForAuth.__microrosPgPool) {
      globalForAuth.__microrosPgPool = new Pool({
        connectionString: normalizedConnectionString,
        max: 10,
        idleTimeoutMillis: 30000,
      });
    }
    return globalForAuth.__microrosPgPool;
  }
  if (!globalForAuth.__microrosMemoryDb) {
    globalForAuth.__microrosMemoryDb = {
      user: [],
      session: [],
      account: [],
      verification: [],
    };
  }
  return memoryAdapter(globalForAuth.__microrosMemoryDb);
}

const googleClientId = process.env.GOOGLE_CLIENT_ID?.trim();
const googleClientSecret = process.env.GOOGLE_CLIENT_SECRET?.trim();

export const isGoogleAuthConfigured = Boolean(googleClientId && googleClientSecret);

const configuredUrl = process.env.BETTER_AUTH_URL?.trim().replace(/\/+$/, "");
const baseURL = process.env.NEXT_E2E
  ? "http://127.0.0.1:3101"
  : process.env.NODE_ENV === "development"
    ? "http://localhost:3000"
    : configuredUrl || "http://localhost:3000";

export const auth = betterAuth({
  database: getDatabase(),
  secret: process.env.BETTER_AUTH_SECRET || "microros-studio-default-secret-key-2026-esp32",
  baseURL,
  trustedOrigins: [
    "http://localhost:3000",
    "http://127.0.0.1:3000",
    "http://127.0.0.1:3101",
    "http://localhost:3101",
    ...(configuredUrl ? [configuredUrl] : []),
  ],
  emailAndPassword: {
    enabled: true,
    minPasswordLength: 8,
  },
  socialProviders:
    googleClientId && googleClientSecret
      ? {
          google: {
            clientId: googleClientId,
            clientSecret: googleClientSecret,
          },
        }
      : undefined,
  plugins: [nextCookies()],
});
