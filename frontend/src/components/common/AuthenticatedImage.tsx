import { useState, useEffect, useCallback } from 'react';
import { createPortal } from 'react-dom';
import { getAccessToken } from '../../api/client.ts';

interface AuthenticatedImageProps {
  src: string;
  alt: string;
  className?: string;
  /** When true, clicking the thumbnail opens a fullscreen lightbox modal */
  lightbox?: boolean;
}

function Lightbox({ src, alt, onClose }: { src: string; alt: string; onClose: () => void }) {
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => { if (e.key === 'Escape') onClose(); };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [onClose]);

  return createPortal(
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/80"
      onClick={onClose}
    >
      <button
        type="button"
        onClick={onClose}
        className="absolute top-4 right-4 text-white/80 hover:text-white"
        aria-label="Close"
      >
        <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor" className="w-8 h-8">
          <path strokeLinecap="round" strokeLinejoin="round" d="M6 18 18 6M6 6l12 12" />
        </svg>
      </button>
      <img
        src={src}
        alt={alt}
        className="max-h-[90vh] max-w-[90vw] rounded-lg object-contain shadow-2xl"
        onClick={(e) => e.stopPropagation()}
      />
    </div>,
    document.body,
  );
}

/**
 * Fetches an image that requires Authorization header (Bearer token) and
 * renders it via a blob URL. Plain <img src> won't send auth headers.
 * Pass lightbox=true to open a fullscreen modal on click.
 */
export default function AuthenticatedImage({ src, alt, className, lightbox = false }: AuthenticatedImageProps) {
  const [blobUrl, setBlobUrl] = useState<string | null>(null);
  const [open, setOpen] = useState(false);
  const close = useCallback(() => setOpen(false), []);

  useEffect(() => {
    let objectUrl: string | null = null;
    const token = getAccessToken();

    fetch(src, {
      credentials: 'include',
      headers: token ? { Authorization: `Bearer ${token}` } : {},
    })
      .then((r) => {
        if (!r.ok) throw new Error(`${r.status}`);
        return r.blob();
      })
      .then((blob) => {
        objectUrl = URL.createObjectURL(blob);
        setBlobUrl(objectUrl);
      })
      .catch(() => {
        // Leave blobUrl null — placeholder will show
      });

    return () => {
      if (objectUrl) URL.revokeObjectURL(objectUrl);
    };
  }, [src]);

  if (!blobUrl) {
    return <div className={className} style={{ background: '#f3f4f6' }} />;
  }

  if (lightbox) {
    return (
      <>
        <img
          src={blobUrl}
          alt={alt}
          className={`${className ?? ''} cursor-zoom-in`}
          onClick={() => setOpen(true)}
        />
        {open && <Lightbox src={blobUrl} alt={alt} onClose={close} />}
      </>
    );
  }

  return <img src={blobUrl} alt={alt} className={className} />;
}

/**
 * Opens an authenticated file (PDF or image) in a new tab via a temporary blob URL.
 */
export async function openAuthenticatedFile(src: string): Promise<void> {
  const token = getAccessToken();
  const r = await fetch(src, {
    credentials: 'include',
    headers: token ? { Authorization: `Bearer ${token}` } : {},
  });
  if (!r.ok) return;
  const blob = await r.blob();
  const url = URL.createObjectURL(blob);
  window.open(url, '_blank', 'noopener,noreferrer');
  setTimeout(() => URL.revokeObjectURL(url), 10000);
}
