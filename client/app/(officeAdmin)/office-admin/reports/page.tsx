import OfficeReportsClient from '@/components/officeAdmin/OfficeReportsClient';
import AuthGuard from '@/components/AuthGuard';

const baseUrl = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:5000';

async function getInitialShowrooms(): Promise<string[]> {
  try {
    const res = await fetch(`${baseUrl}/api/user/showrooms-public`, { cache: 'no-store' });
    if (!res.ok) return [];
    const js = await res.json();
    const names: string[] = Array.isArray(js)
      ? js.map((s: any) => s.name)
      : (js.showrooms || []).map((s: any) => s.name);
    return names;
  } catch {
    return [];
  }
}

function getDefaultDateRange(): { from: string; to: string } {
  const today = new Date();
  const from = new Date(today);
  from.setDate(today.getDate() - 6);
  const toStr = today.toISOString().split('T')[0];
  const fromStr = from.toISOString().split('T')[0];
  return { from: fromStr, to: toStr };
}

export default async function ReportsPage() {
  const initialShowrooms = await getInitialShowrooms();
  const { from, to } = getDefaultDateRange();
  const initialSelectedShowroom = initialShowrooms[0] || '';

  return (
    <OfficeReportsClient
      initialShowrooms={initialShowrooms}
      initialSelectedShowroom={initialSelectedShowroom}
      initialStartDate={from}
      initialEndDate={to}
    />
  );
}


