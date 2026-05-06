"use client";

import { useCompetitionForm } from "@/hooks/use-competition-form";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Scale, Plus, Trash2 } from "lucide-react";

export function StepJudgingConfig() {
  const { formData, updateFormData, stepErrors, revalidateIfAttempted } = useCompetitionForm();

  const redistributeWeights = (criteria: typeof formData.judgingCriteria) => {
    if (criteria.length === 0) return criteria;
    const equalShare = Math.floor(100 / criteria.length);
    const remainder = 100 - equalShare * criteria.length;
    return criteria.map((c, i) => ({
      ...c,
      weight: equalShare + (i === 0 ? remainder : 0),
    }));
  };

  const addCriterion = () => {
    if (formData.judgingCriteria.length >= 10) return;
    const newCriteria = [
      ...formData.judgingCriteria,
      { name: "", description: "", weight: 0, maxScore: 100 },
    ];
    updateFormData({
      judgingCriteria: redistributeWeights(newCriteria),
    });
  };

  const removeCriterion = (index: number) => {
    const remaining = formData.judgingCriteria.filter((_, i) => i !== index);
    updateFormData({
      judgingCriteria: redistributeWeights(remaining),
    });
  };

  const updateCriterion = (
    index: number,
    field: string,
    value: string | number
  ) => {
    const updated = formData.judgingCriteria.map((c, i) =>
      i === index ? { ...c, [field]: value } : c
    );
    updateFormData({ judgingCriteria: updated });
  };

  const totalCriteriaWeight = formData.judgingCriteria.reduce(
    (sum, c) => sum + (c.weight || 0),
    0
  );

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Scale className="size-5 text-primary" />
            Judging Configuration
          </CardTitle>
          <CardDescription>
            Configure how submissions will be evaluated by your judges.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
          {/* Finalist Count */}
          <div className="space-y-2">
            <Label htmlFor="finalistCount">Number of Finalists</Label>
            <Input
              id="finalistCount"
              type="number"
              min={1}
              value={formData.finalistCount || ""}
              onChange={(e) => {
                if (e.target.value === "") { updateFormData({ finalistCount: 0 }); return; }
                const raw = parseInt(e.target.value);
                if (!isNaN(raw)) updateFormData({ finalistCount: raw });
              }}
              onBlur={() => { updateFormData({ finalistCount: Math.max(1, formData.finalistCount || 10) }); revalidateIfAttempted(); }}
            />
            <p className="text-xs text-muted-foreground">
              How many top submissions advance to the finalist round for human judging.
              {formData.maxParticipants ? ` Cannot exceed maximum participants (${formData.maxParticipants}).` : ""}
            </p>
            {stepErrors.finalistCount && (
              <p className="text-xs text-destructive mt-1">{stepErrors.finalistCount}</p>
            )}
          </div>
        </CardContent>
      </Card>

      {/* Judging Criteria */}
      <Card>
        <CardHeader>
          <CardTitle className="text-base">Judging Criteria</CardTitle>
          <CardDescription>
            Define the criteria used to evaluate submissions. Weights should ideally
            sum to 100.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          {/* Weight summary */}
          <div className="flex items-center justify-between rounded-lg bg-muted/50 p-3">
            <span className="text-sm text-muted-foreground">
              Total criteria weight
            </span>
            <Badge
              variant={totalCriteriaWeight === 100 ? "default" : "outline"}
            >
              {totalCriteriaWeight}/100
            </Badge>
          </div>

          {formData.judgingCriteria.length === 0 && (
            <div className="rounded-lg border border-dashed p-6 text-center">
              <Scale className="mx-auto size-8 text-muted-foreground/50" />
              <p className="mt-2 text-sm text-muted-foreground">
                No criteria defined yet. Add criteria to evaluate submissions.
              </p>
            </div>
          )}

          <div className="space-y-4">
            {formData.judgingCriteria.map((criterion, index) => (
              <div key={index} className="rounded-lg border p-4 space-y-3">
                <div className="flex items-center justify-between">
                  <Badge variant="outline">Criterion {index + 1}</Badge>
                  <Button
                    variant="ghost"
                    size="icon-sm"
                    className="text-muted-foreground hover:text-destructive"
                    onClick={() => removeCriterion(index)}
                  >
                    <Trash2 className="size-4" />
                  </Button>
                </div>

                <div className="grid gap-3 sm:grid-cols-2">
                  <div className="space-y-1">
                    <Label htmlFor={`criterion-name-${index}`} className="text-xs">
                      Name
                    </Label>
                    <Input
                      id={`criterion-name-${index}`}
                      placeholder="e.g., Innovation"
                      value={criterion.name}
                      onChange={(e) => updateCriterion(index, "name", e.target.value)}
                    />
                  </div>

                  <div className="grid grid-cols-2 gap-3">
                    <div className="space-y-1">
                      <Label htmlFor={`criterion-weight-${index}`} className="text-xs">
                        Weight (%)
                      </Label>
                      <Input
                        id={`criterion-weight-${index}`}
                        type="number"
                        min={0}
                        max={100}
                        value={criterion.weight || ""}
                        onChange={(e) => {
                          if (e.target.value === "") { updateCriterion(index, "weight", 0); return; }
                          const raw = parseInt(e.target.value);
                          if (!isNaN(raw)) updateCriterion(index, "weight", raw);
                        }}
                        onBlur={() => updateCriterion(index, "weight", Math.max(0, Math.min(100, criterion.weight || 0)))}
                      />
                    </div>
                    <div className="space-y-1">
                      <Label htmlFor={`criterion-max-${index}`} className="text-xs">
                        Max Score
                      </Label>
                      <Input
                        id={`criterion-max-${index}`}
                        type="number"
                        min={1}
                        max={100}
                        value={criterion.maxScore || ""}
                        onChange={(e) => {
                          if (e.target.value === "") { updateCriterion(index, "maxScore", 0); return; }
                          const raw = parseInt(e.target.value);
                          if (!isNaN(raw)) updateCriterion(index, "maxScore", raw);
                        }}
                        onBlur={() => updateCriterion(index, "maxScore", Math.max(1, Math.min(100, criterion.maxScore || 100)))}
                      />
                    </div>
                  </div>
                </div>

                <div className="space-y-1">
                  <Label htmlFor={`criterion-desc-${index}`} className="text-xs">
                    Description
                  </Label>
                  <Textarea
                    id={`criterion-desc-${index}`}
                    placeholder="Describe what this criterion evaluates"
                    value={criterion.description}
                    onChange={(e) => updateCriterion(index, "description", e.target.value)}
                    rows={2}
                  />
                </div>
              </div>
            ))}
          </div>

          <Button variant="outline" onClick={addCriterion} className="w-full" disabled={formData.judgingCriteria.length >= 10}>
            <Plus className="size-4" />
            {formData.judgingCriteria.length >= 10 ? "Maximum 10 criteria reached" : "Add Criterion"}
          </Button>
        </CardContent>
      </Card>
    </div>
  );
}
