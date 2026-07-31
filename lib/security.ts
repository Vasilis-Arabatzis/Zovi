import argon2 from "argon2";
import { redis } from "./redis";

export async function hashPassword(password: string): Promise<string> {
  return argon2.hash(password, { type: argon2.argon2id });
}

export async function verifyPassword(
  hash: string,
  password: string,
): Promise<boolean> {
  return argon2.verify(hash, password);
}

const LOGIN_ATTEMPT_LIMIT = 5;
const LOGIN_ATTEMPT_WINDOW_SECONDS = 15 * 60;

export class RateLimitExceededError extends Error {
  constructor(public retryAfterSeconds: number) {
    super("Too many login attempts");
    this.name = "RateLimitExceededError";
  }
}

export async function checkLoginRateLimit(ip: string): Promise<void> {
  const key = `login_attempts:${ip}`;
  const attempts = await redis.incr(key);

  if (attempts === 1) {
    await redis.expire(key, LOGIN_ATTEMPT_WINDOW_SECONDS);
  }

  if (attempts > LOGIN_ATTEMPT_LIMIT) {
    const ttl = await redis.ttl(key);
    throw new RateLimitExceededError(ttl > 0 ? ttl : LOGIN_ATTEMPT_WINDOW_SECONDS);
  }
}

export async function resetLoginRateLimit(ip: string): Promise<void> {
  await redis.del(`login_attempts:${ip}`);
}
