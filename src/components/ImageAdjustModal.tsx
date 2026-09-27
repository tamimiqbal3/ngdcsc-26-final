import React, { useState, useRef, useEffect, useCallback } from 'react';
import { 
  ZoomIn, 
  ZoomOut, 
  RotateCw, 
  Check, 
  X, 
  Move, 
  Scissors, 
  RotateCcw
} from 'lucide-react';

interface ImageAdjustModalProps {
  imageSrc: string;
  onApply: (adjustedDataUrl: string) => void;
  onClose: () => void;
}

export default function ImageAdjustModal({
  imageSrc,
  onApply,
  onClose
}: ImageAdjustModalProps) {
  const [scale, setScale] = useState(1);
  const [rotation, setRotation] = useState(0);
  const [offset, setOffset] = useState({ x: 0, y: 0 });
  const [isDragging, setIsDragging] = useState(false);
  const [dragStart, setDragStart] = useState({ x: 0, y: 0 });
  const previewCanvasRef = useRef<HTMLCanvasElement | null>(null);
  const imgRef = useRef<HTMLImageElement | null>(null);
  const [imgLoaded, setImgLoaded] = useState(false);

  // Load the image
  useEffect(() => {
    const img = new Image();
    img.crossOrigin = 'anonymous';
    img.onload = () => {
      imgRef.current = img;
      setImgLoaded(true);
    };
    img.src = imageSrc;
  }, [imageSrc]);

  // Draw the preview onto preview canvas
  const drawPreview = useCallback(() => {
    const canvas = previewCanvasRef.current;
    const img = imgRef.current;
    if (!canvas || !img || !imgLoaded) return;

    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const width = canvas.width;
    const height = canvas.height;

    ctx.clearRect(0, 0, width, height);

    // Dark sleek background
    ctx.fillStyle = '#090d16';
    ctx.fillRect(0, 0, width, height);

    ctx.save();
    ctx.translate(width / 2 + offset.x, height / 2 + offset.y);
    ctx.rotate((rotation * Math.PI) / 180);
    ctx.scale(scale, scale);

    const imgAspect = img.width / img.height;
    const canvasAspect = width / height;
    let drawWidth = width;
    let drawHeight = height;

    if (imgAspect > canvasAspect) {
      drawWidth = height * imgAspect;
      drawHeight = height;
    } else {
      drawWidth = width;
      drawHeight = width / imgAspect;
    }

    ctx.drawImage(img, -drawWidth / 2, -drawHeight / 2, drawWidth, drawHeight);
    ctx.restore();
  }, [offset, rotation, scale, imgLoaded]);

  useEffect(() => {
    drawPreview();
  }, [drawPreview]);

  // Smooth pointer drag handling
  const handlePointerDown = (e: React.PointerEvent<HTMLDivElement>) => {
    e.preventDefault();
    try {
      (e.currentTarget as HTMLElement).setPointerCapture(e.pointerId);
    } catch {}
    setIsDragging(true);
    setDragStart({ x: e.clientX - offset.x, y: e.clientY - offset.y });
  };

  const handlePointerMove = (e: React.PointerEvent<HTMLDivElement>) => {
    if (!isDragging) return;
    e.preventDefault();
    setOffset({
      x: Math.round(e.clientX - dragStart.x),
      y: Math.round(e.clientY - dragStart.y)
    });
  };

  const handlePointerUp = (e: React.PointerEvent<HTMLDivElement>) => {
    try {
      (e.currentTarget as HTMLElement).releasePointerCapture(e.pointerId);
    } catch {}
    setIsDragging(false);
  };

  // Mouse wheel zoom
  const handleWheel = (e: React.WheelEvent<HTMLDivElement>) => {
    e.preventDefault();
    const delta = e.deltaY > 0 ? -0.1 : 0.1;
    setScale(prev => Math.min(4, Math.max(0.4, parseFloat((prev + delta).toFixed(2)))));
  };

  const handleRotate = () => {
    setRotation(prev => (prev + 90) % 360);
  };

  const handleReset = () => {
    setScale(1);
    setRotation(0);
    setOffset({ x: 0, y: 0 });
  };

  const handleConfirm = () => {
    const img = imgRef.current;
    if (!img) return;

    // High quality 600x600 output canvas
    const outputCanvas = document.createElement('canvas');
    const outSize = 600;
    outputCanvas.width = outSize;
    outputCanvas.height = outSize;
    const ctx = outputCanvas.getContext('2d');
    if (!ctx) return;

    ctx.fillStyle = '#ffffff';
    ctx.fillRect(0, 0, outSize, outSize);

    ctx.save();
    const previewSize = previewCanvasRef.current?.width || 280;
    const ratio = outSize / previewSize;

    ctx.translate(outSize / 2 + offset.x * ratio, outSize / 2 + offset.y * ratio);
    ctx.rotate((rotation * Math.PI) / 180);
    ctx.scale(scale, scale);

    const imgAspect = img.width / img.height;
    let drawWidth = outSize;
    let drawHeight = outSize;

    if (imgAspect > 1) {
      drawWidth = outSize * imgAspect;
      drawHeight = outSize;
    } else {
      drawWidth = outSize;
      drawHeight = outSize / imgAspect;
    }

    ctx.drawImage(img, -drawWidth / 2, -drawHeight / 2, drawWidth, drawHeight);
    ctx.restore();

    const outputDataUrl = outputCanvas.toDataURL('image/jpeg', 0.90);
    onApply(outputDataUrl);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-slate-950/85 backdrop-blur-md animate-in fade-in duration-150">
      <div className="relative max-w-sm w-full bg-slate-900 border border-white/15 rounded-3xl shadow-2xl p-5 text-white flex flex-col items-center">
        {/* Header */}
        <div className="w-full flex items-center justify-between pb-3 border-b border-white/10 mb-4">
          <div className="flex items-center gap-2">
            <div className="p-1.5 rounded-lg bg-emerald-500/20 text-emerald-400">
              <Scissors className="w-4 h-4" />
            </div>
            <h3 className="text-sm font-bold">ছবি এডজাস্ট করুন (Adjust Photo)</h3>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="p-1.5 rounded-full hover:bg-white/10 text-slate-400 hover:text-white transition-colors cursor-pointer"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Viewport Frame */}
        <div className="relative mb-4 flex flex-col items-center select-none">
          <div 
            className="relative w-[260px] h-[260px] rounded-2xl overflow-hidden border-2 border-emerald-400/80 shadow-xl bg-slate-950 cursor-grab active:cursor-grabbing"
            style={{ touchAction: 'none' }}
            onPointerDown={handlePointerDown}
            onPointerMove={handlePointerMove}
            onPointerUp={handlePointerUp}
            onPointerCancel={handlePointerUp}
            onWheel={handleWheel}
          >
            <canvas
              ref={previewCanvasRef}
              width={260}
              height={260}
              className="w-full h-full block"
            />

            {/* Passport Oval Guide */}
            <div className="absolute inset-0 pointer-events-none flex items-center justify-center">
              <div className="w-48 h-56 rounded-[50%] border-2 border-emerald-400/40" />
            </div>

            {/* Subtle drag hint */}
            <div className="absolute bottom-2 right-2 pointer-events-none px-2 py-0.5 rounded-md bg-slate-950/80 border border-white/10 text-[9px] text-slate-300 flex items-center gap-1">
              <Move className="w-2.5 h-2.5 text-emerald-400" />
              <span>টেনে সরান (Drag)</span>
            </div>
          </div>
        </div>

        {/* Zoom & Quick Controls */}
        <div className="w-full space-y-3 bg-slate-950/60 p-3 rounded-2xl border border-white/10 mb-4">
          {/* Zoom Slider */}
          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={() => setScale(prev => Math.max(0.4, parseFloat((prev - 0.1).toFixed(2))))}
              className="p-1.5 rounded-lg bg-white/10 hover:bg-white/20 text-slate-300 cursor-pointer active:scale-95 transition-all"
              title="Zoom Out"
            >
              <ZoomOut className="w-4 h-4" />
            </button>
            <input
              type="range"
              min="0.4"
              max="3.5"
              step="0.05"
              value={scale}
              onChange={(e) => setScale(parseFloat(e.target.value))}
              className="w-full accent-emerald-500 cursor-pointer"
            />
            <button
              type="button"
              onClick={() => setScale(prev => Math.min(3.5, parseFloat((prev + 0.1).toFixed(2))))}
              className="p-1.5 rounded-lg bg-white/10 hover:bg-white/20 text-slate-300 cursor-pointer active:scale-95 transition-all"
              title="Zoom In"
            >
              <ZoomIn className="w-4 h-4" />
            </button>
          </div>

          {/* Rotate & Reset Buttons */}
          <div className="flex items-center justify-between pt-1 border-t border-white/10">
            <button
              type="button"
              onClick={handleRotate}
              className="inline-flex items-center gap-1 px-3 py-1.5 rounded-xl bg-white/10 hover:bg-white/20 text-slate-200 text-xs font-bold transition-colors cursor-pointer"
            >
              <RotateCw className="w-3.5 h-3.5 text-emerald-400" />
              <span>ঘোরান (90°)</span>
            </button>

            <button
              type="button"
              onClick={handleReset}
              className="inline-flex items-center gap-1 px-3 py-1.5 rounded-xl bg-white/10 hover:bg-white/20 text-slate-300 hover:text-white text-xs font-semibold transition-colors cursor-pointer"
            >
              <RotateCcw className="w-3 h-3 text-slate-400" />
              <span>রিসেট (Reset)</span>
            </button>
          </div>
        </div>

        {/* Action Buttons */}
        <div className="w-full flex items-center justify-end gap-2.5">
          <button
            type="button"
            onClick={onClose}
            className="px-4 py-2 rounded-xl bg-white/10 hover:bg-white/20 text-slate-300 text-xs font-bold transition-colors cursor-pointer"
          >
            বাতিল (Cancel)
          </button>
          <button
            type="button"
            onClick={handleConfirm}
            className="inline-flex items-center gap-1.5 px-5 py-2.5 rounded-xl bg-emerald-500 hover:bg-emerald-400 text-slate-950 text-xs font-black transition-all cursor-pointer shadow-lg shadow-emerald-500/25 active:scale-95"
          >
            <Check className="w-4 h-4 stroke-[3]" />
            <span>ছবি সেভ করুন (Save)</span>
          </button>
        </div>
      </div>
    </div>
  );
}
