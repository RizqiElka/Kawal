import React, { useState, useEffect } from 'react';
import apiClient from '../api/client';
import { useToast } from '../context/ToastContext';
import { Shield } from 'lucide-react';

interface Setting {
  key: string;
  value: string;
}

const SettingsPage: React.FC = () => {
  const toast = useToast();
  const [settings, setSettings] = useState<Setting[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  const fetchSettings = async () => {
    try {
      const res = await apiClient.get('/pengaturan');
      setSettings(res.data.data);
    } catch (err: any) {
      toast.error(err?.response?.data?.message || 'Gagal memuat pengaturan');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchSettings();
  }, []);

  const handleChange = (key: string, value: string) => {
    setSettings(prev =>
      prev.map(s => (s.key === key ? { ...s, value } : s))
    );
  };

  const handleSave = async () => {
    setSaving(true);
    try {
      await apiClient.post('/pengaturan', { settings });
      toast.success('Pengaturan berhasil disimpan');
    } catch (err: any) {
      toast.error(err?.response?.data?.message || 'Gagal menyimpan pengaturan');
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="space-y-5">
      <div className="flex items-center gap-3">
        <Shield className="w-6 h-6 text-sigap-600" />
        <h1 className="text-2xl font-bold text-slate-900 dark:text-white">Pengaturan Sistem</h1>
      </div>

      {loading ? (
        <div className="p-5 space-y-3">
          <div className="h-10 bg-slate-100 dark:bg-slate-800 rounded animate-pulse" />
          <div className="h-10 bg-slate-100 dark:bg-slate-800 rounded animate-pulse" />
        </div>
      ) : (
        <div className="bg-white dark:bg-slate-800 rounded-2xl border border-slate-200 dark:border-slate-700 p-6 shadow-sm">
          {settings.map(s => (
            <div key={s.key} className="mb-4">
              <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1 capitalize">
                {s.key.replace('_', ' ')}
              </label>
              <input
                type="text"
                value={s.value}
                onChange={e => handleChange(s.key, e.target.value)}
                className="w-full px-3 py-2.5 rounded-xl border border-slate-300 dark:border-slate-600 bg-white dark:bg-slate-700 text-slate-900 dark:text-white text-sm focus:outline-none focus:ring-2 focus:ring-sigap-500"
              />
            </div>
          ))}
          <button
            onClick={handleSave}
            disabled={saving}
            className="flex items-center gap-2 px-5 py-2.5 bg-sigap-700 text-white rounded-xl hover:bg-sigap-800 disabled:opacity-50 transition"
          >
            {saving ? 'Menyimpan...' : 'Simpan Pengaturan'}
          </button>
        </div>
      )}
    </div>
  );
};

export default SettingsPage;
