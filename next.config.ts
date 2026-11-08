import type { NextConfig } from "next";

// GITHUB_PAGES=true gera um site estático para github.io/<repo> (sem rotas /api;
// as funções de servidor ficam no Supabase). Sem isso, roda normal (ex.: Vercel).
const pages = process.env.GITHUB_PAGES === "true";
const basePath = pages ? process.env.PAGES_BASE_PATH || "/Norte" : "";

const nextConfig: NextConfig = {
  reactStrictMode: true,
  poweredByHeader: false,
  ...(pages ? { output: "export" as const, basePath, trailingSlash: true, images: { unoptimized: true } } : {}),
  env: {
    NEXT_PUBLIC_BASE_PATH: basePath,
    NEXT_PUBLIC_STATIC_EXPORT: pages ? "true" : "false",
  },
};

export default nextConfig;
