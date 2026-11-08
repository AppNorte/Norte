// Prefixo do endereço quando o app é publicado numa subpasta (GitHub Pages: /Norte).
export const BASE_PATH = process.env.NEXT_PUBLIC_BASE_PATH || "";

/** Caminho de arquivo público (ícones, sw.js) com o prefixo certo. */
export function asset(path: string) {
  return `${BASE_PATH}${path}`;
}

/** Endereço absoluto de uma tela do app (para links de e-mail do login). */
export function appUrl(path: string) {
  return `${window.location.origin}${BASE_PATH}${path}`;
}
