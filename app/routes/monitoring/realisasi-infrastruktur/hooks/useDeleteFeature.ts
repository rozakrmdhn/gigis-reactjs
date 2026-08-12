import { useState } from "react";
import { toast } from "sonner";
import { monitoringService } from "~/features/monitoring/services/monitoring.service";
import { infrastrukturService } from "~/services/infrastruktur.service";
import type { InfrastrukturTipe } from "~/services/infrastruktur.service";
import type { RealisasiSegmen } from "../types";

interface UseDeleteFeatureOptions {
    activeTipe: InfrastrukturTipe | null;
    realisasiList: RealisasiSegmen[];
    lockedSegmenIds: Set<string>;
    selectedDesa: string;
    onRefresh: () => void;
}

export interface UseDeleteFeatureReturn {
    deleteConfirmId: string | null;
    setDeleteConfirmId: (id: string | null) => void;
    handleDelete: (id: string) => void;
    confirmDeleteSegment: () => Promise<void>;
    isAreaTipe: () => boolean;
}

export function useDeleteFeature({
    activeTipe,
    realisasiList,
    lockedSegmenIds,
    onRefresh,
}: UseDeleteFeatureOptions): UseDeleteFeatureReturn {
    const [deleteConfirmId, setDeleteConfirmId] = useState<string | null>(null);

    const isAreaTipe = () => {
        const geomUp = (activeTipe?.geom_type || "").toUpperCase();
        return geomUp === "POLYGON" || geomUp === "MULTIPOLYGON";
    };

    const handleDelete = (id: string) => {
        if (lockedSegmenIds.has(id.toString())) {
            toast.warning("Segmen ini terkunci (read-only) karena terikat dalam Berita Acara Resmi.");
            return;
        }
        setDeleteConfirmId(id);
    };

    const confirmDeleteSegment = async () => {
        if (!deleteConfirmId) return;
        const isArea = isAreaTipe();
        const toastId = toast.loading(isArea ? "Menghapus area realisasi..." : "Menghapus segmen realisasi...");
        try {
            if (isArea) {
                const target = realisasiList.find((s) => s.id === deleteConfirmId);
                const parentId = target?.parent_id || null;
                await infrastrukturService.deleteArea(activeTipe?.kode || "jalan", parentId ?? null, deleteConfirmId);
                toast.success("Area realisasi berhasil dihapus dari database!", { id: toastId });
            } else {
                await monitoringService.deleteSegment(deleteConfirmId, activeTipe?.kode || "jalan");
                toast.success("Segmen realisasi berhasil dihapus dari database!", { id: toastId });
            }
            onRefresh();
        } catch (err) {
            console.error("Delete segment/area error:", err);
            toast.error(isArea ? "Gagal menghapus area realisasi" : "Gagal menghapus segmen realisasi", { id: toastId });
        } finally {
            setDeleteConfirmId(null);
        }
    };

    return {
        deleteConfirmId,
        setDeleteConfirmId,
        handleDelete,
        confirmDeleteSegment,
        isAreaTipe,
    };
}
