/**
 * Startup Environment Validation for Student360 AI
 * Ensures all required secrets are configured in production environment.
 */

export function validateProductionEnvironment(): { valid: boolean; errors: string[] } {
  const errors: string[] = [];
  const isProd = process.env.NODE_ENV === "production";

  if (isProd) {
    if (!process.env.DATABASE_URL) {
      errors.push("Missing required environment variable: DATABASE_URL");
    }
    if (!process.env.JWT_SECRET || process.env.JWT_SECRET.includes("change_me")) {
      errors.push("Insecure or missing JWT_SECRET in production environment");
    }
    if (!process.env.CRON_SECRET || process.env.CRON_SECRET.includes("change_me")) {
      errors.push("Insecure or missing CRON_SECRET for scheduled task authorization");
    }
    if (!process.env.APP_URL) {
      errors.push("Missing required environment variable: APP_URL");
    }
  }

  if (errors.length > 0 && isProd) {
    console.error("CRITICAL PRODUCTION CONFIGURATION ERROR:");
    errors.forEach((err) => console.error(`  - ${err}`));
  }

  return {
    valid: errors.length === 0,
    errors,
  };
}
