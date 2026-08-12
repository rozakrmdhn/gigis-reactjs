/**
 * KecamatanAccordionTable
 *
 * Komponen tabel accordion grouped berdasarkan Kecamatan untuk dashboard WebGIS
 * monitoring infrastruktur jalan.
 *
 * Fitur:
 * - Isolated scroll container (hanya Card yang scroll, bukan window/body)
 * - Sticky main table header (top: 0, z-50)
 * - Sticky accordion Kecamatan header saat expand (top: headerHeight, z-40)
 * - Sticky sub-table Desa card title & column header
 * - Multiple accordion terbuka bersamaan
 * - Fully data-driven & reusable
 * - Smooth transition expand/collapse
 * - Responsive horizontal scroll pada mobile
 */

import React, { useCallback, useRef, useState } from "react";
import { ChevronRight, Building2, Map } from "lucide-react";
import { cn } from "~/lib/utils";
import { Progress } from "~/components/ui/progress";
import { Badge } from "~/components/ui/badge";

/* ─────────────────────────────────────────────────────────────
 * TYPES
 * ───────────────────────────────────────────────────────────── */

export interface DesaData {
  id: number;
  nama: string;
  ruasPoros: number;
  panjangMaster: number;
  panjangDibangun: number;
  sisaBelum: number;
  progress: number;
}

export interface KecamatanData {
  id: number;
  kecamatan: string;
  jumlahDesa: number;
  ruasPoros: number;
  panjangMaster: number;
  panjangDibangun: number;
  sisaBelum: number;
  progress: number;
  desa: DesaData[];
}

interface KecamatanAccordionTableProps {
  /** Array data kecamatan (fully data-driven) */
  data: KecamatanData[];
  /** Maksimum tinggi card scroll container. Default: "70vh" */
  maxHeight?: string;
  /** Class tambahan untuk wrapper */
  className?: string;
}

/* ─────────────────────────────────────────────────────────────
 * HELPERS
 * ───────────────────────────────────────────────────────────── */

function formatM(meters: number): string {
  return (
    new Intl.NumberFormat("id-ID", { maximumFractionDigits: 1 }).format(meters) + " m"
  );
}

function formatKm(meters: number): string {
  return (
    new Intl.NumberFormat("id-ID", { maximumFractionDigits: 2 }).format(
      meters / 1000
    ) + " km"
  );
}

function getProgressColor(progress: number): string {
  if (progress >= 80) return "bg-emerald-500";
  if (progress >= 50) return "bg-blue-500";
  if (progress >= 30) return "bg-amber-500";
  return "bg-rose-500";
}

function getProgressTextColor(progress: number): string {
  if (progress >= 80) return "text-emerald-600 dark:text-emerald-400";
  if (progress >= 50) return "text-blue-600 dark:text-blue-400";
  if (progress >= 30) return "text-amber-600 dark:text-amber-400";
  return "text-rose-600 dark:text-rose-400";
}

/* ─────────────────────────────────────────────────────────────
 * MAIN COMPONENT
 * ───────────────────────────────────────────────────────────── */

