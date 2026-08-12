import type { LoaderFunctionArgs } from "react-router";

// Disable SSL certificate verification for backend proxying (e.g. government GeoServers with expired/untrusted SSL certs)
process.env.NODE_TLS_REJECT_UNAUTHORIZED = '0';

// In-memory cache setup

let cachedData: any = null;
let cacheTimestamp: number = 0;
const CACHE_DURATION_MS = 15 * 60 * 1000; // 15 minutes cache

const corsHeaders = {
    "Access-Control-Allow-Origin": "*",
    "Access-Control-Allow-Methods": "GET, OPTIONS",
    "Access-Control-Allow-Headers": "Content-Type"
};

export async function loader({ request }: LoaderFunctionArgs) {
    if (request.method === "OPTIONS") {
        return new Response(null, { headers: corsHeaders });
    }

    try {
        const url = new URL(request.url);
        const format = url.searchParams.get('format') || 'json';
        const forceRefresh = url.searchParams.get('refresh') === 'true';
        const resourceId = url.searchParams.get('id');

        if (resourceId) {
            const response = await fetch(`https://saggaserv.my.id/api/v2/resources/${resourceId}/?format=${format}`);
            if (!response.ok) {
                throw new Error(`Failed to fetch resource ${resourceId} from Geonode: ${response.status} ${response.statusText}`);
            }
            const data = await response.json();
            return Response.json(data, { headers: corsHeaders });
        }

        // 1. Cek Cache (Gunakan cache jika valid dan tidak di-refresh paksa)
        const now = Date.now();
        if (!forceRefresh && cachedData && (now - cacheTimestamp < CACHE_DURATION_MS)) {
            return Response.json(cachedData, {
                headers: {
                    ...corsHeaders,
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
                ...corsHeaders,
                "Cache-Control": "public, max-age=900",
                "X-Cache": "MISS"
            }
        });
    } catch (error) {
        console.error("Geonode proxy error:", error);
        return Response.json({ error: "Failed to fetch datasets" }, { status: 500, headers: corsHeaders });
    }
}
