import SettingsManager from '@/components/SettingsManager';

export const metadata = {
  title: 'Settings - Luxy Admin',
  description: 'Manage global settings for Luxy Galleria',
};

export default function SettingsPage() {
  return (
    <div className="p-6">
      <SettingsManager />
    </div>
  );
}
