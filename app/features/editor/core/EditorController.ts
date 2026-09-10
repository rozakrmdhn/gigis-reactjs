/**
 * Editor WebGIS - Core Controller Orchestrator
 * 
 * Mengatur aktivasi tool dan interaksi OpenLayers berdasarkan EditorContext & EditorCapabilities.
 */

import type Map from 'ol/Map';
import type VectorSource from 'ol/source/Vector';
import type Interaction from 'ol/interaction/Interaction';
import Select from 'ol/interaction/Select';
import Collection from 'ol/Collection';
import type { Feature } from 'ol';
import type { Geometry } from 'ol/geom';
import type { Geometry as GeoJsonGeometry } from 'geojson';
import type { EditorCapabilities, EditorContext, EditorTool, GeometryType } from './editor.types';
import { isToolSupported } from '../capabilities/editorCapabilities';
import { DEFAULT_EDITOR_CONFIG, type EditorConfig } from './editor.config';
import { createDrawInteraction } from '../interactions/draw/drawInteraction';
import { createModifyInteraction } from '../interactions/modify/modifyInteraction';
import { createSnapInteraction } from '../interactions/snap/snapInteraction';
import { createSelectInteraction, getFeatureId, setupHoverCursor } from '../interactions/select/selectInteraction';
import { getSelectedStyle } from '../interactions/select/selectStyle';
import { getModifyStyle } from '../interactions/modify/modifyStyle';
import { getDrawStyle } from '../interactions/draw/drawStyle';
import { loadFeatureToEditableLayer, clearEditableLayer } from '../layers/editableLayer';
import { extractGeometryFromFeature, geoJsonToFeature } from '../geometry/common/geoJsonConverter';
import { useEditorStore } from '../../../stores/editorStore';

type ToolChangeListener = (tool: EditorTool | null) => void;
type ContextChangeListener = (context: EditorContext) => void;

let activeEditorController: EditorController | null = null;

export function getActiveEditorController(): EditorController | null {
  return activeEditorController;
}

export function setActiveEditorController(controller: EditorController | null): void {
  activeEditorController = controller;
}

export class EditorController {
  private context: EditorContext;
  private config: EditorConfig;
  private activeTool: EditorTool | null = null;
  private toolListeners = new Set<ToolChangeListener>();
  private contextListeners = new Set<ContextChangeListener>();

  // OpenLayers Runtime Instances (dikelola controller, bukan di store)
  private map: Map | null = null;
  private source: VectorSource<Feature<Geometry>> | null = null;
  private activeInteraction: Interaction | null = null;
  private snapInteraction: import('ol/interaction/Snap').default | null = null;
  private snapEnabled: boolean = false;
  private hoverCursorCleanup: (() => void) | null = null;

  // State callbacks & references
  public editingFeatureId?: string | null = null;
  public getStoreGeometry?: () => GeoJsonGeometry | null;
  public onGeometryChange?: (geometry: GeoJsonGeometry) => void;
  public onFeatureSelect?: (featureId: string | null) => void;
  public onDrawEnd?: (feature: Feature<Geometry>) => void;
  public onDrawFeatureEnd?: (feature: Feature<Geometry>) => void;
  public onDrawAbort?: () => void;
  public onModifyEnd?: (features: Feature<Geometry>[]) => void;
  public onDeleteRequest?: () => void;

  constructor(context: EditorContext, config?: Partial<EditorConfig>) {
    this.context = context;
    this.config = { ...DEFAULT_EDITOR_CONFIG, ...config };
    setActiveEditorController(this);
  }

  /**
   * Menghubungkan map dan vector source ke controller
   */
  public attachMap(map: Map, source: VectorSource<Feature<Geometry>>): void {
    this.map = map;
    this.source = source;

    // Jika ada tool yang aktif saat map di-attach, inisialisasi interaksinya
    if (this.activeTool) {
      this.initInteractionForTool(this.activeTool);
    }

    // Pasang snap jika sudah enabled sebelum map ter-attach
    if (this.snapEnabled) {
      this.attachSnapInteraction();
    }
  }

