import { createHmac, timingSafeEqual } from "node:crypto";
import type { Plan } from "@/lib/plans";

type PaidPlan = Exclude<Plan, "free">;

export interface MonPayCheckoutTokenPayload {
  amount: number;
  customerPhone: string;
  expiresAt: number;
  plan: PaidPlan;
  requestId: string;
  transactionId: string;
  userEmail: string;
  userId: string;
}

function isPaidPlan(value: unknown): value is PaidPlan {
  return value === "pro" || value === "team";
}

function encode(value: string) {
  return Buffer.from(value, "utf8").toString("base64url");
}

function decode(value: string) {
  return Buffer.from(value, "base64url").toString("utf8");
}

function signPayload(payload: string, secret: string) {
  return createHmac("sha256", secret).update(payload, "utf8").digest("base64url");
}

export function signMonPayCheckoutToken(payload: MonPayCheckoutTokenPayload, secret: string) {
  const encodedPayload = encode(JSON.stringify(payload));
  const signature = signPayload(encodedPayload, secret);
  return `${encodedPayload}.${signature}`;
}

export function verifyMonPayCheckoutToken(token: string, secret: string) {
  const [encodedPayload, signature] = token.split(".");

  if (!encodedPayload || !signature) {
    return null;
  }

  const expectedSignature = signPayload(encodedPayload, secret);
  const signatureBuffer = Buffer.from(signature, "utf8");
  const expectedBuffer = Buffer.from(expectedSignature, "utf8");

  if (signatureBuffer.length !== expectedBuffer.length) {
    return null;
  }

  if (!timingSafeEqual(signatureBuffer, expectedBuffer)) {
    return null;
  }

  try {
    const payload = JSON.parse(decode(encodedPayload)) as Partial<MonPayCheckoutTokenPayload>;

    if (
      typeof payload.requestId !== "string" ||
      !payload.requestId ||
      typeof payload.transactionId !== "string" ||
      !payload.transactionId ||
      typeof payload.customerPhone !== "string" ||
      !payload.customerPhone ||
      typeof payload.userId !== "string" ||
      !payload.userId ||
      typeof payload.userEmail !== "string" ||
      !payload.userEmail ||
      !isPaidPlan(payload.plan) ||
      typeof payload.amount !== "number" ||
      !Number.isFinite(payload.amount) ||
      payload.amount <= 0 ||
      typeof payload.expiresAt !== "number" ||
      !Number.isFinite(payload.expiresAt)
    ) {
      return null;
    }

    if (payload.expiresAt < Date.now()) {
      return null;
    }

    return payload as MonPayCheckoutTokenPayload;
  } catch {
    return null;
  }
}
