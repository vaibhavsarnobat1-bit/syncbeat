// One-command APK build for the SyncBeat Android wrapper.
//
//   pnpm run build:apk                         -> builds against the default URL in capacitor.config.ts
//   pnpm run build:apk -- https://new-host     -> rebuilds pointing at a different deployment
//
// Steps: cap sync (bakes URL into the Android project) -> launcher icons -> gradle assembleRelease
// Output: dist/SyncBeat.apk (release build, debug-signed — see README.md)
import { spawnSync } from "node:child_process";
import { copyFileSync, existsSync, mkdirSync, statSync, writeFileSync } from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const here = path.dirname(fileURLToPath(import.meta.url));
const appRoot = path.resolve(here, "..");
const androidDir = path.join(appRoot, "android");
const repoRoot = path.resolve(appRoot, "..", "..", "..", "..", ".."); // android-app -> artifacts -> workspace -> runner -> home -> syncbeat-full-source
const sdkDir = path.join(repoRoot, ".android-sdk");

const siteUrl = process.argv[2];
if (siteUrl) process.env.SYNCBEAT_URL = siteUrl;
process.env.ANDROID_HOME = sdkDir;
process.env.ANDROID_SDK_ROOT = sdkDir;

// Capacitor 7.6 Android library compiles at Java 21; use the project-local JDK 21 when present.
const localJdk21 = path.join(repoRoot, ".jdk21");
if (existsSync(path.join(localJdk21, "bin", "java.exe")) || existsSync(path.join(localJdk21, "bin", "java"))) {
  process.env.JAVA_HOME = localJdk21;
  process.env.PATH = `${localJdk21}${path.sep}bin;${process.env.PATH}`;
}

const q = (s) => (/\s/.test(s) ? `"${s}"` : s);
function step(name, cmd, args, opts = {}) {
  console.log(`\n=== ${name} ===`);
  const r = spawnSync(q(cmd), args.map(q), { stdio: "inherit", cwd: opts.cwd ?? appRoot, env: process.env, shell: true });
  if (r.status !== 0) {
    console.error(`Step failed: ${name} (exit ${r.status})`);
    process.exit(r.status ?? 1);
  }
}

if (!existsSync(androidDir)) {
  step("Add Android platform", "npx", ["cap", "add", "android"]);
}

// Point Gradle at the project-local SDK (local.properties is machine-specific, gitignored).
writeFileSync(
  path.join(androidDir, "local.properties"),
  `sdk.dir=${sdkDir.replace(/\\/g, "\\\\")}\n`
);

step("Capacitor sync (embeds site URL)", "npx", ["cap", "sync", "android"]);
step("Generate launcher icons", "node", [path.join(here, "make-icons.mjs")]);
step("Gradle assembleRelease", "gradlew.bat", ["assembleRelease"], { cwd: androidDir });

const built = path.join(androidDir, "app", "build", "outputs", "apk", "release", "app-release.apk");
if (!existsSync(built)) {
  console.error("Expected APK not found:", built);
  process.exit(1);
}
const distDir = path.join(appRoot, "dist");
mkdirSync(distDir, { recursive: true });
const out = path.join(distDir, "SyncBeat.apk");
copyFileSync(built, out);
console.log(`\nAPK ready: ${out} (${(statSync(out).size / 1048576).toFixed(1)} MB)`);
