import { useEffect, useRef, useState } from 'react';

interface PlaceResult {
  address: string;
  mapsUrl: string;
}

interface GooglePlacesInputProps {
  value: string;
  onChange: (value: string) => void;
  onPlaceSelect?: (result: PlaceResult) => void;
  placeholder?: string;
  className?: string;
  id?: string;
}

// Load the Google Maps JS API script once per page
let scriptLoadPromise: Promise<void> | null = null;

function loadGoogleMapsScript(apiKey: string): Promise<void> {
  if (scriptLoadPromise) return scriptLoadPromise;

  scriptLoadPromise = new Promise<void>((resolve, reject) => {
    // Already loaded
    if ((window as any).google?.maps?.places) {
      resolve();
      return;
    }

    const script = document.createElement('script');
    script.src = `https://maps.googleapis.com/maps/api/js?key=${apiKey}&libraries=places&loading=async`;
    script.async = true;
    script.defer = true;
    script.onload = () => resolve();
    script.onerror = () => {
      scriptLoadPromise = null;
      reject(new Error('Failed to load Google Maps API'));
    };
    document.head.appendChild(script);
  });

  return scriptLoadPromise;
}

export function GooglePlacesInput({
  value,
  onChange,
  onPlaceSelect,
  placeholder,
  className,
  id,
}: GooglePlacesInputProps) {
  const inputRef = useRef<HTMLInputElement>(null);
  const autocompleteRef = useRef<any>(null);
  const [ready, setReady] = useState(false);

  const apiKey = (import.meta as any).env?.VITE_GOOGLE_MAPS_API_KEY as string | undefined;

  useEffect(() => {
    if (!apiKey) return;

    loadGoogleMapsScript(apiKey)
      .then(() => setReady(true))
      .catch((err) => console.warn('[GooglePlacesInput] Failed to load Maps API:', err));
  }, [apiKey]);

  useEffect(() => {
    if (!ready || !inputRef.current || autocompleteRef.current) return;

    const google = (window as any).google;
    if (!google?.maps?.places) return;

    const autocomplete = new google.maps.places.Autocomplete(inputRef.current, {
      fields: ['formatted_address', 'url', 'name'],
    });

    autocomplete.addListener('place_changed', () => {
      const place = autocomplete.getPlace();
      const address = place.formatted_address ?? place.name ?? '';
      const mapsUrl = place.url ?? '';

      onChange(address);
      onPlaceSelect?.({ address, mapsUrl });
    });

    autocompleteRef.current = autocomplete;
  }, [ready, onChange, onPlaceSelect]);

  return (
    <input
      ref={inputRef}
      id={id}
      type="text"
      value={value}
      onChange={(e) => onChange(e.target.value)}
      placeholder={placeholder}
      className={className}
      autoComplete="off"
    />
  );
}
