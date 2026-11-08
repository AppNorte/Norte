// Gera o site estático para o GitHub Pages (pasta out/).
// As rotas /api (servidor) não existem num site estático: ficam de fora do build
// e são substituídas pelas Edge Functions do Supabase (supabase/functions).
import { execSync } from "node:child_process";
import fs from "node:fs";
import path from "node:path";

const api = path.resolve("src/app/api");
const parked = path.resolve(".api-parked");
const moved = fs.existsSync(api);
if (moved) fs.renameSync(api, parked);
try {
  execSync("npx next build", { stdio: "inherit", env: { ...process.env, GITHUB_PAGES: "true" } });
  fs.writeFileSync(path.resolve("out/.nojekyll"), "");
  // GitHub Pages mostra 404.html quando a página não existe.
  if (fs.existsSync("out/404/index.html") && !fs.existsSync("out/404.html")) fs.copyFileSync("out/404/index.html", "out/404.html");
} finally {
  if (moved) fs.renameSync(parked, api);
}
