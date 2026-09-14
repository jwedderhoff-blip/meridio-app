import { useEffect, useMemo, useState } from 'react'
import { Link } from 'react-router-dom'
import { format } from 'date-fns'
import { ptBR } from 'date-fns/locale'
import { Wallet, CheckCircle2, Receipt, UserPlus } from 'lucide-react'
import { useAuth } from '../../context/AuthContext'
import { useEstablishment } from '../../hooks/useEstablishment'
import { useClients } from '../../hooks/useClients'
import { useServices } from '../../hooks/useServices'
import {
  useCaixa,
  useOpenCharges,
  METHOD_LABELS,
  KIND_LABELS,
  type CashKind,
  type PaymentMethod,
} from '../../hooks/useCaixa'
import { Button } from '../../components/ui/Button'
import { formatCurrency } from '../../lib/utils'
import NewClientModal from '../../components/admin/NewClientModal'

const inputCls =
  'rounded-xl border border-gray-200 text-sm px-3 py-2 bg-white focus:outline-none focus:ring-2 focus:ring-brand/20 focus:border-brand w-full'

export default function Caixa() {
  const { user } = useAuth()
  const { establishment } = useEstablishment(user?.id)
  const [day, setDay] = useState(() => new Date().toISOString().slice(0, 10))
  const { movements, total, loading, registerPayment } = useCaixa(establishment?.id, day)
  const { clients, createClient, refetch: refetchClients } = useClients(establishment?.id)
  const { services } = useServices(establishment?.id)
  const [newClientOpen, setNewClientOpen] = useState(false)

  const [kind, setKind] = useState<CashKind>('mensalidade')
  const [clientId, setClientId] = useState<string>('')
  const [chargeId, setChargeId] = useState<string>('')
  const [serviceId, setServiceId] = useState<string>('')
  const [amount, setAmount] = useState<string>('')
  const [method, setMethod] = useState<PaymentMethod>('dinheiro')
  const [description, setDescription] = useState<string>('')
  const [saving, setSaving] = useState(false)
  const [feedback, setFeedback] = useState<{ type: 'ok' | 'err'; text: string } | null>(null)

  const openCharges = useOpenCharges(establishment?.id, kind === 'mensalidade' ? clientId || null : null)

  const refFmt = (iso: string) => {
    const [y, mo] = iso.split('-')
    return `${['jan','fev','mar','abr','mai','jun','jul','ago','set','out','nov','dez'][Number(mo) - 1]}/${y.slice(2)}`
  }

  // Auto-preenche o valor conforme a seleção
  useEffect(() => {
    if (kind === 'mensalidade' && chargeId) {
      const c = openCharges.find((x) => x.id === chargeId)
      if (c) setAmount(String(Number(c.amount)))
    }
  }, [chargeId, openCharges, kind])

  useEffect(() => {
    if (kind === 'servico' && serviceId) {
      const s = services.find((x) => x.id === serviceId)
      if (s) setAmount(String(Number(s.price)))
    }
  }, [serviceId, services, kind])

  const resetForm = () => {
    setClientId(''); setChargeId(''); setServiceId(''); setAmount(''); setDescription('')
  }

  const clientName = useMemo(
    () => clients.find((c) => c.id === clientId)?.name,
    [clients, clientId]
  )

  const canSubmit = Number(amount) > 0 &&
    (kind !== 'mensalidade' || !!chargeId) &&
    (kind !== 'servico' || !!serviceId)

  const submit = async () => {
    setSaving(true)
    setFeedback(null)
    const svc = services.find((x) => x.id === serviceId)
    const autoDesc =
      kind === 'mensalidade'
        ? `Mensalidade ${chargeId ? refFmt(openCharges.find((x) => x.id === chargeId)?.reference_month ?? '') : ''}`.trim()
        : kind === 'servico'
        ? svc?.name ?? 'Serviço'
        : description || 'Recebimento avulso'

    const { error } = await registerPayment({
      clientId: clientId || null,
      chargeId: kind === 'mensalidade' ? chargeId : null,
      kind,
      amount: Number(amount),
      method,
      description: description || autoDesc,
    })
    setSaving(false)
    if (error) {
      setFeedback({ type: 'err', text: error })
      return
    }
    setFeedback({
      type: 'ok',
      text:
        kind === 'mensalidade'
          ? `Recebimento registrado e mensalidade baixada${clientName ? ` — ${clientName}` : ''}.`
          : 'Recebimento registrado.',
    })
    resetForm()
  }

  return (
    <div>
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 mb-6">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-brand flex items-center justify-center">
            <Wallet size={20} className="text-white" />
          </div>
          <div>
            <h1 className="font-display text-3xl tracking-tight text-ink">Frente de caixa</h1>
            <p className="text-xs text-gray-400">Registre recebimentos de mensalidades e serviços</p>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-5 gap-6">
        {/* Formulário de recebimento */}
        <div className="lg:col-span-2 bg-white rounded-2xl border border-gray-100 p-5 space-y-4 h-fit">
          <h2 className="font-semibold text-gray-900 text-sm">Novo recebimento</h2>

          <div className="flex flex-col gap-1">
            <label className="text-xs font-semibold text-gray-500 uppercase tracking-wide">Tipo</label>
            <div className="grid grid-cols-3 gap-2">
              {(['mensalidade', 'servico', 'avulso'] as CashKind[]).map((k) => (
                <button
                  key={k}
                  onClick={() => { setKind(k); setChargeId(''); setServiceId('') }}
                  className={
                    'text-xs font-medium rounded-xl py-2 border transition ' +
                    (kind === k
                      ? 'bg-brand text-white border-brand'
                      : 'bg-white text-gray-600 border-gray-200 hover:bg-gray-50')
                  }
                >
                  {KIND_LABELS[k]}
                </button>
              ))}
            </div>
          </div>

          {/* Cliente (obrigatório na mensalidade, opcional nos demais) */}
          <div className="flex flex-col gap-1">
            <div className="flex items-center justify-between">
              <label className="text-xs font-semibold text-gray-500 uppercase tracking-wide">
                Cliente {kind === 'mensalidade' ? '' : '(opcional)'}
              </label>
              <button
                type="button"
                onClick={() => setNewClientOpen(true)}
                className="inline-flex items-center gap-1 text-xs font-medium text-brand hover:underline"
              >
                <UserPlus size={13} /> Cadastrar
              </button>
            </div>
            <select value={clientId} onChange={(e) => { setClientId(e.target.value); setChargeId('') }} className={inputCls}>
              <option value="">Selecione…</option>
              {clients.map((c) => (
                <option key={c.id} value={c.id}>{c.name}</option>
              ))}
            </select>
          </div>

          {/* Mensalidade em aberto */}
          {kind === 'mensalidade' && (
            <div className="flex flex-col gap-1">
              <label className="text-xs font-semibold text-gray-500 uppercase tracking-wide">Mensalidade em aberto</label>
              {!clientId ? (
                <p className="text-xs text-gray-400">Selecione um cliente para ver as mensalidades em aberto.</p>
              ) : openCharges.length === 0 ? (
                <p className="text-xs text-gray-400">Nenhuma mensalidade em aberto para este cliente.</p>
              ) : (
                <select value={chargeId} onChange={(e) => setChargeId(e.target.value)} className={inputCls}>
                  <option value="">Selecione…</option>
                  {openCharges.map((c) => (
                    <option key={c.id} value={c.id}>
                      {refFmt(c.reference_month)} — {c.services?.name ?? 'Turma'} — {formatCurrency(Number(c.amount))}
                    </option>
                  ))}
                </select>
              )}
            </div>
          )}

          {/* Serviço */}
          {kind === 'servico' && (
            <div className="flex flex-col gap-1">
              <label className="text-xs font-semibold text-gray-500 uppercase tracking-wide">Serviço</label>
              <select value={serviceId} onChange={(e) => setServiceId(e.target.value)} className={inputCls}>
                <option value="">Selecione…</option>
                {services.map((s) => (
                  <option key={s.id} value={s.id}>{s.name} — {formatCurrency(s.price)}</option>
                ))}
              </select>
            </div>
          )}

          <div className="grid grid-cols-2 gap-3">
            <div className="flex flex-col gap-1">
              <label className="text-xs font-semibold text-gray-500 uppercase tracking-wide">Valor (R$)</label>
              <input
                type="number" min="0" step="0.01" value={amount}
                onChange={(e) => setAmount(e.target.value)}
                placeholder="0,00" className={inputCls}
              />
            </div>
            <div className="flex flex-col gap-1">
              <label className="text-xs font-semibold text-gray-500 uppercase tracking-wide">Forma</label>
              <select value={method} onChange={(e) => setMethod(e.target.value as PaymentMethod)} className={inputCls}>
                {(Object.keys(METHOD_LABELS) as PaymentMethod[]).map((m) => (
                  <option key={m} value={m}>{METHOD_LABELS[m]}</option>
                ))}
              </select>
            </div>
          </div>

          <div className="flex flex-col gap-1">
            <label className="text-xs font-semibold text-gray-500 uppercase tracking-wide">Observação (opcional)</label>
            <input value={description} onChange={(e) => setDescription(e.target.value)} placeholder="Ex.: pagamento em 2x" className={inputCls} />
          </div>

          {feedback && (
            <div className={
              'rounded-xl px-4 py-3 text-sm ' +
              (feedback.type === 'ok'
                ? 'bg-green-50 border border-green-200 text-green-700'
                : 'bg-red-50 border border-red-200 text-red-700')
            }>
              {feedback.text}
            </div>
          )}

          <Button onClick={submit} loading={saving} disabled={!canSubmit} className="w-full">
            <CheckCircle2 size={16} />
            Registrar recebimento
          </Button>
        </div>

        {/* Movimentações do dia */}
        <div className="lg:col-span-3 bg-white rounded-2xl border border-gray-100 overflow-hidden">
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 px-5 py-4 border-b border-gray-100">
            <div className="flex items-center gap-2">
              <Receipt size={16} className="text-gray-400" />
              <h2 className="font-semibold text-gray-900 text-sm">Movimentações</h2>
            </div>
            <div className="flex items-center gap-3">
              <input type="date" value={day} onChange={(e) => setDay(e.target.value)}
                className="rounded-lg border border-gray-200 text-sm px-3 py-1.5" />
              <span className="text-sm text-gray-500">
                Total: <strong className="text-brand-dark">{formatCurrency(total)}</strong>
              </span>
            </div>
          </div>

          {loading ? (
            <div className="p-10 text-center text-gray-400 text-sm">Carregando…</div>
          ) : movements.length === 0 ? (
            <div className="p-10 text-center text-gray-400 text-sm">Nenhum recebimento neste dia.</div>
          ) : (
            <ul className="divide-y divide-gray-50">
              {movements.map((m) => (
                <li key={m.id} className="flex items-center justify-between gap-4 px-5 py-3">
                  <div className="min-w-0">
                    <p className="text-sm font-medium text-gray-900 truncate">
                      {m.clients?.name ?? m.description ?? KIND_LABELS[m.kind]}
                    </p>
                    <p className="text-xs text-gray-400">
                      {format(new Date(m.created_at), "HH:mm", { locale: ptBR })} · {KIND_LABELS[m.kind]} · {METHOD_LABELS[m.method]}
                      {m.operator_email ? ` · ${m.operator_email}` : ''}
                    </p>
                  </div>
                  <div className="flex items-center gap-3 shrink-0">
                    <span className="text-sm font-semibold text-green-700">
                      {formatCurrency(Number(m.amount))}
                    </span>
                    <Link
                      to={`/admin/caixa/${m.id}/recibo`}
                      target="_blank"
                      rel="noreferrer"
                      title="Gerar recibo"
                      className="p-1.5 rounded-lg text-gray-400 hover:text-brand hover:bg-brand-soft transition"
                    >
                      <Receipt size={15} />
                    </Link>
                  </div>
                </li>
              ))}
            </ul>
          )}
        </div>
      </div>

      <NewClientModal
        open={newClientOpen}
        onClose={() => setNewClientOpen(false)}
        establishmentId={establishment?.id}
        createClient={createClient}
        onCreated={(c) => { void refetchClients(); setClientId(c.id) }}
      />
    </div>
  )
}
