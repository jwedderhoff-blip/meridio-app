import { useEffect, useState } from 'react'
import { Save } from 'lucide-react'
import { Modal } from '../../components/ui/Modal'
import { Button } from '../../components/ui/Button'
import { Input } from '../../components/ui/Input'
import type { Client } from '../../types'

type UpdateClient = (
  id: string,
  updates: Partial<Omit<Client, 'id' | 'establishment_id' | 'created_at'>>
) => Promise<{ client: Client | null; error: string | null }>

export default function EditClientModal({
  open,
  onClose,
  client,
  updateClient,
}: {
  open: boolean
  onClose: () => void
  client: Client | null
  updateClient: UpdateClient
}) {
  const [name, setName] = useState('')
  const [phone, setPhone] = useState('')
  const [email, setEmail] = useState('')
  const [notes, setNotes] = useState('')
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    if (client) {
      setName(client.name)
      setPhone(client.phone)
      setEmail(client.email ?? '')
      setNotes(client.notes ?? '')
      setError(null)
    }
  }, [client])

  const submit = async () => {
    if (!client) return
    if (!name.trim() || !phone.trim()) {
      setError('Nome e telefone são obrigatórios.')
      return
    }
    setSaving(true)
    setError(null)
    const { error } = await updateClient(client.id, {
      name: name.trim(),
      phone: phone.trim(),
      email: email.trim() || undefined,
      notes: notes.trim() || undefined,
    })
    setSaving(false)
    if (error) { setError(error); return }
    onClose()
  }

  return (
    <Modal open={open} onClose={onClose} title="Editar cliente">
      <div className="space-y-4">
        <Input label="Nome" placeholder="Nome completo" value={name} onChange={(e) => setName(e.target.value)} />
        <Input label="WhatsApp / Telefone" placeholder="(47) 99999-0000" value={phone} onChange={(e) => setPhone(e.target.value)} />
        <Input label="E-mail (opcional)" type="email" placeholder="email@exemplo.com" value={email} onChange={(e) => setEmail(e.target.value)} />
        <div className="flex flex-col gap-1">
          <label className="text-sm font-medium text-gray-700">Observações (opcional)</label>
          <textarea
            rows={3}
            value={notes}
            onChange={(e) => setNotes(e.target.value)}
            className="w-full rounded-xl border border-gray-200 px-3 py-2.5 text-sm text-gray-900 placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-400 resize-none"
          />
        </div>

        {error && (
          <div className="rounded-xl bg-red-50 border border-red-200 px-4 py-3 text-sm text-red-700">{error}</div>
        )}

        <div className="flex gap-3 pt-1">
          <Button variant="ghost" type="button" className="flex-1" onClick={onClose}>
            Cancelar
          </Button>
          <Button type="button" className="flex-1" loading={saving} onClick={submit}>
            <Save size={16} />
            Salvar
          </Button>
        </div>
      </div>
    </Modal>
  )
}