export function KecamatanAccordionTable({
  data,
  maxHeight = "70vh",
  className,
}: KecamatanAccordionTableProps) {
  // Set of expanded Kecamatan IDs – fully dynamic, not index-based
  const [expandedIds, setExpandedIds] = useState<Set<number>>(new Set());

  // Ref to scroll container (unused in this approach but available for future use)
  const _scrollContainerRef = useRef<HTMLDivElement>(null);

  const toggleKecamatan = useCallback((id: number) => {
    setExpandedIds((prev) => {
      const next = new Set(prev);
      if (next.has(id)) {
        next.delete(id);
      } else {
        next.add(id);
      }
      return next;
    });
  }, []);

  const expandAll = useCallback(() => {
    setExpandedIds(new Set(data.map((d) => d.id)));
  }, [data]);

  const collapseAll = useCallback(() => {
    setExpandedIds(new Set());
  }, []);

  const openCount = expandedIds.size;

  return (
    <div className={cn("flex flex-col gap-0", className)}>
      {/* ── Toolbar ───────────────────────────────────────────── */}
      <div className="flex items-center justify-between gap-2 pb-2.5">
        <div className="flex items-center gap-2">
          <Building2 className="w-4 h-4 text-blue-600 dark:text-blue-400 shrink-0" />
          <span className="text-sm font-bold text-slate-800 dark:text-slate-200">
            Rekapitulasi Per Kecamatan
          </span>
          <Badge
            variant="secondary"
            className="text-[10px] font-bold bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300"
          >
            {data.length} Kecamatan
          </Badge>
        </div>

        <div className="flex items-center gap-1.5">
          {openCount > 0 && (
            <Badge className="h-7 px-2.5 bg-blue-50 text-blue-700 dark:bg-blue-950/60 dark:text-blue-300 border border-blue-200 dark:border-blue-800 text-[11px] font-bold gap-1 flex items-center">
              <Building2 className="w-3 h-3" />
              {openCount} Terbuka
            </Badge>
          )}

          {openCount > 0 ? (
            <button
              onClick={collapseAll}
              className="h-7 px-2.5 text-[11px] font-semibold rounded-md border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-950 text-slate-700 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-900 transition-colors flex items-center gap-1"
            >
              <ChevronRight className="w-3.5 h-3.5 rotate-90" />
              Tutup Semua
            </button>
          ) : (
            <button
              onClick={expandAll}
              className="h-7 px-2.5 text-[11px] font-semibold rounded-md border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-950 text-slate-700 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-900 transition-colors flex items-center gap-1"
            >
              <ChevronRight className="w-3.5 h-3.5 -rotate-90" />
              Buka Semua
            </button>
          )}
        </div>
      </div>

      {/* ── Card with Isolated Scroll Container ───────────────── */}
      {/*
       * CRITICAL: Card container has `overflow: hidden` for rounded corners,
       * but the INNER div has `overflow-y: auto` as the actual scroll context.
       * Sticky inside the inner div works against IT, not the window.
       * max-height is set here; the inner div grows to fill it.
       */}
      <div
        className="rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 shadow-sm overflow-hidden"
        style={{ maxHeight }}
      >
        {/*
         * SCROLL CONTEXT: `overflow-y: auto` here creates the scrollable region.
         * `position: relative` ensures sticky children are positioned against THIS div.
         * DO NOT add `overflow: hidden` or any transform on parent — it breaks sticky.
         */}
        <div
          ref={_scrollContainerRef}
          className="overflow-y-auto overflow-x-auto relative"
          style={{
            maxHeight,
            scrollbarWidth: "thin",
            scrollbarColor: "#CBD5E1 transparent",
          }}
        >
          <table className="w-full min-w-[960px] border-collapse text-xs">
            {/* ── STICKY MAIN HEADER ──────────────────────────
             * top: 0 → sticks to top of the scroll container div.
             * z-[50] → highest layer; always above Kecamatan (z-40) and Desa (z-30).
             * Background must be solid (no transparency).
             * ─────────────────────────────────────────────── */}
            <thead className="sticky top-0 z-[50]">
              <tr className="border-b border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-900">
                {/* Chevron column */}
                <th className="w-10 py-2.5 px-2" aria-label="Expand" />
                {/* No */}
                <th className="w-12 py-2.5 px-2 text-center font-semibold text-slate-400 uppercase text-[10px] tracking-wider">
                  No
                </th>
                {/* Kecamatan */}
                <th className="min-w-[160px] py-2.5 px-3 text-left font-semibold text-slate-400 uppercase text-[10px] tracking-wider">
                  Kecamatan
                </th>
                {/* Jumlah Desa */}
                <th className="w-[110px] py-2.5 px-2 text-center font-semibold text-slate-400 uppercase text-[10px] tracking-wider">
                  Jumlah Desa
                </th>
                {/* Ruas Poros */}
                <th className="w-[100px] py-2.5 px-2 text-center font-semibold text-slate-400 uppercase text-[10px] tracking-wider">
                  Ruas Poros
                </th>
                {/* Panjang Master */}
                <th className="w-[140px] py-2.5 px-3 text-right font-semibold text-slate-400 uppercase text-[10px] tracking-wider">
                  Panjang Master
                </th>
                {/* Panjang Dibangun */}
                <th className="w-[140px] py-2.5 px-3 text-right font-semibold text-slate-400 uppercase text-[10px] tracking-wider">
                  Panjang Dibangun
                </th>
                {/* Sisa Belum */}
                <th className="w-[130px] py-2.5 px-3 text-right font-semibold text-slate-400 uppercase text-[10px] tracking-wider">
                  Sisa Belum
                </th>
                {/* Progress */}
                <th className="w-[140px] py-2.5 px-3 text-left font-semibold text-slate-400 uppercase text-[10px] tracking-wider">
                  Progress
                </th>
              </tr>
            </thead>

            <tbody className="divide-y-0">
              {data.map((kec, idx) => (
                <KecamatanSection
                  key={kec.id}
                  kec={kec}
                  index={idx}
                  isExpanded={expandedIds.has(kec.id)}
                  onToggle={toggleKecamatan}
                />
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}

/* ─────────────────────────────────────────────────────────────
 * KECAMATAN SECTION (accordion item)
 *
 * HOW STICKY WORKS HERE:
 * 1. Each Kecamatan <tr> is a direct child of <tbody> inside the scroll container.
 * 2. When isExpanded=true, we add `position:sticky; top:37px` (= main thead height).
 * 3. Because the scroll container has `overflow-y:auto` (not the table itself),
 *    sticky positioning works correctly against that scroll container.
 * 4. When the NEXT Kecamatan section scrolls into view, CSS naturally "pushes"
 *    the previous sticky header up — just like native grouped table behavior.
 * 5. When collapsed, the row is NOT sticky — it flows normally.
 *
 * WHY NOT IntersectionObserver?
 * Pure CSS `position:sticky` on table rows in a scroll container already achieves
 * the correct "active group header sticks" behavior without JS. The natural DOM order
 * ensures only the topmost expanded section sticks, and the next one pushes it out.
 * ───────────────────────────────────────────────────────────── */

/** Height of main thead in pixels. Must match actual rendered value. */
const THEAD_HEIGHT = 37;

interface KecamatanSectionProps {
  kec: KecamatanData;
  index: number;
  isExpanded: boolean;
  onToggle: (id: number) => void;
}

function KecamatanSection({
  kec,
  index,
  isExpanded,
  onToggle,
}: KecamatanSectionProps) {
  return (
    <>
      {/* ── Kecamatan Row ─────────────────────────────────────
       * When expanded:
       *   - position: sticky; top: THEAD_HEIGHT (so it sticks below main header)
       *   - z-index: 40 (below main header z-50, above Desa z-30)
       *   - Visually: blue-tinted bg + left accent border + drop shadow
       * When collapsed:
       *   - Normal flow; hover state only
       * ─────────────────────────────────────────────────────── */}
      <tr
        onClick={() => onToggle(kec.id)}
        className={cn(
          "cursor-pointer select-none transition-colors duration-150",
          isExpanded
            ? [
                "sticky z-[40]",
                "bg-blue-50 dark:bg-blue-950/70",
                "border-l-4 border-l-blue-600 dark:border-l-blue-400",
                "border-y border-y-blue-100 dark:border-y-blue-900/60",
                "shadow-[0_2px_8px_rgba(0,0,0,0.1)]",
              ]
            : [
                "hover:bg-slate-50/60 dark:hover:bg-slate-800/40",
                "border-b border-b-slate-200 dark:border-b-slate-800",
                "border-l-4 border-l-transparent",
              ]
        )}
        style={isExpanded ? { top: `${THEAD_HEIGHT}px` } : undefined}
      >
        {/* Chevron icon cell */}
        <td className="w-10 p-2 text-center">
          <span
            className={cn(
              "inline-flex items-center justify-center w-6 h-6 rounded-full transition-all duration-200",
              isExpanded
                ? "bg-blue-100 dark:bg-blue-900/60 text-blue-600 dark:text-blue-400"
                : "text-slate-400"
            )}
          >
            <ChevronRight
              className={cn(
                "w-3.5 h-3.5 transition-transform duration-200",
                isExpanded && "rotate-90"
              )}
            />
          </span>
        </td>

        {/* No */}
        <td className="w-12 py-3 px-2 text-center font-semibold text-slate-400 text-[11px]">
          {index + 1}
        </td>

        {/* Kecamatan Name */}
        <td className="py-3 px-3">
          <span
            className={cn(
              "font-bold text-xs leading-tight",
              isExpanded
                ? "text-blue-700 dark:text-blue-300"
                : "text-slate-900 dark:text-slate-100"
            )}
          >
            {kec.kecamatan}
          </span>
        </td>

        {/* Jumlah Desa */}
        <td className="py-3 px-2 text-center">
          <Badge
            variant="outline"
            className="text-[10px] font-bold bg-blue-50/70 text-blue-600 dark:bg-blue-950/40 dark:text-blue-400 border-blue-200 dark:border-blue-800"
          >
            {kec.jumlahDesa} Desa
          </Badge>
        </td>

        {/* Ruas Poros */}
        <td className="py-3 px-2 text-center">
          <Badge
            variant="outline"
            className="text-[10px] font-bold bg-slate-50 text-slate-600 dark:bg-slate-800 dark:text-slate-400 border-slate-200 dark:border-slate-700"
          >
            {kec.ruasPoros} Ruas
          </Badge>
        </td>

        {/* Panjang Master */}
        <td className="py-3 px-3 text-right font-semibold text-slate-700 dark:text-slate-300 tabular-nums">
          {formatM(kec.panjangMaster)}
        </td>

        {/* Panjang Dibangun */}
        <td className="py-3 px-3 text-right font-semibold text-emerald-600 dark:text-emerald-400 tabular-nums">
          {formatM(kec.panjangDibangun)}
        </td>

        {/* Sisa Belum */}
        <td className="py-3 px-3 text-right font-semibold text-amber-600 dark:text-amber-400 tabular-nums">
          {formatM(Math.max(0, kec.sisaBelum))}
        </td>

        {/* Progress */}
        <td className="py-3 px-3">
          <div className="flex items-center gap-2">
            <div className="flex-1 min-w-[60px]">
              <Progress
                value={Math.min(100, kec.progress)}
                className="h-1.5 bg-slate-200 dark:bg-slate-700"
                indicatorClassName={getProgressColor(kec.progress)}
              />
            </div>
            <span
              className={cn(
                "text-[11px] font-bold tabular-nums shrink-0 min-w-[36px] text-right",
                getProgressTextColor(kec.progress)
              )}
            >
              {kec.progress.toFixed(1)}%
            </span>
          </div>
        </td>
      </tr>

      {/* ── Expanded Content (Desa sub-table) ─────────────────── */}
      {isExpanded && (
        <tr className="bg-slate-50/50 dark:bg-slate-900/50">
          <td
            colSpan={9}
            className="p-0 border-b border-slate-200 dark:border-slate-800"
          >
            <DesaSubTable kec={kec} />
          </td>
        </tr>
      )}
    </>
  );
}

/* ─────────────────────────────────────────────────────────────
 * DESA SUB-TABLE
 *
 * Rendered inside the expanded Kecamatan row's <td colSpan=9>.
 * Contains:
 *   1. A card-style container with rounded border.
 *   2. A sticky card header ("Daftar Desa — Kecamatan X") at z-[35].
 *   3. A sticky Desa column header at z-[30].
 *
 * Sticky top values:
 *   - Kecamatan row (sticky) height ≈ 45px → total from scroll top: 37 + 45 = 82px
 *   - Card header sticks at top: 82px (z-35)
 *   - Card header height ≈ 38px → desa thead top: 82 + 38 = 120px (z-30)
 *
 * Note: These pixel values are approximate based on rendered output.
 * If your font-size/padding differs, adjust KECAMATAN_ROW_HEIGHT & CARD_HEADER_HEIGHT.
 * ───────────────────────────────────────────────────────────── */

/** Approximate rendered height of Kecamatan sticky row in pixels. */
const KECAMATAN_ROW_HEIGHT = 45;
/** Approximate rendered height of Desa card title bar in pixels. */
const CARD_HEADER_HEIGHT = 38;

const DESA_CARD_HEADER_TOP = THEAD_HEIGHT + KECAMATAN_ROW_HEIGHT; // 82px
const DESA_THEAD_TOP = DESA_CARD_HEADER_TOP + CARD_HEADER_HEIGHT; // 120px

function DesaSubTable({ kec }: { kec: KecamatanData }) {
  return (
    <div className="px-4 py-3">
      <div className="rounded-xl border border-slate-200 dark:border-slate-800 overflow-hidden bg-white dark:bg-slate-950 shadow-xs">
        {/* ── Desa Table with Combined Sticky Header ─────────────── */}
        <div className="overflow-x-auto">
          <table className="w-full min-w-[760px] border-collapse text-xs">
            {/* Single combined sticky header block (Title Row + Column Headers) */}
            <thead
              className="sticky z-[35] bg-white dark:bg-slate-950 shadow-xs border-b border-slate-200 dark:border-slate-800"
              style={{ top: `${THEAD_HEIGHT}px` }}
            >
              {/* Row 1: Card Title */}
              <tr className="bg-slate-50/90 dark:bg-slate-900/90 border-b border-slate-200 dark:border-slate-800">
                <th colSpan={7} className="py-2 px-4 text-left font-normal">
                  <div className="flex items-center justify-between">
                    <span className="flex items-center gap-1.5 text-[11px] font-bold text-slate-700 dark:text-slate-300 uppercase tracking-wider">
                      <Building2 className="w-3.5 h-3.5 text-blue-600 dark:text-blue-400 shrink-0" />
                      Daftar Desa — Kecamatan {kec.kecamatan}
                      <Badge
                        variant="secondary"
                        className="text-[9px] font-bold ml-1 bg-blue-50 text-blue-600 dark:bg-blue-950/50 dark:text-blue-400 border border-blue-200 dark:border-blue-800"
                      >
                        {kec.desa.length} Desa
                      </Badge>
                    </span>
                    <span className="text-[10px] text-slate-400 font-medium hidden sm:block">
                      {formatKm(kec.panjangDibangun)} dari {formatKm(kec.panjangMaster)} terbangun
                    </span>
                  </div>
                </th>
              </tr>
              {/* Row 2: Column Headers */}
              <tr className="bg-slate-100/95 dark:bg-slate-900/95">
                <th className="w-10 py-2 px-2 text-center font-semibold text-slate-400 uppercase text-[9px] tracking-wider">
                  No
                </th>
                <th className="min-w-[160px] py-2 px-3 text-left font-semibold text-slate-400 uppercase text-[9px] tracking-wider">
                  Nama Desa
                </th>
                <th className="w-[90px] py-2 px-2 text-center font-semibold text-slate-400 uppercase text-[9px] tracking-wider">
                  Ruas Poros
                </th>
                <th className="w-[130px] py-2 px-3 text-right font-semibold text-slate-400 uppercase text-[9px] tracking-wider">
                  Panjang Master
                </th>
                <th className="w-[130px] py-2 px-3 text-right font-semibold text-slate-400 uppercase text-[9px] tracking-wider">
                  Panjang Dibangun
                </th>
                <th className="w-[120px] py-2 px-3 text-right font-semibold text-slate-400 uppercase text-[9px] tracking-wider">
                  Sisa Belum
                </th>
                <th className="w-[130px] py-2 px-3 text-left font-semibold text-slate-400 uppercase text-[9px] tracking-wider">
                  Progress
                </th>
              </tr>
            </thead>

            <tbody className="divide-y divide-slate-100 dark:divide-slate-800/70">
              {kec.desa.length === 0 ? (
                <tr>
                  <td
                    colSpan={7}
                    className="py-8 text-center text-xs text-slate-400 font-semibold italic"
                  >
                    Tidak ada data desa untuk kecamatan ini.
                  </td>
                </tr>
              ) : (
                kec.desa.map((desa, desaIdx) => (
                  <tr
                    key={desa.id}
                    className="hover:bg-slate-50/80 dark:hover:bg-slate-800/30 transition-colors duration-100"
                  >
                    {/* No */}
                    <td className="py-2.5 px-2 text-center font-semibold text-[10px] text-slate-400">
                      {desaIdx + 1}
                    </td>

                    {/* Nama Desa */}
                    <td className="py-2.5 px-3">
                      <div className="flex items-center gap-1.5">
                        <Map className="w-3 h-3 text-slate-400 dark:text-slate-600 shrink-0" />
                        <span className="font-semibold text-[11px] text-slate-800 dark:text-slate-200 truncate max-w-[200px]">
                          {desa.nama}
                        </span>
                      </div>
                    </td>

                    {/* Ruas Poros */}
                    <td className="py-2.5 px-2 text-center">
                      <span className="text-[10px] font-bold text-slate-600 dark:text-slate-400">
                        {desa.ruasPoros}
                      </span>
                    </td>

                    {/* Panjang Master */}
                    <td className="py-2.5 px-3 text-right font-semibold text-[11px] text-slate-700 dark:text-slate-300 tabular-nums">
                      {formatM(desa.panjangMaster)}
                    </td>

                    {/* Panjang Dibangun */}
                    <td className="py-2.5 px-3 text-right font-semibold text-[11px] text-emerald-600 dark:text-emerald-400 tabular-nums">
                      {formatM(desa.panjangDibangun)}
                    </td>

                    {/* Sisa Belum */}
                    <td className="py-2.5 px-3 text-right font-semibold text-[11px] text-amber-600 dark:text-amber-400 tabular-nums">
                      {formatM(Math.max(0, desa.sisaBelum))}
                    </td>

                    {/* Progress */}
                    <td className="py-2.5 px-3">
                      <div className="flex items-center gap-1.5">
                        <div className="flex-1 min-w-[44px]">
                          <Progress
                            value={Math.min(100, desa.progress)}
                            className="h-1 bg-slate-200 dark:bg-slate-700"
                            indicatorClassName={getProgressColor(desa.progress)}
                          />
                        </div>
                        <span
                          className={cn(
                            "text-[10px] font-bold tabular-nums shrink-0 min-w-[36px] text-right",
                            getProgressTextColor(desa.progress)
                          )}
                        >
                          {Math.min(100, desa.progress).toFixed(1)}%
                        </span>
                      </div>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
