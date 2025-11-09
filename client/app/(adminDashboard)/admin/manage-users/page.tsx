import UsersClient from '@/components/admin/UsersClient';
import AuthGuard from '@/components/AuthGuard';

export default function Page() {
  return (
    <AuthGuard allowedRoles={["admin"]}>
      <UsersClient />
      </AuthGuard>
  );
}


