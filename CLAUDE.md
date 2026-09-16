# Atendente App — CLAUDE.md

Sistema de agendamento online para profissionais liberais (salões, barbearias, estética, pilates).

## Instruções permanentes

- **SQL externo**: sempre que uma mudança exigir rodar SQL no Supabase (SQL Editor) —
  migrations, policies, funções, gatilhos — **cole o SQL completo na resposta do chat**,
  pronto para copiar e colar, além de salvar o arquivo em `supabase/migrations/`. Não basta
  citar o nome do arquivo: o usuário aplica o SQL manualmente e precisa dele à mão.

## Stack

- **Frontend**: React 19 + TypeScript + Vite
- **Estilo**: TailwindCSS 4 (via `@tailwindcss/vite`), cor primária `purple-600`
- **Roteamento**: react-router-dom 7
- **Formulários**: react-hook-form + zod
- **Ícones**: lucide-react
- **Backend**: Supabase (PostgreSQL + Auth + Edge Functions)
- **Deploy**: Vercel (`vercel.json` presente)

## Estrutura de pastas

```
src/
  assets/          Imagens estáticas
  components/
    layout/        AdminLayout (sidebar do painel admin)
    ui/            Componentes reutilizáveis (Button, Input, Modal, Calendar, Badge, TimeSlotGrid, DemoBanner)
  context/
    AuthContext    Sessão do Supabase Auth
  hooks/           Hooks de dados (ver seção abaixo)
  lib/
    supabase.ts    Cliente Supabase (graceful — não joga erro se variáveis ausentes)
    isDemo.ts      Flag booleana de modo demo
    mockData.ts    Dados simulados realistas para modo demo
    utils.ts       Utilitários genéricos (cn, formatação)
  pages/
    Home.tsx       Landing page pública
    Login.tsx      Autenticação
    Register.tsx   Cadastro
    Booking.tsx    Página de agendamento pública (/agendar/:slug)
    NotFound.tsx   Página 404
    admin/         Páginas do painel (Dashboard, Agenda, Clientes, Servicos, Profissionais, Configuracoes)
  types/
    index.ts       Interfaces TypeScript (Establishment, Service, Professional, Client, Appointment, WorkingHours, TimeSlot)
supabase/
  schema.sql       DDL completo do banco
  functions/       Edge Functions (send-reminder, create-payment)
```

## Como rodar

```bash
npm install
npm run dev        # Inicia em http://localhost:5173
npm run build      # Build de produção (tsc + vite build)
npm run lint       # oxlint
npm run preview    # Preview do build
```

## Variáveis de ambiente

Copie `.env.example` para `.env` e preencha:

```env
VITE_SUPABASE_URL=https://SEU_PROJETO.supabase.co
VITE_SUPABASE_ANON_KEY=sua_anon_key
```

Sem essas variáveis, o app roda automaticamente em **modo demo**.

## Modo demo

Quando `VITE_SUPABASE_URL` não está definida ou contém o valor padrão `https://SEU_PROJETO.supabase.co`, o módulo `src/lib/isDemo.ts` exporta `isDemo = true`.

Nesse modo:
- Todos os hooks retornam dados de `src/lib/mockData.ts` imediatamente, sem fazer chamadas ao Supabase.
- Mutações (criar cliente, criar agendamento, etc.) operam apenas sobre o state local com `crypto.randomUUID()`.
- Um banner amarelo fixo no topo avisa o usuário que está em modo demonstração (`DemoBanner`).
- Os dados simulados incluem: 1 estabelecimento (Salão Bella Vita / slug `bella-vita`), 3 serviços, 2 profissionais, 3 clientes e 5 agendamentos distribuídos em hoje e os próximos 2 dias.

## Arquitetura dos hooks

Todos os hooks em `src/hooks/` seguem o padrão:

```ts
import { isDemo } from '../lib/isDemo'
import { mockXxx } from '../lib/mockData'

export function useXxx(param) {
  // ...
  const fetchData = useCallback(async () => {
    if (isDemo) {
      setData(mockXxx)
      setLoading(false)
      return
    }
    // chamada normal ao Supabase...
  }, [param])
}
```

