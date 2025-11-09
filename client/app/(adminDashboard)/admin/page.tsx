import AuthGuard from "@/components/AuthGuard";
import AdminOverviewCards from "@/components/admin/AdminOverviewCards";
import AdminDashboardBodyClient from "@/components/admin/AdminDashboardBodyClient";

export default function AdminPage() {
    return (
        <AuthGuard allowedRoles={["admin"]}>
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
        </AuthGuard>
    );
}


