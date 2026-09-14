import { useState, useEffect } from 'react'
import {
  useAllEstablishments,
  type SuperEstablishment,
} from '../../hooks/useSuperAdmin'
import {
  CheckCircle, XCircle, Clock, Search, ExternalLink,
  Edit, X, Building2,
} from 'lucide-react'
import { CATEGORY_LABELS } from '../../lib/segments'

const STATUS_LABELS: Record<string, { label: string; color: string; icon: typeof CheckCircle }> = {
  active:    { label: 'Ativo',    color: 'bg-green-100 text-green-700',  icon: CheckCircle },
  trial:     { label: 'Trial',    color: 'bg-amber-100 text-amber-700',  icon: Clock },
  suspended: { label: 'Suspenso', color: 'bg-red-100 text-red-700',      icon: XCircle },
}

const CATEGORIES = Object.entries(CATEGORY_LABELS)

// ── Modal de edição ───────────────────────────────────────────────────────────
interface EditModalProps {
  establishment: SuperEstablishment
  onClose: () => void
  onSave: (id: string, updates: Partial<SuperEstablishment>) => Promise<{ error: string | null }>
}

function EditModal({ establishment, onClose, onSave }: EditModalProps) {
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState<string | null>(null)

  // Campos do estabelecimento
  const [name, setName]       = useState(establishment.name)
  const [email, setEmail]     = useState(establishment.email ?? '')
  const [phone, setPhone]     = useState(establishment.phone ?? '')
  const [address, setAddress] = useState(establishment.address ?? '')
  const [category, setCategory] = useState(establishment.category)
  const [slug, setSlug]       = useState(establishment.slug)
  const [cashBeta, setCashBeta] = useState(establishment.cash_beta_enabled ?? false)

  const handleSave = async () => {
    setSaving(true)
    setError(null)
    const { error: err } = await onSave(establishment.id, {
      name: name.trim(),
      email: email.trim() || null,
      phone: phone.trim() || null,
      address: address.trim() || null,
      category,
      slug: slug.trim(),
      cash_beta_enabled: cashBeta,
    })
    if (err) setError(err)
    else onClose()
    setSaving(false)
  }

  return (
    <>
      {/* Backdrop */}
      <div className="fixed inset-0 bg-black/40 backdrop-blur-sm z-40" onClick={onClose} />

      {/* Drawer lateral */}
      <div className="fixed inset-y-0 right-0 z-50 w-full sm:w-[480px] bg-white shadow-2xl flex flex-col">

        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-gray-100 shrink-0">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-xl bg-indigo-100 flex items-center justify-center">
              <Building2 size={18} className="text-indigo-600" />
            </div>
            <div>
              <p className="font-bold text-gray-900 text-sm leading-tight">{establishment.name}</p>
              <p className="text-xs text-gray-400">{CATEGORY_LABELS[establishment.category as keyof typeof CATEGORY_LABELS]}</p>
            </div>
          </div>
          <button onClick={onClose} className="p-2 rounded-xl hover:bg-gray-100 text-gray-400 transition">
            <X size={18} />
          </button>
        </div>

        {/* Conteúdo rolável */}
        <div className="flex-1 overflow-y-auto">

          {/* ── Dados ── */}
          <div className="p-6 space-y-4">
              <Field label="Nome do estabelecimento">
                <input
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  className={inputCls}
                  placeholder="Nome"
                />
              </Field>

              <Field label="Categoria">
                <select
                  value={category}
                  onChange={(e) => setCategory(e.target.value)}
                  className={inputCls}
                >
                  {CATEGORIES.map(([val, lbl]) => (
                    <option key={val} value={val}>{lbl}</option>
                  ))}
                </select>
              </Field>

              <Field label="Slug (URL pública)">
                <input
                  value={slug}
                  onChange={(e) => setSlug(e.target.value.toLowerCase().replace(/\s+/g, '-'))}
                  className={inputCls}
                  placeholder="meu-estabelecimento"
                />
                <p className="text-xs text-gray-400 mt-1">/agendar/<strong>{slug || '...'}</strong></p>
              </Field>

              <Field label="E-mail">
                <input
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  className={inputCls}
                  placeholder="contato@exemplo.com"
                />
              </Field>

              <Field label="Telefone / WhatsApp">
                <input
                  value={phone}
                  onChange={(e) => setPhone(e.target.value)}
                  className={inputCls}
                  placeholder="(47) 99999-9999"
                />
              </Field>

              <Field label="Endereço">
                <input
                  value={address}
                  onChange={(e) => setAddress(e.target.value)}
                  className={inputCls}
                  placeholder="Rua, número, bairro, cidade"
                />
              </Field>

              <Field label="Recursos beta">
                <label className="flex items-center gap-2.5 rounded-xl border border-gray-200 px-3 py-2.5 cursor-pointer select-none">
                  <input
                    type="checkbox"
                    checked={cashBeta}
                    onChange={(e) => setCashBeta(e.target.checked)}
                    className="rounded accent-indigo-600"
                  />
                  <span className="text-sm text-gray-700">Frente de caixa (controle de pagamentos)</span>
                </label>
                <p className="text-xs text-gray-400 mt-1">
                  Fora do fluxo padrão do Meridio. Libere só em cadastros de teste.
                </p>
              </Field>

              {error && (
                <p className="text-xs text-red-600 bg-red-50 rounded-xl px-3 py-2">{error}</p>
              )}
          </div>
        </div>

        {/* Footer com botão salvar */}
        <div className="px-6 py-4 border-t border-gray-100 shrink-0">
          <button
            onClick={handleSave}
            disabled={saving}
            className="w-full py-3 rounded-2xl bg-indigo-600 hover:bg-indigo-700 text-white font-bold text-sm transition disabled:opacity-50"
          >
            {saving ? 'Salvando...' : 'Salvar alterações'}
          </button>
        </div>
      </div>
    </>
  )
}

