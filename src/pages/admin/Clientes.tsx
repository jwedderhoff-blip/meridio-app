import { useEffect, useState } from 'react'
import { format, startOfMonth, endOfMonth } from 'date-fns'
import { ptBR } from 'date-fns/locale'
import { Search, Download, User, ChevronDown, ChevronUp, MessageCircle, Calendar, GraduationCap, Wallet, Check, RotateCcw, Trash2, UserPlus, Merge, Pencil } from 'lucide-react'
import { useAuth } from '../../context/AuthContext'
import { useEstablishment } from '../../hooks/useEstablishment'
import { useClients } from '../../hooks/useClients'
import { useClientFinance } from '../../hooks/useMemberships'
import { supabase } from '../../lib/supabase'
import { isDemo } from '../../lib/isDemo'
import { mockAppointments } from '../../lib/mockData'
import { Input } from '../../components/ui/Input'
import { Button } from '../../components/ui/Button'
import { Badge } from '../../components/ui/Badge'
import { formatPhone, formatCurrency } from '../../lib/utils'
import NewClientModal from '../../components/admin/NewClientModal'
import MergeClientsModal from '../../components/admin/MergeClientsModal'
import EditClientModal from '../../components/admin/EditClientModal'
import type { Appointment, Client } from '../../types'

function useClientAppointments(clientId: string | null, establishmentId: string | undefined, month: string) {
  const [appointments, setAppointments] = useState<Appointment[]>([])
  const [loading, setLoading] = useState(false)

  useEffect(() => {
    if (!clientId || !establishmentId) return
    setLoading(true)

    if (isDemo) {
      const filtered = mockAppointments.filter(
        (a) => a.client_id === clientId && a.starts_at.startsWith(month)
      )
      setAppointments(filtered as Appointment[])
      setLoading(false)
      return
    }

    const start = startOfMonth(new Date(`${month}-01`)).toISOString()
    const end = endOfMonth(new Date(`${month}-01`)).toISOString()

    supabase
      .from('appointments')
      .select('*, service:services(name, price), professional:professionals(name)')
      .eq('establishment_id', establishmentId)
      .eq('client_id', clientId)
      .gte('starts_at', start)
      .lte('starts_at', end)
      .order('starts_at', { ascending: false })
      .then(({ data }) => {
        setAppointments((data ?? []) as Appointment[])
        setLoading(false)
      })
  }, [clientId, establishmentId, month])

  return { appointments, loading }
}

