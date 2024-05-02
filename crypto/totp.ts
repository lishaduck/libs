/**
 * Time-based One-Time Password (TOTP) library
 *
 * The following code has been ported and rewritten by Simon Lecoq from Rajat's original work at:
 * https://hackernoon.com/how-to-implement-google-authenticator-two-factor-auth-in-javascript-091wy3vh3
 *
 * Significant changes includes:
 * - Use of native WebCrypto and Typed buffer APIs instead of Node.js APIs
 * - Follow the Google Authenticator spec at https://github.com/google/google-authenticator/wiki/Key-Uri-Format
 *   - Ignored parameters are hard-coded to their default values
 * - Code was condensed
 *
 * The following resource can be used to validate the implementation:
 * https://www.verifyr.com/en/otp/check
 * ________________________________________________________________________________
 *
 * Copyright (c) Lecoq Simon <@lowlighter>. (MIT License)
 * https://github.com/lowlighter/libs/blob/main/LICENSE
 */

// Imports
import { decodeBase32, encodeBase32 } from "jsr:@std/encoding/base32"

/**
 * Returns a HMAC-based OTP.
 */
async function htop(secret: string, counter: bigint) {
  const buffer = new DataView(new ArrayBuffer(8))
  buffer.setBigUint64(0, counter, false)
  const key = await crypto.subtle.importKey("raw", decodeBase32(secret), { name: "HMAC", hash: "SHA-1" }, false, ["sign"])
  const hmac = new Uint8Array(await crypto.subtle.sign("HMAC", key, buffer))
  const offset = hmac[hmac.length - 1] & 0xf
  const code = (hmac[offset] & 0x7f) << 24 | (hmac[offset + 1] & 0xff) << 16 | (hmac[offset + 2] & 0xff) << 8 | (hmac[offset + 3] & 0xff)
  return `${code % 10 ** 6}`.padStart(6, "0")
}

/**
 * Returns a Time-based OTP.
 */
export async function totp(secret: string, { t = Date.now(), dt = 0 } = {}) {
  return await htop(secret, BigInt(Math.floor(t / 1000 / 30) + dt))
}

/**
 * Issue a new Time-based OTP secret.
 * @example
 * ```ts
 * import { otpsecret } from "./totp.ts"
 * const secret = otpsecret()
 * console.log(secret)
 * ```
 */
export function otpsecret() {
  return encodeBase32(crypto.getRandomValues(new Uint8Array(20))).replaceAll("=", "")
}

/**
 * Returns an URL that can be used to be added in a authenticator application.
 *
 * @example
 * ```ts
 * import { otpauth } from "./totp.ts"
 * import { qrcode } from "../qrcode/mod.ts"
 * const url = otpauth({ issuer: "example.com", account: "alice" })
 * console.log(`Please scan the following QR Code:`)
 * qrcode(url.href, { output: "console" })
 * ```
 */
export function otpauth({ issuer, account, secret = otpsecret(), image }: { issuer: string; account: string; secret?: string; image?: string }) {
  if ((issuer.includes(":")) || (account.includes(":"))) {
    throw new RangeError("Label may not contain a colon character")
  }
  const label = encodeURIComponent(`${issuer}:${account}`)
  const params = new URLSearchParams({ secret, issuer, algorithm: "SHA1", digits: "6", period: "30" })
  if (image) {
    params.set("image", image)
  }
  const url = new URL(`otpauth://totp/${label}?${params}`)
  return url
}

/**
 * Verify Time-based OTP.
 *
 * @example
 * ```ts
 * import { verify } from "./totp.ts"
 * console.assert(await verify({ secret: "JBSWY3DPEHPK3PXP", token: 152125, t: 1708671725109 }))
 * console.assert(!await verify({ secret: "JBSWY3DPEHPK3PXP", token: 0, t: 1708671725109 }))
 * ```
 */
export async function verify({ secret, token, t = Date.now(), tolerance = 1 }: { secret: string; token: string | number; t?: number; tolerance?: number }) {
  for (let dt = -tolerance; dt <= tolerance; dt++) {
    if (Number(await totp(secret, { t, dt })) === Number(token)) {
      return true
    }
  }
  return false
}
