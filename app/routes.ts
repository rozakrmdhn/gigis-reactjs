import { type RouteConfig, index, route, layout } from "@react-router/dev/routes";

export default [
    index("routes/home.tsx"),
    layout("routes/sidebar-layout.tsx", [
        route("dashboard", "routes/dashboard/index.tsx"),
        route("peta", "routes/peta/index.tsx"),
        route("laporan", "routes/laporan/index.tsx"),
        route("master/desa", "routes/master/desa.tsx"),
        route("master/kecamatan", "routes/master/kecamatan.tsx"),
        route("master/jalan", "routes/master/jalan.tsx"),
    ]),
] satisfies RouteConfig;
