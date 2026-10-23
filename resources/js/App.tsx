import React, { Suspense } from 'react';
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { AuthProvider } from './context/AuthContext';
import { ToastProvider } from './context/ToastContext';
import { ProtectedRoute } from './components/ProtectedRoute';
import { AppLayout } from './components/Layout';
import { ThemeProvider } from './context/ThemeContext';

const JenisKontenPage = React.lazy(() => import('./pages/JenisKontenPage'));
const SsoCallbackPage = React.lazy(() => import('./pages/SsoCallbackPage'));

// Lazy-loaded pages
const LoginPage = React.lazy(() => import('./pages/LoginPage'));
const DashboardPage = React.lazy(() => import('./pages/DashboardPage'));
const KontenListPage = React.lazy(() => import('./pages/KontenListPage'));
const KontenFormPage = React.lazy(() => import('./pages/KontenFormPage'));
const KontenDetailPage = React.lazy(() => import('./pages/KontenDetailPage'));
const PublisherPage = React.lazy(() => import('./pages/PublisherPage'));
const PenggunaPage = React.lazy(() => import('./pages/PenggunaPage'));
const RolesPage = React.lazy(() => import('./pages/RolesPage'));
const NotifikasiPage = React.lazy(() => import('./pages/NotifikasiPage'));

const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      retry: 1,
      staleTime: 1000 * 30, // 30 detik
      refetchOnWindowFocus: false,
    },
    mutations: {
      retry: 0,
    },
  },
});

const PageLoader: React.FC = () => (
  <div className="min-h-screen flex items-center justify-center bg-slate-50 dark:bg-slate-900/50">
    <div className="flex flex-col items-center gap-3">
      <div className="w-10 h-10 border-4 border-sigap-200 border-t-sigap-600 rounded-full animate-spin" />
      <span className="text-slate-500 dark:text-slate-400 text-sm font-medium">Memuat halaman...</span>
    </div>
  </div>
);

const App: React.FC = () => {
  return (
    <QueryClientProvider client={queryClient}>
      <ThemeProvider>
        <AuthProvider>
          <ToastProvider>
          <BrowserRouter>
            <Suspense fallback={<PageLoader />}>
              <Routes>
                {/* Public */}
                <Route path="/login" element={<LoginPage />} />

                {/* SSO Callback — menerima redirect dari backend SIGAP setelah tukar code ke SIPEG */}
                <Route path="/sso/callback" element={<SsoCallbackPage />} />
                <Route path="/sso-callback" element={<SsoCallbackPage />} />

                {/* Protected – wrapped in AppLayout */}
                <Route
                  path="/dashboard"
                  element={
                    <ProtectedRoute>
                      <AppLayout>
                        <DashboardPage />
                      </AppLayout>
                    </ProtectedRoute>
                  }
                />

                <Route
                  path="/konten"
                  element={
                    <ProtectedRoute permission="konten.lihat">
                      <AppLayout>
                        <KontenListPage />
                      </AppLayout>
                    </ProtectedRoute>
                  }
                />

                <Route
                  path="/konten/buat"
                  element={
                    <ProtectedRoute permission="konten.buat">
                      <AppLayout>
                        <KontenFormPage />
                      </AppLayout>
                    </ProtectedRoute>
                  }
                />

                <Route
                  path="/konten/:id"
                  element={
                    <ProtectedRoute permission="konten.lihat">
                      <AppLayout>
                        <KontenDetailPage />
                      </AppLayout>
                    </ProtectedRoute>
                  }
                />

                <Route
                  path="/konten/:id/edit"
                  element={
                    <ProtectedRoute permission="konten.lihat">
                      <AppLayout>
                        <KontenFormPage />
                      </AppLayout>
                    </ProtectedRoute>
                  }
                />

                <Route
                  path="/publisher"
                  element={
                    <ProtectedRoute permission="publikasi.terbitkan">
                      <AppLayout>
                        <PublisherPage />
                      </AppLayout>
                    </ProtectedRoute>
                  }
                />

                <Route
                  path="/pengguna"
                  element={
                    <ProtectedRoute permission="pengguna.kelola">
                      <AppLayout>
                        <PenggunaPage />
                      </AppLayout>
                    </ProtectedRoute>
                  }
                />

                <Route
                  path="/roles"
                  element={
                    <ProtectedRoute permission="role.kelola">
                      <AppLayout>
                        <RolesPage />
                      </AppLayout>
                    </ProtectedRoute>
                  }
                />

                <Route
                  path="/notifikasi"
                  element={
                    <ProtectedRoute>
                      <AppLayout>
                        <NotifikasiPage />
                      </AppLayout>
                    </ProtectedRoute>
                  }
                />



                <Route
                  path="/jenis-konten"
                  element={
                    <ProtectedRoute permission="pengaturan.kelola">
                      <AppLayout>
                        <JenisKontenPage />
                      </AppLayout>
                    </ProtectedRoute>
                  }
                />

                {/* Fallback */}
                <Route path="/" element={<Navigate to="/dashboard" replace />} />
                <Route path="*" element={<Navigate to="/dashboard" replace />} />
              </Routes>
            </Suspense>
          </BrowserRouter>
          </ToastProvider>
        </AuthProvider>
      </ThemeProvider>
    </QueryClientProvider>
  );
};

export default App;
