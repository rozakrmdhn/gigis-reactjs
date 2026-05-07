# Issue: Perbaikan Autentikasi API & Notifikasi Sesi Expired Proaktif

**Prioritas:** High  
**Estimasi:** 2–3 jam  
**Label:** `enhancement`, `bug`

---

## Ringkasan

Saat ini terdapat dua masalah utama pada manajemen sesi dan autentikasi:

1. **API Endpoint GET** harus bebas diakses tanpa auth token (public). API Endpoint selain GET (POST, PUT, DELETE) tetap memerlukan auth token dari login.
2. **Notifikasi sesi habis** saat ini hanya muncul **setelah** pengguna gagal melakukan operasi CRUD. Seharusnya pengguna diberitahu **sebelum** mereka mencoba melakukan aksi tersebut, agar tidak kehilangan data yang sudah diisi.

---

## Kondisi Saat Ini

### File-file yang terlibat:

| # | File | Deskripsi |
|---|------|-----------|
| 1 | `app/lib/api-client.ts` | API client wrapper — menangani semua request HTTP |
| 2 | `app/services/auth.service.ts` | Service autentikasi — token, session check, headers |
| 3 | `app/contexts/auth-context.tsx` | React context — state user, session watchdog |
| 4 | `app/features/auth/components/SessionExpiredAlert.tsx` | Dialog alert saat sesi expired |
| 5 | `app/routes/sidebar-layout.tsx` | Layout admin — auth guard untuk route `/admin/*` |

### Yang sudah berfungsi:
- ✅ `checkSession()` di `auth.service.ts` sudah dispatch event `auth-session-expired` saat token expired
- ✅ `SessionExpiredAlert.tsx` sudah listen event tersebut dan menampilkan dialog
- ✅ `auth-context.tsx` sudah punya watchdog interval setiap 1 detik (`setInterval`)
- ✅ `api-client.ts` sudah membedakan GET dan non-GET saat session tidak valid (baris 48)

### Yang BERMASALAH:
- ❌ **GET request tetap mengirim auth header** — jika token expired, GET request bisa gagal 401/403 padahal seharusnya bebas diakses
- ❌ **Watchdog di `auth-context.tsx` hanya memanggil `checkSession()`** — ini membersihkan token dan dispatch event, tapi **tidak ada notifikasi visual proaktif sebelum user melakukan aksi**
- ❌ **Tidak ada countdown/peringatan** sebelum sesi benar-benar habis, sehingga pengguna kaget saat tiba-tiba muncul dialog "Sesi Berakhir" ketika menekan tombol simpan

---

## Tahapan Implementasi

### Tahap 1: GET Request Tanpa Auth Header

**File:** `app/lib/api-client.ts`

GET request harus bisa diakses tanpa auth. Ubah logika pengiriman header agar GET **tidak memerlukan auth header**.

**SEBELUM (baris 43–60):**
```typescript
try {
    // Trigger session check (dispatches event if expired)
    const isSessionValid = authService.checkSession();

    // Only block the request if it's NOT a GET request and session is invalid
    if (!isSessionValid && fetchOptions.method !== "GET" && fetchOptions.method !== undefined) {
        // If we had a session but it just became invalid, block the write operation
        throw new Error("Unauthorized");
    }


    let response = await fetch(url, {
        ...fetchOptions,
        headers: {
            ...authService.getAuthHeaders(),
            ...fetchOptions.headers,
        },
    });
```

**SESUDAH:**
```typescript
try {
    const isGetRequest = !fetchOptions.method || fetchOptions.method === "GET";

    // Untuk non-GET request, cek session terlebih dahulu
    if (!isGetRequest) {
        const isSessionValid = authService.checkSession();
        if (!isSessionValid) {
            throw new Error("Unauthorized");
        }
    }

    // Siapkan headers — GET request tidak perlu auth header
    const headers: HeadersInit = isGetRequest
        ? {
            'Content-Type': 'application/json',
            ...fetchOptions.headers,
          }
        : {
            ...authService.getAuthHeaders(),
            ...fetchOptions.headers,
          };

    let response = await fetch(url, {
        ...fetchOptions,
        headers,
    });
```

**Penjelasan:**
- GET request **tidak lagi mengirim `Authorization` header**, sehingga tidak akan terkena 401/403
- Non-GET request (POST, PUT, DELETE) **tetap memerlukan auth** dan dicek session-nya sebelum dikirim
- Jika token ada dan valid, GET request tetap bisa mengirim auth header secara opsional jika diperlukan di masa depan

---

### Tahap 2: Peringatan Proaktif Sebelum Sesi Habis

**File:** `app/contexts/auth-context.tsx`

