import { useState, useEffect } from 'react'
import { useParams, useLocation, Link } from 'react-router-dom'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import { format, addMinutes } from 'date-fns'
import { ptBR } from 'date-fns/locale'
import {
  Clock, User, CheckCircle, ChevronLeft, Tag, RefreshCw,
  Scissors, Droplets, Palette, Sparkles, Dumbbell, Activity,
  Apple, Heart, Star, Eye, Zap, Leaf, ClipboardList, Wind,
  Baby, Sun, type LucideIcon,
} from 'lucide-react'
import { useEstablishmentBySlug } from '../hooks/useEstablishment'
import { useTheme } from '../context/ThemeContext'
import { useServices } from '../hooks/useServices'
import { useProfessionals } from '../hooks/useProfessionals'
import { useAvailability } from '../hooks/useAvailability'
import { useWorkingHours } from '../hooks/useWorkingHours'
import { useClients } from '../hooks/useClients'
import { useAppointments } from '../hooks/useAppointments'
import { usePixPayment } from '../hooks/usePixPayment'
import { Button } from '../components/ui/Button'
import { Input } from '../components/ui/Input'
import { Calendar } from '../components/ui/Calendar'
import { TimeSlotGrid } from '../components/ui/TimeSlotGrid'
import { PixPayment } from '../components/ui/PixPayment'
import { formatCurrency, formatPhone } from '../lib/utils'
import { supabase } from '../lib/supabase'
import type { Service, Professional } from '../types'

type Step = 1 | 2 | 3 | 4 | 5

const DEFAULT_prepayDiscount = 10

interface ServiceVisual { icon: LucideIcon; bg: string; text: string }

// O ícone diferencia o tipo de serviço; a cor vem da família de acentos do
// produto, não de um tom novo por regra. Dezoito pastéis distintos era o que
// dava ao app aquele ar de tela gerada.
const SERVICE_RULES: { keywords: string[]; icon: LucideIcon; bg: string; text: string }[] = [
  { keywords: ['corte', 'cabelo', 'hair', 'tesoura', 'franja', 'degrade', 'degradê'], icon: Scissors,      bg: 'bg-accent-brass/10', text: 'text-accent-brass' },
  { keywords: ['barba', 'bigode', 'navalha', 'barbear'],                              icon: Scissors,      bg: 'bg-accent-brass/10', text: 'text-accent-brass' },
  { keywords: ['escova', 'progressiva', 'alisamento', 'blow'],                        icon: Wind,          bg: 'bg-accent-plum/10',  text: 'text-accent-plum' },
  { keywords: ['hidrat', 'nutrição', 'reconstru', 'banho de creme', 'máscara'],       icon: Droplets,      bg: 'bg-accent-plum/10',  text: 'text-accent-plum' },
  { keywords: ['color', 'tintura', 'mechas', 'loiro', 'reflexo', 'tint', 'luzes'],   icon: Palette,       bg: 'bg-accent-plum/10',  text: 'text-accent-plum' },
  { keywords: ['manicure', 'pedicure', 'unha', 'nail', 'esmalt'],                    icon: Star,          bg: 'bg-accent-rose/10',  text: 'text-accent-rose' },
  { keywords: ['sobrancelha', 'design', 'micropigment', 'olho', 'cílio', 'cilio'],   icon: Eye,           bg: 'bg-accent-rose/10',  text: 'text-accent-rose' },
  { keywords: ['depilação', 'depilacao', 'laser', 'cera', 'pelo'],                   icon: Zap,           bg: 'bg-accent-clay/10',  text: 'text-accent-clay' },
  { keywords: ['massagem', 'massage', 'relaxamento', 'spa', 'drenagem'],             icon: Heart,         bg: 'bg-accent-clay/10',  text: 'text-accent-clay' },
  { keywords: ['facial', 'limpeza de pele', 'peeling', 'botox', 'preench'],          icon: Sparkles,      bg: 'bg-accent-rose/10',  text: 'text-accent-rose' },
  { keywords: ['pilates', 'yoga', 'alongamento', 'stretching'],                      icon: Dumbbell,      bg: 'bg-accent-sage/10',  text: 'text-accent-sage' },
  { keywords: ['academia', 'musculação', 'funcional', 'crossfit', 'treino', 'fitness'], icon: Dumbbell,   bg: 'bg-brand-soft',      text: 'text-brand' },
  { keywords: ['avaliação física', 'avaliacao física', 'avaliação fisica', 'bioimpedância', 'medida', 'antropom'], icon: Activity, bg: 'bg-brand-soft', text: 'text-brand' },
  { keywords: ['nutri', 'dieta', 'alimentação', 'aliment', 'cardápio'],              icon: Apple,         bg: 'bg-accent-sage/10',  text: 'text-accent-sage' },
  { keywords: ['infantil', 'criança', 'baby', 'bebê'],                               icon: Baby,          bg: 'bg-accent-rose/10',  text: 'text-accent-rose' },
  { keywords: ['bronz', 'solário', 'autobronz'],                                     icon: Sun,           bg: 'bg-accent-clay/10',  text: 'text-accent-clay' },
  { keywords: ['consulta', 'avaliação', 'avaliacao', 'anamnese', 'check'],           icon: ClipboardList, bg: 'bg-accent-sage/10',  text: 'text-accent-sage' },
  { keywords: ['natural', 'orgânic', 'botânic', 'erva'],                             icon: Leaf,          bg: 'bg-accent-sage/10',  text: 'text-accent-sage' },
]

