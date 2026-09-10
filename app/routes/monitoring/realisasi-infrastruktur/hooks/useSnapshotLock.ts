import { useState, useCallback, useEffect } from "react";
import { monitoringLaporanService } from "~/features/monitoring/services/monitoring_laporan.service";

export interface UseSnapshotLockReturn {
    isYearLocked: boolean;
    activeSnapshotLaporan: any;
    lockedSegmenIds: Set<string>;
    loadingLockCheck: boolean;
    checkSnapshotLock: (desaId: string, tahunFilter: string) => Promise<void>;
}

export function useSnapshotLock(
    selectedDesa: string,
    selectedTahunFilter: string
): UseSnapshotLockReturn {
    const [isYearLocked, setIsYearLocked] = useState<boolean>(false);
    const [activeSnapshotLaporan, setActiveSnapshotLaporan] = useState<any>(null);
    const [lockedSegmenIds, setLockedSegmenIds] = useState<Set<string>>(new Set());
    const [loadingLockCheck, setLoadingLockCheck] = useState<boolean>(false);

    const checkSnapshotLock = useCallback(async (desaId: string, tahunFilter: string) => {
        if (!desaId) {
            setIsYearLocked(false);
            setActiveSnapshotLaporan(null);
            setLockedSegmenIds(new Set());
            return;
        }
        setLoadingLockCheck(true);
        try {
            const queryTahun = (tahunFilter && tahunFilter !== "Semua") ? tahunFilter : undefined;
            const res = await monitoringLaporanService.getLaporanList({
                id_desa: desaId,
                tahun_anggaran: queryTahun
            });
            const reports = Array.isArray(res?.result) ? res.result : (Array.isArray(res?.data) ? res.data : []);
            if (reports.length > 0) {
                // If "Semua" is selected (no specific year filter), do NOT lock the entire screen
                if (!queryTahun) {
                    setIsYearLocked(false);
                    setActiveSnapshotLaporan(null);

                    // Collect locked segment IDs from any Final reports across years for badge display
                    const finalReports = reports.filter((lap: any) => lap.status === "Final");
                    const newLockedIds = new Set<string>();
                    for (const lap of finalReports) {
                        const segmens = lap.SegmensFormatted || lap.LaporanSegmens || lap.segmens || [];
                        segmens.forEach((s: any) => {
                            const sid = s.id?.toString() || s.id_segmen?.toString();
                            if (sid) newLockedIds.add(sid);
                        });
                    }
                    setLockedSegmenIds(newLockedIds);
                    return;
                }

                // Filter reports matching the queried year if specific year is selected
                const matchingReports = reports.filter((lap: any) => String(lap.tahun_anggaran) === String(queryTahun));

                // Only reports with status "Final" lock segments and year
                const finalReports = matchingReports.filter((lap: any) => lap.status === "Final");
                // Draft or in-revision reports
                const draftReports = matchingReports.filter((lap: any) => lap.status === "Draft" || lap.status === "Revisi");

                if (finalReports.length > 0) {
                    setIsYearLocked(true);
                    setActiveSnapshotLaporan(finalReports[0]);

                    const newLockedIds = new Set<string>();
                    for (const lap of finalReports) {
                        let segmens = lap.SegmensFormatted || lap.LaporanSegmens || lap.segmens || [];
                        if (segmens.length === 0 && lap.id) {
                            try {
                                const detailRes = await monitoringLaporanService.getLaporanById(lap.id);
                                if (detailRes?.status === "success" && detailRes.result) {
                                    segmens = detailRes.result.SegmensFormatted || detailRes.result.LaporanSegmens || detailRes.result.segmens || [];
                                }
                            } catch (e) {
                                console.error("Failed to fetch detail for laporan", lap.id, e);
                            }
                        }
                        segmens.forEach((s: any) => {
                            const sid = s.id?.toString() || s.id_segmen?.toString();
                            if (sid) newLockedIds.add(sid);
                        });
                    }
                    setLockedSegmenIds(newLockedIds);
                } else if (draftReports.length > 0) {
                    // Draft / Revisi report exists: UNLOCK year and segments for revision, and keep activeSnapshotLaporan for banner
                    setIsYearLocked(false);
                    setActiveSnapshotLaporan(draftReports[0]);
                    setLockedSegmenIds(new Set());
                } else {
                    setIsYearLocked(false);
                    setActiveSnapshotLaporan(matchingReports[0] || null);
                    setLockedSegmenIds(new Set());
                }
            } else {
                setIsYearLocked(false);
                setActiveSnapshotLaporan(null);
                setLockedSegmenIds(new Set());
            }
        } catch (err) {
            console.error("Failed to check snapshot lock status:", err);
            setIsYearLocked(false);
            setActiveSnapshotLaporan(null);
            setLockedSegmenIds(new Set());
        } finally {
            setLoadingLockCheck(false);
        }
    }, []);

    useEffect(() => {
        if (selectedDesa) {
            checkSnapshotLock(selectedDesa, selectedTahunFilter);
        } else {
            setIsYearLocked(false);
            setActiveSnapshotLaporan(null);
            setLockedSegmenIds(new Set());
        }
    }, [selectedDesa, selectedTahunFilter, checkSnapshotLock]);

    return {
        isYearLocked,
        activeSnapshotLaporan,
        lockedSegmenIds,
        loadingLockCheck,
        checkSnapshotLock,
    };
}
