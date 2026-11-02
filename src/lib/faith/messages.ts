// Mensagens diárias locais (funcionam sem IA). Escolhidas pelo perfil e pelo dia.
// `religious: false` = pode ser mostrada para quem não quer conteúdo de fé.
import type { DailyMessage, MeProfile } from "@/lib/types";

export type Theme = "fe" | "forca" | "familia" | "disciplina" | "financas" | "ansiedade" | "cansaco" | "gratidao" | "recomeco" | "proposito" | "saude" | "tempo";

interface Msg {
  text: string;
  verse?: { text: string; ref: string };
  themes: Theme[];
  religious: boolean;
}

export const MESSAGES: Msg[] = [
  { text: "Você não precisa ver a escada inteira. Hoje, só o próximo degrau.", verse: { text: "Lâmpada para os meus pés é a tua palavra.", ref: "Salmos 119:105" }, themes: ["fe", "proposito", "ansiedade"], religious: true },
  { text: "Deus não te chamou para carregar o dia de amanhã. Entregue o que você não controla e faça bem o que está nas suas mãos.", verse: { text: "Não andeis ansiosos de coisa alguma.", ref: "Filipenses 4:6" }, themes: ["ansiedade", "fe"], religious: true },
  { text: "Força não é nunca cair. É levantar mais uma vez, sem se condenar.", verse: { text: "Sete vezes cairá o justo, e se levantará.", ref: "Provérbios 24:16" }, themes: ["forca", "recomeco"], religious: true },
  { text: "As misericórdias se renovam hoje. Ontem não define quem você é agora.", verse: { text: "As suas misericórdias não têm fim; renovam-se cada manhã.", ref: "Lamentações 3:22-23" }, themes: ["recomeco", "fe"], religious: true },
  { text: "Cansaço não é fracasso. Até Jesus se retirou para descansar. Descansar também é obediência.", verse: { text: "Vinde a mim, todos os que estais cansados, e eu vos aliviarei.", ref: "Mateus 11:28" }, themes: ["cansaco", "fe"], religious: true },
  { text: "Sua casa não precisa ser perfeita para ser abençoada. Precisa de presença.", verse: { text: "Eu e a minha casa serviremos ao Senhor.", ref: "Josué 24:15" }, themes: ["familia", "fe"], religious: true },
  { text: "Cuidar bem do pouco é a escola de quem vai administrar o muito.", verse: { text: "Quem é fiel no pouco, também é fiel no muito.", ref: "Lucas 16:10" }, themes: ["financas", "disciplina"], religious: true },
  { text: "Antes de comprar, pergunte: isso me aproxima ou me afasta do meu Norte?", themes: ["financas", "proposito"], religious: false },
  { text: "Gratidão não muda o problema de imediato, mas muda os olhos com que você o enfrenta.", verse: { text: "Em tudo dai graças.", ref: "1 Tessalonicenses 5:18" }, themes: ["gratidao", "fe"], religious: true },
  { text: "Constância vence motivação. Faça o mínimo bem feito, todos os dias.", themes: ["disciplina", "proposito"], religious: false },
  { text: "Você é mais do que a lista de tarefas de hoje. Faça o que der, com o coração em paz.", themes: ["ansiedade", "cansaco"], religious: false },
  { text: "Seja forte e corajoso. Você não está sozinho nessa jornada.", verse: { text: "O Senhor teu Deus é contigo por onde quer que andares.", ref: "Josué 1:9" }, themes: ["forca", "fe"], religious: true },
  { text: "Um abraço, uma pergunta sincera, dez minutos sem celular: é assim que se constrói uma família.", themes: ["familia", "tempo"], religious: false },
  { text: "O celular pode esperar. As pessoas que você ama, nem sempre.", themes: ["tempo", "familia"], religious: false },
  { text: "Deus cuida das aves. Ele também está cuidando de você e das suas contas.", verse: { text: "Olhai para as aves do céu… vosso Pai celestial as alimenta.", ref: "Mateus 6:26" }, themes: ["financas", "ansiedade", "fe"], religious: true },
  { text: "Pequenos começos não são desprezíveis. Comece hoje do tamanho que der.", verse: { text: "Não desprezeis o dia das pequenas coisas.", ref: "Zacarias 4:10" }, themes: ["recomeco", "disciplina", "fe"], religious: true },
  { text: "Seu corpo é a casa onde você vive sua missão. Beba água, durma, caminhe.", verse: { text: "O vosso corpo é santuário.", ref: "1 Coríntios 6:19" }, themes: ["saude", "disciplina"], religious: true },
  { text: "Sono, movimento e silêncio. Três remédios simples que quase ninguém toma.", themes: ["saude", "cansaco"], religious: false },
  { text: "Planeje com sabedoria, trabalhe com diligência, confie o resultado.", verse: { text: "Confia ao Senhor as tuas obras, e teus planos serão estabelecidos.", ref: "Provérbios 16:3" }, themes: ["proposito", "fe", "disciplina"], religious: true },
  { text: "Quem tem um porquê enfrenta quase qualquer como. Lembre do seu porquê hoje.", themes: ["proposito", "forca"], religious: false },
  { text: "Você não precisa vencer o mês inteiro hoje. Vença só este dia.", verse: { text: "Basta a cada dia o seu próprio mal.", ref: "Mateus 6:34" }, themes: ["ansiedade", "financas"], religious: true },
  { text: "A paz não é a ausência de tempestade, é saber quem está no barco com você.", verse: { text: "Tende bom ânimo, sou eu; não temais.", ref: "Mateus 14:27" }, themes: ["fe", "ansiedade", "forca"], religious: true },
  { text: "Liste três coisas boas de ontem. Elas também fazem parte da sua história.", themes: ["gratidao"], religious: false },
  { text: "Disciplina é escolher entre o que você quer agora e o que você quer mais.", themes: ["disciplina", "financas"], religious: false },
  { text: "Recomeçar não é voltar ao zero. É voltar com experiência.", themes: ["recomeco", "forca"], religious: false },
  { text: "Seus filhos vão lembrar menos do que você deu e mais de como você esteve.", themes: ["familia"], religious: false },
  { text: "Uma oração curta e sincera vale mais do que um discurso perfeito.", verse: { text: "Orai sem cessar.", ref: "1 Tessalonicenses 5:17" }, themes: ["fe"], religious: true },
  { text: "Onde está o seu tesouro, ali está o seu coração. Seu extrato também conta uma história.", verse: { text: "Onde está o vosso tesouro, aí estará o vosso coração.", ref: "Mateus 6:21" }, themes: ["financas", "proposito"], religious: true },
  { text: "Você está construindo algo que leva tempo. Seja paciente consigo.", verse: { text: "Os que esperam no Senhor renovam as suas forças.", ref: "Isaías 40:31" }, themes: ["cansaco", "forca", "fe"], religious: true },
  { text: "Não compare o seu bastidor com o palco dos outros.", themes: ["ansiedade", "tempo"], religious: false },
  { text: "O que você faz quando ninguém vê também está formando quem você é.", themes: ["disciplina", "proposito"], religious: false },
  { text: "Hoje é um bom dia para pedir perdão, perdoar e seguir mais leve.", verse: { text: "Suportai-vos uns aos outros e perdoai-vos.", ref: "Colossenses 3:13" }, themes: ["familia", "recomeco", "fe"], religious: true },
];

