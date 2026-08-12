import { clsx, type ClassValue } from "clsx"
import { twMerge } from "tailwind-merge"

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs))
}

/**
 * Converts a spatial layer URL (WMS, WFS, XYZ, etc.) into a proxied URL
 * to avoid HTTPS SSL certificate errors (e.g., geoportal.bojonegorokab.go.id) and CORS issues.
 */
export function getProxiedLayerUrl(url: string | undefined | null): string {
  if (!url) return '';

  // If it's already proxied, return as is
  if (url.startsWith('/proxy/') || url.includes('/proxy/geoserver')) return url;

  // Handle saggaserv.my.id shortcut path-based proxy
  if (url.includes('saggaserv.my.id/geoserver')) {
    return url.replace('https://saggaserv.my.id/geoserver', '/proxy/geoserver');
  }

  // For any external WMS/WFS/XYZ layer URL (e.g., geoportal.bojonegorokab.go.id),
  // proxy through /proxy/geoserver?target=... to bypass SSL certificate and CORS errors
  if (url.startsWith('http://') || url.startsWith('https://')) {
    return `/proxy/geoserver?target=${encodeURIComponent(url)}`;
  }

  return url;
}

