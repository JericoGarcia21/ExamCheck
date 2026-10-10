import { lazy, Suspense } from 'react'
import { BrowserRouter, Route, Routes } from 'react-router-dom'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import AppSplash from './components/AppSplash'
import AppLayout from './components/AppLayout'
import RequireAuth from './components/RequireAuth'
import PwaUpdatePrompt from './components/PwaUpdatePrompt'
import InstallPrompt from './components/InstallPrompt'

// Route-level code splitting keeps the initial load small.
const DashboardPage = lazy(() => import('./pages/DashboardPage'))
const ClassesPage = lazy(() => import('./pages/ClassesPage'))
const ClassDetailPage = lazy(() => import('./pages/ClassDetailPage'))
const SessionPage = lazy(() => import('./pages/SessionPage'))
const CheckingPage = lazy(() => import('./pages/CheckingPage'))
const ResultsPage = lazy(() => import('./pages/ResultsPage'))
const SessionResultsPage = lazy(() => import('./pages/SessionResultsPage'))
const LoginPage = lazy(() => import('./pages/LoginPage'))

const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      retry: 1,
      staleTime: 30_000,
      refetchOnWindowFocus: false,
    },
  },
})

export default function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <BrowserRouter>
        <InstallPrompt />
        <PwaUpdatePrompt />
        <Suspense fallback={<AppSplash />}>
          <Routes>
            <Route path="/login" element={<LoginPage />} />
            <Route
              element={
                <RequireAuth>
                  <AppLayout />
                </RequireAuth>
              }
            >
              <Route path="/" element={<DashboardPage />} />
              <Route path="/classes" element={<ClassesPage />} />
              <Route path="/classes/:classId" element={<ClassDetailPage />} />
              <Route path="/sessions/:sessionId" element={<SessionPage />} />
              <Route path="/checking" element={<CheckingPage />} />
              <Route path="/results" element={<ResultsPage />} />
              <Route path="/results/:sessionId" element={<SessionResultsPage />} />
            </Route>
          </Routes>
        </Suspense>
      </BrowserRouter>
    </QueryClientProvider>
  )
}
