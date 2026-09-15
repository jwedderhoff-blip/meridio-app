import { useCallback, useEffect, useState } from 'react'
import { supabase } from '../lib/supabase'
import type { PaymentMethod } from './useCaixa'

export interface MembershipCharge {
  id: string
  membership_id: string
  establishment_id: string
  client_id: string | null
  service_id: string | null
  reference_month: string
  amount: number
  status: 'pendente' | 'pago' | 'cancelada'
  paid_at: string | null
  created_at: string
  clients?: { name: string } | null
  services?: { name: string; price_mode?: string } | null
}

const MONTH_LABEL = ['jan', 'fev', 'mar', 'abr', 'mai', 'jun', 'jul', 'ago', 'set', 'out', 'nov', 'dez']
function chargeDescription(charge: MembershipCharge): string {
  const [y, m] = charge.reference_month.split('-')
  const mes = `${MONTH_LABEL[Number(m) - 1]}/${y.slice(2)}`
  return `Mensalidade ${charge.services?.name ?? 'turma'} — ${mes}`
}

/**
 * Registra o recebimento da mensalidade no caixa (fica no histórico de
 * movimentações e gera o recibo) e marca a cobrança como paga. Devolve o
 * id da movimentação para abrir o recibo na hora, se o usuário quiser.
 */
async function registerChargePayment(
  establishmentId: string,
  charge: MembershipCharge,
  method: PaymentMethod
): Promise<{ movementId: string | null; error: string | null }> {
  const { data, error } = await supabase.rpc('register_cash_payment', {
    p_establishment: establishmentId,
    p_client: charge.client_id,
    p_charge: charge.id,
    p_kind: 'mensalidade',
    p_description: chargeDescription(charge),
    p_amount: charge.amount,
    p_method: method,
  })
  if (error) return { movementId: null, error: error.message }
  return { movementId: data as string, error: null }
}

/**
 * Cobranças de mensalidade do estabelecimento. Sem `month`, traz todas
 * (ordenadas do mês mais recente). O dono pode marcar como pago/pendente.
 */
export function useMembershipCharges(establishmentId?: string, month?: string) {
  const [charges, setCharges] = useState<MembershipCharge[]>([])
  const [loading, setLoading] = useState(true)

  const fetchCharges = useCallback(async () => {
    if (!establishmentId) { setLoading(false); return }
    setLoading(true)
    let q = supabase
      .from('membership_charges')
      .select('*, clients(name), services(name, price_mode)')
      .eq('establishment_id', establishmentId)
      .neq('status', 'cancelada')
      .order('reference_month', { ascending: false })
    if (month) q = q.eq('reference_month', `${month}-01`)
    const { data } = await q
    setCharges((data ?? []) as MembershipCharge[])
    setLoading(false)
  }, [establishmentId, month])

  useEffect(() => { void fetchCharges() }, [fetchCharges])

  const markPending = async (id: string) => {
    setCharges((prev) => prev.map((c) => (c.id === id ? { ...c, status: 'pendente', paid_at: null } : c)))
    await supabase.from('membership_charges').update({ status: 'pendente', paid_at: null }).eq('id', id)
  }

  const markPaid = async (id: string, method: PaymentMethod) => {
    if (!establishmentId) return { movementId: null, error: 'Sem estabelecimento' }
    const charge = charges.find((c) => c.id === id)
    if (!charge) return { movementId: null, error: 'Cobrança não encontrada' }
    const { movementId, error } = await registerChargePayment(establishmentId, charge, method)
    if (!error) {
      setCharges((prev) => prev.map((c) => (c.id === id ? { ...c, status: 'pago', paid_at: new Date().toISOString() } : c)))
    }
    return { movementId, error }
  }

  return { charges, loading, markPaid, markPending, refetch: fetchCharges }
}

export interface Membership {
  id: string
  service_id: string | null
  monthly_price: number
  start_month: string
  months: number | null
  status: 'ativa' | 'cancelada'
  services?: { name: string } | null
}

/**
 * Matrículas (turmas mensais) e mensalidades de um único aluno — usado no card
 * do cliente. Carrega só quando `clientId` é passado (card aberto).
 */
export function useClientFinance(establishmentId?: string, clientId?: string | null) {
  const [memberships, setMemberships] = useState<Membership[]>([])
  const [charges, setCharges] = useState<MembershipCharge[]>([])
  const [loading, setLoading] = useState(false)

  const fetchAll = useCallback(async () => {
    if (!establishmentId || !clientId) { setMemberships([]); setCharges([]); return }
    setLoading(true)
    const [{ data: ms }, { data: cs }] = await Promise.all([
      supabase
        .from('memberships')
        .select('id, service_id, monthly_price, start_month, months, status, services(name)')
        .eq('establishment_id', establishmentId)
        .eq('client_id', clientId)
        .order('created_at', { ascending: false }),
      supabase
        .from('membership_charges')
        .select('*, services(name)')
        .eq('establishment_id', establishmentId)
        .eq('client_id', clientId)
        .neq('status', 'cancelada')
        .order('reference_month', { ascending: false }),
    ])
    setMemberships((ms ?? []) as unknown as Membership[])
    setCharges((cs ?? []) as MembershipCharge[])
    setLoading(false)
  }, [establishmentId, clientId])

  useEffect(() => { void fetchAll() }, [fetchAll])

  const markPending = async (id: string) => {
    setCharges((prev) => prev.map((c) => (c.id === id ? { ...c, status: 'pendente', paid_at: null } : c)))
    await supabase.from('membership_charges').update({ status: 'pendente', paid_at: null }).eq('id', id)
  }

  const markPaid = async (id: string, method: PaymentMethod) => {
    if (!establishmentId) return { movementId: null, error: 'Sem estabelecimento' }
    const charge = charges.find((c) => c.id === id)
    if (!charge) return { movementId: null, error: 'Cobrança não encontrada' }
    const { movementId, error } = await registerChargePayment(establishmentId, charge, method)
    if (!error) {
      setCharges((prev) => prev.map((c) => (c.id === id ? { ...c, status: 'pago', paid_at: new Date().toISOString() } : c)))
    }
    return { movementId, error }
  }

  return { memberships, charges, loading, markPaid, markPending }
}
