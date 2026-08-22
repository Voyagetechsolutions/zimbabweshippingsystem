// Sign in with Apple — server-side helpers shared by the `apple-auth` and
// `process-account-deletion` edge functions.
//
// Apple requires that an app offering Sign in with Apple revokes the user's
// Apple token when they delete their account (App Store Review Guideline 5.1.1
// (v)). Deleting the Supabase row alone is not enough and is checked by App
// Review. Revocation is a POST to https://appleid.apple.com/auth/revoke
// authenticated with a "client secret" that is really a short-lived ES256 JWT
// signed with the Sign in with Apple .p8 key.
//
// Required edge function secrets (set with `supabase secrets set`, never
// committed):
//   APPLE_TEAM_ID      10-character Apple Developer Team ID
//   APPLE_KEY_ID       10-character Key ID of the Sign in with Apple .p8 key
//   APPLE_CLIENT_ID    the bundle identifier, com.voyagetech.zimbabweshipphing
//   APPLE_PRIVATE_KEY  full PEM contents of the .p8 file
//
// The native (app) flow uses the bundle ID as the client_id and must NOT send a
// redirect_uri — that parameter is only for the web flow, and including it makes
// Apple reject the request with invalid_request.

const APPLE_AUDIENCE = "https://appleid.apple.com";
const APPLE_TOKEN_URL = "https://appleid.apple.com/auth/token";
const APPLE_REVOKE_URL = "https://appleid.apple.com/auth/revoke";

export interface AppleConfig {
  teamId: string;
  keyId: string;
  clientId: string;
  privateKey: string;
}

export function getAppleConfig(): AppleConfig | null {
  const teamId = Deno.env.get("APPLE_TEAM_ID") || "";
  const keyId = Deno.env.get("APPLE_KEY_ID") || "";
  const clientId = Deno.env.get("APPLE_CLIENT_ID") || "com.voyagetech.zimbabweshipphing";
  const privateKey = Deno.env.get("APPLE_PRIVATE_KEY") || "";
  if (!teamId || !keyId || !clientId || !privateKey) return null;
  return { teamId, keyId, clientId, privateKey };
}

export function requireAppleConfig(): AppleConfig {
  const config = getAppleConfig();
  if (!config) {
    throw new Error(
      "Sign in with Apple is not configured: set APPLE_TEAM_ID, APPLE_KEY_ID, APPLE_CLIENT_ID and APPLE_PRIVATE_KEY",
    );
  }
  return config;
}

const encoder = new TextEncoder();

function base64UrlEncode(bytes: Uint8Array): string {
  let binary = "";
  for (const byte of bytes) binary += String.fromCharCode(byte);
  return btoa(binary).replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/, "");
}

function base64Decode(value: string): Uint8Array {
  const binary = atob(value);
  const bytes = new Uint8Array(binary.length);
  for (let i = 0; i < binary.length; i++) bytes[i] = binary.charCodeAt(i);
  return bytes;
}

function base64UrlDecode(value: string): Uint8Array {
  const standard = value.replace(/-/g, "+").replace(/_/g, "/");
  return base64Decode(standard.padEnd(standard.length + ((4 - (standard.length % 4)) % 4), "="));
}

// The .p8 is PEM-wrapped PKCS#8. Secrets set through the dashboard often arrive
// with the line breaks escaped, so accept both real and literal "\n".
function pemToPkcs8(pem: string): Uint8Array {
  const body = pem
    .replace(/\\n/g, "\n")
    .replace(/-----BEGIN [^-]+-----/g, "")
    .replace(/-----END [^-]+-----/g, "")
    .replace(/\s+/g, "");
  if (!body) throw new Error("APPLE_PRIVATE_KEY does not contain a PEM body");
  return base64Decode(body);
}

/**
 * Builds the client secret JWT Apple expects in place of a static secret.
 * Apple allows up to 6 months of validity; we use 5 minutes because it is
 * minted fresh for every single request.
 */