  /**
   * Melepas map dan interaction dari controller
   */
  public detachMap(): void {
    this.detachSnapInteraction();
    this.removeActiveInteraction();
    this.map = null;
    this.source = null;
  }

  /**
   * Mendapatkan instance ol/Map yang terhubung
   */
  public getMap(): Map | null {
    return this.map;
  }

  /**
   * Mendapatkan instance VectorSource editable
   */
  public getSource(): VectorSource<Feature<Geometry>> | null {
    return this.source;
  }

  /**
   * Mendapatkan context editor saat ini
   */
  public getContext(): EditorContext {
    return this.context;
  }

  /**
   * Mendapatkan konfigurasi editor
   */
  public getConfig(): EditorConfig {
    return this.config;
  }

  /**
   * Mendapatkan geometry type yang sedang aktif
   */
  public getGeometryType(): GeometryType {
    return this.context.geometryType;
  }

  /**
   * Mendapatkan capabilities yang sedang aktif
   */
  public getCapabilities(): EditorCapabilities {
    return this.context.capabilities;
  }

  /**
   * Mendapatkan tool yang sedang aktif
   */
  public getActiveTool(): EditorTool | null {
    return this.activeTool;
  }

  /**
   * Melakukan zoom/pan peta ke geometri spesifik dan memuatnya ke editable layer
   */
  public zoomToGeometry(
    geometry: GeoJsonGeometry | null | undefined,
    options?: { featureId?: string; padding?: number[]; maxZoom?: number; duration?: number }
  ): void {
    if (!this.map || !geometry) return;

    // 1. Muat geometri ke editable layer jika source tersedia
    if (this.source) {
      loadFeatureToEditableLayer(this.source, options?.featureId, geometry);
    }

    // 2. Hitung extent geometri dan lakukan fit
    try {
      const olFeature = geoJsonToFeature(geometry, options?.featureId);
      const olGeom = olFeature.getGeometry();
      if (!olGeom) return;

      const extent = olGeom.getExtent();
      // Validasi extent
      if (isFinite(extent[0]) && isFinite(extent[1]) && isFinite(extent[2]) && isFinite(extent[3])) {
        this.map.getView().fit(extent, {
          padding: options?.padding ?? [60, 60, 60, 60],
          maxZoom: options?.maxZoom ?? 18,
          duration: options?.duration ?? 600,
        });
      }
    } catch (err) {
      console.warn('[EditorController] Gagal melakukan zoomToGeometry:', err);
    }
  }

  /**
   * Mengaktifkan / menonaktifkan Snap sebagai secondary interaction.
   * Snap berjalan berdampingan dengan Draw/Modify, bukan menggantikan tool aktif.
   */
  public setSnapEnabled(enabled: boolean): void {
    this.snapEnabled = enabled;
    if (enabled) {
      this.attachSnapInteraction();
    } else {
      this.detachSnapInteraction();
    }
  }

  public isSnapActive(): boolean {
    return this.snapEnabled;
  }

  private attachSnapInteraction(): void {
    if (!this.map || !this.source) return;
    if (this.snapInteraction) return; // sudah terpasang
    // Hanya snap saat ada primary tool aktif (draw / modify)
    if (!this.activeTool || this.activeTool === 'select') return;

    this.snapInteraction = createSnapInteraction({
      source: this.source,
      pixelTolerance: this.config.snapPixelTolerance,
    });
    this.map.addInteraction(this.snapInteraction);
  }

  private detachSnapInteraction(): void {
    if (this.snapInteraction && this.map) {
      this.map.removeInteraction(this.snapInteraction);
      this.snapInteraction = null;
    }
  }

