import {
  isRouteErrorResponse,
  Links,
  Meta,
  Outlet,
  Scripts,
  ScrollRestoration,
} from "react-router";

import type { Route } from "./+types/root";
import "./app.css";
import "leaflet/dist/leaflet.css";
import "ol/ol.css";

import { Spinner } from "./components/ui/spinner";
import { AuthProvider } from "./contexts/auth-context";
import { Toaster } from "./components/ui/sonner";
import { SessionExpiredAlert } from "./features/auth/components/SessionExpiredAlert";

export const meta: Route.MetaFunction = () => {
  return [
    { title: "MELAROSA - Monitoring Layanan dan Realisasi Infrastruktur Berbasis Spasial" },
    { name: "description", content: "Monitoring Layanan dan Realisasi Infrastruktur Berbasis Spasial - Bappeda Bojonegoro" },
  ];
};

export function HydrateFallback() {
  return null;
}

export const links: Route.LinksFunction = () => [
  { rel: "preconnect", href: "https://fonts.googleapis.com" },
  {
    rel: "preconnect",
    href: "https://fonts.gstatic.com",
    crossOrigin: "anonymous",
  },
  {
    rel: "stylesheet",
    href: "https://fonts.googleapis.com/css2?family=Inter:ital,opsz,wght@0,14..32,100..900;1,14..32,100..900&display=swap",
  },
];

import { ThemeProvider } from "./components/theme-provider";

export function Layout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" suppressHydrationWarning>
      <head>
        <meta charSet="utf-8" />
        <meta name="viewport" content="width=device-width, initial-scale=1, maximum-scale=1, user-scalable=no, viewport-fit=cover" />
        <Meta />
        <Links />
      </head>
      <body>
        <ThemeProvider
          attribute="class"
          defaultTheme="light"
          enableSystem
          disableTransitionOnChange
        >
          {children}
          <Toaster position="top-right" richColors />
          <ScrollRestoration />
          <Scripts />
        </ThemeProvider>
      </body>
    </html>
  );
}

export default function App() {
  return (
    <AuthProvider>
      <Outlet />
      <SessionExpiredAlert />
    </AuthProvider>
  );
}

import { AlertTriangle, FileSearch, ArrowLeft, RotateCw, Home, ShieldAlert } from "lucide-react";

export function ErrorBoundary({ error }: Route.ErrorBoundaryProps) {
  let status = 500;
  let title = "Terjadi Kesalahan";
  let description = "Maaf, sistem mendeteksi adanya gangguan yang tidak terduga. Silakan hubungi administrator jika masalah berlanjut.";
  let stack: string | undefined;

  if (isRouteErrorResponse(error)) {
    status = error.status;
    if (status === 404) {
      title = "Halaman Tidak Ditemukan";
      description = "Maaf, halaman yang Anda cari tidak dapat kami temukan. Mungkin tautan rusak, kedaluwarsa, atau salah ketik.";
    } else if (status === 403) {
      title = "Akses Ditolak";
      description = "Anda tidak memiliki izin yang cukup untuk mengakses halaman atau fitur spasial ini.";
    } else {
      title = `Error ${status}`;
      description = error.statusText || description;
    }
  } else if (error instanceof Error) {
    description = error.message;
    if (import.meta.env.DEV) {
      stack = error.stack;
    }
  }

  // Helper to render responsive icon based on error status
  const renderErrorIcon = () => {
    switch (status) {
      case 404:
        return <FileSearch className="w-16 h-16 text-blue-500 dark:text-blue-400" />;
      case 403:
        return <ShieldAlert className="w-16 h-16 text-amber-500 dark:text-amber-400" />;
      default:
        return <AlertTriangle className="w-16 h-16 text-rose-500 dark:text-rose-400" />;
    }
  };

  return (
    <div className="min-h-screen w-full flex items-center justify-center p-4 bg-background font-sans">
      <div className="w-full max-w-md border border-border bg-card rounded-xl p-6 md:p-8 space-y-6 shadow-xs">
        <div className="flex flex-col items-center text-center space-y-4">
          <div className="flex items-center justify-center w-12 h-12 rounded-lg bg-muted border border-border">
            {status === 404 ? (
              <FileSearch className="w-5 h-5 text-muted-foreground" />
            ) : status === 403 ? (
              <ShieldAlert className="w-5 h-5 text-destructive" />
            ) : (
              <AlertTriangle className="w-5 h-5 text-destructive" />
            )}
          </div>
          
          <div className="space-y-1.5">
            <h1 className="text-lg font-semibold tracking-tight">
              {title}
            </h1>
            <p className="text-xs text-muted-foreground leading-normal max-w-xs mx-auto">
              {description}
            </p>
          </div>
        </div>

        {stack && (
          <div className="bg-muted border border-border rounded-lg p-3 overflow-hidden">
            <p className="text-[10px] font-semibold text-muted-foreground mb-1">Stack Trace</p>
            <pre className="text-[10px] font-mono text-destructive overflow-x-auto max-h-36 leading-normal">
              <code>{stack}</code>
            </pre>
          </div>
        )}

        <div className="grid grid-cols-3 gap-2">
          <button
            onClick={() => window.history.back()}
            className="h-8.5 flex items-center justify-center gap-1.5 text-xs font-medium rounded-lg border border-input bg-background hover:bg-accent hover:text-accent-foreground transition-colors"
          >
            <ArrowLeft className="w-3.5 h-3.5" />
            Kembali
          </button>
          
          <button
            onClick={() => window.location.reload()}
            className="h-8.5 flex items-center justify-center gap-1.5 text-xs font-medium rounded-lg border border-input bg-background hover:bg-accent hover:text-accent-foreground transition-colors"
          >
            <RotateCw className="w-3.5 h-3.5" />
            Reload
          </button>
          
          <a
            href="/"
            className="h-8.5 flex items-center justify-center gap-1.5 text-xs font-medium rounded-lg bg-primary text-primary-foreground hover:bg-primary/90 transition-colors shadow-sm"
          >
            <Home className="w-3.5 h-3.5" />
            Beranda
          </a>
        </div>
      </div>
    </div>
  );
}
