
import AdminOverviewCards from "@/components/admin/AdminOverviewCards";
import AdminDashboardBodyClient from "@/components/admin/AdminDashboardBodyClient";
import { cookies } from "next/headers";
import { redirect } from "next/navigation";

function decodeRole(token?: string): string | null {
  if (!token) return null;
  try {
    const parts = token.split('.')
    if (parts.length < 2) return null
    const json = Buffer.from(parts[1].replace(/-/g, '+').replace(/_/g, '/'), 'base64').toString('utf8')
    const payload = JSON.parse(json) || {}
    const raw = String(payload.role || '')
    const norm = raw.replace(/[^a-z]/gi, '').toLowerCase()
    if (norm === 'admin') return 'admin'
    if (norm === 'officeadmin' || norm === 'office') return 'officeAdmin'
    if (norm === 'showroom' || norm === 'customer') return 'showroom'
    return raw || null
  } catch {
    return null
  }
}

export default async function AdminPage() {
    const cookieStore = await cookies();
    const token = cookieStore.get('token')?.value
    if (!token) {
        redirect('/login')
    }
    const role = decodeRole(token)
    if (role && role !== 'admin') {
        if (role === 'officeAdmin') redirect('/office-admin')
        if (role === 'showroom') redirect('/showroom-account')
        redirect('/login')
    }
    return (
        <div className="min-h-screen h-screen bg-[#F7F7F7] flex flex-col">
            <header className="bg-[#F7F7F7] border-b border-gray-200 px-4 md:px-8 py-4 sticky top-0 z-30">
                <div className="max-w-full mx-auto flex flex-col md:flex-row md:items-center md:justify-between gap-3">
                    <div>
                        <h1 className="text-2xl md:text-3xl font-bold text-gray-900">Dashboard</h1>
                    </div>
                </div>
            </header>
            <main className="flex-1 overflow-y-auto p-4 md:p-8">
                <AdminOverviewCards />
                <AdminDashboardBodyClient />
            </main>
        </div>
    );
}


