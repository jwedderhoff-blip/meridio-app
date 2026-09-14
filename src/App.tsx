import { lazy, Suspense, useEffect, useState } from 'react'
import { Navigate, Outlet, Route, BrowserRouter as Router, Routes } from 'react-router-dom'
import { AuthProvider, useAuth } from './context/AuthContext'
import { useEstablishment } from './hooks/useEstablishment'
import { ThemeProvider } from './context/ThemeContext'
import { supabase } from './lib/supabase'
import AdminLayout from './components/layout/AdminLayout'
import DemoBanner from './components/ui/DemoBanner'
import Login from './pages/Login'
import Register from './pages/Register'
import Home from './pages/Home'
import Planos from './pages/Planos'
import Booking from './pages/Booking'
import EstabelecimentoPage from './pages/EstabelecimentoPage'
import NotFound from './pages/NotFound'
import Dashboard from './pages/admin/Dashboard'
import Agenda from './pages/admin/Agenda'
import Clientes from './pages/admin/Clientes'
import Servicos from './pages/admin/Servicos'
import Profissionais from './pages/admin/Profissionais'
import Financeiro from './pages/admin/Financeiro'
import Caixa from './pages/admin/Caixa'
import Configuracoes from './pages/admin/Configuracoes'
import SelecionarEstabelecimento from './pages/admin/SelecionarEstabelecimento'
import './index.css'

const SuperAdminLayout = lazy(() => import('./pages/superadmin/SuperAdminLayout'))
const SuperDashboard = lazy(() => import('./pages/superadmin/SuperDashboard'))
const SuperEstabelecimentos = lazy(() => import('./pages/superadmin/SuperEstabelecimentos'))
const SuperPlanos = lazy(() => import('./pages/superadmin/SuperPlanos'))
const SuperAssinaturas = lazy(() => import('./pages/superadmin/SuperAssinaturas'))
const SuperCobrancas = lazy(() => import('./pages/superadmin/SuperCobrancas'))
const SuperNotificacoes = lazy(() => import('./pages/superadmin/SuperNotificacoes'))
const Demo = lazy(() => import('./pages/Demo'))

function DemoFallback() {
  return (
    <div className="min-h-screen flex items-center justify-center" style={{ background: '#fbfaf8' }}>
      <div className="w-8 h-8 rounded-full border-2 border-indigo-600 border-t-transparent animate-spin" />
    </div>
  )
}

function SuperAdminFallback() {
  return (
    <div className="min-h-screen flex items-center justify-center bg-[#0f1117]">
      <div className="w-8 h-8 rounded-full border-2 border-indigo-400 border-t-transparent animate-spin" />
    </div>
  )
}

function PrivateRoute() {
  const { session, loading } = useAuth()
  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="w-8 h-8 rounded-full border-2 border-brand border-t-transparent animate-spin" />
      </div>
    )
  }
  if (!session) return <Navigate to="/login" replace />
  return <Outlet />
}

/**
 * Rotas exclusivas do dono. O login visualizador (professor) não acessa
 * Clientes, Profissionais, Financeiro nem Configurações — se tentar pela URL,
 * volta para o Dashboard.
 */
function OwnerRoute() {
  const { user } = useAuth()
  const { role, loading } = useEstablishment(user?.id)
  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="w-8 h-8 rounded-full border-2 border-brand border-t-transparent animate-spin" />
      </div>
    )
  }
  if (role === 'viewer') return <Navigate to="/admin" replace />
  return <Outlet />
}

/**
 * Caixa é recurso beta: só acessível nos estabelecimentos liberados pelo
 * superadmin (establishments.cash_beta_enabled). Tentativa pela URL direta
 * volta para o Dashboard.
 */
function CashBetaRoute() {
  const { user } = useAuth()
  const { establishment, loading } = useEstablishment(user?.id)
  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="w-8 h-8 rounded-full border-2 border-brand border-t-transparent animate-spin" />
      </div>
    )
  }
  if (!establishment?.cash_beta_enabled) return <Navigate to="/admin" replace />
  return <Outlet />
}

/**
 * Quem é super admin sai da tabela admins, e só dela. Já houve aqui uma lista
 * de e-mails no código como alternativa: além de exigir deploy para mudar quem
 * tem acesso, ela ia junto no bundle que qualquer visitante baixa.
 */
