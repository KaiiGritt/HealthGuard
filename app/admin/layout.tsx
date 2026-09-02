import Sidebar from "@/app/components/Sidebar";
import { getMe } from "@/lib/api";

export default async function AdminLayout({ children }: { children: React.ReactNode }) {
  const user = await getMe();

  if (!user) {
    return <main className="min-w-0 flex-1">{children}</main>;
  }

  return (
    <div className="flex min-h-screen flex-row">
      <Sidebar user={user} />
      <main className="ml-64 min-w-0 flex-1">{children}</main>
    </div>
  );
}
