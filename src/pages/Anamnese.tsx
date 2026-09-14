import { useEffect, useState } from 'react'
import { useParams } from 'react-router-dom'
import { HeartPulse, CheckCircle2, AlertTriangle } from 'lucide-react'
import { supabase } from '../lib/supabase'
import { Button } from '../components/ui/Button'
import {
  PARQ_QUESTIONS, HEALTH_HISTORY, CONDICIONAMENTO_OPTIONS, FUMANTE_OPTIONS,
  ALCOOL_OPTIONS, SONO_OPTIONS, ESTRESSE_OPTIONS, ROTINA_OPTIONS,
  type AnamneseAnswers,
} from '../lib/anamnese'

const inputCls =
  'w-full rounded-xl border border-gray-200 px-3 py-2.5 text-sm text-gray-900 placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-brand/20 focus:border-brand'

function Section({ title, intro, children }: { title: string; intro?: string; children: React.ReactNode }) {
  return (
    <section className="bg-white rounded-2xl border border-gray-100 p-5 sm:p-6 space-y-4">
      <div>
        <h2 className="font-display text-xl text-ink">{title}</h2>
        {intro && <p className="text-xs text-gray-500 mt-1 leading-relaxed">{intro}</p>}
      </div>
      {children}
    </section>
  )
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div className="flex flex-col gap-1">
      <label className="text-sm font-medium text-gray-700">{label}</label>
      {children}
    </div>
  )
}

function ChoiceGroup({ options, value, onChange }: { options: string[]; value?: string; onChange: (v: string) => void }) {
  return (
    <div className="flex flex-wrap gap-2">
      {options.map((opt) => (
        <button
          key={opt}
          type="button"
          onClick={() => onChange(opt)}
          className={`text-sm px-3 py-1.5 rounded-full border transition ${
            value === opt ? 'bg-brand text-white border-brand' : 'bg-white text-gray-600 border-gray-200 hover:border-brand/40'
          }`}
        >
          {opt}
        </button>
      ))}
    </div>
  )
}

