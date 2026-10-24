/**
 * Copies the platform-wide source files from movo-web into packages/shared,
 * so the apps use the same socket event names, tier labels, launch flags,
 * time helpers and enums as the web.
 *
 *   npm run sync-shared    copy from ../movo-web (or $MOVO_WEB_DIR)
 *   npm run check-shared   fail if a copy has drifted from the web version
 *
 * Never edit the synced files in packages/shared by hand — change them in
 * movo-web, then sync and commit both repos.
 */
import { existsSync, readFileSync, writeFileSync } from "node:fs";
import { dirname, join, resolve } from "node:path";
import { fileURLToPath } from "node:url";

const root = resolve(dirname(fileURLToPath(import.meta.url)), "..");
const web = resolve(process.env.MOVO_WEB_DIR ?? join(root, "..", "movo-web"));
const out = join(root, "packages", "shared");
const check = process.argv.includes("--check");

/* Web "@/lib/x" imports become sibling imports inside packages/shared */
const relink = (src) => src.replace(/from "@\/lib\/([\w/]+)"/g, (_, p) => `from "./${p.split("/").pop()}"`);

const FILES = [
  ["lib/socket/events.ts", "socketEvents.ts", relink],
  ["lib/normalizeTier.ts", "normalizeTier.ts", relink],
  ["lib/tierLabels.ts", "tierLabels.ts", relink],
  ["lib/winnipegTime.ts", "winnipegTime.ts", relink],
  ["lib/launchConfig.ts", "launchConfig.ts", relink],
  ["prisma/schema.prisma", "enums.ts", prismaEnums],
];

/* Turns every `enum X { A B }` in the Prisma schema into a const + union type */
function prismaEnums(schema) {
  const blocks = [...schema.matchAll(/^enum\s+(\w+)\s*\{([\s\S]*?)^\}/gm)];
  return blocks.map(([, name, body]) => {
    const values = body
      .replace(/\/\*[\s\S]*?\*\//g, "")
      .split("\n")
      .map((l) => l.replace(/\/\/.*$/, "").trim())
      .filter((l) => /^\w+$/.test(l));
    return [
      `export const ${name} = {`,
      ...values.map((v) => `  ${v}: "${v}",`),
      `} as const;`,
      `export type ${name} = (typeof ${name})[keyof typeof ${name}];`,
    ].join("\n");
  }).join("\n\n") + "\n";
}

const header = (src) =>
  `/* AUTO-SYNCED from movo-web/${src} by scripts/sync-shared.mjs — do not edit here. */\n\n`;

if (!existsSync(join(web, "package.json"))) {
  const msg = `[sync-shared] movo-web not found at ${web} (set MOVO_WEB_DIR)`;
  if (check) { console.warn(`${msg} — skipping drift check.`); process.exit(0); }
  console.error(msg);
  process.exit(1);
}

let drifted = 0;
for (const [src, dest, transform] of FILES) {
  const expected = header(src) + transform(readFileSync(join(web, src), "utf8").replace(/\r\n/g, "\n"));
  const target = join(out, dest);
  const current = existsSync(target) ? readFileSync(target, "utf8").replace(/\r\n/g, "\n") : null;
  if (current === expected) continue;
  if (check) {
    console.error(`[sync-shared] DRIFT: packages/shared/${dest} differs from movo-web/${src}`);
    drifted++;
  } else {
    writeFileSync(target, expected);
    console.log(`[sync-shared] updated packages/shared/${dest}`);
  }
}

if (check && drifted) {
  console.error(`[sync-shared] ${drifted} file(s) out of date — run \`npm run sync-shared\` and commit.`);
  process.exit(1);
}
console.log(check ? "[sync-shared] shared files match movo-web." : "[sync-shared] done.");
