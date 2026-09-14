import { useCallback, useEffect, useState } from 'react'
import { supabase } from '../lib/supabase'

export interface HealthFormRow {
  id: string
  client_id: string
  token: string
  status: 'pendente' | 'preenchida'
  parq_alert: boolean
  answers: Record<string, unknown> | null
  signature_name: string | null
  signed_at: string | null
  created_at: string
}

/** Fichas de anamnese do estabelecimento (dono e professores enxergam). */
export function useHealthForms(establishmentId?: string) {
  const [forms, setForms] = useState<HealthFormRow[]>([])
  const [loading, setLoading] = useState(true)

  const fetchForms = useCallback(async () => {
    if (!establishmentId) { setLoading(false); return }
    setLoading(true)
    const { data } = await supabase
      .from('health_forms')
      .select('*')
      .eq('establishment_id', establishmentId)
    setForms((data ?? []) as HealthFormRow[])
    setLoading(false)
  }, [establishmentId])

  useEffect(() => { void fetchForms() }, [fetchForms])

  /** Gera (ou reaproveita) o link de anamnese de um cliente. Devolve o token. */
  const createLink = async (clientId: string) => {
    if (!establishmentId) return { token: null, error: 'Sem estabelecimento' }
    const { data, error } = await supabase.rpc('create_health_form', {
      p_establishment: establishmentId,
      p_client: clientId,
    })
    if (error) return { token: null, error: error.message }
    await fetchForms()
    return { token: data as string, error: null }
  }

  const formByClient = (clientId: string) => forms.find((f) => f.client_id === clientId) ?? null

  return { forms, loading, createLink, formByClient, refetch: fetchForms }
}
