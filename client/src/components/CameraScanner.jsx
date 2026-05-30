import { useEffect, useRef, useState } from 'react';
import { X, Camera, AlertCircle } from 'lucide-react';

/**
 * Camera-based barcode / QR scanner.
 * Uses the browser's BarcodeDetector API (Chrome 83+, Edge 83+).
 * Falls back to a graceful error on unsupported browsers.
 *
 * Props:
 *   onScan(code: string) - called when a barcode is detected
 *   onClose()            - called when the modal is dismissed
 */
export default function CameraScanner({ onScan, onClose }) {
  const videoRef  = useRef(null);
  const streamRef = useRef(null);
  const rafRef    = useRef(null);
  const [error, setError]       = useState('');
  const [detected, setDetected] = useState('');

  const supported = typeof window !== 'undefined' && 'BarcodeDetector' in window;

  useEffect(() => {
    if (!supported) {
      setError('BarcodeDetector is not supported in this browser. Use Chrome or Edge.');
      return;
    }

    let active = true;
    const detector = new window.BarcodeDetector({
      formats: ['ean_13', 'ean_8', 'code_128', 'code_39', 'qr_code', 'upc_a', 'upc_e', 'data_matrix'],
    });

    navigator.mediaDevices.getUserMedia({ video: { facingMode: 'environment' } })
      .then(stream => {
        if (!active) { stream.getTracks().forEach(t => t.stop()); return; }
        streamRef.current = stream;
        if (videoRef.current) {
          videoRef.current.srcObject = stream;
          videoRef.current.play();
        }

        const scan = async () => {
          if (!active || !videoRef.current) return;
          try {
            const barcodes = await detector.detect(videoRef.current);
            if (barcodes.length > 0) {
              const code = barcodes[0].rawValue;
              setDetected(code);
              if (active) {
                active = false;
                stopStream();
                setTimeout(() => onScan(code), 120);
              }
              return;
            }
          } catch (_) {}
          rafRef.current = requestAnimationFrame(scan);
        };
        rafRef.current = requestAnimationFrame(scan);
      })
      .catch(err => {
        if (active) setError(err.message || 'Camera access denied');
      });

    function stopStream() {
      if (rafRef.current)  cancelAnimationFrame(rafRef.current);
      if (streamRef.current) streamRef.current.getTracks().forEach(t => t.stop());
    }

    return () => { active = false; stopStream(); };
  }, []);

  const handleClose = () => {
    if (rafRef.current)    cancelAnimationFrame(rafRef.current);
    if (streamRef.current) streamRef.current.getTracks().forEach(t => t.stop());
    onClose();
  };

  return (
    <div className="fixed inset-0 z-[9999] flex items-center justify-center bg-black/70">
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-sm mx-4 overflow-hidden">

        {/* Header */}
        <div className="flex items-center justify-between px-4 py-3 border-b border-slate-200">
          <div className="flex items-center gap-2">
            <Camera size={16} className="text-amber-600" />
            <span className="text-sm font-semibold text-slate-800">Scan Barcode / QR</span>
          </div>
          <button onClick={handleClose} className="p-1 text-slate-400 hover:text-slate-600 rounded">
            <X size={16} />
          </button>
        </div>

        <div className="p-4">
          {error ? (
            <div className="flex flex-col items-center gap-3 py-6 text-center">
              <AlertCircle size={32} className="text-rose-500" />
              <p className="text-sm text-slate-600">{error}</p>
              <p className="text-xs text-slate-400">
                You can still type the barcode in the search box.
              </p>
            </div>
          ) : (
            <>
              <div className="relative rounded-xl overflow-hidden bg-black aspect-square">
                <video
                  ref={videoRef}
                  muted
                  playsInline
                  className="w-full h-full object-cover"
                />
                {/* Scan reticle */}
                <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
                  <div className="w-44 h-44 relative">
                    <div className="absolute top-0 left-0 w-8 h-8 border-t-4 border-l-4 border-amber-400 rounded-tl-lg" />
                    <div className="absolute top-0 right-0 w-8 h-8 border-t-4 border-r-4 border-amber-400 rounded-tr-lg" />
                    <div className="absolute bottom-0 left-0 w-8 h-8 border-b-4 border-l-4 border-amber-400 rounded-bl-lg" />
                    <div className="absolute bottom-0 right-0 w-8 h-8 border-b-4 border-r-4 border-amber-400 rounded-br-lg" />
                    {/* Scanning line */}
                    <div className="absolute left-2 right-2 h-0.5 bg-amber-400/70 animate-[scan_2s_ease-in-out_infinite]"
                      style={{ top: '50%', animation: 'scanline 2s ease-in-out infinite' }} />
                  </div>
                </div>
                {detected && (
                  <div className="absolute bottom-3 left-3 right-3 bg-emerald-600/90 text-white text-xs font-semibold text-center py-1.5 rounded-lg">
                    Detected: {detected}
                  </div>
                )}
              </div>
              <p className="text-center text-xs text-slate-400 mt-3">
                Point camera at barcode or QR code
              </p>
            </>
          )}
        </div>

        <div className="px-4 pb-4">
          <button onClick={handleClose}
            className="w-full py-2 text-sm text-slate-600 border border-slate-200 rounded-lg hover:bg-slate-50 transition">
            Cancel
          </button>
        </div>
      </div>

      <style>{`
        @keyframes scanline {
          0%, 100% { top: 10%; }
          50%       { top: 85%; }
        }
      `}</style>
    </div>
  );
}
