import { useEffect, useState } from 'react'
import { NavLink, Outlet, useNavigate } from 'react-router-dom'
import {
  CalendarDays,
  Users,
  UserCog,
  SlidersHorizontal,
  LogOut,
  Menu,
  X,
  LayoutDashboard,
  ListChecks,
  Wallet,
  Banknote,
  ShieldAlert,
  ChevronDown,
  ArrowLeftRight,
} from 'lucide-react'
import { cn } from '../../lib/utils'
import { useAuth } from '../../context/AuthContext'
import { useTheme } from '../../context/ThemeContext'
import { useEstablishment, setSelectedEstablishmentId, clearAdminViewEstablishmentId } from '../../hooks/useEstablishment'
import { useEstablishments } from '../../hooks/useEstablishments'
import { CATEGORY_LABELS, CATEGORY_ICONS } from '../../lib/segments'


const navItems = [
  { to: '/admin', label: 'Dashboard', icon: LayoutDashboard, end: true, viewer: true },
  { to: '/admin/agenda', label: 'Agenda', icon: CalendarDays, end: false, viewer: true },
  { to: '/admin/clientes', label: 'Clientes', icon: Users, end: false, viewer: true },
  { to: '/admin/servicos', label: 'Serviços', icon: ListChecks, end: false, viewer: true },
  { to: '/admin/caixa', label: 'Caixa', icon: Banknote, end: false, viewer: true, beta: true },
  { to: '/admin/profissionais', label: 'Profissionais', icon: UserCog, end: false, viewer: false },
  { to: '/admin/financeiro', label: 'Financeiro', icon: Wallet, end: false, viewer: false },
  { to: '/admin/configuracoes', label: 'Configurações', icon: SlidersHorizontal, end: false, viewer: false },
]

