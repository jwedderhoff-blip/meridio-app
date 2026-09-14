import { useCallback, useEffect, useState } from 'react'
import { supabase } from '../lib/supabase'

export type PostureAngle = 'frente' | 'costas' | 'lateral_esq' | 'lateral_dir'

export const POSTURE_ANGLE_LABELS: Record<PostureAngle, string> = {
  frente: 'Frente',
  costas: 'Costas',
  lateral_esq: 'Lateral esquerda',
  lateral_dir: 'Lateral direita',
}

const POSTURE_ANGLE_COLUMN: Record<PostureAngle, string> = {
  frente: 'photo_frente',
  costas: 'photo_costas',
  lateral_esq: 'photo_lateral_esq',
  lateral_dir: 'photo_lateral_dir',
}

const PHOTOS_BUCKET = 'anamnese-fotos'

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
  photo_frente: string | null
  photo_costas: string | null
  photo_lateral_esq: string | null
  photo_lateral_dir: string | null
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

  /** Apaga a ficha — libera o cliente para preencher do zero de novo. */
  const deleteForm = async (formId: string) => {
    const { error } = await supabase.from('health_forms').delete().eq('id', formId)
    if (error) return { error: error.message }
    await fetchForms()
    return { error: null }
  }

  /** Envia (ou substitui) a foto de um ângulo da avaliação postural. */
  const uploadPosturePhoto = async (formId: string, angle: PostureAngle, file: File) => {
    if (!establishmentId) return { error: 'Sem estabelecimento' }
    const ext = file.name.split('.').pop() ?? 'jpg'
    const path = `${establishmentId}/${formId}/${angle}-${Date.now()}.${ext}`

    const current = forms.find((f) => f.id === formId)
    const oldPath = current?.[POSTURE_ANGLE_COLUMN[angle] as keyof HealthFormRow] as string | null

    const { error: upErr } = await supabase.storage.from(PHOTOS_BUCKET).upload(path, file, { upsert: false })
    if (upErr) return { error: upErr.message }

    const { error: dbErr } = await supabase
      .from('health_forms')
      .update({ [POSTURE_ANGLE_COLUMN[angle]]: path })
      .eq('id', formId)
    if (dbErr) return { error: dbErr.message }

    if (oldPath) await supabase.storage.from(PHOTOS_BUCKET).remove([oldPath])

    await fetchForms()
    return { error: null }
  }

  /** Remove a foto de um ângulo. */
  const removePosturePhoto = async (formId: string, angle: PostureAngle) => {
    const current = forms.find((f) => f.id === formId)
    const path = current?.[POSTURE_ANGLE_COLUMN[angle] as keyof HealthFormRow] as string | null
    if (!path) return { error: null }

    const { error: dbErr } = await supabase
      .from('health_forms')
      .update({ [POSTURE_ANGLE_COLUMN[angle]]: null })
      .eq('id', formId)
    if (dbErr) return { error: dbErr.message }

    await supabase.storage.from(PHOTOS_BUCKET).remove([path])
    await fetchForms()
    return { error: null }
  }

  return {
    forms, loading, createLink, deleteForm,
    uploadPosturePhoto, removePosturePhoto,
    formByClient, refetch: fetchForms,
  }
}

/** URL assinada (temporária) para exibir uma foto do bucket privado. */
export async function getPosturePhotoUrl(path: string, expiresIn = 300) {
  const { data, error } = await supabase.storage.from(PHOTOS_BUCKET).createSignedUrl(path, expiresIn)
  if (error || !data) return null
  return data.signedUrl
}
