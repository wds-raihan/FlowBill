import { SignJWT } from "jose";

const JWT_SECRET = new TextEncoder().encode(process.env.NEXTAUTH_SECRET);

export async function generatePDFToken(invoiceId: string) {
  const token = await new SignJWT({ invoiceId })
    .setProtectedHeader({ alg: "HS256" })
    .setIssuedAt()
    .setExpirationTime("5m") // 5 minutes expiry
    .sign(JWT_SECRET);

  return token;
}
