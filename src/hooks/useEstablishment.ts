import { useEffect, useState } from 'react'
import { supabase } from '../lib/supabase'
import { isDemo } from '../lib/isDemo'
import { mockEstablishment } from '../lib/mockData'
import type { Establishment } from '../types'

const STORAGE_KEY = 'selectedEstablishmentId'

export function getSelectedEstablishmentId() {
  return localStorage.getItem(STORAGE_KEY)
}

export function setSelectedEstablishmentId(id: string) {
  localStorage.setItem(STORAGE_KEY, id)
}

// Modo "entrar no painel do cliente": o superadmin escolhe um estabelecimento
// em Super Admin → Estabelecimentos para ajudar a configurar. Fica numa chave
// separada da seleção normal do dono para não se misturar com ela.
const ADMIN_VIEW_KEY = 'adminViewEstablishmentId'

export function getAdminViewEstablishmentId() {
  return localStorage.getItem(ADMIN_VIEW_KEY)
}

export function setAdminViewEstablishmentId(id: string) {
  localStorage.setItem(ADMIN_VIEW_KEY, id)
}

export function clearAdminViewEstablishmentId() {
  localStorage.removeItem(ADMIN_VIEW_KEY)
}

export type EstablishmentRole = 'owner' | 'viewer' | 'admin'

export function useEstablishment(userId: string | undefined) {
  const [establishment, setEstablishment] = useState<Establishment | null>(null)
  const [role, setRole] = useState<EstablishmentRole>('owner')
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    if (isDemo) {
      setEstablishment(mockEstablishment)
      setRole('owner')
      setLoading(false)
      return
    }

    if (!userId) {
      setLoading(false)
      return
    }

    let cancelled = false
    setLoading(true)
    ;(async () => {
      const { data: { user } } = await supabase.auth.getUser()
      const email = user?.email?.toLowerCase()

      // 1) Estabelecimentos que o usuário é dono
      const owned = await supabase
        .from('establishments')
        .select('*')
        .eq('owner_id', userId)
        .order('created_at', { ascending: false })

      let list: { est: Establishment; role: EstablishmentRole }[] =
        (owned.data ?? []).map((e) => ({ est: e as Establishment, role: 'owner' as const }))

      // 2) Se não é dono de nenhum, procura acessos de visualizador pelo e-mail
      if (list.length === 0 && email) {
        const mem = await supabase
          .from('establishment_members')
          .select('establishment_id')
          .eq('email', email)
        const ids = (mem.data ?? []).map((m: { establishment_id: string }) => m.establishment_id)
        if (ids.length > 0) {
          const ests = await supabase.from('establishments').select('*').in('id', ids)
          list = (ests.data ?? []).map((e) => ({ est: e as Establishment, role: 'viewer' as const }))
        }
      }

      // 3) Ainda nada? O superadmin pode ter entrado no painel de um cliente
      // para ajudar a configurar (Super Admin → Estabelecimentos → Entrar no
      // painel). Vale só para quem realmente é admin — a policy admin_all
      // no banco é quem garante isso; aqui só evitamos a consulta à toa.
      const adminViewId = list.length === 0 ? getAdminViewEstablishmentId() : null
      if (adminViewId) {
        const est = await supabase.from('establishments').select('*').eq('id', adminViewId).maybeSingle()
        if (est.data) {
          list = [{ est: est.data as Establishment, role: 'admin' as const }]
        } else {
          // Não é mais admin, ou o estabelecimento sumiu — limpa para não travar no login normal.
          clearAdminViewEstablishmentId()
        }
      }

      if (cancelled) return
      if (owned.error) setError(owned.error.message)
      if (list.length > 0) {
        const savedId = getSelectedEstablishmentId()
        const selected = list.find((x) => x.est.id === savedId) ?? list[0]
        setEstablishment(selected.est)
        setRole(selected.role)
      }
      setLoading(false)
    })()

    return () => { cancelled = true }
  }, [userId])

  const switchEstablishment = (id: string) => {
    setSelectedEstablishmentId(id)
    // força re-fetch no próximo render via window reload simples
    window.location.reload()
  }

  const updateEstablishment = async (updates: Partial<Establishment>) => {
    if (isDemo) {
      setEstablishment((prev) => (prev ? { ...prev, ...updates } : prev))
      return { error: null }
    }
    if (!establishment) return { error: 'Sem estabelecimento' }
    const { data, error } = await supabase
      .from('establishments')
      .update(updates)
      .eq('id', establishment.id)
      .select()
      .single()
    if (!error && data) setEstablishment(data as Establishment)
    return { error: error?.message ?? null }
  }

  return { establishment, role, loading, error, updateEstablishment, switchEstablishment }
}

export function useEstablishmentBySlug(slug: string | undefined) {
  const [establishment, setEstablishment] = useState<Establishment | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    if (isDemo) {
      setEstablishment(mockEstablishment)
      setLoading(false)
      return
    }

    if (!slug) {
      setLoading(false)
      return
    }

    setLoading(true)
    supabase
      .from('establishments')
      .select('*')
      .eq('slug', slug)
      .single()
      .then(({ data, error }) => {
        if (error) setError(error.message)
        else setEstablishment(data as Establishment)
        setLoading(false)
      })
  }, [slug])

  return { establishment, loading, error }
}
