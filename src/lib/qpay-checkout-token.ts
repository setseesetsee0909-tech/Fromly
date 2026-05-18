import { createHmac, timingSafeEqual } from "node:crypto";
import type { Plan } from "@/lib/plans";

type PaidPlan = Exclude<Plan, "free">;

export interface QPayCheckoutTokenPayload {
  amount: number;
  expiresAt: number;
  invoiceId: string;
  plan: PaidPlan;
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

export function signQPayCheckoutToken(payload: QPayCheckoutTokenPayload, secret: string) {
  const encodedPayload = encode(JSON.stringify(payload));
  const signature = signPayload(encodedPayload, secret);
  return `${encodedPayload}.${signature}`;
}

export function verifyQPayCheckoutToken(token: string, secret: string) {
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
    const payload = JSON.parse(decode(encodedPayload)) as Partial<QPayCheckoutTokenPayload>;

    if (
      typeof payload.invoiceId !== "string" ||
      !payload.invoiceId ||
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

    return payload as QPayCheckoutTokenPayload;
  } catch {
    return null;
  }
}
