-- ============================================================================
-- Frente de caixa vira recurso beta (só para estabelecimentos liberados)
-- ============================================================================
-- O foco do Meridio é agendamento e vagas por horário/turma. O caixa/controle
-- de pagamentos fica em teste, liberado manualmente pelo superadmin em alguns
-- cadastros. Por padrão, nenhum estabelecimento tem acesso.
--
-- Rode no SQL Editor do Supabase.

alter table establishments add column if not exists cash_beta_enabled boolean not null default false;

-- Mantém o caixa liberado na Academia Fit Body, que já estava em teste.
update establishments set cash_beta_enabled = true where name ilike '%fit body%';
