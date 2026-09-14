import { useEffect, useState } from 'react'
import { supabase } from '../lib/supabase'
import type { Segment } from '../lib/segments'

export interface Plan {
  id: string
  name: string
  description: string | null
  billing_type: 'monthly' | 'package' | 'por_agendamento'
  price_monthly: number
  price_package: number | null
  package_days: number | null
  max_services: number | null
  max_professionals: number | null
  max_appointments_per_month: number | null
  // Plano por agendamento: taxa cobrada a cada atendimento concluído
  booking_fee_type: 'fixo' | 'percentual' | null
  booking_fee_value: number | null
  booking_fee_charge_to: 'cliente' | 'estabelecimento' | null
  /** Linha a que o plano se aplica. Nulo = serve as duas linhas. */
  segment: Segment | null
  is_active: boolean
  created_at: string
}

export interface Subscription {
  id: string
  establishment_id: string
  plan_id: string | null
  status: 'trial' | 'active' | 'suspended' | 'cancelled'
  started_at: string
  expires_at: string | null
  created_at: string
  establishments?: { name: string; category: string; owner_id: string }
  plans?: { name: string; billing_type: string; package_days: number | null }
}

export interface SuperEstablishment {
  id: string
  name: string
  category: string
  status: string
  email: string | null
  phone: string | null
  slug: string
  address?: string | null
  segment?: Segment | null
  cash_beta_enabled?: boolean
  created_at: string
  subscriptions?: {
    status: string
    plans?: { name: string; max_services: number | null; max_professionals: number | null }
  }[]
  // Preenchidos pela função admin_establishment_counts (SECURITY DEFINER).
  // Ficam undefined se a função ainda não existir no banco — aí a tela mostra "—".
  prof_count?: number
  svc_count?: number
}

export interface BookingChargeRow {
  establishment_id: string
  establishment_name: string
  charges: number
  total: number
  charge_to: 'cliente' | 'estabelecimento' | null
}

/**
 * Resumo mensal das taxas por agendamento, por estabelecimento. Vem da função
 * admin_booking_charges_summary (SECURITY DEFINER, só admin). `month` é 'YYYY-MM'.
 */
export function useBookingChargesSummary(month: string) {
  const [rows, setRows] = useState<BookingChargeRow[]>([])
  const [loading, setLoading] = useState(true)
  const [missing, setMissing] = useState(false)

  useEffect(() => {
    let cancelled = false
    setLoading(true)
    setMissing(false)
    supabase
      .rpc('admin_booking_charges_summary', { p_month: `${month}-01` })
      .then(({ data, error }) => {
        if (cancelled) return
        if (error) {
          // Função ainda não criada no banco → sinaliza para a tela orientar.
          setMissing(true)
          setRows([])
        } else {
          setRows(
            ((data ?? []) as BookingChargeRow[]).map((r) => ({ ...r, charges: Number(r.charges), total: Number(r.total) })),
          )
        }
        setLoading(false)
      })
    return () => { cancelled = true }
  }, [month])

  return { rows, loading, missing }
}

export interface SuperProfessional {
  id: string
  establishment_id: string
  name: string
  avatar_url?: string | null
  services: string[]
}

/**
 * Uma escrita bloqueada por RLS não retorna erro — apenas afeta zero linhas.
 * Sem isto a tela fecha como se tivesse salvado e a alteração se perde.
 */
const BLOCKED =
  'Nenhuma linha alterada. Seu usuário provavelmente não tem permissão (RLS) para editar este registro.'

function writeResult<T>(error: { message: string } | null, rows: T[] | null) {
  if (error) return { error: error.message }
  if (!rows || rows.length === 0) return { error: BLOCKED }
  return { error: null }
}

export function usePlans() {
  const [plans, setPlans] = useState<Plan[]>([])
  const [loading, setLoading] = useState(true)

  const fetch = async () => {
    const { data } = await supabase
      .from('plans')
      .select('*')
      .order('created_at')
    if (data) setPlans(data as Plan[])
    setLoading(false)
  }

  useEffect(() => { fetch() }, [])

  const updatePlan = async (id: string, updates: Partial<Plan>) => {
    const { data, error } = await supabase.from('plans').update(updates).eq('id', id).select()
    const res = writeResult(error, data)
    if (!res.error) await fetch()
    return res
  }

  const createPlan = async (planData: Omit<Plan, 'id' | 'created_at'>) => {
    const { data, error } = await supabase.from('plans').insert(planData).select()
    const res = writeResult(error, data)
    if (!res.error) await fetch()
    return res
  }

  return { plans, loading, updatePlan, createPlan, refetch: fetch }
}

