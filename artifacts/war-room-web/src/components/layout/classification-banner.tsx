export function ClassificationBanner() {
  return (
    <div className="fixed top-0 left-0 w-full z-50 bg-primary text-primary-foreground flex items-center justify-center gap-3 py-1 px-4">
      <span className="inline-flex items-center justify-center bg-white rounded-full p-0.5 shrink-0">
        <img src="/ministry-logo.png" alt="Ministry of Power" className="h-5 w-5 rounded-full object-cover" />
      </span>
      <span className="font-bold tracking-widest text-xs uppercase">
        RESTRICTED — Federal Ministry of Power · Minister's War Room
      </span>
      <span className="inline-flex items-center justify-center bg-white rounded-full p-0.5 shrink-0" aria-hidden="true">
        <img src="/ministry-logo.png" alt="" className="h-5 w-5 rounded-full object-cover" />
      </span>
    </div>
  );
}
