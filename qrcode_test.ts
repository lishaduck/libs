import { qrcode } from "./qrcode.ts"
import { expect } from "std/expect/expect.ts"
import { fn } from "std/expect/fn.ts"

Deno.test(`qrcode() for numeric mode`, () => {
  const expected = [
    "██████████████  ████████    ██████████████",
    "██          ██      ██  ██  ██          ██",
    "██  ██████  ██    ██  ██    ██  ██████  ██",
    "██  ██████  ██  ██    ████  ██  ██████  ██",
    "██  ██████  ██      ██      ██  ██████  ██",
    "██          ██    ██    ██  ██          ██",
    "██████████████  ██  ██  ██  ██████████████",
    "                  ██  ████                ",
    "    ██  ██████  ████  ██  ██      ██    ██",
    "██  ████████      ██████████  ██  ██    ██",
    "  ████████████  ██████    ██  ██    ██    ",
    "██    ████      ████  ██    ████████    ██",
    "██████████████    ████  ██  ████    ██████",
    "                ██                  ████  ",
    "██████████████      ████████    ██    ██  ",
    "██          ██  ████  ██  ████      ████  ",
    "██  ██████  ██  ██  ████        ██  ██  ██",
    "██  ██████  ██    ██████████████  ██  ██  ",
    "██  ██████  ██  ██████  ██    ██  ████  ██",
    "██          ██    ██  ████    ██████      ",
    "██████████████        ████  ████  ████  ██",
  ].map((line) => [...line].map((v, i) => !(i % 2) ? v : null).filter((v) => v).map((v) => v === "█"))
  expect(qrcode("123")).toEqual(expected)
})

Deno.test(`qrcode() for alphanumeric mode`, () => {
  const expected = [
    "██████████████  ████  ██    ██████████████",
    "██          ██    ████  ██  ██          ██",
    "██  ██████  ██      ██  ██  ██  ██████  ██",
    "██  ██████  ██  ████  ████  ██  ██████  ██",
    "██  ██████  ██    ██  ██    ██  ██████  ██",
    "██          ██        ██    ██          ██",
    "██████████████  ██  ██  ██  ██████████████",
    "                  ██                      ",
    "    ██  ██████  ████  ██████      ██    ██",
    "████  ████    ██      ██    ██          ██",
    "    ████████████    ██    ████  ██        ",
    "    ██    ██    ██████████████    ██    ██",
    "    ██  ██  ████  ████  ██████  ██  ██    ",
    "                ████      ██  ██  ██  ████",
    "██████████████          ████████    ██    ",
    "██          ██  ████          ██████      ",
    "██  ██████  ██  ██            ██    ██  ██",
    "██  ██████  ██    ████      ██      ████  ",
    "██  ██████  ██  ██  ████  ██    ██      ██",
    "██          ██    ████    ████      ██████",
    "██████████████    ████  ██      ██  ██  ██",
  ].map((line) => [...line].map((v, i) => !(i % 2) ? v : null).filter((v) => v).map((v) => v === "█"))
  expect(qrcode("FOO")).toEqual(expected)
})

Deno.test(`qrcode() for bytes mode`, () => {
  const expected = [
    "██████████████  ████        ██████████████",
    "██          ██    ██        ██          ██",
    "██  ██████  ██  ██  ████    ██  ██████  ██",
    "██  ██████  ██      ██  ██  ██  ██████  ██",
    "██  ██████  ██  ██      ██  ██  ██████  ██",
    "██          ██              ██          ██",
    "██████████████  ██  ██  ██  ██████████████",
    "                ████                      ",
    "          ████      ██      ██  ██  ██  ██",
    "  ████████            ████    ██████      ",
    "      ████████              ████  ██  ██  ",
    "    ██  ██    ██  ██  ████  ████  ████  ██",
    "████  ██    ██  ██████  ██    ██████    ██",
    "                ██████████        ██    ██",
    "██████████████          ██  ██  ████  ██  ",
    "██          ██  ████████  ██        ████  ",
    "██  ██████  ██    ██████████    ██  ██    ",
    "██  ██████  ██    ██      ██████  ██      ",
    "██  ██████  ██      ████  ██  ██████  ████",
    "██          ██              ████  ██      ",
    "██████████████      ████      ██    ████  ",
  ].map((line) => [...line].map((v, i) => !(i % 2) ? v : null).filter((v) => v).map((v) => v === "█"))
  expect(qrcode("foo")).toEqual(expected)
})

Deno.test(`qrcode() for empty content`, () => {
  const expected = [
    "██████████████    ██        ██████████████",
    "██          ██      ████    ██          ██",
    "██  ██████  ██  ██████████  ██  ██████  ██",
    "██  ██████  ██  ██████  ██  ██  ██████  ██",
    "██  ██████  ██    ██████    ██  ██████  ██",
    "██          ██    ██  ████  ██          ██",
    "██████████████  ██  ██  ██  ██████████████",
    "                                          ",
    "      ████  ████        ██        ████    ",
    "████      ██  ████    ████    ██████  ████",
    "████      ████████      ████████  ██    ██",
    "  ██  ████      ████████      ████    ██  ",
    "██  ████    ██  ██          ██████████████",
    "                ████      ██        ██████",
    "██████████████  ██████    ████    ████  ██",
    "██          ██    ██████  ████      ██    ",
    "██  ██████  ██  ████  ██    ██  ██  ████  ",
    "██  ██████  ██  ████    ██    ████        ",
    "██  ██████  ██    ██  ████    ██████  ████",
    "██          ██            ██  ██  ██  ████",
    "██████████████      ██████  ██████  ████  ",
  ].map((line) => [...line].map((v, i) => !(i % 2) ? v : null).filter((v) => v).map((v) => v === "█"))
  expect(qrcode("")).toEqual(expected)
})

Deno.test(`qrcode() with long content`, () => {
  expect(qrcode("Lorem ipsum dolor sit amet, consectetur adipiscing elit, sed do eiusmod tempor incididunt ut labore et dolore magna aliqua. Ut enim ad minim veniam, quis nostrud exercitation ullamco laboris nisi ut aliquip ex ea commodo consequat.")).not.toThrow()
})

Deno.test(`qrcode() with oversize content`, () => {
  expect(() => qrcode("lorem ipsum".repeat(1000))).toThrow("Data too long")
})

Deno.test(`qrcode() with svg output`, () => {
  const svg = qrcode("foo", { output: "svg" })
  expect(typeof svg).toBe("string")
  expect(svg).toMatch(/<svg.*?>[\s\S]+<\/svg>/)
})

Deno.test(`qrcode() with console output`, () => {
  const mock = fn()
  const unmocked = console.log
  Object.assign(console, { log: mock })
  try {
    expect(qrcode("foo", { output: "console" })).toBe(undefined)
    expect(mock).toHaveBeenCalledTimes(qrcode("foo").length)
  } finally {
    Object.assign(console, { log: unmocked })
  }
})