function ClientRow({
  client,
  establishmentId,
  onDelete,
  onEdit,
}: {
  client: Client
  establishmentId: string | undefined
  onDelete?: (id: string) => Promise<{ error: string | null }>
  onEdit?: (client: Client) => void
}) {
  const [open, setOpen] = useState(false)
  const [deleteErr, setDeleteErr] = useState<string | null>(null)
  const [deleting, setDeleting] = useState(false)

  const handleDelete = async (e: React.MouseEvent) => {
    e.stopPropagation()
    if (!onDelete) return
    if (!confirm(`Excluir o cadastro de ${client.name}? Esta ação não pode ser desfeita.`)) return
    setDeleting(true)
    setDeleteErr(null)
    const { error } = await onDelete(client.id)
    if (error) setDeleteErr(error)
    setDeleting(false)
  }
  const [month, setMonth] = useState(() => format(new Date(), 'yyyy-MM'))
  const { appointments, loading } = useClientAppointments(open ? client.id : null, establishmentId, month)
  const { memberships, charges, markPaid, markPending } = useClientFinance(establishmentId, open ? client.id : null)

  const emAberto = charges.filter((c) => c.status === 'pendente').reduce((s, c) => s + Number(c.amount), 0)
  const refFmt = (iso: string) => {
    const [y, mo] = iso.split('-')
    return `${['jan','fev','mar','abr','mai','jun','jul','ago','set','out','nov','dez'][Number(mo) - 1]}/${y.slice(2)}`
  }

  const totalPago = appointments
    .filter((a) => a.payment_status === 'pago')
    .reduce((sum, a) => {
      const svc = a.service as { price?: number } | undefined
      return sum + (svc?.price ?? 0)
    }, 0)

  const totalPendente = appointments
    .filter((a) => a.payment_status !== 'pago' && a.status !== 'cancelado')
    .reduce((sum, a) => {
      const svc = a.service as { price?: number } | undefined
      return sum + (svc?.price ?? 0)
    }, 0)

  return (
    <li className="divide-y divide-gray-50">
      <div
        className="flex items-center gap-4 p-4 cursor-pointer hover:bg-gray-50 transition"
        onClick={() => setOpen((v) => !v)}
      >
        <div className="w-10 h-10 rounded-full bg-brand-soft flex items-center justify-center shrink-0">
          <User size={18} className="text-brand" />
        </div>
        <div className="flex-1 min-w-0">
          <p className="text-sm font-semibold text-gray-900">{client.name}</p>
          <div className="flex items-center gap-2 mt-0.5">
            <a
              href={`https://wa.me/55${client.phone.replace(/\D/g, '')}`}
              target="_blank"
              rel="noreferrer"
              onClick={(e) => e.stopPropagation()}
              className="flex items-center gap-1 text-xs text-green-600 font-medium hover:underline"
            >
              <MessageCircle size={12} />
              {formatPhone(client.phone)}
            </a>
            {client.email && (
              <span className="text-xs text-gray-400">· {client.email}</span>
            )}
          </div>
        </div>
        <div className="flex items-center gap-3">
          <p className="text-xs text-gray-400 hidden sm:block">
            desde {format(new Date(client.created_at), "d 'de' MMM yyyy", { locale: ptBR })}
          </p>
          {onEdit && (
            <button
              onClick={(e) => { e.stopPropagation(); onEdit(client) }}
              title="Editar cliente"
              className="p-1.5 rounded-lg text-gray-300 hover:text-indigo-600 hover:bg-indigo-50 transition"
            >
              <Pencil size={15} />
            </button>
          )}
          {onDelete && (
            <button
              onClick={handleDelete}
              disabled={deleting}
              title="Excluir cliente"
              className="p-1.5 rounded-lg text-gray-300 hover:text-red-600 hover:bg-red-50 transition disabled:opacity-40"
            >
              <Trash2 size={15} />
            </button>
          )}
          {open ? <ChevronUp size={16} className="text-gray-400" /> : <ChevronDown size={16} className="text-gray-400" />}
        </div>
      </div>

      {deleteErr && (
        <div className="px-4 pb-3 -mt-1">
          <p className="text-xs text-red-600 bg-red-50 rounded-lg px-3 py-2">{deleteErr}</p>
        </div>
      )}

      {open && (
        <div className="bg-gray-50 px-4 pb-4 pt-3">
          <div className="flex items-center justify-between mb-3 flex-wrap gap-2">
            <div className="flex items-center gap-2">
              <Calendar size={14} className="text-gray-400" />
              <span className="text-xs font-medium text-gray-600">Histórico de reservas</span>
            </div>
            <input
              type="month"
              value={month}
              onChange={(e) => setMonth(e.target.value)}
              className="text-xs border border-gray-200 rounded-lg px-2 py-1 bg-white focus:outline-none focus:ring-2 focus:ring-brand/20"
            />
          </div>

          {loading ? (
            <p className="text-xs text-gray-400 py-2">Carregando...</p>
          ) : appointments.length === 0 ? (
            <p className="text-xs text-gray-400 py-2">Nenhuma reserva neste período.</p>
          ) : (
            <>
              <div className="space-y-2 mb-3">
                {appointments.map((a) => {
                  const svc = a.service as { name?: string; price?: number } | undefined
                  const pro = a.professional as { name?: string } | undefined
                  return (
                    <div key={a.id} className="bg-white rounded-xl border border-gray-100 p-3 flex items-center justify-between gap-3">
                      <div className="flex-1 min-w-0">
                        <p className="text-xs font-semibold text-gray-800">
                          {format(new Date(a.starts_at), "dd/MM/yyyy 'às' HH:mm", { locale: ptBR })}
                        </p>
                        <p className="text-xs text-gray-500 truncate">
                          {svc?.name ?? '—'}{pro?.name ? ` · ${pro.name}` : ''}
                        </p>
                      </div>
                      <div className="flex items-center gap-2 shrink-0">
                        {svc?.price !== undefined && (
                          <span className={`text-xs font-semibold ${
                            a.payment_status === 'pago' ? 'text-green-600' :
                            a.status === 'cancelado' ? 'text-gray-400 line-through' :
                            'text-yellow-600'
                          }`}>
                            {formatCurrency(svc.price)}
                          </span>
                        )}
                        <Badge status={a.status} />
                      </div>
                    </div>
                  )
                })}
              </div>

              <div className="flex justify-end gap-4 text-xs border-t border-gray-200 pt-2 mt-1">
                {totalPendente > 0 && (
                  <span className="text-yellow-700">
                    A receber: <span className="font-semibold">{formatCurrency(totalPendente)}</span>
                  </span>
                )}
                <span className="text-green-700">
                  Pago: <span className="font-semibold">{formatCurrency(totalPago)}</span>
                </span>
              </div>
            </>
          )}

          {/* Aulas em que o aluno está matriculado (turmas mensais) */}
          {memberships.length > 0 && (
            <div className="mt-4 pt-3 border-t border-gray-200">
              <div className="flex items-center gap-2 mb-2">
                <GraduationCap size={14} className="text-gray-400" />
                <span className="text-xs font-medium text-gray-600">Aulas matriculadas</span>
              </div>
              <div className="flex flex-wrap gap-2">
                {memberships.map((mms) => (
                  <span
                    key={mms.id}
                    className={`text-xs px-2.5 py-1 rounded-lg ${mms.status === 'ativa' ? 'bg-brand-soft text-brand' : 'bg-gray-100 text-gray-400 line-through'}`}
                  >
                    {mms.services?.name ?? 'Turma'} · {formatCurrency(Number(mms.monthly_price))}/mês · {mms.months ? `${mms.months} ${mms.months === 1 ? 'mês' : 'meses'}` : 'indeterminado'}
                  </span>
                ))}
              </div>
            </div>
          )}

          {/* Situação financeira: mensalidades */}
          {charges.length > 0 && (
            <div className="mt-4 pt-3 border-t border-gray-200">
              <div className="flex items-center justify-between mb-2">
                <div className="flex items-center gap-2">
                  <Wallet size={14} className="text-gray-400" />
                  <span className="text-xs font-medium text-gray-600">Mensalidades</span>
                </div>
                {emAberto > 0 && (
                  <span className="text-xs text-amber-700">Em aberto: <strong>{formatCurrency(emAberto)}</strong></span>
                )}
              </div>
              <div className="space-y-1.5">
                {charges.map((c) => (
                  <div key={c.id} className="bg-white rounded-lg border border-gray-100 px-3 py-2 flex items-center justify-between gap-3">
                    <div className="flex items-center gap-2 min-w-0">
                      <span className="text-xs font-medium text-gray-700">{refFmt(c.reference_month)}</span>
                      <span className="text-xs text-gray-400 truncate">{c.services?.name}</span>
                    </div>
                    <div className="flex items-center gap-2 shrink-0">
                      <span className="text-xs font-semibold text-gray-800">{formatCurrency(Number(c.amount))}</span>
                      {c.status === 'pago' ? (
                        <span className="inline-flex items-center gap-1 text-[11px] text-green-700">
                          <Check size={12} /> Pago
                          {onDelete && (
                            <button onClick={() => markPending(c.id)} title="Reabrir" className="ml-0.5 text-gray-300 hover:text-gray-500">
                              <RotateCcw size={11} />
                            </button>
                          )}
                        </span>
                      ) : onDelete ? (
                        <button
                          onClick={() => markPaid(c.id)}
                          className="inline-flex items-center gap-1 text-[11px] font-medium text-green-700 bg-green-50 hover:bg-green-100 px-2 py-1 rounded-md transition"
                        >
                          <Check size={11} /> Marcar pago
                        </button>
                      ) : (
                        <span className="inline-flex items-center gap-1 text-[11px] font-medium text-amber-700">
                          Em aberto
                        </span>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      )}
    </li>
  )
}

export default function Clientes() {
  const { user } = useAuth()
  const { establishment, role } = useEstablishment(user?.id)
  // Dono e superadmin (ajudando a configurar) podem excluir/editar/mesclar.
  const canDelete = role === 'owner' || role === 'admin'
  const { clients, loading, exportCsv, deleteClient, createClient, updateClient, refetch } = useClients(establishment?.id)
  const [search, setSearch] = useState('')
  const [newOpen, setNewOpen] = useState(false)
  const [mergeOpen, setMergeOpen] = useState(false)
  const [editingClient, setEditingClient] = useState<Client | null>(null)

  const filtered = clients.filter(
    (c) =>
      c.name.toLowerCase().includes(search.toLowerCase()) ||
      c.phone.includes(search) ||
      (c.email ?? '').toLowerCase().includes(search.toLowerCase())
  )

  return (
    <div>
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 mb-6">
        <h1 className="font-display text-3xl tracking-tight text-ink">Clientes</h1>
        <div className="flex items-center gap-2">
          <Button size="sm" onClick={() => setNewOpen(true)}>
            <UserPlus size={16} />
            Novo cliente
          </Button>
          {canDelete && (
            <Button variant="secondary" size="sm" onClick={() => setMergeOpen(true)}>
              <Merge size={16} />
              Mesclar
            </Button>
          )}
          <Button variant="secondary" size="sm" onClick={exportCsv}>
            <Download size={16} />
            Exportar CSV
          </Button>
        </div>
      </div>

      <NewClientModal
        open={newOpen}
        onClose={() => setNewOpen(false)}
        establishmentId={establishment?.id}
        createClient={createClient}
        onCreated={() => refetch()}
      />
      <MergeClientsModal
        open={mergeOpen}
        onClose={() => setMergeOpen(false)}
        clients={clients}
        onMerged={() => refetch()}
      />
      <EditClientModal
        open={!!editingClient}
        onClose={() => setEditingClient(null)}
        client={editingClient}
        updateClient={updateClient}
      />

      <div className="mb-4">
        <Input
          placeholder="Buscar por nome, telefone ou email..."
          icon={<Search size={16} />}
          value={search}
          onChange={(e) => setSearch(e.target.value)}
        />
      </div>

      {loading ? (
        <div className="text-center py-12 text-gray-400 text-sm">Carregando...</div>
      ) : (
        <div className="bg-white rounded-2xl border border-gray-100">
          {filtered.length === 0 ? (
            <div className="p-10 text-center text-gray-400 text-sm">
              {search ? 'Nenhum cliente encontrado.' : 'Nenhum cliente cadastrado ainda.'}
            </div>
          ) : (
            <ul className="divide-y divide-gray-100">
              {filtered.map((client) => (
                <ClientRow
                  key={client.id}
                  client={client}
                  establishmentId={establishment?.id}
                  onDelete={canDelete ? deleteClient : undefined}
                  onEdit={canDelete ? setEditingClient : undefined}
                />
              ))}
            </ul>
          )}
          <div className="p-4 border-t border-gray-50 text-xs text-gray-400">
            {filtered.length} cliente{filtered.length !== 1 ? 's' : ''}
          </div>
        </div>
      )}
    </div>
  )
}
