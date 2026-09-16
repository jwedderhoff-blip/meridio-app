import type { Category, Segment } from '../lib/segments'

export interface Establishment {
  id: string
  owner_id: string
  name: string
  slug: string
  category: Category
  /** Linha de trabalho: estetica (individual) ou saude_fitness (permite turmas). */
  segment?: Segment | null
  phone: string
  email: string
  address: string
  logo_url?: string
  tagline?: string
  /** @ ou link do Instagram do estabelecimento. */
  instagram?: string | null
  prepay_discount?: number
  /** Cor da marca escolhida pelo dono. Nulo = usa a cor padrão da categoria. */
  brand_color?: string | null
  /**
   * Tema do painel deste estabelecimento. Fica aqui, e não no navegador,
   * para que um mesmo dono com dois negócios tenha um escuro e outro claro.
   */
  theme_mode?: 'light' | 'dark' | 'system' | null
  /** Recurso beta: frente de caixa. Liberado manualmente pelo superadmin em cadastros de teste. */
  cash_beta_enabled?: boolean
  /** Recurso beta: ficha de anamnese. Liberado manualmente pelo superadmin em cadastros de teste. */
  health_form_beta_enabled?: boolean
  /** Recurso beta: relatórios financeiros. Liberado manualmente pelo superadmin em cadastros de teste. */
  financeiro_beta_enabled?: boolean
  created_at: string
}

export interface Service {
  id: string
  establishment_id: string
  name: string
  description?: string
  duration_minutes: number
  price: number
  /** 'sessao' = valor por atendimento; 'mensal' = mensalidade. */
  price_mode?: 'sessao' | 'mensal'
  active: boolean
  schedule_type: 'fixed' | 'flexible'
  max_spots: number
  /** Quantas aulas por semana a turma tem (turmas com horário fixo). */
  sessions_per_week?: number
}

export interface Professional {
  id: string
  establishment_id: string
  name: string
  avatar_url?: string
  services: string[]
}

export interface Client {
  id: string
  establishment_id: string
  name: string
  phone: string
  email?: string
  marketing_opt_in?: boolean
  notes?: string
  created_at: string
}

export interface Appointment {
  id: string
  establishment_id: string
  client_id: string
  professional_id?: string
  service_id: string
  starts_at: string
  ends_at: string
  status: 'pendente' | 'confirmado' | 'cancelado' | 'concluido'
  payment_status: 'pendente' | 'pago' | 'reembolsado'
  notes?: string
  recurring_group_id?: string
  created_at: string
  client?: Client
  service?: Service
  professional?: Professional
}

export interface WorkingHours {
  id: string
  establishment_id: string
  day_of_week: 0 | 1 | 2 | 3 | 4 | 5 | 6
  open_time: string
  close_time: string
  is_open: boolean
  break_start?: string | null
  break_end?: string | null
}

export interface TimeSlot {
  time: string
  available: boolean
  remaining_spots?: number
}
