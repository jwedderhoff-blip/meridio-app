import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import { ArrowLeft, ArrowRight, Check, Infinity as InfinityIcon } from 'lucide-react'
import { supabase } from '../lib/supabase'
import { useTheme } from '../context/ThemeContext'
import { formatCurrency } from '../lib/utils'
import { HUES, INK, INK_SOFT, MUTED, PAPER, LINE, SOFT_LINE } from './demo/data'
import { SEGMENTS, type Segment } from '../lib/segments'
import type { Plan } from '../hooks/useSuperAdmin'

const CYCLE_LABELS: Record<number, string> = { 30: 'mensal', 90: 'trimestral', 180: 'semestral', 365: 'anual' }

/** Rótulo do preço conforme o tipo de cobrança do plano. */
function priceLabel(plan: Plan): { value: string; suffix: string; cycleNote: string } {
  if (plan.billing_type === 'por_agendamento') {
    const v = plan.booking_fee_type === 'percentual'
      ? `${plan.booking_fee_value ?? 0}%`
      : formatCurrency(Number(plan.booking_fee_value ?? 0))
    return { value: v, suffix: 'por atendimento', cycleNote: '' }
  }
  if (plan.billing_type === 'package') {
    const v = !plan.price_package ? 'Grátis' : formatCurrency(plan.price_package)
    return { value: v, suffix: plan.package_days ? `a cada ${plan.package_days} dias` : 'por pacote', cycleNote: '' }
  }
  const v = plan.price_monthly === 0 ? 'Grátis' : formatCurrency(plan.price_monthly)
  if (plan.price_monthly === 0) return { value: v, suffix: '', cycleNote: '' }
  const days = plan.billing_cycle_days ?? 30
  const cycle = CYCLE_LABELS[days] ?? `a cada ${days} dias`
  const months = Math.max(1, Math.round(days / 30))
  const cycleNote = days === 30 ? '' : `cobrança ${cycle} · total ${formatCurrency(plan.price_monthly * months)}`
  return { value: v, suffix: 'por mês', cycleNote }
}

function limitText(n: number | null, singular: string, plural: string): string {
  if (n == null) return `${plural} ilimitados`
  return `${n} ${n === 1 ? singular : plural}`
}

