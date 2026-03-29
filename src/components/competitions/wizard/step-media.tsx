"use client";

import { useCompetitionForm } from "@/hooks/use-competition-form";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import { Image } from "lucide-react";
import { ImageUpload } from "@/components/shared/image-upload";

export function StepMedia() {
  const { formData, updateFormData } = useCompetitionForm();

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Image className="size-5 text-primary" />
          Media & Branding
        </CardTitle>
        <CardDescription>
          Upload visual assets for your competition page.
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-8">
        {/* Cover Image */}
        <div className="space-y-3">
          <Label>Cover Image</Label>
          <p className="text-xs text-muted-foreground">
            Recommended size: 1200x630px. Used as the banner on your competition page.
          </p>
          <ImageUpload
            value={formData.coverImageUrl ?? ""}
            onChange={(url) => updateFormData({ coverImageUrl: url })}
            label="Upload Cover Image"
            aspect="banner"
          />
        </div>

        {/* Logo */}
        <div className="space-y-3">
          <Label>Competition Logo</Label>
          <p className="text-xs text-muted-foreground">
            Recommended size: 200x200px. Square format works best.
          </p>
          <ImageUpload
            value={formData.logoUrl ?? ""}
            onChange={(url) => updateFormData({ logoUrl: url })}
            label="Upload Logo"
            aspect="square"
          />
        </div>
      </CardContent>
    </Card>
  );
}
