// Abre o capítulo do dia no app da Bíblia (YouVersion). No Android/iPhone com o app instalado,
// o link do bible.com abre direto no aplicativo; sem o app, abre no navegador.

export const BIBLE_VERSIONS: { abbr: string; id: number; name: string }[] = [
  { abbr: "NVI", id: 129, name: "Nova Versão Internacional" },
  { abbr: "ARA", id: 1608, name: "Almeida Revista e Atualizada" },
  { abbr: "NVT", id: 1930, name: "Nova Versão Transformadora" },
  { abbr: "NAA", id: 1840, name: "Nova Almeida Atualizada" },
  { abbr: "ACF", id: 212, name: "Almeida Corrigida Fiel" },
  { abbr: "NTLH", id: 211, name: "Nova Tradução na Linguagem de Hoje" },
];

// Nome do livro em português → código USFM (usado pelo YouVersion).
const BOOKS: [string, string[]][] = [
  ["GEN", ["genesis", "gn"]],
  ["EXO", ["exodo", "ex"]],
  ["LEV", ["levitico", "lv"]],
  ["NUM", ["numeros", "nm"]],
  ["DEU", ["deuteronomio", "dt"]],
  ["JOS", ["josue", "js"]],
  ["JDG", ["juizes", "jz"]],
  ["RUT", ["rute", "rt"]],
  ["1SA", ["1 samuel", "1samuel", "i samuel", "1sm"]],
  ["2SA", ["2 samuel", "2samuel", "ii samuel", "2sm"]],
  ["1KI", ["1 reis", "1reis", "i reis", "1rs"]],
  ["2KI", ["2 reis", "2reis", "ii reis", "2rs"]],
  ["1CH", ["1 cronicas", "1cronicas", "i cronicas", "1cr"]],
  ["2CH", ["2 cronicas", "2cronicas", "ii cronicas", "2cr"]],
  ["EZR", ["esdras", "ed"]],
  ["NEH", ["neemias", "ne"]],
  ["EST", ["ester", "et"]],
  ["JOB", ["job"]],
  ["PSA", ["salmos", "salmo", "sl"]],
  ["PRO", ["proverbios", "pv"]],
  ["ECC", ["eclesiastes", "ec"]],
  ["SNG", ["cantares", "cantico dos canticos", "canticos", "ct"]],
  ["ISA", ["isaias", "is"]],
  ["JER", ["jeremias", "jr"]],
  ["LAM", ["lamentacoes", "lm"]],
  ["EZK", ["ezequiel", "ez"]],
  ["DAN", ["daniel", "dn"]],
  ["HOS", ["oseias", "os"]],
  ["JOL", ["joel", "jl"]],
  ["AMO", ["amos", "am"]],
  ["OBA", ["obadias", "ob"]],
  ["JON", ["jonas", "jn"]],
  ["MIC", ["miqueias", "mq"]],
  ["NAM", ["naum", "na"]],
  ["HAB", ["habacuque", "hc"]],
  ["ZEP", ["sofonias", "sf"]],
  ["HAG", ["ageu", "ag"]],
  ["ZEC", ["zacarias", "zc"]],
  ["MAL", ["malaquias", "ml"]],
  ["MAT", ["mateus", "mt"]],
  ["MRK", ["marcos", "mc"]],
  ["LUK", ["lucas", "lc"]],
  ["JHN", ["joao", "jo"]],
  ["ACT", ["atos", "atos dos apostolos", "at"]],
  ["ROM", ["romanos", "rm"]],
  ["1CO", ["1 corintios", "1corintios", "i corintios", "1co"]],
  ["2CO", ["2 corintios", "2corintios", "ii corintios", "2co"]],
  ["GAL", ["galatas", "gl"]],
  ["EPH", ["efesios", "ef"]],
  ["PHP", ["filipenses", "fp"]],
  ["COL", ["colossenses", "cl"]],
  ["1TH", ["1 tessalonicenses", "1tessalonicenses", "i tessalonicenses", "1ts"]],
  ["2TH", ["2 tessalonicenses", "2tessalonicenses", "ii tessalonicenses", "2ts"]],
  ["1TI", ["1 timoteo", "1timoteo", "i timoteo", "1tm"]],
  ["2TI", ["2 timoteo", "2timoteo", "ii timoteo", "2tm"]],
  ["TIT", ["tito", "tt"]],
  ["PHM", ["filemom", "filemon", "fm"]],
  ["HEB", ["hebreus", "hb"]],
  ["JAS", ["tiago", "tg"]],
  ["1PE", ["1 pedro", "1pedro", "i pedro", "1pe"]],
  ["2PE", ["2 pedro", "2pedro", "ii pedro", "2pe"]],
  ["1JN", ["1 joao", "1joao", "i joao", "1jo"]],
  ["2JN", ["2 joao", "2joao", "ii joao", "2jo"]],
  ["3JN", ["3 joao", "3joao", "iii joao", "3jo"]],
  ["JUD", ["judas", "jd"]],
  ["REV", ["apocalipse", "ap"]],
];

const norm = (t: string) =>
  t
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "")
    .toLowerCase()
    .replace(/[º°ª.]/g, "")
    .replace(/\s+/g, " ")
    .trim();

/** "João" → "JHN"; "1 Coríntios" → "1CO". "Jó" e "João" se distinguem pelo acento ("jo" sem acento = João). */
export function usfmFor(book: string): string | null {
  const raw = book.trim().toLowerCase();
  if (raw === "jó") return "JOB";
  const n = norm(book);
  for (const [code, names] of BOOKS) if (names.includes(n)) return code;
  return null;
}

export function bibleChapterUrl(book: string, chapter: number, versionAbbr = "NVI"): string | null {
  const code = usfmFor(book);
  if (!code || chapter < 1) return null;
  const v = BIBLE_VERSIONS.find((x) => x.abbr === versionAbbr) ?? BIBLE_VERSIONS[0];
  return `https://www.bible.com/pt/bible/${v.id}/${code}.${chapter}.${v.abbr}`;
}
