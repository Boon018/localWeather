import { readFile } from "node:fs/promises";
import { resolve } from "node:path";
import { execFileSync } from "node:child_process";
import vm from "node:vm";

const root = resolve(process.cwd());
const [source, built, standalone] = await Promise.all([
  readFile(resolve(root, "index.html"), "utf8"),
  readFile(resolve(root, "dist/index.html"), "utf8"),
  readFile(resolve(root, "dist/standalone.html"), "utf8"),
]);

for (const [name, html] of [
  ["index.html", source],
  ["dist/index.html", built],
  ["dist/standalone.html", standalone],
]) {
  if (!html.includes("<title>Alpenwetter</title>"))
    throw new Error(`${name}: missing title`);
  if (!html.includes("alpenwetter-version"))
    throw new Error(`${name}: missing version marker`);
  if (!html.includes("https://api.open-meteo.com"))
    throw new Error(`${name}: missing provider code`);
}

if (source !== built || source !== standalone) {
  throw new Error("Generated artifacts differ from the authoritative source");
}
for (const match of built.matchAll(/<script>([\s\S]*?)<\/script>/g))
  new vm.Script(match[1]);
if (
  /<script\b[^>]*\bsrc=/i.test(built) ||
  /<(?:link|img)\b[^>]*(?:href|src)="\//i.test(built)
)
  throw Error("External script or root-relative asset in standalone output");
execFileSync(process.execPath, ["scripts/build.mjs"]);
if (built !== (await readFile(resolve(root, "dist/index.html"), "utf8")))
  throw Error("Build is not reproducible or generated artifact was stale");

console.log("Artifact parity check passed");
