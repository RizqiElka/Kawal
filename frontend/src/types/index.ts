export interface Bidang {
  id: number;
  nama: string;
  kode: string;
}

export interface User {
  id: number;
  pegawai_id: string;
  nip?: string;
  nama: string;
  email: string;
  jabatan?: string;
  is_active: boolean;
  bidang_id?: number;
  bidang?: Bidang;
  roles: string[];
  permissions: string[];
  last_synced_at?: string;
  created_at?: string;
}

export interface Notifikasi {
  id: string;
  type: string;
  data: {
    konten_id?: number;
    judul?: string;
    judul_konten?: string;
    tipe?: string;
    pesan?: string;
    actor_nama?: string;
    catatan?: string;
    tahap_saat_ini?: string;
    status?: string;
  };
  read_at?: string | null;
  created_at: string;
}

export interface JenisKonten {
  id: number;
  nama: string;
  wajib_cek_5w1h: boolean;
}

export interface AlurTahap {
  id: number;
  urutan: number;
  kode_tahap: string;
  nama: string;
  role_penyetuju: string;
  aktif: boolean;
}

export interface KontenFoto {
  id: number;
  konten_id: number;
  path: string;
  url: string;
  urutan: number;
  caption?: string;
}

export interface Persetujuan {
  id: number;
  tahap: string;
  aksi: 'setujui' | 'revisi' | 'tolak';
  target_tahap?: string;
  catatan?: string;
  revisi_ke: number;
  acted_at: string;
  reviewer?: {
    id: number;
    nama: string;
    jabatan?: string;
  };
}

export interface KanalPublikasi {
  id: number;
  kode: 'web' | 'instagram' | 'facebook' | 'x' | 'tiktok';
  nama: string;
  aktif: boolean;
  kredensial?: Record<string, any>;
}

export interface Publikasi {
  id: number;
  kanal_id: number;
  kanal?: KanalPublikasi;
  status: 'menunggu' | 'terjadwal' | 'berhasil' | 'gagal';
  jadwal_at?: string;
  published_at?: string;
  url_post?: string;
  external_id?: string;
  percobaan: number;
  pesan_error?: string;
}

export interface Konten {
  id: number;
  judul: string;
  slug: string;
  isi: string;
  foto_sosmed_path?: string;
  foto_sosmed_url?: string;
  status: 'draft' | 'diproses' | 'revisi' | 'ditolak' | 'disetujui' | 'terbit';
  tahap_saat_ini?: string;
  revisi_ke: number;
  submitted_at?: string;
  published_at?: string;
  created_at: string;
  updated_at: string;
  user_id: number;
  user?: {
    id: number;
    nama: string;
    email: string;
    jabatan?: string;
  };
  bidang_id?: number;
  bidang?: Bidang;
  jenis_konten_id: number;
  jenis_konten?: JenisKonten;
  foto: KontenFoto[];
  persetujuan: Persetujuan[];
  publikasi: Publikasi[];
  permissions?: {
    can_update: boolean;
    can_submit: boolean;
    can_approve: boolean;
    can_publish: boolean;
    can_delete: boolean;
  };
}

export interface RoleItem {
  id: number;
  name: string;
  guard_name: string;
  is_system: boolean;
  users_count: number;
  permissions: string[];
}

export interface NotificationItem {
  id: string;
  type: string;
  data: {
    konten_id?: number;
    judul?: string;
    tipe: string;
    pesan: string;
    actor_nama?: string;
    catatan?: string;
    tahap_saat_ini?: string;
    status?: string;
  };
  read_at?: string;
  created_at: string;
}
