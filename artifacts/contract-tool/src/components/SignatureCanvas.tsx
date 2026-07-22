import React, { useRef, useEffect, useState, useCallback } from 'react';
import SignaturePad from 'signature_pad';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { CheckCircle2, RotateCcw, PenLine, Trash2 } from 'lucide-react';
import { format } from 'date-fns';

interface SignatureCanvasProps {
  label: string;
  role: string;
  onSign: (dataUrl: string, name?: string, signedAt?: string) => void;
  existingSignature?: string | null;
  existingDate?: string | null;
  requireName?: boolean;
  signerName?: string | null;
}

const todayStr = () => {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
};

export function SignatureCanvas({
  label,
  onSign,
  existingSignature,
  existingDate,
  requireName = false,
  signerName = '',
}: SignatureCanvasProps) {
  const [isSigned, setIsSigned] = useState(!!existingSignature);
  const [open, setOpen] = useState(false);

  useEffect(() => {
    setIsSigned(!!existingSignature);
  }, [existingSignature]);

  const handleResign = () => {
    setIsSigned(false);
    setOpen(true);
  };

  const formattedDate = existingDate
    ? format(new Date(existingDate), 'dd MMM yyyy')
    : '';

  return (
    <>
      {/* ── Card ── */}
      {isSigned && existingSignature ? (
        <div className="border border-slate-200 rounded-xl p-4 bg-white shadow-sm flex flex-col items-center group relative transition-all hover:border-slate-300">
          <h4 className="font-semibold text-slate-700 text-sm mb-3 self-start">{label}</h4>
          <div className="w-full flex justify-center mb-3 border-b border-slate-100 pb-2">
            <img
              src={existingSignature}
              alt={`${label} signature`}
              className="w-full object-contain max-h-24 mix-blend-multiply"
            />
          </div>
          <div className="w-full flex flex-col items-center text-xs text-slate-500 space-y-1">
            {requireName && signerName && (
              <p className="font-medium text-slate-800">{signerName}</p>
            )}
            <div className="flex items-center text-primary font-medium">
              <CheckCircle2 className="w-3 h-3 mr-1" />
              <span>Signed: {formattedDate}</span>
            </div>
          </div>
          <Button
            variant="ghost"
            size="sm"
            onClick={handleResign}
            className="absolute top-2 right-2 h-7 px-2 text-red-500 hover:text-red-600 hover:bg-red-50 opacity-0 group-hover:opacity-100 transition-opacity"
          >
            <RotateCcw className="w-3 h-3 mr-1" />
            Re-sign
          </Button>
        </div>
      ) : (
        <button
          type="button"
          onClick={() => setOpen(true)}
          className="w-full border-2 border-dashed border-primary/30 hover:border-primary/70 hover:bg-primary/5 rounded-xl p-5 flex flex-col items-center justify-center gap-2 transition-all group cursor-pointer"
        >
          <div className="w-10 h-10 rounded-full bg-primary/10 flex items-center justify-center group-hover:bg-primary/20 transition-colors">
            <PenLine className="w-5 h-5 text-primary" />
          </div>
          <span className="font-semibold text-slate-700 text-sm">{label}</span>
          <span className="text-xs text-slate-400">Tap to sign</span>
        </button>
      )}

      {/* ── Fullscreen signing dialog ── */}
      <FullscreenSignDialog
        open={open}
        onClose={() => setOpen(false)}
        label={label}
        requireName={requireName}
        initialName={signerName || ''}
        onConfirm={(dataUrl, name, signedAt) => {
          onSign(dataUrl, name, signedAt);
          setIsSigned(true);
          setOpen(false);
        }}
      />
    </>
  );
}

// ─── Fullscreen dialog ───────────────────────────────────────────────────────

interface FullscreenSignDialogProps {
  open: boolean;
  onClose: () => void;
  label: string;
  requireName: boolean;
  initialName: string;
  onConfirm: (dataUrl: string, name?: string, signedAt?: string) => void;
}

