# Manual do Meridio

> Manual de uso — vivo, atualizado a cada funcionalidade nova do sistema.
> Última atualização: 2026-09-15 (instruções passo a passo de recibo e fotos)

---

## 1. O que é o Meridio

O Meridio é uma plataforma de agendamento e gestão para negócios de dois tipos (linhas):

| Linha | Para quem | Atendimento |
|---|---|---|
| **Estética** | Salão de beleza, barbearia, manicure, centro de estética | Sempre **individual**, por sessão |
| **Saúde & Fitness** | Academia, pilates, lutas, personal trainer, avaliação física, nutrição | **Individual ou em turma**, por sessão ou mensalidade |

A linha é escolhida **uma vez, no cadastro do estabelecimento**, e não pode ser trocada depois pelo próprio responsável (evita conflito de configuração). Ela define quais categorias, campos e recursos aparecem no painel daquele estabelecimento.

---

## 2. Papéis de acesso

> **Responsável** substitui "dono" — pode ser o proprietário do negócio ou um gerente responsável pela gestão. **Colaborador** substitui "professor" — vale tanto para professor/instrutor (academia, pilates) quanto para atendente/profissional de um salão, por exemplo.

| Papel | Como entra | O que pode fazer |
|---|---|---|
| **Responsável** | Login normal, é quem cadastrou o estabelecimento (ou foi designado como gestor) | Tudo: agenda, serviços, clientes, financeiro, configurações, caixa, anamnese |
| **Colaborador / visualizador** | Login compartilhado, liberado pelo responsável em Configurações | Vê Dashboard, Agenda, Serviços, Clientes (sem excluir), Caixa (se liberado), Anamnese (se liberado). **Não** cancela agendamento, não exclui clientes, não cria/edita serviços |
| **Superadmin** | Você, responsável pela plataforma | Gerencia todos os estabelecimentos, planos, recursos beta. Pode "Entrar no painel" de qualquer cliente para ajudar a configurar |

### Login dos colaboradores
- Configurações → **Login dos colaboradores**
- O responsável cria um e-mail/senha compartilhado (ex.: `equipe@academia.com`) e libera o acesso
- Um único login pode ser usado por todos os colaboradores da equipe

---

## 3. Cadastro do estabelecimento

Feito em `/register`, ou por um estabelecimento vindo de uma landing dedicada (`/estetica` ou `/saude-fitness`, que já pré-seleciona a linha).

Campos: nome, linha (segmento), categoria, telefone, endereço, e-mail de acesso, senha.

Depois, em **Configurações**, o responsável edita:
- Nome, categoria, slug (URL pública)
- Logo / cor da marca
- Instagram, WhatsApp, e-mail, endereço (aparecem na página pública)
- Tema do painel (claro/escuro/automático)
- Horário de funcionamento (por dia da semana)
- Login dos colaboradores

---

## 4. Serviços

Tela: **Serviços**. Um formulário simples para Estética; para Saúde & Fitness, uma pergunta a mais define tudo:

> **"Este serviço é individual ou em turma?"**
> - **Individual** → 1 cliente por horário, cobrança **por sessão**
> - **Turma** → várias vagas por horário, cobrança **por mensalidade** + define quantas vagas e quantas aulas por semana

### Horários fixos
Cada serviço tem uma grade semanal de horários (ex.: segunda e quarta às 19h). Ao cadastrar uma turma com "2x por semana", o sistema avisa se os dias configurados não batem com a frequência esperada.

### Profissionais
Cadastro de quem atende (nome, foto, quais serviços cada um realiza).

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

Ao clicar em **"Marcar como pago"**, o sistema pergunta a forma de pagamento e se quer **emitir o recibo na hora** (com o valor e o nome do serviço já preenchidos) — ver item 8, "Como emitir um recibo".

---

## 6. Clientes

- **Cadastro manual**: botão "Novo cliente" (útil quando alguém se matricula presencialmente). Reaproveita automaticamente um cadastro existente com o mesmo telefone, evitando duplicidade.
- **Mesclar duplicados**: quando o mesmo aluno aparece duas vezes (ex.: reservou pelo app com nome diferente do cadastro manual), o responsável mescla os dois — reservas, mensalidades e movimentações de caixa passam para o mantido.
- **Editar**: nome, telefone, e-mail, observações.
- **Excluir**: só se não houver reservas/matrículas vinculadas.
- Cada cliente mostra: aulas matriculadas, situação financeira (mensalidades em aberto/pagas), e — se o módulo estiver ativo — status da anamnese.
- **Marcar mensalidade como paga**: direto no card do cliente, também pergunta forma de pagamento e se quer emitir o recibo na hora.

---

## 7. Mensalidades e Financeiro

- Gerenciadas **pela própria academia**, não pelo superadmin.
- Tela **Financeiro**: KPIs (recebido, a receber, pagas, avulsos) + tabela de mensalidades com marcar pago/reabrir.
- No **Dashboard**, um bloco resumo com atalho direto para o Financeiro.
- Ao clicar em **"Marcar pago"**, o sistema pede a forma de pagamento e pergunta se quer **emitir o recibo na hora** — o recebimento também passa a aparecer no histórico de movimentações da Frente de Caixa (item 8), mesmo sem o recurso beta liberado.

