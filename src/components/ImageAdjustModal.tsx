import React, { useState, useRef, useEffect, useCallback } from 'react';
import { ZoomIn, ZoomOut, RotateCw, Check, X, RotateCcw, Move, Scissors } from 'lucide-react';

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
  const [rotation, setRotation] = useState(0); // in degrees: 0, 90, 180, 270
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

    // Background
    ctx.fillStyle = '#0f172a';
    ctx.fillRect(0, 0, width, height);

    ctx.save();
    // Center of canvas
    ctx.translate(width / 2 + offset.x, height / 2 + offset.y);
    ctx.rotate((rotation * Math.PI) / 180);
    ctx.scale(scale, scale);

    // Calculate aspect ratio fit
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

  // Pointer drag handling for pan
  const handlePointerDown = (e: React.PointerEvent) => {
    setIsDragging(true);
    setDragStart({ x: e.clientX - offset.x, y: e.clientY - offset.y });
  };

  const handlePointerMove = (e: React.PointerEvent) => {
    if (!isDragging) return;
    setOffset({
      x: e.clientX - dragStart.x,
      y: e.clientY - dragStart.y
    });
  };

  const handlePointerUp = () => {
    setIsDragging(false);
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

    // Create high-res 600x600 passport-style canvas
    const outputCanvas = document.createElement('canvas');
    const outSize = 600;
    outputCanvas.width = outSize;
    outputCanvas.height = outSize;
    const ctx = outputCanvas.getContext('2d');
    if (!ctx) return;

    // Fill clean white background in case of transparent borders
    ctx.fillStyle = '#ffffff';
    ctx.fillRect(0, 0, outSize, outSize);

    ctx.save();
    // Scale offset to output canvas dimensions (preview is 280x280)
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

    const outputDataUrl = outputCanvas.toDataURL('image/jpeg', 0.88);
    onApply(outputDataUrl);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-slate-950/80 backdrop-blur-md animate-in fade-in duration-200">
      <div className="relative max-w-sm sm:max-w-md w-full bg-slate-900 border border-white/20 rounded-3xl shadow-2xl p-5 sm:p-6 text-white flex flex-col items-center">
        {/* Header */}
        <div className="w-full flex items-center justify-between pb-3 border-b border-white/10 mb-4">
          <div className="flex items-center gap-2">
            <div className="p-1.5 rounded-lg bg-emerald-500/20 text-emerald-400">
              <Scissors className="w-4 h-4" />
            </div>
            <div>
              <h3 className="text-sm sm:text-base font-black">Adjust Student Photo</h3>
              <p className="text-[10px] text-slate-400">Drag to center • Zoom & rotate for passport format</p>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="p-1.5 rounded-full hover:bg-white/10 text-slate-400 hover:text-white transition-colors cursor-pointer"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Viewport Frame with Passport Overlay */}
        <div className="relative mb-4">
          <div 
            className="relative w-[280px] h-[280px] rounded-2xl overflow-hidden border-2 border-emerald-400/80 shadow-inner bg-slate-950 cursor-grab active:cursor-grabbing select-none"
            onPointerDown={handlePointerDown}
            onPointerMove={handlePointerMove}
            onPointerUp={handlePointerUp}
            onPointerLeave={handlePointerUp}
          >
            <canvas
              ref={previewCanvasRef}
              width={280}
              height={280}
              className="w-full h-full block"
            />
            {/* Guide circle & grid */}
            <div className="absolute inset-0 pointer-events-none rounded-2xl border border-dashed border-emerald-400/40 flex items-center justify-center">
              <div className="w-56 h-56 rounded-full border border-emerald-400/30 flex items-center justify-center">
                <div className="w-1.5 h-1.5 bg-emerald-400/40 rounded-full" />
              </div>
            </div>
          </div>
          <p className="text-[10px] text-center text-slate-400 mt-1.5 flex items-center justify-center gap-1">
            <Move className="w-3 h-3 text-emerald-400" />
            <span>Click &amp; drag the image to center face</span>
          </p>
        </div>

        {/* Controls: Zoom & Rotate */}
        <div className="w-full space-y-3 bg-slate-950/60 p-3.5 rounded-2xl border border-white/10 mb-4">
          {/* Zoom Slider */}
          <div className="space-y-1">
            <div className="flex items-center justify-between text-xs text-slate-300">
              <span className="font-bold flex items-center gap-1.5">
                <ZoomIn className="w-3.5 h-3.5 text-emerald-400" />
                <span>Zoom Scale: {scale.toFixed(1)}x</span>
              </span>
              <button
                type="button"
                onClick={handleReset}
                className="text-[10px] text-slate-400 hover:text-emerald-400 flex items-center gap-1 cursor-pointer font-bold"
              >
                <RotateCcw className="w-3 h-3" />
                <span>Reset</span>
              </button>
            </div>
            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={() => setScale(prev => Math.max(0.6, prev - 0.1))}
                className="p-1 rounded-lg bg-white/10 hover:bg-white/20 text-slate-300 cursor-pointer"
                title="Zoom Out"
              >
                <ZoomOut className="w-3.5 h-3.5" />
              </button>
              <input
                type="range"
                min="0.6"
                max="3"
                step="0.05"
                value={scale}
                onChange={(e) => setScale(parseFloat(e.target.value))}
                className="w-full accent-emerald-500 cursor-pointer"
              />
              <button
                type="button"
                onClick={() => setScale(prev => Math.min(3, prev + 0.1))}
                className="p-1 rounded-lg bg-white/10 hover:bg-white/20 text-slate-300 cursor-pointer"
                title="Zoom In"
              >
                <ZoomIn className="w-3.5 h-3.5" />
              </button>
            </div>
          </div>

          {/* Quick Buttons: Rotate */}
          <div className="flex items-center justify-between pt-1 border-t border-white/10">
            <button
              type="button"
              onClick={handleRotate}
              className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-white/10 hover:bg-white/20 text-slate-200 text-xs font-bold transition-colors cursor-pointer"
            >
              <RotateCw className="w-3.5 h-3.5 text-emerald-400" />
              <span>Rotate 90° ({rotation}°)</span>
            </button>
            <span className="text-[10px] text-slate-400 font-mono">Formal Passport 1:1</span>
          </div>
        </div>

        {/* Action Buttons */}
        <div className="w-full flex items-center justify-end gap-2.5">
          <button
            type="button"
            onClick={onClose}
            className="px-4 py-2 rounded-xl bg-white/10 hover:bg-white/20 text-slate-300 text-xs font-bold transition-colors cursor-pointer"
          >
            Cancel
          </button>
          <button
            type="button"
            onClick={handleConfirm}
            className="inline-flex items-center gap-1.5 px-5 py-2 rounded-xl bg-emerald-500 hover:bg-emerald-400 text-slate-950 text-xs font-black transition-all cursor-pointer shadow-lg shadow-emerald-500/20"
          >
            <Check className="w-4 h-4 stroke-[3]" />
            <span>Apply Photo</span>
          </button>
        </div>
      </div>
    </div>
  );
}
