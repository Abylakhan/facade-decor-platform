// Dev-only helper: receives renders from /render-lab (dev server) and writes them
// to public/renders/. Usage: node scripts/render-save-server.mjs
import { createServer } from "node:http";
import { writeFile, mkdir } from "node:fs/promises";
import { join, dirname } from "node:path";
import { fileURLToPath } from "node:url";

const out = join(dirname(fileURLToPath(import.meta.url)), "..", "public", "renders");
await mkdir(out, { recursive: true });
createServer(async (req, res) => {
  res.setHeader("Access-Control-Allow-Origin", "http://localhost:3123");
  res.setHeader("Access-Control-Allow-Methods", "POST, OPTIONS");
  if (req.method === "OPTIONS") return res.end();
  const name = new URL(req.url, "http://x").searchParams.get("name") ?? "";
  if (req.method !== "POST" || !/^[a-z0-9-]{1,60}\.(webp|jpg)$/.test(name)) {
    res.statusCode = 400;
    return res.end("bad request");
  }
  const chunks = [];
  for await (const c of req) chunks.push(c);
  const body = Buffer.concat(chunks).toString();
  const b64 = body.replace(/^data:image\/\w+;base64,/, "");
  await writeFile(join(out, name), Buffer.from(b64, "base64"));
  console.log("saved", name, Math.round(b64.length * 0.75 / 1024), "KB");
  res.end("ok");
}).listen(3999, "127.0.0.1", () => console.log("render save server on :3999"));
