import LogoUpload from '../../components/settings/LogoUpload.tsx';
import { SETTINGS } from '../../constants/strings/settings.ts';

export default function SettingsPage() {
  return (
    <div className="p-4 md:p-6 space-y-6">
      <h1 className="text-2xl font-semibold text-gray-900">{SETTINGS.pageTitle}</h1>
      <div className="bg-white rounded-lg border border-gray-200 p-6 space-y-4">
        <h2 className="text-xl font-semibold text-gray-900">{SETTINGS.companyLogo}</h2>
        <LogoUpload />
      </div>
    </div>
  );
}
