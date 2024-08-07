/**
 * CLI utility to mirror a JSR scope and its packages.
 *
 * @module
 */

// Imports
import { ensureDir } from "@std/fs"
import { dirname } from "@std/path"
import { type levellike as loglevel, Logger } from "@libs/logger"
import { mirror } from "../mirror/jsr.ts"
import { parseArgs } from "@std/cli"
import { assert } from "@std/assert"

const { help, loglevel, scope, packages = [], mod, config, registry, registryApi, expand } = parseArgs(Deno.args, {
  boolean: ["help", "mod", "expand"],
  alias: { help: "h", loglevel: "l", scope: "s", packages: "p", registry: "r", registryApi: "R", config: "c", expand: "e" },
  string: ["loglevel", "scope", "packages", "registry", "registryApi", "config"],
  collect: ["packages"],
})
if (help) {
  console.log("Mirror a JSR scope and its packages.")
  console.log("https://github.com/lowlighter/libs - MIT License - (c) 2024 Simon Lecoq")
  console.log("")
  console.log("This tool is intended to mirror a JSR scope and its packages to a local directory.")
  console.log("It will create a new file for each export found with a re-export.")
  console.log("If the `mod` flag is set, it will also create a main `mod.ts` entry point.")
  console.log("")
  console.log("Usage:")
  console.log("  deno --allow-read --allow-net --allow-write=. mirror.ts [options]")
  console.log("")
  console.log("Options:")
  console.log("  -h, --help                                   Show this help")
  console.log("  -l, --loglevel=[log]                         Log level (disabled, debug, log, info, warn, error)")
  console.log("  -s, --scope                                  Scope name to mirror")
  console.log("  -p, --packages                               List of package within the scope to mirror (can be used multiple times)")
  console.log("  -m, --mod                                    Whether to create a main `mod.ts` entry point")
  console.log("  -e, --expand                                 Whether to expand the list of exported symbols (require write access to TMP and run access to `deno doc`)")
  console.log("  [-r, --registry=https://jsr.io]              JSR registry URL")
  console.log("  [-R, --registry-api=https://api.jsr.io]      JSR API registry URL")
  console.log("  -c, --config                                 Path to deno configuration file. If specified it'll be updated with all found exports and versioned with the current date")
  console.log("")
  Deno.exit(0)
}
assert(scope, "scope is required")
const logger = new Logger({ level: loglevel as loglevel })

const { files } = await mirror({ scope: scope!, packages, mod, config, registry, registryApi, logger, expand })
for (const [path, content] of Object.entries(files) as [string, string][]) {
  logger.log(`writing ${path}`)
  await ensureDir(dirname(path))
  await Deno.writeTextFile(path, content)
}
