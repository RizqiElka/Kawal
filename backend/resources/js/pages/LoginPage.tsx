import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useForm } from 'react-hook-form';
import { z } from 'zod';
import { zodResolver } from '@hookform/resolvers/zod';
import { Eye, EyeOff, LogIn, ShieldCheck } from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import { useToast } from '../context/ToastContext';

const loginSchema = z.object({
  login: z.string().min(1, 'NIP atau email wajib diisi'),
  password: z.string().min(1, 'Kata sandi wajib diisi'),
});

type LoginForm = z.infer<typeof loginSchema>;

const LoginPage: React.FC = () => {
  const { login } = useAuth();
  const toast = useToast();
  const navigate = useNavigate();
  const [showPassword, setShowPassword] = useState(false);

  const {
    register,
    handleSubmit,
    setError,
    formState: { errors, isSubmitting },
  } = useForm<LoginForm>({ resolver: zodResolver(loginSchema) });

  const onSubmit = async (data: LoginForm) => {
    try {
      await login(data.login, data.password);
      toast.success('Selamat datang di KAWAL!');
      navigate('/dashboard');
    } catch (err: any) {
      const errorData = err?.response?.data;
      if (errorData?.errors?.login) {
        setError('login', { message: errorData.errors.login[0] });
      } else if (errorData?.message) {
        toast.error(errorData.message);
      } else {
        toast.error('Terjadi kesalahan. Periksa koneksi server.');
      }
    }
  };

  return (
    <div className="min-h-screen flex flex-col lg:flex-row bg-slate-50 dark:bg-slate-900/50">
      {/* Left Panel - Branding */}
      <div className="hidden lg:flex flex-col justify-between w-1/2 bg-gradient-to-br from-sigap-900 via-sigap-800 to-sigap-700 p-12 text-white relative overflow-hidden">
        {/* Background Geometric Patterns */}
        <div className="absolute inset-0 opacity-10">
          <div className="absolute top-0 right-0 w-96 h-96 bg-white dark:bg-slate-800 rounded-full -translate-y-1/2 translate-x-1/2" />
          <div className="absolute bottom-0 left-0 w-72 h-72 bg-white dark:bg-slate-800 rounded-full translate-y-1/2 -translate-x-1/2" />
        </div>

        <div className="relative z-10">
          <div className="flex items-center gap-3 mb-2">
            <div className="w-12 h-12 bg-white/20 rounded-2xl flex items-center justify-center backdrop-blur-sm">
              <ShieldCheck className="w-6 h-6 text-white" />
            </div>
            <span className="text-xl font-bold tracking-wide">KAWAL</span>
          </div>
          <p className="text-sigap-200 text-sm">Platform Pengawalan Alur & Publikasi Konten</p>
        </div>

        <div className="relative z-10 space-y-6">
          <h1 className="text-4xl font-bold leading-tight">
            Kelola konten instansi dengan<br />
            <span className="text-sigap-300">alur persetujuan</span><br />
            yang tertib dan terstruktur.
          </h1>
          <p className="text-sigap-200 text-lg max-w-md">
            Satu platform untuk menulis, meninjau, menyetujui, dan mempublikasikan informasi resmi ke seluruh kanal digital instansi Anda.
          </p>
          {/* Feature Icons */}
          <div className="grid grid-cols-2 gap-4 pt-4">
            {[
              { icon: '✍️', label: 'Buat & Edit Konten' },
              { icon: '🔄', label: 'Alur Persetujuan' },
              { icon: '📢', label: 'Multi-Kanal Publikasi' },
              { icon: '📊', label: 'Analitik Dashboard' },
            ].map((f) => (
              <div key={f.label} className="flex items-center gap-2 text-sigap-200 text-sm">
                <span>{f.icon}</span>
                <span>{f.label}</span>
              </div>
            ))}
          </div>
        </div>

        <div className="relative z-10 text-sigap-300 text-xs">
          © {new Date().getFullYear()} Pemerintah Daerah — KAWAL Platform
        </div>
      </div>

      {/* Right Panel - Login Form */}
      <div className="flex-1 flex items-center justify-center p-6 lg:p-16">
        <div className="w-full max-w-md">
          {/* Mobile Logo */}
          <div className="flex items-center gap-2 mb-8 lg:hidden">
            <div className="w-9 h-9 bg-sigap-700 rounded-xl flex items-center justify-center">
              <ShieldCheck className="w-5 h-5 text-white" />
            </div>
            <span className="text-xl font-bold text-sigap-900">KAWAL</span>
          </div>

          <div className="mb-8">
            <h2 className="text-2xl font-bold text-slate-900 dark:text-white mb-1">Masuk ke Sistem</h2>
            <p className="text-slate-500 dark:text-slate-400 text-sm">
              Gunakan NIP atau alamat email beserta kata sandi yang terdaftar.
            </p>
          </div>

          <form onSubmit={handleSubmit(onSubmit)} className="space-y-5">
            <div>
              <label htmlFor="login" className="block text-sm font-semibold text-slate-700 dark:text-slate-300 mb-1.5">
                NIP atau Email
              </label>
              <input
                id="login"
                type="text"
                autoComplete="username"
                placeholder="Masukkan NIP atau email"
                {...register('login')}
                className={`w-full px-4 py-3 rounded-xl border text-sm bg-white dark:bg-slate-800 placeholder-slate-400 transition focus:outline-none focus:ring-2 focus:ring-sigap-500 focus:border-transparent ${
                  errors.login ? 'border-rose-400 bg-rose-50' : 'border-slate-300'
                }`}
              />
              {errors.login && (
                <p className="mt-1.5 text-xs text-rose-600 font-medium">{errors.login.message}</p>
              )}
            </div>

            <div>
              <label htmlFor="password" className="block text-sm font-semibold text-slate-700 dark:text-slate-300 mb-1.5">
                Kata Sandi
              </label>
              <div className="relative">
                <input
                  id="password"
                  type={showPassword ? 'text' : 'password'}
                  autoComplete="current-password"
                  placeholder="Masukkan kata sandi"
                  {...register('password')}
                  className={`w-full px-4 py-3 pr-12 rounded-xl border text-sm bg-white dark:bg-slate-800 placeholder-slate-400 transition focus:outline-none focus:ring-2 focus:ring-sigap-500 focus:border-transparent ${
                    errors.password ? 'border-rose-400 bg-rose-50' : 'border-slate-300'
                  }`}
                />
                <button
                  type="button"
                  onClick={() => setShowPassword((v) => !v)}
                  className="absolute right-3.5 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600"
                >
                  {showPassword ? <EyeOff className="w-5 h-5" /> : <Eye className="w-5 h-5" />}
                </button>
              </div>
              {errors.password && (
                <p className="mt-1.5 text-xs text-rose-600 font-medium">{errors.password.message}</p>
              )}
            </div>

            <button
              type="submit"
              disabled={isSubmitting}
              id="btn-login-submit"
              className="w-full py-3.5 bg-sigap-700 text-white font-semibold rounded-xl shadow-md shadow-sigap-200 hover:bg-sigap-800 disabled:opacity-60 disabled:cursor-not-allowed transition flex items-center justify-center gap-2 text-sm"
            >
              {isSubmitting ? (
                <>
                  <div className="w-4 h-4 border-2 border-white/40 border-t-white rounded-full animate-spin" />
                  Memproses...
                </>
              ) : (
                <>
                  <LogIn className="w-4 h-4" />
                  Masuk ke KAWAL
                </>
              )}
            </button>

            {/* Divider */}
            <div className="relative my-5">
              <div className="absolute inset-0 flex items-center">
                <div className="w-full border-t border-slate-200 dark:border-slate-700" />
              </div>
              <div className="relative flex justify-center">
                <span className="px-3 bg-white dark:bg-slate-800/60 text-xs text-slate-400">atau</span>
              </div>
            </div>

            {/* Tombol SSO SIPEG */}
            <a
              id="btn-login-sso"
              href={import.meta.env.VITE_BACKEND_URL ? `${import.meta.env.VITE_BACKEND_URL}/sso/login` : '/sso/login'}
              className="w-full py-3.5 border-2 border-sigap-300 dark:border-sigap-700 text-sigap-700 dark:text-sigap-300 font-semibold rounded-xl hover:bg-sigap-50 dark:hover:bg-sigap-900/30 transition flex items-center justify-center gap-2.5 text-sm group"
            >
              {/* Icon SIPEG */}
              <svg className="w-5 h-5 text-sigap-600 group-hover:scale-110 transition-transform" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round"
                  d="M15 7a2 2 0 012 2m4 0a6 6 0 01-7.743 5.743L11 17H9v2H7v2H4a1 1 0 01-1-1v-2.586a1 1 0 01.293-.707l5.964-5.964A6 6 0 1121 9z" />
              </svg>
              Login dengan SSO SIPEG
            </a>
          </form>

          {/* Demo Credentials */}
          <div className="mt-8 p-4 rounded-xl bg-slate-100 dark:bg-slate-700 border border-slate-200 dark:border-slate-700">
            <p className="text-xs font-bold text-slate-600 mb-2 uppercase tracking-wide">Akun Demo</p>
            <div className="grid grid-cols-2 gap-1.5 text-xs text-slate-500 dark:text-slate-400">
              {[
                { role: 'Admin', email: 'admin@sigap.go.id' },
                { role: 'Staf / User', email: 'user@sigap.go.id' },
                { role: 'Kabid', email: 'kabid@sigap.go.id' },
                { role: 'Editor', email: 'editor@sigap.go.id' },
              ].map((u) => (
                <div key={u.email}>
                  <span className="font-semibold text-slate-700 dark:text-slate-300">{u.role}:</span>
                  <br />
                  <span>{u.email}</span>
                </div>
              ))}
            </div>
            <p className="mt-2 text-xs text-slate-400">Password semua akun: <code className="bg-white dark:bg-slate-800 px-1.5 py-0.5 rounded font-mono">password</code></p>
          </div>
        </div>
      </div>
    </div>
  );
};

export default LoginPage;
