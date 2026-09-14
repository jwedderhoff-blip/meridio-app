import { useEffect, useState } from 'react'
import { useParams } from 'react-router-dom'
import { format } from 'date-fns'
import { ptBR } from 'date-fns/locale'
import { HeartPulse, Printer } from 'lucide-react'
import { supabase } from '../../lib/supabase'
import { Button } from '../../components/ui/Button'
import { PARQ_QUESTIONS, HEALTH_HISTORY, computeLifestyleScores, type AnamneseAnswers } from '../../lib/anamnese'
import { LifestyleChart } from '../../components/admin/LifestyleChart'

interface Row {
  answers: AnamneseAnswers
  parq_alert: boolean
  signed_at: string | null
  clients: { name: string } | null
  establishments: { name: string } | null
}

/** Linhas em branco para o profissional anotar durante a entrevista presencial. */
function NoteLines({ count = 3 }: { count?: number }) {
  return (
    <div className="mt-2 space-y-4">
      {Array.from({ length: count }, (_, i) => (
        <div key={i} className="border-b border-gray-300 h-4" />
      ))}
    </div>
  )
}

function PrintSection({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <section className="break-inside-avoid mb-6">
      <h2 className="font-display text-lg text-ink border-b-2 border-brand/30 pb-1 mb-2">{title}</h2>
      {children}
    </section>
  )
}