export default function AdminLayout() {
  const { user, signOut } = useAuth()
  const { establishment, role } = useEstablishment(user?.id)
  const isViewer = role === 'viewer'
  // Caixa é recurso beta: só aparece nos estabelecimentos liberados pelo superadmin.
  const visibleNav = navItems
    .filter((i) => !i.beta || establishment?.cash_beta_enabled)
    .filter((i) => !isViewer || i.viewer)
  const { establishments: ownEstablishments } = useEstablishments(user?.id)
  const { applyEstablishment } = useTheme()
  const navigate = useNavigate()

  // No modo "entrar no painel do cliente" o trocador deve mostrar só esse
  // cliente — trocar aqui não pode voltar para os estabelecimentos do
  // próprio superadmin, o que confundiria os dois contextos.
  const isAdminView = role === 'admin'
  const establishments = isAdminView ? [] : ownEstablishments

  // Tema e cor vêm do estabelecimento ativo. Quem administra mais de um vê os
  // dois trocarem ao alternar, sem nada do anterior sobrando.
  useEffect(() => {
    applyEstablishment(establishment)
  }, [establishment, applyEstablishment])

  // Marca o painel no body para escalar a tipografia (ver index.css). Fica no
  // body — e não numa div — para alcançar também os modais, que são portados
  // para fora da árvore do layout. O site de vendas e o demo não recebem a
  // marca, então continuam com o tamanho atual.
  useEffect(() => {
    document.body.setAttribute('data-app', 'panel')
    return () => document.body.removeAttribute('data-app')
  }, [])

  const [sidebarOpen, setSidebarOpen] = useState(false)
  const [switcherOpen, setSwitcherOpen] = useState(false)

  const handleSignOut = async () => {
    await signOut()
    navigate('/login')
  }

  const exitAdminView = () => {
    clearAdminViewEstablishmentId()
    navigate('/superadmin/estabelecimentos')
    window.location.reload()
  }

  const CategoryIcon = CATEGORY_ICONS[establishment?.category ?? 'outro']

  const sidebar = (
    <div className="flex flex-col h-full">
      <div className="p-5 border-b border-gray-100">
        <div className="relative">
          <button
            onClick={() => establishments.length > 1 && setSwitcherOpen((v) => !v)}
            className={cn(
              'flex items-center gap-2 w-full text-left',
              establishments.length > 1 && 'hover:bg-gray-50 rounded-xl px-1 py-0.5 -mx-1 transition'
            )}
          >
            <div className="w-8 h-8 rounded-lg bg-brand flex items-center justify-center shrink-0">
              <CategoryIcon size={16} className="text-white" />
            </div>
            <div className="min-w-0 flex-1">
              <p className="text-sm font-semibold text-gray-900 truncate">
                {establishment?.name ?? 'Meu estabelecimento'}
              </p>
              <p className="text-xs text-gray-400">
                {establishment?.tagline ?? (establishment?.category ? CATEGORY_LABELS[establishment.category] : '')}
              </p>
            </div>
            {establishments.length > 1 && (
              <ChevronDown size={14} className="text-gray-400 shrink-0" />
            )}
          </button>

          {switcherOpen && establishments.length > 1 && (
            <div className="absolute top-full left-0 right-0 mt-1 bg-white border border-gray-200 rounded-xl shadow-lg z-50 overflow-hidden">
              {establishments.map((e) => (
                <button
                  key={e.id}
                  onClick={() => {
                    setSelectedEstablishmentId(e.id)
                    setSwitcherOpen(false)
                    window.location.reload()
                  }}
                  className={cn(
                    'flex items-center gap-2 w-full px-3 py-2.5 text-sm text-left hover:bg-brand-soft transition',
                    e.id === establishment?.id && 'bg-brand-soft text-brand-dark font-medium'
                  )}
                >
                  <span className="truncate">{e.name}</span>
                </button>
              ))}
            </div>
          )}
        </div>
      </div>

      <nav className="flex-1 p-3 space-y-0.5 overflow-y-auto">
        {visibleNav.map(({ to, label, icon: Icon, end }) => (
          <NavLink
            key={to}
            to={to}
            end={end}
            onClick={() => setSidebarOpen(false)}
            className={({ isActive }) =>
              cn(
                'flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-medium transition',
                isActive
                  ? 'bg-brand text-white'
                  : 'text-gray-600 hover:bg-gray-100 hover:text-gray-900'
              )
            }
          >
            <Icon size={18} />
            {label}
          </NavLink>
        ))}
      </nav>

      <div className="p-3 border-t border-gray-100 space-y-0.5">
        {establishments.length > 1 && (
          <button
            onClick={() => navigate('/selecionar')}
            className="flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-medium text-gray-600 hover:bg-brand-soft hover:text-brand-dark transition w-full"
          >
            <ArrowLeftRight size={18} />
            Trocar estabelecimento
          </button>
        )}
        <button
          onClick={handleSignOut}
          className="flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-medium text-gray-600 hover:bg-red-50 hover:text-red-700 transition w-full"
        >
          <LogOut size={18} />
          Sair
        </button>
      </div>
    </div>
  )

  return (
    <div className="min-h-screen bg-paper">
      {/* Desktop sidebar */}
      <aside className="hidden lg:fixed lg:inset-y-0 lg:left-0 lg:w-64 lg:flex lg:flex-col bg-white border-r border-gray-200">
        {sidebar}
      </aside>

      {/* Mobile sidebar */}
      {sidebarOpen && (
        <>
          <div
            className="fixed inset-0 z-30 bg-black/40 lg:hidden"
            onClick={() => setSidebarOpen(false)}
          />
          <aside className="fixed inset-y-0 left-0 z-40 w-64 bg-white border-r border-gray-200 lg:hidden flex flex-col">
            {sidebar}
          </aside>
        </>
      )}

      {/* Main content */}
      <div className="lg:pl-64">
        {isAdminView && (
          <div className="sticky top-0 z-30 bg-amber-500 text-white text-sm px-4 py-2 flex items-center justify-between gap-3">
            <span className="flex items-center gap-2 min-w-0">
              <ShieldAlert size={16} className="shrink-0" />
              <span className="truncate">
                Modo Super Admin — editando <strong>{establishment?.name}</strong>
              </span>
            </span>
            <button
              onClick={exitAdminView}
              className="shrink-0 text-xs font-semibold bg-white/20 hover:bg-white/30 px-3 py-1.5 rounded-lg transition"
            >
              Sair
            </button>
          </div>
        )}
        <header className="sticky z-20 bg-white border-b border-gray-200 flex items-center gap-3 px-4 h-14" style={{ top: isAdminView ? '36px' : 0 }}>
          <button
            onClick={() => setSidebarOpen(true)}
            className="lg:hidden p-2 rounded-lg text-gray-500 hover:bg-gray-100 transition"
          >
            {sidebarOpen ? <X size={20} /> : <Menu size={20} />}
          </button>
          <span className="text-sm text-gray-400 truncate">
            {user?.email}
          </span>
        </header>
        <main className="p-4 sm:p-6 lg:p-8">
          <Outlet />
        </main>
      </div>
    </div>
  )
}
