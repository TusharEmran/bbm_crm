import UsersClient from '@/components/UsersClient';
import AuthGuard from '@/components/AuthGuard';

export default function Page() {
  return (
    <AuthGuard allowedRoles={["admin"]}>
      <UsersClient />
      </AuthGuard>
  );
}
