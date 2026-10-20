#!/usr/bin/env node
// Gives release builds their own identity, so Sema installs beside T3 Code
// instead of replacing it: bundle id, name, URL scheme, Electron profile and
// the ~/.sema state directory (server database, `t3` CLI shim).
// Every replacement must match exactly `count` times; an upstream rename
// fails the build instead of shipping a half-renamed app.
import { readFileSync, writeFileSync } from "node:fs";

const APP_ID = "dev.richardamare.sema";

const replacements = [
  [
    "scripts/build-desktop-artifact.ts",
    'const DESKTOP_APP_ID = "com.t3tools.t3code";',
    `const DESKTOP_APP_ID = "${APP_ID}";`,
    1,
  ],
  ["scripts/build-desktop-artifact.ts", '"T3 Code (Nightly)"', '"Sema"', 1],
  [
    "scripts/build-desktop-artifact.ts",
    '(desktopPackageJson.productName ?? "T3 Code")',
    '"Sema"',
    1,
  ],
  [
    "scripts/build-desktop-artifact.ts",
    'artifactName: "T3-Code-${version}-${arch}.${ext}"',
    'artifactName: "Sema-${version}-${arch}.${ext}"',
    1,
  ],
  [
    "scripts/build-desktop-artifact.ts",
    'schemes: ["t3code", "t3code-dev"]',
    'schemes: ["sema", "sema-dev"]',
    2,
  ],
  ["scripts/build-desktop-artifact.ts", 'executableName: "t3code"', 'executableName: "sema"', 1],
  ["scripts/build-desktop-artifact.ts", 'StartupWMClass: "t3code"', 'StartupWMClass: "sema"', 1],
  [
    "apps/desktop/src/electron/ElectronProtocol.ts",
    'const DESKTOP_PRODUCTION_SCHEME = "t3code";',
    'const DESKTOP_PRODUCTION_SCHEME = "sema";',
    1,
  ],
  ["apps/desktop/scripts/electron-launcher.mjs", ': "com.t3tools.t3code";', `: "${APP_ID}";`, 1],
  ["apps/desktop/scripts/electron-launcher.mjs", ': ["t3code"];', ': ["sema"];', 1],
  ["apps/desktop/src/app/DesktopEnvironment.ts", ': "com.t3tools.t3code",', `: "${APP_ID}",`, 1],
  [
    "apps/desktop/src/app/DesktopEnvironment.ts",
    'linuxWmClass: isDevelopment ? "t3code-dev" : "t3code"',
    'linuxWmClass: isDevelopment ? "sema-dev" : "sema"',
    1,
  ],
  [
    "apps/desktop/src/app/DesktopEarlyElectronStartup.ts",
    'linuxWmClass: isDevelopment ? "t3code-dev" : "t3code"',
    'linuxWmClass: isDevelopment ? "sema-dev" : "sema"',
    1,
  ],
  [
    "apps/desktop/src/app/DesktopUserData.ts",
    '{ current: "t3code-v2", legacy: "T3 Code (Alpha)" }',
    '{ current: "sema", legacy: "sema-legacy" }',
    1,
  ],
  [
    "apps/desktop/src/app/DesktopUserData.ts",
    'path.join(input.appDataDirectory, "t3code", "Local State")',
    'path.join(input.appDataDirectory, "sema-legacy", "Local State")',
    1,
  ],
  [
    "apps/desktop/src/app/DesktopLegacyLocalStorage.ts",
    'const V1_PROFILE_NAMES = ["T3 Code (Alpha)", "t3code"];',
    'const V1_PROFILE_NAMES = ["sema-legacy"];',
    1,
  ],
  [
    "apps/desktop/src/app/DesktopStatePaths.ts",
    'input.joinPath(input.homeDirectory, ".t3")',
    'input.joinPath(input.homeDirectory, ".sema")',
    1,
  ],
];

const contents = new Map();
const failures = [];
for (const [file, from, to, count] of replacements) {
  const source = contents.get(file) ?? readFileSync(file, "utf8");
  const found = source.split(from).length - 1;
  if (found !== count) {
    failures.push(`${file}: expected ${count} of ${JSON.stringify(from)}, found ${found}`);
    continue;
  }
  contents.set(file, source.replaceAll(from, to));
}
if (failures.length > 0) {
  console.error(`Identity patch no longer matches upstream:\n  ${failures.join("\n  ")}`);
  process.exit(1);
}
for (const [file, source] of contents) writeFileSync(file, source);
console.log(`Applied ${replacements.length} identity replacements.`);
