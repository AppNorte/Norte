// Testes de aceitação ponta a ponta (docs/ACCEPTANCE_TESTS.md) + capturas de tela.
// Uso: rode o app (npm run build && npm start) e depois `npm run test:e2e`.
// Variáveis: BASE_URL (padrão http://localhost:3000), SHOTS=0 para não salvar capturas.
import { createRequire } from "node:module";
import fs from "node:fs";
import path from "node:path";

// Playwright vem pré-instalado no ambiente (resolução CommonJS); se preferir, `npm i -D playwright`.
const { chromium } = createRequire(import.meta.url)("playwright");

const BASE = process.env.BASE_URL || "http://localhost:3000";
const SHOTS = process.env.SHOTS !== "0";
const OUT = path.resolve("screenshots");
if (SHOTS) fs.mkdirSync(OUT, { recursive: true });

const results = [];
const check = (name, ok, extra = "") => {
  results.push({ name, ok });
  console.log(`${ok ? "PASS" : "FAIL"}  ${name}${extra ? `  (${extra})` : ""}`);
};

async function shot(page, name) {
  if (!SHOTS) return;
  await page.waitForTimeout(250);
  await page.screenshot({ path: path.join(OUT, `${name}.png`), fullPage: true });
}

async function noHorizontalScroll(page) {
  return page.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth + 1);
}

const browser = await chromium.launch();
const context = await browser.newContext({
  viewport: { width: 390, height: 844 },
  deviceScaleFactor: 2,
  locale: "pt-BR",
  timezoneId: "America/Sao_Paulo",
  isMobile: true,
  hasTouch: true,
});
const page = await context.newPage();
// Manhã fixa para resultados previsíveis (o app muda de "manhã" para "noite" sozinho).
await page.clock.setFixedTime(new Date("2026-09-11T09:41:00-03:00"));
const errors = [];
page.on("pageerror", (e) => errors.push(e.message));

