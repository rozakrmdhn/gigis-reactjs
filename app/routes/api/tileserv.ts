import type { LoaderFunctionArgs } from "react-router";

// Proxy loader for pg_tileserv Vector Tiles (.pbf / .mvt)
export async function loader({ request }: LoaderFunctionArgs) {
    try {
        const url = new URL(request.url);
        
        // Extract suffix after /proxy/tileserv
        // e.g. /proxy/tileserv/public.infrastruktur_segmen/14/13254/8201.pbf
        const pathSuffix = url.pathname.replace(/^\/proxy\/tileserv/, '');
        const targetHost = process.env.PG_TILESERV_URL || 'http://localhost:7800';
        const targetUrl = `${targetHost}${pathSuffix}${url.search}`;
        
        const response = await fetch(targetUrl, {
            method: request.method,
            headers: {
                "Accept": "*/*",
                "User-Agent": "MELAROSA-WebGIS/2.4"
            }
        });
        
        if (!response.ok) {
            return new Response(`pg_tileserv error: ${response.status}`, { status: response.status });
        }

        const headers = new Headers(response.headers);
        headers.delete('content-encoding');
        headers.delete('transfer-encoding');
        headers.set('Access-Control-Allow-Origin', '*');
        headers.set('Cache-Control', 'public, max-age=3600');
        
        return new Response(response.body, {
            status: response.status,
            statusText: response.statusText,
            headers
        });
    } catch (error) {
        console.error("pg_tileserv proxy error:", error);
        return new Response("pg_tileserv proxy error", { status: 500 });
    }
}
