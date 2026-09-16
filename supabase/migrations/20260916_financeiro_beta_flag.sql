-- ============================================================================
-- Financeiro vira recurso beta (só para estabelecimentos liberados)
-- ============================================================================
-- Mesmo padrão do Caixa e da Anamnese: por padrão nenhum estabelecimento tem
-- acesso, o superadmin libera manualmente em Super Admin → Estabelecimentos →
-- editar → "Recursos beta".
--
-- Rode no SQL Editor do Supabase.

alter table establishments add column if not exists financeiro_beta_enabled boolean not null default false;
