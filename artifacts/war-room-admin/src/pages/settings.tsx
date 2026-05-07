import { useState, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { Loader2, Save, Settings, Bell, Shield, Globe, Database, Tag } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { useAuth } from "@/lib/auth";

interface SlaCategoryOverride {
  category: string;
  slaHours: number;
}

interface SettingsState {
  systemName: string;
  systemTagline: string;
  supportEmail: string;
  timezone: string;
  classificationBannerText: string;
  classificationBannerEnabled: boolean;
  classificationLevel: string;
  panelStrategicNote: string;
  defaultSlaHours: number;
  escalationSlaHours: number;
  slaOverrides: SlaCategoryOverride[];
  enableEmailNotifications: boolean;
  enableSmsNotifications: boolean;
  notificationRecipients: string;
  maintenanceMode: boolean;
  maintenanceMessage: string;
  sessionTimeoutMins: number;
  maxLoginAttempts: number;
  requireMfa: boolean;
  allowedCorsOrigins: string;
  dataRetentionDays: number;
  auditLogRetentionDays: number;
}

const COMPLAINT_CATEGORIES = ["BILLING", "OUTAGE", "METERING", "QUALITY", "CONNECTION", "OTHER"];

const DEFAULT_SETTINGS: SettingsState = {
  systemName: "National Energy War Room",
  systemTagline: "Federal Republic of Nigeria — Ministry of Power",
  supportEmail: "support@warroom.gov.ng",
  timezone: "Africa/Lagos",
  classificationBannerText: "OFFICIAL — SENSITIVE | For Authorised Personnel Only",
  classificationBannerEnabled: true,
  classificationLevel: "OFFICIAL_SENSITIVE",
  panelStrategicNote: "All data displayed is subject to the Official Secrets Act. Unauthorised disclosure is a criminal offence.",
  defaultSlaHours: 72,
  escalationSlaHours: 24,
  slaOverrides: [
    { category: "BILLING", slaHours: 72 },
    { category: "OUTAGE", slaHours: 24 },
    { category: "METERING", slaHours: 96 },
    { category: "QUALITY", slaHours: 48 },
    { category: "CONNECTION", slaHours: 120 },
    { category: "OTHER", slaHours: 72 },
  ],
  enableEmailNotifications: true,
  enableSmsNotifications: false,
  notificationRecipients: "escalations@warroom.gov.ng",
  maintenanceMode: false,
  maintenanceMessage: "The War Room admin portal is currently undergoing scheduled maintenance. Please try again in 30 minutes.",
  sessionTimeoutMins: 60,
  maxLoginAttempts: 5,
  requireMfa: false,
  allowedCorsOrigins: "https://warroom.gov.ng\nhttps://admin.warroom.gov.ng",
  dataRetentionDays: 730,
  auditLogRetentionDays: 1095,
};

function SettingsSection({ title, icon: Icon, children }: { title: string; icon: React.ElementType; children: React.ReactNode }) {
  return (
    <Card className="bg-card border-border">
      <CardHeader className="border-b border-border pb-3">
        <CardTitle className="text-sm font-bold uppercase tracking-wider flex items-center gap-2">
          <Icon className="w-4 h-4 text-primary" />
          {title}
        </CardTitle>
      </CardHeader>
      <CardContent className="p-4 space-y-4">
        {children}
      </CardContent>
    </Card>
  );
}

function SettingsRow({ label, description, children }: { label: string; description?: string; children: React.ReactNode }) {
  return (
    <div className="flex items-start justify-between gap-4">
      <div className="flex-1 min-w-0">
        <p className="text-xs font-bold text-foreground">{label}</p>
        {description && <p className="text-[10px] text-muted-foreground mt-0.5">{description}</p>}
      </div>
      <div className="shrink-0">{children}</div>
    </div>
  );
}

export default function SettingsPage() {
  const { toast } = useToast();
  const { accessToken } = useAuth();
  const [settings, setSettings] = useState<SettingsState>(DEFAULT_SETTINGS);
  const [saving, setSaving] = useState(false);
  const [loading, setLoading] = useState(true);
  const [activeSection, setActiveSection] = useState("general");

  useEffect(() => {
    async function loadSettings() {
      try {
        const headers: Record<string, string> = {};
        if (accessToken) headers["Authorization"] = `Bearer ${accessToken}`;
        const res = await fetch("/api/v1/admin/settings", { headers });
        if (!res.ok) return;
        const json = await res.json() as { data?: Record<string, string> };
        const raw = json.data ?? {};
        setSettings((prev) => {
          const merged = { ...prev };
          for (const [k, v] of Object.entries(raw)) {
            try {
              const parsed = JSON.parse(v) as unknown;
              if (k in merged) (merged as Record<string, unknown>)[k] = parsed;
            } catch { /* ignore unparseable values */ }
          }
          return merged;
        });
      } catch { /* silently use defaults */ } finally {
        setLoading(false);
      }
    }
    void loadSettings();
  }, [accessToken]);

  function set<K extends keyof SettingsState>(key: K, value: SettingsState[K]) {
    setSettings((prev) => ({ ...prev, [key]: value }));
  }

  function updateSlaOverride(category: string, hours: number) {
    setSettings((prev) => ({
      ...prev,
      slaOverrides: prev.slaOverrides.map((o) =>
        o.category === category ? { ...o, slaHours: hours } : o,
      ),
    }));
  }

  async function handleSave(section?: string) {
    setSaving(true);
    try {
      const headers: Record<string, string> = { "Content-Type": "application/json" };
      if (accessToken) headers["Authorization"] = `Bearer ${accessToken}`;
      const res = await fetch("/api/v1/admin/settings", {
        method: "PUT",
        headers,
        body: JSON.stringify(settings),
      });
      if (!res.ok) throw new Error(`Server error ${res.status}`);
      toast({ title: "Settings saved", description: section ? `${section} settings updated` : "All settings saved" });
    } catch (err) {
      const msg = err instanceof Error ? err.message : "Unknown error";
      toast({ title: "Save failed", description: msg, variant: "destructive" });
    } finally {
      setSaving(false);
    }
  }

  const sections = [
    { key: "general", label: "General", icon: Globe },
    { key: "classification", label: "Classification", icon: Tag },
    { key: "sla", label: "SLA & Escalation", icon: Settings },
    { key: "notifications", label: "Notifications", icon: Bell },
    { key: "security", label: "Security", icon: Shield },
    { key: "data", label: "Data Retention", icon: Database },
  ];

  return (
    <div className="p-6 space-y-4 max-w-4xl mx-auto">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-xl font-bold uppercase tracking-widest">Settings</h1>
          <p className="text-xs text-muted-foreground mt-0.5">System-wide configuration</p>
        </div>
        <Button size="sm" className="gap-2 bg-primary hover:bg-primary/90" onClick={() => handleSave()} disabled={saving}>
          {saving && <Loader2 className="w-3.5 h-3.5 animate-spin" />}
          <Save className="w-3.5 h-3.5" />
          Save All
        </Button>
      </div>

      <div className="flex gap-1 flex-wrap border-b border-border pb-0">
        {sections.map((s) => (
          <button key={s.key} onClick={() => setActiveSection(s.key)}
            className={`flex items-center gap-1.5 px-3 py-2 text-xs font-bold uppercase tracking-wider border-b-2 transition-colors ${activeSection === s.key ? "border-primary text-primary" : "border-transparent text-muted-foreground hover:text-foreground"}`}>
            <s.icon className="w-3.5 h-3.5" />
            {s.label}
          </button>
        ))}
      </div>

      <div className="space-y-4">
        {activeSection === "general" && (
          <SettingsSection title="General" icon={Globe}>
            <div className="space-y-1">
              <Label className="text-[10px] uppercase tracking-wider text-muted-foreground">System Name</Label>
              <Input value={settings.systemName} onChange={(e) => set("systemName", e.target.value)} className="h-8 text-sm bg-background border-border" />
            </div>
            <div className="space-y-1">
              <Label className="text-[10px] uppercase tracking-wider text-muted-foreground">System Tagline</Label>
              <Input value={settings.systemTagline} onChange={(e) => set("systemTagline", e.target.value)} className="h-8 text-sm bg-background border-border" />
            </div>
            <div className="space-y-1">
              <Label className="text-[10px] uppercase tracking-wider text-muted-foreground">Support Email</Label>
              <Input type="email" value={settings.supportEmail} onChange={(e) => set("supportEmail", e.target.value)} className="h-8 text-sm bg-background border-border font-mono" />
            </div>
            <div className="space-y-1">
              <Label className="text-[10px] uppercase tracking-wider text-muted-foreground">Timezone</Label>
              <Select value={settings.timezone} onValueChange={(v) => set("timezone", v)}>
                <SelectTrigger className="h-8 text-sm bg-background border-border"><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="Africa/Lagos">Africa/Lagos (WAT, UTC+1)</SelectItem>
                  <SelectItem value="UTC">UTC</SelectItem>
                  <SelectItem value="Europe/London">Europe/London (GMT/BST)</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <SettingsRow label="Maintenance Mode" description="Displays a maintenance message to all users while allowing admin access">
              <Switch checked={settings.maintenanceMode} onCheckedChange={(v) => set("maintenanceMode", v)} />
            </SettingsRow>
            {settings.maintenanceMode && (
              <div className="space-y-1">
                <Label className="text-[10px] uppercase tracking-wider text-muted-foreground">Maintenance Message</Label>
                <Textarea value={settings.maintenanceMessage} onChange={(e) => set("maintenanceMessage", e.target.value)} className="text-xs min-h-[80px] bg-background border-border" />
              </div>
            )}
          </SettingsSection>
        )}

        {activeSection === "classification" && (
          <SettingsSection title="Classification & Panel Notes" icon={Tag}>
            <SettingsRow label="Classification Banner" description="Display a security classification banner at the top of the admin panel">
              <Switch checked={settings.classificationBannerEnabled} onCheckedChange={(v) => set("classificationBannerEnabled", v)} />
            </SettingsRow>
            <div className="space-y-1">
              <Label className="text-[10px] uppercase tracking-wider text-muted-foreground">Banner Text</Label>
              <Input
                value={settings.classificationBannerText}
                onChange={(e) => set("classificationBannerText", e.target.value)}
                className="h-8 text-sm bg-background border-border font-mono"
                placeholder="e.g. OFFICIAL — SENSITIVE | For Authorised Personnel Only"
              />
            </div>
            <div className="space-y-1">
              <Label className="text-[10px] uppercase tracking-wider text-muted-foreground">Classification Level</Label>
              <Select value={settings.classificationLevel} onValueChange={(v) => set("classificationLevel", v)}>
                <SelectTrigger className="h-8 text-sm bg-background border-border"><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="UNCLASSIFIED">UNCLASSIFIED</SelectItem>
                  <SelectItem value="OFFICIAL">OFFICIAL</SelectItem>
                  <SelectItem value="OFFICIAL_SENSITIVE">OFFICIAL — SENSITIVE</SelectItem>
                  <SelectItem value="SECRET">SECRET</SelectItem>
                  <SelectItem value="TOP_SECRET">TOP SECRET</SelectItem>
                </SelectContent>
              </Select>
            </div>
            {settings.classificationBannerEnabled && (
              <div className="p-2 rounded border text-[10px] font-bold text-center uppercase tracking-widest bg-yellow-900/30 border-yellow-600/50 text-yellow-400">
                Preview: {settings.classificationBannerText}
              </div>
            )}
            <div className="space-y-1">
              <Label className="text-[10px] uppercase tracking-wider text-muted-foreground">Strategic Panel Note</Label>
              <p className="text-[10px] text-muted-foreground">Displayed on the dashboard as a standing strategic notice for all admin staff</p>
              <Textarea
                value={settings.panelStrategicNote}
                onChange={(e) => set("panelStrategicNote", e.target.value)}
                className="text-xs min-h-[80px] bg-background border-border"
                placeholder="Enter standing strategic notice…"
              />
            </div>
          </SettingsSection>
        )}

        {activeSection === "sla" && (
          <SettingsSection title="SLA & Escalation" icon={Settings}>
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-1">
                <Label className="text-[10px] uppercase tracking-wider text-muted-foreground">Default SLA (hours)</Label>
                <p className="text-[10px] text-muted-foreground">Applies when no per-category override is set</p>
                <Input type="number" min={1} value={settings.defaultSlaHours} onChange={(e) => set("defaultSlaHours", parseInt(e.target.value))} className="h-8 text-sm bg-background border-border" />
              </div>
              <div className="space-y-1">
                <Label className="text-[10px] uppercase tracking-wider text-muted-foreground">Escalation SLA (hours)</Label>
                <p className="text-[10px] text-muted-foreground">Hours at each level before auto-escalation triggers</p>
                <Input type="number" min={1} value={settings.escalationSlaHours} onChange={(e) => set("escalationSlaHours", parseInt(e.target.value))} className="h-8 text-sm bg-background border-border" />
              </div>
            </div>

            <div className="space-y-2">
              <Label className="text-[10px] uppercase tracking-wider text-muted-foreground">Per-Category SLA Windows</Label>
              <p className="text-[10px] text-muted-foreground">Override the default SLA on a per-complaint-category basis</p>
              <div className="space-y-2">
                {settings.slaOverrides.map((override) => (
                  <div key={override.category} className="flex items-center gap-3">
                    <span className="text-xs font-bold text-foreground w-28 uppercase tracking-wider shrink-0">{override.category}</span>
                    <Input
                      type="number" min={1}
                      value={override.slaHours}
                      onChange={(e) => updateSlaOverride(override.category, parseInt(e.target.value) || 1)}
                      className="h-7 text-xs bg-background border-border w-24"
                    />
                    <span className="text-[10px] text-muted-foreground">hours</span>
                    {override.slaHours !== settings.defaultSlaHours && (
                      <span className="text-[10px] text-primary font-bold">override</span>
                    )}
                  </div>
                ))}
              </div>
            </div>

            <div className="p-3 rounded bg-primary/10 border border-primary/30 text-xs text-muted-foreground">
              <p className="font-bold text-foreground mb-1">SLA Logic</p>
              <ul className="list-disc list-inside space-y-1">
                <li>Category-specific SLA takes precedence over default</li>
                <li>Auto-escalation triggers after <span className="font-bold text-foreground">{settings.escalationSlaHours}h</span> at each level</li>
                <li>Level 4+ complaints trigger ministerial notification</li>
              </ul>
            </div>
          </SettingsSection>
        )}

        {activeSection === "notifications" && (
          <SettingsSection title="Notifications" icon={Bell}>
            <SettingsRow label="Email Notifications" description="Send email alerts for escalations, SLA breaches, and system events">
              <Switch checked={settings.enableEmailNotifications} onCheckedChange={(v) => set("enableEmailNotifications", v)} />
            </SettingsRow>
            <SettingsRow label="SMS Notifications" description="Send SMS alerts for critical escalations (NERC/Ministry staff)">
              <Switch checked={settings.enableSmsNotifications} onCheckedChange={(v) => set("enableSmsNotifications", v)} />
            </SettingsRow>
            <div className="space-y-1">
              <Label className="text-[10px] uppercase tracking-wider text-muted-foreground">Notification Recipients</Label>
              <p className="text-[10px] text-muted-foreground">Comma-separated email addresses for system notifications</p>
              <Textarea
                value={settings.notificationRecipients}
                onChange={(e) => set("notificationRecipients", e.target.value)}
                className="text-xs min-h-[60px] bg-background border-border font-mono"
                placeholder="email1@gov.ng, email2@gov.ng"
              />
            </div>
          </SettingsSection>
        )}

        {activeSection === "security" && (
          <SettingsSection title="Security" icon={Shield}>
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-1">
                <Label className="text-[10px] uppercase tracking-wider text-muted-foreground">Session Timeout (minutes)</Label>
                <Input type="number" min={5} value={settings.sessionTimeoutMins} onChange={(e) => set("sessionTimeoutMins", parseInt(e.target.value))} className="h-8 text-sm bg-background border-border" />
              </div>
              <div className="space-y-1">
                <Label className="text-[10px] uppercase tracking-wider text-muted-foreground">Max Login Attempts</Label>
                <Input type="number" min={3} max={10} value={settings.maxLoginAttempts} onChange={(e) => set("maxLoginAttempts", parseInt(e.target.value))} className="h-8 text-sm bg-background border-border" />
              </div>
            </div>
            <SettingsRow label="Require MFA" description="Require multi-factor authentication for all admin staff (TOTP)">
              <Switch checked={settings.requireMfa} onCheckedChange={(v) => set("requireMfa", v)} />
            </SettingsRow>
            <div className="space-y-1">
              <Label className="text-[10px] uppercase tracking-wider text-muted-foreground">Allowed CORS Origins</Label>
              <p className="text-[10px] text-muted-foreground">One origin per line. These domains may access the API from a browser.</p>
              <Textarea
                value={settings.allowedCorsOrigins}
                onChange={(e) => set("allowedCorsOrigins", e.target.value)}
                className="text-xs min-h-[80px] bg-background border-border font-mono"
                placeholder="https://warroom.gov.ng"
                spellCheck={false}
              />
              <div className="space-y-1 mt-2">
                <p className="text-[10px] text-muted-foreground uppercase tracking-wider font-bold">Currently configured:</p>
                <div className="flex flex-wrap gap-1">
                  {settings.allowedCorsOrigins.split(/\n|,/).map((o) => o.trim()).filter(Boolean).map((origin, i) => (
                    <span key={i} className="text-[10px] font-mono px-2 py-0.5 rounded bg-secondary border border-border text-muted-foreground">
                      {origin}
                    </span>
                  ))}
                </div>
              </div>
            </div>
            <div className="p-3 rounded bg-yellow-600/10 border border-yellow-600/30 text-xs text-yellow-400">
              <p className="font-bold mb-1">Security Notice</p>
              <p className="text-muted-foreground">All admin actions are logged to the immutable audit trail. Unauthorised access attempts are monitored and reported to the CISO office.</p>
            </div>
          </SettingsSection>
        )}

        {activeSection === "data" && (
          <SettingsSection title="Data Retention" icon={Database}>
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-1">
                <Label className="text-[10px] uppercase tracking-wider text-muted-foreground">Data Retention (days)</Label>
                <p className="text-[10px] text-muted-foreground">Complaints and records older than this are archived</p>
                <Input type="number" min={90} value={settings.dataRetentionDays} onChange={(e) => set("dataRetentionDays", parseInt(e.target.value))} className="h-8 text-sm bg-background border-border" />
              </div>
              <div className="space-y-1">
                <Label className="text-[10px] uppercase tracking-wider text-muted-foreground">Audit Log Retention (days)</Label>
                <p className="text-[10px] text-muted-foreground">Audit entries older than this are purged (min. 3 years recommended)</p>
                <Input type="number" min={365} value={settings.auditLogRetentionDays} onChange={(e) => set("auditLogRetentionDays", parseInt(e.target.value))} className="h-8 text-sm bg-background border-border" />
              </div>
            </div>
            <div className="p-3 rounded bg-destructive/10 border border-destructive/30 text-xs text-destructive">
              <p className="font-bold mb-1">Data Deletion Warning</p>
              <p>Changing retention periods affects when data is permanently purged. Consult the Data Protection Officer before reducing values. FOIA obligations may require minimum 7-year retention.</p>
            </div>
          </SettingsSection>
        )}
      </div>

      <div className="flex justify-end pt-2">
        <Button size="sm" className="gap-2 bg-primary hover:bg-primary/90" onClick={() => handleSave(sections.find((s) => s.key === activeSection)?.label)} disabled={saving}>
          {saving && <Loader2 className="w-3.5 h-3.5 animate-spin" />}
          <Save className="w-3.5 h-3.5" />
          Save {sections.find((s) => s.key === activeSection)?.label} Settings
        </Button>
      </div>
    </div>
  );
}
