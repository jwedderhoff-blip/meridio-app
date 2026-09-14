-- ============================================================================
-- Auditoria de segurança: garante RLS ligado em TODAS as tabelas
-- ============================================================================
-- Várias tabelas (appointments, clients, establishments, professionals,
-- professional_services, services, service_schedules) têm policies definidas
-- em migrations antigas, mas o comando que LIGA o RLS na tabela não está no
-- histórico versionado — foi feito manualmente no painel do Supabase em algum
-- momento anterior a esta convenção. Uma policy só vale alguma coisa se o RLS
-- estiver ligado; sem isso, QUALQUER pessoa com a chave pública (anon) lê e
-- escreve a tabela inteira, políticas ou não.
--
-- Rodar "enable row level security" numa tabela que já está com RLS ligado
-- não tem efeito nenhum (idempotente) — pode rodar sem medo mesmo se já
-- estiver tudo certo.
--
-- Rode este bloco INTEIRO no SQL Editor do Supabase.

alter table establishments         enable row level security;
alter table professionals          enable row level security;
alter table professional_services  enable row level security;
alter table services               enable row level security;
alter table service_schedules      enable row level security;
alter table clients                enable row level security;
alter table appointments           enable row level security;

-- ----------------------------------------------------------------------------
-- Conferência: lista toda tabela do schema public SEM RLS ligado.
-- Depois de rodar o bloco acima, esta consulta deve devolver ZERO linhas.
-- Se devolver alguma linha, essa tabela está 100% aberta pela chave anon.
-- ----------------------------------------------------------------------------
select schemaname, tablename
from pg_tables
where schemaname = 'public'
  and rowsecurity = false;
