import { useState, useEffect } from 'react';
import { getAccessToken } from '../../api/client.ts';

interface AuthenticatedImageProps {
  src: string;
  alt: string;
  className?: string;
}

/**
 * Fetches an image that requires Authorization header (Bearer token) and
 * renders it via a blob URL. Plain <img src> won't send auth headers.
 */
export default function AuthenticatedImage({ src, alt, className }: AuthenticatedImageProps) {
  const [blobUrl, setBlobUrl] = useState<string | null>(null);

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

  return <img src={blobUrl} alt={alt} className={className} />;
}

/**
 * Opens an authenticated file in a new tab by fetching it with auth headers
 * and creating a temporary blob URL.
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
  // Revoke after a short delay to allow the new tab to load
  setTimeout(() => URL.revokeObjectURL(url), 10000);
}
