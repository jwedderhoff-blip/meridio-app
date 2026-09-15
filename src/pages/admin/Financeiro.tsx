import { useMemo, useState } from 'react'
import { CalendarClock, TrendingUp, Clock3, Wallet, Check, RotateCcw } from 'lucide-react'
import { useAuth } from '../../context/AuthContext'
import { useEstablishment } from '../../hooks/useEstablishment'
import { useMembershipCharges, type MembershipCharge } from '../../hooks/useMemberships'
import { useAppointments } from '../../hooks/useAppointments'
import { formatCurrency } from '../../lib/utils'
import MarkPaidModal from '../../components/admin/MarkPaidModal'
import type { PaymentMethod } from '../../hooks/useCaixa'
import type { Appointment } from '../../types'

function currentMonth(): string {
  const d = new Date()
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`
}

const MONTH_LABEL = ['jan', 'fev', 'mar', 'abr', 'mai', 'jun', 'jul', 'ago', 'set', 'out', 'nov', 'dez']
function refLabel(iso: string): string {
  const [y, m] = iso.split('-')
  return `${MONTH_LABEL[Number(m) - 1]}/${y.slice(2)}`
}

function StatTile({ label, value, icon, tone }: { label: string; value: string; icon: React.ReactNode; tone: string }) {
  return (
    <div className="bg-white rounded-2xl border border-gray-100 p-5">
      <div className="flex items-center gap-2 text-gray-400 text-xs font-medium mb-1">
        <span className={`w-6 h-6 rounded-lg flex items-center justify-center ${tone}`}>{icon}</span>
        {label}
      </div>
      <p className="font-display text-2xl tracking-tight text-ink">{value}</p>
    </div>
  )
}

export default function Financeiro() {
  const { user } = useAuth()
  const { establishment } = useEstablishment(user?.id)
  const [month, setMonth] = useState(currentMonth())

  const { charges, loading, markPaid, markPending } = useMembershipCharges(establishment?.id, month)
  const { appointments } = useAppointments(establishment?.id)
  const [payingCharge, setPayingCharge] = useState<MembershipCharge | null>(null)

  const confirmPayment = async (method: PaymentMethod, emitReceipt: boolean) => {
    if (!payingCharge) return
    const { movementId, error } = await markPaid(payingCharge.id, method)
    setPayingCharge(null)
    if (!error && emitReceipt && movementId) {
      window.open(`/admin/caixa/${movementId}/recibo`, '_blank', 'noopener')
    }
  }

  // Mensalidades do mês
  const mensalPagas = charges.filter((c) => c.status === 'pago')
  const mensalPend = charges.filter((c) => c.status === 'pendente')
  const recebidoMensal = mensalPagas.reduce((s, c) => s + Number(c.amount), 0)
  const aReceber = mensalPend.reduce((s, c) => s + Number(c.amount), 0)

  // Avulsos pagos no mês (exclui serviços mensais, que entram como mensalidade)
  const avulsosRecebido = useMemo(() => {
    return appointments
      .filter((a: Appointment) => {
        const svc = a.service as { price?: number; price_mode?: string } | undefined
        return (
          a.payment_status === 'pago' &&
          svc?.price_mode !== 'mensal' &&
          a.starts_at?.slice(0, 7) === month
        )
      })
      .reduce((s, a) => s + ((a.service as { price?: number })?.price ?? 0), 0)
  }, [appointments, month])

  const recebidoTotal = recebidoMensal + avulsosRecebido

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <h1 className="font-display text-3xl tracking-tight text-ink">Financeiro</h1>
          <p className="text-sm text-gray-500 mt-1">Pagamentos e fluxo do mês — mensalidades e atendimentos avulsos.</p>
        </div>
        <label className="flex items-center gap-2 text-sm text-gray-600">
          <CalendarClock size={16} className="text-gray-400 shrink-0" />
          <input
            type="month"
            value={month}
            onChange={(e) => setMonth(e.target.value || currentMonth())}
            className="text-sm border border-gray-200 rounded-xl px-3 py-2 focus:outline-none focus:ring-2 focus:ring-indigo-500/20"
          />
        </label>
      </div>

      {/* KPIs */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <StatTile label="Recebido no mês" value={formatCurrency(recebidoTotal)} icon={<Wallet size={13} className="text-emerald-600" />} tone="bg-emerald-50" />
        <StatTile label="A receber (mensalidades)" value={formatCurrency(aReceber)} icon={<Clock3 size={13} className="text-amber-600" />} tone="bg-amber-50" />
        <StatTile label="Mensalidades pagas" value={String(mensalPagas.length)} icon={<Check size={13} className="text-green-600" />} tone="bg-green-50" />
        <StatTile label="Avulsos recebidos" value={formatCurrency(avulsosRecebido)} icon={<TrendingUp size={13} className="text-brand" />} tone="bg-brand-soft" />
      </div>

      {/* Mensalidades */}
      <div className="bg-white rounded-2xl border border-gray-100 overflow-hidden">
        <div className="px-5 py-4 border-b border-gray-100">
          <h2 className="font-semibold text-gray-900 text-sm">Mensalidades do mês</h2>
          <p className="text-xs text-gray-400 mt-0.5">Marque como pago quando receber. O pagamento por gateway entra numa próxima etapa.</p>
        </div>

        {loading ? (
          <div className="p-10 text-center text-gray-400 text-sm">Carregando…</div>
        ) : charges.length === 0 ? (
          <div className="p-10 text-center text-gray-400 text-sm">Nenhuma mensalidade neste mês.</div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="bg-gray-50 border-b border-gray-100">
                <tr>
                  <th className="text-left px-4 py-3 font-medium text-gray-500">Aluno</th>
                  <th className="text-left px-4 py-3 font-medium text-gray-500">Turma</th>
                  <th className="text-left px-4 py-3 font-medium text-gray-500">Mês</th>
                  <th className="text-right px-4 py-3 font-medium text-gray-500">Valor</th>
                  <th className="text-left px-4 py-3 font-medium text-gray-500">Status</th>
                  <th className="text-right px-4 py-3 font-medium text-gray-500">Ação</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-50">
                {charges.map((c) => (
                  <tr key={c.id} className="hover:bg-gray-50 transition">
                    <td className="px-4 py-3 font-medium text-gray-900">{c.clients?.name ?? '—'}</td>
                    <td className="px-4 py-3 text-gray-600">{c.services?.name ?? '—'}</td>
                    <td className="px-4 py-3 text-gray-500">{refLabel(c.reference_month)}</td>
                    <td className="px-4 py-3 text-right font-semibold text-gray-900">{formatCurrency(Number(c.amount))}</td>
                    <td className="px-4 py-3">
                      <span className={`text-xs font-medium px-2.5 py-1 rounded-full ${
                        c.status === 'pago' ? 'bg-green-100 text-green-700' : 'bg-amber-100 text-amber-700'
                      }`}>
                        {c.status === 'pago' ? 'Pago' : 'Pendente'}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-right">
                      {c.status === 'pago' ? (
                        <button
                          onClick={() => markPending(c.id)}
                          className="inline-flex items-center gap-1 text-xs text-gray-500 hover:text-gray-800 transition"
                        >
                          <RotateCcw size={13} /> Reabrir
                        </button>
                      ) : (
                        <button
                          onClick={() => setPayingCharge(c)}
                          className="inline-flex items-center gap-1 text-xs font-medium text-green-700 bg-green-50 hover:bg-green-100 px-3 py-1.5 rounded-lg transition"
                        >
                          <Check size={13} /> Marcar pago
                        </button>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {payingCharge && (
        <MarkPaidModal
          open
          onClose={() => setPayingCharge(null)}
          description={`Mensalidade — ${payingCharge.services?.name ?? 'Turma'} · ${refLabel(payingCharge.reference_month)}`}
          amount={Number(payingCharge.amount)}
          onConfirm={confirmPayment}
        />
      )}
    </div>
  )
}
