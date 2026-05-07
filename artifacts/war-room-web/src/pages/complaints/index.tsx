import { useNavigate } from "react-router-dom";
import { FileText, Search, Star, Zap, Shield, Clock, ChevronRight } from "lucide-react";

export default function CitizenPortalHome() {
  const navigate = useNavigate();

  return (
    <div className="min-h-screen bg-background text-foreground flex flex-col">
      {/* Header */}
      <header className="bg-primary text-primary-foreground shadow-lg">
        <div className="max-w-md mx-auto px-4 py-6 text-center">
          <div className="flex items-center justify-center mb-3">
            <span className="inline-flex items-center justify-center bg-white rounded-full p-1 mr-3">
              <img
                src="/ministry-logo.png"
                alt="WestMetro Energy"
                className="h-10 w-10 rounded-full object-cover"
              />
            </span>
            <div className="text-left">
              <div className="text-xl font-black uppercase tracking-widest leading-none">WestMetro</div>
              <div className="text-xs opacity-90 font-medium uppercase tracking-wider">Consumer Protection Portal</div>
            </div>
          </div>
          <p className="text-sm opacity-85 max-w-xs mx-auto mt-2">
            File and track electricity complaints with your DisCo — fast, free, and transparent.
          </p>
        </div>
      </header>

      {/* Hero actions */}
      <main className="flex-1 max-w-md mx-auto w-full px-4 py-8 space-y-4">
        <button
          onClick={() => navigate("/complaints/file")}
          className="w-full bg-primary text-primary-foreground rounded-sm p-5 flex items-center gap-4 hover:bg-primary/90 active:scale-[0.98] transition-all shadow-md"
        >
          <div className="bg-white/20 rounded-full p-3 shrink-0">
            <FileText className="w-7 h-7" />
          </div>
          <div className="text-left flex-1">
            <div className="font-black uppercase tracking-wider text-base">File a Complaint</div>
            <div className="text-xs opacity-85 mt-0.5">
              Report power outages, billing issues, safety hazards and more
            </div>
          </div>
          <ChevronRight className="w-5 h-5 opacity-70 shrink-0" />
        </button>

        <button
          onClick={() => navigate("/complaints/track")}
          className="w-full bg-card border border-border rounded-sm p-5 flex items-center gap-4 hover:bg-secondary active:scale-[0.98] transition-all shadow-sm"
        >
          <div className="bg-primary/10 rounded-full p-3 shrink-0">
            <Search className="w-7 h-7 text-primary" />
          </div>
          <div className="text-left flex-1">
            <div className="font-black uppercase tracking-wider text-base">Track a Complaint</div>
            <div className="text-xs text-muted-foreground mt-0.5">
              Check the status of an existing complaint with your ticket number
            </div>
          </div>
          <ChevronRight className="w-5 h-5 text-muted-foreground shrink-0" />
        </button>

        {/* Why use us */}
        <div className="mt-8">
          <h2 className="text-xs font-bold uppercase tracking-widest text-muted-foreground mb-4 text-center">
            Why use this portal?
          </h2>
          <div className="grid grid-cols-3 gap-3">
            {[
              { icon: <Shield className="w-5 h-5" />, label: "Official Channel" },
              { icon: <Clock className="w-5 h-5" />, label: "Real-time Updates" },
              { icon: <Star className="w-5 h-5" />, label: "Rate Your Service" },
            ].map(({ icon, label }) => (
              <div
                key={label}
                className="bg-card border border-border rounded-sm p-3 flex flex-col items-center gap-2 text-center"
              >
                <span className="text-primary">{icon}</span>
                <span className="text-[11px] font-bold uppercase tracking-wide text-muted-foreground leading-tight">
                  {label}
                </span>
              </div>
            ))}
          </div>
        </div>

        {/* Category shortcuts */}
        <div className="mt-2">
          <h2 className="text-xs font-bold uppercase tracking-widest text-muted-foreground mb-3 text-center">
            Common complaints
          </h2>
          <div className="grid grid-cols-2 gap-2">
            {[
              { label: "Power Outage", cat: "SUPPLY_INTERRUPTION" },
              { label: "Billing / Metering", cat: "BILLING" },
              { label: "Voltage Problem", cat: "VOLTAGE" },
              { label: "Safety Hazard", cat: "ELECTROCUTION" },
            ].map(({ label, cat }) => (
              <button
                key={cat}
                onClick={() => navigate(`/complaints/file?category=${cat}`)}
                className="bg-card border border-border rounded-sm px-3 py-2.5 text-xs font-bold uppercase tracking-wide hover:bg-secondary hover:border-primary/40 transition-colors text-left flex items-center gap-2"
              >
                <Zap className="w-3.5 h-3.5 text-primary shrink-0" />
                {label}
              </button>
            ))}
          </div>
        </div>
      </main>

      {/* Footer */}
      <footer className="max-w-md mx-auto w-full px-4 py-6 text-center">
        <p className="text-[10px] text-muted-foreground uppercase tracking-widest font-mono">
          WestMetro Energy · Powered by NERC War Room
        </p>
        <p className="text-[10px] text-muted-foreground mt-1">
          For emergencies call <span className="font-bold text-primary">080-NERC-HELP</span>
        </p>
      </footer>
    </div>
  );
}
