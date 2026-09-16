-- ============================================================================
-- Ciclo de cobrança para planos mensais (30/90/180 dias, etc.)
-- ============================================================================
-- O tipo de cobrança "Mensal" guarda um preço por mês, mas o app não cobra
-- automaticamente — o superadmin cobra manualmente (Pix, etc.) na periodicidade
-- que escolher para aquele plano. Esse campo só documenta/mostra essa
-- periodicidade e o total do ciclo na tela de Planos; não muda nenhuma regra
-- de acesso. Plano existente sem valor definido assume ciclo de 30 dias
-- (comportamento igual ao de hoje).
--
-- Rode no SQL Editor do Supabase.

alter table plans add column if not exists billing_cycle_days int;

update plans set billing_cycle_days = 30
  where billing_type = 'monthly' and billing_cycle_days is null;
