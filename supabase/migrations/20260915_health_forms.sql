-- ============================================================================
-- Anamnese (ficha de saúde/atividade física) — módulo beta
-- ============================================================================
-- Uma ficha por cliente (não por matrícula). O dono/professor gera um link
-- público (token aleatório) e manda pro aluno preencher fora do painel — o
-- aluno não precisa de login. Leitura/escrita públicas passam só pelas duas
-- funções abaixo (nunca direto na tabela), então o token é a única "senha".
--
-- Rode este bloco INTEIRO no SQL Editor do Supabase.

-- Recurso beta, como o caixa: só aparece nos estabelecimentos liberados.
alter table establishments add column if not exists health_form_beta_enabled boolean not null default false;

create table if not exists health_forms (
  id uuid primary key default gen_random_uuid(),
  establishment_id uuid references establishments(id) on delete cascade,
  client_id uuid references clients(id) on delete cascade,
  token uuid not null default gen_random_uuid() unique,
  status text check (status in ('pendente', 'preenchida')) not null default 'pendente',
  parq_alert boolean not null default false, -- true se alguma resposta do PAR-Q foi "sim"
  answers jsonb, -- respostas do formulário (estrutura livre, ver Anamnese.tsx)
  signature_name text, -- nome digitado como assinatura/consentimento
  signed_at timestamptz,
  created_at timestamptz default now(),
  unique (client_id) -- uma ficha por cliente
);

create index if not exists health_forms_establishment on health_forms (establishment_id);

alter table health_forms enable row level security;

drop policy if exists "owner_all" on health_forms;
create policy "owner_all" on health_forms for all using (
  establishment_id in (select id from establishments where owner_id = auth.uid())
) with check (
  establishment_id in (select id from establishments where owner_id = auth.uid())
);

drop policy if exists "admin_all" on health_forms;
create policy "admin_all" on health_forms for all using (
  is_super_admin()
) with check (
  is_super_admin()
);

-- Professor (login visualizador) também vê as respostas — decisão do dono.
drop policy if exists "member_read" on health_forms;
create policy "member_read" on health_forms for select using (is_member(establishment_id));

-- Nenhuma policy pra "anon"/token — o acesso público passa só pelas funções
-- abaixo, que conferem o token manualmente e nunca expõem outras linhas.

-- ----------------------------------------------------------------------------
-- Cria (ou reaproveita) a ficha pendente de um cliente e devolve o token.
-- ----------------------------------------------------------------------------
create or replace function create_health_form(p_establishment uuid, p_client uuid)
returns uuid
language plpgsql security definer set search_path = public as $$
declare
  v_token uuid;
  v_authorized boolean;
begin
  select (
    exists (select 1 from establishments e where e.id = p_establishment and e.owner_id = auth.uid())
    or is_member(p_establishment)
  ) into v_authorized;

  if not coalesce(v_authorized, false) then
    raise exception 'Sem permissão para gerar anamnese neste estabelecimento';
  end if;

  select token into v_token from health_forms where client_id = p_client;
  if v_token is not null then
    return v_token;
  end if;

  insert into health_forms (establishment_id, client_id)
  values (p_establishment, p_client)
  returning token into v_token;

  return v_token;
end;
$$;

grant execute on function create_health_form(uuid, uuid) to authenticated;

-- ----------------------------------------------------------------------------
-- Leitura pública pelo token (o aluno abre o link e vê o que já preencheu,
-- se estiver retomando). Só devolve os campos do formulário, nada além disso.
-- ----------------------------------------------------------------------------
create or replace function get_health_form_by_token(p_token uuid)
returns table (
  status text,
  answers jsonb,
  client_name text,
  establishment_name text
)
language sql security definer set search_path = public as $$
  select hf.status, hf.answers, c.name, e.name
  from health_forms hf
  join clients c on c.id = hf.client_id
  join establishments e on e.id = hf.establishment_id
  where hf.token = p_token;
$$;

grant execute on function get_health_form_by_token(uuid) to anon, authenticated;

-- ----------------------------------------------------------------------------
-- Envio público pelo token — grava as respostas e marca como preenchida.
-- p_parq_alert vem calculado no front (true se alguma resposta do PAR-Q foi
-- "sim"), mas é só um sinalizador de destaque no painel — não bloqueia nada.
-- ----------------------------------------------------------------------------
create or replace function submit_health_form(
  p_token uuid,
  p_answers jsonb,
  p_signature_name text,
  p_parq_alert boolean
) returns void
language plpgsql security definer set search_path = public as $$
begin
  if not exists (select 1 from health_forms where token = p_token) then
    raise exception 'Link inválido ou expirado';
  end if;

  update health_forms set
    answers = p_answers,
    signature_name = nullif(trim(p_signature_name), ''),
    parq_alert = coalesce(p_parq_alert, false),
    status = 'preenchida',
    signed_at = now()
  where token = p_token;
end;
$$;

grant execute on function submit_health_form(uuid, jsonb, text, boolean) to anon, authenticated;