Hooks disponíveis:
- `useEstablishment(userId)` — estabelecimento do usuário autenticado
- `useEstablishmentBySlug(slug)` — estabelecimento público pelo slug
- `useServices(establishmentId)` — + createService / updateService / deleteService
- `useProfessionals(establishmentId)` — + createProfessional / updateProfessional / deleteProfessional
- `useClients(establishmentId)` — + createClient / exportCsv
- `useAppointments(establishmentId, date?)` — + createAppointment / updateStatus
- `useAvailability({ establishmentId, professionalId, serviceId, date, durationMinutes })` — calcula slots disponíveis

## Schema do banco (resumo)

| Tabela | Campos principais |
|---|---|
| `establishments` | id, name, slug, category, phone, email, address, owner_id |
| `professionals` | id, establishment_id, name, avatar_url |
| `professional_services` | professional_id, service_id (relação N:N) |
| `services` | id, establishment_id, name, duration_minutes, price, active |
| `clients` | id, establishment_id, name, phone, email, notes |
| `appointments` | id, establishment_id, client_id, professional_id, service_id, starts_at, ends_at, status, payment_status |
| `working_hours` | id, establishment_id, day_of_week (0-6), open_time, close_time, is_open |
| `notifications` | id, appointment_id, channel, sent_at, status |
| `establishment_members` | id, establishment_id, email, role ('viewer'), created_at — acessos de login por e-mail |
| `cash_movements` | id, establishment_id, client_id, membership_charge_id, kind, description, amount, method, operator_email, created_at — frente de caixa |

`establishments.cash_beta_enabled` (bool, default false) — frente de caixa é recurso
beta, fora do fluxo padrão (agendamento + vagas/turmas). Liberado manualmente pelo
superadmin em Super Admin → Estabelecimentos → editar → "Recursos beta".

`establishments.financeiro_beta_enabled` (bool, default false) — tela Financeiro
(mensalidades e relatórios) também virou recurso beta (2026-09-16), mesmo padrão do
Caixa. Como já era usada em produção, a migration desliga para todos os
estabelecimentos existentes — precisa liberar de novo em Super Admin →
Estabelecimentos → "Recursos beta" para quem já usava. Rota `/admin/financeiro`
gateada por `FinanceiroBetaRoute` em `src/App.tsx` (dentro do `OwnerRoute`, então
exige dono **e** beta liberado); item de nav em `AdminLayout.tsx` some se a flag
estiver desligada; atalhos do Dashboard para o Financeiro só aparecem com a flag
ligada.

## Auditoria de segurança (2026-09-14)

Achado crítico: `establishments`, `professionals`, `professional_services`,
`services`, `service_schedules`, `clients` e `appointments` têm policies
definidas em migrations antigas, mas o `enable row level security` dessas
tabelas não está versionado (foi feito manualmente no painel antes desta
convenção de sempre colar SQL no chat). Rodar
`20260914_security_audit_rls.sql` liga o RLS nelas (idempotente, seguro
mesmo se já estiver ligado) e devolve uma query de conferência — deve vir
zero linhas.

Outros pontos verificados: um `.env` chegou a ser commitado no histórico do
git (removido depois), mas era só o template com placeholders, nenhum
segredo real vazou. Nenhum uso de `dangerouslySetInnerHTML`/XSS encontrado.
`payment-webhook` revalida o pagamento contra a API do Mercado Pago em vez
de confiar no corpo da notificação. Verificar no painel do Supabase se a
função `payment-webhook` está com "Enforce JWT verification" desligado
(senão o Mercado Pago não consegue notificar e pagamentos nunca confirmam
sozinhos).

## Anamnese (ficha de saúde) — módulo beta

Uma ficha por cliente (não por matrícula). Dono ou professor gera um link
público em `/admin/anamnese` (botão "Gerar link"); o aluno preenche em
`/anamnese/:token` sem precisar de login — o token é a única "senha", nunca
há policy de leitura pública direta na tabela `health_forms`. Duas funções
SECURITY DEFINER intermediam tudo: `get_health_form_by_token` (leitura) e
`submit_health_form` (grava e marca `status = 'preenchida'`). Se alguma
resposta do PAR-Q for "Sim", `parq_alert` fica `true` e aparece destacado
para o dono/professor. Dono e professores (`is_member`) veem as respostas
completas — decisão do usuário, dado sensível mas operacional para a equipe.

