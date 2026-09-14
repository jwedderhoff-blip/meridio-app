import { useEffect, useState } from 'react'
import { useParams } from 'react-router-dom'
import { format } from 'date-fns'
import { ptBR } from 'date-fns/locale'
import { Wallet, Printer } from 'lucide-react'
import { supabase } from '../../lib/supabase'
import { Button } from '../../components/ui/Button'
import { formatCurrency } from '../../lib/utils'
import { valorPorExtenso } from '../../lib/valorPorExtenso'
import { METHOD_LABELS, KIND_LABELS, type CashKind, type PaymentMethod } from '../../hooks/useCaixa'

interface Row {
  id: string
  kind: CashKind
  description: string | null
  amount: number
  method: PaymentMethod
  operator_email: string | null
  created_at: string
  clients: { name: string; phone: string } | null
  establishments: { name: string; address: string | null; phone: string | null; email: string | null } | null
}

export default function CaixaRecibo() {
  const { movementId } = useParams<{ movementId: string }>()
  const [row, setRow] = useState<Row | null>(null)
  const [loading, setLoading] = useState(true)
  const [notFound, setNotFound] = useState(false)

  // Recibo sempre em fundo claro, mesmo com o painel no tema escuro (o
  // atributo fica na <html> e persiste entre abas/rotas).
  useEffect(() => {
    const previous = document.documentElement.getAttribute('data-theme')
    document.documentElement.setAttribute('data-theme', 'light')
    return () => {
      if (previous) document.documentElement.setAttribute('data-theme', previous)
      else document.documentElement.removeAttribute('data-theme')
    }
  }, [])

  useEffect(() => {
    if (!movementId) return
    supabase
      .from('cash_movements')
      .select('id, kind, description, amount, method, operator_email, created_at, clients(name, phone), establishments(name, address, phone, email)')
      .eq('id', movementId)
      .maybeSingle()
      .then(({ data, error }) => {
        if (error || !data) { setNotFound(true); setLoading(false); return }
        setRow(data as unknown as Row)
        setLoading(false)
      })
  }, [movementId])

  if (loading) return <div className="p-10 text-center text-gray-400 text-sm">Carregando...</div>
  if (notFound || !row) return <div className="p-10 text-center text-gray-400 text-sm">Recibo não encontrado.</div>

  const now = new Date()
  const dataMovimento = new Date(row.created_at)
  const numero = row.id.slice(0, 8).toUpperCase()
  const descricao = row.description || KIND_LABELS[row.kind]

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

        <div className="bg-white rounded-2xl print:rounded-none border border-gray-100 print:border-0 p-8 print:p-10">
          <header className="flex items-center justify-between border-b-2 border-brand pb-4 mb-8">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-brand flex items-center justify-center print:hidden">
                <Wallet size={20} className="text-white" />
              </div>
              <div>
                <h1 className="font-display text-2xl text-ink">{row.establishments?.name}</h1>
                <p className="text-xs text-gray-500">
                  {[row.establishments?.address, row.establishments?.phone, row.establishments?.email].filter(Boolean).join(' · ')}
                </p>
              </div>
            </div>
            <div className="text-right">
              <p className="font-display text-lg text-ink">RECIBO</p>
              <p className="text-xs text-gray-500">Nº {numero}</p>
            </div>
          </header>

          <p className="text-3xl font-display text-ink mb-1">{formatCurrency(Number(row.amount))}</p>
          <p className="text-sm text-gray-600 mb-8 capitalize">({valorPorExtenso(Number(row.amount))})</p>

          <p className="text-sm text-gray-800 leading-relaxed mb-8">
            Recebi de <strong>{row.clients?.name ?? 'Cliente avulso'}</strong>
            {row.clients?.phone && <> ({row.clients.phone})</>}, a quantia acima referente a{' '}
            <strong>{descricao}</strong>, paga via <strong>{METHOD_LABELS[row.method]}</strong>, para clareza firmo
            o presente recibo.
          </p>

          <div className="grid grid-cols-2 gap-6 text-sm text-gray-600 mb-10">
            <p><strong>Data do pagamento:</strong> {format(dataMovimento, "dd/MM/yyyy 'às' HH:mm", { locale: ptBR })}</p>
            <p><strong>Forma de pagamento:</strong> {METHOD_LABELS[row.method]}</p>
            {row.operator_email && <p><strong>Atendido por:</strong> {row.operator_email}</p>}
            <p><strong>Recibo emitido em:</strong> {format(now, "dd/MM/yyyy 'às' HH:mm", { locale: ptBR })}</p>
          </div>

          <div className="grid grid-cols-2 gap-8 mt-12">
            <div>
              <p className="text-center text-sm text-gray-700">{row.establishments?.address || row.establishments?.name}</p>
              <p className="text-center text-xs text-gray-400">
                {format(now, "dd 'de' MMMM 'de' yyyy", { locale: ptBR })}
              </p>
            </div>
            <div>
              <div className="border-b border-gray-800 h-10" />
              <p className="text-xs text-gray-500 mt-1 text-center">
                Assinatura — {row.establishments?.name}
              </p>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
