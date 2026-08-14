import path from "node:path";
import { pathToFileURL } from "node:url";

const SRC = pathToFileURL(path.resolve(import.meta.dirname, "../../src/")).href + "/";

/**
 * Lets the pipeline import the project's TypeScript modules by their "@/" alias,
 * so it uses the same inventory adapter the site does rather than a second copy
 * of the scraping logic that can drift.
 *
 * Run with: node --experimental-strip-types --import ./register.mjs run.mjs
 */
export async function resolve(specifier, context, nextResolve) {
  if (specifier.startsWith("@/")) {
    let target = SRC + specifier.slice(2);
    if (!/\.[a-z]+$/i.test(target)) target += ".ts";
    return nextResolve(target, context);
  }
  return nextResolve(specifier, context);
}
