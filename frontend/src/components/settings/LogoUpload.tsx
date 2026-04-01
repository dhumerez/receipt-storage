import { useState, useRef } from 'react';
import { useMutation } from '@tanstack/react-query';
import { uploadLogo, deleteLogo, getLogoUrl } from '../../api/reports.ts';

export default function LogoUpload() {
  const [logoExists, setLogoExists] = useState(false);
  const [logoKey, setLogoKey] = useState(0);
  const [uploading, setUploading] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const uploadMutation = useMutation({
    mutationFn: uploadLogo,
    onSuccess: () => {
      setLogoExists(true);
      setLogoKey((k) => k + 1);
      setUploading(false);
    },
    onError: () => {
      setUploading(false);
    },
  });

  const deleteMutation = useMutation({
    mutationFn: deleteLogo,
    onSuccess: () => {
      setLogoExists(false);
      setLogoKey((k) => k + 1);
    },
  });

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setUploading(true);
    uploadMutation.mutate(file);
    // Reset input so same file can be re-selected
    e.target.value = '';
  };

  const handleRemove = () => {
    if (window.confirm('Remove company logo? It will no longer appear on exported PDFs.')) {
      deleteMutation.mutate();
    }
  };

  const triggerFileInput = () => {
    fileInputRef.current?.click();
  };

  return (
    <div className="space-y-3">
      <input
        ref={fileInputRef}
        type="file"
        accept="image/jpeg,image/png,image/webp"
        onChange={handleFileSelect}
        className="hidden"
      />

      {logoExists ? (
        <div className="flex items-start gap-4">
          <img
            key={logoKey}
            src={getLogoUrl()}
            alt="Company logo"
            className="max-w-[120px] rounded"
            onError={() => setLogoExists(false)}
          />
          <div className="flex flex-col gap-2">
            <button
              type="button"
              onClick={triggerFileInput}
              disabled={uploading}
              className="px-3 py-1.5 text-sm border border-gray-300 text-gray-700 rounded-md hover:bg-gray-50 disabled:opacity-50"
            >
              {uploading ? 'Uploading...' : 'Replace'}
            </button>
            <button
              type="button"
              onClick={handleRemove}
              disabled={deleteMutation.isPending}
              className="text-sm text-red-600 hover:text-red-700 text-left"
            >
              Remove
            </button>
          </div>
        </div>
      ) : (
        <div className="border-2 border-dashed border-gray-300 rounded-lg p-8 flex flex-col items-center gap-3">
          <img
            key={logoKey}
            src={getLogoUrl()}
            alt=""
            className="hidden"
            onLoad={() => setLogoExists(true)}
            onError={() => setLogoExists(false)}
          />
          <button
            type="button"
            onClick={triggerFileInput}
            disabled={uploading}
            aria-label="Upload company logo"
            className="px-4 py-2 text-sm bg-blue-600 text-white rounded-md hover:bg-blue-700 disabled:opacity-50 font-medium"
          >
            {uploading ? 'Uploading...' : 'Upload Logo'}
          </button>
        </div>
      )}

      <p className="text-xs text-gray-500">Logo appears on exported PDF reports.</p>
    </div>
  );
}
