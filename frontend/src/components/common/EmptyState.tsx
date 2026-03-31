interface EmptyStateProps {
  heading: string;
  body: string;
  ctaLabel?: string;
  onCta?: () => void;
}

export default function EmptyState({ heading, body, ctaLabel, onCta }: EmptyStateProps) {
  return (
    <div className="flex flex-col items-center justify-center py-16 text-center">
      <p className="text-xl font-semibold text-gray-900 mb-2">{heading}</p>
      <p className="text-sm text-gray-500 max-w-sm mb-6">{body}</p>
      {ctaLabel && onCta && (
        <button
          type="button"
          onClick={onCta}
          className="px-4 py-2 text-sm bg-blue-600 text-white rounded-md hover:bg-blue-700 font-medium"
        >
          {ctaLabel}
        </button>
      )}
    </div>
  );
}