function FullscreenSignDialog({
  open,
  onClose,
  label,
  requireName,
  initialName,
  onConfirm,
}: FullscreenSignDialogProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const padRef = useRef<SignaturePad | null>(null);
  const [nameInput, setNameInput] = useState(initialName);
  const [dateInput, setDateInput] = useState(todayStr);
  const [isEmpty, setIsEmpty] = useState(true);

  // Reset form each time the dialog opens
  useEffect(() => {
    if (open) {
      setNameInput(initialName);
      setDateInput(todayStr());
      setIsEmpty(true);
    }
  }, [open, initialName]);

  // Initialise signature pad after dialog renders the canvas
  const initPad = useCallback((canvas: HTMLCanvasElement) => {
    const ratio = Math.max(window.devicePixelRatio || 1, 1);
    canvas.width = canvas.offsetWidth * ratio;
    canvas.height = canvas.offsetHeight * ratio;
    canvas.getContext('2d')?.scale(ratio, ratio);

    const sp = new SignaturePad(canvas, {
      penColor: '#0d2350',
      backgroundColor: 'rgba(255,255,255,0)',
      minWidth: 1.5,
      maxWidth: 3,
    });
    sp.addEventListener('endStroke', () => setIsEmpty(sp.isEmpty()));
    padRef.current = sp;
  }, []);

  useEffect(() => {
    if (!open) {
      padRef.current?.off();
      padRef.current = null;
      return;
    }
    // Small timeout so the dialog has finished mounting / animating
    const t = setTimeout(() => {
      if (canvasRef.current) initPad(canvasRef.current);
    }, 80);
    return () => clearTimeout(t);
  }, [open, initPad]);

  // Re-scale on window resize
  useEffect(() => {
    if (!open) return;
    const onResize = () => {
      const canvas = canvasRef.current;
      const pad = padRef.current;
      if (!canvas || !pad) return;
      const data = pad.toData();
      const ratio = Math.max(window.devicePixelRatio || 1, 1);
      canvas.width = canvas.offsetWidth * ratio;
      canvas.height = canvas.offsetHeight * ratio;
      canvas.getContext('2d')?.scale(ratio, ratio);
      pad.clear();
      if (data.length) pad.fromData(data);
    };
    window.addEventListener('resize', onResize);
    return () => window.removeEventListener('resize', onResize);
  }, [open]);

  const handleClear = () => {
    padRef.current?.clear();
    setIsEmpty(true);
  };

  const handleConfirm = () => {
    const pad = padRef.current;
    if (!pad || pad.isEmpty()) return;
    if (requireName && !nameInput.trim()) return;
    const dataUrl = pad.toDataURL('image/png');
    const signedAt = dateInput
      ? new Date(`${dateInput}T12:00:00`).toISOString()
      : new Date().toISOString();
    onConfirm(dataUrl, requireName ? nameInput.trim() : undefined, signedAt);
  };

  const canConfirm = !isEmpty && (!requireName || nameInput.trim());

  return (
    <Dialog open={open} onOpenChange={(v) => { if (!v) onClose(); }}>
      <DialogContent
        className="max-w-none w-screen h-screen sm:h-screen sm:rounded-none p-0 flex flex-col gap-0 border-0"
        style={{ margin: 0 }}
      >
        {/* Header */}
        <DialogHeader className="shrink-0 px-6 pt-5 pb-4 border-b border-slate-100 bg-white">
          <div className="flex items-center justify-between">
            <DialogTitle className="text-lg font-semibold text-slate-800">
              {label}
            </DialogTitle>
          </div>
        </DialogHeader>

        {/* Fields */}
        <div className="shrink-0 px-6 py-4 bg-slate-50 border-b border-slate-100 flex flex-wrap gap-4">
          {requireName && (
            <div className="flex-1 min-w-[180px] space-y-1">
              <Label className="text-xs font-medium text-slate-500 uppercase tracking-wide">
                Printed Name
              </Label>
              <Input
                value={nameInput}
                onChange={(e) => setNameInput(e.target.value)}
                placeholder="Full name…"
                className="h-9 bg-white focus-visible:ring-primary"
                autoFocus
              />
            </div>
          )}
          <div className="flex-1 min-w-[160px] space-y-1">
            <Label className="text-xs font-medium text-slate-500 uppercase tracking-wide">
              Signature Date
            </Label>
            <Input
              type="date"
              value={dateInput}
              onChange={(e) => setDateInput(e.target.value)}
              className="h-9 bg-white focus-visible:ring-primary"
            />
          </div>
        </div>

        {/* Canvas area */}
        <div className="flex-1 relative bg-white overflow-hidden">
          {/* Watermark */}
          <div className="absolute inset-0 flex items-center justify-center pointer-events-none select-none">
            <span className="text-[80px] font-serif text-slate-100 rotate-[-12deg] whitespace-nowrap">
              Sign here
            </span>
          </div>

          {/* Baseline */}
          <div className="absolute bottom-[30%] left-12 right-12 border-b-2 border-dashed border-slate-200 pointer-events-none" />

          <canvas
            ref={canvasRef}
            className="w-full h-full cursor-crosshair relative z-10"
            style={{ touchAction: 'none' }}
          />
        </div>

        {/* Footer actions */}
        <div className="shrink-0 px-6 py-4 border-t border-slate-100 bg-white flex items-center justify-between gap-3">
          <Button
            variant="outline"
            onClick={handleClear}
            className="gap-2 text-slate-500 hover:text-red-500 hover:border-red-200 hover:bg-red-50"
          >
            <Trash2 className="w-4 h-4" />
            Clear
          </Button>
          <div className="flex gap-2">
            <Button variant="outline" onClick={onClose}>
              Cancel
            </Button>
            <Button
              onClick={handleConfirm}
              disabled={!canConfirm}
              className="bg-primary text-white hover:bg-primary/90 px-8 gap-2"
            >
              <CheckCircle2 className="w-4 h-4" />
              Confirm Signature
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