  /**
   * Memeriksa apakah suatu tool diizinkan untuk diaktifkan berdasarkan capability
   */
  public canActivate(tool: EditorTool): boolean {
    return isToolSupported(this.context.capabilities, tool);
  }

  /**
   * Menghapus seleksi feature di map dan store
   */
  public clearSelection(): void {
    if (this.activeInteraction instanceof Select) {
      this.activeInteraction.getFeatures().clear();
    }
    this.onFeatureSelect?.(null);
  }

  /**
   * Membersihkan feature di editable layer
   */
  public clearLayer(): void {
    if (this.source) {
      clearEditableLayer(this.source);
    }
  }

  /**
   * Mengaktifkan tool jika kapabilitas mengizinkan.
   * Catatan: 'snap' dikelola via setSnapEnabled(), bukan via activate().
   */
  public activate(tool: EditorTool): boolean {
    // Snap dikelola terpisah
    if (tool === 'snap') {
      this.setSnapEnabled(!this.snapEnabled);
      return true;
    }

    if (!this.canActivate(tool)) {
      console.warn(
        `[EditorController] Tool '${tool}' tidak didukung untuk geometry '${this.context.geometryType}'.`
      );
      return false;
    }

    if (this.activeTool === tool) {
      return true;
    }

    // Auto-deselect feature saat berpindah dari tool select ke draw/split/dsb (TETAPI JANGAN deselect saat ke modify)
    if (this.activeTool === 'select' && tool !== 'select' && tool !== 'modify') {
      this.clearSelection();
    }

    // Lepas snap saat kembali ke select
    if (tool === 'select') {
      this.detachSnapInteraction();
    }

    this.removeActiveInteraction();
    this.activeTool = tool;
    this.initInteractionForTool(tool);

    // Re-pasang snap jika enabled dan tool baru mendukungnya
    if (this.snapEnabled && (tool === 'draw' || tool === 'modify')) {
      this.attachSnapInteraction();
    }

    this.notifyToolChange();
    return true;
  }

  /**
   * Menonaktifkan tool yang sedang aktif
   */
  public deactivate(): void {
    if (this.activeTool !== null) {
      if (this.activeTool === 'select') {
        this.clearSelection();
      }
      this.removeActiveInteraction();
      this.activeTool = null;
      this.notifyToolChange();
    }
  }

