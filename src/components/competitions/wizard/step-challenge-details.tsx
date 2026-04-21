"use client";

import { useCallback, useRef, useState } from "react";
import { useCompetitionForm } from "@/hooks/use-competition-form";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { FileText, Plus, Trash2, Link as LinkIcon, Upload, Loader2, File } from "lucide-react";
import { toast } from "sonner";

const DOC_ACCEPT = ".pdf,.doc,.docx,.pptx,.xlsx,.zip";

export function StepChallengeDetails() {
  const { formData, updateFormData, stepErrors, validateStep } = useCompetitionForm();
  const [uploading, setUploading] = useState<number | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const uploadIndexRef = useRef<number>(0);

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

  const handleFileUpload = useCallback(
    async (file: File, index: number) => {
      setUploading(index);
      try {
        const fd = new FormData();
        fd.append("file", file);
        const res = await fetch("/api/upload", { method: "POST", body: fd });
        if (!res.ok) {
          const data = await res.json().catch(() => ({}));
          throw new Error(data.error || "Upload failed");
        }
        const { url } = await res.json();
        const updated = formData.resources.map((r, i) =>
          i === index
            ? { ...r, url, title: r.title || file.name.replace(/\.[^.]+$/, "") }
            : r
        );
        updateFormData({ resources: updated });
        toast.success("File uploaded");
      } catch (err) {
        toast.error(err instanceof Error ? err.message : "Upload failed");
      } finally {
        setUploading(null);
      }
    },
    [formData.resources, updateFormData]
  );

  const triggerFileUpload = (index: number) => {
    uploadIndexRef.current = index;
    fileInputRef.current?.click();
  };

  const onFileInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) handleFileUpload(file, uploadIndexRef.current);
    e.target.value = "";
  };

  const isUploadedFile = (url: string) => url.includes(".blob.vercel-storage.com/") || url.startsWith("/uploads/");

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
        {/* Hidden file input for document uploads */}
        <input
          ref={fileInputRef}
          type="file"
          accept={DOC_ACCEPT}
          className="hidden"
          onChange={onFileInputChange}
        />

        {/* Challenge Statement */}
        <div className="space-y-2">
          <Label htmlFor="challengeStatement">Challenge Statement <span className="text-destructive">*</span></Label>
          <Textarea
            id="challengeStatement"
            placeholder="Clearly describe the challenge or problem statement. What should participants build or solve?"
            value={formData.challengeStatement ?? ""}
            onChange={(e) => updateFormData({ challengeStatement: e.target.value })}
            onBlur={() => validateStep()}
            rows={6}
          />
          <p className="text-xs text-muted-foreground">
            This is the main challenge description participants will see.
          </p>
          {stepErrors.challengeStatement && <p className="text-xs text-destructive mt-1">{stepErrors.challengeStatement}</p>}
        </div>

        {/* Requirements */}
        <div className="space-y-2">
          <Label htmlFor="requirements">Requirements <span className="text-destructive">*</span></Label>
          <Textarea
            id="requirements"
            placeholder="List technical requirements, constraints, or guidelines. One per line recommended."
            value={formData.requirements ?? ""}
            onChange={(e) => updateFormData({ requirements: e.target.value })}
            onBlur={() => validateStep()}
            rows={4}
          />
          <p className="text-xs text-muted-foreground">
            Specify any technical stack requirements, constraints, or mandatory features.
          </p>
          {stepErrors.requirements && <p className="text-xs text-destructive mt-1">{stepErrors.requirements}</p>}
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
                <div className="flex flex-1 flex-col gap-2">
                  <div className="flex flex-col gap-2 sm:flex-row">
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
                        {isUploadedFile(resource.url) ? "File" : "URL"}
                      </Label>
                      {isUploadedFile(resource.url) ? (
                        <div className="flex items-center gap-2 h-10 rounded-xl bg-background/50 border border-input px-3">
                          <File className="size-4 text-primary shrink-0" />
                          <span className="text-sm truncate flex-1">{resource.title || "Uploaded file"}</span>
                        </div>
                      ) : (
                        <Input
                          id={`resource-url-${index}`}
                          placeholder="https://..."
                          type="url"
                          value={resource.url}
                          onChange={(e) => updateResource(index, "url", e.target.value)}
                        />
                      )}
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    <Button
                      type="button"
                      variant="outline"
                      size="sm"
                      className="gap-1.5 text-xs"
                      onClick={() => triggerFileUpload(index)}
                      disabled={uploading === index}
                    >
                      {uploading === index ? (
                        <><Loader2 className="size-3.5 animate-spin" /> Uploading...</>
                      ) : (
                        <><Upload className="size-3.5" /> {isUploadedFile(resource.url) ? "Replace File" : "Upload File"}</>
                      )}
                    </Button>
                    <span className="text-[11px] text-muted-foreground">PDF, DOCX, PPTX, XLSX, ZIP (max 10MB)</span>
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
