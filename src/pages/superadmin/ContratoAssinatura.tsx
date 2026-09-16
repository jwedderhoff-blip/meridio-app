import { useEffect, useState } from 'react'
import { useParams } from 'react-router-dom'
import { format } from 'date-fns'
import { ptBR } from 'date-fns/locale'
import { FileText, Printer } from 'lucide-react'
import { supabase } from '../../lib/supabase'
import { Button } from '../../components/ui/Button'
import { formatCurrency } from '../../lib/utils'

/**
 * Dados da CONTRATADA (Meridio). Preencher com a razão social, CNPJ/CPF e
 * endereço reais antes de usar o contrato para valer — enquanto não forem
 * preenchidos, o contrato imprime "A PREENCHER" nesses campos, bem visível,
 * pra nunca sair um documento com dado inventado.
 */
const PLATFORM = {
  name: 'Meridio',
  legalName: '', // Razão social / nome completo
  document: '', // CNPJ ou CPF
  address: '', // Endereço completo
  email: '',
  phone: '',
}

function platformField(v: string): string {
  return v.trim() || 'A PREENCHER'
}

interface Row {
  id: string
  status: string
  started_at: string
  expires_at: string | null
  establishments: {
    name: string
    address: string | null
    phone: string | null
    email: string | null
  } | null
  plans: {
    name: string
    description: string | null
    billing_type: 'monthly' | 'package' | 'por_agendamento'
    price_monthly: number
    billing_cycle_days: number | null
    price_package: number | null
    package_days: number | null
    max_services: number | null
    max_professionals: number | null
    max_appointments_per_month: number | null
    booking_fee_type: 'fixo' | 'percentual' | null
    booking_fee_value: number | null
    booking_fee_charge_to: 'cliente' | 'estabelecimento' | null
  } | null
}

const CYCLE_LABELS: Record<number, string> = { 30: 'mensal', 90: 'trimestral', 180: 'semestral', 365: 'anual' }

function planSummary(plan: Row['plans']): { price: string; cadence: string } {
  if (!plan) return { price: '—', cadence: '—' }
  if (plan.billing_type === 'por_agendamento') {
    const v = plan.booking_fee_type === 'percentual'
      ? `${plan.booking_fee_value ?? 0}%`
      : formatCurrency(Number(plan.booking_fee_value ?? 0))
    const quem = plan.booking_fee_charge_to === 'cliente' ? 'repassada ao cliente final' : 'descontada do estabelecimento'
    return { price: v, cadence: `por atendimento concluído, ${quem}` }
  }
  if (plan.billing_type === 'package') {
    const v = !plan.price_package ? 'Grátis' : formatCurrency(plan.price_package)
    return { price: v, cadence: plan.package_days ? `pacote válido por ${plan.package_days} dias` : 'pacote avulso' }
  }
  const v = plan.price_monthly === 0 ? 'Grátis' : formatCurrency(plan.price_monthly)
  const days = plan.billing_cycle_days ?? 30
  const cycle = CYCLE_LABELS[days] ?? `a cada ${days} dias`
  const months = Math.max(1, Math.round(days / 30))
  const total = plan.price_monthly * months
  return {
    price: v,
    cadence: days === 30
      ? 'por mês, cobrança mensal'
      : `por mês, cobrança ${cycle} (${formatCurrency(total)} a cada ${days} dias)`,
  }
}

function limitLine(n: number | null, label: string): string {
  return n == null ? `${label}: ilimitado` : `${label}: até ${n}`
}

