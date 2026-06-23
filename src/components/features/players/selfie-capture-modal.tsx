"use client";

import { useEffect, useRef, useState } from "react";
import { Camera, Loader2, X } from "lucide-react";

type SelfieCaptureModalProps = {
  open: boolean;
  labels: {
    title: string;
    capture: string;
    cancel: string;
    cameraError: string;
  };
  onCancel: () => void;
  onCapture: (file: File) => void;
};

export function SelfieCaptureModal({
  open,
  labels,
  onCancel,
  onCapture,
}: SelfieCaptureModalProps) {
  const videoRef = useRef<HTMLVideoElement>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const [starting, setStarting] = useState(false);
  const [cameraError, setCameraError] = useState<string | null>(null);

  useEffect(() => {
    if (!open) {
      streamRef.current?.getTracks().forEach((track) => track.stop());
      streamRef.current = null;
      setCameraError(null);
      return;
    }

    let cancelled = false;
    setStarting(true);
    setCameraError(null);

    navigator.mediaDevices
      .getUserMedia({
        video: { facingMode: "user", width: { ideal: 720 }, height: { ideal: 720 } },
        audio: false,
      })
      .then((stream) => {
        if (cancelled) {
          stream.getTracks().forEach((track) => track.stop());
          return;
        }
        streamRef.current = stream;
        if (videoRef.current) {
          videoRef.current.srcObject = stream;
          void videoRef.current.play();
        }
        setStarting(false);
      })
      .catch(() => {
        if (!cancelled) {
          setCameraError(labels.cameraError);
          setStarting(false);
        }
      });

    return () => {
      cancelled = true;
      streamRef.current?.getTracks().forEach((track) => track.stop());
      streamRef.current = null;
    };
  }, [open, labels.cameraError]);

  const handleCapture = () => {
    const video = videoRef.current;
    if (!video || video.videoWidth === 0) return;

    const size = Math.min(video.videoWidth, video.videoHeight);
    const canvas = document.createElement("canvas");
    canvas.width = size;
    canvas.height = size;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    const sx = (video.videoWidth - size) / 2;
    const sy = (video.videoHeight - size) / 2;
    ctx.drawImage(video, sx, sy, size, size, 0, 0, size, size);

    canvas.toBlob(
      (blob) => {
        if (!blob) return;
        const file = new File([blob], "selfie.jpg", { type: "image/jpeg" });
        onCapture(file);
      },
      "image/jpeg",
      0.9,
    );
  };

  if (!open) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-end justify-center bg-black/80 p-4 sm:items-center">
      <div className="w-full max-w-md overflow-hidden rounded-2xl border border-[var(--border)] bg-[var(--surface)] shadow-2xl">
        <div className="flex items-center justify-between border-b border-[var(--border)] px-4 py-3">
          <p className="font-bold text-white">{labels.title}</p>
          <button
            type="button"
            onClick={onCancel}
            className="rounded-lg p-1.5 text-[var(--foreground-muted)] hover:bg-white/10 hover:text-white"
            aria-label={labels.cancel}
          >
            <X className="h-4 w-4" />
          </button>
        </div>

        <div className="relative aspect-square bg-black">
          {starting ? (
            <div className="absolute inset-0 flex items-center justify-center">
              <Loader2 className="h-8 w-8 animate-spin text-[var(--gold)]" />
            </div>
          ) : null}
          {cameraError ? (
            <div className="absolute inset-0 flex items-center justify-center p-6 text-center text-sm text-red-300">
              {cameraError}
            </div>
          ) : (
            <video
              ref={videoRef}
              playsInline
              muted
              className="h-full w-full object-cover [transform:scaleX(-1)]"
            />
          )}
        </div>

        <div className="flex gap-2 p-4">
          <button
            type="button"
            onClick={onCancel}
            className="h-11 flex-1 rounded-xl border border-[var(--border)] text-sm font-bold text-white hover:bg-white/5"
          >
            {labels.cancel}
          </button>
          <button
            type="button"
            onClick={handleCapture}
            disabled={starting || Boolean(cameraError)}
            className="inline-flex h-11 flex-1 items-center justify-center gap-2 rounded-xl bg-[var(--gold)] text-sm font-bold text-black hover:bg-[var(--gold-dark)] disabled:opacity-50"
          >
            <Camera className="h-4 w-4" />
            {labels.capture}
          </button>
        </div>
      </div>
    </div>
  );
}