const CHALLENGE_THEMES: Record<string, Theme[]> = {
  Ansiedade: ["ansiedade"],
  Cansaço: ["cansaco", "saude"],
  Dinheiro: ["financas"],
  Disciplina: ["disciplina"],
  Família: ["familia"],
  Fé: ["fe"],
  Saúde: ["saude"],
  "Tempo no celular": ["tempo"],
  Recomeço: ["recomeco"],
  Propósito: ["proposito"],
  Solidão: ["forca", "fe"],
  Trabalho: ["proposito", "disciplina"],
};

export const CHALLENGES = Object.keys(CHALLENGE_THEMES);

function dayIndex(date: string) {
  const [y, m, d] = date.split("-").map(Number);
  return Math.floor(Date.UTC(y, m - 1, d) / 86_400_000);
}

export function themesFor(me: MeProfile): Theme[] {
  return [...new Set(me.challenges.flatMap((c) => CHALLENGE_THEMES[c] ?? []))];
}

/** Escolha determinística por dia, priorizando os temas do perfil. `offset` = "outra mensagem". */
export function pickLocalMessage(me: MeProfile, date: string, offset = 0, theme?: Theme): DailyMessage {
  const religious = me.faith !== "nenhuma";
  let pool = MESSAGES.filter((m) => religious || !m.religious);
  const themes = theme ? [theme] : themesFor(me);
  if (themes.length) {
    const preferred = pool.filter((m) => m.themes.some((t) => themes.includes(t)));
    // 2 de cada 3 dias usam os temas do perfil; o resto varia
    if (preferred.length && (theme || dayIndex(date) % 3 !== 2)) pool = preferred;
  }
  const m = pool[(dayIndex(date) + offset) % pool.length];
  return { date, text: m.text, verse: religious ? (m.verse ?? null) : null, source: "local" };
}

/** Palavras do usuário → tema (usado pelo assistente local). */
export function themeFromText(t: string): Theme | undefined {
  if (/ansios|preocupad|medo|nervos/.test(t)) return "ansiedade";
  if (/cansad|exaust|esgotad|sem energia/.test(t)) return "cansaco";
  if (/triste|desanim|pra baixo|sozinh|forca|força/.test(t)) return "forca";
  if (/dinheiro|divida|conta|financ/.test(t)) return "financas";
  if (/familia|esposa|filh|casamento/.test(t)) return "familia";
  if (/falhei|recomec|desisti/.test(t)) return "recomeco";
  return undefined;
}
