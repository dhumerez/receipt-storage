interface KpiCardProps {
  label: string;
  value: string;
  accent: 'blue' | 'green' | 'yellow' | 'gray';
}

const ACCENT_CLASS: Record<KpiCardProps['accent'], string> = {
  blue: 'border-l-blue-500',
  green: 'border-l-green-500',
  yellow: 'border-l-yellow-500',
  gray: 'border-l-gray-400',
};

export default function KpiCard({ label, value, accent }: KpiCardProps) {
  return (
    <div
      className={`rounded-lg border border-gray-200 border-l-4 ${ACCENT_CLASS[accent]} bg-white p-4`}
    >
      <p className="text-sm text-gray-500">{label}</p>
      <p className="mt-1 text-2xl font-semibold text-gray-900">{value}</p>
    </div>
  );
}
