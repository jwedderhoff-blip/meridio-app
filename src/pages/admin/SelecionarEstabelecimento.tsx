import { useEffect, useState } from 'react'
import { useNavigate, Link } from 'react-router-dom'
import { Plus } from 'lucide-react'
import { useAuth } from '../../context/AuthContext'
import { useEstablishments } from '../../hooks/useEstablishments'
import { setSelectedEstablishmentId } from '../../hooks/useEstablishment'
import { CATEGORY_LABELS, CATEGORY_ICONS } from '../../lib/segments'
import { supabase } from '../../lib/supabase'

export default function SelecionarEstabelecimento() {
  const { user } = useAuth()
  const { establishments, hasOwned, loading } = useEstablishments(user?.id)
  const navigate = useNavigate()
  const [checkingAdmin, setCheckingAdmin] = useState(true)

  const select = (id: string) => {
    setSelectedEstablishmentId(id)
    navigate('/admin')
  }

  // Com um único estabelecimento (dono de um só, ou professor visualizador),
  // não faz sentido a tela de escolha: vai direto para o painel.
  useEffect(() => {
    if (!loading && establishments.length === 1) {
      setSelectedEstablishmentId(establishments[0].id)
      navigate('/admin', { replace: true })
    }
  }, [loading, establishments, navigate])

  // Login não é dono nem visualizador de nenhum estabelecimento — antes de
  // mostrar "sem acesso", confere se é um login de superadmin (que pode não
  // ter estabelecimento próprio algum) e manda direto pro painel dele.
  useEffect(() => {
    if (loading || establishments.length > 0 || !user) { setCheckingAdmin(false); return }
    let cancelled = false
    supabase
      .from('admins')
      .select('user_id')
      .eq('user_id', user.id)
      .maybeSingle()
      .then(({ data }) => {
        if (cancelled) return
        if (data) { navigate('/superadmin', { replace: true }); return }
        setCheckingAdmin(false)
      })
    return () => { cancelled = true }
  }, [loading, establishments, user, navigate])

  if (loading || establishments.length === 1 || (establishments.length === 0 && checkingAdmin)) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="w-8 h-8 rounded-full border-2 border-brand border-t-transparent animate-spin" />
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-paper flex items-center justify-center p-4">
      <div className="bg-white rounded-2xl shadow-xl w-full max-w-md p-8">
        <h1 className="font-display text-3xl tracking-tight text-ink mb-1">Seus estabelecimentos</h1>
        <p className="text-sm text-gray-500 mb-6">Selecione qual deseja gerenciar agora</p>

        <div className="space-y-3 mb-6">
          {establishments.map((e) => {
            const Icon = CATEGORY_ICONS[e.category ?? 'outro']
            const label = CATEGORY_LABELS[e.category ?? 'outro']
            return (
              <button
                key={e.id}
                onClick={() => select(e.id)}
                className="flex items-center gap-4 w-full bg-gray-50 hover:bg-brand-soft hover:border-brand/40 border border-gray-200 rounded-2xl p-4 transition text-left group"
              >
                <div className="w-12 h-12 rounded-xl bg-brand flex items-center justify-center shrink-0 group-hover:bg-brand-dark transition">
                  <Icon size={22} className="text-white" />
                </div>
                <div className="min-w-0">
                  <p className="font-semibold text-gray-900 truncate">{e.name}</p>
                  <p className="text-sm text-gray-400">{label}</p>
                  {e.address && (
                    <p className="text-xs text-gray-400 truncate mt-0.5">{e.address}</p>
                  )}
                </div>
              </button>
            )
          })}
        </div>

        {/* Só o dono cadastra novos estabelecimentos. Visualizador (professor) não. */}
        {hasOwned && (
          <Link
            to="/register"
            className="flex items-center justify-center gap-2 w-full border-2 border-dashed border-brand/40 text-brand rounded-2xl py-3.5 font-medium hover:bg-brand-soft transition text-sm"
          >
            <Plus size={18} />
            Cadastrar novo estabelecimento
          </Link>
        )}

        {!hasOwned && establishments.length === 0 && (
          <p className="text-sm text-gray-400 text-center">
            Nenhum acesso encontrado para este login. Peça ao dono para liberar seu e-mail em
            Configurações → Login dos professores.
          </p>
        )}
      </div>
    </div>
  )
}
