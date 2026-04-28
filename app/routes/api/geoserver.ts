import type { LoaderFunctionArgs } from "react-router";

export async function loader({ request }: LoaderFunctionArgs) {
    try {
        const url = new URL(request.url);
        
        // Extract the path after /proxy/geoserver
        // e.g., /proxy/geoserver/ows -> /ows
        const pathSuffix = url.pathname.replace(/^\/proxy\/geoserver/, '');
        const targetUrl = `https://saggaserv.my.id/geoserver${pathSuffix}${url.search}`;
        
        const response = await fetch(targetUrl, {
            method: request.method,
            // We omit headers to avoid passing host or origin headers that might block the request
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
