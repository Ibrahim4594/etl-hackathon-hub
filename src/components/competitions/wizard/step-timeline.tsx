"use client";

import { useCompetitionForm } from "@/hooks/use-competition-form";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Separator } from "@/components/ui/separator";
import { Calendar, Clock } from "lucide-react";
import { cn } from "@/lib/utils";

interface DateFieldProps {
  id: string;
  label: string;
  value: string;
  onChange: (value: string) => void;
}

function DateField({ id, label, value, onChange }: DateFieldProps) {
  return (
    <div className="space-y-2">
      <Label htmlFor={id}>{label}</Label>
      <Input
        id={id}
        type="datetime-local"
        value={value}
        onChange={(e) => onChange(e.target.value)}
      />
    </div>
  );
}

interface TimelinePhase {
  label: string;
  startKey: string;
  endKey: string;
  color: string;
  startValue: string;
  endValue: string;
}

export function StepTimeline() {
  const { formData, updateFormData } = useCompetitionForm();

  const phases: TimelinePhase[] = [
    {
      label: "Registration",
      startKey: "registrationStart",
      endKey: "registrationEnd",
      color: "bg-blue-500",
      startValue: formData.registrationStart ?? "",
      endValue: formData.registrationEnd ?? "",
    },
    {
      label: "Submission",
      startKey: "submissionStart",
      endKey: "submissionEnd",
      color: "bg-emerald-500",
      startValue: formData.submissionStart ?? "",
      endValue: formData.submissionEnd ?? "",
    },
    {
      label: "Judging",
      startKey: "judgingStart",
      endKey: "judgingEnd",
      color: "bg-amber-500",
      startValue: formData.judgingStart ?? "",
      endValue: formData.judgingEnd ?? "",
    },
  ];

  const formatPreviewDate = (dateStr: string) => {
    if (!dateStr) return "Not set";
    try {
      return new Date(dateStr).toLocaleDateString("en-PK", {
        month: "short",
        day: "numeric",
        year: "numeric",
      });
    } catch {
      return "Invalid date";
    }
  };

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Calendar className="size-5 text-primary" />
            Competition Timeline
          </CardTitle>
          <CardDescription>
            Set the key dates for each phase of your competition. Dates should be
            in chronological order.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-8">
          {/* Registration Phase */}
          <div className="space-y-4">
            <div className="flex items-center gap-2">
              <div className="size-3 rounded-full bg-blue-500" />
              <h3 className="text-sm font-semibold">Registration Phase</h3>
            </div>
            <div className="grid gap-4 sm:grid-cols-2">
              <DateField
                id="registrationStart"
                label="Registration Opens"
                value={formData.registrationStart ?? ""}
                onChange={(val) => updateFormData({ registrationStart: val })}
              />
              <DateField
                id="registrationEnd"
                label="Registration Closes"
                value={formData.registrationEnd ?? ""}
                onChange={(val) => updateFormData({ registrationEnd: val })}
              />
            </div>
          </div>

          <Separator />

          {/* Submission Phase */}
          <div className="space-y-4">
            <div className="flex items-center gap-2">
              <div className="size-3 rounded-full bg-emerald-500" />
              <h3 className="text-sm font-semibold">Submission Phase</h3>
            </div>
            <div className="grid gap-4 sm:grid-cols-2">
              <DateField
                id="submissionStart"
                label="Submission Opens"
                value={formData.submissionStart ?? ""}
                onChange={(val) => updateFormData({ submissionStart: val })}
              />
              <DateField
                id="submissionEnd"
                label="Submission Deadline"
                value={formData.submissionEnd ?? ""}
                onChange={(val) => updateFormData({ submissionEnd: val })}
              />
            </div>
          </div>

          <Separator />

          {/* Judging Phase */}
          <div className="space-y-4">
            <div className="flex items-center gap-2">
              <div className="size-3 rounded-full bg-amber-500" />
              <h3 className="text-sm font-semibold">Judging Phase</h3>
            </div>
            <div className="grid gap-4 sm:grid-cols-2">
              <DateField
                id="judgingStart"
                label="Judging Begins"
                value={formData.judgingStart ?? ""}
                onChange={(val) => updateFormData({ judgingStart: val })}
              />
              <DateField
                id="judgingEnd"
                label="Judging Ends"
                value={formData.judgingEnd ?? ""}
                onChange={(val) => updateFormData({ judgingEnd: val })}
              />
            </div>
          </div>

          <Separator />

          {/* Results Date */}
          <div className="space-y-4">
            <div className="flex items-center gap-2">
              <div className="size-3 rounded-full bg-purple-500" />
              <h3 className="text-sm font-semibold">Results</h3>
            </div>
            <div className="sm:w-1/2">
              <DateField
                id="resultsDate"
                label="Results Announcement"
                value={formData.resultsDate ?? ""}
                onChange={(val) => updateFormData({ resultsDate: val })}
              />
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Timeline Preview */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-base">
            <Clock className="size-4 text-primary" />
            Timeline Preview
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            {phases.map((phase) => (
              <div key={phase.label} className="flex items-center gap-4">
                <div className="w-24 shrink-0 text-right">
                  <span className="text-xs font-medium text-muted-foreground">
                    {phase.label}
                  </span>
                </div>
                <div className="relative flex-1">
                  <div className="h-8 rounded-md bg-muted/50">
                    <div
                      className={cn(
                        "flex h-full items-center justify-center rounded-md px-2 text-xs font-medium text-white",
                        phase.color,
                        phase.startValue && phase.endValue ? "opacity-100" : "opacity-30"
                      )}
                    >
                      {phase.startValue && phase.endValue
                        ? `${formatPreviewDate(phase.startValue)} - ${formatPreviewDate(phase.endValue)}`
                        : "Dates not set"}
                    </div>
                  </div>
                </div>
              </div>
            ))}

            {/* Results */}
            <div className="flex items-center gap-4">
              <div className="w-24 shrink-0 text-right">
                <span className="text-xs font-medium text-muted-foreground">
                  Results
                </span>
              </div>
              <div className="relative flex-1">
                <div className="h-8 rounded-md bg-muted/50">
                  <div
                    className={cn(
                      "flex h-full items-center justify-center rounded-md bg-purple-500 px-2 text-xs font-medium text-white",
                      formData.resultsDate ? "opacity-100" : "opacity-30"
                    )}
                  >
                    {formData.resultsDate
                      ? formatPreviewDate(formData.resultsDate)
                      : "Date not set"}
                  </div>
                </div>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
