# Manual do Meridio

> Manual de uso — vivo, atualizado a cada funcionalidade nova do sistema.
> Última atualização: 2026-09-16

---

## 1. O que é o Meridio

O Meridio é uma plataforma de agendamento e gestão para negócios de dois tipos (linhas):

| Linha | Para quem | Atendimento |
|---|---|---|
| **Estética** | Salão de beleza, barbearia, manicure, centro de estética | Sempre **individual**, por sessão |
| **Saúde & Fitness** | Academia, pilates, lutas, personal trainer, avaliação física, nutrição | **Individual ou em turma**, por sessão ou mensalidade |

A linha é escolhida **uma vez, no cadastro do estabelecimento**, e não pode ser trocada depois pelo próprio dono (evita conflito de configuração). Ela define quais categorias, campos e recursos aparecem no painel daquele estabelecimento.

---

## 2. Papéis de acesso

| Papel | Como entra | O que pode fazer |
|---|---|---|
| **Dono** | Login normal, é quem cadastrou o estabelecimento | Tudo: agenda, serviços, clientes, financeiro, configurações, caixa, anamnese |
| **Professor / visualizador** | Login compartilhado, liberado pelo dono em Configurações | Vê Dashboard, Agenda, Serviços, Clientes (sem excluir), Caixa (se liberado), Anamnese (se liberado). **Não** cancela agendamento, não exclui clientes, não cria/edita serviços |
| **Superadmin** | Você, dono da plataforma | Gerencia todos os estabelecimentos, planos, recursos beta. Pode "Entrar no painel" de qualquer cliente para ajudar a configurar |

### Login dos professores
- Configurações → **Login dos professores**
- O dono cria um e-mail/senha compartilhado (ex.: `professores@academia.com`) e libera o acesso
- Um único login pode ser usado por todos os professores da equipe

---

## 3. Cadastro do estabelecimento

Feito em `/register`, ou por um estabelecimento vindo de uma landing dedicada (`/estetica` ou `/saude-fitness`, que já pré-seleciona a linha).

Campos: nome, linha (segmento), categoria, telefone, endereço, e-mail de acesso, senha.

Depois, em **Configurações**, o dono edita:
- Nome, categoria, slug (URL pública)
- Logo / cor da marca
- Instagram, WhatsApp, e-mail, endereço (aparecem na página pública)
- Tema do painel (claro/escuro/automático)
- Horário de funcionamento (por dia da semana)
- Login dos professores

---

## 4. Serviços

Tela: **Serviços**. Um formulário simples para Estética; para Saúde & Fitness, uma pergunta a mais define tudo:

> **"Este serviço é individual ou em turma?"**
> - **Individual** → 1 cliente por horário, cobrança **por sessão**
> - **Turma** → várias vagas por horário, cobrança **por mensalidade** + define quantas vagas e quantas aulas por semana

### Horários fixos
Cada serviço tem uma grade semanal de horários (ex.: segunda e quarta às 19h). Ao cadastrar uma turma com "2x por semana", o sistema avisa se os dias configurados não batem com a frequência esperada.

### Matrícula em turma mensal
Ao se matricular, o cliente:
1. Vê a mensalidade e quantas vezes por semana a turma acontece
2. Escolhe a duração: **1 mês, 3 meses, 6 meses ou indeterminado**
3. O calendário já destaca os dias da semana da turma, com vagas
4. Ao confirmar, o sistema **reserva automaticamente todos os dias da semana da turma** (até 26 semanas à frente)
5. Uma cobrança de mensalidade é gerada automaticamente todo mês

---

## 5. Agenda

Visão semanal com toggle de dia. Cada agendamento mostra cliente, serviço, status (pendente/confirmado/concluído/cancelado) e pagamento (pendente/pago/reembolsado).

Um agendamento de turma recorrente tem um ícone especial — dá para **cancelar só aquela aula** ou **cancelar essa e todas as próximas** da mesma matrícula.

---

## 6. Clientes

- **Cadastro manual**: botão "Novo cliente" (útil quando alguém se matricula presencialmente). Reaproveita automaticamente um cadastro existente com o mesmo telefone, evitando duplicidade.
- **Mesclar duplicados**: quando o mesmo aluno aparece duas vezes (ex.: reservou pelo app com nome diferente do cadastro manual), o dono mescla os dois — reservas, mensalidades e movimentações de caixa passam para o mantido.
- **Editar**: nome, telefone, e-mail, observações.
- **Excluir**: só se não houver reservas/matrículas vinculadas.
- Cada cliente mostra: aulas matriculadas, situação financeira (mensalidades em aberto/pagas), e — se o módulo estiver ativo — status da anamnese.

---

