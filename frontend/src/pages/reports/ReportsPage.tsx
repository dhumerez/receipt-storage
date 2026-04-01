import { useState } from 'react';
import { downloadPdf } from '../../api/reports.ts';
import ReportTabSwitcher from '../../components/reports/ReportTabSwitcher.tsx';
import ReportFilterBar from '../../components/reports/ReportFilterBar.tsx';
import ClientSelectorDropdown from '../../components/reports/ClientSelectorDropdown.tsx';
import CompanyReportTab from '../../components/reports/CompanyReportTab.tsx';
import ClientReportTab from '../../components/reports/ClientReportTab.tsx';

function defaultDateFrom(): string {
  const d = new Date();
  d.setDate(d.getDate() - 30);
  return d.toISOString().slice(0, 10);
}

function todayStr(): string {
  return new Date().toISOString().slice(0, 10);
}

export default function ReportsPage() {
  const [activeTab, setActiveTab] = useState<'company' | 'client'>('company');
  const [dateFrom, setDateFrom] = useState(defaultDateFrom);
  const [dateTo, setDateTo] = useState(todayStr);
  const [showSettled, setShowSettled] = useState(false);
  const [selectedClientId, setSelectedClientId] = useState('');
  const [pdfLoading, setPdfLoading] = useState(false);

  async function handleExportPdf() {
    setPdfLoading(true);
    try {
      if (activeTab === 'company') {
        const today = todayStr();
        await downloadPdf(
          `/api/v1/reports/company/pdf?dateFrom=${dateFrom}&dateTo=${dateTo}&showSettled=${showSettled}`,
          `company-report-${today}.pdf`,
        );
      } else {
        if (!selectedClientId) return;
        const today = todayStr();
        await downloadPdf(
          `/api/v1/reports/client/${selectedClientId}/pdf?dateFrom=${dateFrom}&dateTo=${dateTo}`,
          `client-report-${today}.pdf`,
        );
      }
    } catch {
      // Error is shown by downloadPdf throw — could add toast in future
    } finally {
      setPdfLoading(false);
    }
  }

  const exportDisabled =
    pdfLoading || (activeTab === 'client' && !selectedClientId);

  return (
    <div className="p-4 md:p-6 space-y-4">
      <h1 className="text-2xl font-semibold text-gray-900">Reports</h1>

      <div data-print-hide>
        <ReportTabSwitcher activeTab={activeTab} onTabChange={setActiveTab} />
      </div>

      <div data-print-hide>
        <ReportFilterBar
          dateFrom={dateFrom}
          dateTo={dateTo}
          showSettled={showSettled}
          onDateFromChange={setDateFrom}
          onDateToChange={setDateTo}
          onShowSettledChange={setShowSettled}
        >
          {activeTab === 'client' && (
            <ClientSelectorDropdown
              selectedClientId={selectedClientId}
              onSelect={setSelectedClientId}
            />
          )}
        </ReportFilterBar>
      </div>

      {activeTab === 'company' ? (
        <CompanyReportTab
          dateFrom={dateFrom}
          dateTo={dateTo}
          showSettled={showSettled}
        />
      ) : (
        <ClientReportTab
          dateFrom={dateFrom}
          dateTo={dateTo}
          selectedClientId={selectedClientId}
          onClientSelect={setSelectedClientId}
        />
      )}

      <div className="flex justify-end" data-print-hide>
        <button
          type="button"
          onClick={handleExportPdf}
          disabled={exportDisabled}
          aria-busy={pdfLoading}
          aria-disabled={exportDisabled}
          className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50 w-full md:w-auto"
        >
          {pdfLoading ? 'Generating...' : 'Export PDF'}
        </button>
      </div>
    </div>
  );
}
