-- ============================================================================
-- Superadmin: acessar o painel de um estabelecimento para ajudar a configurar
-- ============================================================================
-- O superadmin já podia editar dados do estabelecimento, profissionais e
-- serviços (admin_all já existia nessas tabelas). Faltava poder configurar os
-- horários fixos das turmas (service_schedules), o horário de funcionamento
-- (working_hours) e operar agenda/clientes ao entrar no painel do cliente.
--
-- Rode este bloco no SQL Editor do Supabase.

-- Horário de funcionamento do estabelecimento
drop policy if exists "admin_all" on working_hours;
create policy "admin_all" on working_hours for all using (
  is_super_admin()
) with check (
  is_super_admin()
);

-- Horários fixos dos serviços/turmas (não tem establishment_id direto — liga
-- pelo service_id)
drop policy if exists "admin_all" on service_schedules;
create policy "admin_all" on service_schedules for all using (
  is_super_admin()
) with check (
  is_super_admin()
);

-- Clientes e agenda do estabelecimento
drop policy if exists "admin_all" on clients;
create policy "admin_all" on clients for all using (
  is_super_admin()
) with check (
  is_super_admin()
);

drop policy if exists "admin_all" on appointments;
create policy "admin_all" on appointments for all using (
  is_super_admin()
) with check (
  is_super_admin()
);

-- Login dos professores (establishment_members) — o superadmin também
-- gerencia isso ao ajudar o cliente a configurar.
drop policy if exists "admin_all" on establishment_members;
create policy "admin_all" on establishment_members for all using (
  is_super_admin()
) with check (
  is_super_admin()
);

-- merge_clients (mesclar clientes duplicados) também passa a aceitar o
-- superadmin, não só o dono — reexecuta a função com essa checagem extra.
create or replace function merge_clients(p_keep uuid, p_remove uuid)
returns void
language plpgsql security definer set search_path = public as $$
declare
  v_est uuid;
begin
  if p_keep = p_remove then
    raise exception 'Selecione dois clientes diferentes';
  end if;

  select establishment_id into v_est from clients where id = p_keep;
  if v_est is null then
    raise exception 'Cliente a manter não encontrado';
  end if;

  if not exists (
    select 1 from establishments e where e.id = v_est and e.owner_id = auth.uid()
  ) and not is_super_admin() then
    raise exception 'Sem permissão para mesclar clientes deste estabelecimento';
  end if;

  if not exists (
    select 1 from clients where id = p_remove and establishment_id = v_est
  ) then
    raise exception 'Cliente duplicado inválido';
  end if;

  update appointments       set client_id = p_keep where client_id = p_remove;
  update memberships         set client_id = p_keep where client_id = p_remove;
  update membership_charges  set client_id = p_keep where client_id = p_remove;
  update cash_movements      set client_id = p_keep where client_id = p_remove;

  delete from clients where id = p_remove;
end;
$$;

grant execute on function merge_clients(uuid, uuid) to authenticated;
