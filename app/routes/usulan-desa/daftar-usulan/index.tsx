import { useCallback, useEffect, useState } from "react";
import type { MetaFunction } from "react-router";
import { useNavigate } from "react-router";
import { UsulanDesaTable } from "~/features/usulan-desa/components/UsulanDesaTable";
import { usulanDesaService } from "~/features/usulan-desa/services/usulan-desa.service";
import type { UsulanDesa, UsulanDesaFilters as IFilters } from "~/features/usulan-desa/types/usulan-desa.types";
import { toast } from "sonner";
import { Plus } from "lucide-react";
import { Button } from "~/components/ui/button";
import { Badge } from "~/components/ui/badge";
import { useAuth } from "~/contexts/auth-context";
import { canCreateUsulanDesa } from "~/utils/permissions";

export const meta: MetaFunction = () => {
    return [
        { title: "Daftar Usulan Desa - MELAROSA" },
        { name: "description", content: "Daftar semua usulan masyarakat desa." },
    ];
};

export default function DaftarUsulanPage() {
    const { user } = useAuth();
    const navigate = useNavigate();
    const [data, setData] = useState<UsulanDesa[]>([]);
    const [isLoading, setIsLoading] = useState(true);

    const [pageIndex, setPageIndex] = useState(0);
    const [pageSize, setPageSize] = useState(20);
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
        <div className="relative min-h-full flex-1 flex flex-col bg-background dark:bg-slate-950 overflow-y-auto overflow-x-hidden custom-scrollbar">
            {/* 1. Header Area with Clean Modern Hierarchy (Scrolls with page) */}
            <div className="px-4 sm:px-6 pt-3 sm:pt-5 pb-2.5 sm:pb-3 border-b border-border/80 shrink-0">
                <div className="flex items-center justify-between gap-2.5 sm:gap-3">
                    <div className="space-y-0.5">
                        <div className="flex items-center gap-2">
                            <h1 className="text-base sm:text-xl font-bold text-foreground tracking-tight">
                                Daftar Usulan Pembangunan Desa
                            </h1>
                            <Badge variant="outline" className="text-[9.5px] sm:text-[10px] font-bold uppercase tracking-wider bg-indigo-500/10 text-indigo-700 dark:text-indigo-300 border-indigo-500/30">
                                Usulan Desa
                            </Badge>
                        </div>
                        <p className="hidden sm:block text-xs text-muted-foreground">
                            Kelola, verifikasi, dan pantau status seluruh usulan pembangunan tingkat desa per Tahun Anggaran.
                        </p>
                    </div>
                    <div className="flex items-center gap-2 shrink-0">
                        {canCreateUsulanDesa(user) && (
                            <Button
                                onClick={() => navigate("/admin/usulan-desa/registrasi")}
                                className="h-8 sm:h-9 px-2.5 sm:px-3.5 bg-indigo-600 hover:bg-indigo-700 text-white font-bold text-xs gap-1.5 shadow-sm rounded-xl cursor-pointer"
                            >
                                <Plus className="h-3.5 sm:h-4 w-3.5 sm:w-4" />
                                <span className="hidden sm:inline">Tambah Usulan Baru</span>
                                <span className="sm:hidden">Tambah</span>
                            </Button>
                        )}
                    </div>
                </div>
            </div>

            {/* 2. Main Data Content Area (Menubar, Table, Mobile Cards & Pagination) */}
            <UsulanDesaTable
                data={data}
                isLoading={isLoading}
                onDetail={handleDetail}
                onEdit={handleEdit}
                onDelete={handleDelete}
                pageIndex={pageIndex}
                pageSize={pageSize}
                pageCount={pageCount}
                totalItems={totalItems}
                onPageChange={setPageIndex}
                onPageSizeChange={setPageSize}
                filters={filters}
                onFilterChange={handleFilterChange}
                onRefresh={fetchData}
                onReset={handleResetFilters}
                onUpdateItem={handleUpdateItem}
            />
        </div>
    );
}
