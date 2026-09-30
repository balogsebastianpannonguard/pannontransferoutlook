import { cookies } from "next/headers";
import { timingSafeEqual } from "node:crypto";
import jwt from "jsonwebtoken";
import {
  findStaffUserByEmail,
  verifyPassword as bcryptVerifyPassword,
  recordStaffSuccessfulLogin,
} from "./staff-auth";

export const AUTH_COOKIE_NAME = "pannon_outlook_session";

const DEV_FALLBACK_SECRET = "pannon-outlook-local-development-secret";

function getCookieSecret(): string {
  const secret = process.env.OUTLOOK_COOKIE_SECRET || process.env.DISPATCHER_COOKIE_SECRET;
  if (secret) return secret;
  if (process.env.NODE_ENV === "production") {
    throw new Error("Missing OUTLOOK_COOKIE_SECRET (or DISPATCHER_COOKIE_SECRET)");
  }
  return DEV_FALLBACK_SECRET;
}

export type DispatcherRole = "dispatcher" | "admin";

export interface DispatcherUser {
  email: string;
  name: string;
  role: DispatcherRole;
  company?: string;
  loginAt: number;
  requireTwoFactor?: boolean;
  twoFactorEnabled?: boolean;
  staffId?: string;
}

export interface VerifyResult {
  success: boolean;
  message?: string;
  requireTwoFactor?: boolean;
  twoFactorEnabled?: boolean;
  user?: DispatcherUser;
}

const DEFAULT_COMPANY = "Pannon Transfer";
const SESSION_DAYS_REMEMBER = 3;
const SESSION_HOURS_SHORT = 12;

function safeEqual(a: string, b: string): boolean {
  const left = Buffer.from(a);
  const right = Buffer.from(b);
  return left.length === right.length && timingSafeEqual(left, right);
}

function isDispatcherRole(role: unknown): role is DispatcherRole {
  return role === "dispatcher" || role === "admin";
}

/** Optional break-glass account configured purely through environment variables. */
function envAccount(): DispatcherUser | null {
  const email = process.env.DISPATCHER_EMAIL;
  const password = process.env.DISPATCHER_PASSWORD;
  if (!email || !password) return null;
  const role = process.env.DISPATCHER_ROLE;
  return {
    email,
    name: process.env.DISPATCHER_NAME || "Pannon Diszpécser",
    role: isDispatcherRole(role) ? role : "dispatcher",
    company: process.env.DISPATCHER_COMPANY || DEFAULT_COMPANY,
    loginAt: Date.now(),
  };
}

export async function verifyCredentials(
  email: string,
  password: string
): Promise<VerifyResult> {
  if (!email || !password) {
    return { success: false, message: "Kérjük, adja meg a hozzáférési adatokat." };
  }

  const env = envAccount();
  if (
    env &&
    email.trim().toLowerCase() === env.email.toLowerCase() &&
    safeEqual(password, process.env.DISPATCHER_PASSWORD as string)
  ) {
    return { success: true, requireTwoFactor: false, twoFactorEnabled: false, user: env };
  }

  try {
    const user = await findStaffUserByEmail(email);
    if (!user) {
      return { success: false, message: "Hibás e-mail cím vagy jelszó." };
    }
    if (!isDispatcherRole(user.role)) {
      return { success: false, message: "Nincs jogosultságod a Diszpécser Központba." };
    }
    if (!user.isActivated || !user.hashedPassword) {
      return {
        success: false,
        message:
          "A fiók még nincs aktiválva. Kérlek használd a meghívó emailben kapott linket a fiókod aktiválásához.",
      };
    }
    const passwordMatch = await bcryptVerifyPassword(password, user.hashedPassword);
    if (!passwordMatch) {
      return { success: false, message: "Hibás e-mail cím vagy jelszó." };
    }
    if (user._id) {
      await recordStaffSuccessfulLogin(user._id);
    }
    return {
      success: true,
      requireTwoFactor: !!user.requireTwoFactor,
      twoFactorEnabled: !!user.twoFactorEnabled,
      user: {
        email: user.email,
        name: user.name || user.email.split("@")[0],
        role: user.role,
        company: process.env.DISPATCHER_COMPANY || DEFAULT_COMPANY,
        loginAt: Date.now(),
        requireTwoFactor: !!user.requireTwoFactor,
        twoFactorEnabled: !!user.twoFactorEnabled,
        staffId: user._id ? String(user._id) : undefined,
      },
    };
  } catch (err) {
    console.error("[verifyCredentials] mongo error", err);
    return { success: false, message: "Hálózati hiba, kérjük próbálja újra." };
  }
}

export async function getDispatcherProfile(user: DispatcherUser): Promise<DispatcherUser> {
  return { ...user, company: user.company || DEFAULT_COMPANY };
}

function sessionLifetime(remember: boolean, days?: number) {
  if (days) return { jwt: `${days}d`, cookieSeconds: days * 24 * 60 * 60 };
  if (remember) return { jwt: `${SESSION_DAYS_REMEMBER}d`, cookieSeconds: SESSION_DAYS_REMEMBER * 24 * 60 * 60 };
  return { jwt: `${SESSION_HOURS_SHORT}h`, cookieSeconds: undefined };
}

export function createSessionToken(
  user: DispatcherUser,
  remember: boolean = true,
  days?: number
): string {
  return jwt.sign({ ...user }, getCookieSecret(), {
    algorithm: "HS256",
    expiresIn: sessionLifetime(remember, days).jwt as jwt.SignOptions["expiresIn"],
  });
}

export function verifySessionToken(token: string): DispatcherUser | null {
  try {
    const payload = jwt.verify(token, getCookieSecret(), { algorithms: ["HS256"] }) as DispatcherUser;
    return isDispatcherRole(payload.role) ? payload : null;
  } catch {
    return null;
  }
}

export async function setSessionCookie(
  token: string,
  remember: boolean = true,
  days?: number
) {
  const cookieStore = await cookies();
  const { cookieSeconds } = sessionLifetime(remember, days);
  cookieStore.set(AUTH_COOKIE_NAME, token, {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
    path: "/",
    ...(cookieSeconds ? { maxAge: cookieSeconds } : {}),
  });
}

export async function clearSessionCookie() {
  const cookieStore = await cookies();
  cookieStore.delete(AUTH_COOKIE_NAME);
}

export async function getCurrentSession(): Promise<DispatcherUser | null> {
  const cookieStore = await cookies();
  const token = cookieStore.get(AUTH_COOKIE_NAME)?.value;
  if (!token) return null;
  return verifySessionToken(token);
}

export async function requireAuthSession(): Promise<DispatcherUser | null> {
  return getCurrentSession();
}
