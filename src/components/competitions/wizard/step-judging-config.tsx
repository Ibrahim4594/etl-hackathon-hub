"use client";

import { useCompetitionForm } from "@/hooks/use-competition-form";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { Scale, Plus, Trash2, Bot, UserCheck } from "lucide-react";
import { cn } from "@/lib/utils";

export function StepJudgingConfig() {
  const { formData, updateFormData } = useCompetitionForm();

  const addCriterion = () => {
    updateFormData({
      judgingCriteria: [
        ...formData.judgingCriteria,
        { name: "", description: "", weight: 0, maxScore: 10 },
      ],
    });
  };

  const removeCriterion = (index: number) => {
    updateFormData({
      judgingCriteria: formData.judgingCriteria.filter((_, i) => i !== index),
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

  const handleAiWeightChange = (value: number) => {
    const clamped = Math.max(0, Math.min(100, value));
    updateFormData({
      aiJudgingWeight: clamped,
      humanJudgingWeight: 100 - clamped,
    });
  };

  const handleHumanWeightChange = (value: number) => {
    const clamped = Math.max(0, Math.min(100, value));
    updateFormData({
      humanJudgingWeight: clamped,
      aiJudgingWeight: 100 - clamped,
    });
  };

  return (
    <div className="space-y-6">
      {/* AI vs Human Judging Weight */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Scale className="size-5 text-primary" />
            Judging Configuration
          </CardTitle>
          <CardDescription>
            Configure how submissions will be evaluated. Set the balance between
            AI-assisted and human judging.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
          {/* Weight Sliders */}
          <div className="space-y-4">
            <Label>AI vs Human Judging Balance</Label>

            <div className="space-y-4 rounded-lg border p-4">
              {/* AI Weight */}
              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <Bot className="size-4 text-blue-500" />
                    <span className="text-sm font-medium">AI Judging</span>
                  </div>
                  <span className="text-sm font-semibold text-blue-500">
                    {formData.aiJudgingWeight}%
                  </span>
                </div>
                <input
                  type="range"
                  min={0}
                  max={100}
                  value={formData.aiJudgingWeight}
                  onChange={(e) => handleAiWeightChange(parseInt(e.target.value))}
                  className="w-full accent-blue-500"
                />
              </div>

              {/* Human Weight */}
              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <UserCheck className="size-4 text-emerald-500" />
                    <span className="text-sm font-medium">Human Judging</span>
                  </div>
                  <span className="text-sm font-semibold text-emerald-500">
                    {formData.humanJudgingWeight}%
                  </span>
                </div>
                <input
                  type="range"
                  min={0}
                  max={100}
                  value={formData.humanJudgingWeight}
                  onChange={(e) => handleHumanWeightChange(parseInt(e.target.value))}
                  className="w-full accent-emerald-500"
                />
              </div>

              {/* Visual bar */}
              <div className="flex h-3 overflow-hidden rounded-full">
                <div
                  className="bg-blue-500 transition-all"
                  style={{ width: `${formData.aiJudgingWeight}%` }}
                />
                <div
                  className="bg-emerald-500 transition-all"
                  style={{ width: `${formData.humanJudgingWeight}%` }}
                />
              </div>

              <p
                className={cn(
                  "text-xs",
                  formData.aiJudgingWeight + formData.humanJudgingWeight === 100
                    ? "text-muted-foreground"
                    : "text-destructive"
                )}
              >
                {formData.aiJudgingWeight + formData.humanJudgingWeight === 100
                  ? "Weights sum to 100%"
                  : `Weights must sum to 100% (currently ${formData.aiJudgingWeight + formData.humanJudgingWeight}%)`}
              </p>
            </div>
          </div>

          {/* Finalist Count */}
          <div className="space-y-2">
            <Label htmlFor="finalistCount">Number of Finalists</Label>
            <Input
              id="finalistCount"
              type="number"
              min={1}
              value={formData.finalistCount}
              onChange={(e) =>
                updateFormData({ finalistCount: parseInt(e.target.value) || 10 })
              }
            />
            <p className="text-xs text-muted-foreground">
              How many top submissions advance to the finalist round for human judging.
            </p>
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
                        onChange={(e) =>
                          updateCriterion(index, "weight", parseInt(e.target.value) || 0)
                        }
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
                        max={10}
                        value={criterion.maxScore}
                        onChange={(e) =>
                          updateCriterion(index, "maxScore", parseInt(e.target.value) || 10)
                        }
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

          <Button variant="outline" onClick={addCriterion} className="w-full">
            <Plus className="size-4" />
            Add Criterion
          </Button>
        </CardContent>
      </Card>
    </div>
  );
}
