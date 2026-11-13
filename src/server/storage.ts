import "server-only";
import fs from "node:fs/promises";
import path from "node:path";

/**
 * File storage for uploads (screenshots, voice notes, design images).
 * - With BLOB_READ_WRITE_TOKEN (Vercel): private Vercel Blob; the stored key is "blob:<url>".
 * - Otherwise: .data/uploads on local disk; the stored key is the file name.
 * Files are always served through /api/uploads/:id, never from a public URL.
 */
const LOCAL_DIR = path.join(process.cwd(), ".data", "uploads");
const blobEnabled = () => !!process.env.BLOB_READ_WRITE_TOKEN;

export async function storeFile(name: string, mime: string, bytes: Buffer): Promise<string> {
  if (blobEnabled()) {
    const { put } = await import("@vercel/blob");
    const b = await put(`uploads/${name}`, bytes, { access: "private", contentType: mime, addRandomSuffix: false });
    return `blob:${b.url}`;
  }
  await fs.mkdir(LOCAL_DIR, { recursive: true });
  await fs.writeFile(path.join(LOCAL_DIR, name), bytes);
  return name;
}

export async function readFile(key: string): Promise<ReadableStream<Uint8Array> | Uint8Array | null> {
  if (key.startsWith("blob:")) {
    const { get } = await import("@vercel/blob");
    const r = await get(key.slice(5), { access: "private" });
    return r?.stream ?? null;
  }
  try {
    return new Uint8Array(await fs.readFile(path.join(LOCAL_DIR, path.basename(key))));
  } catch {
    return null;
  }
}
