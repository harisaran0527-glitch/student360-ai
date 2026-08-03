import { SignJWT, jwtVerify } from "jose";
import bcrypt from "bcryptjs";
import { cookies } from "next/headers";

export type Role = "SUPER_ADMIN" | "ADMIN" | "FACULTY" | "STUDENT";

export interface UserSession {
  id: string;
  email: string;
  fullName: string;
  role: Role;
  studentId?: string;
  studentProfileId?: string;
  registerNo?: string;
}

export function validatePasswordPolicy(password: string): { valid: boolean; message?: string } {
  if (password.length < 8) {
    return { valid: false, message: "Password must be at least 8 characters long." };
  }
  if (!/[A-Z]/.test(password)) {
    return { valid: false, message: "Password must contain at least one uppercase letter." };
  }
  if (!/[a-z]/.test(password)) {
    return { valid: false, message: "Password must contain at least one lowercase letter." };
  }
  if (!/[0-9]/.test(password)) {
    return { valid: false, message: "Password must contain at least one number." };
  }
  return { valid: true };
}

export async function hashPassword(password: string): Promise<string> {
  return bcrypt.hash(password, 10);
}

export async function comparePassword(password: string, hash: string): Promise<boolean> {
  return bcrypt.compare(password, hash);
}

export async function createSessionToken(payload: UserSession): Promise<string> {
  return new SignJWT({ ...payload })
    .setProtectedHeader({ alg: "HS256" })
    .setIssuedAt()
    .setExpirationTime("24h")
    .sign(JWT_SECRET);
}

export async function verifySessionToken(token: string): Promise<UserSession | null> {
  try {
    const verified = await jwtVerify(token, JWT_SECRET);
    return verified.payload as unknown as UserSession;
  } catch (err) {
    return null;
  }
}

export async function getSession(): Promise<UserSession | null> {
  const cookieStore = cookies();
  const token = cookieStore.get("student360_session")?.value;
  if (!token) return null;
  return verifySessionToken(token);
}

export async function setSessionCookie(token: string) {
  const cookieStore = cookies();
  cookieStore.set("student360_session", token, {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    path: "/",
    maxAge: 60 * 60 * 24, // 24 hours
    sameSite: "lax",
  });
}

export async function clearSessionCookie() {
  const cookieStore = cookies();
  cookieStore.delete("student360_session");
}

/**
 * Server-Side Authorization Helpers
 */
export function isAuthorized(session: UserSession | null, allowedRoles: Role[]): boolean {
  if (!session) return false;
  if (allowedRoles.includes(session.role)) return true;
  return false;
}

export function isFacultyScoped(session: UserSession | null, targetDeptId?: string, facultyDeptId?: string): boolean {
  if (!session) return false;
  if (session.role === "ADMIN" || session.role === "SUPER_ADMIN") return true;
  if (session.role === "FACULTY") {
    if (!targetDeptId || !facultyDeptId) return true; // Allows assigned scope
    return targetDeptId === facultyDeptId;
  }
  return false;
}

export function isStudentSelfScoped(session: UserSession | null, targetStudentId: string): boolean {
  if (!session) return false;
  if (session.role === "ADMIN" || session.role === "SUPER_ADMIN" || session.role === "FACULTY") return true;
  if (session.role === "STUDENT") {
    return session.studentId === targetStudentId;
  }
  return false;
}

const JWT_SECRET = new TextEncoder().encode(
  process.env.JWT_SECRET || "student360_super_secret_jwt_key_2026_production"
);
