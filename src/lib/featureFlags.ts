/**
 * Feature flags for v1.1 -> v1.2 transition.
 *
 * ENABLE_ASSOCIATE_AUTH gates the PIN-based associate flow. Shipped in v1.1
 * for internal smoke/dogfood but disabled in production until v1.2 introduces
 * proper OAuth/session auth. Everything gated here: PIN generate/verify,
 * associate authenticated interview endpoint, /signin associate tab,
 * "Sign in to track progress" CTA on /, Generate PIN button in trainer UI.
 */
export function isAssociateAuthEnabled(): boolean {
  return process.env.ENABLE_ASSOCIATE_AUTH === 'true';
}