export async function createAppleClientSecret(config = requireAppleConfig()): Promise<string> {
  const now = Math.floor(Date.now() / 1000);
  const header = { alg: "ES256", kid: config.keyId, typ: "JWT" };
  const payload = {
    iss: config.teamId,
    iat: now,
    exp: now + 300,
    aud: APPLE_AUDIENCE,
    sub: config.clientId,
  };

  const signingInput = `${base64UrlEncode(encoder.encode(JSON.stringify(header)))}.${
    base64UrlEncode(encoder.encode(JSON.stringify(payload)))
  }`;

  const key = await crypto.subtle.importKey(
    "pkcs8",
    pemToPkcs8(config.privateKey),
    { name: "ECDSA", namedCurve: "P-256" },
    false,
    ["sign"],
  );

  // WebCrypto returns the raw r||s pair, which is exactly the JOSE ES256
  // encoding — no DER unwrapping needed.
  const signature = new Uint8Array(
    await crypto.subtle.sign({ name: "ECDSA", hash: "SHA-256" }, key, encoder.encode(signingInput)),
  );

  return `${signingInput}.${base64UrlEncode(signature)}`;
}

export interface AppleTokenResponse {
  access_token?: string;
  refresh_token?: string;
  id_token?: string;
  expires_in?: number;
  token_type?: string;
}

/**
 * Trades the one-time authorization code from `AppleAuthentication.signInAsync`
 * for a long-lived refresh token. The code expires after 5 minutes and can only
 * be used once, which is why this has to happen at sign-in time rather than at
 * deletion time.
 */
export async function exchangeAppleAuthorizationCode(
  code: string,
  config = requireAppleConfig(),
): Promise<AppleTokenResponse> {
  const response = await fetch(APPLE_TOKEN_URL, {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body: new URLSearchParams({
      client_id: config.clientId,
      client_secret: await createAppleClientSecret(config),
      code,
      grant_type: "authorization_code",
    }),
  });

  const text = await response.text();
  if (!response.ok) {
    throw new Error(`Apple token exchange failed (${response.status}): ${text || "no body"}`);
  }
  return JSON.parse(text) as AppleTokenResponse;
}

export type AppleRevokeResult =
  | { ok: true; alreadyInvalid?: boolean }
  | { ok: false; error: string };

/**
 * Revokes an Apple token. Apple answers 200 with an empty body on success.
 *
 * `invalid_grant` means the token is already dead — the customer revoked access
 * from their Apple ID settings, or the token was revoked on an earlier attempt.
 * That satisfies the obligation just as well as a fresh revocation, so it is
 * reported as success rather than dressed up as an error.
 */
export async function revokeAppleToken(
  token: string,
  tokenTypeHint: "refresh_token" | "access_token" = "refresh_token",
  config = requireAppleConfig(),
): Promise<AppleRevokeResult> {
  try {
    const response = await fetch(APPLE_REVOKE_URL, {
      method: "POST",
      headers: { "Content-Type": "application/x-www-form-urlencoded" },
      body: new URLSearchParams({
        client_id: config.clientId,
        client_secret: await createAppleClientSecret(config),
        token,
        token_type_hint: tokenTypeHint,
      }),
    });

    if (response.ok) return { ok: true };

    const text = await response.text();
    if (text.includes("invalid_grant")) return { ok: true, alreadyInvalid: true };
    return { ok: false, error: `Apple revoke failed (${response.status}): ${text || "no body"}` };
  } catch (error) {
    return { ok: false, error: `Apple revoke request failed: ${(error as Error).message}` };
  }
}

/**
 * Reads the `sub` claim (Apple's stable per-app user identifier) out of an
 * identity token. No signature check: the token is only ever read straight from
 * Apple's own TLS-protected token response, and the value is stored for
 * bookkeeping rather than trusted for authorisation.
 */
export function appleSubFromIdToken(idToken?: string | null): string | null {
  if (!idToken) return null;
  const parts = idToken.split(".");
  if (parts.length !== 3) return null;
  try {
    const claims = JSON.parse(new TextDecoder().decode(base64UrlDecode(parts[1])));
    return typeof claims?.sub === "string" ? claims.sub : null;
  } catch {
    return null;
  }
}
