import { build } from "esbuild";
import { cp, mkdir, readFile, writeFile } from "node:fs/promises";
import { resolve, dirname } from "node:path";
import { fileURLToPath } from "node:url";
import { createHash } from "node:crypto";
const root = resolve(dirname(fileURLToPath(import.meta.url)), "..");
process.chdir(root);
const pkg = JSON.parse(await readFile("package.json", "utf8"));
const js = await build({
  define: { __APP_VERSION__: JSON.stringify(pkg.version) },
  entryPoints: ["src/main.js"],
  bundle: true,
  write: false,
  format: "iife",
  target: ["safari15", "firefox100", "chrome100"],
  legalComments: "inline",
});
const css = await readFile("src/styles/base.css", "utf8");
const code = js.outputFiles[0].text;
const template = await readFile("src/index.html", "utf8");
const worker = await readFile("sw.js", "utf8");
const buildId = createHash("sha256")
  .update(template + code + css + worker + pkg.version)
  .digest("hex")
  .slice(0, 12);
const html = template
  .replaceAll("{{VERSION}}", pkg.version)
  .replace("/* APP_CSS */", () => css)
  .replace("/* APP_JS */", () => code.replace(/<\/script/gi, "<\\/script"))
  .replace(
    "</head>",
    `<meta name="alpenwetter-build" content="${buildId}"></head>`,
  );
await mkdir("dist", { recursive: true });
for (const target of ["index.html", "dist/index.html", "dist/standalone.html"])
  await writeFile(target, html);
for (const file of ["manifest.webmanifest", "icon.svg"])
  await cp(file, "dist/" + file);
await writeFile(
  "dist/sw.js",
  worker.replace("alpen-shell-v1-1", `alpen-shell-${pkg.version}-${buildId}`),
);
await writeFile(
  "dist/version.json",
  JSON.stringify({ version: pkg.version, build: buildId }) + "\n",
);
console.log(
  `Built Alpenwetter ${pkg.version} (${buildId}); inline JS/CSS, no runtime dependencies.`,
);
