// Aprender: conselhos financeiros curtos, com base bíblica, e uma biblioteca de leitura sobre finanças.
// Textos originais do NORTE. As referências bíblicas vêm com um resumo em nossas palavras.

export interface Lesson {
  id: string;
  title: string;
  ref: string; // referência bíblica
  idea: string; // a ideia do texto bíblico, em poucas palavras
  body: string[]; // parágrafos curtos
  action: string; // um passo prático para hoje
  link?: { label: string; href: string }; // atalho dentro do NORTE
}

export const LESSONS: Lesson[] = [
  {
    id: "mordomo",
    title: "Você é administrador, não dono",
    ref: "Salmos 24:1",
    idea: "Tudo pertence a Deus; nós cuidamos do que Ele confiou a nós.",
    body: [
      "Quando o dinheiro é visto como algo confiado a nós, a pergunta muda de “o que eu quero comprar?” para “como cuido bem disso?”.",
      "Administrar bem começa por saber exatamente quanto entra, quanto sai e para onde vai.",
    ],
    action: "Lance hoje tudo o que você gastou nos últimos 3 dias.",
    link: { label: "Novo lançamento", href: "/financas" },
  },
  {
    id: "planejar",
    title: "Planejar antes de gastar",
    ref: "Provérbios 21:5",
    idea: "Os planos de quem é diligente levam à fartura; a pressa leva à falta.",
    body: [
      "Um orçamento simples é um plano: você decide antes do mês começar quanto vai para cada área.",
      "Comece só com as 3 ou 4 categorias em que você mais gasta. Ajuste no mês seguinte.",
    ],
    action: "Defina um limite para a categoria em que você mais gasta.",
    link: { label: "Abrir orçamentos", href: "/financas/orcamentos" },
  },
  {
    id: "reserva",
    title: "A reserva de emergência",
    ref: "Provérbios 6:6-8",
    idea: "A formiga guarda no verão o alimento para o inverno.",
    body: [
      "Imprevistos vão acontecer: carro, saúde, trabalho. A reserva evita que eles virem dívida.",
      "Meta inicial: um mês de despesas. Depois, de 3 a 6 meses. Guarde em algo seguro e fácil de resgatar.",
    ],
    action: "Crie o objetivo “Reserva de emergência”, mesmo que comece com pouco.",
    link: { label: "Abrir objetivos", href: "/financas/objetivos" },
  },
  {
    id: "dividas",
    title: "Sair das dívidas, uma de cada vez",
    ref: "Romanos 13:8",
    idea: "Não fiquem devendo nada a ninguém, a não ser o amor.",
    body: [
      "Liste todas as dívidas com valor e juros. Pague o mínimo de todas e coloque o máximo possível em uma só.",
      "Comece pela de juros mais altos (cartão e cheque especial costumam ser os piores) ou pela menor, para ganhar ânimo.",
    ],
    action: "Anote suas dívidas e marque qual será a primeira a quitar.",
  },
  {
    id: "cartao",
    title: "Cartão de crédito sem armadilha",
    ref: "Provérbios 22:7",
    idea: "Quem toma emprestado fica servo de quem empresta.",
    body: [
      "O cartão é útil quando a fatura é paga inteira, todo mês. Pagar o mínimo é entrar no rotativo, com os juros mais caros do país.",
      "Acompanhe a fatura durante o mês, não só quando ela chega.",
    ],
    action: "Confira hoje quanto já está na fatura atual.",
    link: { label: "Ver cartões", href: "/financas/cartoes" },
  },
  {
    id: "generosidade",
    title: "Generosidade com alegria",
    ref: "2 Coríntios 9:7",
    idea: "Cada um dê conforme decidiu no coração, sem tristeza; Deus ama quem dá com alegria.",
    body: [
      "Dízimo, ofertas e ajuda ao próximo ficam mais leves quando estão no planejamento, e não no que sobra.",
      "Separe esse valor primeiro, assim que o dinheiro entrar.",
    ],
    action: "Crie uma conta fixa para a sua contribuição mensal.",
    link: { label: "Novo lançamento", href: "/financas" },
  },
  {
    id: "contentamento",
    title: "Contentamento e consumo",
    ref: "Hebreus 13:5",
    idea: "Que a vida seja livre do amor ao dinheiro; contentem-se com o que têm.",
    body: [
      "Muitas compras acontecem por impulso ou comparação. Uma regra simples: espere 48 horas antes de qualquer compra não planejada.",
      "Olhe o relatório do mês e veja onde estão os pequenos gastos que somam muito.",
    ],
    action: "Escolha um gasto pequeno e frequente para cortar este mês.",
    link: { label: "Ver relatórios", href: "/financas/relatorios" },
  },
  {
    id: "familia",
    title: "Dinheiro em família",
    ref: "Eclesiastes 4:9",
    idea: "Dois são melhores do que um, porque juntos têm melhor resultado.",
    body: [
      "Conversar sobre dinheiro evita brigas. Uma conversa curta por semana, olhando contas e metas juntos, já muda muito.",
      "Decidam juntos o objetivo principal do ano.",
    ],
    action: "Marque na agenda uma conversa de 15 minutos sobre as finanças da casa.",
    link: { label: "Abrir agenda", href: "/agenda" },
  },
  {
    id: "investir",
    title: "Fazer o dinheiro trabalhar",
    ref: "Mateus 25:14-30",
    idea: "Na parábola dos talentos, quem fez render o que recebeu foi elogiado.",
    body: [
      "Com a reserva pronta e sem dívidas caras, é hora de investir com constância, mesmo valores pequenos.",
      "Prefira o simples e que você entende. Desconfie de promessas de ganho rápido e garantido.",
    ],
    action: "Defina um valor fixo para guardar todo mês, logo que o salário entrar.",
  },
  {
    id: "descanso",
    title: "Paz no lugar da ansiedade",
    ref: "Filipenses 4:6-7",
    idea: "Não andem ansiosos; apresentem tudo a Deus em oração, e a paz dEle guardará o coração.",
    body: [
      "Ansiedade financeira diminui quando você sabe a verdade sobre seus números, mesmo que não sejam bons.",
      "Olhe as contas do mês com calma, uma de cada vez, e faça o próximo passo possível.",
    ],
    action: "Abra o Resumo e marque o que já foi pago.",
    link: { label: "Abrir Resumo", href: "/financas" },
  },
];

