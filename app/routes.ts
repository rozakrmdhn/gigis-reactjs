import { type RouteConfig, index, route, layout } from "@react-router/dev/routes";

export default [
    index("routes/home.tsx"),
    layout("routes/sidebar-layout.tsx", [
        route("dashboard", "routes/dashboard/index.tsx"),
        route("peta", "routes/peta/index.tsx"),
        route("laporan", "routes/laporan/index.tsx"),
        route("master/desa", "routes/master/desa/index.tsx"),
        route("master/kecamatan", "routes/master/kecamatan/index.tsx"),
        route("master/jalan", "routes/master/jalan/index.tsx"),
        route("monitoring", "routes/monitoring/index.tsx"),
    ]),
] satisfies RouteConfig;
