// Imports
import { expandGlob } from "@std/fs"
import { basename, dirname, fromFileUrl, resolve } from "@std/path"
import * as JSONC from "@std/jsonc"
import { DOMParser } from "@lowlighter/deno-dom/deno-dom-wasm"
import { Logger } from "@libs/logger"

// Load local configurations
const logger = new Logger()
const root = fromFileUrl(import.meta.resolve("../"))
const document = new DOMParser().parseFromString(await Deno.readTextFile(fromFileUrl(import.meta.resolve("./deno_readme.html"))), "text/html")!
let table = `<table><!-- Generated by deno_readme.ts, do not edit manually --><tr><td colspan="3"></td></tr>`
for await (const { path } of expandGlob(`*/deno.jsonc`, { root })) {
  const { icon, description, supported = [], playground, npm, ["deno.land/x"]: denoland } = JSONC.parse(await Deno.readTextFile(path)) as Record<string, unknown>
  const name = basename(dirname(path))
  const log = logger.with({ name, icon, supported, playground })
  const features = document.querySelector(`[data-for="${name}"]`)?.outerHTML ?? ""
  log.info()
  log.debug(features)
  table += `
  <tr><th colspan="3"><h2><a href="https://jsr.io/@libs/${name}"><code>${icon} @libs/${name}</code></a></h2>${description}</th></tr>
  <tr><th colspan="2">Metadata and compatibility</th><th>Features</th></tr>
  <tr><td colspan="3"></td></tr>
  <tr>
    <th><a href="https://jsr.io/@libs/${name}"><img src="https://jsr.io/badges/@libs/${name}"></a></th>
    <th rowspan="${4 + (denoland ? 1 : 0)}">${(supported as string[]).map((platform) => `<img height="18px" src="https://jsr.io/logos/${platform}.svg">`).join("")}</th>
    <td rowspan="${4 + (denoland ? 1 : 0)}">${features}</td>
  </tr>
  <tr><th>${npm ? `<a href="https://www.npmjs.com/package/@lowlighter/${name}"><img src="https://img.shields.io/npm/v/@lowlighter%2F${name}?logo=npm&labelColor=cb0000&color=183e4e"></a>` : ""}</th></tr>\
  ${denoland ? `<tr><th><a href="https://deno.land/x/${name}"><img src="https://img.shields.io/badge/deno.land%2Fx-${name}-0a3040?logo=deno&labelColor=black"></a></th></tr>` : ""}
  <tr><th>${playground ? `<a href="${playground}"><img src="https://img.shields.io/badge/Playground--black?style=flat&logo=windowsterminal&labelColor=black"></a>` : ""}</th></tr>
  <tr><th><a href="https://libs-coverage.lecoq.io/${name}"><img src="https://libs-coverage.lecoq.io/${name}/badge.svg"></a></th></tr>
  `.trim()
}
table += "</table>"

// Update README.md
let readme = await Deno.readTextFile(resolve(root, "README.md"))
readme = readme.replace(/<table>[\s\S]*<\/table>/, table)
await Deno.writeTextFile(resolve(root, "README.md"), readme)
logger.info("Updated README.md")