try {
  // ---------- Splash + Onboarding ----------
  await page.goto(`${BASE}/`);
  await page.getByRole("link", { name: /Começar/ }).waitFor();
  await shot(page, "01-splash");
  await page.getByRole("link", { name: /Começar/ }).click();
  await page.getByRole("heading", { name: "Monte seu NORTE" }).waitFor();
  check("Onboarding abre a partir do Splash", true);
  await shot(page, "02-onboarding");
  await page.getByRole("button", { name: /Finalizar configuração/ }).click();
  await page.waitForURL("**/hoje");
  check("Onboarding leva para Hoje", true);

  // ---------- Hoje ----------
  await page.getByRole("heading", { name: /Bom dia, Daylerson/ }).waitFor();
  await shot(page, "03-hoje");
  const oracao = page.getByRole("checkbox", { name: "Oração" });
  await oracao.click();
  check("Hoje: marcar item da rotina", (await oracao.getAttribute("aria-checked")) === "true");
  await page.reload();
  await page.getByRole("heading", { name: /Bom dia/ }).waitFor();
  check("Estado persiste após recarregar", (await page.getByRole("checkbox", { name: "Oração" }).getAttribute("aria-checked")) === "true");

  await page.getByRole("button", { name: "Editar" }).first().click();
  await page.getByLabel("Prioridade 1").fill("Finalizar o planejamento da semana");
  await page.getByRole("button", { name: "Salvar prioridades" }).click();
  check("Hoje: editar 3 prioridades", await page.getByText("Finalizar o planejamento da semana").isVisible());
  check("Hoje: ver leitura", await page.getByText(/Hoje: João 1/).isVisible());
  check("Sem rolagem horizontal (390px) em Hoje", await noHorizontalScroll(page));

  // ---------- Navegação 5 abas ----------
  const tabs = [
    ["Finanças", "/financas"],
    ["Casa", "/casa"],
    ["Rotina", "/rotina"],
    ["Mais", "/mais"],
    ["Hoje", "/hoje"],
  ];
  let navOk = true;
  for (const [label, url] of tabs) {
    await page.getByRole("navigation").getByRole("link", { name: label }).click();
    await page.waitForURL(`**${url}`);
    navOk &&= (await page.getByRole("navigation").getByRole("link", { name: label }).getAttribute("aria-current")) === "page";
  }
  check("Navegação por 5 abas funciona", navOk);

  // ---------- Rotina ----------
  await page.getByRole("navigation").getByRole("link", { name: "Rotina" }).click();
  await page.getByRole("heading", { name: "Seu progresso" }).waitFor();
  await shot(page, "04-rotina");
  check("Rotina: plano progressivo (6h30 → 5h00)", (await page.getByText("6h30").first().isVisible()) && (await page.getByText("5h00").first().isVisible()));
  await page.getByRole("checkbox", { name: /Preparar roupa/ }).click();
  check("Rotina: registrar conclusão por data", (await page.getByRole("checkbox", { name: /Preparar roupa/ }).getAttribute("aria-checked")) === "true");
  await page.getByRole("button", { name: "Editar" }).first().click();
  const firstTime = page.getByRole("dialog").getByLabel("Horário").first();
  await firstTime.fill("21:30");
  await page.getByRole("dialog").getByRole("button", { name: "Descer" }).first().click();
  await page.getByRole("button", { name: "Pronto" }).click();
  check("Rotina: editar horário/ordem", await page.getByText("21h30").isVisible());

  // Pular um dia não quebra: avança o relógio 2 dias
  await page.clock.setFixedTime(new Date("2026-09-13T09:41:00-03:00"));
  await page.reload();
  await page.getByRole("heading", { name: "Seu progresso" }).waitFor();
  check("Rotina: não quebra se pular dia", (await page.getByRole("checkbox", { name: /Preparar roupa/ }).getAttribute("aria-checked")) === "false");
  await page.clock.setFixedTime(new Date("2026-09-11T09:41:00-03:00"));
  await page.reload();

  // ---------- Leitura ----------
  await page.goto(`${BASE}/mais`);
  await page.getByRole("link", { name: /Leitura/ }).click();
  await page.getByRole("heading", { name: "Bíblia" }).waitFor();
  check("Leitura: plano bíblico mostra progresso", await page.getByText("0 de 21 capítulos").isVisible());
  await page.getByRole("button", { name: "Ver detalhes" }).click();
  await page.getByRole("dialog").getByLabel("Título").fill("Hábitos e Disciplina");
  await page.getByRole("dialog").getByLabel("Total de páginas").fill("100");
  await page.getByRole("dialog").getByLabel("Páginas lidas").fill("30");
  await page.getByRole("dialog").getByRole("button", { name: "Salvar", exact: true }).click();
  check("Leitura: livro atual tem página/meta", await page.getByText("Páginas 31 – 40").isVisible());
  await page.getByRole("button", { name: "Ver todos" }).click();
  await page.getByRole("dialog").getByLabel("Título").fill("A coragem de ser imperfeito");
  await page.getByRole("dialog").getByLabel("Autor (opcional)").fill("Brené Brown");
  await page.getByRole("dialog").getByRole("button", { name: /Adicionar à fila/ }).click();
  await page.getByRole("dialog").getByRole("button", { name: "Ler agora" }).click();
  const currentCount = await page.evaluate(() => JSON.parse(localStorage.getItem("norte:v1")).books.filter((b) => b.status === "current").length);
  check("Leitura: um livro current por usuário", currentCount === 1);
  // volta o livro anterior para atual
  await page.getByRole("dialog").getByRole("button", { name: "Ler agora" }).click();
  await page.getByRole("button", { name: "Fechar" }).click();
  await shot(page, "05-leitura");
  await page.getByLabel("Sua reflexão").fill("Deus me lembrou de ser constante.");
  await page.getByRole("button", { name: "Salvar reflexão" }).click();
  const refl = await page.evaluate(() => JSON.parse(localStorage.getItem("norte:v1")).reflections.length);
  check("Leitura: registrar reflexão", refl === 1);
  await page.getByRole("button", { name: /Marcar leitura como concluída/ }).click();
  await page.getByRole("button", { name: "Confirmar" }).click();
  check("Leitura: concluir capítulo atual", await page.getByText("1 de 21 capítulos").isVisible());
  check("Sem rolagem horizontal (390px) em Leitura", await noHorizontalScroll(page));

  // ---------- Família ----------
  await page.goto(`${BASE}/mais`);
  await page.getByRole("link", { name: /Família/ }).click();
  await page.getByRole("heading", { name: "Esta semana" }).waitFor();
  const names = await Promise.all(["Tempo com Bia", "Tempo com Isabella", "Tempo com Davi"].map((n) => page.getByText(n).isVisible()));
  check("Família: mostra Bia, Isabella e Davi", names.every(Boolean));
  await page.getByRole("button", { name: /Hoje joguei bola com Davi/ }).click();
  await page.getByRole("dialog").getByRole("button", { name: "Davi", exact: true }).click();
  await page.getByRole("dialog").getByPlaceholder(/Jogamos bola/).fill("Jogamos bola no fim da tarde");
  await page.getByRole("dialog").getByRole("button", { name: "Registrar" }).click();
  check("Família: registrar momento", await page.getByText("1/3").first().isVisible());
  await page.getByRole("button", { name: /Planejar tempo em família/ }).click();
  await page.getByRole("dialog").getByRole("button", { name: "Isabella", exact: true }).click();
  await page.getByRole("dialog").getByPlaceholder(/Noite de jogos/).fill("Conversar sobre a escola");
  await page.getByRole("dialog").getByRole("button", { name: "Salvar plano" }).click();
  check("Família: planejar momento futuro", await page.getByText("Conversar sobre a escola").first().isVisible());
  check("Família: progresso semanal leve", await page.getByRole("progressbar", { name: /Tempo com Davi: 1 de 3/ }).isVisible());
  await shot(page, "06-familia");


  // ---------- Finanças ----------
  await page.getByRole("navigation").getByRole("link", { name: "Finanças" }).click();
  await page.getByText("Saldo em contas").first().waitFor();
  // Saldo inicial da conta principal
  await page.getByRole("button", { name: "Gerenciar" }).click();
  await page.getByRole("dialog").getByRole("button", { name: /Conta principal/ }).click();
  await page.getByRole("dialog").getByLabel(/Saldo inicial/).fill("1.000,00");
  await page.getByRole("dialog").getByRole("button", { name: "Salvar conta" }).click();
  await page.getByRole("button", { name: "Fechar" }).click();
  check("Finanças: saldo da conta", await page.locator(".balance").getByText("R$ 1.000,00").isVisible());
  // Despesa à vista
  await page.getByRole("button", { name: "Novo lançamento" }).click();
  await page.getByRole("dialog").getByLabel("Valor", { exact: true }).fill("150,50");
  await page.getByRole("dialog").getByRole("button", { name: /Mercado/ }).first().click();
  await page.getByRole("dialog").getByRole("button", { name: "Salvar lançamento" }).click();
  check("Finanças: despesa reduz o saldo", await page.locator(".balance").getByText("R$ 849,50").isVisible());
  // Receita a receber
  await page.getByRole("button", { name: "Novo lançamento" }).click();
  await page.getByRole("tab", { name: "Receita" }).click();
  await page.getByRole("dialog").getByLabel("Valor", { exact: true }).fill("3000");
  await page.getByRole("dialog").getByRole("switch", { name: "Pago" }).click();
  await page.getByRole("dialog").getByRole("button", { name: "Salvar lançamento" }).click();
  check("Finanças: receita pendente entra no previsto", await page.locator(".forecast").getByText("R$ 3.849,50").isVisible());
  // Cartão + compra parcelada
  await page.getByRole("button", { name: "Adicionar" }).first().click();
  await page.getByRole("dialog").getByLabel("Nome do cartão").fill("Nubank");
  await page.getByRole("dialog").getByLabel("Limite").fill("2000");
  await page.getByRole("dialog").getByRole("button", { name: "Salvar cartão" }).click();
  await page.getByRole("button", { name: "Novo lançamento" }).click();
  await page.getByRole("dialog").getByLabel("Valor", { exact: true }).fill("600");
  await page.getByRole("dialog").getByPlaceholder(/Mercado do mês/).fill("Tênis");
  await page.getByRole("dialog").getByRole("button", { name: /Nubank \(cartão\)/ }).click();
  await page.getByRole("dialog").getByRole("combobox").selectOption("3");
  await page.getByRole("dialog").getByRole("button", { name: "Salvar lançamento" }).click();
  const parcels = await page.evaluate(() => JSON.parse(localStorage.getItem("norte:v1")).finance.transactions.filter((t) => t.installment).map((t) => [t.amount, t.invoiceMonth]));
  check("Finanças: compra em 3x no cartão", parcels.length === 3 && parcels.every((p) => p[0] === 20000) && new Set(parcels.map((p) => p[1])).size === 3);
  check("Finanças: parcela conta no mês certo", await page.locator(".io.out").getByText("R$ 350,50").isVisible());
  check("Finanças: compra no cartão não mexe no saldo", await page.locator(".balance").getByText("R$ 849,50").isVisible());
  await page.locator(".card-row").first().click();
  check("Finanças: fatura mostra a parcela", await page.getByRole("dialog").getByText(/Tênis/).first().isVisible());
  await page.getByRole("button", { name: "Fechar" }).click();
  check("Finanças: limite disponível", await page.getByText("Disponível R$ 1.400,00").isVisible());

  // Importar extrato OFX
  await page.getByRole("button", { name: /Importar extrato do banco/ }).click();
  await page.getByRole("dialog").getByLabel("Arquivo do extrato").setInputFiles(path.resolve("scripts/fixtures/extrato-exemplo.ofx"));
  await page.getByRole("dialog").getByText("SUPERMERCADO BOM PRECO").waitFor();
  check("Finanças: extrato OFX lido com categoria automática", await page.getByRole("dialog").getByText(/Mercado/).first().isVisible());
  await page.getByRole("dialog").getByRole("button", { name: /^Importar 3/ }).click();
  const imp = await page.evaluate(() => JSON.parse(localStorage.getItem("norte:v1")).finance.transactions.filter((t) => t.notes.startsWith("[import:")).length);
  check("Finanças: importa 3 lançamentos", imp === 3);
  await page.getByRole("button", { name: /Importar extrato do banco/ }).click();
  await page.getByRole("dialog").getByLabel("Arquivo do extrato").setInputFiles(path.resolve("scripts/fixtures/extrato-exemplo.ofx"));
  await page.getByRole("dialog").getByText(/3 já existem/).waitFor();
  check("Finanças: não duplica ao importar de novo", true);
  await page.getByRole("button", { name: "Fechar" }).click();


  // Atalho "Escanear nota" abre a câmera direto
  await page.getByRole("button", { name: "Escanear nota" }).click();
  check("Nota fiscal: atalho abre a leitura do QR", await page.getByRole("dialog", { name: "Ler QR Code da nota" }).isVisible());
  await page.getByRole("dialog", { name: "Ler QR Code da nota" }).getByRole("button", { name: "Cancelar" }).click();
  await page.getByRole("button", { name: "Fechar" }).click();
  // Nota fiscal: foto com QR Code da NFC-e
  await page.getByRole("button", { name: "Novo lançamento" }).click();
  await page.getByRole("dialog").getByLabel("Escolher foto da nota").setInputFiles(path.resolve("scripts/fixtures/nfce-qr.png"));
  await page.getByRole("dialog").getByText(/nota ficou guardada|Nota encontrada/).waitFor({ timeout: 30000 });
  check("Nota fiscal: QR lido da foto preenche o valor", (await page.getByRole("dialog").getByLabel("Valor", { exact: true }).inputValue()) === "89,90");
  check("Nota fiscal: link da Sefaz disponível", await page.getByRole("dialog").getByRole("link", { name: /Ver nota na Sefaz/ }).isVisible());
  await page.getByRole("dialog").getByRole("button", { name: "Salvar lançamento" }).click();
  const nf = await page.evaluate(async () => {
    const t = JSON.parse(localStorage.getItem("norte:v1")).finance.transactions.find((x) => x.nfce);
    if (!t) return null;
    const blob = await new Promise((res) => {
      const r = indexedDB.open("norte-files", 1);
      r.onsuccess = () => {
        const g = r.result.transaction("files").objectStore("files").get(t.attachmentId);
        g.onsuccess = () => res(g.result);
        g.onerror = () => res(null);
      };
      r.onerror = () => res(null);
    });
    return { amount: t.amount, date: t.date, chave: t.nfce.chave.length, photo: blob ? blob.size : 0 };
  });
  check("Nota fiscal: lançamento com chave, data e foto guardada", !!nf && nf.amount === 8990 && nf.date === "2026-09-05" && nf.chave === 44 && nf.photo > 0, JSON.stringify(nf));
  // Esconder valores
  await page.getByRole("button", { name: "Esconder valores" }).click();
  check("Finanças: esconder valores", await page.locator(".balance").getByText("R$ •••••").isVisible());
  await page.getByRole("button", { name: "Mostrar valores" }).click();
  check("Sem rolagem horizontal (390px) em Finanças", await noHorizontalScroll(page));
  await shot(page, "09-financas");


  // ---------- Casa ----------
  await page.getByRole("navigation").getByRole("link", { name: "Casa" }).click();
  await page.getByRole("button", { name: "Adicionar item" }).first().click();
  await page.getByRole("dialog").getByLabel("Nome").fill("Arroz");
  await page.getByRole("dialog").getByLabel("Quantidade").fill("1");
  await page.getByRole("dialog").getByLabel("Avisar quando tiver até").fill("1");
  await page.getByRole("dialog").getByRole("button", { name: "Salvar item" }).click();
  check("Casa: item na despensa com categoria automática", await page.getByText("Mercearia").isVisible());
  await page.getByRole("button", { name: /acabando\. Adicionar à lista/ }).click();
  check("Casa: item acabando vai para a lista", await page.getByRole("checkbox", { name: "Arroz" }).isVisible());
  await page.getByLabel("Adicionar à lista", { exact: true }).first().fill("leite, café");
  await page.getByRole("button", { name: "Adicionar à lista" }).last().click();
  await page.getByRole("checkbox", { name: "Arroz" }).click();
  await page.getByLabel("Preço de Arroz").fill("25,90");
  await page.getByLabel("Preço de Arroz").blur();
  await page.getByRole("button", { name: /Concluir compra/ }).click();
  await page.getByRole("dialog").getByRole("button", { name: "Concluir" }).click();
  const casa = await page.evaluate(() => {
    const st = JSON.parse(localStorage.getItem("norte:v1"));
    return { qty: st.pantry.items.find((i) => i.name === "Arroz").qty, left: st.pantry.shopping.length, tx: st.finance.transactions.some((t) => t.amount === 2590 && t.description.startsWith("Compras")) };
  });
  check("Casa: concluir compra soma na despensa", casa.qty === 2);
  check("Casa: itens não comprados ficam na lista", casa.left === 2);
  check("Casa: compra lançada nas Finanças", casa.tx);
  check("Sem rolagem horizontal (390px) em Casa", await noHorizontalScroll(page));
  await shot(page, "11-casa");

  // ---------- Metas, Fé e Perfil ----------
  await page.goto(`${BASE}/metas`);
  await page.getByRole("radio", { name: "Bem", exact: true }).click();
  await page.getByRole("button", { name: "Novo" }).click();
  await page.getByRole("dialog").getByLabel("Hábito").fill("Beber 2L de água");
  await page.getByRole("dialog").getByRole("button", { name: "Salvar hábito" }).click();
  await page.getByRole("checkbox", { name: "Beber 2L de água" }).click();
  check("Metas: hábito marcado hoje", (await page.getByRole("checkbox", { name: "Beber 2L de água" }).getAttribute("aria-checked")) === "true");
  await page.getByRole("button", { name: "Nova", exact: true }).click();
  await page.getByRole("dialog").getByLabel("Meta").fill("Quitar o cartão");
  await page.getByRole("dialog").getByLabel(/Passos/).fill("Listar dívidas\nNegociar juros");
  await page.getByRole("dialog").getByRole("button", { name: "Criar meta" }).click();
  check("Metas: meta com passos", await page.getByText("0 de 2 passos").isVisible());
  await shot(page, "12-metas");
  await page.goto(`${BASE}/fe`);
  check("Fé: mensagem do dia aparece", await page.locator(".daily-text").isVisible());
  await page.getByLabel("Gratidão 1").fill("Minha família");
  await page.getByRole("button", { name: "Salvar gratidão" }).click();
  check("Fé: gratidão registrada", await page.evaluate(() => JSON.parse(localStorage.getItem("norte:v1")).faith.gratitude.length === 1));
  await shot(page, "13-fe");
  await page.goto(`${BASE}/perfil`);
  await page.getByRole("button", { name: "Dinheiro" }).click();
  await page.getByRole("switch", { name: /Permitir que a IA/ }).click();
  await page.getByRole("button", { name: /Salvar perfil/ }).click();
  check("Perfil: salvo com consentimento", await page.evaluate(() => { const m = JSON.parse(localStorage.getItem("norte:v1")).me; return m.aiConsent && m.challenges.includes("Dinheiro"); }));


  // Backup
  await page.goto(`${BASE}/conta`);
  const [dl] = await Promise.all([page.waitForEvent("download"), page.getByRole("button", { name: "Baixar backup" }).click()]);
  const backup = JSON.parse(fs.readFileSync(await dl.path(), "utf8"));
  const backupFile = await dl.path();
  {
    const ctx2 = await browser.newContext({ viewport: { width: 390, height: 844 }, locale: "pt-BR" });
    const p2 = await ctx2.newPage();
    await p2.goto(`${BASE}/`);
    await p2.getByRole("link", { name: /Tenho um backup/ }).click();
    await p2.getByLabel("Arquivo de backup").setInputFiles(backupFile);
    await p2.getByRole("button", { name: "Restaurar agora" }).click();
    await p2.waitForURL("**/hoje");
    check("Backup: restaurar num link/aparelho novo", await p2.getByRole("heading", { name: /Daylerson/ }).isVisible());
    await ctx2.close();
  }
  check("Backup: arquivo com todos os dados", backup.app === "NORTE" && Array.isArray(backup.state.finance.transactions) && backup.state.pantry.items.length > 0);

  // ---------- Meu dia ----------
  await page.getByRole("navigation").getByRole("link", { name: "Hoje" }).click();
  await page.getByRole("link", { name: /ver meu dia/ }).click();
  await page.waitForURL("**/meu-dia");
  await page.getByRole("button", { name: "Adicionar" }).first().click();
  await page.getByRole("dialog").getByLabel("O quê?").fill("Resolver pendência");
  await page.getByRole("dialog").getByLabel("Horário").fill("16:30");
  await page.getByRole("dialog").getByRole("button", { name: /Adicionar ao meu dia/ }).click();
  check("Meu dia: adicionar compromisso", await page.getByText("Resolver pendência").isVisible());
  await shot(page, "07-meu-dia");

  // ---------- Assistente ----------
  await page.getByRole("link", { name: "Falar com o Assistente NORTE" }).click();
  await page.getByRole("button", { name: "Estou no celular. O que posso fazer agora?" }).click();
  await page.getByText(/sugestões para aproveitar/).waitFor({ timeout: 10000 });
  check("Assistente: responde em modo mock", true);
  await page.getByLabel("Mensagem para o NORTE").fill("Tenho ovos, pão, queijo, banana e café.");
  await page.getByRole("button", { name: "Enviar" }).click();
  await page.getByText(/ideias de café da manhã/).waitFor({ timeout: 10000 });
  check("Assistente: ideias de refeição", await page.getByText(/Ovos mexidos com queijo/).isVisible());
  await shot(page, "08-assistente");
  await page.getByLabel("Mensagem para o NORTE").fill("Amanhã quero acordar 5h e ir para academia.");
  await page.getByRole("button", { name: "Enviar" }).click();
  await page.getByRole("button", { name: "Confirmar" }).waitFor({ timeout: 10000 });
  const before = await page.evaluate(() => JSON.parse(localStorage.getItem("norte:v1")).routine.find((r) => r.title === "Academia").time);
  check("Assistente: ação mutável pede confirmação (nada muda antes)", before === "05:30");
  await page.getByLabel("Mensagem para o NORTE").fill("Não consegui finalizar o planejamento da semana");
  await page.getByRole("button", { name: "Enviar" }).click();
  await page.getByText(/Remarcar/).waitFor({ timeout: 10000 });
  await page.locator(".proposal", { hasText: "Remarcar" }).getByRole("button", { name: "Confirmar" }).click();
  const moved = await page.evaluate(() =>
    JSON.parse(localStorage.getItem("norte:v1")).priorities.find((p) => p.title.startsWith("Finalizar")).date,
  );
  check("Assistente: reorganização após confirmação", moved === "2026-09-12");

  // Assistente: finanças, lista e perfil
  await page.getByLabel("Mensagem para o NORTE").fill("gastei 50 no mercado");
  await page.getByRole("button", { name: "Enviar" }).click();
  await page.locator(".proposal", { hasText: "Despesa" }).getByRole("button", { name: "Confirmar" }).click();
  check("Assistente: lança despesa após confirmar", await page.evaluate(() => JSON.parse(localStorage.getItem("norte:v1")).finance.transactions.some((t) => t.amount === 5000)));
  await page.getByLabel("Mensagem para o NORTE").fill("coloca ovos e banana na lista");
  await page.getByRole("button", { name: "Enviar" }).click();
  await page.locator(".proposal", { hasText: "lista" }).getByRole("button", { name: "Confirmar" }).click();
  check("Assistente: adiciona à lista de compras", await page.evaluate(() => JSON.parse(localStorage.getItem("norte:v1")).pantry.shopping.some((x) => x.name === "Banana")));
  await page.getByLabel("Mensagem para o NORTE").fill("lembre que eu trabalho até as 18h");
  await page.getByRole("button", { name: "Enviar" }).click();
  await page.locator(".proposal", { hasText: "Guardar" }).getByRole("button", { name: "Confirmar" }).click();
  check("Assistente: guarda fato no perfil", await page.evaluate(() => JSON.parse(localStorage.getItem("norte:v1")).me.notes.length === 1));
  check("Sem rolagem horizontal (390px) no Assistente", await noHorizontalScroll(page));

  // Falha da IA não impede o uso: derruba a rota e confere o modo local
  await page.route("**/api/assistant", (r) => r.abort());
  await page.getByLabel("Mensagem para o NORTE").fill("o que falta na minha rotina?");
  await page.getByRole("button", { name: "Enviar" }).click();
  await page.getByText(/modo offline/).first().waitFor({ timeout: 10000 });
  check("Falha da IA: responde em modo local", true);
  await page.unroute("**/api/assistant");

  // ---------- 360px ----------
  await page.setViewportSize({ width: 360, height: 780 });
  let narrow = true;
  for (const url of ["/hoje", "/financas", "/casa", "/mais", "/rotina", "/leitura", "/familia", "/meu-dia", "/assistente", "/conta", "/fe", "/metas", "/perfil"]) {
    await page.goto(`${BASE}${url}`);
    await page.locator(".sheet").waitFor();
    const ok = await noHorizontalScroll(page);
    if (!ok) console.log("   rolagem horizontal em", url);
    narrow &&= ok;
  }
  check("Sem rolagem horizontal em 360px (todas as telas)", narrow);
  check("Nenhum erro de JavaScript na página", errors.length === 0, errors.join(" | "));
} catch (e) {
  check("Execução do roteiro", false, e.message.split("\n")[0]);
  await shot(page, "zz-falha");
} finally {
  await browser.close();
}

// ---------- Nenhuma chave no bundle do navegador ----------
function walk(dir) {
  return fs.readdirSync(dir, { withFileTypes: true }).flatMap((d) => (d.isDirectory() ? walk(path.join(dir, d.name)) : [path.join(dir, d.name)]));
}
const staticDir = path.resolve(".next/static");
if (fs.existsSync(staticDir)) {
  const leaked = walk(staticDir).filter((f) => /\.(js|css|html)$/.test(f)).filter((f) => /ANTHROPIC_API_KEY|OPENAI_API_KEY|sk-ant-|SUPABASE_SERVICE_ROLE/.test(fs.readFileSync(f, "utf8")));
  check("Sem API key no bundle do navegador", leaked.length === 0, leaked.join(", "));
}

const failed = results.filter((r) => !r.ok).length;
console.log(`\n${results.length - failed}/${results.length} verificações passaram.`);
process.exit(failed ? 1 : 0);