export function useAllEstablishments() {
  const [establishments, setEstablishments] = useState<SuperEstablishment[]>([])
  const [loading, setLoading] = useState(true)

  const fetch = async () => {
    const { data } = await supabase
      .from('establishments')
      .select('id, name, category, segment, status, email, phone, slug, address, cash_beta_enabled, created_at, subscriptions(status, plans(name, max_services, max_professionals))')
      .order('created_at', { ascending: false })

    // Contagens de profissionais/serviços por estabelecimento. A função
    // admin_establishment_counts roda como SECURITY DEFINER, então enxerga os
    // cadastros de todos os donos (o RLS bloquearia uma leitura direta). Se a
    // função ainda não existir no banco, seguimos sem as contagens.
    const { data: counts } = await supabase.rpc('admin_establishment_counts')
    const countMap = new Map<string, { professionals: number; services: number }>()
    for (const c of (counts ?? []) as { establishment_id: string; professionals: number; services: number }[]) {
      countMap.set(c.establishment_id, { professionals: Number(c.professionals), services: Number(c.services) })
    }

    if (data) {
      setEstablishments(
        (data as unknown as SuperEstablishment[]).map((e) => ({
          ...e,
          prof_count: countMap.get(e.id)?.professionals,
          svc_count: countMap.get(e.id)?.services,
        })),
      )
    }
    setLoading(false)
  }

  useEffect(() => { fetch() }, [])

  const updateStatus = async (id: string, status: string) => {
    const { data, error } = await supabase.from('establishments').update({ status }).eq('id', id).select()
    const res = writeResult(error, data)
    if (!res.error) await fetch()
    return res
  }

  const updateEstablishment = async (id: string, updates: Partial<Omit<SuperEstablishment, 'id' | 'created_at' | 'subscriptions'>>) => {
    const { data, error } = await supabase.from('establishments').update(updates).eq('id', id).select()
    const res = writeResult(error, data)
    if (!res.error) await fetch()
    return res
  }

  return { establishments, loading, updateStatus, updateEstablishment, refetch: fetch }
}

export function useAllSubscriptions() {
  const [subscriptions, setSubscriptions] = useState<Subscription[]>([])
  const [loading, setLoading] = useState(true)

  const fetch = async () => {
    const { data } = await supabase
      .from('subscriptions')
      .select('*, establishments(name, category), plans(name, billing_type, package_days)')
      .order('created_at', { ascending: false })
    if (data) setSubscriptions(data as Subscription[])
    setLoading(false)
  }

  useEffect(() => { fetch() }, [])

  const updateSubscription = async (id: string, updates: Partial<Subscription>) => {
    const { data, error } = await supabase.from('subscriptions').update(updates).eq('id', id).select()
    const res = writeResult(error, data)
    if (!res.error) await fetch()
    return res
  }

  return { subscriptions, loading, updateSubscription, refetch: fetch }
}

export function useProfessionalsForEstablishment(establishmentId: string | null) {
  const [professionals, setProfessionals] = useState<SuperProfessional[]>([])
  const [loading, setLoading] = useState(false)

  const fetch = async (id: string) => {
    setLoading(true)
    const { data } = await supabase
      .from('professionals')
      .select('id, establishment_id, name, avatar_url, services')
      .eq('establishment_id', id)
      .order('name')
    if (data) setProfessionals(data as SuperProfessional[])
    setLoading(false)
  }

  useEffect(() => {
    if (establishmentId) fetch(establishmentId)
    else setProfessionals([])
  }, [establishmentId])

  const addProfessional = async (establishmentId: string, name: string) => {
    const { data, error } = await supabase
      .from('professionals')
      .insert({ establishment_id: establishmentId, name, services: [] })
      .select()
    const res = writeResult(error, data)
    if (!res.error) await fetch(establishmentId)
    return res
  }

  const updateProfessional = async (id: string, establishmentId: string, name: string) => {
    const { data, error } = await supabase.from('professionals').update({ name }).eq('id', id).select()
    const res = writeResult(error, data)
    if (!res.error) await fetch(establishmentId)
    return res
  }

  const deleteProfessional = async (id: string, establishmentId: string) => {
    const { data, error } = await supabase.from('professionals').delete().eq('id', id).select()
    const res = writeResult(error, data)
    if (!res.error) await fetch(establishmentId)
    return res
  }

  return { professionals, loading, addProfessional, updateProfessional, deleteProfessional }
}
