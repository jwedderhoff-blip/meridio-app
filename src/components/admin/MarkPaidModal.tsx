import { useState } from 'react'
import { Receipt } from 'lucide-react'
import { Button } from '../ui/Button'
import { Modal } from '../ui/Modal'
import { formatCurrency } from '../../lib/utils'
import { METHOD_LABELS, type PaymentMethod } from '../../hooks/useCaixa'

interface MarkPaidModalProps {
  open: boolean
  onClose: () => void
  description: string
  amount: number
  onConfirm: (method: PaymentMethod, emitReceipt: boolean) => Promise<void>
}

/**
 * Confirmação usada sempre que uma mensalidade ou serviço avulso é marcado
 * como pago (Financeiro, Clientes, Agenda) — pede a forma de pagamento e
 * pergunta se quer emitir o recibo na hora, já com valor e descrição prontos.
 */
export default function MarkPaidModal({ open, onClose, description, amount, onConfirm }: MarkPaidModalProps) {
  const [method, setMethod] = useState<PaymentMethod>('dinheiro')
  const [emitReceipt, setEmitReceipt] = useState(true)
  const [saving, setSaving] = useState(false)

  const submit = async () => {
    setSaving(true)
    await onConfirm(method, emitReceipt)
    setSaving(false)
  }

  return (
    <Modal open={open} onClose={onClose} title="Confirmar pagamento">
      <div className="space-y-4">
        <div className="bg-gray-50 rounded-xl px-4 py-3">
          <p className="text-sm text-gray-600">{description}</p>
          <p className="font-display text-2xl text-ink mt-1">{formatCurrency(amount)}</p>
        </div>

        <div className="flex flex-col gap-1">
          <label className="text-xs font-semibold text-gray-500 uppercase tracking-wide">Forma de pagamento</label>
          <select
            value={method}
            onChange={(e) => setMethod(e.target.value as PaymentMethod)}
            className="rounded-xl border border-gray-200 text-sm px-3 py-2 bg-white focus:outline-none focus:ring-2 focus:ring-brand/20 focus:border-brand w-full"
          >
            {(Object.keys(METHOD_LABELS) as PaymentMethod[]).map((m) => (
              <option key={m} value={m}>{METHOD_LABELS[m]}</option>
            ))}
          </select>
        </div>

        <label className="flex items-center gap-2 text-sm text-gray-700">
          <input
            type="checkbox"
            checked={emitReceipt}
            onChange={(e) => setEmitReceipt(e.target.checked)}
            className="rounded border-gray-300 text-brand focus:ring-brand/30"
          />
          Emitir recibo agora
        </label>

        <div className="flex gap-2 pt-1">
          <Button variant="ghost" onClick={onClose} className="flex-1">Cancelar</Button>
          <Button onClick={submit} loading={saving} className="flex-1 bg-green-600 hover:bg-green-700">
            <Receipt size={15} /> Confirmar pagamento
          </Button>
        </div>
      </div>
    </Modal>
  )
}
