import { SignJWT, jwtVerify } from "jose";

const encoder = new TextEncoder();

const ACCESS_TOKEN_EXPIRY = "2h";
const REFRESH_TOKEN_EXPIRY = "30d";

function getSecret(secret: string) {
  return encoder.encode(secret);
}

export async function generateAccessToken(
  userId: string,
  secret: string
) {
  return await new SignJWT({})
    .setProtectedHeader({ alg: "HS256" })
    .setSubject(userId)
    .setIssuedAt()
    .setExpirationTime(ACCESS_TOKEN_EXPIRY)
    .sign(getSecret(secret));
}

export async function generateRefreshToken(
  userId: string,
  secret: string
) {
  return await new SignJWT({})
    .setProtectedHeader({ alg: "HS256" })
    .setSubject(userId)
    .setIssuedAt()
    .setExpirationTime(REFRESH_TOKEN_EXPIRY)
    .sign(getSecret(secret));
}

export async function verifyToken(
  token: string,
  secret: string
) {
  const { payload } = await jwtVerify(
    token,
    getSecret(secret)
  );

  return payload;
}