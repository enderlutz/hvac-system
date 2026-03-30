import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Tech Portal — HVAC",
  description: "Field technician job submission portal",
};

export default function FieldLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="min-h-screen bg-gray-950 text-white">
      {/* Header */}
      <header className="sticky top-0 z-10 bg-gray-900 border-b border-gray-800 px-4 py-3">
        <div className="max-w-lg mx-auto flex items-center gap-3">
          <div className="w-8 h-8 rounded-lg bg-green-700 flex items-center justify-center text-white font-bold text-sm">
            L
          </div>
          <div>
            <div className="font-semibold text-sm leading-tight">Tech Portal</div>
            <div className="text-xs text-gray-400">Lucks Air and Heat</div>
          </div>
        </div>
      </header>

      <main className="max-w-lg mx-auto px-4 py-6 pb-16">
        {children}
      </main>
    </div>
  );
}
