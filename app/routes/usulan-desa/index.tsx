import { redirect } from "react-router";

export function loader() {
    return redirect("/admin/usulan-desa/daftar-usulan");
}

export default function UsulanDesaIndex() {
    return null;
}
