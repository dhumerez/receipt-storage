import { useRef, useEffect, useState } from 'react';
import { useDropzone } from 'react-dropzone';
import { TRANSACTIONS } from '../../constants/strings/transactions.ts';

interface FileAttachmentSectionProps {
  files: File[];
  onChange: (files: File[]) => void;
}

const MAX_FILES = 5;
const MAX_SIZE = 10 * 1024 * 1024; // 10 MB

export default function FileAttachmentSection({ files, onChange }: FileAttachmentSectionProps) {
  const cameraRef = useRef<HTMLInputElement>(null);
  const galleryRef = useRef<HTMLInputElement>(null);
  const [error, setError] = useState<string | null>(null);

  const { getRootProps, getInputProps, isDragActive } = useDropzone({
    accept: {
      'image/jpeg': ['.jpg', '.jpeg'],
      'image/png': ['.png'],
      'image/webp': ['.webp'],
      'image/heic': ['.heic'],
      'application/pdf': ['.pdf'],
    },
    maxFiles: MAX_FILES,
    maxSize: MAX_SIZE,
    noClick: true,
    onDrop: (accepted) => {
      setError(null);
      onChange([...files, ...accepted].slice(0, MAX_FILES));
    },
    onDropRejected: (rejections) => {
      const firstCode = rejections[0]?.errors?.[0]?.code;
      if (firstCode === 'file-invalid-type') {
        setError(TRANSACTIONS.fileTypeNotSupported);
      } else if (firstCode === 'file-too-large') {
        setError(TRANSACTIONS.fileTooLarge);
      } else if (firstCode === 'too-many-files') {
        setError(TRANSACTIONS.maxFilesReached);
      } else {
        setError(TRANSACTIONS.fileTypeNotSupported);
      }
    },
  });

  // Clean up object URLs on unmount
  const objectUrls = useRef<string[]>([]);
  useEffect(() => {
    return () => {
      objectUrls.current.forEach((url) => URL.revokeObjectURL(url));
    };
  }, []);

  const getPreviewUrl = (file: File): string => {
    const url = URL.createObjectURL(file);
    objectUrls.current.push(url);
    return url;
  };

  const handleFileInput = (inputFiles: FileList | null) => {
    if (!inputFiles) return;
    setError(null);
    const newFiles = Array.from(inputFiles);
    const total = [...files, ...newFiles].slice(0, MAX_FILES);
    if (files.length + newFiles.length > MAX_FILES) {
      setError(TRANSACTIONS.maxFilesReached);
    }
    onChange(total);
  };

  const removeFile = (index: number) => {
    setError(null);
    onChange(files.filter((_, i) => i !== index));
  };

  const isImage = (file: File) =>
    file.type.startsWith('image/');

  return (
    <div>
      {/* Drop zone */}
      <div
        {...getRootProps()}
        className={`border-2 border-dashed rounded-lg min-h-[80px] flex items-center justify-center p-4 transition-colors ${
          isDragActive
            ? 'border-blue-500 bg-blue-50'
            : 'border-gray-300 bg-gray-50'
        }`}
      >
        <input {...getInputProps()} />
        <p className="text-sm text-gray-500 text-center">
          {TRANSACTIONS.dragFilesHere}
        </p>
      </div>

      {/* Error message */}
      {error && (
        <p className="text-sm text-red-600 mt-2">{error}</p>
      )}

      {/* Two-button UX: always visible */}
      <div className="flex gap-2 mt-3">
        <input
          ref={cameraRef}
          type="file"
          accept="image/*"
          capture="environment"
          className="hidden"
          onChange={(e) => {
            handleFileInput(e.target.files);
            e.target.value = '';
          }}
        />
        <button
          type="button"
          onClick={() => cameraRef.current?.click()}
          className="border border-gray-300 rounded-md px-4 py-2 text-sm text-gray-700 hover:bg-gray-50"
        >
          {TRANSACTIONS.takePhoto}
        </button>

        <input
          ref={galleryRef}
          type="file"
          accept=".jpg,.jpeg,.png,.webp,.pdf,.heic"
          multiple
          className="hidden"
          onChange={(e) => {
            handleFileInput(e.target.files);
            e.target.value = '';
          }}
        />
        <button
          type="button"
          onClick={() => galleryRef.current?.click()}
          className="border border-gray-300 rounded-md px-4 py-2 text-sm text-gray-700 hover:bg-gray-50"
        >
          {TRANSACTIONS.chooseFromGallery}
        </button>
      </div>

      {/* Thumbnail grid */}
      {files.length > 0 && (
        <>
          <div className="flex flex-wrap gap-3 mt-3">
            {files.map((file, index) => (
              <div key={`${file.name}-${index}`} className="relative">
                {isImage(file) ? (
                  <img
                    src={getPreviewUrl(file)}
                    alt={file.name}
                    className="w-20 h-20 rounded-md object-cover"
                  />
                ) : (
                  <div className="w-20 h-20 rounded-md bg-gray-100 flex flex-col items-center justify-center">
                    <svg
                      className="w-8 h-8 text-gray-400"
                      fill="none"
                      viewBox="0 0 24 24"
                      stroke="currentColor"
                      strokeWidth={1.5}
                    >
                      <path
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        d="M19.5 14.25v-2.625a3.375 3.375 0 0 0-3.375-3.375h-1.5A1.125 1.125 0 0 1 13.5 7.125v-1.5a3.375 3.375 0 0 0-3.375-3.375H8.25m2.25 0H5.625c-.621 0-1.125.504-1.125 1.125v17.25c0 .621.504 1.125 1.125 1.125h12.75c.621 0 1.125-.504 1.125-1.125V11.25a9 9 0 0 0-9-9Z"
                      />
                    </svg>
                    <span className="text-[10px] text-gray-500 mt-0.5 max-w-[72px] truncate">
                      {file.name}
                    </span>
                  </div>
                )}
                <button
                  type="button"
                  onClick={() => removeFile(index)}
                  aria-label="Remove file"
                  className="absolute -top-1 -right-1 w-5 h-5 rounded-full bg-gray-700 text-white text-xs flex items-center justify-center hover:bg-gray-900"
                >
                  &times;
                </button>
              </div>
            ))}
          </div>
          <p className="text-xs text-gray-500 mt-2">
            {TRANSACTIONS.filesCount(files.length, MAX_FILES)}
          </p>
        </>
      )}
    </div>
  );
}
