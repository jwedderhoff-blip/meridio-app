import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import { format } from 'date-fns'
import { ptBR } from 'date-fns/locale'
import { Calendar, Users, DollarSign, TrendingUp, Wallet, ArrowUpRight, Clock3 } from 'lucide-react'
import { useAuth } from '../../context/AuthContext'
import { useEstablishment } from '../../hooks/useEstablishment'
import { useAppointments } from '../../hooks/useAppointments'
import { useMembershipCharges } from '../../hooks/useMemberships'
import ShareCard from '../../components/admin/ShareCard'
import AgendaBlock from '../../components/admin/AgendaBlock'
import { formatCurrency } from '../../lib/utils'
import type { Appointment } from '../../types'

function StatCard({ label, value, icon, color, to }: {
  label: string
  value: string | number
  icon: React.ReactNode
  color: string
  to?: string
}) {
  const inner = (
    <>
      <div className="flex items-center justify-between mb-3">
        <p className="text-sm font-medium text-gray-500">{label}</p>
        <div className={`w-9 h-9 rounded-xl flex items-center justify-center ${color}`}>{icon}</div>
      </div>
      <p className="font-display text-3xl tracking-tight text-ink">{value}</p>
    </>
  )
  if (to) {
    return (
      <Link to={to} className="block bg-white rounded-2xl border border-gray-100 p-5 transition hover:border-brand/40 hover:shadow-sm">
        {inner}
      </Link>
    )
  }
  return <div className="bg-white rounded-2xl border border-gray-100 p-5">{inner}</div>
}

export default function Dashboard() {
  const { user } = useAuth()
  const { establishment } = useEstablishment(user?.id)
  const today = format(new Date(), 'yyyy-MM-dd')
  const { appointments } = useAppointments(establishment?.id, today)
  const monthStr = format(new Date(), 'yyyy-MM')
  const { charges: mensalidades } = useMembershipCharges(establishment?.id, monthStr)
  const [newClients, setNewClients] = useState(0)
  const financeiroEnabled = !!establishment?.financeiro_beta_enabled

  const mensalPendentes = mensalidades.filter((c) => c.status === 'pendente')
  const mensalAReceber = mensalPendentes.reduce((s, c) => s + Number(c.amount), 0)
  const mensalRecebido = mensalidades.filter((c) => c.status === 'pago').reduce((s, c) => s + Number(c.amount), 0)

  useEffect(() => {
    const todayStr = format(new Date(), 'yyyy-MM-dd')
    const count = appointments.filter((a) => a.created_at?.startsWith(todayStr)).length
    setNewClients(count)
  }, [appointments])

  const revenue = appointments
    .filter((a: Appointment) => a.payment_status === 'pago')
    .reduce((sum: number, a: Appointment) => sum + ((a.service as { price?: number })?.price ?? 0), 0)

  const confirmed = appointments.filter((a) => a.status === 'confirmado').length

  return (
    <div>
      <div className="mb-6">
        <h1 className="font-display text-3xl tracking-tight text-ink">
          Olá, {establishment?.name ?? 'Estabelecimento'} 👋
        </h1>
        <p className="text-gray-500 text-sm capitalize">
          {format(new Date(), "EEEE, d 'de' MMMM 'de' yyyy", { locale: ptBR })}
        </p>
      </div>

      {/* Bloco em evidência: agenda da semana (com alternância semana/dia) */}
      <div className="mb-8">
        <AgendaBlock establishmentId={establishment?.id} />
      </div>

      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
        <StatCard
          label="Agendamentos hoje"
          value={appointments.length}
          icon={<Calendar size={18} className="text-brand" />}
          color="bg-brand-soft"
          to="/admin/agenda"
        />
        <StatCard
          label="Confirmados"
          value={confirmed}
          icon={<TrendingUp size={18} className="text-green-600" />}
          color="bg-green-50"
          to="/admin/agenda"
        />
        <StatCard
          label="Clientes novos"
          value={newClients}
          icon={<Users size={18} className="text-blue-600" />}
          color="bg-blue-50"
          to="/admin/clientes"
        />
        <StatCard
          label="Financeiro"
          value={formatCurrency(revenue)}
          icon={<DollarSign size={18} className="text-emerald-600" />}
          color="bg-emerald-50"
          to={financeiroEnabled ? '/admin/financeiro' : undefined}
        />
      </div>

      {mensalidades.length > 0 && (
        <div className="bg-white rounded-2xl border border-gray-100 p-5 mb-8">
          <div className="flex items-center justify-between mb-4 gap-3 flex-wrap">
            <div className="flex items-center gap-2">
              <span className="w-8 h-8 rounded-xl bg-emerald-50 flex items-center justify-center">
                <Wallet size={15} className="text-emerald-600" />
              </span>
              <div>
                <h2 className="font-semibold text-gray-900 text-sm capitalize">
                  Mensalidades — {format(new Date(), 'MMMM', { locale: ptBR })}
                </h2>
                <p className="text-xs text-gray-400">Controle de recebimentos das turmas</p>
              </div>
            </div>
            {financeiroEnabled && (
              <Link to="/admin/financeiro" className="inline-flex items-center gap-1 text-sm font-medium text-brand hover:text-brand-dark transition">
                Gerenciar no Financeiro <ArrowUpRight size={14} />
              </Link>
            )}
          </div>
          <div className="grid grid-cols-3 gap-3">
            <div>
              <p className="text-xs text-gray-400">Em aberto</p>
              <p className="font-display text-2xl tracking-tight text-ink">{mensalPendentes.length}</p>
            </div>
            <div>
              <p className="text-xs text-gray-400 flex items-center gap-1"><Clock3 size={11} /> A receber</p>
              <p className="font-display text-2xl tracking-tight text-amber-600">{formatCurrency(mensalAReceber)}</p>
            </div>
            <div>
              <p className="text-xs text-gray-400">Recebido</p>
              <p className="font-display text-2xl tracking-tight text-emerald-600">{formatCurrency(mensalRecebido)}</p>
            </div>
          </div>
        </div>
      )}

      {establishment && (
        <div className="mb-8">
          <ShareCard
            url={`${window.location.origin}/agendar/${establishment.slug}`}
            name={establishment.name}
          />
        </div>
      )}

    </div>
  )
}
