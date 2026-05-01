import { type RouteConfig, index, route, layout } from "@react-router/dev/routes";

export default [
    index("routes/home.tsx"),
    route("login", "routes/login.tsx"),
    route("map-view", "routes/map-view.tsx"),
    route("jalan-desa", "routes/jalan-desa.tsx"),
    route("jalan-desa/:slug", "routes/jalan-desa.$slug.tsx"),
    route("statistik", "routes/statistik.tsx"),
    route("proxy/geonode-datasets", "routes/api/geonode-datasets.ts"),
    route("proxy/geoserver/*", "routes/api/geoserver.ts"),
    route("katalog-dataset", "routes/katalog-dataset.tsx"),
    route("katalog-dataset/:slug", "routes/katalog-dataset.$slug.tsx"),
    // Admin routes
    route("admin", "routes/sidebar-layout.tsx", [
        index("routes/dashboard/index.tsx"),
        route("dashboard", "routes/dashboard/index.tsx", { id: "admin-dashboard" }),
        route("peta", "routes/peta/index.tsx"),
        route("laporan", "routes/laporan/index.tsx"),
        route("master/desa", "routes/master/desa/index.tsx"),
        route("master/kecamatan", "routes/master/kecamatan/index.tsx"),
        route("master/jalan", "routes/master/jalan/index.tsx"),
        route("monitoring/maps", "routes/monitoring/maps/index.tsx"),
        route("monitoring/draw", "routes/monitoring/draw/index.tsx"),
        route("data-monitoring", "routes/data-monitoring/index.tsx"),
    ]),
] satisfies RouteConfig;
