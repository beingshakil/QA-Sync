// Builds the QASync browser extension:
//  1. copies public/reviewer.js into extension/ (one source of truth for the reviewer agent)
//  2. writes public/downloads/qasync-extension.zip, pointed at the production address
// Runs before `next build` (package.json "prebuild"); `npm run extension` runs it on its own.
import fs from "node:fs";
import path from "node:path";
import zlib from "node:zlib";
import { fileURLToPath } from "node:url";

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const extDir = path.join(root, "extension");
const outDir = path.join(root, "public", "downloads");

fs.copyFileSync(path.join(root, "public", "reviewer.js"), path.join(extDir, "reviewer.js"));

const prod =
  process.env.NEXT_PUBLIC_SITE_URL && !/localhost|127\.0\.0\.1/.test(process.env.NEXT_PUBLIC_SITE_URL)
    ? process.env.NEXT_PUBLIC_SITE_URL
    : process.env.VERCEL_PROJECT_PRODUCTION_URL
      ? `https://${process.env.VERCEL_PROJECT_PRODUCTION_URL}`
      : null;
const server = prod ? new URL(prod).origin : null;

const files = [];
(function walk(dir) {
  for (const name of fs.readdirSync(dir).sort()) {
    const full = path.join(dir, name);
    if (fs.statSync(full).isDirectory()) walk(full);
    else if (!/^(README\.md|\.DS_Store)$/.test(name)) files.push(full);
  }
})(extDir);

const entries = files.map((full) => {
  const rel = path.relative(extDir, full).split(path.sep).join("/");
  let data = fs.readFileSync(full);
  if (server && rel === "config.js") data = Buffer.from(`export const DEFAULT_SERVER = ${JSON.stringify(server)};\n`);
  if (server && rel === "manifest.json") {
    const m = JSON.parse(data.toString("utf8"));
    m.host_permissions = [...new Set([`${server}/*`, ...m.host_permissions])];
    data = Buffer.from(JSON.stringify(m, null, 2) + "\n");
  }
  return { name: rel, data };
});

// Minimal zip writer (deflate), so the build needs no extra dependency.
function zip(items) {
  const chunks = [];
  const central = [];
  let offset = 0;
  const dosTime = 0, dosDate = (2026 - 1980) << 9 | 1 << 5 | 1;
  for (const { name, data } of items) {
    const nameBuf = Buffer.from(name, "utf8");
    const comp = zlib.deflateRawSync(data, { level: 9 });
    const crc = zlib.crc32(data);
    const local = Buffer.alloc(30);
    local.writeUInt32LE(0x04034b50, 0); local.writeUInt16LE(20, 4); local.writeUInt16LE(0x0800, 6); local.writeUInt16LE(8, 8);
    local.writeUInt16LE(dosTime, 10); local.writeUInt16LE(dosDate, 12); local.writeUInt32LE(crc, 14);
    local.writeUInt32LE(comp.length, 18); local.writeUInt32LE(data.length, 22); local.writeUInt16LE(nameBuf.length, 26); local.writeUInt16LE(0, 28);
    chunks.push(local, nameBuf, comp);
    const c = Buffer.alloc(46);
    c.writeUInt32LE(0x02014b50, 0); c.writeUInt16LE(20, 4); c.writeUInt16LE(20, 6); c.writeUInt16LE(0x0800, 8); c.writeUInt16LE(8, 10);
    c.writeUInt16LE(dosTime, 12); c.writeUInt16LE(dosDate, 14); c.writeUInt32LE(crc, 16); c.writeUInt32LE(comp.length, 20);
    c.writeUInt32LE(data.length, 24); c.writeUInt16LE(nameBuf.length, 28); c.writeUInt32LE(offset, 42);
    central.push(c, nameBuf);
    offset += local.length + nameBuf.length + comp.length;
  }
  const centralBuf = Buffer.concat(central);
  const end = Buffer.alloc(22);
  end.writeUInt32LE(0x06054b50, 0); end.writeUInt16LE(items.length, 8); end.writeUInt16LE(items.length, 10);
  end.writeUInt32LE(centralBuf.length, 12); end.writeUInt32LE(offset, 16);
  return Buffer.concat([...chunks, centralBuf, end]);
}

fs.mkdirSync(outDir, { recursive: true });
const out = path.join(outDir, "qasync-extension.zip");
fs.writeFileSync(out, zip(entries.map((e) => ({ name: `qasync-extension/${e.name}`, data: e.data }))));
console.log(`extension: ${entries.length} files → ${path.relative(root, out)} (server: ${server ?? "local default"})`);
