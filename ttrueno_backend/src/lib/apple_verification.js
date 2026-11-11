import jwt from "jsonwebtoken";
import jwksClient from "jwks-rsa";

const appleKeys = jwksClient({
  jwksUri: "https://appleid.apple.com/auth/keys",
});

// 1. Get public key by key id (kid)
async function getApplePublicKey(kid) {
  return new Promise((resolve, reject) => {
    appleKeys.getSigningKey(kid, (err, key) => {
      if (err) return reject(err);
      const signingKey = key.getPublicKey();
      resolve(signingKey);
    });
  });
}

// 2. Verify and decode the Apple ID token
export async function verifyAppleToken(idToken) {
  const decodedHeader = jwt.decode(idToken, { complete: true });
  if (!decodedHeader) throw new Error("Invalid ID token");

  const kid = decodedHeader.header.kid;
  const alg = decodedHeader.header.alg;

  const publicKey = await getApplePublicKey(kid);

  const payload = jwt.verify(idToken, publicKey, {
    algorithms: [alg],
    issuer: "https://appleid.apple.com",
  });

  return payload;
}
