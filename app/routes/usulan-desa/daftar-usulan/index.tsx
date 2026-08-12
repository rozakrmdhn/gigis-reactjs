import { useCallback, useEffect, useMemo, useState } from "react";
import type { MetaFunction } from "react-router";
import { useNavigate } from "react-router";
import { UsulanDesaTable } from "~/features/usulan-desa/components/UsulanDesaTable";
import { UsulanDesaPagination } from "~/features/usulan-desa/components/UsulanDesaPagination";
import { usulanDesaService } from "~/features/usulan-desa/services/usulan-desa.service";
import type { UsulanDesa, UsulanDesaFilters as IFilters } from "~/features/usulan-desa/types/usulan-desa.types";
import { toast } from "sonner";
import { Plus } from "lucide-react";
import { Button } from "~/components/ui/button";

export const meta: MetaFunction = () => {
    return [
        { title: "Daftar Usulan - MELAROSA" },
        { name: "description", content: "Daftar semua usulan masyarakat desa." },
    ];
};

export default function DaftarUsulanPage() {
    const navigate = useNavigate();
    const [data, setData] = useState<UsulanDesa[]>([]);
    const [isLoading, setIsLoading] = useState(true);

    const [pageIndex, setPageIndex] = useState(0);
    const [pageSize, setPageSize] = useState(50);
    const [pageCount, setPageCount] = useState(0);
    const [totalItems, setTotalItems] = useState(0);

    const [filters, setFilters] = useState<IFilters>({
        status: "all",
        tahun_anggaran: "all",
        jenis_usulan: "all",
        id_desa: "all",
        id_kecamatan: "all",
        nama_desa: "",
        nama_kecamatan: "",
        nomor_surat: "",
        tanggal_surat_from: "",
        tanggal_surat_to: ""
    });

    const fetchData = useCallback(async () => {
        setIsLoading(true);
        try {
            // Normalize filters before sending to API
            const apiFilters: IFilters = {
                page: pageIndex + 1,
                limit: pageSize,
                sortBy: "nomor_agenda",
                order: "desc"
            };
            if (filters.status && filters.status !== "all") {
                apiFilters.status = filters.status;
            }
            if (filters.tahun_anggaran && filters.tahun_anggaran !== "all") {
                apiFilters.tahun_anggaran = filters.tahun_anggaran;
            }
            if (filters.jenis_usulan && filters.jenis_usulan !== "all") {
                apiFilters.jenis_usulan = filters.jenis_usulan;
            }
            if (filters.id_desa && filters.id_desa !== "all") {
                apiFilters.id_desa = filters.id_desa;
            }
            if (filters.id_kecamatan && filters.id_kecamatan !== "all") {
                apiFilters.id_kecamatan = filters.id_kecamatan;
            }
            if (filters.nama_desa) {
                apiFilters.nama_desa = filters.nama_desa;
            }
            if (filters.nama_kecamatan) {
                apiFilters.nama_kecamatan = filters.nama_kecamatan;
            }
            if (filters.nomor_surat) {
                apiFilters.nomor_surat = filters.nomor_surat;
            }
            if (filters.tanggal_surat_from) {
                apiFilters.tanggal_surat_from = filters.tanggal_surat_from;
            }
            if (filters.tanggal_surat_to) {
                apiFilters.tanggal_surat_to = filters.tanggal_surat_to;
            }

            const response = await usulanDesaService.getAll(apiFilters);
            setData(response.result || []);
            setPageCount(response.pagination?.totalPages || 0);
            setTotalItems(response.pagination?.total || 0);
        } catch (error) {
            console.error("Gagal memuat usulan:", error);
            setData([]);
            setPageCount(0);
            setTotalItems(0);
        } finally {
            setIsLoading(false);
        }
    }, [filters, pageIndex, pageSize]);

    // Reset to page 0 when filters change
    useEffect(() => {
        setPageIndex(0);
    }, [filters]);

    useEffect(() => {
        fetchData();
    }, [fetchData]);

    const handleFilterChange = useCallback((key: string, value: string) => {
        setFilters((prev) => ({
            ...prev,
            [key]: value
        }));
    }, []);

    const handleResetFilters = useCallback(() => {
        setFilters({
            status: "all",
            tahun_anggaran: "all",
            jenis_usulan: "all",
            id_desa: "all",
            id_kecamatan: "all",
            nama_desa: "",
            nama_kecamatan: "",
            nomor_surat: "",
            tanggal_surat_from: "",
            tanggal_surat_to: ""
        });
    }, []);

    const handleEdit = (item: UsulanDesa) => {
        navigate(`/admin/usulan-desa/edit/${item.id}`);
    };

    const handleDetail = (item: UsulanDesa) => {
        navigate(`/admin/usulan-desa/detail/${item.id}`);
    };

    const handleDelete = async (item: UsulanDesa) => {
        try {
            const success = await usulanDesaService.remove(item.id);
            if (success) {
                // Refresh data
                fetchData();
            }
        } catch (error) {
            console.error("Gagal menghapus usulan:", error);
        }
    };

    // Optimistic local update — patches a single item in the data array without refetching
    const handleUpdateItem = useCallback((id: string | number, updates: Partial<UsulanDesa>) => {
        setData((prev) =>
            prev.map((item) =>
                String(item.id) === String(id) ? { ...item, ...updates } : item
            )
        );
    }, []);

    return (
        <div className="flex flex-1 flex-col h-full min-h-0 gap-4 p-4 bg-background dark:bg-slate-950 overflow-hidden">
            {/* Page Header */}
            <div className="flex items-center justify-between gap-4 shrink-0 pb-1 border-b border-slate-100 dark:border-slate-800/50">
                <div>
                    <h1 className="text-lg sm:text-xl font-bold text-slate-900 dark:text-slate-100 tracking-tight">
                        Daftar Usulan Pembangunan Desa
                    </h1>
                    <p className="text-xs text-muted-foreground mt-0.5 hidden sm:block">
                        Kelola dan pantau seluruh usulan pembangunan tingkat desa.
                    </p>
                </div>
                <Button
                    onClick={() => navigate("/admin/usulan-desa/registrasi")}
                    className="h-9 bg-blue-600 hover:bg-blue-700 text-white font-semibold gap-1.5 shrink-0"
                >
                    <Plus className="h-4 w-4" />
                    <span>Tambah Usulan</span>
                </Button>
            </div>

            <div className="flex-1 min-h-0 flex flex-col mb-4">
                <UsulanDesaTable
                    data={data}
                    isLoading={isLoading}
                    onDetail={handleDetail}
                    onEdit={handleEdit}
                    onDelete={handleDelete}
                    pageIndex={pageIndex}
                    pageSize={pageSize}
                    filters={filters}
                    onFilterChange={handleFilterChange}
                    onRefresh={fetchData}
                    onReset={handleResetFilters}
                    onUpdateItem={handleUpdateItem}
                />
            </div>

            <UsulanDesaPagination
                pageCount={pageCount}
                pageIndex={pageIndex}
                pageSize={pageSize}
                totalItems={totalItems}
                onPageChange={setPageIndex}
                onPageSizeChange={setPageSize}
            />
        </div>
    );
}
