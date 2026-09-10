/**
 * Editor WebGIS - MapEditor Component
 * 
 * Komponen utama MapEditor. Bertindak sebagai orchestration layer untuk
 * menginisialisasi EditorContext, EditorController, OpenLayers Map & Layers,
 * serta menampilkan toolbar, panel detail, form editing atribut, dan alur simpan/batal.
 */

import React, { useEffect, useMemo, useRef, useState, useCallback } from 'react';
import type { EditorCapabilities, GeometryType, FormSchema } from '../../features/editor/core/editor.types';
import { buildEditorContext } from '../../features/editor/core/EditorContext';
import { useEditor } from '../../features/editor/hooks/useEditor';
import { useEditorContext } from '../../features/editor/hooks/useEditorContext';
import { useMapInstance } from '../../features/editor/hooks/useMapInstance';
import { useFeatureDetail } from '../../features/editor/hooks/useFeatureDetail';
import { useEditorSelection } from '../../features/editor/hooks/useEditorSelection';
import { useSaveFeature } from '../../features/editor/hooks/useSaveFeature';
import { useCreateFeature } from '../../features/editor/hooks/useCreateFeature';
import { useCancelEditing } from '../../features/editor/hooks/useCancelEditing';
import { useDeleteFeature } from '../../features/editor/hooks/useDeleteFeature';
import { useEditorStore } from '../../stores/editorStore';
import { toast } from 'sonner';
import { EditorToolbar } from './EditorToolbar';
import { SaveBar } from './SaveBar';
import { FeatureInfo } from './FeatureInfo';
import type { Geometry as GeoJsonGeometry } from 'geojson';
import { FeatureForm } from './FeatureForm';
import { ConfirmDialog } from './ConfirmDialog';
import { EditorLoadingState, EditorErrorState } from './EditorLoadingState';

export interface MapEditorProps {
  infrastructureTypeId: string;
  geometryType?: GeometryType;
  capabilities?: Partial<EditorCapabilities>;
  formSchema?: FormSchema;
  dynamic?: boolean;
  center?: [number, number];
  zoom?: number;
  className?: string;
  focusGeometry?: GeoJsonGeometry | null;
  focusFeatureId?: string | null;
  onFeatureSaved?: () => void;
  children?: React.ReactNode;
}

