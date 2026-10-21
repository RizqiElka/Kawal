import React, { useEffect, useState } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { useQueryClient } from '@tanstack/react-query';
import apiClient from '../api/client';

/**
 * Halaman SSO Callback — /sso/callback
 *
 * Backend SIGAP (Laravel) setelah berhasil tukar code → token ke SIPEG,
 * akan redirect ke sini dengan:
 *   ?token=xxxxx&role=kontributor
 *
 * Halaman ini:
 * 1. Ambil token & role dari URL
 * 2. Simpan token ke localStorage
 * 3. Ambil data user lengkap dari backend SIGAP (/api/auth/me)
 * 4. Simpan data user ke localStorage
 * 5. Redirect ke dashboard
 */
const SsoCallbackPage: React.FC = () => {
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const queryClient = useQueryClient();

  const [status, setStatus] = useState<'loading' | 'error'>('loading');
  const [errorMsg, setErrorMsg] = useState('');

  useEffect(() => {
    const handleCallback = async () => {
      const token = searchParams.get('token');
      const error = searchParams.get('error');

      // Cek apakah ada error dari backend
      if (error) {
        setErrorMsg(decodeURIComponent(error));
        setStatus('error');
        return;
      }

      // Cek apakah token ada
      if (!token) {
        setErrorMsg('Token tidak ditemukan. Silakan coba login kembali.');
        setStatus('error');
        return;
      }

      try {
        // Simpan token SIGAP
        localStorage.setItem('sigap_token', token);

        // Ambil data user lengkap dari SIGAP backend
        const response = await apiClient.get('/auth/me', {
          headers: { Authorization: `Bearer ${token}` },
        });

        const userData = response.data.data;

        // Simpan data user
        localStorage.setItem('sigap_user', JSON.stringify(userData));
        queryClient.clear();

        // Redirect ke dashboard
        window.location.href = '/dashboard';
      } catch (err: any) {
        console.error('SSO callback error:', err);
        localStorage.removeItem('sigap_token');
        localStorage.removeItem('sigap_user');
        setErrorMsg('Gagal memuat data pengguna. Silakan coba lagi.');
        setStatus('error');
      }
    };

    handleCallback();
  }, []);

  const handleRetry = () => {
    // Redirect ke backend SIGAP untuk mulai ulang SSO
    window.location.href = `${import.meta.env.VITE_API_URL?.replace('/api', '') ?? 'http://localhost:8000'}/sso/login`;
  };

  if (status === 'error') {
    return (
      <div className="min-h-screen flex items-center justify-center bg-slate-50 dark:bg-slate-900">
        <div className="max-w-md w-full mx-4 bg-white dark:bg-slate-800 rounded-2xl shadow-lg p-8 text-center">
          {/* Icon error */}
          <div className="w-16 h-16 bg-red-100 dark:bg-red-900/30 rounded-full flex items-center justify-center mx-auto mb-4">
            <svg className="w-8 h-8 text-red-500" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
                d="M6 18L18 6M6 6l12 12" />
            </svg>
          </div>

          <h1 className="text-xl font-bold text-slate-800 dark:text-slate-100 mb-2">
            Login Gagal
          </h1>
          <p className="text-slate-500 dark:text-slate-400 text-sm mb-6">
            {errorMsg}
          </p>

          <button
            onClick={handleRetry}
            className="w-full py-2.5 px-4 bg-sigap-600 hover:bg-sigap-700 text-white rounded-lg font-medium text-sm transition-colors"
          >
            Coba Login Lagi
          </button>
        </div>
      </div>
    );
  }

  // Loading state
  return (
    <div className="min-h-screen flex items-center justify-center bg-slate-50 dark:bg-slate-900">
      <div className="text-center">
        {/* Spinner */}
        <div className="w-14 h-14 border-4 border-sigap-200 border-t-sigap-600 rounded-full animate-spin mx-auto mb-4" />

        <h2 className="text-lg font-semibold text-slate-700 dark:text-slate-200 mb-1">
          Memproses Login SSO...
        </h2>
        <p className="text-slate-400 dark:text-slate-500 text-sm">
          Mengambil data dari SIPEG, harap tunggu sebentar.
        </p>
      </div>
    </div>
  );
};

export default SsoCallbackPage;

