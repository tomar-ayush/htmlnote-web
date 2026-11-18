import { cpSync, mkdirSync, rmSync, writeFileSync } from "node:fs";

const raw = (process.env.BACKEND_URL || "").trim().replace(/\/+$/, "");

if (!process.env.VERCEL && !raw) {
  process.exit(0);
}

if (!raw || !/^https?:\/\//i.test(raw)) {
  console.error("BACKEND_URL environment variable must be set to your Cloud Run URL (e.g. https://htmlnote-api-xyz.a.run.app)");
  process.exit(1);
}

rmSync(".vercel/output", { recursive: true, force: true });
mkdirSync(".vercel/output/static", { recursive: true });
cpSync("dist", ".vercel/output/static", { recursive: true });

const config = {
  version: 3,
  routes: [
    { src: "^/api/(.*)$", dest: `${raw}/api/$1` },
    { src: "^/page/(.*)$", dest: `${raw}/page/$1` },
    { src: "^/view/(.*)$", dest: `${raw}/view/$1` },
    { src: "^/s/(.*)$", dest: `${raw}/s/$1` },
    { handle: "filesystem" },
    { src: "^/(.*)$", dest: "/index.html" },
  ],
};

writeFileSync(".vercel/output/config.json", JSON.stringify(config, null, 2));
