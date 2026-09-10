/**
 * Editor WebGIS - History Store (Undo / Redo)
 * 
 * Shell awal untuk mendukung undo/redo history state pada tahap selanjutnya.
 */

import { create } from 'zustand';
import type { Geometry } from 'geojson';

export interface HistoryStep {
  id: string;
  timestamp: number;
  geometry: Geometry | null;
  description: string;
}

export interface EditorHistoryState {
  past: HistoryStep[];
  future: HistoryStep[];
  canUndo: boolean;
  canRedo: boolean;
}

export interface EditorHistoryActions {
  pushStep: (step: Omit<HistoryStep, 'id' | 'timestamp'>) => void;
  undo: () => HistoryStep | null;
  redo: () => HistoryStep | null;
  clearHistory: () => void;
}

export type EditorHistoryStore = EditorHistoryState & EditorHistoryActions;

export const useEditorHistoryStore = create<EditorHistoryStore>((set, get) => ({
  past: [],
  future: [],
  canUndo: false,
  canRedo: false,

  pushStep: (step) => {
    const newStep: HistoryStep = {
      ...step,
      id: crypto.randomUUID?.() ?? `${Date.now()}-${Math.random()}`,
      timestamp: Date.now(),
    };

    set((state) => {
      const past = [...state.past, newStep];
      return {
        past,
        future: [],
        canUndo: past.length > 0,
        canRedo: false,
      };
    });
  },

  undo: () => {
    const state = get();
    if (state.past.length === 0) return null;

    const previous = state.past[state.past.length - 1];
    const past = state.past.slice(0, state.past.length - 1);
    const future = [previous, ...state.future];

    set({
      past,
      future,
      canUndo: past.length > 0,
      canRedo: future.length > 0,
    });

    return previous;
  },

  redo: () => {
    const state = get();
    if (state.future.length === 0) return null;

    const next = state.future[0];
    const future = state.future.slice(1);
    const past = [...state.past, next];

    set({
      past,
      future,
      canUndo: past.length > 0,
      canRedo: future.length > 0,
    });

    return next;
  },

  clearHistory: () => {
    set({
      past: [],
      future: [],
      canUndo: false,
      canRedo: false,
    });
  },
}));
