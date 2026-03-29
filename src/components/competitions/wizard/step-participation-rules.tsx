"use client";

import { useCompetitionForm } from "@/hooks/use-competition-form";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Users, Target } from "lucide-react";
import { targetParticipantOptions } from "@/lib/validators/competition";

const TARGET_LABELS: Record<string, { label: string; emoji: string }> = {
  university_students: { label: "University Students", emoji: "\uD83C\uDF93" },
  developers: { label: "Developers", emoji: "\uD83D\uDCBB" },
  researchers: { label: "Researchers", emoji: "\uD83D\uDD2C" },
  designers: { label: "Designers", emoji: "\uD83C\uDFA8" },
  data_scientists: { label: "Data Scientists", emoji: "\uD83D\uDCCA" },
  entrepreneurs: { label: "Entrepreneurs", emoji: "\uD83D\uDE80" },
  all: { label: "Open to All", emoji: "\u2705" },
};

export function StepParticipationRules() {
  const { formData, updateFormData } = useCompetitionForm();

  type TargetOption = (typeof targetParticipantOptions)[number];

  const toggleTargetParticipant = (option: TargetOption) => {
    const current = formData.targetParticipants ?? (["all"] as TargetOption[]);
    if (option === "all") {
      updateFormData({ targetParticipants: ["all"] });
      return;
    }
    // Deselect "all" when selecting a specific option
    let next: TargetOption[] = current.filter((o): o is TargetOption => o !== "all");
    if (next.includes(option)) {
      next = next.filter((o) => o !== option);
    } else {
      next = [...next, option];
    }
    // If nothing selected, revert to "all"
    if (next.length === 0) {
      next = ["all"];
    }
    updateFormData({ targetParticipants: next });
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Users className="size-5 text-primary" />
          Participation Rules
        </CardTitle>
        <CardDescription>
          Configure team sizes, participation limits, and eligibility requirements
          for your competition.
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-6">
        {/* Team Size */}
        <div className="grid gap-4 sm:grid-cols-2">
          <div className="space-y-2">
            <Label htmlFor="minTeamSize">Minimum Team Size</Label>
            <Input
              id="minTeamSize"
              type="number"
              min={1}
              max={10}
              value={formData.minTeamSize}
              onChange={(e) =>
                updateFormData({ minTeamSize: parseInt(e.target.value) || 1 })
              }
            />
            <p className="text-xs text-muted-foreground">
              Minimum number of members per team
            </p>
          </div>

          <div className="space-y-2">
            <Label htmlFor="maxTeamSize">Maximum Team Size</Label>
            <Input
              id="maxTeamSize"
              type="number"
              min={1}
              max={10}
              value={formData.maxTeamSize}
              onChange={(e) =>
                updateFormData({ maxTeamSize: parseInt(e.target.value) || 4 })
              }
            />
            <p className="text-xs text-muted-foreground">
              Maximum number of members per team
            </p>
          </div>
        </div>

        {/* Max Participants */}
        <div className="space-y-2">
          <Label htmlFor="maxParticipants">Maximum Participants (optional)</Label>
          <Input
            id="maxParticipants"
            type="number"
            min={1}
            placeholder="Leave empty for unlimited"
            value={formData.maxParticipants ?? ""}
            onChange={(e) =>
              updateFormData({
                maxParticipants: e.target.value ? parseInt(e.target.value) : undefined,
              })
            }
          />
          <p className="text-xs text-muted-foreground">
            Set a cap on total participants, or leave blank for unlimited.
          </p>
        </div>

        {/* Allow Solo Participation */}
        <div className="flex items-center justify-between rounded-lg border p-4">
          <div className="space-y-0.5">
            <Label htmlFor="allowSolo" className="cursor-pointer">
              Allow Solo Participation
            </Label>
            <p className="text-xs text-muted-foreground">
              Allow individuals to participate without forming a team
            </p>
          </div>
          <button
            id="allowSolo"
            type="button"
            role="switch"
            aria-checked={formData.allowSoloParticipation}
            onClick={() =>
              updateFormData({ allowSoloParticipation: !formData.allowSoloParticipation })
            }
            className={`
              relative inline-flex h-6 w-11 shrink-0 cursor-pointer rounded-full border-2 border-transparent
              transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2
              ${formData.allowSoloParticipation ? "bg-primary" : "bg-muted-foreground/30"}
            `}
          >
            <span
              className={`
                pointer-events-none inline-block size-5 rounded-full bg-background shadow-lg ring-0 transition-transform
                ${formData.allowSoloParticipation ? "translate-x-5" : "translate-x-0"}
              `}
            />
          </button>
        </div>

        {/* Eligibility Criteria */}
        <div className="space-y-2">
          <Label htmlFor="eligibilityCriteria">Eligibility Criteria</Label>
          <Textarea
            id="eligibilityCriteria"
            placeholder="e.g., Must be a university student in Pakistan, age 18-30, etc."
            value={formData.eligibilityCriteria ?? ""}
            onChange={(e) => updateFormData({ eligibilityCriteria: e.target.value })}
            rows={4}
          />
          <p className="text-xs text-muted-foreground">
            Describe who is eligible to participate in this competition.
          </p>
        </div>

        {/* Target Audience */}
        <div className="space-y-3">
          <div className="flex items-center gap-2">
            <Target className="size-4 text-primary" />
            <Label>Target Audience</Label>
          </div>
          <p className="text-xs text-muted-foreground">
            Select who this competition is aimed at. Selecting &quot;Open to All&quot; clears other selections.
          </p>
          <div className="flex flex-wrap gap-2">
            {targetParticipantOptions.map((option) => {
              const isSelected = (formData.targetParticipants ?? ["all"]).includes(option);
              const info = TARGET_LABELS[option] ?? { label: option, emoji: "" };
              return (
                <button
                  key={option}
                  type="button"
                  onClick={() => toggleTargetParticipant(option)}
                  className={`
                    inline-flex items-center gap-1.5 rounded-full border px-3 py-1.5 text-sm font-medium transition-all
                    ${
                      isSelected
                        ? "border-primary bg-primary/10 text-primary shadow-sm"
                        : "border-border bg-card text-muted-foreground hover:border-primary/30 hover:text-foreground"
                    }
                  `}
                >
                  <span>{info.emoji}</span>
                  <span>{info.label}</span>
                </button>
              );
            })}
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