Tambahkan logika untuk mendeteksi **sesi hampir habis** (misalnya 2 menit sebelum expired) dan dispatch event baru.

**SEBELUM (baris 32–49):**
```typescript
// Listen for session expiry event
useEffect(() => {
    const handleSessionExpired = () => {
        console.log("Session expired");
        setUser(null);
    };

    window.addEventListener("auth-session-expired", handleSessionExpired);

    // Global watchdog check every 1 second
    const interval = setInterval(() => {
        authService.checkSession();
    }, 1000);

    return () => {
        window.removeEventListener("auth-session-expired", handleSessionExpired);
        clearInterval(interval);
    };
}, []);
```

**SESUDAH:**
```typescript
// Listen for session expiry event
useEffect(() => {
    const handleSessionExpired = () => {
        console.log("Session expired");
        setUser(null);
    };

    window.addEventListener("auth-session-expired", handleSessionExpired);

    // Global watchdog check every 1 second
    const interval = setInterval(() => {
        const expiry = authService.getExpiry();
        const now = Date.now();

        if (expiry && user) {
            const remainingMs = expiry - now;

            // Peringatan 2 menit sebelum expired
            if (remainingMs > 0 && remainingMs <= 2 * 60 * 1000) {
                window.dispatchEvent(new CustomEvent("auth-session-warning", {
                    detail: { remainingMs }
                }));
            }
        }

        authService.checkSession();
    }, 1000);

    return () => {
        window.removeEventListener("auth-session-expired", handleSessionExpired);
        clearInterval(interval);
    };
}, [user]);
```

**Penjelasan:**
- Menambahkan pengecekan sisa waktu sesi pada interval watchdog yang sudah ada
- Jika sisa waktu ≤ 2 menit, dispatch event baru `auth-session-warning` dengan informasi `remainingMs`
- Dependency array diubah ke `[user]` agar interval ter-reset saat state user berubah

---

### Tahap 3: Buat Komponen Peringatan Sesi Hampir Habis

**File:** `app/features/auth/components/SessionExpiredAlert.tsx` — **MODIFY**

Tambahkan fitur **countdown warning** di komponen yang sudah ada sebelum dialog "Sesi Berakhir" muncul.

**SEBELUM (seluruh file):**
```tsx
export function SessionExpiredAlert() {
    const [isOpen, setIsOpen] = useState(false);
    const navigate = useNavigate();
    // ... hanya handle "auth-session-expired"
}
```

