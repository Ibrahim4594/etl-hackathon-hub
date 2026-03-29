"use client";

import { useEffect, useState } from "react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import {
  Settings,
  Scale,
  Trophy,
  Users,
  Globe,
  Save,
  Loader2,
  RotateCcw,
  CheckCircle,
  AlertTriangle,
} from "lucide-react";
import { toast } from "sonner";

interface SettingsState {
  "judging.ai_weight": string;
  "judging.human_weight": string;
  "judging.finalist_count": string;
  "competition.max_team_size": string;
  "competition.min_team_size": string;
  "competition.max_screenshots": string;
  "platform.name": string;
  "platform.support_email": string;
  "platform.maintenance_mode": string;
  [key: string]: string;
}

const DEFAULTS: SettingsState = {
  "judging.ai_weight": "30",
  "judging.human_weight": "70",
  "judging.finalist_count": "10",
  "competition.max_team_size": "4",
  "competition.min_team_size": "1",
  "competition.max_screenshots": "5",
  "platform.name": "Competition Spark",
  "platform.support_email": "support@competitionspark.com",
  "platform.maintenance_mode": "false",
};

export function SettingsForm() {
  const [settings, setSettings] = useState<SettingsState>(DEFAULTS);
  const [original, setOriginal] = useState<SettingsState>(DEFAULTS);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    fetch("/api/admin/settings")
      .then((r) => r.json())
      .then((data) => {
        if (data.settings) {
          setSettings(data.settings);
          setOriginal(data.settings);
        }
      })
      .catch(() => toast.error("Failed to load settings"))
      .finally(() => setLoading(false));
  }, []);

  const hasChanges = JSON.stringify(settings) !== JSON.stringify(original);

  const update = (key: string, value: string) => {
    setSettings((prev) => ({ ...prev, [key]: value }));

    // Auto-sync judging weights
    if (key === "judging.ai_weight") {
      const ai = Math.min(100, Math.max(0, Number(value) || 0));
      setSettings((prev) => ({ ...prev, "judging.ai_weight": String(ai), "judging.human_weight": String(100 - ai) }));
    }
    if (key === "judging.human_weight") {
      const human = Math.min(100, Math.max(0, Number(value) || 0));
      setSettings((prev) => ({ ...prev, "judging.human_weight": String(human), "judging.ai_weight": String(100 - human) }));
    }
  };

  const handleSave = async () => {
    setSaving(true);
    try {
      const res = await fetch("/api/admin/settings", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ settings }),
      });
      if (!res.ok) throw new Error();
      setOriginal({ ...settings });
      toast.success("Settings saved successfully");
    } catch {
      toast.error("Failed to save settings");
    } finally {
      setSaving(false);
    }
  };

  const handleReset = () => {
    setSettings({ ...original });
  };

  if (loading) {
    return (
      <div className="flex min-h-[40vh] items-center justify-center">
        <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex items-center gap-3">
          <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-gradient-to-br from-primary/20 to-primary/5">
            <Settings className="h-5 w-5 text-primary" />
          </div>
          <div>
            <h1 className="text-2xl font-bold tracking-tight">Platform Settings</h1>
            <p className="text-sm text-muted-foreground">Configure defaults for competitions and judging</p>
          </div>
        </div>
        <div className="flex gap-2">
          {hasChanges && (
            <Button variant="outline" onClick={handleReset} className="gap-1.5">
              <RotateCcw className="h-3.5 w-3.5" />
              Discard
            </Button>
          )}
          <Button onClick={handleSave} disabled={!hasChanges || saving} className="gap-1.5">
            {saving ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Save className="h-3.5 w-3.5" />}
            Save Changes
          </Button>
        </div>
      </div>

      {/* Unsaved changes banner */}
      {hasChanges && (
        <div className="flex items-center gap-2 rounded-xl border border-amber-500/20 bg-amber-500/5 px-4 py-2.5">
          <AlertTriangle className="h-4 w-4 text-amber-500 shrink-0" />
          <p className="text-sm text-amber-700 dark:text-amber-400">You have unsaved changes</p>
        </div>
      )}

      <div className="grid gap-6 lg:grid-cols-2">
        {/* Judging Defaults */}
        <Card>
          <CardHeader className="pb-4">
            <CardTitle className="flex items-center gap-2 text-base">
              <Scale className="h-4 w-4 text-primary" />
              Judging Defaults
            </CardTitle>
            <CardDescription>
              Default scoring weights applied when organizers create new competitions
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid gap-4 sm:grid-cols-2">
              <div className="space-y-1.5">
                <Label>AI Judge Weight (%)</Label>
                <Input
                  type="number"
                  min={0}
                  max={100}
                  value={settings["judging.ai_weight"]}
                  onChange={(e) => update("judging.ai_weight", e.target.value)}
                />
              </div>
              <div className="space-y-1.5">
                <Label>Human Judge Weight (%)</Label>
                <Input
                  type="number"
                  min={0}
                  max={100}
                  value={settings["judging.human_weight"]}
                  onChange={(e) => update("judging.human_weight", e.target.value)}
                />
              </div>
            </div>
            {/* Weight visualization */}
            <div className="rounded-lg bg-muted/50 p-3">
              <div className="flex items-center justify-between text-[11px] text-muted-foreground mb-1.5">
                <span>AI: {settings["judging.ai_weight"]}%</span>
                <span>Human: {settings["judging.human_weight"]}%</span>
              </div>
              <div className="h-2.5 bg-muted rounded-full overflow-hidden flex">
                <div
                  className="h-full bg-primary/60 transition-all"
                  style={{ width: `${settings["judging.ai_weight"]}%` }}
                />
                <div
                  className="h-full bg-primary transition-all"
                  style={{ width: `${settings["judging.human_weight"]}%` }}
                />
              </div>
            </div>

            <div className="space-y-1.5">
              <Label>Default Finalist Count</Label>
              <Input
                type="number"
                min={1}
                max={100}
                value={settings["judging.finalist_count"]}
                onChange={(e) => update("judging.finalist_count", e.target.value)}
              />
              <p className="text-[11px] text-muted-foreground">Number of top submissions marked as finalists by default</p>
            </div>
          </CardContent>
        </Card>

        {/* Competition Defaults */}
        <Card>
          <CardHeader className="pb-4">
            <CardTitle className="flex items-center gap-2 text-base">
              <Trophy className="h-4 w-4 text-primary" />
              Competition Defaults
            </CardTitle>
            <CardDescription>
              Default values for new competitions
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid gap-4 sm:grid-cols-2">
              <div className="space-y-1.5">
                <Label>Min Team Size</Label>
                <Input
                  type="number"
                  min={1}
                  max={10}
                  value={settings["competition.min_team_size"]}
                  onChange={(e) => update("competition.min_team_size", e.target.value)}
                />
              </div>
              <div className="space-y-1.5">
                <Label>Max Team Size</Label>
                <Input
                  type="number"
                  min={1}
                  max={10}
                  value={settings["competition.max_team_size"]}
                  onChange={(e) => update("competition.max_team_size", e.target.value)}
                />
              </div>
            </div>
            <div className="space-y-1.5">
              <Label>Max Screenshots per Submission</Label>
              <Input
                type="number"
                min={0}
                max={20}
                value={settings["competition.max_screenshots"]}
                onChange={(e) => update("competition.max_screenshots", e.target.value)}
              />
            </div>
          </CardContent>
        </Card>

        {/* Platform Info */}
        <Card>
          <CardHeader className="pb-4">
            <CardTitle className="flex items-center gap-2 text-base">
              <Globe className="h-4 w-4 text-primary" />
              Platform Information
            </CardTitle>
            <CardDescription>
              General platform configuration
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-1.5">
              <Label>Platform Name</Label>
              <Input
                value={settings["platform.name"]}
                onChange={(e) => update("platform.name", e.target.value)}
              />
            </div>
            <div className="space-y-1.5">
              <Label>Support Email</Label>
              <Input
                type="email"
                value={settings["platform.support_email"]}
                onChange={(e) => update("platform.support_email", e.target.value)}
              />
            </div>
          </CardContent>
        </Card>

        {/* Maintenance Mode */}
        <Card>
          <CardHeader className="pb-4">
            <CardTitle className="flex items-center gap-2 text-base">
              <AlertTriangle className="h-4 w-4 text-primary" />
              Maintenance Mode
            </CardTitle>
            <CardDescription>
              When enabled, only admins can access the platform
            </CardDescription>
          </CardHeader>
          <CardContent>
            <button
              type="button"
              onClick={() =>
                update(
                  "platform.maintenance_mode",
                  settings["platform.maintenance_mode"] === "true" ? "false" : "true"
                )
              }
              className={`
                flex items-center gap-3 w-full rounded-xl border p-4 text-left transition-all
                ${settings["platform.maintenance_mode"] === "true"
                  ? "border-red-500/30 bg-red-500/5"
                  : "border-emerald-500/30 bg-emerald-500/5"
                }
              `}
            >
              {settings["platform.maintenance_mode"] === "true" ? (
                <>
                  <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-red-500/10">
                    <AlertTriangle className="h-5 w-5 text-red-500" />
                  </div>
                  <div>
                    <p className="text-sm font-semibold text-red-600 dark:text-red-400">Maintenance Mode ON</p>
                    <p className="text-[12px] text-muted-foreground">Platform is restricted to admins only</p>
                  </div>
                </>
              ) : (
                <>
                  <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-emerald-500/10">
                    <CheckCircle className="h-5 w-5 text-emerald-500" />
                  </div>
                  <div>
                    <p className="text-sm font-semibold text-emerald-600 dark:text-emerald-400">Platform is Live</p>
                    <p className="text-[12px] text-muted-foreground">All users can access the platform</p>
                  </div>
                </>
              )}
            </button>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