export default function ContratoAssinatura() {
  const { subscriptionId } = useParams<{ subscriptionId: string }>()
  const [row, setRow] = useState<Row | null>(null)
  const [loading, setLoading] = useState(true)
  const [notFound, setNotFound] = useState(false)

  // Contrato sempre em fundo claro, mesmo com o painel no tema escuro.
  useEffect(() => {
    const previous = document.documentElement.getAttribute('data-theme')
    document.documentElement.setAttribute('data-theme', 'light')
    return () => {
      if (previous) document.documentElement.setAttribute('data-theme', previous)
      else document.documentElement.removeAttribute('data-theme')
    }
  }, [])

  useEffect(() => {
    if (!subscriptionId) return
    supabase
      .from('subscriptions')
      .select('id, status, started_at, expires_at, establishments(name, address, phone, email), plans(name, description, billing_type, price_monthly, billing_cycle_days, price_package, package_days, max_services, max_professionals, max_appointments_per_month, booking_fee_type, booking_fee_value, booking_fee_charge_to)')
      .eq('id', subscriptionId)
      .maybeSingle()
      .then(({ data, error }) => {
        if (error || !data || !data.plans) { setNotFound(true); setLoading(false); return }
        setRow(data as unknown as Row)
        setLoading(false)
      })
  }, [subscriptionId])

  if (loading) return <div className="p-10 text-center text-gray-400 text-sm">Carregando...</div>
  if (notFound || !row) return <div className="p-10 text-center text-gray-400 text-sm">Contrato não encontrado (a assinatura precisa ter um plano atribuído).</div>

  const now = new Date()
  const est = row.establishments
  const plan = row.plans!
  const summary = planSummary(plan)
  const numero = row.id.slice(0, 8).toUpperCase()

  const limits = [
    limitLine(plan.max_services, 'Serviços cadastrados'),
    limitLine(plan.max_professionals, 'Profissionais'),
    limitLine(plan.max_appointments_per_month, 'Agendamentos por mês'),
  ]

  return (
    <div className="min-h-screen bg-paper py-8 px-4 print:p-0 print:bg-white">
      <style>{`
        :root { color-scheme: light; }
        @media print {
          .no-print { display: none !important; }
          html, body { background: #fff !important; color-scheme: light !important; }
          body { print-color-adjust: exact; -webkit-print-color-adjust: exact; }
        }
      `}</style>

      <div className="max-w-2xl mx-auto">
        <div className="no-print flex justify-end mb-4">
          <Button onClick={() => window.print()}>
            <Printer size={16} /> Imprimir
          </Button>
        </div>

        <div className="bg-white rounded-2xl print:rounded-none border border-gray-100 print:border-0 p-8 print:p-10 text-sm text-gray-800 leading-relaxed">
          <header className="flex items-center justify-between border-b-2 border-brand pb-4 mb-8">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-brand flex items-center justify-center print:hidden">
                <FileText size={20} className="text-white" />
              </div>
              <div>
                <h1 className="font-display text-xl text-ink">Contrato de Prestação de Serviços</h1>
                <p className="text-xs text-gray-500">Plataforma {PLATFORM.name} — assinatura Nº {numero}</p>
              </div>
            </div>
          </header>

          <p className="mb-6">
            Pelo presente instrumento particular, de um lado{' '}
            <strong>{platformField(PLATFORM.legalName || PLATFORM.name)}</strong>, inscrita no CNPJ/CPF sob o nº{' '}
            <strong>{platformField(PLATFORM.document)}</strong>, com endereço em{' '}
            <strong>{platformField(PLATFORM.address)}</strong>, doravante denominada <strong>CONTRATADA</strong>, e de
            outro lado <strong>{est?.name ?? 'A PREENCHER'}</strong>, com endereço em{' '}
            <strong>{est?.address || 'A PREENCHER'}</strong>, contato{' '}
            <strong>{[est?.phone, est?.email].filter(Boolean).join(' · ') || 'A PREENCHER'}</strong>, doravante
            denominado(a) <strong>CONTRATANTE</strong>, têm entre si justo e contratado o seguinte:
          </p>

          <section className="mb-5">
            <h2 className="font-semibold text-ink mb-1">1. Objeto</h2>
            <p>
              A CONTRATADA disponibiliza à CONTRATANTE o uso da plataforma {PLATFORM.name} para gestão de
              agendamentos, clientes e demais funcionalidades do plano descrito na cláusula 2, mediante o pagamento
              do valor ali estipulado.
            </p>
          </section>

          <section className="mb-5">
            <h2 className="font-semibold text-ink mb-1">2. Plano contratado</h2>
            <p><strong>{plan.name}</strong>{plan.description ? ` — ${plan.description}` : ''}</p>
            <p className="mt-1">
              Valor: <strong>{summary.price}</strong>, {summary.cadence}.
            </p>
            <ul className="list-disc pl-5 mt-1">
              {limits.map((l) => <li key={l}>{l}</li>)}
            </ul>
          </section>

          <section className="mb-5">
            <h2 className="font-semibold text-ink mb-1">3. Vigência</h2>
            <p>
              Início em <strong>{format(new Date(row.started_at), "dd/MM/yyyy", { locale: ptBR })}</strong>
              {row.expires_at && (
                <> , com renovação prevista para <strong>{format(new Date(row.expires_at), "dd/MM/yyyy", { locale: ptBR })}</strong></>
              )}
              . A renovação é automática ao final de cada ciclo, mediante a confirmação do pagamento pela
              CONTRATADA, podendo qualquer das partes optar pelo não-cancelamento com aviso prévio, conforme
              cláusula 6.
            </p>
          </section>

          <section className="mb-5">
            <h2 className="font-semibold text-ink mb-1">4. Forma de pagamento</h2>
            <p>
              O pagamento é realizado diretamente entre as partes (Pix, transferência ou outro meio combinado),
              na periodicidade descrita na cláusula 2, não havendo cobrança automática recorrente pela plataforma.
            </p>
          </section>

          <section className="mb-5">
            <h2 className="font-semibold text-ink mb-1">5. Obrigações das partes</h2>
            <p>
              A CONTRATADA compromete-se a manter a plataforma disponível e operante, salvo manutenções
              programadas ou eventos fora de seu controle, e a proteger os dados da CONTRATANTE conforme a
              Lei Geral de Proteção de Dados (LGPD). A CONTRATANTE compromete-se a fornecer informações
              verdadeiras, manter o pagamento em dia e utilizar a plataforma de acordo com sua finalidade.
            </p>
          </section>

          <section className="mb-5">
            <h2 className="font-semibold text-ink mb-1">6. Rescisão</h2>
            <p>
              Qualquer das partes pode rescindir este contrato a qualquer momento, mediante aviso prévio de 15
              (quinze) dias, sem multa, respeitados os valores já pagos referentes ao ciclo vigente.
            </p>
          </section>

          <section className="mb-8">
            <h2 className="font-semibold text-ink mb-1">7. Foro</h2>
            <p>
              Fica eleito o foro da comarca do domicílio da CONTRATADA para dirimir quaisquer dúvidas oriundas
              deste contrato.
            </p>
          </section>

          <p className="text-xs text-gray-400 mb-10">
            Documento gerado em {format(now, "dd/MM/yyyy 'às' HH:mm", { locale: ptBR })} — modelo padrão, sem
            validação jurídica específica para o seu negócio. Recomenda-se revisão por um advogado antes do uso
            formal.
          </p>

          <div className="grid grid-cols-2 gap-8 mt-4">
            <div>
              <div className="border-b border-gray-800 h-10" />
              <p className="text-xs text-gray-500 mt-1 text-center">
                CONTRATADA — {PLATFORM.name}
              </p>
            </div>
            <div>
              <div className="border-b border-gray-800 h-10" />
              <p className="text-xs text-gray-500 mt-1 text-center">
                CONTRATANTE — {est?.name ?? ''}
              </p>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
