/** Text encoder */
const encoder = new TextEncoder()

/** Text decoder */
const decoder = new TextDecoder()

/**
 * Convert bytes to hexadecimal string representation.
 *
 * @example
 * ```ts
 * import { hex } from "./encryption.ts"
 * console.log(hex(new Uint8Array([0x0a, 0x42]))) // "0a42"
 */
export function hex(bytes: Uint8Array | number): string {
  if (typeof bytes === "number") {
    return bytes.toString(16).padStart(2, "0")
  }
  return Array.from(bytes).map((byte) => hex(byte)).join("")
}

/**
 * Convert hexadecimal string representation to bytes.
 *
 * @example
 * ```ts
 * import { bytes } from "./encryption.ts"
 * console.log(bytes("0a42")) // Uint8Array [ 10, 66 ]
 */
export function bytes(hex: string) {
  return new Uint8Array(hex.match(/.{1,2}/g)!.map((byte) => Number.parseInt(byte, 16)))
}

/**
 * Hash string and return hexadecimal string representation.
 *
 * Only algorithm supported by {@link https://developer.mozilla.org/en-US/docs/Web/API/SubtleCrypto/digest | SubtleCrypto.digest} are allowed.
 *
 * @example
 * ```ts
 * import { hash } from "./encryption.ts"
 * console.log(await hash("foo")) // "2c26b46b68ffc68ff99b453c1d30413413422d706483bfa0f98a5e886266e7ae"
 * ```
 */
export async function hash(message: string, { algorithm = "SHA-256" as AlgorithmIdentifier } = {}) {
  return hex(new Uint8Array(await crypto.subtle.digest(algorithm, encoder.encode(message))))
}

/**
 * Encrypt message with key.
 *
 * It returns an hexadecimal string structured as follows:
 * ```
 * ┌──────────────────────┬─────────────────┬────────────┬───────────┬────────────┬╴╴╴╴╴╴╴╴╴╴╴╴╴╴┐
 * │ Initial Vector [16b] │ Signature [16b] │ Hash [64b] │ Size [8b] │ Value [Xb] │ Padding [Yb] ┊
 * └──────────────────────┴─────────────────┴────────────┴───────────┴────────────┴╴╴╴╴╴╴╴╴╴╴╴╴╴╴┘
 * ```
 *
 * The following are used by the native {@link https://developer.mozilla.org/en-US/docs/Web/API/SubtleCrypto/encrypt | SubtleCrypto.encrypt} API:
 * - The initial vector (IV) is used by AES-GCM algorithm to ensure a same input will yield different outputs each time and prevent stream cipher attacks.
 * - The signature is used by the AES-GCM algorithm internally
 *
 * The following are used by this library:
 * - The hash (SHA-256) is used to ensure the integrity of the size and value after decryption, while providing extra entropy
 * - The size is the length of the secret value in bits, which is used to discard the padding after decryption
 * - The value is the actual secret
 * - The padding is used to obfuscate the actual value length, while providing extra entropy
 *
 * The `length` parameter is used to specify the length of the output hash in bits.
 * Supported values are `256` and `512`.
 * If set to `0` instead, padding will be disabled entirely allowing to encrypt larger values but at the cost of leaking the approximate values length.
 * Additionally, if a value size exceed 255 bytes, its integrity will only be checked by the hash field.
 *
 * @example
 * ```ts
 * import { decrypt, encrypt, exportKey } from "./encryption.ts"
 * const key = await exportKey({ seed: "", salt: "" })
 * console.assert(await decrypt(await encrypt("🍱 bento", { key }), { key }) === "🍱 bento")
 * ```
 *
 * @author Simon Lecoq (lowlighter)
 * @license MIT
 */
export async function encrypt(message: string, { key, length = 512 }: { key: CryptoKey | string; length?: 0 | 256 | 512 }) {
  if (typeof key === "string") {
    key = await importKey(key)
  }
  const size = hex(Math.min(encoder.encode(message).length, 2 ** 8 - 1))
  message = `${size}${message}`
  message = `${await hash(message)}${message}`
  const [iv, value] = [crypto.getRandomValues(new Uint8Array(16)), encoder.encode(message)]
  const unused = (length - 2 * (iv.length + 16 + value.length)) / 2
  if (length && (unused < 0)) {
    throw new RangeError(`Message too long for length: ${length}`)
  }
  const padding = crypto.getRandomValues(new Uint8Array(Math.max(0, unused)))
  const encoded = new Uint8Array([...value, ...padding])
  const encrypted = new Uint8Array(await crypto.subtle.encrypt({ name: "AES-GCM", iv }, key, encoded))
  const result = hex(new Uint8Array([...iv, ...encrypted]))
  return result
}

/**
 * Decrypt message encrypted by {@link encrypt} function with specified key.
 *
 * @example
 * ```ts
 * import { decrypt, encrypt, exportKey } from "./encryption.ts"
 * const key = await exportKey({ seed: "", salt: "" })
 * console.assert(await decrypt(await encrypt("🍱 bento", {key}), { key }) === "🍱 bento")
 * ```
 *
 * @author Simon Lecoq (lowlighter)
 * @license MIT
 */
export async function decrypt(message: string, { key }: { key: CryptoKey | string }) {
  if (typeof key === "string") {
    key = await importKey(key)
  }
  const content = bytes(message)
  const [iv, encoded] = [content.slice(0, 16), content.slice(16)]
  const decrypted = decoder.decode(await crypto.subtle.decrypt({ name: "AES-GCM", iv }, key, encoded))
  const [checksum, size, body] = [decrypted.slice(0, 64), decrypted.slice(64, 64 + 2), decrypted.slice(64 + 2)]
  const value = decoder.decode(encoder.encode(body).slice(0, size === "ff" ? Infinity : Number.parseInt(size, 16)))
  if (await hash(`${size}${value}`) !== checksum) {
    throw new RangeError(`Hash mismatch: expected ${checksum} but got ${await hash(`${size}${value}`)}`)
  }
  return value
}

/**
 * Convert encryption key to {@link https://developer.mozilla.org/en-US/docs/Web/API/CryptoKey | CryptoKey}.
 *
 * @example
 * ```
 * import { importKey } from "./encryption.ts"
 * console.assert(await importKey("e8bf6e323c23036402989c3e89fe8e6219c18edbfde74a461b5f27d806e51f47") instanceof CryptoKey)
 * ```
 */
export async function importKey(key: string) {
  return await crypto.subtle.importKey("raw", bytes(key), "AES-GCM", true, ["encrypt", "decrypt"])
}

/**
 * Generate encryption key from seed and salt.
 *
 * @example
 * ```
 * import { exportKey } from "./encryption.ts"
 * console.assert(typeof await exportKey({ seed: "", salt: "" }) === "string")
 * ```
 */
export async function exportKey({ seed, salt }: { seed: string; salt: string }) {
  const base = await crypto.subtle.importKey("raw", encoder.encode(seed), "PBKDF2", false, ["deriveKey"])
  const pbkdf2 = { name: "PBKDF2", salt: encoder.encode(salt), iterations: 1_000_000, hash: "SHA-256" }
  const key = await crypto.subtle.deriveKey(pbkdf2, base, { name: "AES-GCM", length: 256 }, true, ["encrypt", "decrypt"])
  const result = hex(new Uint8Array(await crypto.subtle.exportKey("raw", key)))
  return result
}