export default function Planos() {
  const { applyPublic } = useTheme()
  useEffect(() => { applyPublic(null) }, [applyPublic])

  const [plans, setPlans] = useState<Plan[]>([])
  const [loading, setLoading] = useState(true)
  const [line, setLine] = useState<Segment>('estetica')

  // Um plano aparece na linha se não tem linha (serve as duas) ou bate com a aba.
  const visiblePlans = plans.filter((p) => !p.segment || p.segment === line)

  useEffect(() => {
    supabase
      .from('plans')
      .select('*')
      .eq('is_active', true)
      .order('price_monthly', { ascending: true })
      .then(({ data }) => {
        setPlans((data ?? []) as Plan[])
        setLoading(false)
      })
  }, [])

  return (
    <div className="min-h-screen" style={{ background: PAPER }}>
      {/* Topo */}
      <header className="border-b sticky top-0 z-40" style={{ borderColor: LINE, background: 'rgba(251,250,248,.92)', backdropFilter: 'blur(10px)' }}>
        <div className="max-w-6xl mx-auto px-6 h-16 flex items-center justify-between gap-4">
          <Link to="/" className="flex items-center gap-2 text-sm" style={{ color: INK_SOFT }}>
            <ArrowLeft size={16} />
            <span className="font-display text-lg tracking-tight" style={{ color: INK }}>Meridio</span>
          </Link>
          <div className="flex items-center gap-3">
            <Link to="/demo" className="text-sm px-4 py-2 rounded-full transition hover:bg-white" style={{ color: INK_SOFT, border: `1px solid ${LINE}` }}>
              Ver demonstração
            </Link>
            <Link to="/register" className="text-sm font-medium px-5 py-2 rounded-full text-white transition hover:opacity-90" style={{ background: HUES.indigo }}>
              Começar grátis
            </Link>
          </div>
        </div>
      </header>

      {/* Título */}
      <div className="max-w-6xl mx-auto px-6 pt-14 pb-8 text-center">
        <div className="flex items-center justify-center gap-3 mb-4">
          <span className="h-px w-8" style={{ background: HUES.indigo }} />
          <span className="text-xs uppercase tracking-[0.2em] font-medium" style={{ color: HUES.indigo }}>Planos</span>
          <span className="h-px w-8" style={{ background: HUES.indigo }} />
        </div>
        <h1 className="font-display text-4xl sm:text-5xl leading-tight tracking-tight" style={{ color: INK }}>
          Escolha como quer pagar
        </h1>
        <p className="mt-4 max-w-2xl mx-auto text-base leading-relaxed" style={{ color: INK_SOFT }}>
          Planos mensais, por pacote de dias ou por atendimento realizado. Comece grátis e mude quando quiser.
        </p>

        {/* Abas por linha de trabalho */}
        <div className="flex justify-center mt-8">
          <div className="inline-flex p-1 rounded-full" style={{ background: '#efece5' }}>
            {SEGMENTS.map((s) => {
              const on = line === s.value
              return (
                <button
                  key={s.value}
                  onClick={() => setLine(s.value)}
                  className="px-5 sm:px-7 py-2.5 rounded-full text-sm font-medium transition-all duration-300"
                  style={{
                    background: on ? '#fff' : 'transparent',
                    color: on ? INK : MUTED,
                    boxShadow: on ? '0 1px 3px rgba(20,19,28,.12)' : 'none',
                  }}
                >
                  {s.label}
                </button>
              )
            })}
          </div>
        </div>
      </div>

      {/* Cards */}
      <div className="max-w-6xl mx-auto px-6 pb-24">
        {loading ? (
          <div className="flex justify-center py-16">
            <div className="w-8 h-8 rounded-full border-2 border-t-transparent animate-spin" style={{ borderColor: HUES.indigo, borderTopColor: 'transparent' }} />
          </div>
        ) : visiblePlans.length === 0 ? (
          <p className="text-center py-16 text-sm" style={{ color: MUTED }}>Nenhum plano disponível para esta linha no momento.</p>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
            {visiblePlans.map((plan) => {
              const price = priceLabel(plan)
              const perBooking = plan.billing_type === 'por_agendamento'
              return (
                <div key={plan.id} className="rounded-2xl border bg-white p-6 flex flex-col" style={{ borderColor: LINE }}>
                  <div className="flex items-center gap-2 mb-1">
                    <h3 className="font-semibold text-lg" style={{ color: INK }}>{plan.name}</h3>
                    {perBooking && (
                      <span className="text-[10px] uppercase tracking-wider px-2 py-0.5 rounded-full font-medium text-white" style={{ background: HUES.sage }}>
                        por atendimento
                      </span>
                    )}
                  </div>
                  {plan.description && (
                    <p className="text-sm mb-4 leading-snug" style={{ color: MUTED }}>{plan.description}</p>
                  )}

                  <div className="mb-5">
                    <div>
                      <span className="font-display text-3xl tracking-tight" style={{ color: INK }}>{price.value}</span>
                      {price.suffix && <span className="text-sm ml-1.5" style={{ color: MUTED }}>{price.suffix}</span>}
                    </div>
                    {price.cycleNote && (
                      <p className="text-xs mt-1" style={{ color: MUTED }}>{price.cycleNote}</p>
                    )}
                  </div>

                  <ul className="space-y-2.5 mb-6 flex-1">
                    {[
                      limitText(plan.max_services, 'serviço', 'serviços'),
                      limitText(plan.max_professionals, 'profissional', 'profissionais'),
                      plan.max_appointments_per_month == null
                        ? 'Agendamentos ilimitados'
                        : `${plan.max_appointments_per_month} agendamentos/mês`,
                    ].map((line) => {
                      const unlimited = line.includes('ilimitad')
                      return (
                        <li key={line} className="flex items-center gap-2.5 text-sm" style={{ color: INK_SOFT }}>
                          {unlimited
                            ? <InfinityIcon size={15} style={{ color: HUES.indigo }} />
                            : <Check size={15} style={{ color: HUES.sage }} />}
                          {line}
                        </li>
                      )
                    })}
                    {perBooking && (
                      <li className="flex items-center gap-2.5 text-sm" style={{ color: INK_SOFT }}>
                        <Check size={15} style={{ color: HUES.sage }} />
                        Taxa {plan.booking_fee_charge_to === 'cliente' ? 'repassada ao cliente' : 'sobre o estabelecimento'}
                      </li>
                    )}
                  </ul>

                  <Link
                    to="/register"
                    className="inline-flex items-center justify-center gap-2 w-full py-3 rounded-xl text-sm font-medium text-white transition hover:opacity-90"
                    style={{ background: HUES.indigo }}
                  >
                    Começar grátis <ArrowRight size={16} />
                  </Link>
                </div>
              )
            })}
          </div>
        )}

        <p className="text-center text-xs mt-10" style={{ color: MUTED }}>
          Sem cartão de crédito para começar. Você pode trocar de plano a qualquer momento.
        </p>
      </div>

      {/* Rodapé simples */}
      <div className="border-t" style={{ borderColor: SOFT_LINE }}>
        <div className="max-w-6xl mx-auto px-6 py-8 text-center text-xs" style={{ color: MUTED }}>
          Meridio · agendamento online para o seu negócio
        </div>
      </div>
    </div>
  )
}
