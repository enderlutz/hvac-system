import { Sidebar } from "@/components/dashboard/sidebar";

export default function DashboardLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="flex min-h-screen">
      <Sidebar />
      <main
        className="flex-1 overflow-auto"
        style={{ background: "#f0f7f2" }}
      >
        <div className="p-8">{children}</div>
      </main>
    </div>
  );
}