  /**
   * Inisialisasi OpenLayers Interaction sesuai tool yang diaktifkan
   */
  private initInteractionForTool(tool: EditorTool): void {
    if (!this.map || !this.source) {
      return;
    }

    switch (tool) {
      case 'select': {
        const select = createSelectInteraction({
          style: getSelectedStyle(this.context.geometryType),
          onSelect: (feature) => {
            const id = feature ? getFeatureId(feature) : null;
            this.onFeatureSelect?.(id);
          },
          onDeselect: () => {
            this.onFeatureSelect?.(null);
          },
        });

        this.map.addInteraction(select);
        this.activeInteraction = select;
        this.hoverCursorCleanup = setupHoverCursor(this.map);
        break;
      }

      case 'draw': {
        // 1. Bersihkan layer editable sebelum mendigitasi feature baru
        clearEditableLayer(this.source);

        // 2. Draw interaction dinamis berdasarkan context.geometryType
        const draw = createDrawInteraction({
          source: this.source,
          geometryType: this.context.geometryType,
          style: getDrawStyle(),
          onDrawEnd: (feature) => {
            const geoJsonGeom = extractGeometryFromFeature(feature);
            if (geoJsonGeom) {
              this.onGeometryChange?.(geoJsonGeom);
            }
            this.onDrawFeatureEnd?.(feature);
            this.onDrawEnd?.(feature);
          },
          onDrawAbort: () => {
            this.onDrawAbort?.();
          },
        });
        this.map.addInteraction(draw);
        this.activeInteraction = draw;
        break;
      }

      case 'modify': {
        // 1. Sinkronisasi geometry dari store ke editable layer
        const storeState = useEditorStore.getState();
        const activeId = this.editingFeatureId || storeState.editingFeatureId || storeState.selectedFeatureId;
        const currentGeometry = this.getStoreGeometry?.() || storeState.geometry || storeState.originalGeometry;

        if (currentGeometry && this.source) {
          loadFeatureToEditableLayer(this.source, activeId, currentGeometry);
        } else if (this.source && this.source.getFeatures().length > 0) {
          const firstFeature = this.source.getFeatures()[0];
          const extracted = extractGeometryFromFeature(firstFeature);
          if (extracted) {
            this.onGeometryChange?.(extracted);
          }
        }

        if (!this.source) break;

        // 2. Inisialisasi Modify interaction langsung dari VectorSource
        const modify = createModifyInteraction({
          source: this.source,
          style: getModifyStyle(),
          pixelTolerance: 20,
          onModifyEnd: (modFeatures) => {
            if (modFeatures.length > 0) {
              const updatedGeometry = extractGeometryFromFeature(modFeatures[0]);
              if (updatedGeometry) {
                this.onGeometryChange?.(updatedGeometry);
              }
            }
            this.onModifyEnd?.(modFeatures);
          },
        });

        this.map.addInteraction(modify);
        this.activeInteraction = modify;
        this.hoverCursorCleanup = setupHoverCursor(this.map);
        break;
      }

      case 'snap':
        // Snap dikelola sebagai secondary interaction via setSnapEnabled()
        // Tidak ada interaksi utama yang dibuat di sini
        break;

      case 'delete': {
        // Delete bukan OpenLayers Interaction — ia callback event.
        // Trigger onDeleteRequest dan kembali ke select setelah delay.
        this.onDeleteRequest?.();
        // Kembali ke select setelah frame berikutnya
        setTimeout(() => {
          if (this.activeTool === 'delete') {
            this.activate('select');
          }
        }, 0);
        break;
      }

      default:
        // Tool lainnya (split, merge, extend) diimplementasikan di tahap selanjutnya
        break;
    }
  }

  private removeActiveInteraction(): void {
    if (this.hoverCursorCleanup) {
      this.hoverCursorCleanup();
      this.hoverCursorCleanup = null;
    }

    if (this.activeInteraction && this.map) {
      this.map.removeInteraction(this.activeInteraction);
      this.activeInteraction = null;
    }
  }

  /**
   * Mengupdate context editor (misal saat berganti feature/infrastruktur)
   */
  public updateContext(newContext: EditorContext): void {
    this.context = newContext;
    this.notifyContextChange();

    // Jika tool yang sedang aktif tidak didukung di context baru, nonaktifkan
    if (this.activeTool && !this.canActivate(this.activeTool)) {
      this.deactivate();
    } else if (this.activeTool) {
      // Re-init interaction untuk menyesuaikan context geometryType baru
      this.removeActiveInteraction();
      this.initInteractionForTool(this.activeTool);
    }
  }

  /**
   * Berlangganan perubahan tool
   */
  public onToolChange(listener: ToolChangeListener): () => void {
    this.toolListeners.add(listener);
    return () => {
      this.toolListeners.delete(listener);
    };
  }

  /**
   * Berlangganan perubahan context
   */
  public onContextChange(listener: ContextChangeListener): () => void {
    this.contextListeners.add(listener);
    return () => {
      this.contextListeners.delete(listener);
    };
  }

  private notifyToolChange(): void {
    for (const listener of this.toolListeners) {
      listener(this.activeTool);
    }
  }

  private notifyContextChange(): void {
    for (const listener of this.contextListeners) {
      listener(this.context);
    }
  }

  /**
   * Membersihkan controller, interaction, dan listener
   */
  public destroy(): void {
    this.deactivate();
    this.detachMap();
    this.toolListeners.clear();
    this.contextListeners.clear();
    if (activeEditorController === this) {
      activeEditorController = null;
    }
  }
}
