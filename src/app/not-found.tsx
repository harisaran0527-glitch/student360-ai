export const dynamic = "force-dynamic";

export default function NotFound() {
  return (
    <div className="min-h-screen bg-slate-950 flex flex-col justify-center items-center p-6 text-center text-slate-100">
      <div className="p-8 rounded-3xl border border-indigo-500/30 max-w-md w-full space-y-5 bg-slate-900">
        <h2 className="text-xl font-bold text-white">404 — Page Not Found</h2>
        <p className="text-xs text-slate-400">The requested page or route does not exist.</p>
        <div className="pt-2">
          <a
            href="/"
            className="px-4 py-2.5 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white font-bold text-xs inline-block"
          >
            Return to Dashboard
          </a>
        </div>
      </div>
    </div>
  );
}