**SESUDAH — Tambahkan state dan listener baru:**
```tsx
import { useEffect, useState } from "react";
import { useNavigate } from "react-router";
import {
    AlertDialog,
    AlertDialogAction,
    AlertDialogCancel,
    AlertDialogContent,
    AlertDialogDescription,
    AlertDialogFooter,
    AlertDialogHeader,
    AlertDialogTitle,
} from "~/components/ui/alert-dialog";
import { LogOut, Clock, RefreshCw } from "lucide-react";
import { authService } from "~/services/auth.service";
import { toast } from "sonner";

export function SessionExpiredAlert() {
    const [isOpen, setIsOpen] = useState(false);
    const [isWarning, setIsWarning] = useState(false);
    const [remainingSeconds, setRemainingSeconds] = useState(0);
    const navigate = useNavigate();

    useEffect(() => {
        const handleSessionExpired = () => {
            setIsWarning(false); // Tutup warning jika ada
            setIsOpen(true);
        };

        const handleSessionWarning = (event: CustomEvent) => {
            const { remainingMs } = event.detail;
            setRemainingSeconds(Math.ceil(remainingMs / 1000));

            // Tampilkan warning dialog hanya sekali
            if (!isWarning && !isOpen) {
                setIsWarning(true);
            }
        };

        window.addEventListener("auth-session-expired", handleSessionExpired);
        window.addEventListener("auth-session-warning", handleSessionWarning as EventListener);

        return () => {
            window.removeEventListener("auth-session-expired", handleSessionExpired);
            window.removeEventListener("auth-session-warning", handleSessionWarning as EventListener);
        };
    }, [isWarning, isOpen]);

    // Update countdown setiap detik
    useEffect(() => {
        if (!isWarning) return;

        const interval = setInterval(() => {
            setRemainingSeconds(prev => {
                if (prev <= 1) {
                    clearInterval(interval);
                    return 0;
                }
                return prev - 1;
            });
        }, 1000);

        return () => clearInterval(interval);
    }, [isWarning]);

    const handleLoginRedirect = () => {
        setIsOpen(false);
        setIsWarning(false);
        navigate("/login");
    };

    const handleDismissWarning = () => {
        setIsWarning(false);
    };

    // Format detik ke "M:SS"
    const formatTime = (seconds: number) => {
        const m = Math.floor(seconds / 60);
        const s = seconds % 60;
        return `${m}:${s.toString().padStart(2, "0")}`;
    };

    return (
        <>
            {/* Warning Dialog — Sesi Hampir Habis */}
            <AlertDialog open={isWarning} onOpenChange={setIsWarning}>
                <AlertDialogContent className="sm:max-w-[425px]">
                    <AlertDialogHeader className="flex flex-col items-center gap-4 text-center">
                        <div className="p-3 bg-amber-100 rounded-full text-amber-600">
                            <Clock className="w-8 h-8" />
                        </div>
                        <div className="space-y-2">
                            <AlertDialogTitle className="text-2xl font-bold text-slate-900">
                                Sesi Hampir Habis
                            </AlertDialogTitle>
                            <AlertDialogDescription className="text-slate-500 font-medium">
                                Sesi Anda akan berakhir dalam{" "}
                                <span className="font-bold text-amber-600 text-lg">
                                    {formatTime(remainingSeconds)}
                                </span>
                                . Silakan simpan pekerjaan Anda atau login kembali untuk memperpanjang sesi.
                            </AlertDialogDescription>
                        </div>
                    </AlertDialogHeader>
                    <AlertDialogFooter className="sm:flex-col gap-2 mt-4">
                        <AlertDialogAction
                            onClick={handleLoginRedirect}
                            className="w-full bg-amber-600 hover:bg-amber-700 text-white font-bold h-11"
                        >
                            <RefreshCw className="w-4 h-4 mr-2" />
                            Login Ulang Sekarang
                        </AlertDialogAction>
                        <AlertDialogCancel
                            onClick={handleDismissWarning}
                            className="w-full font-bold h-11"
                        >
                            Lanjutkan Bekerja
                        </AlertDialogCancel>
                    </AlertDialogFooter>
                </AlertDialogContent>
            </AlertDialog>

            {/* Expired Dialog — Sesi Sudah Habis */}
            <AlertDialog open={isOpen} onOpenChange={setIsOpen}>
                <AlertDialogContent className="sm:max-w-[425px]">
                    <AlertDialogHeader className="flex flex-col items-center gap-4 text-center">
                        <div className="p-3 bg-red-100 rounded-full text-red-600">
                            <LogOut className="w-8 h-8" />
                        </div>
                        <div className="space-y-2">
                            <AlertDialogTitle className="text-2xl font-bold text-slate-900">
                                Sesi Berakhir
                            </AlertDialogTitle>
                            <AlertDialogDescription className="text-slate-500 font-medium">
                                Sesi Anda telah berakhir atau tidak valid. Silakan masuk kembali untuk melanjutkan akses ke aplikasi.
                            </AlertDialogDescription>
                        </div>
                    </AlertDialogHeader>
                    <AlertDialogFooter className="sm:flex-col gap-2 mt-4">
                        <AlertDialogAction
                            onClick={handleLoginRedirect}
                            className="w-full bg-red-600 hover:bg-red-700 text-white font-bold h-11"
                        >
                            Masuk Kembali
                        </AlertDialogAction>
                    </AlertDialogFooter>
                </AlertDialogContent>
            </AlertDialog>
        </>
    );
}
```

**Penjelasan:**
- Komponen sekarang menangani **dua event**: `auth-session-warning` (peringatan) dan `auth-session-expired` (sudah habis)
- Warning dialog menampilkan **countdown timer** dalam format `M:SS`
- Pengguna punya dua opsi: **"Login Ulang Sekarang"** atau **"Lanjutkan Bekerja"**
- Jika pengguna memilih "Lanjutkan Bekerja", dialog ditutup, tapi akan muncul lagi di detik berikutnya (karena watchdog masih aktif) — ATAU bisa ditambahkan cooldown agar tidak spam

---

### Tahap 4: (Opsional) Tambahkan Cooldown pada Warning

Jika warning dialog terlalu sering muncul (setiap detik selama 2 menit terakhir), tambahkan cooldown di `auth-context.tsx`:

```typescript
// Di dalam interval watchdog
const WARNING_THRESHOLD = 2 * 60 * 1000; // 2 menit
let warningDispatched = false;

const interval = setInterval(() => {
    const expiry = authService.getExpiry();
    const now = Date.now();

    if (expiry && user) {
        const remainingMs = expiry - now;

        if (remainingMs > WARNING_THRESHOLD) {
            warningDispatched = false; // Reset flag saat masih jauh dari expired
        }

        // Dispatch warning hanya SEKALI
        if (remainingMs > 0 && remainingMs <= WARNING_THRESHOLD && !warningDispatched) {
            warningDispatched = true;
            window.dispatchEvent(new CustomEvent("auth-session-warning", {
                detail: { remainingMs }
            }));
        }
    }

    authService.checkSession();
}, 1000);
```

