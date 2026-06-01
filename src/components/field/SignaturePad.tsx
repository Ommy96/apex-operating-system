import { useEffect, useRef, useState } from 'react';
import { Button } from '@/components/ui/button';
import { Eraser } from 'lucide-react';

interface Props {
  value?: string | null;
  onChange: (dataUrl: string | null) => void;
  height?: number;
}

/** Touch-friendly signature pad. Outputs a PNG data URL on every stroke end. */
export function SignaturePad({ value, onChange, height = 160 }: Props) {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const drawingRef = useRef(false);
  const [empty, setEmpty] = useState(!value);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ratio = window.devicePixelRatio || 1;
    const rect = canvas.getBoundingClientRect();
    canvas.width = rect.width * ratio;
    canvas.height = height * ratio;
    const ctx = canvas.getContext('2d')!;
    ctx.scale(ratio, ratio);
    ctx.lineWidth = 2;
    ctx.lineCap = 'round';
    ctx.strokeStyle = '#0A0F1E';
    if (value) {
      const img = new Image();
      img.onload = () => ctx.drawImage(img, 0, 0, rect.width, height);
      img.src = value;
    }
  }, [height, value]);

  const pos = (e: any) => {
    const rect = canvasRef.current!.getBoundingClientRect();
    const t = e.touches?.[0];
    return { x: (t ? t.clientX : e.clientX) - rect.left, y: (t ? t.clientY : e.clientY) - rect.top };
  };

  const start = (e: any) => {
    e.preventDefault();
    drawingRef.current = true;
    const ctx = canvasRef.current!.getContext('2d')!;
    const p = pos(e);
    ctx.beginPath();
    ctx.moveTo(p.x, p.y);
  };
  const move = (e: any) => {
    if (!drawingRef.current) return;
    e.preventDefault();
    const ctx = canvasRef.current!.getContext('2d')!;
    const p = pos(e);
    ctx.lineTo(p.x, p.y);
    ctx.stroke();
    setEmpty(false);
  };
  const end = () => {
    if (!drawingRef.current) return;
    drawingRef.current = false;
    onChange(canvasRef.current!.toDataURL('image/png'));
  };

  const clear = () => {
    const c = canvasRef.current!;
    c.getContext('2d')!.clearRect(0, 0, c.width, c.height);
    setEmpty(true);
    onChange(null);
  };

  return (
    <div className="space-y-2">
      <canvas
        ref={canvasRef}
        style={{ height, touchAction: 'none' }}
        className="w-full rounded-lg border bg-background"
        onMouseDown={start}
        onMouseMove={move}
        onMouseUp={end}
        onMouseLeave={end}
        onTouchStart={start}
        onTouchMove={move}
        onTouchEnd={end}
      />
      <div className="flex items-center justify-between">
        <span className="text-xs text-muted-foreground">{empty ? 'Sign above' : 'Signature captured'}</span>
        <Button type="button" variant="ghost" size="sm" onClick={clear} className="gap-1">
          <Eraser className="h-3.5 w-3.5" /> Clear
        </Button>
      </div>
    </div>
  );
}