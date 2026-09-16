import { useAllSubscriptions, useAllEstablishments, usePlans, type Subscription } from '../../hooks/useSuperAdmin'
import { useState } from 'react'
import { Link } from 'react-router-dom'
import { supabase } from '../../lib/supabase'
import { Calendar, Check, X, FileText } from 'lucide-react'

const STATUS_COLORS: Record<string, string> = {
  trial: 'bg-amber-100 text-amber-700',
  active: 'bg-green-100 text-green-700',
  suspended: 'bg-red-100 text-red-700',
  cancelled: 'bg-gray-100 text-gray-500',
}

const STATUS_LABELS: Record<string, string> = {
  trial: 'Trial', active: 'Ativo', suspended: 'Suspenso', cancelled: 'Cancelado',
}

function expiryInfo(expiresAt: string | null): {
  label: string
  cls: string
} {
  if (!expiresAt) return { label: '—', cls: 'text-gray-400' }
  const now = new Date()
  const exp = new Date(expiresAt)
  const diffMs = exp.getTime() - now.getTime()
  const diffDays = Math.ceil(diffMs / (1000 * 60 * 60 * 24))
  const dateStr = exp.toLocaleDateString('pt-BR')

  if (diffDays < 0) return { label: `Vencido (${dateStr})`, cls: 'text-red-600 font-semibold' }
  if (diffDays === 0) return { label: `Vence hoje`, cls: 'text-red-600 font-semibold' }
  if (diffDays <= 7) return { label: `${diffDays}d (${dateStr})`, cls: 'text-orange-600 font-semibold' }
  if (diffDays <= 30) return { label: `${diffDays}d (${dateStr})`, cls: 'text-amber-600' }
  return { label: dateStr, cls: 'text-green-700' }
}

/** Calcula o vencimento a partir de uma data-base (hoje, por padrão) somando o ciclo do plano contratado. */
function calcExpiresAt(planId: string, plans: ReturnType<typeof usePlans>['plans'], from: Date = new Date()): string | null {
  const plan = plans.find((p) => p.id === planId)
  if (!plan) return null
  // Plano por agendamento é contínuo: cobra por atendimento, não tem validade.
  if (plan.billing_type === 'por_agendamento') return null
  const base = new Date(from)
  if (plan.billing_type === 'package' && plan.package_days) {
    base.setDate(base.getDate() + plan.package_days)
  } else {
    base.setDate(base.getDate() + (plan.billing_cycle_days ?? 30))
  }
  return base.toISOString()
}