## 7. Mensalidades e Financeiro

- Gerenciadas **pela própria academia**, não pelo superadmin.
- Tela **Financeiro**: KPIs (recebido, a receber, pagas, avulsos) + tabela de mensalidades com marcar pago/reabrir.
- No **Dashboard**, um bloco resumo com atalho direto para o Financeiro.

---

## 8. Frente de Caixa — recurso beta 🧪

> Fora do fluxo padrão do Meridio (que é focado em agendamento e vagas). Liberado estabelecimento por estabelecimento pelo superadmin, em Super Admin → Estabelecimentos → "Recursos beta".

- Registra recebimentos de **mensalidade** (baixa automática da cobrança em aberto), **serviço** ou **avulso**
- Forma de pagamento: dinheiro, Pix, cartão de crédito/débito, outro
- Lista de movimentações do dia com total
- **Recibo**: cada recebimento tem um botão para gerar um recibo pronto pra imprimir/PDF, com valor por extenso, dados do estabelecimento e linha de assinatura
- Operado por dono **e** professores

---

## 9. Anamnese — recurso beta 🧪

> Só faz sentido em Saúde & Fitness. Liberado da mesma forma que o Caixa.

Ficha de saúde baseada no modelo PAR-Q + histórico de saúde, usada antes do início de uma atividade física (pilates, academia, lutas).

**Fluxo:**
1. Dono/professor gera um link em `/admin/anamnese` → clica **"Gerar link"**
2. Copia ou envia direto por WhatsApp
3. Aluno preenche sozinho, sem precisar de login: identificação, PAR-Q (7 perguntas Sim/Não), histórico de saúde (com Sim/Não + detalhe), atividade física, hábitos de vida, objetivos, e assina digitando o nome
4. Painel mostra status: **Pendente** / **Preenchida** (com alerta se algum PAR-Q foi "Sim")

**Recursos dentro da ficha:**
- **Gráfico de estilo de vida**: 5 dimensões (atividade física, sono, estresse, hidratação, hábitos), cada uma com cor e rótulo — Bom / Regular / Atenção — e legenda
- **Fotos de avaliação postural**: 4 ângulos (frente, costas, lateral E/D), enviadas pelo profissional durante a entrevista. Guardadas em local privado, só acessíveis por URL temporária
- **Modo entrevista / impressão**: página separada, sempre em fundo claro, com todas as respostas + linhas em branco para anotação (avaliação postural, testes funcionais, plano de treino) + linha de assinatura do aluno e do avaliador
- **Excluir e refazer**: dono/superadmin pode apagar uma ficha para o aluno preencher do zero

Status visível direto no cadastro do cliente (selo "Anamnese OK" / "Anamnese pendente").

---

## 10. Compartilhamento

- Cada estabelecimento tem uma página pública (`/agendar/slug-do-estabelecimento`)
- **QR code** estático + link + botão WhatsApp, disponível no Dashboard
- A página pública mostra: endereço, telefone, e-mail, Instagram, botão de WhatsApp, e a lista de serviços com fotos

---

## 11. Landing pages por linha de negócio

- `/` — landing geral, mostra as duas linhas
- `/estetica` — dedicada a salão/barbearia/estética (fotos, texto e categorias específicas)
- `/saude-fitness` — dedicada a academia/pilates/lutas/personal/nutrição
- CTA de cadastro já leva a linha certa pré-selecionada no formulário

---

## 12. Super Admin

- **Estabelecimentos**: lista todos, edita dados, ativa/suspende, libera recursos beta (Caixa, Anamnese)
- **Entrar no painel**: acessa o painel de qualquer cliente para ajudar a configurar (faixa amarela avisando "Modo Super Admin" enquanto ativo)
- **Planos e assinaturas**
- **Cobranças por agendamento** (taxa opcional por reserva confirmada)

---

## 13. Segurança e privacidade (resumo)

- Todos os dados ficam no Supabase (banco Postgres gerenciado, hospedado na AWS), com criptografia em trânsito (HTTPS) e em repouso, automáticas
- Cada tabela tem controle de acesso por linha (RLS) — um estabelecimento nunca vê dados de outro
- Fotos de avaliação postural ficam em um bucket **privado**, nunca em link público
- Senhas dos usuários nunca ficam em texto puro (hash pelo Supabase Auth)

---

## Histórico de versões deste manual

| Data | O que entrou |
|---|---|
| 2026-09-16 | Primeira versão — cobre tudo construído até aqui: segmentação, papéis de acesso, serviços/turmas, agenda, clientes, mensalidades, Caixa (beta), Anamnese (beta, com fotos posturais e recibo), compartilhamento, landing pages, Super Admin, segurança |
