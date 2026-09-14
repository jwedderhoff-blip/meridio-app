import { useMemo, useState } from 'react'
import { Link } from 'react-router-dom'
import { format } from 'date-fns'
import { ptBR } from 'date-fns/locale'
import { HeartPulse, Search, Copy, Check, MessageCircle, AlertTriangle, Eye, Printer, Clock } from 'lucide-react'
import { useAuth } from '../../context/AuthContext'
import { useEstablishment } from '../../hooks/useEstablishment'
import { useClients } from '../../hooks/useClients'
import { useHealthForms, type HealthFormRow } from '../../hooks/useHealthForms'
import { Button } from '../../components/ui/Button'
import { Input } from '../../components/ui/Input'
import { Modal } from '../../components/ui/Modal'
import { LifestyleChart } from '../../components/admin/LifestyleChart'
import { formatPhone } from '../../lib/utils'
import { PARQ_QUESTIONS, HEALTH_HISTORY, computeLifestyleScores, type AnamneseAnswers } from '../../lib/anamnese'
import type { Client } from '../../types'

function linkFor(token: string) {
  return `${window.location.origin}/anamnese/${token}`
}

function ClientCard({
  client,
  form,
  onGenerate,
  onView,
}: {
  client: Client
  form: HealthFormRow | null
  onGenerate: (id: string) => Promise<void>
  onView: (form: HealthFormRow, client: Client) => void
}) {
  const [copied, setCopied] = useState(false)
  const [generating, setGenerating] = useState(false)

  const copyLink = async (token: string) => {
    await navigator.clipboard.writeText(linkFor(token))
    setCopied(true)
    setTimeout(() => setCopied(false), 1600)
  }

  const handleGenerate = async () => {
    setGenerating(true)
    await onGenerate(client.id)
    setGenerating(false)
  }

  const waLink = (token: string) =>
    `https://wa.me/55${client.phone.replace(/\D/g, '')}?text=${encodeURIComponent(
      `Oi ${client.name.split(' ')[0]}! Antes da sua avaliação, preencha sua ficha de anamnese aqui: ${linkFor(token)}`
    )}`

  return (
    <li className="flex flex-col sm:flex-row sm:items-center gap-3 p-4">
      <div className="flex-1 min-w-0">
        <p className="text-sm font-semibold text-gray-900">{client.name}</p>
        <p className="text-xs text-gray-400">{formatPhone(client.phone)}</p>
      </div>

      {!form && (
        <Button size="sm" variant="secondary" onClick={handleGenerate} loading={generating}>
          Gerar link
        </Button>
      )}

      {form && form.status === 'pendente' && (
        <div className="flex items-center gap-2">
          <span className="text-xs font-medium text-amber-700 bg-amber-50 px-2.5 py-1 rounded-full">Pendente</span>
          <button
            onClick={() => copyLink(form.token)}
            title="Copiar link"
            className="p-1.5 rounded-lg text-gray-400 hover:text-indigo-600 hover:bg-indigo-50 transition"
          >
            {copied ? <Check size={15} className="text-green-600" /> : <Copy size={15} />}
          </button>
          <a
            href={waLink(form.token)}
            target="_blank"
            rel="noreferrer"
            title="Enviar por WhatsApp"
            className="p-1.5 rounded-lg text-gray-400 hover:text-green-600 hover:bg-green-50 transition"
          >
            <MessageCircle size={15} />
          </a>
        </div>
      )}

      {form && form.status === 'preenchida' && (
        <div className="flex items-center gap-2">
          {form.parq_alert && (
            <span title="Alguma resposta do PAR-Q foi 'Sim' — recomenda-se avaliação médica" className="text-amber-600">
              <AlertTriangle size={15} />
            </span>
          )}
          <span className="text-xs font-medium text-green-700 bg-green-50 px-2.5 py-1 rounded-full">
            Preenchida {form.signed_at ? `· ${format(new Date(form.signed_at), "d 'de' MMM", { locale: ptBR })}` : ''}
          </span>
          <button
            onClick={() => onView(form, client)}
            title="Ver respostas"
            className="p-1.5 rounded-lg text-gray-400 hover:text-indigo-600 hover:bg-indigo-50 transition"
          >
            <Eye size={15} />
          </button>
        </div>
      )}
    </li>
  )
}

