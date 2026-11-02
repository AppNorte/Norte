# NORTE — Product Spec V1

## Visão

NORTE é uma central pessoal de direção e constância. A ideia é transformar parte do tempo no celular em uso intencional, com uma interface leve e uma IA que ajuda a organizar o que realmente importa.

## Problema que resolve

O usuário passa muito tempo no celular, tem dificuldade de manter uma rotina constante e quer organizar vida espiritual, leitura, academia, prioridades e família sem usar vários aplicativos diferentes.

## Princípio do produto

> Se eu já estou no celular, o NORTE deve ser um dos lugares mais úteis para eu estar.

## Escopo da V1

### 1. Hoje
- saudação e data;
- checklist da manhã;
- três prioridades;
- leitura do dia;
- lembretes familiares;
- acesso rápido ao Assistente NORTE.

### 2. Rotina
- rotina da manhã;
- rotina da noite;
- plano progressivo para chegar ao horário-meta de acordar;
- progresso semanal;
- edição de itens e horários.

### 3. Leitura
- plano bíblico;
- leitura de livro;
- progresso;
- reflexão/anotação;
- fila de próximos livros.

### 4. Família
- pessoas importantes;
- momentos planejados;
- registros de momentos;
- acompanhamento leve da semana;
- sem “gamificar” afeto de forma exagerada.

### 5. Assistente NORTE
- conversa por texto;
- voz posteriormente;
- consulta de contexto do app;
- sugestões de ações;
- ajuda para reorganizar o dia;
- ideias de café/refeições a partir do que o usuário informar;
- criação/edição de itens apenas com confirmação.

### 6. Meu dia
- linha do tempo manhã/tarde/noite;
- tarefas e compromissos;
- resumo do que está previsto.

## Fora da V1

- DaylinTech / CRM;
- orçamento técnico;
- estoque;
- financeiro completo;
- mapas e cálculo de deslocamento;
- dietas e prescrição nutricional;
- rede social/feed público;
- múltiplos perfis familiares;
- automações complexas.

## Filosofia de experiência

- O app não deve culpabilizar.
- Falhou um dia? Retome no próximo.
- Mostrar poucas prioridades.
- Evitar excesso de gráficos.
- A IA deve ser curta, prática e contextual.
- O app não pode depender da IA para funcionar.


---

# V2 — NORTE: um novo rumo na vida

Decisão do dono do produto (nov/2026): o NORTE passa a ser um app completo de desenvolvimento pessoal.
Itens antes "fora da V1" que agora entram: **financeiro pessoal completo** e **organização da casa (despensa)**.
Continuam fora: DaylinTech/CRM, estoque empresarial, rede social, prescrição de dieta/conduta médica.

## Navegação
Hoje · Finanças · Casa · Rotina · Mais — e o Assistente como botão flutuante.

## Etapas
1. **Base**: login opcional, dados salvos na nuvem (Supabase) e no aparelho; novo menu.
2. **Finanças** (só do usuário, por enquanto):
   - contas (corrente, poupança, carteira, investimento) com saldo;
   - lançamentos de receita, despesa e transferência; pagos ou pendentes;
   - cartões de crédito com limite, dia de fechamento e vencimento, fatura por mês e pagamento da fatura;
   - compras parceladas; lançamentos fixos mensais (recorrentes);
   - categorias com orçamento mensal; resumo do mês; saldo previsto; contas a pagar.
3. **Casa / Despensa**: estoque de alimentos, validade, lista de compras gerada pelo que acabou, histórico de preços.
4. **Fé e força**: mensagem diária, versículo, diário de gratidão e oração.
5. **IA que conhece o usuário**: "Meu perfil" preenchido e aprovado pelo usuário; mensagens e conselhos personalizados; o usuário vê e apaga o que a IA sabe.
6. **Desenvolvimento pessoal**: metas com etapas, hábitos com sequência, humor/energia, revisão semanal, conquistas.

Regras que continuam valendo: IA só propõe e o usuário confirma; chaves só no servidor; o app funciona sem IA.
