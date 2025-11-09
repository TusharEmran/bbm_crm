import AuthGuard from "@/components/AuthGuard";
import MessageSettingsClient from "@/components/admin/MessageSettingsClient";

export default function Page() {
  return (
    <AuthGuard allowedRoles={["admin"]}>
      <MessageSettingsClient />
    </AuthGuard>
  );
}

