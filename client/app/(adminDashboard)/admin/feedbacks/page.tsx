import AuthGuard from "@/components/AuthGuard";
import FeedbacksClient from "@/components/FeedbacksClient";

export default function Page() {
  return (
    <AuthGuard allowedRoles={["admin"]}>
      <FeedbacksClient />
    </AuthGuard>
  );
}

