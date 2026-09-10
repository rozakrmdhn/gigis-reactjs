/**
 * Editor WebGIS - ConfirmDialog Component
 * 
 * Modal dialog konfirmasi untuk mencegah kehilangan perubahan draft.
 */

import React from 'react';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '~/components/ui/alert-dialog';

export interface ConfirmDialogProps {
  open: boolean;
  title?: string;
  description?: string;
  confirmLabel?: string;
  cancelLabel?: string;
  onConfirm: () => void;
  onCancel: () => void;
}

export function ConfirmDialog({
  open,
  title = 'Batalkan Perubahan?',
  description = 'Perubahan atribut atau geometri yang belum disimpan akan hilang. Apakah Anda yakin ingin membatalkan?',
  confirmLabel = 'Ya, Batalkan',
  cancelLabel = 'Tetap Edit',
  onConfirm,
  onCancel,
}: ConfirmDialogProps) {
  return (
    <AlertDialog open={open} onOpenChange={(isOpen) => !isOpen && onCancel()}>
      <AlertDialogContent className="max-w-md">
        <AlertDialogHeader>
          <AlertDialogTitle className="text-sm font-bold">{title}</AlertDialogTitle>
          <AlertDialogDescription className="text-xs text-slate-500 dark:text-slate-400">
            {description}
          </AlertDialogDescription>
        </AlertDialogHeader>
        <AlertDialogFooter className="gap-2">
          <AlertDialogCancel onClick={onCancel} className="text-xs">
            {cancelLabel}
          </AlertDialogCancel>
          <AlertDialogAction
            onClick={onConfirm}
            className="text-xs bg-red-600 hover:bg-red-700 text-white"
          >
            {confirmLabel}
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
}

export default ConfirmDialog;