export default function SuperAssinaturas() {
  const { subscriptions, loading, updateSubscription, refetch } = useAllSubscriptions()
  const { establishments } = useAllEstablishments()
  const { plans } = usePlans()
  const [assigning, setAssigning] = useState<string | null>(null)
  const [selectedPlan, setSelectedPlan] = useState<Record<string, string>>({})
  const [editingExpiry, setEditingExpiry] = useState<string | null>(null)
  const [expiryInput, setExpiryInput] = useState('')
  const [editingStart, setEditingStart] = useState<string | null>(null)
  const [startInput, setStartInput] = useState('')

  const noSubscription = establishments.filter(
    (e) => !subscriptions.some((s) => s.establishment_id === e.id)
  )

  // Linha de cada estabelecimento, para filtrar os planos compatíveis.
  const segById = new Map(establishments.map((e) => [e.id, e.segment ?? null]))
  // Um plano serve se não tem linha (vale p/ ambas) ou bate com a do estabelecimento.
  // Se o estabelecimento não tem linha definida, não filtramos.
  const planFits = (planSegment: string | null, estSegment: string | null | undefined) =>
    !planSegment || !estSegment || planSegment === estSegment

  const assign = async (establishmentId: string) => {
    const planId = selectedPlan[establishmentId]
    if (!planId) return
    setAssigning(establishmentId)
    const expiresAt = calcExpiresAt(planId, plans)
    await supabase.from('subscriptions').insert({
      establishment_id: establishmentId,
      plan_id: planId,
      status: 'active',
      started_at: new Date().toISOString(),
      expires_at: expiresAt,
    })
    setAssigning(null)
    await refetch()
  }

  const startEditExpiry = (id: string, current: string | null) => {
    setEditingExpiry(id)
    setExpiryInput(current ? current.slice(0, 10) : '')
  }

  const saveExpiry = async (id: string) => {
    if (expiryInput) {
      const iso = new Date(expiryInput + 'T23:59:59').toISOString()
      await updateSubscription(id, { expires_at: iso })
    }
    setEditingExpiry(null)
  }

  const startEditStart = (id: string, current: string) => {
    setEditingStart(id)
    setStartInput(current.slice(0, 10))
  }

  /** Muda a data de início e recalcula o vencimento a partir do plano contratado, na mesma data. */
  const saveStart = async (s: Subscription) => {
    if (startInput) {
      const startDate = new Date(startInput + 'T00:00:00')
      const updates: Partial<Subscription> = { started_at: startDate.toISOString() }
      if (s.plan_id) {
        updates.expires_at = calcExpiresAt(s.plan_id, plans, startDate)
      }
      await updateSubscription(s.id, updates)
    }
    setEditingStart(null)
  }

  return (
    <div className="space-y-8">
      <div>
        <h1 className="text-2xl font-bold text-gray-900">Assinaturas</h1>
        <p className="text-sm text-gray-500 mt-1">Gerencie planos e status de cada estabelecimento</p>
      </div>

      {/* Sem assinatura */}
      {noSubscription.length > 0 && (
        <div className="bg-amber-50 border border-amber-200 rounded-2xl p-5">
          <h2 className="font-semibold text-amber-800 mb-3">Sem plano atribuído ({noSubscription.length})</h2>
          <div className="space-y-3">
            {noSubscription.map((e) => {
              const planId = selectedPlan[e.id] ?? ''
              const plan = plans.find((p) => p.id === planId)
              const isPerBooking = plan?.billing_type === 'por_agendamento'
              const preview = plan
                ? isPerBooking
                  ? 'Por agendamento · sem validade'
                  : plan.billing_type === 'package' && plan.package_days
                    ? `Expira em Pacote ${plan.package_days}d`
                    : `Expira em ${plan.billing_cycle_days ?? 30} dias`
                : null
              return (
                <div key={e.id} className="flex items-center gap-3 flex-wrap">
                  <span className="text-sm font-medium text-gray-900 flex-1">{e.name}</span>
                  <select
                    value={planId}
                    onChange={(ev) => setSelectedPlan((p) => ({ ...p, [e.id]: ev.target.value }))}
                    className="text-sm border border-gray-200 rounded-xl px-3 py-2 focus:outline-none focus:ring-2 focus:ring-indigo-500/20"
                  >
                    <option value="">Selecionar plano</option>
                    {plans.filter((p) => p.is_active && planFits(p.segment, e.segment)).map((p) => (
                      <option key={p.id} value={p.id}>{p.name}</option>
                    ))}
                  </select>
                  {preview && (
                    <span className={`text-xs px-2 py-1 rounded-lg ${isPerBooking ? 'text-emerald-700 bg-emerald-100' : 'text-amber-700 bg-amber-100'}`}>
                      {preview}
                    </span>
                  )}
                  <button
                    onClick={() => assign(e.id)}
                    disabled={!planId || assigning === e.id}
                    className="text-sm px-4 py-2 rounded-xl bg-indigo-600 text-white hover:bg-indigo-700 disabled:opacity-40 transition font-medium"
                  >
                    {assigning === e.id ? 'Salvando...' : 'Atribuir'}
                  </button>
                </div>
              )
            })}
          </div>
        </div>
      )}

      {/* Lista de assinaturas */}
      {loading ? (
        <div className="flex justify-center py-10">
          <div className="w-8 h-8 rounded-full border-2 border-indigo-600 border-t-transparent animate-spin" />
        </div>
      ) : (
        <div className="bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden">
          {subscriptions.length === 0 ? (
            <p className="text-center text-gray-400 py-10">Nenhuma assinatura ainda.</p>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead className="bg-gray-50 border-b border-gray-100">
                  <tr>
                    <th className="text-left px-4 py-3 font-medium text-gray-500">Estabelecimento</th>
                    <th className="text-left px-4 py-3 font-medium text-gray-500">Plano</th>
                    <th className="text-left px-4 py-3 font-medium text-gray-500">Status</th>
                    <th className="text-left px-4 py-3 font-medium text-gray-500">Início</th>
                    <th className="text-left px-4 py-3 font-medium text-gray-500">Vencimento</th>
                    <th className="text-right px-4 py-3 font-medium text-gray-500">Ações</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-50">
                  {subscriptions.map((s) => {
                    const expiry = expiryInfo(s.expires_at ?? null)
                    return (
                      <tr key={s.id} className="hover:bg-gray-50 transition">
                        <td className="px-4 py-3 font-medium text-gray-900">
                          {s.establishments?.name ?? '—'}
                        </td>
                        <td className="px-4 py-3">
                          <select
                            value={s.plan_id ?? ''}
                            onChange={async (e) => {
                              const newPlanId = e.target.value || undefined
                              const expiresAt = newPlanId ? calcExpiresAt(newPlanId, plans) : null
                              // Sempre grava expires_at (null p/ por agendamento ou sem plano),
                              // pra não manter um vencimento antigo ao trocar de tipo.
                              await updateSubscription(s.id, {
                                plan_id: newPlanId ?? null,
                                expires_at: expiresAt,
                              } as Parameters<typeof updateSubscription>[1])
                            }}
                            className="text-xs border border-gray-200 rounded-lg px-2 py-1 focus:outline-none focus:ring-2 focus:ring-indigo-500/20"
                          >
                            <option value="">Sem plano</option>
                            {plans
                              .filter((p) => p.id === s.plan_id || planFits(p.segment, segById.get(s.establishment_id)))
                              .map((p) => (
                                <option key={p.id} value={p.id}>{p.name}</option>
                              ))}
                          </select>
                        </td>
                        <td className="px-4 py-3">
                          <select
                            value={s.status}
                            onChange={(e) => updateSubscription(s.id, { status: e.target.value as typeof s.status })}
                            className={`text-xs font-medium px-2.5 py-1 rounded-full border-0 outline-none cursor-pointer ${STATUS_COLORS[s.status]}`}
                          >
                            {Object.entries(STATUS_LABELS).map(([v, l]) => (
                              <option key={v} value={v}>{l}</option>
                            ))}
                          </select>
                        </td>
                        <td className="px-4 py-3 text-xs">
                          {editingStart === s.id ? (
                            <div className="flex items-center gap-1">
                              <input
                                type="date"
                                value={startInput}
                                onChange={(e) => setStartInput(e.target.value)}
                                className="border border-gray-200 rounded-lg px-2 py-1 text-xs focus:outline-none focus:ring-2 focus:ring-indigo-500/20"
                              />
                              <button
                                onClick={() => saveStart(s)}
                                className="p-1 text-green-600 hover:bg-green-50 rounded"
                              >
                                <Check size={13} />
                              </button>
                              <button
                                onClick={() => setEditingStart(null)}
                                className="p-1 text-gray-400 hover:bg-gray-100 rounded"
                              >
                                <X size={13} />
                              </button>
                            </div>
                          ) : (
                            <button
                              onClick={() => startEditStart(s.id, s.started_at)}
                              className="flex items-center gap-1.5 group"
                              title="Alterar data de início (recalcula o vencimento pelo plano contratado)"
                            >
                              <span className="text-gray-400">{new Date(s.started_at).toLocaleDateString('pt-BR')}</span>
                              <Calendar size={11} className="text-gray-300 group-hover:text-indigo-400 transition" />
                            </button>
                          )}
                        </td>
                        <td className="px-4 py-3 text-xs">
                          {editingExpiry === s.id ? (
                            <div className="flex items-center gap-1">
                              <input
                                type="date"
                                value={expiryInput}
                                onChange={(e) => setExpiryInput(e.target.value)}
                                className="border border-gray-200 rounded-lg px-2 py-1 text-xs focus:outline-none focus:ring-2 focus:ring-indigo-500/20"
                              />
                              <button
                                onClick={() => saveExpiry(s.id)}
                                className="p-1 text-green-600 hover:bg-green-50 rounded"
                              >
                                <Check size={13} />
                              </button>
                              <button
                                onClick={() => setEditingExpiry(null)}
                                className="p-1 text-gray-400 hover:bg-gray-100 rounded"
                              >
                                <X size={13} />
                              </button>
                            </div>
                          ) : (
                            <button
                              onClick={() => startEditExpiry(s.id, s.expires_at ?? null)}
                              className="flex items-center gap-1.5 group"
                            >
                              <span className={expiry.cls}>{expiry.label}</span>
                              <Calendar size={11} className="text-gray-300 group-hover:text-indigo-400 transition" />
                            </button>
                          )}
                        </td>
                        <td className="px-4 py-3 text-right">
                          <div className="flex items-center justify-end gap-1.5">
                            {s.plan_id && (
                              <Link
                                to={`/superadmin/assinaturas/${s.id}/contrato`}
                                target="_blank"
                                rel="noreferrer"
                                title="Gerar contrato"
                                className="p-1.5 rounded-lg text-gray-400 hover:text-indigo-600 hover:bg-indigo-50 transition"
                              >
                                <FileText size={15} />
                              </Link>
                            )}
                            {s.status === 'active' ? (
                              <button
                                onClick={() => updateSubscription(s.id, { status: 'suspended' })}
                                className="text-xs px-2.5 py-1 rounded-lg bg-red-50 text-red-700 hover:bg-red-100 transition font-medium"
                              >
                                Suspender
                              </button>
                            ) : (
                              <button
                                onClick={() => updateSubscription(s.id, { status: 'active' })}
                                className="text-xs px-2.5 py-1 rounded-lg bg-green-50 text-green-700 hover:bg-green-100 transition font-medium"
                              >
                                Ativar
                              </button>
                            )}
                          </div>
                        </td>
                      </tr>
                    )
                  })}
                </tbody>
              </table>
            </div>
          )}
        </div>
      )}

      {/* Legenda */}
      <div className="flex items-center gap-4 text-xs text-gray-400 flex-wrap">
        <span className="flex items-center gap-1.5"><span className="w-2 h-2 rounded-full bg-green-500 inline-block" /> Mais de 30 dias</span>
        <span className="flex items-center gap-1.5"><span className="w-2 h-2 rounded-full bg-amber-400 inline-block" /> 8–30 dias</span>
        <span className="flex items-center gap-1.5"><span className="w-2 h-2 rounded-full bg-orange-500 inline-block" /> ≤ 7 dias</span>
        <span className="flex items-center gap-1.5"><span className="w-2 h-2 rounded-full bg-red-500 inline-block" /> Vencido</span>
      </div>
    </div>
  )
}