const DEFAULT_VISUAL: ServiceVisual = { icon: Sparkles, bg: 'bg-brand-soft', text: 'text-brand' }

function getServiceVisual(name: string): ServiceVisual {
  const lower = name.toLowerCase()
  for (const rule of SERVICE_RULES) {
    if (rule.keywords.some((kw) => lower.includes(kw))) {
      return { icon: rule.icon, bg: rule.bg, text: rule.text }
    }
  }
  return DEFAULT_VISUAL
}

const clientSchema = z.object({
  name: z.string().min(2, 'Nome obrigatório'),
  phone: z.string().min(10, 'Telefone inválido'),
  email: z.string().email('Email inválido').or(z.literal('')),
  marketing_opt_in: z.boolean(),
})

type ClientData = z.infer<typeof clientSchema>

function StepIndicator({ current, total }: { current: Step; total: number }) {
  return (
    <div className="flex gap-1.5 mb-8">
      {Array.from({ length: total }, (_, i) => (
        <div
          key={i}
          className={`flex-1 h-1.5 rounded-full transition-all ${
            i + 1 < current ? 'bg-brand/40' : i + 1 === current ? 'bg-brand' : 'bg-gray-200'
          }`}
        />
      ))}
    </div>
  )
}

export default function Booking() {
  const { slug } = useParams<{ slug: string }>()
  const location = useLocation()
  const preselectedServiceId = (location.state as { preselectedServiceId?: string } | null)?.preselectedServiceId
  const { establishment, loading: estLoading } = useEstablishmentBySlug(slug)

  // Segue a marca do estabelecimento pela mesma regra da página dele, senão a
  // cor mudaria no meio do fluxo do cliente. Sempre aplica, inclusive sem cor
  // definida: caso contrário a cor do estabelecimento anterior ficaria grudada.
  const { applyPublic } = useTheme()
  useEffect(() => {
    applyPublic(establishment)
  }, [establishment, applyPublic])
  const { services } = useServices(establishment?.id)
  const { professionals } = useProfessionals(establishment?.id)
  const { closedDays } = useWorkingHours(establishment?.id)

  const [step, setStep] = useState<Step>(1)
  const [selectedService, setSelectedService] = useState<Service | null>(null)
  const [selectedProfessional, setSelectedProfessional] = useState<Professional | null>(null)
  const [selectedDate, setSelectedDate] = useState<Date | null>(null)
  const [selectedTime, setSelectedTime] = useState<string | null>(null)
  const [recurrenceWeeks, setRecurrenceWeeks] = useState<number>(0)
  const [recurringTermAccepted, setRecurringTermAccepted] = useState(false)
  const [appointmentId, setAppointmentId] = useState<string | null>(null)
  const [recurringCount, setRecurringCount] = useState<number>(1)
  const [confirmedClientData, setConfirmedClientData] = useState<ClientData | null>(null)
  const [bookingError, setBookingError] = useState<string | null>(null)
  const [paymentChoice, setPaymentChoice] = useState<'none' | 'confirm' | 'prepay'>('none')

  const prepayDiscount = (establishment?.prepay_discount ?? DEFAULT_prepayDiscount) / 100

  // Pré-seleciona serviço quando vem da página do estabelecimento
  useEffect(() => {
    if (!preselectedServiceId || services.length === 0 || selectedService) return
    const found = services.find((s) => s.id === preselectedServiceId && s.active)
    if (found) selectService(found)
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [preselectedServiceId, services])

  const eligibleProfessionals = selectedService
    ? professionals.filter((p) => p.services.includes(selectedService.id))
    : professionals

  const { slots, loading: slotsLoading } = useAvailability({
    establishmentId: establishment?.id,
    professionalId: selectedProfessional?.id,
    serviceId: selectedService?.id,
    date: selectedDate,
    durationMinutes: selectedService?.duration_minutes ?? 0,
    maxSpots: selectedService?.max_spots ?? 1,
  })

  // Horários fixos da turma (dias/horários já definidos), para destacar no
  // calendário só os dias de aula e mostrar um resumo.
  const [classSchedules, setClassSchedules] = useState<{ day_of_week: number; time: string; max_spots: number }[]>([])
  useEffect(() => {
    if (!selectedService || selectedService.schedule_type !== 'fixed') { setClassSchedules([]); return }
    let cancelled = false
    supabase
      .from('service_schedules')
      .select('day_of_week, time, max_spots')
      .eq('service_id', selectedService.id)
      .order('day_of_week')
      .order('time')
      .then(({ data }) => { if (!cancelled) setClassSchedules((data ?? []) as typeof classSchedules) })
    return () => { cancelled = true }
  }, [selectedService])

  const classDays = Array.from(new Set(classSchedules.map((s) => s.day_of_week)))
  // Para turmas com dias definidos: só os dias de aula ficam habilitados.
  const bookingDisabledDays = classDays.length > 0
    ? [0, 1, 2, 3, 4, 5, 6].filter((d) => !classDays.includes(d))
    : closedDays

  const { createClient } = useClients(establishment?.id)
  const { createAppointment, createRecurringAppointments } = useAppointments(establishment?.id)
  const { pixData, loading: pixLoading, generatePix } = usePixPayment()

  const {
    register,
    handleSubmit,
    formState: { errors, isSubmitting },
  } = useForm<ClientData>({
    resolver: zodResolver(clientSchema),
    defaultValues: { marketing_opt_in: false },
  })

  // Generate PIX only when client explicitly chooses prepay
  useEffect(() => {
    if (
      step === 5 &&
      paymentChoice === 'prepay' &&
      appointmentId &&
      selectedService &&
      establishment &&
      confirmedClientData &&
      !pixData &&
      !pixLoading
    ) {
      const discountedAmount = Math.round(selectedService.price * (1 - prepayDiscount))
      void generatePix({
        appointment_id: appointmentId,
        amount: discountedAmount,
        description: `${selectedService.name} - ${establishment.name}`,
        payer_email: confirmedClientData.email || 'cliente@atendente.app',
        payer_name: confirmedClientData.name,
      })
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [step, paymentChoice])

  const activeServices = services.filter((s) => s.active)

  const skipsProfessional = (s: Service) =>
    s.schedule_type === 'fixed' || (s.schedule_type === 'flexible' && (s.max_spots ?? 1) > 1)

  // Mensalidade e matrícula (turma): mudam o rótulo de preço e exigem e-mail.
  const isMonthly = (s?: Service | null) => s?.price_mode === 'mensal'
  const priceText = (s: Service) => `${formatCurrency(s.price)}${isMonthly(s) ? '/mês' : ''}`
  const isMatricula = (s?: Service | null) =>
    !!s && (s.schedule_type === 'fixed' || (s.max_spots ?? 1) > 1)
  const requiresEmail = isMatricula(selectedService) || isMonthly(selectedService)

  const goBack = () => {
    if (step === 2) setStep(1)
    else if (step === 3) {
      const eligible = selectedService
        ? professionals.filter((p) => p.services.includes(selectedService.id))
        : professionals
      if (selectedService && (skipsProfessional(selectedService) || eligible.length === 0)) setStep(1)
      else setStep(2)
    }
    else if (step === 4) setStep(3)
  }

  const selectService = (s: Service) => {
    setSelectedService(s)
    setSelectedProfessional(null)
    if (skipsProfessional(s)) {
      setStep(3)
      return
    }
    const eligible = professionals.filter((p) => p.services.includes(s.id))
    if (eligible.length === 0) {
      setStep(3)
      return
    }
    setStep(2)
  }

  const selectProfessional = (p: Professional) => {
    setSelectedProfessional(p)
    setStep(3)
  }

  const selectTime = (time: string) => {
    setSelectedTime(time)
  }

  const submitBooking = async (clientData: ClientData) => {
    if (!establishment || !selectedService || !selectedDate || !selectedTime) return
    setBookingError(null)

    // Matrícula/mensalidade exige e-mail além do WhatsApp.
    if (requiresEmail && !clientData.email?.trim()) {
      setBookingError('Informe seu e-mail para concluir a matrícula.')
      return
    }

    const { client, error: clientError } = await createClient({
      establishment_id: establishment.id,
      name: clientData.name,
      phone: clientData.phone.replace(/\D/g, ''),
      email: clientData.email || undefined,
      marketing_opt_in: clientData.marketing_opt_in,
    })

    if (!client) {
      setBookingError(clientError ?? 'Erro ao salvar seus dados. Tente novamente.')
      return
    }

    // Serviço com mensalidade: cria a matrícula (memberships). As cobranças
    // mensais são geradas por gatilho no banco. Não bloqueia a reserva se falhar.
    if (isMonthly(selectedService)) {
      const months =
        recurrenceWeeks >= 52 ? null
        : recurrenceWeeks >= 26 ? 6
        : recurrenceWeeks >= 13 ? 3
        : 1
      const startMonth = `${selectedDate.getFullYear()}-${String(selectedDate.getMonth() + 1).padStart(2, '0')}-01`
      await supabase.from('memberships').insert({
        establishment_id: establishment.id,
        client_id: client.id,
        service_id: selectedService.id,
        monthly_price: selectedService.price,
        start_month: startMonth,
        months,
        status: 'ativa',
      })
    }

    const [h, m] = selectedTime.split(':').map(Number)
    const base = {
      establishment_id: establishment.id,
      client_id: client.id,
      ...(selectedProfessional ? { professional_id: selectedProfessional.id } : {}),
      service_id: selectedService.id,
    }

    if (recurrenceWeeks > 0 && selectedService.schedule_type === 'fixed') {
      // Quantas semanas gerar (limite prático para não criar aulas demais).
      const weeks = Math.min(recurrenceWeeks, 26)
      // Turma com vários dias na semana (ex.: seg e qua): reserva TODOS os dias
      // da turma. Turma de um dia só: repete o dia/horário escolhido.
      const multiDay = classDays.length > 1
      const daySlots = multiDay
        ? classSchedules.map((s) => ({ day: s.day_of_week, time: s.time.slice(0, 5) }))
        : [{ day: selectedDate.getDay(), time: `${String(h).padStart(2, '0')}:${String(m).padStart(2, '0')}` }]

      // Âncora: início (segunda) da semana da data escolhida.
      const weekStart = new Date(selectedDate)
      weekStart.setHours(0, 0, 0, 0)
      weekStart.setDate(weekStart.getDate() - ((weekStart.getDay() + 6) % 7)) // segunda-feira
      const now = new Date()

      const occurrences: { starts_at: string; ends_at: string }[] = []
      for (const slot of daySlots) {
        const [sh, sm] = slot.time.split(':').map(Number)
        // primeiro dia desse slot na semana âncora
        const firstDay = new Date(weekStart)
        firstDay.setDate(weekStart.getDate() + ((slot.day + 6) % 7)) // offset a partir de segunda
        for (let w = 0; w < weeks; w++) {
          const d = new Date(firstDay)
          d.setDate(firstDay.getDate() + w * 7)
          d.setHours(sh, sm, 0, 0)
          if (d.getTime() <= now.getTime()) continue // não cria aulas no passado
          const endsAt = addMinutes(d, selectedService.duration_minutes)
          occurrences.push({ starts_at: d.toISOString(), ends_at: endsAt.toISOString() })
        }
      }
      occurrences.sort((a, b) => a.starts_at.localeCompare(b.starts_at))

      const { appointments: created, error: apptError } = await createRecurringAppointments(base, occurrences)
      if (!created.length) {
        setBookingError(apptError ?? 'Erro ao criar matrícula. Tente novamente.')
        return
      }
      setAppointmentId(created[0].id)
      setRecurringCount(created.length)
      setConfirmedClientData(clientData)
      setStep(5)
      return
    }

    // Agendamento único
    const startsAt = new Date(selectedDate)
    startsAt.setHours(h, m, 0, 0)
    const endsAt = addMinutes(startsAt, selectedService.duration_minutes)

    const { appointment, error: apptError } = await createAppointment({
      ...base,
      starts_at: startsAt.toISOString(),
      ends_at: endsAt.toISOString(),
      max_spots: selectedService.max_spots ?? 1,
    })

    if (!appointment) {
      setBookingError(apptError ?? 'Erro ao confirmar agendamento. Tente novamente.')
      return
    }

    setAppointmentId(appointment.id)
    setRecurringCount(1)
    setConfirmedClientData(clientData)
    setStep(5)
  }

  if (estLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="animate-pulse text-gray-400">Carregando...</div>
      </div>
    )
  }

  if (!establishment) {
    return (
      <div className="min-h-screen flex items-center justify-center p-4">
        <div className="text-center">
          <p className="text-gray-500">Estabelecimento não encontrado.</p>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-paper">
      <div className="bg-white border-b border-gray-100 px-4 py-3">
        <div className="max-w-lg mx-auto flex items-center gap-3">
          <Link
            to={`/agendar/${slug}`}
            className="p-1.5 rounded-lg text-gray-400 hover:text-brand hover:bg-brand-soft transition"
            title="Voltar ao perfil"
          >
            <ChevronLeft size={20} />
          </Link>
          <div className="w-8 h-8 rounded-xl bg-brand flex items-center justify-center shrink-0">
            <Sparkles size={14} className="text-white" />
          </div>
          <div className="flex-1 min-w-0">
            <p className="text-sm font-semibold text-gray-900 truncate">{establishment.name}</p>
            <p className="text-xs text-gray-400">Agendamento online</p>
          </div>
        </div>
      </div>

      <div className="max-w-lg mx-auto px-4 py-8">
        {step < 5 && <StepIndicator current={step} total={4} />}

        {step > 1 && step < 5 && (
          <button
            onClick={goBack}
            className="flex items-center gap-1.5 text-sm text-gray-500 hover:text-brand-dark mb-4 transition"
          >
            <ChevronLeft size={16} /> Voltar
          </button>
        )}

        {step === 1 && (
          <div>
            <h2 className="font-display text-3xl tracking-tight text-ink mb-1">O que você precisa?</h2>
            <p className="text-sm text-gray-400 mb-6">Toque no serviço desejado para agendar</p>
            {activeServices.length === 0 ? (
              <p className="text-center text-gray-400 py-10">Nenhum serviço disponível.</p>
            ) : (
              <div className="grid grid-cols-2 gap-3">
                {activeServices.map((s) => {
                  const { icon: Icon, bg, text } = getServiceVisual(s.name)
                  const selected = selectedService?.id === s.id
                  return (
                    <button
                      key={s.id}
                      onClick={() => selectService(s)}
                      className={`relative flex flex-col items-center text-center bg-[#fdfcfa] rounded-2xl border-2 p-5 transition active:scale-95 ${
                        selected
                          ? 'border-brand shadow-lg shadow-brand-soft'
                          : 'border-gray-100 hover:border-brand/40 hover:shadow-md shadow-sm'
                      }`}
                    >
                      {selected && (
                        <span className="absolute top-2.5 right-2.5 w-5 h-5 rounded-full bg-brand flex items-center justify-center">
                          <CheckCircle size={12} className="text-white" />
                        </span>
                      )}
                      <div className={`w-14 h-14 rounded-2xl ${bg} flex items-center justify-center mb-3`}>
                        <Icon size={28} className={text} />
                      </div>
                      <p className="font-bold text-gray-900 text-sm leading-tight mb-1">{s.name}</p>
                      {s.description && (
                        <p className="text-xs text-gray-400 leading-snug mb-2 line-clamp-2">{s.description}</p>
                      )}
                      <div className="mt-auto w-full pt-2 border-t border-gray-100 flex justify-between items-center">
                        <span className="flex items-center gap-1 text-xs text-gray-400">
                          <Clock size={11} /> {s.duration_minutes}min
                        </span>
                        <span className="text-sm font-bold text-brand-dark">
                          {priceText(s)}
                        </span>
                      </div>
                    </button>
                  )
                })}
              </div>
            )}
          </div>
        )}

        {step === 2 && (
          <div>
            <h2 className="font-display text-2xl tracking-tight text-ink mb-1">Escolha o profissional</h2>
            <p className="text-sm text-gray-400 mb-6">Com quem deseja ser atendido?</p>
            <div className="space-y-3">
              {eligibleProfessionals.map((p) => (
                <button
                  key={p.id}
                  onClick={() => selectProfessional(p)}
                  className={`w-full text-left bg-[#fdfcfa] rounded-2xl border p-4 flex items-center gap-4 transition hover:border-brand hover:shadow-sm ${
                    selectedProfessional?.id === p.id
                      ? 'border-brand ring-2 ring-brand/20'
                      : 'border-gray-200'
                  }`}
                >
                  <div className="w-12 h-12 rounded-full bg-brand-soft flex items-center justify-center shrink-0">
                    <User size={20} className="text-brand" />
                  </div>
                  <p className="font-semibold text-gray-900">{p.name}</p>
                </button>
              ))}
            </div>
          </div>
        )}

        {step === 3 && (
          <div>
            <h2 className="font-display text-2xl tracking-tight text-ink mb-1">Escolha a data e horário</h2>
            <p className="text-sm text-gray-400 mb-6">Selecione quando deseja ser atendido</p>

            {selectedService?.schedule_type === 'fixed' && classSchedules.length > 0 && (
              <div className="bg-brand-soft border border-brand/10 rounded-2xl px-4 py-3 mb-4 text-sm text-brand-dark">
                {(selectedService.sessions_per_week ?? 1) > 1 && (
                  <p className="mb-2">
                    Esta turma tem <strong>{selectedService.sessions_per_week} aulas por semana</strong>. Escolha um dia de aula (marcados no calendário).
                  </p>
                )}
                <div className="flex flex-wrap gap-1.5">
                  {classSchedules.map((s, i) => (
                    <span key={i} className="inline-flex items-center gap-1 bg-white/70 rounded-lg px-2 py-1 text-xs font-medium">
                      {['Dom', 'Seg', 'Ter', 'Qua', 'Qui', 'Sex', 'Sáb'][s.day_of_week]} {s.time.slice(0, 5)}
                      {s.max_spots > 1 && <span className="text-brand/70">· {s.max_spots} vagas</span>}
                    </span>
                  ))}
                </div>
              </div>
            )}

            <div className="bg-[#fdfcfa] rounded-2xl border border-gray-200 p-4 mb-4">
              <Calendar
                selected={selectedDate}
                onSelect={(d) => {
                  setSelectedDate(d)
                  setSelectedTime(null)
                }}
                disabledDays={bookingDisabledDays}
                highlightDays={classDays}
              />
            </div>

            {selectedDate && (
              <div className="bg-[#fdfcfa] rounded-2xl border border-gray-200 p-4">
                <p className="text-sm font-semibold text-gray-700 mb-3 capitalize">
                  {format(selectedDate, "EEEE, d 'de' MMMM", { locale: ptBR })}
                </p>
                {slotsLoading ? (
                  <p className="text-sm text-gray-400 text-center py-4">Verificando horários...</p>
                ) : (
                  <TimeSlotGrid
                    slots={slots}
                    selected={selectedTime}
                    onSelect={selectTime}
                  />
                )}
              </div>
            )}

            {selectedDate && selectedTime && selectedService?.schedule_type === 'fixed' && (
              <div className="bg-[#fdfcfa] rounded-2xl border border-gray-200 p-4 mt-4">
                <div className="flex items-center gap-2 mb-3">
                  <RefreshCw size={16} className="text-brand" />
                  <p className="text-sm font-semibold text-gray-700">Matrícula recorrente</p>
                </div>
                <p className="text-xs text-gray-400 mb-3">
                  {isMonthly(selectedService)
                    ? 'Escolha a duração da mensalidade — as aulas se repetem toda semana no mesmo dia e horário'
                    : 'Repete toda semana no mesmo dia e horário'}
                </p>
                <div className="grid grid-cols-4 gap-2">
                  {(isMonthly(selectedService)
                    ? [{ label: '1 mês', weeks: 4 }, { label: '3 meses', weeks: 13 }, { label: '6 meses', weeks: 26 }, { label: 'Indeterminado', weeks: 52 }]
                    : [{ label: 'Só esta', weeks: 0 }, { label: '4 sem.', weeks: 4 }, { label: '8 sem.', weeks: 8 }, { label: '12 sem.', weeks: 12 }]
                  ).map(({ label, weeks }) => (
                    <button
                      key={label}
                      onClick={() => { setRecurrenceWeeks(weeks); setRecurringTermAccepted(false) }}
                      className={`py-2 rounded-xl text-xs sm:text-sm font-semibold transition border ${
                        recurrenceWeeks === weeks
                          ? 'bg-brand text-white border-brand'
                          : 'bg-[#fdfcfa] text-gray-600 border-gray-200 hover:border-brand/40'
                      }`}
                    >
                      {label}
                    </button>
                  ))}
                </div>

                {recurrenceWeeks > 0 && (
                  <label className="mt-3 flex items-start gap-3 cursor-pointer bg-amber-50 border border-amber-200 rounded-xl p-3">
                    <input
                      type="checkbox"
                      checked={recurringTermAccepted}
                      onChange={(e) => setRecurringTermAccepted(e.target.checked)}
                      className="mt-0.5 shrink-0 accent-brand"
                    />
                    <span className="text-xs text-amber-800 leading-relaxed">
                      {isMonthly(selectedService) ? (
                        <>
                          <strong>Estou ciente</strong> de que a mensalidade reserva minha vaga na turma
                          {recurrenceWeeks >= 52 ? ' por tempo indeterminado' : recurrenceWeeks >= 26 ? ' por 6 meses' : recurrenceWeeks >= 13 ? ' por 3 meses' : ' por 1 mês'}.
                          A ausência a uma aula não gera reembolso nem reposição, pois o horário fica bloqueado para mim.
                        </>
                      ) : (
                        <>
                          <strong>Estou ciente</strong> de que ao me matricular, os horários ficam reservados exclusivamente para mim durante {recurrenceWeeks} semanas.
                          A ausência a uma aula não implica reembolso nem reposição, pois o horário foi bloqueado para meu atendimento.
                        </>
                      )}
                    </span>
                  </label>
                )}
              </div>
            )}

            {selectedDate && selectedTime && (
              <Button
                className="w-full mt-4"
                size="lg"
                onClick={() => setStep(4)}
                disabled={recurrenceWeeks > 0 && !recurringTermAccepted}
              >
                Continuar
              </Button>
            )}
          </div>
        )}

        {step === 4 && (
          <div>
            <h2 className="font-display text-2xl tracking-tight text-ink mb-1">Seus dados</h2>
            <p className="text-sm text-gray-400 mb-6">Preencha para confirmar o agendamento</p>

            <div className="bg-brand-soft rounded-2xl p-4 mb-6 text-sm">
              <p className="font-semibold text-brand-dark">{selectedService?.name}</p>
              <p className="text-brand mt-0.5">
                {selectedProfessional?.name} ·{' '}
                {selectedDate &&
                  format(selectedDate, "d 'de' MMMM", { locale: ptBR })}{' '}
                às {selectedTime}
              </p>
            </div>

            <form onSubmit={handleSubmit(submitBooking)} className="space-y-4">
              <Input
                label="Nome completo *"
                placeholder="Seu nome"
                error={errors.name?.message}
                {...register('name')}
              />
              <Input
                label="WhatsApp *"
                placeholder="(11) 99999-9999"
                error={errors.phone?.message}
                {...register('phone')}
              />
              <Input
                label={requiresEmail ? 'Email *' : 'Email (opcional)'}
                type="email"
                placeholder="seu@email.com"
                error={errors.email?.message}
                {...register('email')}
              />
              {requiresEmail && (
                <p className="-mt-2 text-xs text-gray-400">
                  Confirme seu e-mail e WhatsApp: usamos os dois para a matrícula e os lembretes.
                </p>
              )}
              <label className="flex items-start gap-2 text-sm text-gray-600 cursor-pointer">
                <input type="checkbox" {...register('marketing_opt_in')} className="mt-0.5 rounded" />
                Quero receber promoções e novidades por WhatsApp
              </label>

              {bookingError && (
                <p className="text-sm text-red-600 bg-red-50 rounded-xl px-4 py-3">{bookingError}</p>
              )}

              <Button type="submit" loading={isSubmitting} className="w-full" size="lg">
                Confirmar agendamento
              </Button>
            </form>
          </div>
        )}

        {step === 5 && (
          <div className="py-4">
            <div className="text-center mb-6">
              <CheckCircle size={56} className="text-green-500 mx-auto mb-3" />
              <h2 className="font-display text-3xl tracking-tight text-ink mb-1">
                {recurringCount > 1 ? 'Matrícula recebida!' : 'Reserva recebida!'}
              </h2>
              <p className="text-sm text-gray-500">
                {recurringCount > 1
                  ? classDays.length > 1
                    ? `${recurringCount} aulas criadas nos dias da turma (${classDays.map((d) => ['Dom','Seg','Ter','Qua','Qui','Sex','Sáb'][d]).join(', ')}). Aguardando confirmação do estabelecimento.`
                    : `${recurringCount} aulas criadas, toda ${selectedDate ? format(selectedDate, 'EEEE', { locale: ptBR }) : ''} às ${selectedTime}. Aguardando confirmação do estabelecimento.`
                  : 'Sua reserva está aguardando confirmação do estabelecimento. Você receberá um lembrete por WhatsApp.'}
              </p>
            </div>

            {selectedService && selectedDate && selectedTime && (
              <div className="bg-[#fdfcfa] rounded-2xl border border-gray-200 p-5 mb-5">
                <p className="font-semibold text-gray-900 mb-3">Resumo</p>
                <div className="space-y-2 text-sm">
                  <div className="flex justify-between">
                    <span className="text-gray-500">Serviço</span>
                    <span className="font-medium">{selectedService.name}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-gray-500">Profissional</span>
                    <span className="font-medium">{selectedProfessional?.name}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-gray-500">Data</span>
                    <span className="font-medium capitalize">
                      {format(selectedDate, "d 'de' MMMM", { locale: ptBR })}
                    </span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-gray-500">Horário</span>
                    <span className="font-medium">{selectedTime}</span>
                  </div>
                  <div className="flex justify-between border-t border-gray-100 pt-2 mt-2">
                    <span className="text-gray-500">{isMonthly(selectedService) ? 'Mensalidade' : 'Valor'}</span>
                    <span className="font-semibold text-brand-dark">
                      {priceText(selectedService)}
                    </span>
                  </div>
                </div>
              </div>
            )}

            {selectedService && isMonthly(selectedService) && (
              <div className="bg-brand-soft border border-brand/10 rounded-2xl p-4 mb-4">
                <div className="flex items-center justify-between">
                  <span className="text-sm text-gray-600">Mensalidade</span>
                  <span className="font-semibold text-brand-dark">{priceText(selectedService)}</span>
                </div>
                <p className="text-xs text-gray-500 mt-2">
                  Matrícula registrada. O pagamento da mensalidade será combinado com o estabelecimento — em breve você poderá pagar por aqui.
                </p>
                <a
                  href={`/agendar/${establishment.slug}`}
                  className="mt-3 inline-block text-sm text-brand font-semibold hover:underline"
                >
                  Finalizar
                </a>
              </div>
            )}

            {selectedService && !isMonthly(selectedService) && selectedService.price > 0 && paymentChoice === 'none' && (
              <div className="space-y-3 mb-4">
                <button
                  onClick={() => setPaymentChoice('prepay')}
                  className="w-full flex items-center justify-between px-5 py-4 bg-brand rounded-2xl hover:bg-brand-dark transition"
                >
                  <div className="text-left">
                    <p className="font-semibold text-white">Pagar agora com desconto</p>
                    <p className="text-sm text-brand/20">
                      {formatCurrency(Math.round(selectedService.price * (1 - prepayDiscount)))}
                      {' '}· {Math.round(prepayDiscount * 100)}% off via PIX antecipado
                    </p>
                  </div>
                  <Tag size={20} className="text-brand/20 shrink-0" />
                </button>
                <button
                  onClick={() => setPaymentChoice('confirm')}
                  className="w-full flex items-center justify-between px-5 py-4 bg-[#fdfcfa] border border-gray-200 rounded-2xl hover:border-gray-300 transition"
                >
                  <div className="text-left">
                    <p className="font-semibold text-gray-900">Aguardar confirmação</p>
                    <p className="text-sm text-gray-500">Pague no dia do atendimento</p>
                  </div>
                  <span className="text-gray-300 text-lg">→</span>
                </button>
              </div>
            )}

            {selectedService && !isMonthly(selectedService) && selectedService.price > 0 && paymentChoice === 'confirm' && (
              <div className="bg-green-50 border border-green-100 rounded-2xl p-4 mb-4 text-center">
                <p className="text-sm text-green-700 font-medium">Reserva aguardando confirmação — você paga no dia do atendimento.</p>
                <a
                  href={`/agendar/${establishment.slug}`}
                  className="mt-3 inline-block text-sm text-brand font-semibold hover:underline"
                >
                  Finalizar
                </a>
              </div>
            )}

            {selectedService && !isMonthly(selectedService) && selectedService.price > 0 && paymentChoice === 'prepay' && (
              <div className="mb-4">
                <div className="flex items-center justify-between mb-3">
                  <p className="font-semibold text-gray-900">Pagamento via PIX</p>
                  <span className="text-xs bg-green-100 text-green-700 px-2 py-1 rounded-full font-medium">
                    {Math.round(prepayDiscount * 100)}% off
                  </span>
                </div>
                {pixData ? (
                  <PixPayment
                    pixData={pixData}
                    amount={Math.round(selectedService.price * (1 - prepayDiscount))}
                    loading={false}
                  />
                ) : (
                  <PixPayment
                    pixData={{ qr_code: '', qr_code_base64: '', ticket_url: '', payment_id: '', status: 'pending' }}
                    amount={Math.round(selectedService.price * (1 - prepayDiscount))}
                    loading={pixLoading}
                  />
                )}
              </div>
            )}

            <p className="text-xs text-gray-400 text-center mt-2">
              {establishment.phone && `Dúvidas? Fale conosco: ${formatPhone(establishment.phone)}`}
            </p>
          </div>
        )}
      </div>
    </div>
  )
}