// helpers locais
const inputCls = 'w-full rounded-xl border border-gray-200 px-3 py-2.5 text-sm text-gray-900 placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-400'

/**
 * Mostra "usados/limite" de um recurso do plano. Vermelho quando estoura o
 * limite. Se a contagem não veio (função de contagem ainda não criada no
 * banco), mostra "—" em vez de mentir com 0.
 */
function UsageBadge({ label, used, limit }: { label: string; used?: number; limit: number | null }) {
  if (used === undefined) {
    return <span className="text-gray-300">{label} —</span>
  }
  const limitText = limit === null ? '∞' : String(limit)
  const over = limit !== null && used > limit
  const atLimit = limit !== null && used === limit
  return (
    <span className={over ? 'text-red-600 font-semibold' : atLimit ? 'text-amber-600 font-medium' : 'text-gray-600'}>
      {label} {used}/{limitText}
    </span>
  )
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div className="flex flex-col gap-1">
      <label className="text-xs font-semibold text-gray-500 uppercase tracking-wide">{label}</label>
      {children}
    </div>
  )
}

// ── Página principal ──────────────────────────────────────────────────────────
export default function SuperEstabelecimentos() {
  const { establishments, loading, updateStatus, updateEstablishment } = useAllEstablishments()
  const [search, setSearch]     = useState('')
  const [updating, setUpdating] = useState<string | null>(null)
  const [editing, setEditing]   = useState<SuperEstablishment | null>(null)

  // sincroniza o item em edição se o refetch atualizar os dados
  useEffect(() => {
    setEditing((prev) => {
      if (!prev) return prev
      return establishments.find((e) => e.id === prev.id) ?? prev
    })
  }, [establishments])

  const filtered = establishments.filter((e) =>
    e.name.toLowerCase().includes(search.toLowerCase()) ||
    e.email?.toLowerCase().includes(search.toLowerCase())
  )

  const handleStatus = async (id: string, status: string) => {
    setUpdating(id)
    await updateStatus(id, status)
    setUpdating(null)
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-gray-900">Estabelecimentos</h1>
        <p className="text-sm text-gray-500 mt-1">Todos os cadastros na plataforma</p>
      </div>

      <div className="relative">
        <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
        <input
          type="text"
          placeholder="Buscar por nome ou email..."
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          className="w-full pl-9 pr-4 py-2.5 rounded-xl border border-gray-200 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-400"
        />
      </div>

      {loading ? (
        <div className="flex justify-center py-10">
          <div className="w-8 h-8 rounded-full border-2 border-indigo-600 border-t-transparent animate-spin" />
        </div>
      ) : (
        <div className="bg-white rounded-2xl border border-gray-100 overflow-hidden shadow-sm">
          {filtered.length === 0 ? (
            <p className="text-center text-gray-400 py-10">Nenhum estabelecimento encontrado.</p>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead className="bg-gray-50 border-b border-gray-100">
                  <tr>
                    <th className="text-left px-4 py-3 font-medium text-gray-500">Estabelecimento</th>
                    <th className="text-left px-4 py-3 font-medium text-gray-500">Categoria</th>
                    <th className="text-left px-4 py-3 font-medium text-gray-500">Plano</th>
                    <th className="text-left px-4 py-3 font-medium text-gray-500">Uso do plano</th>
                    <th className="text-left px-4 py-3 font-medium text-gray-500">Status</th>
                    <th className="text-left px-4 py-3 font-medium text-gray-500">Cadastro</th>
                    <th className="text-right px-4 py-3 font-medium text-gray-500">Ações</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-50">
                  {filtered.map((e) => {
                    const st = STATUS_LABELS[e.status] ?? STATUS_LABELS.trial
                    const StatusIcon = st.icon
                    const plan = e.subscriptions?.[0]?.plans
                    const planName = plan?.name ?? '—'
                    return (
                      <tr key={e.id} className="hover:bg-gray-50 transition">
                        <td className="px-4 py-3">
                          <p className="font-medium text-gray-900">{e.name}</p>
                          <p className="text-xs text-gray-400">{e.email ?? '—'}</p>
                        </td>
                        <td className="px-4 py-3 text-gray-600">
                          {CATEGORY_LABELS[e.category as keyof typeof CATEGORY_LABELS] ?? e.category}
                        </td>
                        <td className="px-4 py-3 text-gray-600">{planName}</td>
                        <td className="px-4 py-3">
                          <div className="flex flex-col gap-0.5 text-xs">
                            <UsageBadge label="Prof." used={e.prof_count} limit={plan?.max_professionals ?? null} />
                            <UsageBadge label="Serv." used={e.svc_count} limit={plan?.max_services ?? null} />
                          </div>
                        </td>
                        <td className="px-4 py-3">
                          <span className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-medium ${st.color}`}>
                            <StatusIcon size={12} />
                            {st.label}
                          </span>
                        </td>
                        <td className="px-4 py-3 text-gray-400 text-xs">
                          {new Date(e.created_at).toLocaleDateString('pt-BR')}
                        </td>
                        <td className="px-4 py-3">
                          <div className="flex items-center justify-end gap-2">
                            {/* Editar */}
                            <button
                              onClick={() => setEditing(e)}
                              className="p-1.5 rounded-lg text-gray-400 hover:text-indigo-600 hover:bg-indigo-50 transition"
                              title="Editar"
                            >
                              <Edit size={14} />
                            </button>
                            {/* Ver página pública */}
                            <a
                              href={`/agendar/${e.slug}`}
                              target="_blank"
                              rel="noopener noreferrer"
                              className="p-1.5 rounded-lg text-gray-400 hover:text-indigo-600 hover:bg-indigo-50 transition"
                              title="Ver página pública"
                            >
                              <ExternalLink size={14} />
                            </a>
                            {/* Status */}
                            {e.status !== 'active' && (
                              <button
                                onClick={() => handleStatus(e.id, 'active')}
                                disabled={updating === e.id}
                                className="text-xs px-2.5 py-1 rounded-lg bg-green-50 text-green-700 hover:bg-green-100 transition font-medium disabled:opacity-50"
                              >
                                Ativar
                              </button>
                            )}
                            {e.status !== 'suspended' && (
                              <button
                                onClick={() => handleStatus(e.id, 'suspended')}
                                disabled={updating === e.id}
                                className="text-xs px-2.5 py-1 rounded-lg bg-red-50 text-red-700 hover:bg-red-100 transition font-medium disabled:opacity-50"
                              >
                                Suspender
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

      {/* Drawer de edição */}
      {editing && (
        <EditModal
          establishment={editing}
          onClose={() => setEditing(null)}
          onSave={updateEstablishment}
        />
      )}
    </div>
  )
}