function AnswersModal({ form, client, onClose }: { form: HealthFormRow | null; client: Client | null; onClose: () => void }) {
  const a = (form?.answers ?? {}) as AnamneseAnswers
  return (
    <Modal open={!!form} onClose={onClose} title={client ? `Anamnese — ${client.name}` : 'Anamnese'}>
      {form && (
        <div className="space-y-5 max-h-[70vh] overflow-y-auto pr-1">
          <div className="flex items-center justify-between gap-3">
            <p className="text-xs text-gray-400 flex items-center gap-1.5">
              <Clock size={13} />
              {form.signed_at
                ? `Preenchida em ${format(new Date(form.signed_at), "d 'de' MMM 'de' yyyy 'às' HH:mm", { locale: ptBR })}`
                : 'Ainda não preenchida'}
            </p>
            <Link
              to={`/admin/anamnese/${form.id}/imprimir`}
              target="_blank"
              rel="noreferrer"
              className="shrink-0 inline-flex items-center gap-1.5 text-xs font-medium text-brand hover:underline"
            >
              <Printer size={14} /> Imprimir para entrevista
            </Link>
          </div>

          {form.parq_alert && (
            <div className="rounded-xl bg-amber-50 border border-amber-200 px-4 py-3 text-sm text-amber-800 flex items-start gap-2">
              <AlertTriangle size={16} className="shrink-0 mt-0.5" />
              Alguma resposta do PAR-Q foi "Sim" — recomenda-se avaliação médica antes da prática.
            </div>
          )}

          <div>
            <p className="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-2">Perfil de estilo de vida</p>
            <LifestyleChart scores={computeLifestyleScores(a)} />
          </div>

          <div>
            <p className="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-1">Identificação</p>
            <p className="text-sm text-gray-800">{a.nome} {a.idade && `· ${a.idade} anos`} {a.sexo && `· ${a.sexo}`}</p>
            <p className="text-xs text-gray-500">{a.telefone} {a.email && `· ${a.email}`}</p>
            {(a.peso || a.altura) && <p className="text-xs text-gray-500">{a.peso && `${a.peso}kg`} {a.altura && `· ${a.altura}m`}</p>}
            {a.emerg_nome && <p className="text-xs text-gray-500">Emergência: {a.emerg_nome} — {a.emerg_telefone}</p>}
          </div>

          <div>
            <p className="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-1">PAR-Q</p>
            <ul className="space-y-1">
              {PARQ_QUESTIONS.map((q, i) => {
                const v = a.parq?.[i]
                return (
                  <li key={i} className="text-xs text-gray-600 flex gap-2">
                    <span className={`font-semibold shrink-0 ${v ? 'text-amber-600' : 'text-gray-400'}`}>
                      {v === true ? 'Sim' : v === false ? 'Não' : '—'}
                    </span>
                    {q}
                  </li>
                )
              })}
            </ul>
            {a.parq_comentario && <p className="text-xs text-gray-600 mt-1 italic">"{a.parq_comentario}"</p>}
          </div>

          <div>
            <p className="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-1">Histórico de saúde</p>
            {HEALTH_HISTORY.filter((h) => a.health?.[h.key]?.answer === true).length === 0 ? (
              <p className="text-xs text-gray-400">Nenhum item respondido "Sim".</p>
            ) : (
              <ul className="space-y-1.5">
                {HEALTH_HISTORY.filter((h) => a.health?.[h.key]?.answer === true).map((h) => (
                  <li key={h.key} className="text-xs text-gray-700">
                    <span className="font-medium">{h.label}</span>
                    {a.health?.[h.key]?.detail && <> — {a.health[h.key].detail}</>}
                  </li>
                ))}
              </ul>
            )}
          </div>

          <div className="grid grid-cols-2 gap-3 text-xs text-gray-600">
            {a.condicionamento && <p><strong>Condicionamento:</strong> {a.condicionamento}</p>}
            {a.fumante && <p><strong>Fumante:</strong> {a.fumante}</p>}
            {a.alcool && <p><strong>Álcool:</strong> {a.alcool}</p>}
            {a.sono && <p><strong>Sono:</strong> {a.sono} {a.horas_sono && `(${a.horas_sono}h)`}</p>}
            {a.estresse && <p><strong>Estresse:</strong> {a.estresse}</p>}
            {a.rotina && <p><strong>Rotina:</strong> {a.rotina}</p>}
          </div>

          {(a.limitacoes || a.experiencia_previa) && (
            <div className="text-xs text-gray-700 space-y-1">
              {a.experiencia_previa && <p><strong>Experiência prévia:</strong> {a.experiencia_previa}</p>}
              {a.limitacoes && <p><strong>Limitações:</strong> {a.limitacoes}</p>}
            </div>
          )}

          {(a.motivacao || a.objetivos || a.receios) && (
            <div>
              <p className="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-1">Objetivos</p>
              {a.motivacao && <p className="text-xs text-gray-700"><strong>Motivação:</strong> {a.motivacao}</p>}
              {a.objetivos && <p className="text-xs text-gray-700"><strong>Objetivos:</strong> {a.objetivos}</p>}
              {a.receios && <p className="text-xs text-gray-700"><strong>Receios:</strong> {a.receios}</p>}
            </div>
          )}

          {form.signature_name && (
            <p className="text-xs text-gray-400 border-t border-gray-100 pt-3">
              Assinado digitalmente por <strong>{form.signature_name}</strong>
              {form.signed_at && ` em ${format(new Date(form.signed_at), "d 'de' MMM 'de' yyyy 'às' HH:mm", { locale: ptBR })}`}
            </p>
          )}
        </div>
      )}
    </Modal>
  )
}

