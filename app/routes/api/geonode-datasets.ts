import type { LoaderFunctionArgs } from "react-router";

// In-memory cache setup
let cachedData: any = null;
let cacheTimestamp: number = 0;
const CACHE_DURATION_MS = 15 * 60 * 1000; // 15 minutes cache

export async function loader({ request }: LoaderFunctionArgs) {
    try {
        const url = new URL(request.url);
        const format = url.searchParams.get('format') || 'json';
        const forceRefresh = url.searchParams.get('refresh') === 'true';

        // 1. Cek Cache (Gunakan cache jika valid dan tidak di-refresh paksa)
        const now = Date.now();
        if (!forceRefresh && cachedData && (now - cacheTimestamp < CACHE_DURATION_MS)) {
            return Response.json(cachedData, {
                headers: {
                    "Cache-Control": "public, max-age=900",
                    "X-Cache": "HIT"
                }
            });
        }
        
        // 2. Fetch ke API asli (Geonode server)
        // Kita gunakan endpoint 'resources' karena lebih lengkap (mencakup datasets, documents, dll)
        const response = await fetch(`https://saggaserv.my.id/api/v2/resources?format=${format}&page_size=50`);
        
        if (!response.ok) {
            throw new Error(`Failed to fetch from Geonode: ${response.status} ${response.statusText}`);
        }
        
        const data = await response.json();
        
        // 3. Simpan ke Cache server-side
        cachedData = data;
        cacheTimestamp = now;

        return Response.json(data, {
            headers: {
                "Cache-Control": "public, max-age=900",
                "X-Cache": "MISS"
            }
        });
    } catch (error) {
        console.error("Geonode proxy error:", error);
        return Response.json({ error: "Failed to fetch datasets" }, { status: 500 });
    }
}
