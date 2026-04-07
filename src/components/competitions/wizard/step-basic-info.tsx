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
import { useState, useEffect, useRef } from "react";
import { Button } from "@/components/ui/button";
import { toast } from "sonner";

const MAX_TAGS = 10;
const MAX_TAG_LENGTH = 30;

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
  "beginner friendly",
  "advanced",
  "open source",
  "sustainability",
  "pakistan",
  "women in tech",
  "university",
  "corporate",
  "solo allowed",
  "cash prizes",
  "remote",
  "in person",
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
  const [dbTags, setDbTags] = useState<string[]>([]);
  const [showDropdown, setShowDropdown] = useState(false);
  const [tagError, setTagError] = useState<string | null>(null);
  const dropdownRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    fetch("/api/competitions/tags")
      .then((r) => r.json())
      .then((data) => setDbTags(data.tags ?? []))
      .catch(() => {});
  }, []);

  // Close dropdown on outside click
  useEffect(() => {
    function handleClick(e: MouseEvent) {
      if (
        dropdownRef.current &&
        !dropdownRef.current.contains(e.target as Node) &&
        inputRef.current &&
        !inputRef.current.contains(e.target as Node)
      ) {
        setShowDropdown(false);
      }
    }
    document.addEventListener("mousedown", handleClick);
    return () => document.removeEventListener("mousedown", handleClick);
  }, []);

  const allSuggestions = Array.from(new Set([...SUGGESTED_TAGS, ...dbTags])).sort();

  const filteredSuggestions = tagInput.trim()
    ? allSuggestions.filter(
        (t) =>
          t.toLowerCase().includes(tagInput.toLowerCase()) &&
          !formData.tags.includes(t.toLowerCase())
      )
    : allSuggestions.filter((t) => !formData.tags.includes(t.toLowerCase())).slice(0, 8);

  const addTag = (raw: string) => {
    const tag = raw.trim().toLowerCase();
    if (!tag) return;
    if (tag.length > MAX_TAG_LENGTH) {
      setTagError(`Tag must be ${MAX_TAG_LENGTH} characters or less`);
      return;
    }
    if (formData.tags.length >= MAX_TAGS) {
      setTagError(`Maximum ${MAX_TAGS} tags allowed`);
      return;
    }
    if (!formData.tags.includes(tag)) {
      updateFormData({ tags: [...formData.tags, tag] });
    }
    setTagInput("");
    setTagError(null);
    setShowDropdown(false);
  };

  const removeTag = (tag: string) => {
    updateFormData({ tags: formData.tags.filter((t) => t !== tag) });
    setTagError(null);
  };

  const handleTagKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === "Enter" || e.key === ",") {
      e.preventDefault();
      addTag(tagInput);
    }
    if (e.key === "Escape") {
      setShowDropdown(false);
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
          <Label htmlFor="tags">
            Tags{" "}
            <span className="text-xs font-normal text-muted-foreground">
              ({formData.tags.length}/{MAX_TAGS})
            </span>
          </Label>

          {/* Input + dropdown wrapper */}
          <div className="relative">
            <Input
              ref={inputRef}
              id="tags"
              placeholder={
                formData.tags.length >= MAX_TAGS
                  ? `Maximum ${MAX_TAGS} tags reached`
                  : "Type a tag and press Enter, or pick from suggestions"
              }
              value={tagInput}
              disabled={formData.tags.length >= MAX_TAGS}
              onChange={(e) => {
                setTagInput(e.target.value);
                setTagError(null);
                setShowDropdown(true);
              }}
              onFocus={() => setShowDropdown(true)}
              onKeyDown={handleTagKeyDown}
              autoComplete="off"
            />

            {/* Autocomplete dropdown */}
            {showDropdown && filteredSuggestions.length > 0 && (
              <div
                ref={dropdownRef}
                className="absolute z-50 mt-1 w-full rounded-xl border border-border bg-card shadow-lg overflow-hidden"
              >
                <div className="max-h-44 overflow-y-auto py-1">
                  {filteredSuggestions.map((tag) => (
                    <button
                      key={tag}
                      type="button"
                      onMouseDown={(e) => {
                        e.preventDefault();
                        addTag(tag);
                      }}
                      className="w-full px-3 py-2 text-left text-sm hover:bg-muted/60 transition-colors"
                    >
                      {tag}
                    </button>
                  ))}
                </div>
              </div>
            )}
          </div>

          {tagError && (
            <p className="text-xs text-destructive mt-1">{tagError}</p>
          )}

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

          {/* Static suggestions (when input is empty) */}
          {!tagInput && formData.tags.length < MAX_TAGS && (
            <div className="space-y-1.5 pt-1">
              <p className="text-xs text-muted-foreground">Suggested:</p>
              <div className="flex flex-wrap gap-1.5">
                {SUGGESTED_TAGS.filter((t) => !formData.tags.includes(t)).slice(0, 8).map((tag) => (
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
          )}
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
