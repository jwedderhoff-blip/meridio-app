import { useEffect, useRef, useState } from 'react'
import { Camera, X, Loader2 } from 'lucide-react'
import { getPosturePhotoUrl, POSTURE_ANGLE_LABELS, type HealthFormRow, type PostureAngle } from '../../hooks/useHealthForms'

const ANGLES: PostureAngle[] = ['frente', 'costas', 'lateral_esq', 'lateral_dir']
const COLUMN: Record<PostureAngle, keyof HealthFormRow> = {
  frente: 'photo_frente',
  costas: 'photo_costas',
  lateral_esq: 'photo_lateral_esq',
  lateral_dir: 'photo_lateral_dir',
}

function Slot({
  angle,
  path,
  onUpload,
  onRemove,
}: {
  angle: PostureAngle
  path: string | null
  onUpload: (angle: PostureAngle, file: File) => Promise<void>
  onRemove: (angle: PostureAngle) => Promise<void>
}) {
  const inputRef = useRef<HTMLInputElement>(null)
  const [url, setUrl] = useState<string | null>(null)
  const [busy, setBusy] = useState(false)

  useEffect(() => {
    let cancelled = false
    if (!path) { setUrl(null); return }
    getPosturePhotoUrl(path).then((u) => { if (!cancelled) setUrl(u) })
    return () => { cancelled = true }
  }, [path])

  const handleFile = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    e.target.value = ''
    if (!file) return
    setBusy(true)
    await onUpload(angle, file)
    setBusy(false)
  }

  return (
    <div className="flex flex-col gap-1.5">
      <span className="text-xs font-medium text-gray-600">{POSTURE_ANGLE_LABELS[angle]}</span>
      <button
        type="button"
        onClick={() => !busy && inputRef.current?.click()}
        className="relative w-full aspect-[3/4] rounded-xl border border-dashed border-gray-300 bg-gray-50 overflow-hidden flex items-center justify-center hover:border-brand/50 transition"
      >
        {busy ? (
          <Loader2 size={20} className="text-gray-400 animate-spin" />
        ) : url ? (
          <img src={url} alt={POSTURE_ANGLE_LABELS[angle]} className="w-full h-full object-cover" />
        ) : (
          <Camera size={20} className="text-gray-300" />
        )}
      </button>
      {url && !busy && (
        <button
          type="button"
          onClick={() => onRemove(angle)}
          className="inline-flex items-center gap-1 text-[11px] text-red-500 hover:underline self-start"
        >
          <X size={11} /> Remover
        </button>
      )}
      <input ref={inputRef} type="file" accept="image/*" capture="environment" className="hidden" onChange={handleFile} />
    </div>
  )
}

export function PosturePhotos({
  form,
  onUpload,
  onRemove,
}: {
  form: HealthFormRow
  onUpload: (angle: PostureAngle, file: File) => Promise<{ error: string | null }>
  onRemove: (angle: PostureAngle) => Promise<{ error: string | null }>
}) {
  return (
    <div>
      <p className="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-2">
        Fotos — avaliação postural
      </p>
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        {ANGLES.map((angle) => (
          <Slot
            key={angle}
            angle={angle}
            path={form[COLUMN[angle]] as string | null}
            onUpload={async (a, f) => { await onUpload(a, f) }}
            onRemove={async (a) => { await onRemove(a) }}
          />
        ))}
      </div>
      <p className="text-[11px] text-gray-400 mt-2">
        Tiradas pelo profissional durante a entrevista. Armazenadas em local privado, visível só pelo painel.
      </p>
    </div>
  )
}
