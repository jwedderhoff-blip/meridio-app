/**
 * Definição da ficha de anamnese — fonte única para o formulário público
 * (preenchido pelo aluno) e para a visualização no painel (dono/professor).
 * Baseada no modelo de ficha de atividade física (PAR-Q + histórico de
 * saúde), adaptada para pilates/academia/lutas.
 */

export const PARQ_QUESTIONS = [
  'Algum médico já disse que você possui um problema cardíaco e que só deveria realizar atividade física supervisionada por profissionais de saúde?',
  'Você sente dor no peito quando pratica atividade física?',
  'No último mês, você sentiu dor no peito quando não estava praticando atividade física?',
  'Você apresenta desequilíbrio, tontura ou perda de consciência?',
  'Você possui algum problema ósseo ou articular que poderia ser agravado pela atividade física?',
  'Você toma atualmente algum medicamento para pressão arterial e/ou problema cardíaco?',
  'Sabe de alguma outra razão física pela qual não deveria praticar atividade física?',
]

export interface TextField { key: string; label: string; type: 'text' | 'textarea' | 'date' | 'number'; placeholder?: string }
export interface CheckField { key: string; label: string; detailKey?: string; detailPlaceholder?: string }
export interface ChoiceField { key: string; label: string; options: string[] }

export interface AnamneseSection {
  title: string
  intro?: string
  texts?: TextField[]
  checks?: CheckField[]
  choices?: ChoiceField[]
}

export const HEALTH_HISTORY: CheckField[] = [
  { key: 'doenca_cronica', label: 'Possui alguma doença crônica diagnosticada? (ex.: diabetes, hipertensão, hipotireoidismo, asma, doenças cardíacas)', detailPlaceholder: 'Se sim, quais' },
  { key: 'cirurgia', label: 'Já realizou alguma cirurgia?', detailPlaceholder: 'Se sim, qual(is) e quando' },
  { key: 'lesoes', label: 'Possui histórico de fraturas, luxações ou lesões musculoesqueléticas?', detailPlaceholder: 'Se sim, descreva (local, data, tratamento)' },
  { key: 'coluna', label: 'Possui hérnia de disco, escoliose, artrose ou outra condição na coluna/articulações diagnosticada por médico?', detailPlaceholder: 'Se sim, qual' },
  { key: 'dores', label: 'Sente dores atualmente?', detailPlaceholder: 'Onde e com que frequência/intensidade' },
  { key: 'medicamentos', label: 'Faz uso contínuo de algum medicamento?', detailPlaceholder: 'Se sim, qual(is) e para quê' },
  { key: 'alergia', label: 'Possui alguma alergia (medicamentosa, alimentar, respiratória)?', detailPlaceholder: 'Qual' },
  { key: 'gestante', label: 'Está gestante ou no puerpério (até 6 meses após o parto)?', detailPlaceholder: 'Se sim, quantas semanas/meses' },
  { key: 'hist_familiar', label: 'Possui histórico familiar de doenças cardiovasculares, diabetes ou outras condições relevantes?', detailPlaceholder: 'Qual parentesco e condição' },
  { key: 'avaliacao_medica', label: 'Já passou por alguma avaliação médica recente relacionada a este objetivo?', detailPlaceholder: 'Quando e resultado' },
]

export const CONDICIONAMENTO_OPTIONS = ['Sedentário', 'Pouco ativo', 'Moderadamente ativo', 'Ativo', 'Muito ativo']
export const FUMANTE_OPTIONS = ['Sim', 'Não', 'Ex-fumante']
export const ALCOOL_OPTIONS = ['Não', 'Ocasionalmente', 'Frequentemente']
export const SONO_OPTIONS = ['Boa', 'Regular', 'Ruim']
export const ESTRESSE_OPTIONS = ['Baixo', 'Moderado', 'Alto']
export const ROTINA_OPTIONS = ['Predominantemente sentado', 'Predominantemente em pé', 'Esforço físico intenso', 'Misto']

/**
 * Perfil de estilo de vida em 5 dimensões, 0-100, calculado a partir das
 * respostas — vira o gráfico de barras mostrado ao aluno/painel. Escala
 * única (magnitude), sem cor por categoria: é a mesma métrica em 5 eixos.
 */
export interface LifestyleScore { key: string; label: string; value: number }

export function computeLifestyleScores(a: AnamneseAnswers): LifestyleScore[] {
  const condicionamentoMap: Record<string, number> = {
    'Sedentário': 10, 'Pouco ativo': 30, 'Moderadamente ativo': 55, 'Ativo': 80, 'Muito ativo': 100,
  }
  const sonoMap: Record<string, number> = { 'Ruim': 20, 'Regular': 55, 'Boa': 90 }
  const estresseMap: Record<string, number> = { 'Alto': 20, 'Moderado': 55, 'Baixo': 90 }

  const atividade = condicionamentoMap[a.condicionamento ?? ''] ?? 0
  const sono = sonoMap[a.sono ?? ''] ?? 0
  const estresse = estresseMap[a.estresse ?? ''] ?? 0
  const agua = Math.max(0, Math.min(100, Math.round(((Number(a.agua) || 0) / 2) * 100)))

  let habitos = 100
  if (a.fumante === 'Sim') habitos -= 40
  else if (a.fumante === 'Ex-fumante') habitos -= 15
  if (a.alcool === 'Frequentemente') habitos -= 30
  else if (a.alcool === 'Ocasionalmente') habitos -= 10
  habitos = Math.max(0, habitos)

  return [
    { key: 'atividade', label: 'Atividade física', value: atividade },
    { key: 'sono', label: 'Sono', value: sono },
    { key: 'estresse', label: 'Estresse (invertido)', value: estresse },
    { key: 'agua', label: 'Hidratação', value: agua },
    { key: 'habitos', label: 'Hábitos (fumo/álcool)', value: habitos },
  ]
}

export interface AnamneseAnswers {
  // Identificação
  nome?: string
  nascimento?: string
  idade?: string
  sexo?: string
  telefone?: string
  email?: string
  profissao?: string
  peso?: string
  altura?: string
  emerg_nome?: string
  emerg_telefone?: string
  modalidade?: string
  modalidade_outra?: string
  // PAR-Q
  parq?: (boolean | null)[] // true = Sim, false = Não, null = não respondido
  parq_comentario?: string
  // Histórico de saúde (checked + detalhe por item de HEALTH_HISTORY)
  health?: Record<string, { answer: boolean | null; detail?: string }>
  // Histórico de atividade física
  hist_atividade?: string
  tempo_sedentarismo?: string
  condicionamento?: string
  experiencia_previa?: string
  limitacoes?: string
  // Hábitos de vida
  fumante?: string
  alcool?: string
  sono?: string
  horas_sono?: string
  estresse?: string
  rotina?: string
  agua?: string
  // Objetivos
  motivacao?: string
  objetivos?: string
  receios?: string
}
