import type { PortalSummary } from '../../api/portal.ts';

// D-13 + FR-03.5 + FR-03.6:
// - "Total outstanding as of [date]" — confirmed balance (from debtBalances view, confirmed only)
// - "Awaiting confirmation" — pending payments sum (separate, per FR-03.6)
// - Date rendered as <time dateTime="ISO"> (UI-SPEC accessibility contract)

interface PortalBalanceSummaryProps {
  summary: PortalSummary;
}

export default function PortalBalanceSummary({ summary }: PortalBalanceSummaryProps) {
  const formattedDate = new Date(summary.asOf).toLocaleDateString();
  const confirmedFormatted = parseFloat(summary.confirmedBalance).toFixed(2);
  const pendingFormatted = parseFloat(summary.pendingBalance).toFixed(2);
  const hasPending = parseFloat(summary.pendingBalance) > 0;

  return (
    <div className="bg-white border border-gray-200 rounded-lg p-6 mb-8">
      {/* Confirmed balance — primary display (FR-03.5) */}
      <p className="text-sm text-gray-500 mb-1">
        Total outstanding as of{' '}
        <time dateTime={summary.asOf} className="font-medium text-gray-700">{formattedDate}</time>
      </p>
      <p className="text-2xl font-semibold text-gray-900 mb-4">${confirmedFormatted}</p>

      {/* Pending payments — separate section (FR-03.6) */}
      {hasPending && (
        <div className="pt-4 border-t border-gray-100">
          <p className="text-sm text-gray-500">
            Awaiting confirmation:{' '}
            <span className="font-medium text-yellow-700">${pendingFormatted}</span>
          </p>
          <p className="text-xs text-gray-400 mt-0.5">
            These payments are pending review by your account manager.
          </p>
        </div>
      )}
    </div>
  );
}
