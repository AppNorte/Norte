// NFC-e (cupom fiscal eletrônico): interpreta o conteúdo do QR Code.
// Formato: https://<sefaz>/...?p=CHAVE|versao|ambiente|...  (offline inclui dia|valor)

export interface NfceQr {
  url: string;
  chave: string; // 44 dígitos
  uf: string;
  cnpj: string;
  month: string | null; // YYYY-MM da emissão (vem na chave)
  total: number | null; // centavos (só no formato offline)
  day: number | null;
}

const UF: Record<string, string> = {
  "11": "RO", "12": "AC", "13": "AM", "14": "RR", "15": "PA", "16": "AP", "17": "TO", "21": "MA", "22": "PI", "23": "CE", "24": "RN", "25": "PB", "26": "PE", "27": "AL", "28": "SE", "29": "BA", "31": "MG", "32": "ES", "33": "RJ", "35": "SP", "41": "PR", "42": "SC", "43": "RS", "50": "MS", "51": "MT", "52": "GO", "53": "DF",
};

export function parseNfceQr(raw: string): NfceQr | null {
  const text = raw.trim();
  let url: URL;
  try {
    url = new URL(text);
  } catch {
    return null;
  }
  if (url.protocol !== "https:" && url.protocol !== "http:") return null;
  const p = url.searchParams.get("p") ?? url.searchParams.get("chNFe") ?? "";
  const parts = p.split("|");
  const chave = (parts[0] ?? "").replace(/\D/g, "");
  if (chave.length !== 44) return null;
  const yy = chave.slice(2, 4);
  const mm = chave.slice(4, 6);
  // Formato offline (contingência): chave|2|amb|dia|valor|digest|idToken|hash
  const offline = parts.length >= 8;
  const day = offline ? Number(parts[3]) || null : null;
  const total = offline && parts[4] ? Math.round(Number(parts[4].replace(",", ".")) * 100) || null : null;
  return {
    url: text,
    chave,
    uf: UF[chave.slice(0, 2)] ?? chave.slice(0, 2),
    cnpj: chave.slice(6, 20),
    month: /^\d{2}$/.test(yy) && Number(mm) >= 1 && Number(mm) <= 12 ? `20${yy}-${mm}` : null,
    total,
    day,
  };
}

export interface NfceDetails {
  store: string | null;
  total: number | null; // centavos
  date: string | null; // YYYY-MM-DD
  items: { name: string; qty: number; unit: string; total: number | null }[];
}
