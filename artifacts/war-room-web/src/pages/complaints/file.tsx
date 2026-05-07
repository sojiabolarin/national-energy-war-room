import { useState, useRef, useCallback, useEffect } from "react";
import { useNavigate, useSearchParams, Link } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Skeleton } from "@/components/ui/skeleton";
import {
  Loader2, MapPin, Upload, Zap, LightbulbOff, FileText,
  AlertTriangle, CheckCircle2, X, MessageCircle, ChevronLeft,
  Gauge, CreditCard, Construction, PlugZap, RefreshCcw, FlaskConical,
} from "lucide-react";
import { useToast } from "@/hooks/use-toast";

const DISCOS_API = "/api/v1/complaints/discos";

interface DiscoOption { id: string; name: string; operatorName: string }

const CATEGORIES = [
  { id: "SUPPLY_INTERRUPTION",  label: "Power Outage",          icon: <LightbulbOff className="w-5 h-5" /> },
  { id: "BILLING",              label: "Billing Issue",          icon: <CreditCard className="w-5 h-5" /> },
  { id: "METERING",             label: "Metering Issue",         icon: <Gauge className="w-5 h-5" /> },
  { id: "ESTIMATED_BILLING",    label: "Estimated Billing",      icon: <FileText className="w-5 h-5" /> },
  { id: "VOLTAGE",              label: "Voltage Problem",        icon: <Zap className="w-5 h-5" /> },
  { id: "ELECTROCUTION",        label: "Safety / Electrocution", icon: <AlertTriangle className="w-5 h-5" /> },
  { id: "INFRASTRUCTURE_DAMAGE",label: "Infrastructure Damage",  icon: <Construction className="w-5 h-5" /> },
  { id: "CONNECTION_DELAY",     label: "Connection Delay",       icon: <PlugZap className="w-5 h-5" /> },
  { id: "DISCONNECTION",        label: "Wrongful Disconnection", icon: <X className="w-5 h-5" /> },
  { id: "REFUND",               label: "Refund Request",         icon: <RefreshCcw className="w-5 h-5" /> },
  { id: "ENERGY_THEFT_REPORT",  label: "Energy Theft Report",    icon: <FlaskConical className="w-5 h-5" /> },
  { id: "OTHER",                label: "Other",                  icon: <FileText className="w-5 h-5" /> },
];

const MAX_FILES = 3;
const MAX_TOTAL_BYTES = 10 * 1024 * 1024;

interface SuccessState {
  ticketNumber: string;
  id: string;
  satisfactionToken: string;
  phone: string;
}

function readFileAsDataUrl(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(reader.result as string);
    reader.onerror = () => reject(reader.error);
    reader.readAsDataURL(file);
  });
}