---

## 8. Frente de Caixa — recurso beta 🧪

> Fora do fluxo padrão do Meridio (que é focado em agendamento e vagas). Liberado estabelecimento por estabelecimento pelo superadmin, em Super Admin → Estabelecimentos → "Recursos beta".

- Registra recebimentos de **mensalidade** (baixa automática da cobrança em aberto), **serviço** ou **avulso**
- Forma de pagamento: dinheiro, Pix, cartão de crédito/débito, outro
- Lista de movimentações do dia com total
- **Recibo**: cada recebimento tem um botão para gerar um recibo pronto pra imprimir/PDF, com valor por extenso, dados do estabelecimento e linha de assinatura
- Operado por responsável **e** colaboradores
- Também recebe automaticamente os pagamentos marcados em **Financeiro**, no cadastro do **Cliente** e na **Agenda** — não é preciso lançar de novo no Caixa

### Como emitir um recibo
1. Tela **Caixa** → localize a movimentação recebida na lista do dia
2. Clique no ícone de recibo (📄) ao lado da movimentação
3. Abre em nova aba: recibo pronto com número, valor em número e por extenso, forma de pagamento, data, dados do estabelecimento e linha de assinatura
4. Use **Ctrl+P** (ou o menu do navegador) para imprimir ou salvar como PDF — a página força fundo branco automaticamente, mesmo com o tema escuro ativo, para não gastar tinta/ficar ilegível na impressão

---

## 9. Anamnese — recurso beta 🧪

> Só faz sentido em Saúde & Fitness. Liberado da mesma forma que o Caixa.

Ficha de saúde baseada no modelo PAR-Q + histórico de saúde, usada antes do início de uma atividade física (pilates, academia, lutas).

**Fluxo:**
1. Responsável/colaborador gera um link em `/admin/anamnese` → clica **"Gerar link"**
2. Copia ou envia direto por WhatsApp
3. Aluno preenche sozinho, sem precisar de login: identificação, PAR-Q (7 perguntas Sim/Não), histórico de saúde (com Sim/Não + detalhe), atividade física, hábitos de vida, objetivos, e assina digitando o nome
4. Painel mostra status: **Pendente** / **Preenchida** (com alerta se algum PAR-Q foi "Sim")

**Recursos dentro da ficha:**
- **Gráfico de estilo de vida**: 5 dimensões (atividade física, sono, estresse, hidratação, hábitos), cada uma com cor e rótulo — Bom / Regular / Atenção — e legenda
- **Fotos de avaliação postural**: 4 ângulos (frente, costas, lateral E/D), enviadas pelo profissional durante a entrevista. Guardadas em local privado, só acessíveis por URL temporária
- **Modo entrevista / impressão**: página separada, sempre em fundo claro, com todas as respostas + linhas em branco para anotação (avaliação postural, testes funcionais, plano de treino) + linha de assinatura do aluno e do avaliador
- **Excluir e refazer**: responsável/superadmin pode apagar uma ficha para o aluno preencher do zero

Status visível direto no cadastro do cliente (selo "Anamnese OK" / "Anamnese pendente").

### Como enviar as fotos de avaliação postural
1. Tela **Anamnese** → abra a ficha já **preenchida** do aluno (ícone de olho)
2. No topo do modal, aparecem 4 quadros: **Frente, Costas, Lateral esquerda, Lateral direita**
3. Toque em cada quadro para tirar a foto na hora (celular abre a câmera) ou escolher um arquivo já salvo
4. A foto sobe automaticamente e fica visível ali mesmo — pode trocar (substitui a anterior) ou remover a qualquer momento
5. As fotos **nunca** ficam em link público: são acessadas por um link temporário que expira em poucos minutos, e só quem tem acesso ao estabelecimento (responsável, colaborador ou superadmin) consegue visualizar

### Como imprimir para a entrevista
1. Na ficha preenchida, clique em **"Imprimir para entrevista"**
2. Abre uma página separada, sempre em fundo claro, com identificação, gráfico de estilo de vida, todas as respostas e linhas em branco para o profissional anotar durante o atendimento
3. Use **Ctrl+P** para imprimir ou salvar como PDF

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
- **Notificações**: histórico de notificações enviadas

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
| 2026-09-15 | Papéis renomeados: "Dono" → **Responsável** (cobre também gerentes, não só o proprietário) e "Professor" → **Colaborador** (vale para qualquer segmento, não só academia/pilates — ex.: salão de beleza) |
| 2026-09-15 | Adicionados passo a passo de "como fazer": emitir recibo no Caixa, enviar fotos de avaliação postural na Anamnese e imprimir a ficha para a entrevista |
| 2026-09-15 | Cada setor do painel agora tem um link "Acessar:" com o caminho direto (ex.: `/admin/agenda`, `/admin/caixa`, `/superadmin/estabelecimentos`) |
| 2026-09-15 | Ao marcar mensalidade (Financeiro, Clientes) ou serviço avulso (Agenda) como pago, o sistema pergunta a forma de pagamento e se quer emitir o recibo na hora — o recebimento passa a aparecer também no histórico da Frente de Caixa |
| 2026-09-15 | Removidos os links "Acessar:" de cada seção (a pedido) |