export default function Anamnese() {
  const { token } = useParams<{ token: string }>()
  const [loading, setLoading] = useState(true)
  const [notFound, setNotFound] = useState(false)
  const [clientName, setClientName] = useState('')
  const [establishmentName, setEstablishmentName] = useState('')
  const [alreadyDone, setAlreadyDone] = useState(false)

  const [a, setA] = useState<AnamneseAnswers>({ parq: Array(PARQ_QUESTIONS.length).fill(null), health: {} })
  const [signature, setSignature] = useState('')
  const [agree, setAgree] = useState(false)
  const [submitting, setSubmitting] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [done, setDone] = useState(false)

  useEffect(() => {
    if (!token) return
    supabase.rpc('get_health_form_by_token', { p_token: token }).then(({ data, error }) => {
      const row = Array.isArray(data) ? data[0] : data
      if (error || !row) { setNotFound(true); setLoading(false); return }
      setClientName(row.client_name ?? '')
      setEstablishmentName(row.establishment_name ?? '')
      if (row.status === 'preenchida') setAlreadyDone(true)
      if (row.answers) setA({ parq: Array(PARQ_QUESTIONS.length).fill(null), health: {}, ...row.answers })
      setLoading(false)
    })
  }, [token])

  const setField = <K extends keyof AnamneseAnswers>(key: K, value: AnamneseAnswers[K]) =>
    setA((prev) => ({ ...prev, [key]: value }))

  const setHealth = (key: string, checked: boolean, detail?: string) =>
    setA((prev) => ({ ...prev, health: { ...prev.health, [key]: { checked, detail: detail ?? prev.health?.[key]?.detail } } }))

  const setParq = (i: number, value: boolean) =>
    setA((prev) => {
      const next = [...(prev.parq ?? Array(PARQ_QUESTIONS.length).fill(null))]
      next[i] = value
      return { ...prev, parq: next }
    })

  const submit = async () => {
    if (!token) return
    if (!a.nome?.trim() || !a.telefone?.trim()) {
      setError('Preencha ao menos nome e telefone.')
      return
    }
    if (!agree || !signature.trim()) {
      setError('Confirme a declaração e digite seu nome como assinatura para concluir.')
      return
    }
    setSubmitting(true)
    setError(null)
    const parqAlert = (a.parq ?? []).some((v) => v === true)
    const { error: err } = await supabase.rpc('submit_health_form', {
      p_token: token,
      p_answers: a,
      p_signature_name: signature,
      p_parq_alert: parqAlert,
    })
    setSubmitting(false)
    if (err) { setError(err.message); return }
    setDone(true)
  }

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-paper">
        <div className="w-8 h-8 rounded-full border-2 border-brand border-t-transparent animate-spin" />
      </div>
    )
  }

  if (notFound) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-paper p-6">
        <div className="max-w-sm text-center">
          <h1 className="font-display text-2xl text-ink mb-2">Link inválido</h1>
          <p className="text-sm text-gray-500">Este link de anamnese não existe ou expirou. Peça um novo link ao estabelecimento.</p>
        </div>
      </div>
    )
  }

  if (done || alreadyDone) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-paper p-6">
        <div className="max-w-sm text-center bg-white rounded-2xl border border-gray-100 p-8">
          <CheckCircle2 size={40} className="text-green-600 mx-auto mb-4" />
          <h1 className="font-display text-2xl text-ink mb-2">Ficha recebida</h1>
          <p className="text-sm text-gray-500">
            {done
              ? 'Obrigado! Suas informações foram enviadas com sucesso.'
              : 'Esta ficha já foi preenchida. Se precisar atualizar algo, fale com a equipe.'}
          </p>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-paper py-8 px-4">
      <div className="max-w-2xl mx-auto space-y-6">
        <header className="text-center space-y-2">
          <div className="w-12 h-12 rounded-2xl bg-brand flex items-center justify-center mx-auto">
            <HeartPulse size={22} className="text-white" />
          </div>
          <h1 className="font-display text-3xl text-ink">Ficha de Anamnese</h1>
          <p className="text-sm text-gray-500">
            {establishmentName ? `${establishmentName} — ` : ''}Avaliação para início de atividade física
          </p>
          <p className="text-xs text-gray-400 max-w-md mx-auto leading-relaxed">
            Preencha você mesmo(a), antes da sua avaliação inicial. As informações são confidenciais e servem
            só para orientar um programa de exercícios seguro para o seu perfil.
            {clientName && <> Cadastro: <strong>{clientName}</strong>.</>}
          </p>
        </header>

        <Section title="1. Identificação">
          <Field label="Nome completo">
            <input className={inputCls} value={a.nome ?? ''} onChange={(e) => setField('nome', e.target.value)} />
          </Field>
          <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
            <Field label="Nascimento">
              <input type="date" className={inputCls} value={a.nascimento ?? ''} onChange={(e) => setField('nascimento', e.target.value)} />
            </Field>
            <Field label="Idade">
              <input type="number" className={inputCls} value={a.idade ?? ''} onChange={(e) => setField('idade', e.target.value)} />
            </Field>
            <Field label="Sexo">
              <select className={inputCls} value={a.sexo ?? ''} onChange={(e) => setField('sexo', e.target.value)}>
                <option value=""></option>
                <option>Feminino</option>
                <option>Masculino</option>
                <option>Outro</option>
              </select>
            </Field>
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <Field label="Telefone / WhatsApp">
              <input className={inputCls} value={a.telefone ?? ''} onChange={(e) => setField('telefone', e.target.value)} />
            </Field>
            <Field label="E-mail">
              <input className={inputCls} value={a.email ?? ''} onChange={(e) => setField('email', e.target.value)} />
            </Field>
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
            <Field label="Profissão">
              <input className={inputCls} value={a.profissao ?? ''} onChange={(e) => setField('profissao', e.target.value)} />
            </Field>
            <Field label="Peso (kg)">
              <input type="number" step="0.1" className={inputCls} value={a.peso ?? ''} onChange={(e) => setField('peso', e.target.value)} />
            </Field>
            <Field label="Altura (m)">
              <input type="number" step="0.01" className={inputCls} value={a.altura ?? ''} onChange={(e) => setField('altura', e.target.value)} />
            </Field>
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <Field label="Contato de emergência (nome)">
              <input className={inputCls} value={a.emerg_nome ?? ''} onChange={(e) => setField('emerg_nome', e.target.value)} />
            </Field>
            <Field label="Telefone de emergência">
              <input className={inputCls} value={a.emerg_telefone ?? ''} onChange={(e) => setField('emerg_telefone', e.target.value)} />
            </Field>
          </div>
        </Section>

        <Section
          title="2. Questionário de Prontidão (PAR-Q)"
          intro='Questionário validado, usado em academias e estúdios de pilates para triagem de risco. Se responder "Sim" a alguma pergunta, é recomendável passar por avaliação médica antes de iniciar a prática.'
        >
          <div className="space-y-3">
            {PARQ_QUESTIONS.map((q, i) => (
              <div key={i} className="flex items-start justify-between gap-3 border-b border-gray-50 pb-3 last:border-0">
                <p className="text-sm text-gray-700 flex-1">{i + 1}. {q}</p>
                <div className="flex gap-2 shrink-0">
                  {(['Sim', 'Não'] as const).map((label, idx) => {
                    const v = idx === 0
                    const selected = a.parq?.[i] === v
                    return (
                      <button
                        key={label}
                        type="button"
                        onClick={() => setParq(i, v)}
                        className={`text-xs px-3 py-1.5 rounded-full border transition ${
                          selected ? (v ? 'bg-amber-500 text-white border-amber-500' : 'bg-brand text-white border-brand') : 'bg-white text-gray-500 border-gray-200'
                        }`}
                      >
                        {label}
                      </button>
                    )
                  })}
                </div>
              </div>
            ))}
          </div>
          <Field label="Caso tenha respondido 'Sim' a alguma pergunta, comente aqui">
            <textarea rows={2} className={inputCls} value={a.parq_comentario ?? ''} onChange={(e) => setField('parq_comentario', e.target.value)} />
          </Field>
        </Section>

        <Section title="3. Histórico de Saúde">
          {HEALTH_HISTORY.map((h) => (
            <div key={h.key} className="space-y-1.5">
              <label className="flex items-start gap-2 text-sm text-gray-700 cursor-pointer">
                <input
                  type="checkbox"
                  className="mt-0.5"
                  checked={a.health?.[h.key]?.checked ?? false}
                  onChange={(e) => setHealth(h.key, e.target.checked)}
                />
                {h.label}
              </label>
              {a.health?.[h.key]?.checked && (
                <input
                  className={inputCls}
                  placeholder={h.detailPlaceholder}
                  value={a.health?.[h.key]?.detail ?? ''}
                  onChange={(e) => setHealth(h.key, true, e.target.value)}
                />
              )}
            </div>
          ))}
        </Section>

        <Section title="4. Histórico de Atividade Física">
          <Field label="Pratica ou já praticou atividade física regularmente? Qual(is), por quanto tempo e com que frequência?">
            <textarea rows={2} className={inputCls} value={a.hist_atividade ?? ''} onChange={(e) => setField('hist_atividade', e.target.value)} />
          </Field>
          <Field label="Há quanto tempo está sem praticar atividade física (se aplicável)?">
            <input className={inputCls} value={a.tempo_sedentarismo ?? ''} onChange={(e) => setField('tempo_sedentarismo', e.target.value)} />
          </Field>
          <Field label="Nível de condicionamento físico atual">
            <ChoiceGroup options={CONDICIONAMENTO_OPTIONS} value={a.condicionamento} onChange={(v) => setField('condicionamento', v)} />
          </Field>
          <Field label="Já praticou pilates e/ou musculação/lutas antes? Experiência e observações">
            <textarea rows={2} className={inputCls} value={a.experiencia_previa ?? ''} onChange={(e) => setField('experiencia_previa', e.target.value)} />
          </Field>
          <Field label="Possui alguma limitação de movimento ou dificuldade específica que o profissional deva conhecer?">
            <textarea rows={2} className={inputCls} value={a.limitacoes ?? ''} onChange={(e) => setField('limitacoes', e.target.value)} />
          </Field>
        </Section>

        <Section title="5. Hábitos de Vida">
          <Field label="Fumante?">
            <ChoiceGroup options={FUMANTE_OPTIONS} value={a.fumante} onChange={(v) => setField('fumante', v)} />
          </Field>
          <Field label="Consome bebida alcoólica?">
            <ChoiceGroup options={ALCOOL_OPTIONS} value={a.alcool} onChange={(v) => setField('alcool', v)} />
          </Field>
          <Field label="Qualidade de sono">
            <ChoiceGroup options={SONO_OPTIONS} value={a.sono} onChange={(v) => setField('sono', v)} />
          </Field>
          <Field label="Horas de sono por noite">
            <input type="number" className={inputCls} value={a.horas_sono ?? ''} onChange={(e) => setField('horas_sono', e.target.value)} />
          </Field>
          <Field label="Nível de estresse no dia a dia">
            <ChoiceGroup options={ESTRESSE_OPTIONS} value={a.estresse} onChange={(v) => setField('estresse', v)} />
          </Field>
          <Field label="Rotina de trabalho">
            <ChoiceGroup options={ROTINA_OPTIONS} value={a.rotina} onChange={(v) => setField('rotina', v)} />
          </Field>
          <Field label="Ingestão diária de água (litros, aproximado)">
            <input type="number" step="0.1" className={inputCls} value={a.agua ?? ''} onChange={(e) => setField('agua', e.target.value)} />
          </Field>
        </Section>

        <Section title="6. Objetivos e Queixa Principal">
          <Field label="O que motivou a procura por esta atividade?">
            <textarea rows={2} className={inputCls} value={a.motivacao ?? ''} onChange={(e) => setField('motivacao', e.target.value)} />
          </Field>
          <Field label="Principais objetivos com a prática">
            <textarea rows={2} className={inputCls} value={a.objetivos ?? ''} onChange={(e) => setField('objetivos', e.target.value)} />
          </Field>
          <Field label="Há alguma expectativa, receio ou restrição pessoal que gostaria de relatar?">
            <textarea rows={2} className={inputCls} value={a.receios ?? ''} onChange={(e) => setField('receios', e.target.value)} />
          </Field>
        </Section>

        <Section title="7. Declaração e Consentimento">
          <p className="text-xs text-gray-500 leading-relaxed">
            Declaro que as informações prestadas neste formulário são verdadeiras e completas, e estou ciente de
            que devo comunicar imediatamente ao profissional responsável qualquer alteração no meu estado de
            saúde. Estou ciente de que, caso tenha respondido "Sim" a alguma pergunta do PAR-Q, é recomendável
            buscar avaliação médica antes de iniciar ou continuar a prática de atividade física.
          </p>
          <label className="flex items-start gap-2 text-sm text-gray-700 cursor-pointer">
            <input type="checkbox" className="mt-0.5" checked={agree} onChange={(e) => setAgree(e.target.checked)} />
            Li e concordo com a declaração acima
          </label>
          <Field label="Assinatura (digite seu nome completo)">
            <input className={inputCls} value={signature} onChange={(e) => setSignature(e.target.value)} placeholder="Nome completo" />
          </Field>
        </Section>

        {error && (
          <div className="rounded-xl bg-red-50 border border-red-200 px-4 py-3 text-sm text-red-700 flex items-center gap-2">
            <AlertTriangle size={16} className="shrink-0" /> {error}
          </div>
        )}

        <Button onClick={submit} loading={submitting} className="w-full" size="lg">
          Enviar ficha
        </Button>
      </div>
    </div>
  )
}
