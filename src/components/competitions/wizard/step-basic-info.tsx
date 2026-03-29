"use client";

import { useCompetitionForm } from "@/hooks/use-competition-form";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Lightbulb, X, Globe, Lock, RefreshCw, Copy } from "lucide-react";
import { useState } from "react";
import { Button } from "@/components/ui/button";
import { toast } from "sonner";

const CATEGORIES = [
  "AI/ML",
  "Web Dev",
  "Mobile",
  "IoT",
  "Blockchain",
  "FinTech",
  "HealthTech",
  "EdTech",
  "Social Impact",
  "Open Innovation",
] as const;

const SUGGESTED_TAGS = [
  "Beginner Friendly",
  "Advanced",
  "Open Source",
  "Sustainability",
  "Pakistan",
  "Women in Tech",
  "University",
  "Corporate",
  "Solo Allowed",
  "Cash Prizes",
  "Remote",
  "In Person",
];

function generateAccessCode(): string {
  const chars = "ABCDEFGHJKLMNPQRSTUVWXYZabcdefghjkmnpqrstuvwxyz23456789";
  let code = "";
  for (let i = 0; i < 8; i++) {
    code += chars[Math.floor(Math.random() * chars.length)];
  }
  return code;
}

export function StepBasicInfo() {
  const { formData, updateFormData } = useCompetitionForm();
  const [tagInput, setTagInput] = useState("");

  const addTag = (tag: string) => {
    const trimmed = tag.trim();
    if (trimmed && !formData.tags.includes(trimmed)) {
      updateFormData({ tags: [...formData.tags, trimmed] });
    }
    setTagInput("");
  };

  const removeTag = (tag: string) => {
    updateFormData({ tags: formData.tags.filter((t) => t !== tag) });
  };

  const handleTagKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === "Enter" || e.key === ",") {
      e.preventDefault();
      addTag(tagInput);
    }
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Lightbulb className="size-5 text-primary" />
          Basic Information
        </CardTitle>
        <CardDescription>
          Set up the core details of your competition. A strong title and description
          help attract the right participants.
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-6">
        {/* Title */}
        <div className="space-y-2">
          <Label htmlFor="title">
            Competition Title <span className="text-destructive">*</span>
          </Label>
          <Input
            id="title"
            placeholder="e.g., Pakistan AI Innovation Challenge 2026"
            value={formData.title}
            onChange={(e) => updateFormData({ title: e.target.value })}
            maxLength={100}
          />
          <p className="text-xs text-muted-foreground">
            {formData.title.length}/100 characters
          </p>
        </div>

        {/* Tagline */}
        <div className="space-y-2">
          <Label htmlFor="tagline">Tagline</Label>
          <Input
            id="tagline"
            placeholder="A short catchy phrase for your competition"
            value={formData.tagline ?? ""}
            onChange={(e) => updateFormData({ tagline: e.target.value })}
            maxLength={150}
          />
          <p className="text-xs text-muted-foreground">
            {(formData.tagline ?? "").length}/150 characters
          </p>
        </div>

        {/* Description */}
        <div className="space-y-2">
          <Label htmlFor="description">
            Description <span className="text-destructive">*</span>
          </Label>
          <Textarea
            id="description"
            placeholder="Describe your competition in detail. What is the goal? What problem does it solve? Why should participants join?"
            value={formData.description}
            onChange={(e) => updateFormData({ description: e.target.value })}
            rows={5}
          />
          <p className="text-xs text-muted-foreground">
            {formData.description.length} characters (minimum 50)
          </p>
        </div>

        {/* Category */}
        <div className="space-y-2">
          <Label>Category</Label>
          <Select
            value={formData.category ?? ""}
            onValueChange={(val) => updateFormData({ category: val ?? undefined })}
          >
            <SelectTrigger className="w-full">
              <SelectValue placeholder="Select a category" />
            </SelectTrigger>
            <SelectContent>
              {CATEGORIES.map((cat) => (
                <SelectItem key={cat} value={cat}>
                  {cat}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        {/* Tags */}
        <div className="space-y-2">
          <Label htmlFor="tags">Tags</Label>
          <Input
            id="tags"
            placeholder="Type a tag and press Enter"
            value={tagInput}
            onChange={(e) => setTagInput(e.target.value)}
            onKeyDown={handleTagKeyDown}
          />

          {/* Selected tags */}
          {formData.tags.length > 0 && (
            <div className="flex flex-wrap gap-1.5 pt-1">
              {formData.tags.map((tag) => (
                <Badge key={tag} variant="secondary" className="gap-1">
                  {tag}
                  <button
                    type="button"
                    onClick={() => removeTag(tag)}
                    className="ml-0.5 rounded-full hover:text-destructive"
                  >
                    <X className="size-3" />
                  </button>
                </Badge>
              ))}
            </div>
          )}

          {/* Suggested tags */}
          <div className="space-y-1.5 pt-1">
            <p className="text-xs text-muted-foreground">Suggested:</p>
            <div className="flex flex-wrap gap-1.5">
              {SUGGESTED_TAGS.filter((t) => !formData.tags.includes(t)).map((tag) => (
                <button
                  key={tag}
                  type="button"
                  onClick={() => addTag(tag)}
                  className="inline-flex h-5 items-center rounded-full border border-dashed border-muted-foreground/30 px-2 text-xs text-muted-foreground transition-colors hover:border-primary hover:text-primary"
                >
                  + {tag}
                </button>
              ))}
            </div>
          </div>
        </div>

        {/* Visibility */}
        <div className="space-y-3">
          <Label>Visibility</Label>
          <div className="grid gap-3 sm:grid-cols-2">
            <button
              type="button"
              onClick={() => {
                updateFormData({ visibility: "public", accessCode: "" });
              }}
              className={`
                flex items-start gap-3 rounded-xl border p-4 text-left transition-all
                ${formData.visibility === "public"
                  ? "border-primary bg-primary/10 shadow-sm"
                  : "border-border hover:border-primary/30"}
              `}
            >
              <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-background border border-border/50">
                <Globe className="h-5 w-5 text-primary" />
              </div>
              <div>
                <p className="text-sm font-semibold">Public</p>
                <p className="text-xs text-muted-foreground">
                  Visible on the marketplace for everyone
                </p>
              </div>
            </button>

            <button
              type="button"
              onClick={() => {
                const code = formData.accessCode || generateAccessCode();
                updateFormData({ visibility: "private", accessCode: code });
              }}
              className={`
                flex items-start gap-3 rounded-xl border p-4 text-left transition-all
                ${formData.visibility === "private"
                  ? "border-primary bg-primary/10 shadow-sm"
                  : "border-border hover:border-primary/30"}
              `}
            >
              <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-background border border-border/50">
                <Lock className="h-5 w-5 text-primary" />
              </div>
              <div>
                <p className="text-sm font-semibold">Private</p>
                <p className="text-xs text-muted-foreground">
                  Only accessible via invite code
                </p>
              </div>
            </button>
          </div>

          {formData.visibility === "private" && (
            <div className="rounded-lg border border-primary/20 bg-primary/5 p-4 space-y-3">
              <div className="space-y-1">
                <Label className="text-xs text-muted-foreground">Access Code</Label>
                <div className="flex items-center gap-2">
                  <Input
                    value={formData.accessCode ?? ""}
                    readOnly
                    className="font-mono font-bold text-primary bg-background"
                  />
                  <Button
                    type="button"
                    variant="outline"
                    size="icon"
                    onClick={() => updateFormData({ accessCode: generateAccessCode() })}
                    title="Regenerate"
                  >
                    <RefreshCw className="h-4 w-4" />
                  </Button>
                  <Button
                    type="button"
                    variant="outline"
                    size="icon"
                    onClick={() => {
                      navigator.clipboard.writeText(formData.accessCode ?? "");
                      toast.success("Access code copied!");
                    }}
                    title="Copy"
                  >
                    <Copy className="h-4 w-4" />
                  </Button>
                </div>
              </div>
              <p className="text-xs text-muted-foreground">
                Private hackathons are free to host — no platform fees required.
              </p>
            </div>
          )}
        </div>
      </CardContent>
    </Card>
  );
}