export function MapEditor({
  infrastructureTypeId,
  geometryType,
  capabilities,
  formSchema: propsFormSchema,
  dynamic = false,
  center,
  zoom,
  className = '',
  focusGeometry,
  focusFeatureId,
  onFeatureSaved,
  children,
}: MapEditorProps) {
  const isDynamic = dynamic || !geometryType;
  const { initEditor, resetEditor, selectedFeatureId, setSelectedFeatureId, activeTool } = useEditor();
  const { formData, updateFormField, setEditingFeatureId } = useEditorSelection();
  const validationErrors = useEditorStore((s) => s.validationErrors);
  const isSnapEnabled = useEditorStore((s) => s.isSnapEnabled);
  const setSnapEnabled = useEditorStore((s) => s.setSnapEnabled);

  const [isEditingForm, setIsEditingForm] = useState<boolean>(false);
  const [isCreatingNew, setIsCreatingNew] = useState<boolean>(false);

  const controllerRef = useRef<ReturnType<typeof initEditor> | null>(null);

  // Inisialisasi OpenLayers Map
  const { isReady: isMapReady, getMap, getEditableLayer } = useMapInstance({
    targetId: 'map-viewport',
    center,
    zoom,
  });

  // Mode Dinamis dari API
  const {
    context: dynamicContext,
    config: dynamicConfig,
    isLoading: isDynamicLoading,
    error: dynamicError,
    refetch: refetchContext,
  } = useEditorContext({
    infrastructureTypeId,
    enabled: isDynamic,
  });

  // Mode Statis (Props)
  const staticContext = useMemo(() => {
    if (isDynamic || !geometryType) return null;
    return buildEditorContext(infrastructureTypeId, geometryType, capabilities);
  }, [isDynamic, infrastructureTypeId, geometryType, capabilities]);

  const activeContext = isDynamic ? dynamicContext : staticContext;
  const activeFormSchema = propsFormSchema || dynamicConfig?.formSchema;

  // Inisialisasi Hook Cancel/Reset (Tahap 9)
  const {
    showConfirmDialog,
    pendingAction,
    requestCancel,
    requestDeselect,
    requestSwitchFeature,
    requestSwitchTool,
    confirmCancel,
    dismissConfirm,
    forceReset,
  } = useCancelEditing({
    onClearMap: () => {
      controllerRef.current?.clearLayer();
      controllerRef.current?.deactivate();
    },
    onAfterReset: () => {
      setIsEditingForm(false);
      setIsCreatingNew(false);
      controllerRef.current?.clearSelection();
    },
  });

  // Fetch data detail feature saat selectedFeatureId terisi (Tahap 5)
  const {
    feature: selectedFeature,
    isLoading: isFeatureLoading,
    error: featureError,
    refetch: refetchFeature,
  } = useFeatureDetail({
    featureId: selectedFeatureId,
    expectedGeometryType: activeContext?.geometryType,
    infrastructureTypeId: activeContext?.infrastructureTypeId,
  });

  // Inisialisasi Hook Delete (Tahap 12)
  const {
    requestDelete,
    confirmDelete,
    cancelDelete,
    isDeleting,
    showConfirm: showDeleteConfirm,
  } = useDeleteFeature({
    featureId: selectedFeatureId,
    infrastructureTypeId: activeContext?.infrastructureTypeId,
    onDeleteSuccess: () => {
      controllerRef.current?.clearLayer();
      controllerRef.current?.deactivate();
      forceReset();
    },
  });

  // Inisialisasi Hook Save/PATCH (Tahap 8)
  const { save: saveExistingFeature } = useSaveFeature({
    featureId: selectedFeatureId,
    infrastructureTypeId: activeContext?.infrastructureTypeId,
    expectedGeometryType: activeContext?.geometryType,
    formSchema: activeFormSchema,
    onSaveSuccess: async () => {
      setIsEditingForm(false);
      setIsCreatingNew(false);
      await refetchFeature();
      onFeatureSaved?.();
      toast.success('Perubahan geometri & atribut berhasil disimpan.');
    },
  });

  // Inisialisasi Hook Create/POST (Tahap 10)
  const { create: createNewFeature } = useCreateFeature({
    infrastructureTypeId: activeContext?.infrastructureTypeId || null,
    formSchema: activeFormSchema,
    onCreateSuccess: () => {
      setIsEditingForm(false);
      setIsCreatingNew(false);
      onFeatureSaved?.();
      toast.success('Feature/Segmen baru berhasil dibuat.');
    },
  });

  // Refs untuk callback controller agar tidak memicu re-render effect
  const requestSwitchFeatureRef = useRef(requestSwitchFeature);
  requestSwitchFeatureRef.current = requestSwitchFeature;

  const forceResetRef = useRef(forceReset);
  forceResetRef.current = forceReset;

  const requestDeleteRef = useRef(requestDelete);
  requestDeleteRef.current = requestDelete;

  // Inisialisasi Editor Controller & Context
  useEffect(() => {
    if (activeContext) {
      const controller = initEditor(activeContext);
      controllerRef.current = controller;

      // Event saat selesai mendigitasi feature baru
      controller.onDrawFeatureEnd = () => {
        setIsCreatingNew(true);
        setIsEditingForm(true);
      };

      // Saat feature dipilih di map
      controller.onFeatureSelect = (featureId) => {
        requestSwitchFeatureRef.current(featureId);
      };

      // Saat draw dibatalkan (Escape)
      controller.onDrawAbort = () => {
        forceResetRef.current();
      };

      // Saat delete di-trigger dari controller
      controller.onDeleteRequest = () => {
        requestDeleteRef.current();
      };
    }
  }, [activeContext, initEditor]);

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      forceResetRef.current();
      resetEditor();
      controllerRef.current = null;
    };
  }, [resetEditor]);

  // Hubungkan Map dan VectorSource ke Controller saat keduanya siap
  useEffect(() => {
    if (isMapReady && controllerRef.current && activeContext) {
      const map = getMap();
      const editable = getEditableLayer();

      if (map && editable?.source) {
        controllerRef.current.attachMap(map, editable.source);
      }
    }

    return () => {
      controllerRef.current?.detachMap();
    };
  }, [isMapReady, activeContext, getMap, getEditableLayer]);

  // Sinkronisasi isSnapEnabled dari store ke controller
  useEffect(() => {
    if (controllerRef.current) {
      controllerRef.current.setSnapEnabled(isSnapEnabled);
    }
  }, [isSnapEnabled]);

  // Zoom dan muat geometri saat focusGeometry berubah dari luar (misal klik tabel segmen)
  useEffect(() => {
    if (focusGeometry && controllerRef.current && isMapReady) {
      controllerRef.current.zoomToGeometry(focusGeometry, {
        featureId: focusFeatureId || undefined,
        padding: [80, 80, 80, 80],
        maxZoom: 17,
        duration: 800,
      });
      if (focusFeatureId) {
        setSelectedFeatureId(focusFeatureId);
        useEditorStore.getState().setOriginalGeometry(focusGeometry);
        useEditorStore.getState().setGeometry(focusGeometry);
        useEditorStore.getState().setIsDirty(false);
        if (controllerRef.current) {
          controllerRef.current.editingFeatureId = focusFeatureId;
        }
      }
    }
  }, [focusGeometry, focusFeatureId, isMapReady, setSelectedFeatureId]);

  const handleStartEdit = useCallback(() => {
    if (selectedFeatureId) {
      setEditingFeatureId(selectedFeatureId);
      setIsCreatingNew(false);
      setIsEditingForm(true);
    }
  }, [selectedFeatureId, setEditingFeatureId]);

  const handleSave = useCallback(async () => {
    if (isCreatingNew) {
      await createNewFeature();
    } else {
      await saveExistingFeature();
    }
  }, [isCreatingNew, createNewFeature, saveExistingFeature]);

  // Dialog description dinamis sesuai pendingAction
  const confirmDialogDescription = useMemo(() => {
    if (pendingAction?.type === 'switch-tool') {
      return 'Perubahan atribut atau geometri yang belum disimpan akan dibatalkan saat berganti tool. Apakah Anda ingin melanjutkan?';
    }
    if (pendingAction?.type === 'switch-feature') {
      return 'Perubahan yang belum disimpan akan hilang jika Anda berpindah ke feature lain. Batalkan perubahan?';
    }
    return 'Perubahan atribut atau geometri yang belum disimpan akan hilang. Apakah Anda yakin ingin membatalkan?';
  }, [pendingAction]);

  return (
    <div
      id="map-editor-container"
      className={`relative w-full h-full min-h-[500px] flex flex-col bg-slate-900 overflow-hidden ${className}`}
    >
      {/* Loading State Overlay (Context) */}
      {isDynamic && isDynamicLoading && (
        <div className="absolute inset-0 z-50 flex items-center justify-center bg-slate-950/70 backdrop-blur-sm">
          <EditorLoadingState />
        </div>
      )}

      {/* Error State Overlay (Context) */}
      {isDynamic && dynamicError && (
        <div className="absolute inset-0 z-50 flex items-center justify-center bg-slate-950/80 backdrop-blur-sm p-4">
          <EditorErrorState error={dynamicError} onRetry={refetchContext} />
        </div>
      )}

      {/* Toolbar (hanya tampil jika context aktif sudah tersedia) */}
      {activeContext && (
        <div className="absolute top-4 left-4 z-10">
          <EditorToolbar onToolSelect={requestSwitchTool} />
        </div>
      )}

      {/* Feature Form Panel (hanya tampil saat user aktif mengedit form atribut atau create new) */}
      {isEditingForm && (
        <div className="absolute top-4 right-4 z-20">
          <FeatureForm
            schema={activeFormSchema}
            formData={formData}
            validationErrors={validationErrors}
            onChange={updateFormField}
            onCancel={requestCancel}
            onSave={handleSave}
          />
        </div>
      )}

      {/* Map viewport container */}
      <div
        id="map-viewport"
        className={`w-full h-full flex-1 relative ${
          activeTool === 'draw' ? 'cursor-crosshair' : ''
        }`}
      >
        {/* Helper Hint saat mode Draw atau Modify aktif */}
        {activeTool === 'draw' && (
          <div className="absolute top-16 left-4 z-10 bg-slate-900/90 text-white text-[11px] font-medium px-3 py-1.5 rounded-lg shadow-lg border border-emerald-500/40 flex items-center gap-2 pointer-events-none backdrop-blur-sm animate-in fade-in slide-in-from-top-1">
            <span className="w-2 h-2 rounded-full bg-emerald-500 animate-ping" />
            <span>
              {activeContext?.geometryType === 'Point'
                ? 'Klik 1x pada peta untuk menempatkan titik.'
                : activeContext?.geometryType === 'Polygon'
                ? 'Klik untuk setiap sudut poligon. Klik 2x (double-click) untuk selesai.'
                : 'Klik untuk membuat garis jalan. Klik 2x (double-click) untuk selesai.'}
            </span>
          </div>
        )}

        {activeTool === 'modify' && (
          <div className="absolute top-16 left-4 z-10 bg-slate-900/90 text-white text-[11px] font-medium px-3 py-1.5 rounded-lg shadow-lg border border-blue-500/40 flex items-center gap-2 pointer-events-none backdrop-blur-sm animate-in fade-in slide-in-from-top-1">
            <span className="w-2 h-2 rounded-full bg-blue-500 animate-ping" />
            <span>Geser titik simpul (lingkaran putih) untuk mengubah bentuk geometri. Tahan Alt + Klik titik untuk menghapus simpul.</span>
          </div>
        )}

        {children}
      </div>

      {/* SaveBar */}
      {activeContext && (
        <div className="absolute bottom-4 left-1/2 -translate-x-1/2 z-10">
          <SaveBar onSave={handleSave} onCancel={requestCancel} />
        </div>
      )}

      {/* Confirm Discard Changes Dialog (Tahap 9) */}
      <ConfirmDialog
        open={showConfirmDialog}
        description={confirmDialogDescription}
        onConfirm={confirmCancel}
        onCancel={dismissConfirm}
      />

      {/* Confirm Delete Dialog (Tahap 12) */}
      <ConfirmDialog
        open={showDeleteConfirm}
        title="Hapus Feature?"
        description="Feature yang dihapus tidak dapat dikembalikan. Apakah Anda yakin ingin menghapus feature ini?"
        confirmLabel={isDeleting ? 'Menghapus...' : 'Ya, Hapus'}
        cancelLabel="Batal"
        onConfirm={confirmDelete}
        onCancel={cancelDelete}
      />
    </div>
  );
}

export default MapEditor;
