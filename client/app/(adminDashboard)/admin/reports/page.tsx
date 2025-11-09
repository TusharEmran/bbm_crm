import AuthGuard from "@/components/AuthGuard";
import ReportsClient from "@/components/admin/ReportsClient";

export default function Page() {
  return (
    <AuthGuard allowedRoles={["admin"]}>
      <ReportsClient />
    </AuthGuard>
  );
}