Recurso beta como o caixa: `establishments.health_form_beta_enabled`
(default false), liberado em Super Admin → Estabelecimentos → "Recursos
beta". Definição dos campos/seções em `src/lib/anamnese.ts` (fonte única
para o formulário público e a visualização no painel).

## Fotos de avaliação postural (anamnese)

4 ângulos fixos (frente/costas/lateral E/lateral D), tiradas pelo profissional
durante a entrevista — não pelo aluno no link público. Bucket **privado**
`anamnese-fotos` no Supabase Storage (dado sensível — imagem do corpo do
aluno); caminho `{establishment_id}/{health_form_id}/{angulo}-{timestamp}.ext`,
RLS em `storage.objects` conferindo o 1º segmento do caminho contra
owner/is_member/is_super_admin. Exibição sempre via `createSignedUrl`
(nunca link público direto). Colunas `health_forms.photo_*` guardam o
caminho de cada ângulo. UI em `src/components/admin/PosturePhotos.tsx`,
usado no modal de respostas de `/admin/anamnese`.

## Superadmin: entrar no painel de um cliente

Super Admin → Estabelecimentos → ícone "Entrar no painel" (LogIn) leva o
superadmin direto para `/admin` operando aquele estabelecimento (`role: 'admin'`
em `useEstablishment`), para ajudar a configurar serviços/turmas/horários.
Uma faixa amarela "Modo Super Admin" fica fixa no topo do painel, com botão
"Sair". Implementado via `adminViewEstablishmentId` no localStorage (chave
separada da seleção normal do dono) + policies `admin_all` em
`working_hours`, `service_schedules`, `clients`, `appointments` e
`establishment_members` (as demais já existiam). Não usa impersonação de
login real — o superadmin opera com a própria sessão, autorizado pelas
policies `is_super_admin()`.

## Landing pages por segmento

`/` é a landing geral (ambas as linhas). `/estetica` e `/saude-fitness` são landings
dedicadas — mesmo componente `Home.tsx` parametrizado por `segment`, com hero, copy,
imagens e CTA (`/register?linha=...`) próprios de cada linha. `Register.tsx` lê
`?linha=` da URL e pré-seleciona a linha do negócio.

RLS ativado em todas as tabelas; dono do estabelecimento acessa tudo via `owner_id = auth.uid()`.

## Branch padrão de desenvolvimento

`main` — enviar PRs diretamente para `main` neste estágio inicial.

## Autonomia de deploy

O usuário autoriza commit, merge e deploy sem aguardar confirmação prévia. Sempre que uma mudança estiver pronta: fazer commit, criar PR, mesclar e fazer deploy automaticamente.

## Gestão de contexto

Usar `/compact` sempre que o contexto estiver crescendo para economizar tokens e manter a sessão eficiente.

## Login visualizador (professores) — confirmação de e-mail

O login compartilhado dos professores (somente leitura) é criado em
**Configurações → Login dos professores**, via um cliente Supabase isolado
(`persistSession: false`) para não derrubar a sessão do dono. Depende das tabelas/
policies do arquivo `supabase/migrations/20260912_establishment_members.sql`.

**Atenção:** se o projeto exigir confirmação de e-mail (Authentication → Providers
→ Email → "Confirm email" ligado), a conta criada só faz login depois de confirmada
uma vez. Duas saídas:
- **Recomendado:** desligar "Confirm email" (é um login operacional compartilhado); ou
- Criar/confirmar manualmente em Authentication → Users → Add user, marcando
  "Auto Confirm User".

## Manual do usuário — manter sempre atualizado

`docs/MANUAL.md` é o manual de uso do Meridio (para o dono/cliente da plataforma,
não para desenvolvimento). Organizado por linha de negócio (Estética / Saúde &
Fitness), tipo de serviço, papéis de acesso e cada módulo/cadastro do sistema.

**Regra permanente**: sempre que uma funcionalidade nova for implementada e
confirmada (ex.: "supa OK" ou o usuário validando o resultado), atualizar
`docs/MANUAL.md` na mesma leva de commits — adicionar/editar a seção
correspondente e uma linha no "Histórico de versões" no fim do arquivo, com a
data do dia. Depois de atualizar, também republicar a versão em Artifact (se
existir uma já publicada nesta conversa) para refletir a mudança.
