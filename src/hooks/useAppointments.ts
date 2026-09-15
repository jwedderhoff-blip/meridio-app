import { useCallback, useEffect, useState } from 'react'
import { supabase } from '../lib/supabase'
import { isDemo } from '../lib/isDemo'
import { mockAppointments } from '../lib/mockData'
import type { Appointment } from '../types'
import type { PaymentMethod } from './useCaixa'

export function useAppointments(establishmentId: string | undefined, date?: string) {
  const [appointments, setAppointments] = useState<Appointment[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  const fetchAppointments = useCallback(async () => {
    if (isDemo) {
      let filtered = mockAppointments
      if (date) {
        filtered = mockAppointments.filter((a) => a.starts_at.startsWith(date))
      }
      setAppointments(filtered)
      setLoading(false)
      return
    }

    if (!establishmentId) {
      setLoading(false)
      return
    }
    setLoading(true)
    let query = supabase
      .from('appointments')
      .select('*, client:clients(*), service:services(*), professional:professionals(id,name)')
      .eq('establishment_id', establishmentId)

    if (date) {
      const start = `${date}T00:00:00`
      const end = `${date}T23:59:59`
      query = query.gte('starts_at', start).lte('starts_at', end)
    }

    const { data, error } = await query.order('starts_at')
    if (error) setError(error.message)
    else setAppointments((data ?? []) as Appointment[])
    setLoading(false)
  }, [establishmentId, date])

  useEffect(() => {
    void fetchAppointments()
  }, [fetchAppointments])

  const createAppointment = async (payload: {
    establishment_id: string
    client_id: string
    professional_id?: string
    service_id: string
    starts_at: string
    ends_at: string
    recurring_group_id?: string
    max_spots?: number
  }) => {
    if (isDemo) {
      const newApt: Appointment = {
        ...payload,
        id: crypto.randomUUID(),
        status: 'pendente',
        payment_status: 'pendente',
        created_at: new Date().toISOString(),
      }
      setAppointments((prev) => [...prev, newApt])
      return { appointment: newApt, error: null }
    }

    // Verifica disponibilidade imediatamente antes de inserir para evitar dupla reserva
    const startsDate = payload.starts_at.slice(0, 10)
    const { data: busySlots } = await supabase.rpc('get_busy_slots', {
      p_establishment_id: payload.establishment_id,
      p_date: startsDate,
      p_professional_id: payload.professional_id ?? null,
      p_service_id: payload.service_id,
    }) as { data: { starts_at: string; ends_at: string }[] | null }

    const maxSpots = payload.max_spots ?? 1
    const startsMs = new Date(payload.starts_at).getTime()
    const endsMs   = new Date(payload.ends_at).getTime()

    const overlapping = (busySlots ?? []).filter((s) => {
      const sStart = new Date(s.starts_at).getTime()
      const sEnd   = new Date(s.ends_at).getTime()
      return startsMs < sEnd && endsMs > sStart
    })

    if (overlapping.length >= maxSpots) {
      return { appointment: null, error: 'Horário indisponível: todas as vagas já foram preenchidas.' }
    }

    const { max_spots: _ms, ...insertPayload } = payload
    const { data, error } = await supabase
      .from('appointments')
      .insert({ ...insertPayload, status: 'pendente', payment_status: 'pendente' })
      .select()
      .single()
    if (!error && data) setAppointments((prev) => [...prev, data as Appointment])
    return { appointment: data as Appointment | null, error: error?.message ?? null }
  }

  const createRecurringAppointments = async (
    base: {
      establishment_id: string
      client_id: string
      professional_id?: string
      service_id: string
    },
    occurrences: { starts_at: string; ends_at: string }[],
  ) => {
    const groupId = crypto.randomUUID()
    if (isDemo) {
      const newApts: Appointment[] = occurrences.map((o) => ({
        ...base,
        ...o,
        id: crypto.randomUUID(),
        recurring_group_id: groupId,
        status: 'pendente' as const,
        payment_status: 'pendente' as const,
        created_at: new Date().toISOString(),
      }))
      setAppointments((prev) => [...prev, ...newApts])
      return { appointments: newApts, error: null }
    }

    const rows = occurrences.map((o) => ({
      ...base,
      ...o,
      recurring_group_id: groupId,
      status: 'pendente' as const,
      payment_status: 'pendente' as const,
    }))
    const { data, error } = await supabase.from('appointments').insert(rows).select()
    if (!error && data) setAppointments((prev) => [...prev, ...(data as Appointment[])])
    return { appointments: (data ?? []) as Appointment[], error: error?.message ?? null }
  }

  const cancelFutureInGroup = async (recurringGroupId: string) => {
    const now = new Date().toISOString()
    if (isDemo) {
      setAppointments((prev) =>
        prev.map((a) =>
          a.recurring_group_id === recurringGroupId && a.starts_at >= now
            ? { ...a, status: 'cancelado' as const }
            : a,
        ),
      )
      return { error: null }
    }
    const { error } = await supabase
      .from('appointments')
      .update({ status: 'cancelado' })
      .eq('recurring_group_id', recurringGroupId)
      .gte('starts_at', now)
    if (!error) {
      setAppointments((prev) =>
        prev.map((a) =>
          a.recurring_group_id === recurringGroupId && a.starts_at >= now
            ? { ...a, status: 'cancelado' as const }
            : a,
        ),
      )
    }
    return { error: error?.message ?? null }
  }

  const updateStatus = async (id: string, status: Appointment['status']) => {
    if (isDemo) {
      setAppointments((prev) => prev.map((a) => (a.id === id ? { ...a, status } : a)))
      return { error: null }
    }
    const { error } = await supabase.from('appointments').update({ status }).eq('id', id)
    if (!error) {
      setAppointments((prev) => prev.map((a) => (a.id === id ? { ...a, status } : a)))
    }
    return { error: error?.message ?? null }
  }

  const updatePaymentStatus = async (
    id: string,
    payment_status: Appointment['payment_status'],
    method?: PaymentMethod
  ) => {
    if (isDemo) {
      setAppointments((prev) => prev.map((a) => (a.id === id ? { ...a, payment_status } : a)))
      return { error: null, movementId: null }
    }
    const { error } = await supabase.from('appointments').update({ payment_status }).eq('id', id)
    if (error) return { error: error.message, movementId: null }
    setAppointments((prev) => prev.map((a) => (a.id === id ? { ...a, payment_status } : a)))

    // Ao marcar como pago, também registra o recebimento no caixa — fica
    // no histórico de movimentações e permite emitir o recibo na hora.
    let movementId: string | null = null
    if (payment_status === 'pago' && establishmentId) {
      const appt = appointments.find((a) => a.id === id)
      const svc = appt?.service as { name?: string; price?: number } | undefined
      const { data, error: rpcError } = await supabase.rpc('register_cash_payment', {
        p_establishment: establishmentId,
        p_client: appt?.client_id ?? null,
        p_charge: null,
        p_kind: 'servico',
        p_description: svc?.name ?? 'Serviço',
        p_amount: svc?.price ?? 0,
        p_method: method ?? 'dinheiro',
      })
      if (!rpcError) movementId = data as string
    }
    return { error: null, movementId }
  }

  const deleteAppointment = async (id: string) => {
    if (isDemo) {
      setAppointments((prev) => prev.filter((a) => a.id !== id))
      return { error: null }
    }
    const { error } = await supabase.from('appointments').delete().eq('id', id)
    if (!error) setAppointments((prev) => prev.filter((a) => a.id !== id))
    return { error: error?.message ?? null }
  }

  return { appointments, loading, error, refetch: fetchAppointments, createAppointment, createRecurringAppointments, cancelFutureInGroup, updateStatus, updatePaymentStatus, deleteAppointment }
}
