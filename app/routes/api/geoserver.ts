import type { LoaderFunctionArgs } from "react-router";

// Disable SSL certificate verification for backend proxying (e.g. government GeoServers with expired/untrusted SSL certs)
process.env.NODE_TLS_REJECT_UNAUTHORIZED = '0';

export async function loader({ request }: LoaderFunctionArgs) {
    try {
        const url = new URL(request.url);
        
        const targetParam = url.searchParams.get("target") || url.searchParams.get("url");
        let targetUrl: string;

        if (targetParam) {
            const targetUrlObj = new URL(targetParam);
            // Copy all current query parameters except 'target' and 'url'
            url.searchParams.forEach((value, key) => {
                if (key !== 'target' && key !== 'url') {
                    targetUrlObj.searchParams.append(key, value);
                }
            });
            targetUrl = targetUrlObj.toString();
        } else {
            // Extract the path after /proxy/geoserver
            // e.g., /proxy/geoserver/ows -> /ows
            const pathSuffix = url.pathname.replace(/^\/proxy\/geoserver/, '');
            targetUrl = `https://saggaserv.my.id/geoserver${pathSuffix}${url.search}`;
        }
        
        const response = await fetch(targetUrl, {
            method: request.method,
            headers: {
                "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36",
                "Accept": "*/*"
            }
        });
        
        if (!response.ok) {
            console.error(`Geoserver proxy failed: ${response.status} for ${targetUrl}`);
            return new Response(`Geoserver Error: ${response.status}`, { status: response.status });
        }

        const headers = new Headers(response.headers);
        // Remove headers that might cause issues when proxied
        headers.delete('content-encoding');
        headers.delete('transfer-encoding');
        headers.delete('content-length'); // Let Node chunk it if necessary
        
        // Ensure CORS allows it, though it's same-origin in the browser
        headers.set('Access-Control-Allow-Origin', '*');
        
        return new Response(response.body, {
            status: response.status,
            statusText: response.statusText,
            headers
        });
    } catch (error) {
        console.error("Geoserver proxy error:", error);
        return new Response("Geoserver proxy error", { status: 500 });
    }
}