**Penjelasan:**
- Dengan flag `warningDispatched`, event `auth-session-warning` hanya di-dispatch **satu kali**
- Setelah user dismiss dialog, dia tidak akan diganggu lagi sampai sesi benar-benar expired
- Countdown tetap berjalan di dalam komponen `SessionExpiredAlert` secara internal

---

## Alur UX Setelah Implementasi

```
┌─────────────────────────────────────────────────────────────┐
│                    ALUR SESI PENGGUNA                       │
├─────────────────────────────────────────────────────────────┤
│                                                             │
│  [Login] ──→ [Bekerja di /admin] ──→ [Sesi hampir habis]   │
│                                          │                  │
│                                          ▼                  │
│                                   ┌──────────────┐          │
│                                   │  ⚠️ Warning   │          │
│                                   │  "Sesi Hampir │          │
│                                   │   Habis 1:30" │          │
│                                   │              │          │
│                                   │ [Login Ulang] │          │
│                                   │ [Lanjutkan]  │          │
│                                   └──────┬───────┘          │
│                                          │                  │
│                            ┌─────────────┴──────────┐       │
│                            ▼                        ▼       │
│                     [Login Ulang]           [Lanjutkan]      │
│                     → /login               → Bekerja        │
│                                            → Sesi habis     │
│                                                   │         │
│                                                   ▼         │
│                                            ┌────────────┐   │
│                                            │ 🔴 Expired  │   │
│                                            │ "Sesi      │   │
│                                            │  Berakhir" │   │
│                                            │            │   │
│                                            │ [Masuk     │   │
│                                            │  Kembali]  │   │
│                                            └────────────┘   │
│                                                             │
│  [GET Request] ──→ Langsung berhasil (tanpa auth header)    │
│  [POST/PUT/DELETE] ──→ Cek session dulu → kirim dengan auth │
│                                                             │
└─────────────────────────────────────────────────────────────┘
```

---

## File yang Perlu Diubah

| # | File | Aksi | Keterangan |
|---|------|------|------------|
| 1 | `app/lib/api-client.ts` | **MODIFY** | GET request tanpa auth header, non-GET tetap pakai auth |
| 2 | `app/contexts/auth-context.tsx` | **MODIFY** | Tambah deteksi sesi hampir habis + dispatch event warning |
| 3 | `app/features/auth/components/SessionExpiredAlert.tsx` | **MODIFY** | Tambah warning dialog dengan countdown timer |

---

## Checklist Testing

- [ ] **GET request tanpa login:** Buka browser incognito, akses API GET endpoint langsung → harus berhasil (200 OK)
- [ ] **GET request dengan token expired:** Login, tunggu token expired, lakukan navigasi yang trigger GET → harus tetap berhasil tanpa redirect
- [ ] **POST/PUT/DELETE tanpa login:** Coba submit form tanpa login → harus ditolak (dialog "Sesi Berakhir")
- [ ] **Warning muncul 2 menit sebelum expired:** Login, tunggu hingga 2 menit sebelum sesi habis → dialog "Sesi Hampir Habis" muncul dengan countdown
- [ ] **Countdown berjalan:** Timer di dialog warning bergerak mundur dari `2:00` ke `0:00`
- [ ] **Klik "Login Ulang Sekarang":** Redirect ke halaman login
- [ ] **Klik "Lanjutkan Bekerja":** Dialog tertutup, pengguna bisa melanjutkan kerja
- [ ] **Sesi benar-benar habis:** Setelah timer mencapai `0:00`, dialog berubah ke "Sesi Berakhir" (merah)
- [ ] **Dark mode:** Kedua dialog terlihat baik di dark mode

---

## Catatan untuk Implementor

> **PENTING:** Jangan ubah logika `authService.signin()` atau `authService.signout()`. Fokus hanya pada:
> 1. Pengiriman header di `api-client.ts`
> 2. Watchdog interval di `auth-context.tsx`
> 3. UI komponen di `SessionExpiredAlert.tsx`

> **TIPS:** Untuk testing cepat, ubah sementara `TOKEN_EXPIRY_KEY` di localStorage ke waktu 3-5 menit dari sekarang menggunakan Chrome DevTools → Application → Local Storage.

> **TIPS:** Gunakan `Date.now() + (3 * 60 * 1000)` untuk set token expiry 3 menit dari sekarang saat testing.
