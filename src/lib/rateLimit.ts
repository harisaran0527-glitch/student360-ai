/**
 * In-Memory Rate Limiter for Login Brute-Force & API Cooldowns
 */

interface RateLimitRecord {
  attempts: number;
  firstAttemptAt: number;
  blockedUntil?: number;
}

const rateLimitStore = new Map<string, RateLimitRecord>();

export function checkRateLimit(
  identifier: string,
  maxAttempts: number = 5,
  windowSeconds: number = 900 // 15 minutes
): { allowed: boolean; remainingAttempts: number; resetInSeconds: number } {
  const now = Date.now();
  const windowMs = windowSeconds * 1000;

  const record = rateLimitStore.get(identifier);

  if (!record) {
    rateLimitStore.set(identifier, {
      attempts: 1,
      firstAttemptAt: now,
    });
    return { allowed: true, remainingAttempts: maxAttempts - 1, resetInSeconds: windowSeconds };
  }

  // Check if currently blocked
  if (record.blockedUntil && now < record.blockedUntil) {
    const resetInSeconds = Math.ceil((record.blockedUntil - now) / 1000);
    return { allowed: false, remainingAttempts: 0, resetInSeconds };
  }

  // Reset window if expired
  if (now - record.firstAttemptAt > windowMs) {
    rateLimitStore.set(identifier, {
      attempts: 1,
      firstAttemptAt: now,
    });
    return { allowed: true, remainingAttempts: maxAttempts - 1, resetInSeconds: windowSeconds };
  }

  // Increment attempts
  record.attempts += 1;

  if (record.attempts > maxAttempts) {
    record.blockedUntil = now + windowMs;
    const resetInSeconds = Math.ceil(windowMs / 1000);
    return { allowed: false, remainingAttempts: 0, resetInSeconds };
  }

  return {
    allowed: true,
    remainingAttempts: maxAttempts - record.attempts,
    resetInSeconds: Math.ceil((record.firstAttemptAt + windowMs - now) / 1000),
  };
}

export function resetRateLimit(identifier: string) {
  rateLimitStore.delete(identifier);
}