export default function AnamneseAdmin() {
  const { user } = useAuth()
  const { establishment } = useEstablishment(user?.id)
  const { clients, loading: loadingClients } = useClients(establishment?.id)
  const { forms, loading: loadingForms, createLink, formByClient } = useHealthForms(establishment?.id)
  const [search, setSearch] = useState('')
  const [viewing, setViewing] = useState<{ form: HealthFormRow; client: Client } | null>(null)

  const filtered = useMemo(
    () => clients.filter((c) => c.name.toLowerCase().includes(search.toLowerCase())),
    [clients, search]
  )

  const stats = useMemo(() => {
    const preenchidas = forms.filter((f) => f.status === 'preenchida').length
    const alertas = forms.filter((f) => f.parq_alert).length
    return { total: clients.length, preenchidas, pendentes: clients.length - forms.length, alertas }
  }, [forms, clients.length])

  const handleGenerate = async (clientId: string) => {
    await createLink(clientId)
  }

  const loading = loadingClients || loadingForms

  return (
    <div>
      <div className="flex items-center gap-3 mb-6">
        <div className="w-10 h-10 rounded-xl bg-brand flex items-center justify-center">
          <HeartPulse size={20} className="text-white" />
        </div>
        <div>
          <h1 className="font-display text-3xl tracking-tight text-ink">Anamnese</h1>
          <p className="text-xs text-gray-400">Ficha de saúde para início de atividade física</p>
        </div>
      </div>

      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mb-6">
        {[
          { label: 'Clientes', value: stats.total },
          { label: 'Preenchidas', value: stats.preenchidas },
          { label: 'Pendentes', value: stats.pendentes },
          { label: 'Com alerta', value: stats.alertas },
        ].map((s) => (
          <div key={s.label} className="bg-white rounded-2xl border border-gray-100 p-4">
            <p className="text-2xl font-display text-ink">{s.value}</p>
            <p className="text-xs text-gray-400">{s.label}</p>
          </div>
        ))}
      </div>

      <div className="mb-4">
        <Input placeholder="Buscar cliente..." icon={<Search size={16} />} value={search} onChange={(e) => setSearch(e.target.value)} />
      </div>

      <div className="bg-white rounded-2xl border border-gray-100">
        {loading ? (
          <div className="p-10 text-center text-gray-400 text-sm">Carregando...</div>
        ) : filtered.length === 0 ? (
          <div className="p-10 text-center text-gray-400 text-sm">Nenhum cliente cadastrado ainda.</div>
        ) : (
          <ul className="divide-y divide-gray-100">
            {filtered.map((client) => (
              <ClientCard
                key={client.id}
                client={client}
                form={formByClient(client.id)}
                onGenerate={handleGenerate}
                onView={(form, c) => setViewing({ form, client: c })}
              />
            ))}
          </ul>
        )}
      </div>

      <AnswersModal form={viewing?.form ?? null} client={viewing?.client ?? null} onClose={() => setViewing(null)} />
    </div>
  )
}
