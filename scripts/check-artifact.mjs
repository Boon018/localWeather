import { readFile } from "node:fs/promises";
import { resolve } from "node:path";

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

console.log("Artifact parity check passed");
