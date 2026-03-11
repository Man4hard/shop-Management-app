import { useEffect, useRef, useState, useCallback } from "react";
import { Html5Qrcode } from "html5-qrcode";
import { Button } from "@/components/ui/button";
import { Camera, X, SwitchCamera } from "lucide-react";
import { useLanguage } from "@/lib/language-context";

interface CameraScannerProps {
  onScan: (barcode: string) => void;
  onClose: () => void;
}

export default function CameraScanner({ onScan, onClose }: CameraScannerProps) {
  const { t } = useLanguage();
  const scannerRef = useRef<Html5Qrcode | null>(null);
  const [isStarting, setIsStarting] = useState(true);
  const [error, setError] = useState("");
  const [facingMode, setFacingMode] = useState<"environment" | "user">("environment");
  const lastScanRef = useRef("");
  const lastScanTimeRef = useRef(0);
  const onScanRef = useRef(onScan);
  const onCloseRef = useRef(onClose);
  const containerId = "camera-scanner-view";

  onScanRef.current = onScan;
  onCloseRef.current = onClose;

  const stopScanner = useCallback(async () => {
    if (scannerRef.current) {
      try {
        const state = scannerRef.current.getState();
        if (state === 2) {
          await scannerRef.current.stop();
        }
      } catch {}
      try {
        scannerRef.current.clear();
      } catch {}
      scannerRef.current = null;
    }
  }, []);

  const startScanner = useCallback(async () => {
    setIsStarting(true);
    setError("");

    await stopScanner();

    await new Promise((r) => setTimeout(r, 300));

    const el = document.getElementById(containerId);
    if (!el) {
      setIsStarting(false);
      setError(t("scanner", "cameraError"));
      return;
    }

    try {
      const scanner = new Html5Qrcode(containerId);
      scannerRef.current = scanner;

      await scanner.start(
        { facingMode },
        {
          fps: 15,
          qrbox: { width: 280, height: 160 },
          aspectRatio: 1.0,
          disableFlip: false,
        },
        (decodedText) => {
          const now = Date.now();
          if (decodedText === lastScanRef.current && now - lastScanTimeRef.current < 3000) {
            return;
          }
          lastScanRef.current = decodedText;
          lastScanTimeRef.current = now;
          onScanRef.current(decodedText);
          scanner.stop().then(() => {
            try { scanner.clear(); } catch {}
            scannerRef.current = null;
            onCloseRef.current();
          }).catch(() => {
            onCloseRef.current();
          });
        },
        () => {}
      );
      setIsStarting(false);
    } catch (err: any) {
      setIsStarting(false);
      if (err?.toString().includes("NotAllowedError") || err?.toString().includes("Permission")) {
        setError(t("scanner", "cameraPermission"));
      } else if (err?.toString().includes("NotFoundError")) {
        setError(t("scanner", "noCamera"));
      } else {
        setError(t("scanner", "cameraError"));
      }
    }
  }, [facingMode, stopScanner, t]);

  useEffect(() => {
    startScanner();
    return () => {
      stopScanner();
    };
  }, [startScanner, stopScanner]);

  function handleFlipCamera() {
    setFacingMode((prev) => (prev === "environment" ? "user" : "environment"));
  }

  function handleClose() {
    stopScanner().then(onClose);
  }

  return (
    <div className="fixed inset-0 z-50 bg-black flex flex-col" data-testid="camera-scanner">
      <div className="flex items-center justify-between px-4 py-3 bg-black/80 z-10">
        <h2 className="text-white font-semibold text-sm">{t("scanner", "title")}</h2>
        <div className="flex items-center gap-2">
          <Button
            size="sm"
            variant="ghost"
            className="text-white hover:bg-white/20 h-9 w-9 p-0"
            onClick={handleFlipCamera}
            data-testid="button-flip-camera"
          >
            <SwitchCamera className="w-5 h-5" />
          </Button>
          <Button
            size="sm"
            variant="ghost"
            className="text-white hover:bg-white/20 h-9 w-9 p-0"
            onClick={handleClose}
            data-testid="button-close-scanner"
          >
            <X className="w-5 h-5" />
          </Button>
        </div>
      </div>

      <div className="flex-1 flex flex-col items-center justify-center relative">
        <div
          id={containerId}
          className="w-full max-w-md"
          style={{ minHeight: "300px" }}
        />

        {isStarting && !error && (
          <div className="absolute inset-0 flex items-center justify-center bg-black/50">
            <div className="text-center text-white">
              <Camera className="w-12 h-12 mx-auto mb-3 animate-pulse" />
              <p className="text-sm">{t("scanner", "starting")}</p>
            </div>
          </div>
        )}

        {error && (
          <div className="absolute inset-0 flex items-center justify-center bg-black/80">
            <div className="text-center text-white px-6">
              <Camera className="w-12 h-12 mx-auto mb-3 text-red-400" />
              <p className="text-sm text-red-300 mb-4">{error}</p>
              <div className="flex gap-3 justify-center">
                <Button size="sm" variant="secondary" onClick={startScanner} data-testid="button-retry-camera">
                  {t("scanner", "retry")}
                </Button>
                <Button size="sm" variant="ghost" className="text-white" onClick={handleClose}>
                  {t("common", "back")}
                </Button>
              </div>
            </div>
          </div>
        )}
      </div>

      <div className="px-4 py-4 bg-black/80">
        <p className="text-white/60 text-xs text-center mb-3">
          {t("scanner", "pointCamera")}
        </p>
        <Button
          className="w-full"
          variant="secondary"
          onClick={handleClose}
          data-testid="button-cancel-scan"
        >
          {t("common", "back")}
        </Button>
      </div>
    </div>
  );
}
