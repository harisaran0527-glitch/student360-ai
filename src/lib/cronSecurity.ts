import crypto from "crypto";

export function authorizeCronRequest(req: Request): boolean {
  const cronSecret = process.env.CRON_SECRET || "student360_cron_authorization_secret_2026";

  const authHeader = req.headers.get("authorization");
  const querySecret = new URL(req.url).searchParams.get("cronSecret");

  let providedSecret = "";
  if (authHeader && authHeader.startsWith("Bearer ")) {
    providedSecret = authHeader.substring(7);
  } else if (querySecret) {
    providedSecret = querySecret;
  }

  if (!providedSecret) return false;

  try {
    const a = Buffer.from(providedSecret);
    const b = Buffer.from(cronSecret);
    if (a.length !== b.length) return false;
    return crypto.timingSafeEqual(a, b);
  } catch (err) {
    return false;
  }
}
