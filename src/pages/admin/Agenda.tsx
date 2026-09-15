import { useState } from 'react'
import { format, addDays, startOfWeek, isSameDay } from 'date-fns'
import { ptBR } from 'date-fns/locale'
import { ChevronLeft, ChevronRight, Check, X, CheckCheck, RefreshCw, Trash2 } from 'lucide-react'
import { useAuth } from '../../context/AuthContext'
import { useEstablishment } from '../../hooks/useEstablishment'
import { useAppointments } from '../../hooks/useAppointments'
import { useProfessionals } from '../../hooks/useProfessionals'
import { Badge } from '../../components/ui/Badge'
import { Modal } from '../../components/ui/Modal'
import { Button } from '../../components/ui/Button'
import { formatCurrency } from '../../lib/utils'
import MarkPaidModal from '../../components/admin/MarkPaidModal'
import type { PaymentMethod } from '../../hooks/useCaixa'
import type { Appointment } from '../../types'

export default function Agenda() {
  const { user } = useAuth()
  const { establishment, role } = useEstablishment(user?.id)
  const isViewer = role === 'viewer'
  const [weekStart, setWeekStart] = useState(() => startOfWeek(new Date(), { weekStartsOn: 1 }))
  const [selectedProfessional, setSelectedProfessional] = useState<string>('all')
  const [selectedAppt, setSelectedAppt] = useState<Appointment | null>(null)
  const [updating, setUpdating] = useState(false)
  const [payingAppt, setPayingAppt] = useState(false)

  const { professionals } = useProfessionals(establishment?.id)
  const { appointments, loading, updateStatus, updatePaymentStatus, cancelFutureInGroup, deleteAppointment } = useAppointments(establishment?.id)

  const weekDays = Array.from({ length: 7 }, (_, i) => addDays(weekStart, i))

  const filteredAppointments = appointments.filter((a: Appointment) => {
    const matchesPro = selectedProfessional === 'all' || a.professional_id === selectedProfessional
    const apptDate = new Date(a.starts_at)
    const inWeek = weekDays.some((d) => isSameDay(d, apptDate))
    return matchesPro && inWeek
  })

  const handleStatus = async (status: Appointment['status']) => {
    if (!selectedAppt) return
    setUpdating(true)
    await updateStatus(selectedAppt.id, status)
    setSelectedAppt((prev) => prev ? { ...prev, status } : prev)
    setUpdating(false)
  }

  const handlePaymentStatus = async (payment_status: Appointment['payment_status'], method?: PaymentMethod) => {
    if (!selectedAppt) return
    setUpdating(true)
    const { movementId } = await updatePaymentStatus(selectedAppt.id, payment_status, method)
    setSelectedAppt((prev) => prev ? { ...prev, payment_status } : prev)
    setUpdating(false)
    return movementId
  }

  const confirmApptPayment = async (method: PaymentMethod, emitReceipt: boolean) => {
    const movementId = await handlePaymentStatus('pago', method)
    setPayingAppt(false)
    if (emitReceipt && movementId) {
      window.open(`/admin/caixa/${movementId}/recibo`, '_blank', 'noopener')
    }
  }

  const handleCancelFutureRecurring = async () => {
    if (!selectedAppt?.recurring_group_id) return
    if (!confirm('Cancelar esta e todas as próximas aulas da matrícula?')) return
    setUpdating(true)
    await cancelFutureInGroup(selectedAppt.recurring_group_id)
    setSelectedAppt((prev) => prev ? { ...prev, status: 'cancelado' } : prev)
    setUpdating(false)
  }

  const handleDelete = async () => {
    if (!selectedAppt) return
    if (!confirm('Excluir esta reserva permanentemente? Esta ação não pode ser desfeita.')) return
    setUpdating(true)
    await deleteAppointment(selectedAppt.id)
    setUpdating(false)
    setSelectedAppt(null)
  }

  const apptClient = selectedAppt?.client as { name?: string; phone?: string } | undefined
  const apptService = selectedAppt?.service as { name?: string; price?: number } | undefined
  const apptProfessional = selectedAppt?.professional as { name?: string } | undefined

  return (
    <div>
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 mb-6">
        <h1 className="font-display text-3xl tracking-tight text-ink">Agenda</h1>

        <div className="flex items-center gap-3">
          <select
            className="rounded-xl border border-gray-200 text-sm px-3 py-2 text-gray-700 bg-white focus:outline-none focus:ring-2 focus:ring-brand/20"
            value={selectedProfessional}
            onChange={(e) => setSelectedProfessional(e.target.value)}
          >
            <option value="all">Todos os profissionais</option>
            {professionals.map((p) => (
              <option key={p.id} value={p.id}>
                {p.name}
              </option>
            ))}
          </select>

          <div className="flex items-center gap-1">
            <button
              onClick={() => setWeekStart((w) => addDays(w, -7))}
              className="p-2 rounded-lg hover:bg-gray-100 text-gray-500 transition"
            >
              <ChevronLeft size={18} />
            </button>
            <span className="text-sm text-gray-600 min-w-[140px] text-center">
              {format(weekStart, "d 'de' MMM", { locale: ptBR })} —{' '}
              {format(addDays(weekStart, 6), "d 'de' MMM", { locale: ptBR })}
            </span>
            <button
              onClick={() => setWeekStart((w) => addDays(w, 7))}
              className="p-2 rounded-lg hover:bg-gray-100 text-gray-500 transition"
            >
              <ChevronRight size={18} />
            </button>
          </div>
        </div>
      </div>

      {loading ? (
        <div className="text-center py-12 text-gray-400 text-sm">Carregando...</div>
      ) : (
        <div className="bg-white rounded-2xl border border-gray-100 overflow-x-auto">
          <div className="grid grid-cols-8 min-w-[640px]">
            <div className="border-b border-gray-100 p-3" />
            {weekDays.map((day) => (
              <div
                key={day.toISOString()}
                className={`border-b border-l border-gray-100 p-3 text-center ${isSameDay(day, new Date()) ? 'bg-brand-soft' : ''}`}
              >
                <p className="text-xs font-medium text-gray-400 uppercase">
                  {format(day, 'EEE', { locale: ptBR })}
                </p>
                <p className={`text-sm font-semibold mt-0.5 ${isSameDay(day, new Date()) ? 'text-brand-dark' : 'text-gray-800'}`}>
                  {format(day, 'd')}
                </p>
              </div>
            ))}

            {Array.from({ length: 12 }, (_, i) => i + 8).map((hour) => (
              <>
                <div key={`hour-${hour}`} className="border-t border-gray-50 p-2 text-right">
                  <span className="text-xs text-gray-400">{String(hour).padStart(2, '0')}:00</span>
                </div>
                {weekDays.map((day) => {
                  const dayAppts = filteredAppointments.filter((a) => {
                    const apptDate = new Date(a.starts_at)
                    return isSameDay(apptDate, day) && apptDate.getHours() === hour
                  })
                  return (
                    <div
                      key={`${day.toISOString()}-${hour}`}
                      className="border-t border-l border-gray-50 p-1 min-h-[56px]"
                    >
                      {dayAppts.map((a) => {
                        const client = a.client as { name?: string } | undefined
                        const service = a.service as { name?: string } | undefined
                        return (
                          <div
                            key={a.id}
                            onClick={() => setSelectedAppt(a)}
                            className="bg-brand-soft rounded-lg p-1.5 mb-1 cursor-pointer hover:bg-brand/20 transition"
                          >
                            <p className="text-xs font-semibold text-brand-dark truncate flex items-center gap-1">
                              {format(new Date(a.starts_at), 'HH:mm')} {client?.name}
                              {a.recurring_group_id && <RefreshCw size={10} className="shrink-0 opacity-60" />}
                            </p>
                            <p className="text-xs text-brand truncate">{service?.name}</p>
                            <Badge status={a.status} className="mt-1" />
                          </div>
                        )
                      })}
                    </div>
                  )
                })}
              </>
            ))}
          </div>
        </div>
      )}

      {/* Modal detalhes do agendamento */}
      <Modal
        open={!!selectedAppt}
        onClose={() => setSelectedAppt(null)}
        title="Detalhes do agendamento"
      >
        {selectedAppt && (
          <div className="space-y-4">
            <div className="bg-gray-50 rounded-xl p-4 space-y-2">
              <div className="flex justify-between text-sm">
                <span className="text-gray-500">Cliente</span>
                <span className="font-semibold text-gray-900">{apptClient?.name ?? '—'}</span>
              </div>
              {apptClient?.phone && (
                <div className="flex justify-between text-sm">
                  <span className="text-gray-500">WhatsApp</span>
                  <a
                    href={`https://wa.me/55${apptClient.phone.replace(/\D/g, '')}`}
                    target="_blank"
                    rel="noreferrer"
                    className="text-green-600 font-medium hover:underline"
                  >
                    {apptClient.phone}
                  </a>
                </div>
              )}
              <div className="flex justify-between text-sm">
                <span className="text-gray-500">Serviço</span>
                <span className="font-semibold text-gray-900">{apptService?.name ?? '—'}</span>
              </div>
              {apptProfessional?.name && (
                <div className="flex justify-between text-sm">
                  <span className="text-gray-500">Profissional</span>
                  <span className="font-semibold text-gray-900">{apptProfessional.name}</span>
                </div>
              )}
              <div className="flex justify-between text-sm">
                <span className="text-gray-500">Data e hora</span>
                <span className="font-semibold text-gray-900">
                  {format(new Date(selectedAppt.starts_at), "dd/MM/yyyy 'às' HH:mm", { locale: ptBR })}
                </span>
              </div>
              {apptService?.price !== undefined && (
                <div className="flex justify-between text-sm">
                  <span className="text-gray-500">Valor</span>
                  <span className="font-semibold text-brand-dark">{formatCurrency(apptService.price)}</span>
                </div>
              )}
              <div className="flex justify-between text-sm items-center">
                <span className="text-gray-500">Status</span>
                <Badge status={selectedAppt.status} />
              </div>
              <div className="flex justify-between text-sm items-center">
                <span className="text-gray-500">Pagamento</span>
                <span className={`text-xs font-semibold px-2 py-0.5 rounded-full ${
                  selectedAppt.payment_status === 'pago'
                    ? 'bg-green-100 text-green-700'
                    : selectedAppt.payment_status === 'reembolsado'
                    ? 'bg-gray-100 text-gray-600'
                    : 'bg-yellow-100 text-yellow-700'
                }`}>
                  {selectedAppt.payment_status === 'pago' ? 'Pago' : selectedAppt.payment_status === 'reembolsado' ? 'Reembolsado' : 'Pendente'}
                </span>
              </div>
            </div>

            {isViewer && (
              <p className="text-xs text-gray-400 text-center">
                Acesso somente leitura. Cancelamentos e alterações são feitos pelo dono.
              </p>
            )}

            {/* Pagamento */}
            {!isViewer && selectedAppt.payment_status !== 'pago' && (
              <Button
                onClick={() => setPayingAppt(true)}
                loading={updating}
                className="w-full bg-green-600 hover:bg-green-700"
              >
                Marcar como pago
              </Button>
            )}
            {!isViewer && selectedAppt.payment_status === 'pago' && (
              <Button
                variant="ghost"
                onClick={() => handlePaymentStatus('reembolsado')}
                loading={updating}
                className="w-full"
              >
                Marcar como reembolsado
              </Button>
            )}

            {/* Ações */}
            {!isViewer && (
            <div className="flex flex-col gap-2">
              {selectedAppt.status === 'pendente' && (
                <Button
                  onClick={() => handleStatus('confirmado')}
                  loading={updating}
                  className="w-full"
                >
                  <Check size={16} />
                  Confirmar agendamento
                </Button>
              )}
              {selectedAppt.status === 'confirmado' && (
                <Button
                  onClick={() => handleStatus('concluido')}
                  loading={updating}
                  className="w-full"
                >
                  <CheckCheck size={16} />
                  Marcar como concluído
                </Button>
              )}
              {selectedAppt.status !== 'cancelado' && selectedAppt.status !== 'concluido' && (
                <Button
                  variant="ghost"
                  onClick={() => handleStatus('cancelado')}
                  loading={updating}
                  className="w-full text-red-600 hover:bg-red-50"
                >
                  <X size={16} />
                  Cancelar esta aula
                </Button>
              )}
              {selectedAppt.recurring_group_id && selectedAppt.status !== 'cancelado' && selectedAppt.status !== 'concluido' && (
                <Button
                  variant="ghost"
                  onClick={handleCancelFutureRecurring}
                  loading={updating}
                  className="w-full text-red-700 hover:bg-red-50"
                >
                  <RefreshCw size={16} />
                  Cancelar esta e todas as próximas
                </Button>
              )}
              {(selectedAppt.status === 'cancelado' || selectedAppt.status === 'concluido') && (
                <Button
                  variant="ghost"
                  onClick={handleDelete}
                  loading={updating}
                  className="w-full text-red-500 hover:bg-red-50 border border-red-200 mt-2"
                >
                  <Trash2 size={16} />
                  Excluir reserva
                </Button>
              )}
            </div>
            )}
          </div>
        )}
      </Modal>

      {payingAppt && selectedAppt && (
        <MarkPaidModal
          open
          onClose={() => setPayingAppt(false)}
          description={apptService?.name ?? 'Serviço'}
          amount={apptService?.price ?? 0}
          onConfirm={confirmApptPayment}
        />
      )}
    </div>
  )
}