export default function AnamneseImprimir() {
  const { formId } = useParams<{ formId: string }>()
  const [row, setRow] = useState<Row | null>(null)
  const [loading, setLoading] = useState(true)
  const [notFound, setNotFound] = useState(false)

  useEffect(() => {
    if (!formId) return
    supabase
      .from('health_forms')
      .select('answers, parq_alert, signed_at, clients(name), establishments(name)')
      .eq('id', formId)
      .maybeSingle()
      .then(({ data, error }) => {
        if (error || !data) { setNotFound(true); setLoading(false); return }
        setRow(data as unknown as Row)
        setLoading(false)
      })
  }, [formId])

  if (loading) return <div className="p-10 text-center text-gray-400 text-sm">Carregando...</div>
  if (notFound || !row) return <div className="p-10 text-center text-gray-400 text-sm">Ficha não encontrada.</div>

  const a = row.answers ?? {}
  const now = new Date()

  return (
    <div className="min-h-screen bg-paper py-8 px-4 print:p-0 print:bg-white">
      <style>{`@media print { .no-print { display: none !important; } body { print-color-adjust: exact; -webkit-print-color-adjust: exact; } }`}</style>

      <div className="max-w-3xl mx-auto">
        <div className="no-print flex justify-end mb-4">
          <Button onClick={() => window.print()}>
            <Printer size={16} /> Imprimir
          </Button>
        </div>

        <div className="bg-white rounded-2xl print:rounded-none border border-gray-100 print:border-0 p-8 print:p-0">
          <header className="flex items-center justify-between border-b-2 border-brand pb-4 mb-6">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-brand flex items-center justify-center print:hidden">
                <HeartPulse size={20} className="text-white" />
              </div>
              <div>
                <h1 className="font-display text-2xl text-ink">Ficha de Anamnese</h1>
                <p className="text-xs text-gray-500">{row.establishments?.name}</p>
              </div>
            </div>
            <div className="text-right text-xs text-gray-500">
              {row.signed_at && (
                <p><strong>Preenchida em:</strong> {format(new Date(row.signed_at), "dd/MM/yyyy 'às' HH:mm", { locale: ptBR })}</p>
              )}
              <p><strong>Impresso em:</strong> {format(now, "dd/MM/yyyy 'às' HH:mm", { locale: ptBR })}</p>
            </div>
          </header>

          {row.parq_alert && (
            <div className="rounded-xl bg-amber-50 border-2 border-amber-400 px-4 py-3 text-sm text-amber-900 font-medium mb-6">
              ⚠ Alguma resposta do PAR-Q foi "Sim" — recomenda-se avaliação médica antes da prática.
            </div>
          )}

          <PrintSection title="Identificação">
            <p className="text-sm text-gray-800">
              <strong>{a.nome ?? row.clients?.name}</strong> {a.idade && `· ${a.idade} anos`} {a.sexo && `· ${a.sexo}`}
            </p>
            <p className="text-sm text-gray-600">{a.telefone} {a.email && `· ${a.email}`}</p>
            {(a.peso || a.altura) && <p className="text-sm text-gray-600">{a.peso && `${a.peso}kg`} {a.altura && `· ${a.altura}m`}</p>}
            {a.emerg_nome && <p className="text-sm text-gray-600">Emergência: {a.emerg_nome} — {a.emerg_telefone}</p>}
          </PrintSection>

          <PrintSection title="Perfil de estilo de vida">
            <LifestyleChart scores={computeLifestyleScores(a)} />
          </PrintSection>

          <PrintSection title="PAR-Q">
            <ul className="space-y-1">
              {PARQ_QUESTIONS.map((q, i) => {
                const v = a.parq?.[i]
                return (
                  <li key={i} className="text-sm text-gray-700 flex gap-2">
                    <span className={`font-semibold shrink-0 w-8 ${v ? 'text-amber-600' : 'text-gray-400'}`}>
                      {v === true ? 'Sim' : v === false ? 'Não' : '—'}
                    </span>
                    {q}
                  </li>
                )
              })}
            </ul>
          </PrintSection>

          <PrintSection title="Histórico de Saúde">
            {HEALTH_HISTORY.filter((h) => a.health?.[h.key]?.answer === true).length === 0 ? (
              <p className="text-sm text-gray-400">Nenhum item respondido "Sim".</p>
            ) : (
              <ul className="space-y-1">
                {HEALTH_HISTORY.filter((h) => a.health?.[h.key]?.answer === true).map((h) => (
                  <li key={h.key} className="text-sm text-gray-700">
                    <strong>{h.label}</strong>
                    {a.health?.[h.key]?.detail && <> — {a.health[h.key].detail}</>}
                  </li>
                ))}
              </ul>
            )}
          </PrintSection>

          <PrintSection title="Atividade física, hábitos e objetivos">
            <div className="grid grid-cols-2 gap-x-6 gap-y-1 text-sm text-gray-700">
              {a.condicionamento && <p><strong>Condicionamento:</strong> {a.condicionamento}</p>}
              {a.fumante && <p><strong>Fumante:</strong> {a.fumante}</p>}
              {a.alcool && <p><strong>Álcool:</strong> {a.alcool}</p>}
              {a.sono && <p><strong>Sono:</strong> {a.sono} {a.horas_sono && `(${a.horas_sono}h)`}</p>}
              {a.estresse && <p><strong>Estresse:</strong> {a.estresse}</p>}
              {a.rotina && <p><strong>Rotina:</strong> {a.rotina}</p>}
            </div>
            {a.experiencia_previa && <p className="text-sm text-gray-700 mt-2"><strong>Experiência prévia:</strong> {a.experiencia_previa}</p>}
            {a.limitacoes && <p className="text-sm text-gray-700 mt-1"><strong>Limitações:</strong> {a.limitacoes}</p>}
            {a.motivacao && <p className="text-sm text-gray-700 mt-2"><strong>Motivação:</strong> {a.motivacao}</p>}
            {a.objetivos && <p className="text-sm text-gray-700 mt-1"><strong>Objetivos:</strong> {a.objetivos}</p>}
            {a.receios && <p className="text-sm text-gray-700 mt-1"><strong>Receios:</strong> {a.receios}</p>}
          </PrintSection>

          <PrintSection title="Anotações da entrevista — avaliação postural">
            <NoteLines />
          </PrintSection>

          <PrintSection title="Anotações da entrevista — testes funcionais">
            <p className="text-xs text-gray-400 mb-1">Flexão de tronco, agachamento, equilíbrio unipodal, alcance de braços</p>
            <NoteLines />
          </PrintSection>

          <PrintSection title="Plano inicial de treino">
            <NoteLines count={4} />
          </PrintSection>

          <section className="break-inside-avoid grid grid-cols-2 gap-8 mt-10 pt-4">
            <div>
              <div className="border-b border-gray-800 h-10" />
              <p className="text-xs text-gray-500 mt-1">
                Assinatura do(a) aluno(a)/paciente
                {a.nome && <> — <strong>{a.nome}</strong></>}
                {' '}(ciente)
              </p>
            </div>
            <div>
              <div className="border-b border-gray-800 h-10" />
              <p className="text-xs text-gray-500 mt-1">Assinatura do(a) avaliador(a)/profissional responsável (ciente)</p>
            </div>
          </section>
        </div>
      </div>
    </div>
  )
}
