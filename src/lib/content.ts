// Frases e versículos padrão exibidos nos topos das telas.
// São apenas valores iniciais: o usuário pode trocar a frase principal em Ajustes
// e ocultar os versículos.

export interface Verse {
  text: string;
  ref: string;
}

export const SCREEN_QUOTES = {
  onboarding: "Grandes jornadas começam com pequenas decisões.",
  rotina: "Disciplina hoje, liberdade amanhã.",
  familia: "Família é onde a vida ganha sentido.",
} as const;

export const SCREEN_VERSES: Record<string, Verse> = {
  leitura: { text: "Lâmpada para os meus pés é a tua palavra, e luz para o meu caminho.", ref: "Salmos 119:105" },
  meuDia: { text: "Tudo tem o seu tempo determinado, e há tempo para todo o propósito debaixo do céu.", ref: "Eclesiastes 3:1" },
  assistente: { text: "Ensina-nos a contar os nossos dias, para que alcancemos um coração sábio.", ref: "Salmos 90:12" },
};

/** Versículos que alternam diariamente na tela Hoje. */
export const DAILY_VERSES: Verse[] = [
  { text: "Confia ao Senhor os teus planos e ele dirigirá os teus passos.", ref: "Provérbios 16:3" },
  { text: "Tudo posso naquele que me fortalece.", ref: "Filipenses 4:13" },
  { text: "Busquem, pois, em primeiro lugar o Reino de Deus.", ref: "Mateus 6:33" },
  { text: "Este é o dia que o Senhor fez; regozijemo-nos e alegremo-nos nele.", ref: "Salmos 118:24" },
  { text: "Sejam fortes e corajosos.", ref: "Josué 1:9" },
  { text: "As misericórdias do Senhor se renovam a cada manhã.", ref: "Lamentações 3:22-23" },
  { text: "Entregue o seu caminho ao Senhor; confie nele, e ele agirá.", ref: "Salmos 37:5" },
];

export const SHORT_QUOTES = [
  "Disciplina hoje, liberdade amanhã.",
  "Constância vence motivação.",
  "Pequenos passos. Grandes destinos.",
  "Feito é melhor que perfeito.",
  "Um dia de cada vez.",
];

export function pickByDay<T>(list: T[], date = new Date()): T {
  const start = new Date(date.getFullYear(), 0, 0).getTime();
  const day = Math.floor((date.getTime() - start) / 86_400_000);
  return list[day % list.length];
}