export default function FileComplaint() {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const { toast } = useToast();
  const fileInputRef = useRef<HTMLInputElement>(null);

  const [discos, setDiscos] = useState<DiscoOption[]>([]);
  const [discosLoading, setDiscosLoading] = useState(false);
  const [discosFetched, setDiscosFetched] = useState(false);

  const [citizenName, setCitizenName] = useState("");
  const [citizenPhone, setCitizenPhone] = useState("");
  const [citizenEmail, setCitizenEmail] = useState("");
  const [discoId, setDiscoId] = useState("");
  const [category, setCategory] = useState(searchParams.get("category") ?? "");
  const [description, setDescription] = useState("");
  const [location, setLocation] = useState("");
  const [captcha, setCaptcha] = useState("");
  const [files, setFiles] = useState<File[]>([]);
  const [success, setSuccess] = useState<SuccessState | null>(null);
  const [isPending, setIsPending] = useState(false);

  useEffect(() => {
    const cat = searchParams.get("category");
    if (cat) setCategory(cat);
  }, [searchParams]);

  const fetchDiscos = useCallback(async () => {
    if (discosFetched || discosLoading) return;
    setDiscosLoading(true);
    try {
      const res = await fetch(DISCOS_API);
      if (res.ok) {
        const json = await res.json() as { data?: { id: string; name: string; operatorOrg?: { name?: string } }[] };
        setDiscos(
          (json.data ?? []).map((d) => ({
            id: d.id,
            name: d.name,
            operatorName: d.operatorOrg?.name ?? d.name,
          }))
        );
      }
    } catch { /* fallback */ }
    finally {
      setDiscosLoading(false);
      setDiscosFetched(true);
    }
  }, [discosFetched, discosLoading]);

  const handleFileChange = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    const selected = Array.from(e.target.files ?? []);
    const combined = [...files, ...selected].slice(0, MAX_FILES);
    const totalSize = combined.reduce((s, f) => s + f.size, 0);
    if (totalSize > MAX_TOTAL_BYTES) {
      toast({ title: "Files too large", description: "Total size must not exceed 10 MB.", variant: "destructive" });
      return;
    }
    setFiles(combined);
    if (fileInputRef.current) fileInputRef.current.value = "";
  }, [files, toast]);

  const removeFile = useCallback((idx: number) => {
    setFiles((prev) => prev.filter((_, i) => i !== idx));
  }, []);

  const handleGeolocation = () => {
    if (!navigator.geolocation) {
      toast({ title: "Geolocation not supported by this device.", variant: "destructive" });
      return;
    }
    navigator.geolocation.getCurrentPosition(
      (pos) => setLocation(`${pos.coords.latitude.toFixed(5)}, ${pos.coords.longitude.toFixed(5)}`),
      () => toast({ title: "Could not get location. Please type it manually.", variant: "destructive" }),
    );
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!citizenName.trim() || citizenPhone.trim().length < 10) {
      toast({ title: "Please fill in your name and a valid phone number.", variant: "destructive" });
      return;
    }
    if (captcha.trim() !== "10") {
      toast({ title: "Incorrect verification answer", variant: "destructive" });
      return;
    }
    if (!category) {
      toast({ title: "Please select a complaint category", variant: "destructive" });
      return;
    }
    if (!discoId) {
      toast({ title: "Please select a DisCo", variant: "destructive" });
      return;
    }

    setIsPending(true);
    try {
      const photos = files.length > 0 ? await Promise.all(files.map(readFileAsDataUrl)) : undefined;
      const body: Record<string, unknown> = {
        citizenName,
        citizenPhone,
        discoId,
        category,
        description,
        source: "WEB",
      };
      if (citizenEmail) body.citizenEmail = citizenEmail;
      if (location) body.location = location;
      if (photos) body.photos = photos;

      const res = await fetch("/api/v1/complaints", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      });

      if (!res.ok) {
        const errBody = await res.json().catch(() => ({})) as { error?: { message?: string } };
        toast({
          title: "Submission failed",
          description: errBody.error?.message ?? `Server error ${res.status}`,
          variant: "destructive",
        });
        return;
      }

      const json = await res.json() as {
        data?: { ticketNumber?: string; id?: string; satisfactionToken?: string };
      };
      const ticketNumber = json.data?.ticketNumber ?? "WR-UNKNOWN";
      const id = json.data?.id ?? "";
      const satisfactionToken = json.data?.satisfactionToken ?? "";

      setSuccess({ ticketNumber, id, satisfactionToken, phone: citizenPhone.slice(-4) });
    } catch (err) {
      toast({
        title: "Failed to submit complaint. Please try again.",
        description: err instanceof Error ? err.message : undefined,
        variant: "destructive",
      });
    } finally {
      setIsPending(false);
    }
  };

  if (success) {
    const satParam = success.id && success.satisfactionToken
      ? `${success.id}.${success.satisfactionToken}`
      : success.id || "unknown";
    const trackUrl = `/complaints/track?ticket=${encodeURIComponent(success.ticketNumber)}&phone=${success.phone}`;
    const waText = encodeURIComponent(
      `My electricity complaint has been filed with WestMetro.\n\nTicket: ${success.ticketNumber}\nTrack: ${window.location.origin}${trackUrl}\n\nPowered by NERC Consumer Protection Portal.`
    );

    return (
      <div className="min-h-screen bg-background text-foreground flex flex-col items-center justify-center p-6 gap-6">
        <div className="w-20 h-20 bg-primary/10 rounded-full flex items-center justify-center">
          <CheckCircle2 className="w-10 h-10 text-primary" />
        </div>
        <div className="text-center space-y-2">
          <h1 className="text-2xl font-black uppercase tracking-wider">Complaint Filed</h1>
          <p className="text-muted-foreground text-sm">
            Your complaint has been received. Save your ticket number to track progress.
          </p>
        </div>
        <div className="bg-card border border-primary/40 rounded-sm px-8 py-5 text-center w-full max-w-xs">
          <div className="text-[10px] text-muted-foreground uppercase tracking-widest mb-2">Ticket Number</div>
          <div className="text-2xl font-mono font-black text-primary tracking-wider">{success.ticketNumber}</div>
          <div className="text-[10px] text-muted-foreground mt-2 uppercase tracking-wide">Save this number to track your complaint</div>
        </div>
        <div className="flex flex-col gap-3 w-full max-w-xs">
          <a
            href={`https://wa.me/?text=${waText}`}
            target="_blank"
            rel="noopener noreferrer"
            className="flex items-center justify-center gap-2 bg-[#25D366] text-white font-black py-3.5 px-6 rounded-sm uppercase tracking-wider hover:opacity-90 transition-opacity"
          >
            <MessageCircle className="w-5 h-5" />
            Share on WhatsApp
          </a>
          <button
            onClick={() => navigate(trackUrl)}
            className="flex items-center justify-center gap-2 bg-primary text-primary-foreground font-bold py-3 px-6 rounded-sm uppercase tracking-wider hover:bg-primary/90 transition-colors"
          >
            Track My Complaint
          </button>
          {satParam !== "unknown" && (
            <button
              onClick={() => navigate(`/complaints/satisfaction/${satParam}`)}
              className="text-sm text-muted-foreground hover:text-foreground transition-colors py-2"
            >
              Rate This Service
            </button>
          )}
          <button
            onClick={() => { setSuccess(null); setCitizenName(""); setCitizenPhone(""); setDiscoId(""); setCategory(""); setDescription(""); setLocation(""); setCaptcha(""); setFiles([]); }}
            className="text-sm text-muted-foreground hover:text-foreground transition-colors py-2"
          >
            File Another Complaint
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background text-foreground pb-24">
      {/* Header */}
      <div className="bg-primary text-primary-foreground px-4 py-4 sticky top-0 z-10 shadow-md">
        <div className="max-w-md mx-auto flex items-center gap-3">
          <Link to="/complaints" className="text-primary-foreground/80 hover:text-primary-foreground">
            <ChevronLeft className="w-5 h-5" />
          </Link>
          <div className="flex items-center gap-2 flex-1 justify-center">
            <span className="inline-flex items-center justify-center bg-white rounded-full p-0.5 shrink-0">
              <img src="/ministry-logo.png" alt="WestMetro" className="h-7 w-7 rounded-full object-cover" />
            </span>
            <div>
              <div className="text-sm font-black uppercase tracking-widest leading-none">WestMetro</div>
              <div className="text-[10px] opacity-85 uppercase tracking-wider">File a Complaint</div>
            </div>
          </div>
          <div className="w-5" />
        </div>
      </div>

      <div className="max-w-md mx-auto px-4 mt-5">
        <form onSubmit={handleSubmit} className="space-y-6">

          {/* Category picker */}
          <div className="space-y-3">
            <Label className="uppercase text-xs font-bold tracking-widest text-muted-foreground">
              What type of complaint?
            </Label>
            <div className="grid grid-cols-2 gap-2">
              {CATEGORIES.map((cat) => (
                <div
                  key={cat.id}
                  onClick={() => setCategory(cat.id)}
                  role="button"
                  tabIndex={0}
                  onKeyDown={(e) => e.key === "Enter" && setCategory(cat.id)}
                  className={`p-3 border rounded-sm flex items-center gap-2.5 cursor-pointer transition-colors ${
                    category === cat.id
                      ? "bg-primary/15 border-primary text-primary"
                      : "bg-card border-border hover:bg-secondary"
                  }`}
                >
                  <span className={category === cat.id ? "text-primary" : "text-muted-foreground"}>{cat.icon}</span>
                  <span className="text-xs font-bold leading-tight">{cat.label}</span>
                </div>
              ))}
            </div>
          </div>

          {/* Form fields */}
          <div className="space-y-4 bg-card border border-border p-4 rounded-sm">
            <div className="space-y-2">
              <Label>Distribution Company (DisCo)</Label>
              <Select
                value={discoId}
                onValueChange={setDiscoId}
                onOpenChange={(open) => { if (open) fetchDiscos(); }}
                required
              >
                <SelectTrigger className="bg-background">
                  <SelectValue placeholder={discosLoading ? "Loading DisCos…" : "Select your DisCo"} />
                </SelectTrigger>
                <SelectContent>
                  {discosLoading && (
                    <div className="p-2">
                      <Skeleton className="h-6 w-full mb-1" />
                      <Skeleton className="h-6 w-full mb-1" />
                      <Skeleton className="h-6 w-3/4" />
                    </div>
                  )}
                  {!discosLoading && discos.map((d) => (
                    <SelectItem key={d.id} value={d.id}>
                      {d.operatorName}
                    </SelectItem>
                  ))}
                  {!discosLoading && discos.length === 0 && discosFetched && (
                    <div className="p-2 text-xs text-muted-foreground">No DisCos available</div>
                  )}
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label>Your Full Name</Label>
              <Input
                required
                value={citizenName}
                onChange={(e) => setCitizenName(e.target.value)}
                autoComplete="name"
                className="bg-background"
                placeholder="e.g. Abubakar Musa"
              />
            </div>

            <div className="space-y-2">
              <Label>Phone Number <span className="text-muted-foreground text-xs font-normal">(for SMS updates)</span></Label>
              <Input
                required
                type="tel"
                value={citizenPhone}
                onChange={(e) => setCitizenPhone(e.target.value)}
                autoComplete="tel"
                className="bg-background font-mono"
                placeholder="08012345678"
              />
            </div>

            <div className="space-y-2">
              <Label>Email Address <span className="text-muted-foreground text-xs font-normal">(optional)</span></Label>
              <Input
                type="email"
                value={citizenEmail}
                onChange={(e) => setCitizenEmail(e.target.value)}
                autoComplete="email"
                className="bg-background"
                placeholder="you@example.com"
              />
            </div>

            <div className="space-y-2">
              <Label>Describe the Issue</Label>
              <Textarea
                required
                minLength={10}
                className="min-h-[110px] bg-background"
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                placeholder="Please describe the problem in detail — when it started, how it affects you, etc."
              />
            </div>

            <div className="space-y-2">
              <Label>Location <span className="text-muted-foreground text-xs font-normal">(optional)</span></Label>
              <div className="flex gap-2">
                <Input
                  value={location}
                  onChange={(e) => setLocation(e.target.value)}
                  placeholder="Street address or GPS coordinates"
                  className="bg-background flex-1"
                />
                <Button type="button" variant="outline" onClick={handleGeolocation} className="shrink-0" title="Use my location">
                  <MapPin className="w-4 h-4" />
                </Button>
              </div>
            </div>

            {/* Photo upload */}
            <div className="space-y-2">
              <Label>
                Photo Evidence{" "}
                <span className="text-muted-foreground text-xs normal-case font-normal">
                  (max {MAX_FILES} photos · 10 MB total)
                </span>
              </Label>
              <input
                ref={fileInputRef}
                type="file"
                accept="image/*"
                multiple
                className="sr-only"
                onChange={handleFileChange}
                disabled={files.length >= MAX_FILES}
              />
              {files.length > 0 && (
                <div className="space-y-1 mb-2">
                  {files.map((f, i) => (
                    <div key={i} className="flex items-center justify-between text-xs bg-secondary rounded-sm px-3 py-1.5">
                      <span className="truncate max-w-[220px] font-mono">{f.name}</span>
                      <button type="button" onClick={() => removeFile(i)} className="text-muted-foreground hover:text-destructive ml-2">
                        <X size={14} />
                      </button>
                    </div>
                  ))}
                </div>
              )}
              {files.length < MAX_FILES && (
                <button
                  type="button"
                  onClick={() => fileInputRef.current?.click()}
                  className="w-full border-2 border-dashed border-border rounded-sm p-4 text-center hover:bg-secondary/50 transition-colors"
                >
                  <Upload className="w-6 h-6 mx-auto text-muted-foreground mb-1" />
                  <span className="text-xs text-muted-foreground">
                    Tap to add photo ({files.length}/{MAX_FILES})
                  </span>
                </button>
              )}
            </div>

            {/* CAPTCHA */}
            <div className="space-y-2 pt-2 border-t border-border">
              <Label>Spam check: What is 7 + 3?</Label>
              <Input
                required
                value={captcha}
                onChange={(e) => setCaptcha(e.target.value)}
                className="bg-background font-mono w-28"
                placeholder="Answer"
                inputMode="numeric"
              />
            </div>
          </div>

          <Button
            type="submit"
            className="w-full bg-primary hover:bg-primary/90 text-primary-foreground font-black py-6 text-base rounded-sm uppercase tracking-wider"
            disabled={isPending || !category || !discoId}
          >
            {isPending ? <Loader2 className="w-5 h-5 animate-spin mr-2" /> : null}
            Submit Complaint
          </Button>

          <p className="text-center text-[10px] text-muted-foreground uppercase tracking-widest font-mono pb-4">
            WestMetro · NERC Consumer Protection · Powered by National Energy War Room
          </p>
        </form>
      </div>
    </div>
  );
}
