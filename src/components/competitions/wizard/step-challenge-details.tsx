"use client";

import { useCompetitionForm } from "@/hooks/use-competition-form";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { FileText, Plus, Trash2, Link as LinkIcon } from "lucide-react";

export function StepChallengeDetails() {
  const { formData, updateFormData } = useCompetitionForm();

  const addResource = () => {
    updateFormData({
      resources: [...formData.resources, { title: "", url: "" }],
    });
  };

  const removeResource = (index: number) => {
    updateFormData({
      resources: formData.resources.filter((_, i) => i !== index),
    });
  };

  const updateResource = (index: number, field: "title" | "url", value: string) => {
    const updated = formData.resources.map((r, i) =>
      i === index ? { ...r, [field]: value } : r
    );
    updateFormData({ resources: updated });
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <FileText className="size-5 text-primary" />
          Challenge Details
        </CardTitle>
        <CardDescription>
          Define the challenge your participants will tackle. Be specific about
          what you expect and provide helpful resources.
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-6">
        {/* Challenge Statement */}
        <div className="space-y-2">
          <Label htmlFor="challengeStatement">Challenge Statement</Label>
          <Textarea
            id="challengeStatement"
            placeholder="Clearly describe the challenge or problem statement. What should participants build or solve?"
            value={formData.challengeStatement ?? ""}
            onChange={(e) => updateFormData({ challengeStatement: e.target.value })}
            rows={6}
          />
          <p className="text-xs text-muted-foreground">
            This is the main challenge description participants will see.
          </p>
        </div>

        {/* Requirements */}
        <div className="space-y-2">
          <Label htmlFor="requirements">Requirements</Label>
          <Textarea
            id="requirements"
            placeholder="List technical requirements, constraints, or guidelines. One per line recommended."
            value={formData.requirements ?? ""}
            onChange={(e) => updateFormData({ requirements: e.target.value })}
            rows={4}
          />
          <p className="text-xs text-muted-foreground">
            Specify any technical stack requirements, constraints, or mandatory features.
          </p>
        </div>

        {/* Resources */}
        <div className="space-y-3">
          <div className="flex items-center justify-between">
            <Label>Resources</Label>
            <Button variant="outline" size="sm" onClick={addResource}>
              <Plus className="size-4" />
              Add Resource
            </Button>
          </div>

          {formData.resources.length === 0 && (
            <div className="rounded-lg border border-dashed p-6 text-center">
              <LinkIcon className="mx-auto size-8 text-muted-foreground/50" />
              <p className="mt-2 text-sm text-muted-foreground">
                No resources added yet. Add links to APIs, datasets, documentation,
                or starter kits that participants can use.
              </p>
            </div>
          )}

          <div className="space-y-3">
            {formData.resources.map((resource, index) => (
              <div
                key={index}
                className="flex items-start gap-3 rounded-lg border p-3"
              >
                <div className="flex flex-1 flex-col gap-2 sm:flex-row">
                  <div className="flex-1 space-y-1">
                    <Label htmlFor={`resource-title-${index}`} className="text-xs text-muted-foreground">
                      Title
                    </Label>
                    <Input
                      id={`resource-title-${index}`}
                      placeholder="Resource name"
                      value={resource.title}
                      onChange={(e) => updateResource(index, "title", e.target.value)}
                    />
                  </div>
                  <div className="flex-1 space-y-1">
                    <Label htmlFor={`resource-url-${index}`} className="text-xs text-muted-foreground">
                      URL
                    </Label>
                    <Input
                      id={`resource-url-${index}`}
                      placeholder="https://..."
                      type="url"
                      value={resource.url}
                      onChange={(e) => updateResource(index, "url", e.target.value)}
                    />
                  </div>
                </div>
                <Button
                  variant="ghost"
                  size="icon"
                  className="mt-5 shrink-0 text-muted-foreground hover:text-destructive"
                  onClick={() => removeResource(index)}
                >
                  <Trash2 className="size-4" />
                </Button>
              </div>
            ))}
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
