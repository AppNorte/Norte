// Bancos e carteiras: cor e sigla para o selo (sem usar marcas registradas).
export interface BankPreset {
  key: string;
  name: string;
  bg: string;
  fg: string;
  mark: string;
}

export const BANKS: BankPreset[] = [
  { key: "nubank", name: "Nubank", bg: "#820AD1", fg: "#ffffff", mark: "nu" },
  { key: "itau", name: "Itaú", bg: "#EC7000", fg: "#ffffff", mark: "itaú" },
  { key: "inter", name: "Banco Inter", bg: "#FF7A00", fg: "#ffffff", mark: "in" },
  { key: "bb", name: "Banco do Brasil", bg: "#FCEA14", fg: "#2A3D8F", mark: "BB" },
  { key: "caixa", name: "Caixa", bg: "#005CA9", fg: "#ffffff", mark: "CX" },
  { key: "bradesco", name: "Bradesco", bg: "#CC092F", fg: "#ffffff", mark: "B" },
  { key: "santander", name: "Santander", bg: "#EC0000", fg: "#ffffff", mark: "S" },
  { key: "neon", name: "Neon", bg: "#0DC5E8", fg: "#0E2A45", mark: "N" },
  { key: "pagbank", name: "PagBank", bg: "#1BB99A", fg: "#ffffff", mark: "PB" },
  { key: "picpay", name: "PicPay", bg: "#11C76F", fg: "#ffffff", mark: "P" },
  { key: "infinitepay", name: "InfinitePay", bg: "#16181D", fg: "#C6F432", mark: "IP" },
  { key: "c6", name: "C6 Bank", bg: "#242424", fg: "#ffffff", mark: "C6" },
  { key: "mercadopago", name: "Mercado Pago", bg: "#00B1EA", fg: "#ffffff", mark: "MP" },
  { key: "sicoob", name: "Sicoob", bg: "#003641", fg: "#7DB61C", mark: "SC" },
  { key: "sicredi", name: "Sicredi", bg: "#3FA110", fg: "#ffffff", mark: "SI" },
  { key: "will", name: "Will Bank", bg: "#FFD400", fg: "#16181D", mark: "W" },
  { key: "carteira", name: "Carteira (dinheiro)", bg: "#E9EDF0", fg: "#132C49", mark: "R$" },
  { key: "outro", name: "Outro", bg: "#173A5B", fg: "#ffffff", mark: "•" },
];

export function bankOf(key: string | null | undefined): BankPreset | null {
  return BANKS.find((b) => b.key === key) ?? null;
}

/** Tenta reconhecer o banco pelo nome digitado. */
export function guessBank(name: string): string | null {
  const t = name
    .toLowerCase()
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "");
  const map: [RegExp, string][] = [
    [/nubank|\bnu\b/, "nubank"],
    [/itau/, "itau"],
    [/inter/, "inter"],
    [/banco do brasil|\bbb\b/, "bb"],
    [/caixa/, "caixa"],
    [/bradesco/, "bradesco"],
    [/santander/, "santander"],
    [/neon/, "neon"],
    [/pagbank|pagseguro/, "pagbank"],
    [/picpay/, "picpay"],
    [/infinite/, "infinitepay"],
    [/\bc6\b/, "c6"],
    [/mercado ?pago/, "mercadopago"],
    [/sicoob/, "sicoob"],
    [/sicredi/, "sicredi"],
    [/will/, "will"],
    [/carteira|dinheiro/, "carteira"],
  ];
  for (const [re, k] of map) if (re.test(t)) return k;
  return null;
}

export const CARD_BRANDS = [
  { key: "mastercard", name: "Mastercard" },
  { key: "visa", name: "Visa" },
  { key: "elo", name: "Elo" },
  { key: "amex", name: "American Express" },
  { key: "hipercard", name: "Hipercard" },
  { key: "outro", name: "Outra" },
];
