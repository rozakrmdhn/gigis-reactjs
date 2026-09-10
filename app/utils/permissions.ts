export type UserRole =
  | 'super_admin'
  | 'admin'
  | 'operator_bappeda'
  | 'operator_kecamatan'
  | 'operator_desa'
  | 'operator_opd'
  | string;

export interface User {
  id: string | number;
  nama: string;
  email?: string;
  role: UserRole;
  id_kecamatan?: number | string | null;
  id_desa?: number | string | null;
  [key: string]: any;
}

/**
 * Cek apakah role bersifat murni Read-Only (Viewer Global)
 */
export const isReadOnlyRole = (user: User | null | undefined): boolean => {
  if (!user) return true;
  return user.role === 'operator_opd';
};

/**
 * Cek apakah user memiliki izin digitasi / mutasi data spasial
 */
export const canDigitize = (user: User | null | undefined): boolean => {
  if (!user) return false;
  // operator_opd strictly read-only
  if (user.role === 'operator_opd') return false;
  return ['super_admin', 'admin', 'operator_bappeda', 'operator_kecamatan', 'operator_desa'].includes(user.role);
};

/**
 * Cek apakah user memiliki scope global (seluruh kabupaten Bojonegoro)
 */
export const hasGlobalRegionalScope = (user: User | null | undefined): boolean => {
  if (!user) return false;
  return ['super_admin', 'admin', 'operator_bappeda', 'operator_opd'].includes(user.role);
};

/**
 * Cek apakah user boleh menerbitkan & mengelola dokumen draft penugasan (Bappeda/Admin)
 */
export const canManagePenugasan = (user: User | null | undefined): boolean => {
  if (!user) return false;
  return ['super_admin', 'admin', 'operator_bappeda'].includes(user.role);
};

/**
 * Cek apakah user berhak mengajukan / submit laporan monitoring (Kecamatan/Desa)
 */
export const canSubmitMonitoring = (user: User | null | undefined): boolean => {
  if (!user) return false;
  if (user.role === 'operator_opd') return false;
  return ['operator_kecamatan', 'operator_desa'].includes(user.role);
};

/**
 * Cek apakah user boleh mengesahkan / finalisasi Berita Acara (Bappeda/Admin)
 */
export const canFinalizeMonitoring = (user: User | null | undefined): boolean => {
  if (!user) return false;
  return ['super_admin', 'admin', 'operator_bappeda'].includes(user.role);
};

/**
 * Cek apakah user berhak mencetak PDF Berita Acara
 */
export const canPrintBeritaAcara = (user: User | null | undefined): boolean => {
  if (!user) return false;
  return ['super_admin', 'admin', 'operator_bappeda', 'operator_opd', 'operator_kecamatan', 'operator_desa'].includes(user.role);
};

/**
 * Cek apakah user boleh membuat usulan desa baru (Operator Desa / Admin)
 */
export const canCreateUsulanDesa = (user: User | null | undefined): boolean => {
  if (!user) return false;
  if (user.role === 'operator_opd') return false;
  return ['super_admin', 'admin', 'operator_desa'].includes(user.role);
};

/**
 * Cek apakah user boleh memverifikasi usulan desa (Bappeda / Admin)
 */
export const canVerifyUsulanDesa = (user: User | null | undefined): boolean => {
  if (!user) return false;
  return ['super_admin', 'admin', 'operator_bappeda'].includes(user.role);
};

/**
 * Cek apakah user boleh mengelola data pengguna & role master (Bappeda/Admin)
 */
export const canManageUsers = (user: User | null | undefined): boolean => {
  if (!user) return false;
  return ['super_admin', 'admin', 'operator_bappeda'].includes(user.role);
};
