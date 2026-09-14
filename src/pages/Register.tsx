import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import { Link, useNavigate, useSearchParams } from 'react-router-dom'
import { useEffect } from 'react'
import { Scissors, Mail, Lock, Building2, Phone, MapPin, Check } from 'lucide-react'
import { useAuth } from '../context/AuthContext'
import { supabase } from '../lib/supabase'
import { Button } from '../components/ui/Button'
import { Input } from '../components/ui/Input'
import { SEGMENTS, CATEGORIES_BY_SEGMENT, CATEGORY_LABELS, ALL_CATEGORIES } from '../lib/segments'

const schema = z.object({
  name: z.string().min(2, 'Nome obrigatório'),
  segment: z.enum(['estetica', 'saude_fitness'], { message: 'Escolha a linha do seu negócio' }),
  category: z.enum(ALL_CATEGORIES, { message: 'Selecione a categoria' }),
  phone: z.string().min(10, 'Telefone inválido'),
  address: z.string().min(5, 'Endereço obrigatório'),
  email: z.string().min(1, 'Email obrigatório').email('Email inválido'),
  password: z.string().min(6, 'Mínimo 6 caracteres'),
})

type FormData = z.infer<typeof schema>

function slugify(text: string) {
  return text
    .toLowerCase()
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '')
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-|-$/g, '')
}

export default function Register() {
  const { signUp } = useAuth()
  const navigate = useNavigate()
  const [searchParams] = useSearchParams()

  const {
    register,
    handleSubmit,
    setError,
    watch,
    setValue,
    formState: { errors, isSubmitting },
  } = useForm<FormData>({ resolver: zodResolver(schema) })

  const segment = watch('segment')

  // Vindo de uma landing dedicada (/estetica ou /saude-fitness) via
  // "Cadastrar grátis" — a linha do negócio já vem escolhida.
  useEffect(() => {
    const linha = searchParams.get('linha')
    if (linha === 'estetica' || linha === 'saude_fitness') {
      setValue('segment', linha, { shouldValidate: true })
    }
  }, [searchParams, setValue])

  const onSubmit = async (data: FormData) => {
    // Tenta signup; se o usuário já existe, tenta login direto
    const { error: authError } = await signUp(data.email, data.password)
    if (authError && !authError.message.includes('already registered')) {
      setError('root', { message: authError.message })
      return
    }

    // Garante sessão ativa fazendo login após signup
    const { error: loginError, data: loginData } = await supabase.auth.signInWithPassword({
      email: data.email,
      password: data.password,
    })
    if (loginError || !loginData.user) {
      setError('root', { message: loginError?.message ?? 'Erro ao autenticar. Tente novamente.' })
      return
    }

    const user = loginData.user
    const slug = `${slugify(data.name)}-${Date.now().toString(36).slice(-4)}`

    const { error: dbError } = await supabase.from('establishments').insert({
      owner_id: user.id,
      name: data.name,
      slug,
      segment: data.segment,
      category: data.category,
      phone: data.phone,
      address: data.address,
      email: data.email,
    })

    if (dbError) {
      setError('root', { message: dbError.message })
      return
    }

    navigate('/selecionar')
  }

  return (
    <div className="min-h-screen bg-paper flex items-center justify-center p-4">
      <div className="bg-white rounded-2xl shadow-xl w-full max-w-md p-8">
        <div className="flex flex-col items-center mb-8">
          <div className="w-12 h-12 rounded-xl bg-brand flex items-center justify-center mb-4">
            <Scissors size={24} className="text-white" />
          </div>
          <h1 className="font-display text-3xl tracking-tight text-ink">Criar conta</h1>
          <p className="text-sm text-gray-500 mt-1">Cadastre seu estabelecimento gratuitamente</p>
        </div>

        <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
          <Input
            label="Nome do estabelecimento"
            placeholder="Ex: Salão da Maria"
            icon={<Building2 size={16} />}
            error={errors.name?.message}
            {...register('name')}
          />

          {/* Linha do negócio (segmento) */}
          <div className="flex flex-col gap-1.5">
            <label className="text-sm font-medium text-gray-700">Linha do seu negócio</label>
            <div className="grid grid-cols-2 gap-2">
              {SEGMENTS.map(({ value, label, tagline, icon: Icon }) => {
                const on = segment === value
                return (
                  <button
                    key={value}
                    type="button"
                    onClick={() => {
                      setValue('segment', value, { shouldValidate: true })
                      // troca de linha zera a categoria escolhida
                      setValue('category', '' as FormData['category'], { shouldValidate: false })
                    }}
                    className={`flex flex-col gap-1 text-left rounded-xl border p-3 transition ${
                      on ? 'border-brand bg-brand-soft' : 'border-gray-200 hover:border-brand/40'
                    }`}
                  >
                    <span className="flex items-center gap-1.5">
                      <Icon size={15} className={on ? 'text-brand' : 'text-gray-400'} />
                      <span className={`text-sm font-semibold ${on ? 'text-brand-dark' : 'text-gray-800'}`}>{label}</span>
                      {on && <Check size={13} className="text-brand ml-auto" />}
                    </span>
                    <span className="text-[11px] leading-snug text-gray-500">{tagline}</span>
                  </button>
                )
              })}
            </div>
            {errors.segment && <p className="text-xs text-red-600">{errors.segment.message}</p>}
          </div>

          {/* Categoria — filtrada pela linha escolhida */}
          <div className="flex flex-col gap-1.5">
            <label className="text-sm font-medium text-gray-700">Categoria</label>
            <select
              disabled={!segment}
              className="w-full rounded-xl border border-gray-300 bg-white py-2.5 px-4 text-sm text-gray-900 focus:border-brand focus:outline-none focus:ring-2 focus:ring-brand/20 transition disabled:bg-gray-50 disabled:text-gray-400"
              {...register('category')}
            >
              <option value="">{segment ? 'Selecione a categoria' : 'Escolha a linha primeiro'}</option>
              {segment && CATEGORIES_BY_SEGMENT[segment].map((cat) => (
                <option key={cat} value={cat}>{CATEGORY_LABELS[cat]}</option>
              ))}
            </select>
            {errors.category && <p className="text-xs text-red-600">{errors.category.message}</p>}
          </div>

          <Input
            label="Telefone"
            placeholder="(11) 99999-9999"
            icon={<Phone size={16} />}
            error={errors.phone?.message}
            {...register('phone')}
          />

          <Input
            label="Endereço"
            placeholder="Rua, número, bairro, cidade"
            icon={<MapPin size={16} />}
            error={errors.address?.message}
            {...register('address')}
          />

          <Input
            label="Email de acesso"
            type="email"
            placeholder="seu@email.com"
            icon={<Mail size={16} />}
            error={errors.email?.message}
            {...register('email')}
          />

          <Input
            label="Senha"
            type="password"
            placeholder="••••••••"
            icon={<Lock size={16} />}
            error={errors.password?.message}
            {...register('password')}
          />

          {errors.root && (
            <p className="text-sm text-red-600 bg-red-50 rounded-xl px-4 py-3">
              {errors.root.message}
            </p>
          )}

          <Button type="submit" loading={isSubmitting} className="w-full" size="lg">
            Criar conta
          </Button>
        </form>

        <p className="text-center text-sm text-gray-500 mt-6">
          Já tem conta?{' '}
          <Link to="/login" className="text-brand font-medium hover:underline">
            Entrar
          </Link>
        </p>
      </div>
    </div>
  )
}
