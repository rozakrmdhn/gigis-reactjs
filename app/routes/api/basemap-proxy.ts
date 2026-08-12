import type { LoaderFunctionArgs } from "react-router";

// Disable SSL certificate verification for backend proxying (e.g. government basemaps/GeoServers with expired/untrusted SSL certs)
process.env.NODE_TLS_REJECT_UNAUTHORIZED = '0';

export async function loader({ request }: LoaderFunctionArgs) {

    try {
        const urlObj = new URL(request.url);
        const targetUrl = urlObj.searchParams.get("url");
        
        if (!targetUrl) {
            return new Response("Missing target URL", { status: 400 });
        }
        
        const isAtrBpn = targetUrl.includes("atrbpn.go.id");
        
        const headers: Record<string, string> = {
            "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36",
            "Accept": "image/webp,image/apng,image/svg+xml,image/*,*/*;q=0.8"
        };
        
        // Spoof headers for ATRBPN to bypass security hotlinking protections
        if (isAtrBpn) {
            headers["Referer"] = "https://petadasar.atrbpn.go.id/";
            headers["Origin"] = "https://petadasar.atrbpn.go.id";
        }
        
        // Fetch the external tile on behalf of the client
        const response = await fetch(targetUrl, {
            method: "GET",
            headers
        });
        
        if (!response.ok) {
            console.error(`Basemap proxy failed: ${response.status} for ${targetUrl}`);
            return new Response(`Proxy Error: ${response.status}`, { status: response.status });
        }

        const responseHeaders = new Headers();
        // Copy necessary headers
        const contentType = response.headers.get("content-type");
        const cacheControl = response.headers.get("cache-control");
        
        if (contentType) responseHeaders.set("Content-Type", contentType);
        if (cacheControl) responseHeaders.set("Cache-Control", cacheControl);
        
        // Allow CORS explicitly
        responseHeaders.set("Access-Control-Allow-Origin", "*");
        
        return new Response(response.body, {
            status: 200,
            headers: responseHeaders
        });
    } catch (error) {
        console.error("Basemap proxy error:", error);
        return new Response("Internal Server Error", { status: 500 });
    }
}