/** Lição do dia: alterna pela data. */
export function lessonOfDay(date: string): Lesson {
  const n = Math.floor(Date.parse(`${date}T12:00:00Z`) / 86_400_000);
  return LESSONS[((n % LESSONS.length) + LESSONS.length) % LESSONS.length];
}

export interface LibBook {
  id: string;
  title: string;
  author: string;
  why: string;
  christian?: boolean;
}

export const FINANCE_BOOKS: LibBook[] = [
  { id: "babilonia", title: "O Homem Mais Rico da Babilônia", author: "George S. Clason", why: "Princípios básicos de poupar e investir contados em parábolas curtas." },
  { id: "dinheiro-posses", title: "Dinheiro, Posses e Eternidade", author: "Randy Alcorn", why: "Uma visão cristã ampla sobre bens, generosidade e prioridades.", christian: true },
  { id: "principio-tesouro", title: "O Princípio do Tesouro", author: "Randy Alcorn", why: "Livro curto sobre generosidade e onde colocar o coração.", christian: true },
  { id: "transformacao", title: "A Transformação Total do Seu Dinheiro", author: "Dave Ramsey", why: "Plano passo a passo para sair das dívidas e montar reserva.", christian: true },
  { id: "psicologia", title: "A Psicologia Financeira", author: "Morgan Housel", why: "Como comportamento e emoções pesam mais que fórmulas." },
  { id: "pai-rico", title: "Pai Rico, Pai Pobre", author: "Robert Kiyosaki", why: "Clássico sobre mentalidade financeira e ativos." },
  { id: "me-poupe", title: "Me Poupe!", author: "Nathalia Arcuri", why: "Linguagem simples e brasileira para organizar e começar a investir." },
  { id: "mil-milhao", title: "Do Mil ao Milhão", author: "Thiago Nigro", why: "Gastar bem, investir melhor e ganhar mais, com exemplos do Brasil." },
  { id: "habitos", title: "Hábitos Atômicos", author: "James Clear", why: "Pequenos hábitos que ajudam a manter o controle financeiro." },
];