function SuperAdminRoute() {
  const { session, user, loading } = useAuth()
  const [checkingAdmin, setCheckingAdmin] = useState(true)
  const [isAdmin, setIsAdmin] = useState(false)
  const [denyReason, setDenyReason] = useState<string | null>(null)

  useEffect(() => {
    if (!session || !user) {
      setCheckingAdmin(false)
      return
    }
    supabase
      .from('admins')
      .select('user_id')
      .eq('user_id', user.id)
      .maybeSingle()
      .then(({ data, error }) => {
        setIsAdmin(!!data)
        if (!data) {
          setDenyReason(
            error
              ? `Erro ao consultar tabela admins: ${error.message}`
              : `Usuário não encontrado na tabela admins (id: ${user.id})`,
          )
        }
        setCheckingAdmin(false)
      })
  }, [session, user])

  if (loading || checkingAdmin) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="w-8 h-8 rounded-full border-2 border-indigo-600 border-t-transparent animate-spin" />
      </div>
    )
  }
  if (!session) return <Navigate to="/login" replace />
  if (!isAdmin) {
    return (
      <div className="min-h-screen flex items-center justify-center p-6 bg-gray-50">
        <div className="max-w-md w-full bg-white rounded-2xl border border-gray-200 p-6 space-y-4">
          <h1 className="text-lg font-semibold text-gray-900">Acesso negado ao Super Admin</h1>
          <dl className="text-sm space-y-2">
            <div>
              <dt className="text-gray-500">E-mail da sessão</dt>
              <dd className="font-mono text-gray-900 break-all">{user?.email ?? '(vazio)'}</dd>
            </div>
            <div>
              <dt className="text-gray-500">User ID</dt>
              <dd className="font-mono text-xs text-gray-900 break-all">{user?.id ?? '(vazio)'}</dd>
            </div>
            {denyReason && (
              <div>
                <dt className="text-gray-500">Motivo</dt>
                <dd className="text-gray-900">{denyReason}</dd>
              </div>
            )}
          </dl>
          <a href="/admin" className="block text-center bg-indigo-600 text-white text-sm py-2 rounded-xl">
            Voltar ao painel
          </a>
        </div>
      </div>
    )
  }
  return <Outlet />
}

function AppRoutes() {
  return (
    <Routes>
      <Route path="/" element={<Home />} />
      <Route path="/estetica" element={<Home key="estetica" segment="estetica" />} />
      <Route path="/saude-fitness" element={<Home key="saude_fitness" segment="saude_fitness" />} />
      <Route path="/login" element={<Login />} />
      <Route path="/register" element={<Register />} />
      <Route path="/planos" element={<Planos />} />
      <Route path="/demo" element={<Suspense fallback={<DemoFallback />}><Demo /></Suspense>} />
      <Route path="/agendar/:slug" element={<EstabelecimentoPage />} />
      <Route path="/agendar/:slug/agendar" element={<Booking />} />
      <Route element={<PrivateRoute />}>
        <Route path="/selecionar" element={<SelecionarEstabelecimento />} />
        <Route path="/admin" element={<AdminLayout />}>
          <Route index element={<Dashboard />} />
          <Route path="agenda" element={<Agenda />} />
          <Route path="servicos" element={<Servicos />} />
          <Route path="clientes" element={<Clientes />} />
          <Route element={<CashBetaRoute />}>
            <Route path="caixa" element={<Caixa />} />
          </Route>
          <Route element={<OwnerRoute />}>
            <Route path="profissionais" element={<Profissionais />} />
            <Route path="financeiro" element={<Financeiro />} />
            <Route path="configuracoes" element={<Configuracoes />} />
          </Route>
        </Route>
      </Route>
      <Route element={<SuperAdminRoute />}>
        <Route path="/superadmin" element={<Suspense fallback={<SuperAdminFallback />}><SuperAdminLayout /></Suspense>}>
          <Route index element={<SuperDashboard />} />
          <Route path="estabelecimentos" element={<SuperEstabelecimentos />} />
          <Route path="planos" element={<SuperPlanos />} />
          <Route path="assinaturas" element={<SuperAssinaturas />} />
          <Route path="cobrancas" element={<SuperCobrancas />} />
          <Route path="notificacoes" element={<SuperNotificacoes />} />
        </Route>
      </Route>
      <Route path="*" element={<NotFound />} />
    </Routes>
  )
}

export default function App() {
  return (
    // ThemeProvider por dentro: a preferência de tema é por usuário, então
    // ele precisa saber quem está logado.
    <AuthProvider>
      <ThemeProvider>
        <DemoBanner />
        <Router>
          <AppRoutes />
        </Router>
      </ThemeProvider>
    </AuthProvider>
  )
}
