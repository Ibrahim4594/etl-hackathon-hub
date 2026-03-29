"use client";

import { useState } from "react";
import { useCompetitionForm } from "@/hooks/use-competition-form";
import type { CompetitionSponsorInput } from "@/lib/validators/competition";
import { contributionTypes, sponsorTiers } from "@/lib/validators/competition";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Building2,
  Plus,
  Trash2,
  ChevronDown,
  ChevronUp,
  ExternalLink,
  Star,
  GripVertical,
} from "lucide-react";
import { ImageUpload } from "@/components/shared/image-upload";

const TIER_COLORS: Record<string, string> = {
  title: "bg-primary/10 text-primary border-primary/20",
  gold: "bg-amber-500/10 text-amber-500 border-amber-500/20",
  silver: "bg-zinc-400/10 text-zinc-400 border-zinc-400/20",
  bronze: "bg-orange-500/10 text-orange-500 border-orange-500/20",
  partner: "bg-blue-500/10 text-blue-400 border-blue-500/20",
};

const TIER_LABELS: Record<string, string> = {
  title: "Title Sponsor",
  gold: "Gold",
  silver: "Silver",
  bronze: "Bronze",
  partner: "Partner",
};

const CONTRIBUTION_LABELS: Record<string, string> = {
  monetary: "Cash/Monetary",
  tech_credits: "Tech Credits",
  mentorship: "Mentorship",
  internships: "Internships",
  prizes_inkind: "In-Kind Prizes",
  cloud_services: "Cloud Services",
  api_credits: "API Credits",
  other: "Other",
};

function createDefaultSponsor(): CompetitionSponsorInput {
  return {
    companyName: "",
    logoUrl: "",
    website: "",
    contributionType: "monetary",
    contributionTitle: "",
    contributionDescription: "",
    contributionAmount: undefined,
    contactPersonName: "",
    contactPersonEmail: "",
    contactPersonPhone: "",
    sponsorTier: "partner",
    featured: false,
  };
}

export function StepSponsors() {
  const { formData, updateFormData } = useCompetitionForm();
  const [expandedIndex, setExpandedIndex] = useState<number>(-1);
  const [contactExpanded, setContactExpanded] = useState<Record<number, boolean>>({});

  const updateSponsor = (
    index: number,
    field: keyof CompetitionSponsorInput,
    value: string | number | boolean | undefined
  ) => {
    const updated = formData.sponsors.map((s, i) =>
      i === index ? { ...s, [field]: value } : s
    );
    updateFormData({ sponsors: updated });
  };

  const removeSponsor = (index: number) => {
    const updated = formData.sponsors.filter((_, i) => i !== index);
    updateFormData({ sponsors: updated });
    if (expandedIndex === index) {
      setExpandedIndex(-1);
    } else if (expandedIndex > index) {
      setExpandedIndex(expandedIndex - 1);
    }
  };

  const addSponsor = () => {
    if (formData.sponsors.length >= 10) return;
    const newIndex = formData.sponsors.length;
    updateFormData({
      sponsors: [...formData.sponsors, createDefaultSponsor()],
    });
    setExpandedIndex(newIndex);
  };

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat("en-PK", {
      style: "currency",
      currency: "PKR",
      minimumFractionDigits: 0,
      maximumFractionDigits: 0,
    }).format(amount);
  };

  // Group sponsors by tier for preview
  const sponsorsByTier = formData.sponsors.reduce<
    Record<string, CompetitionSponsorInput[]>
  >((acc, sponsor) => {
    const tier = sponsor.sponsorTier;
    if (!acc[tier]) acc[tier] = [];
    acc[tier].push(sponsor);
    return acc;
  }, {});

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Building2 className="size-5 text-primary" />
            Competition Sponsors
          </CardTitle>
          <CardDescription>
            Add companies and organizations backing this hackathon. More sponsors
            = bigger prizes = more participants.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
          {/* Info Note */}
          <div className="rounded-lg bg-muted/50 p-3">
            <p className="text-sm text-muted-foreground">
              Your organization is automatically listed as the primary organizer.
              Add any additional sponsors below.
            </p>
          </div>

          {/* Sponsor List */}
          {formData.sponsors.length === 0 && (
            <div className="rounded-lg border border-dashed p-6 text-center">
              <Building2 className="mx-auto size-8 text-muted-foreground/50" />
              <p className="mt-2 text-sm text-muted-foreground">
                No sponsors added yet. Add sponsors to increase the credibility
                and reach of your competition.
              </p>
            </div>
          )}

          <div className="space-y-3">
            {formData.sponsors.map((sponsor, index) => {
              const isExpanded = expandedIndex === index;
              const isContactExpanded = contactExpanded[index] ?? false;
              const showAmount =
                sponsor.contributionType === "monetary" ||
                sponsor.contributionType === "tech_credits";

              return (
                <div
                  key={index}
                  className="rounded-lg border p-4 space-y-4 transition-all"
                >
                  {/* Collapsed Header */}
                  <div className="flex items-center gap-3">
                    <GripVertical className="size-4 shrink-0 text-muted-foreground/40" />

                    <div className="flex flex-1 items-center gap-2 min-w-0">
                      <span className="font-medium truncate">
                        {sponsor.companyName || "Untitled Sponsor"}
                      </span>
                      <Badge
                        variant="outline"
                        className={`shrink-0 border ${TIER_COLORS[sponsor.sponsorTier] ?? ""}`}
                      >
                        {TIER_LABELS[sponsor.sponsorTier] ?? sponsor.sponsorTier}
                      </Badge>
                      <Badge variant="secondary" className="shrink-0">
                        {CONTRIBUTION_LABELS[sponsor.contributionType] ??
                          sponsor.contributionType}
                      </Badge>
                      {showAmount && sponsor.contributionAmount ? (
                        <span className="text-sm text-muted-foreground shrink-0">
                          {formatCurrency(sponsor.contributionAmount)}
                        </span>
                      ) : null}
                      {sponsor.featured && (
                        <Star className="size-4 shrink-0 fill-amber-400 text-amber-400" />
                      )}
                    </div>

                    <div className="flex items-center gap-1 shrink-0">
                      <Button
                        variant="ghost"
                        size="icon-sm"
                        className="text-muted-foreground"
                        onClick={() =>
                          setExpandedIndex(isExpanded ? -1 : index)
                        }
                      >
                        {isExpanded ? (
                          <ChevronUp className="size-4" />
                        ) : (
                          <ChevronDown className="size-4" />
                        )}
                      </Button>
                      <Button
                        variant="ghost"
                        size="icon-sm"
                        className="text-muted-foreground hover:text-destructive"
                        onClick={() => removeSponsor(index)}
                      >
                        <Trash2 className="size-4" />
                      </Button>
                    </div>
                  </div>

                  {/* Expanded Form */}
                  {isExpanded && (
                    <div className="space-y-4 pt-2 border-t">
                      {/* Row 1: Company Name + Logo Upload */}
                      <div className="grid gap-4 sm:grid-cols-2">
                        <div className="space-y-2">
                          <Label htmlFor={`sponsor-name-${index}`}>
                            Company Name{" "}
                            <span className="text-destructive">*</span>
                          </Label>
                          <Input
                            id={`sponsor-name-${index}`}
                            placeholder="e.g., TechCorp Pakistan"
                            value={sponsor.companyName}
                            onChange={(e) =>
                              updateSponsor(index, "companyName", e.target.value)
                            }
                          />
                        </div>

                        <div className="space-y-2">
                          <Label>Sponsor Logo</Label>
                          <ImageUpload
                            value={sponsor.logoUrl ?? ""}
                            onChange={(url) =>
                              updateSponsor(index, "logoUrl", url)
                            }
                            label="Upload Logo"
                            placeholder={sponsor.companyName || "Logo"}
                            aspect="square"
                          />
                        </div>
                      </div>

                      {/* Row 2: Website + Sponsor Tier */}
                      <div className="grid gap-4 sm:grid-cols-2">
                        <div className="space-y-2">
                          <Label htmlFor={`sponsor-website-${index}`}>
                            Website
                          </Label>
                          <div className="relative">
                            <Input
                              id={`sponsor-website-${index}`}
                              placeholder="https://example.com"
                              value={sponsor.website ?? ""}
                              onChange={(e) =>
                                updateSponsor(
                                  index,
                                  "website",
                                  e.target.value
                                )
                              }
                            />
                            {sponsor.website && (
                              <a
                                href={sponsor.website}
                                target="_blank"
                                rel="noopener noreferrer"
                                className="absolute right-2 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-primary"
                              >
                                <ExternalLink className="size-3.5" />
                              </a>
                            )}
                          </div>
                        </div>

                        <div className="space-y-2">
                          <Label>Sponsor Tier</Label>
                          <Select
                            value={sponsor.sponsorTier}
                            onValueChange={(val) =>
                              updateSponsor(
                                index,
                                "sponsorTier",
                                val as CompetitionSponsorInput["sponsorTier"]
                              )
                            }
                          >
                            <SelectTrigger className="w-full">
                              <SelectValue placeholder="Select tier" />
                            </SelectTrigger>
                            <SelectContent>
                              {sponsorTiers.map((tier) => (
                                <SelectItem key={tier} value={tier}>
                                  {TIER_LABELS[tier]}
                                </SelectItem>
                              ))}
                            </SelectContent>
                          </Select>
                        </div>
                      </div>

                      {/* Row 3: Contribution Type + Contribution Title */}
                      <div className="grid gap-4 sm:grid-cols-2">
                        <div className="space-y-2">
                          <Label>Contribution Type</Label>
                          <Select
                            value={sponsor.contributionType}
                            onValueChange={(val) =>
                              updateSponsor(
                                index,
                                "contributionType",
                                val as CompetitionSponsorInput["contributionType"]
                              )
                            }
                          >
                            <SelectTrigger className="w-full">
                              <SelectValue placeholder="Select type" />
                            </SelectTrigger>
                            <SelectContent>
                              {contributionTypes.map((type) => (
                                <SelectItem key={type} value={type}>
                                  {CONTRIBUTION_LABELS[type]}
                                </SelectItem>
                              ))}
                            </SelectContent>
                          </Select>
                        </div>

                        <div className="space-y-2">
                          <Label htmlFor={`sponsor-ctitle-${index}`}>
                            Contribution Title{" "}
                            <span className="text-destructive">*</span>
                          </Label>
                          <Input
                            id={`sponsor-ctitle-${index}`}
                            placeholder="e.g., Cash Prize Sponsor"
                            value={sponsor.contributionTitle}
                            onChange={(e) =>
                              updateSponsor(
                                index,
                                "contributionTitle",
                                e.target.value
                              )
                            }
                          />
                        </div>
                      </div>

                      {/* Contribution Description */}
                      <div className="space-y-2">
                        <Label htmlFor={`sponsor-cdesc-${index}`}>
                          Contribution Description
                        </Label>
                        <Textarea
                          id={`sponsor-cdesc-${index}`}
                          placeholder="Describe what this sponsor is contributing..."
                          value={sponsor.contributionDescription ?? ""}
                          onChange={(e) =>
                            updateSponsor(
                              index,
                              "contributionDescription",
                              e.target.value
                            )
                          }
                          rows={2}
                        />
                      </div>

                      {/* Contribution Amount - only for monetary/tech_credits */}
                      {showAmount && (
                        <div className="space-y-2">
                          <Label htmlFor={`sponsor-amount-${index}`}>
                            Contribution Amount
                          </Label>
                          <div className="flex items-center gap-2">
                            <span className="rounded-md border bg-muted px-3 py-2 text-sm text-muted-foreground">
                              PKR
                            </span>
                            <Input
                              id={`sponsor-amount-${index}`}
                              type="number"
                              min={0}
                              placeholder="0"
                              value={sponsor.contributionAmount ?? ""}
                              onChange={(e) =>
                                updateSponsor(
                                  index,
                                  "contributionAmount",
                                  parseInt(e.target.value) || 0
                                )
                              }
                              className="flex-1"
                            />
                          </div>
                        </div>
                      )}

                      {/* Contact Info - Collapsible */}
                      <div className="rounded-lg border">
                        <button
                          type="button"
                          className="flex w-full items-center justify-between p-3 text-sm font-medium text-muted-foreground hover:text-foreground transition-colors"
                          onClick={() =>
                            setContactExpanded((prev) => ({
                              ...prev,
                              [index]: !isContactExpanded,
                            }))
                          }
                        >
                          Contact Info
                          {isContactExpanded ? (
                            <ChevronUp className="size-4" />
                          ) : (
                            <ChevronDown className="size-4" />
                          )}
                        </button>
                        {isContactExpanded && (
                          <div className="space-y-4 border-t p-3">
                            <div className="grid gap-4 sm:grid-cols-3">
                              <div className="space-y-2">
                                <Label
                                  htmlFor={`sponsor-contact-name-${index}`}
                                >
                                  Name
                                </Label>
                                <Input
                                  id={`sponsor-contact-name-${index}`}
                                  placeholder="Contact person name"
                                  value={sponsor.contactPersonName ?? ""}
                                  onChange={(e) =>
                                    updateSponsor(
                                      index,
                                      "contactPersonName",
                                      e.target.value
                                    )
                                  }
                                />
                              </div>
                              <div className="space-y-2">
                                <Label
                                  htmlFor={`sponsor-contact-email-${index}`}
                                >
                                  Email
                                </Label>
                                <Input
                                  id={`sponsor-contact-email-${index}`}
                                  type="email"
                                  placeholder="email@company.com"
                                  value={sponsor.contactPersonEmail ?? ""}
                                  onChange={(e) =>
                                    updateSponsor(
                                      index,
                                      "contactPersonEmail",
                                      e.target.value
                                    )
                                  }
                                />
                              </div>
                              <div className="space-y-2">
                                <Label
                                  htmlFor={`sponsor-contact-phone-${index}`}
                                >
                                  Phone
                                </Label>
                                <Input
                                  id={`sponsor-contact-phone-${index}`}
                                  type="tel"
                                  placeholder="+92 300 1234567"
                                  value={sponsor.contactPersonPhone ?? ""}
                                  onChange={(e) =>
                                    updateSponsor(
                                      index,
                                      "contactPersonPhone",
                                      e.target.value
                                    )
                                  }
                                />
                              </div>
                            </div>
                          </div>
                        )}
                      </div>

                      {/* Featured Toggle */}
                      <div className="flex items-center justify-between rounded-lg border p-3">
                        <div className="space-y-0.5">
                          <Label className="text-sm font-medium cursor-pointer">
                            Featured Sponsor
                          </Label>
                          <p className="text-xs text-muted-foreground">
                            Highlight this sponsor on the competition page
                          </p>
                        </div>
                        <button
                          type="button"
                          role="switch"
                          aria-checked={sponsor.featured}
                          onClick={() =>
                            updateSponsor(index, "featured", !sponsor.featured)
                          }
                          className={`relative inline-flex h-5 w-9 shrink-0 cursor-pointer items-center rounded-full border-2 border-transparent transition-colors ${
                            sponsor.featured
                              ? "bg-primary"
                              : "bg-muted-foreground/20"
                          }`}
                        >
                          <span
                            className={`pointer-events-none block size-4 rounded-full bg-white shadow-sm transition-transform ${
                              sponsor.featured
                                ? "translate-x-4"
                                : "translate-x-0"
                            }`}
                          />
                        </button>
                      </div>
                    </div>
                  )}
                </div>
              );
            })}
          </div>

          {/* Add Sponsor Button */}
          <Button
            variant="outline"
            onClick={addSponsor}
            className="w-full"
            disabled={formData.sponsors.length >= 10}
          >
            <Plus className="size-4" />
            Add Sponsor
          </Button>
        </CardContent>
      </Card>

      {/* Preview Section */}
      {formData.sponsors.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle className="text-sm font-medium">
              Preview: How sponsors will appear to participants
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            {/* Title Sponsors - Full Width */}
            {sponsorsByTier["title"] && sponsorsByTier["title"].length > 0 && (
              <div className="space-y-2">
                <p className="text-xs font-medium uppercase tracking-wider text-muted-foreground">
                  Title Sponsors
                </p>
                <div className="grid grid-cols-1 gap-3">
                  {sponsorsByTier["title"].map((sponsor, i) => (
                    <SponsorPreviewCard key={`title-${i}`} sponsor={sponsor} />
                  ))}
                </div>
              </div>
            )}

            {/* Gold Sponsors - 2 Column */}
            {sponsorsByTier["gold"] && sponsorsByTier["gold"].length > 0 && (
              <div className="space-y-2">
                <p className="text-xs font-medium uppercase tracking-wider text-muted-foreground">
                  Gold Sponsors
                </p>
                <div className="grid grid-cols-2 gap-3">
                  {sponsorsByTier["gold"].map((sponsor, i) => (
                    <SponsorPreviewCard key={`gold-${i}`} sponsor={sponsor} />
                  ))}
                </div>
              </div>
            )}

            {/* Silver Sponsors - 3 Column */}
            {sponsorsByTier["silver"] &&
              sponsorsByTier["silver"].length > 0 && (
                <div className="space-y-2">
                  <p className="text-xs font-medium uppercase tracking-wider text-muted-foreground">
                    Silver Sponsors
                  </p>
                  <div className="grid grid-cols-3 gap-3">
                    {sponsorsByTier["silver"].map((sponsor, i) => (
                      <SponsorPreviewCard
                        key={`silver-${i}`}
                        sponsor={sponsor}
                      />
                    ))}
                  </div>
                </div>
              )}

            {/* Bronze Sponsors - 3 Column */}
            {sponsorsByTier["bronze"] &&
              sponsorsByTier["bronze"].length > 0 && (
                <div className="space-y-2">
                  <p className="text-xs font-medium uppercase tracking-wider text-muted-foreground">
                    Bronze Sponsors
                  </p>
                  <div className="grid grid-cols-3 gap-3">
                    {sponsorsByTier["bronze"].map((sponsor, i) => (
                      <SponsorPreviewCard
                        key={`bronze-${i}`}
                        sponsor={sponsor}
                      />
                    ))}
                  </div>
                </div>
              )}

            {/* Partners - Logo Row */}
            {sponsorsByTier["partner"] &&
              sponsorsByTier["partner"].length > 0 && (
                <div className="space-y-2">
                  <p className="text-xs font-medium uppercase tracking-wider text-muted-foreground">
                    Partners
                  </p>
                  <div className="flex flex-wrap items-center gap-3">
                    {sponsorsByTier["partner"].map((sponsor, i) => (
                      <div
                        key={`partner-${i}`}
                        className="flex items-center gap-2 rounded-lg border px-3 py-2"
                      >
                        {sponsor.logoUrl ? (
                          <img
                            src={sponsor.logoUrl}
                            alt={sponsor.companyName}
                            className="size-5 rounded object-contain"
                            onError={(e) => {
                              (e.target as HTMLImageElement).style.display =
                                "none";
                            }}
                          />
                        ) : (
                          <Building2 className="size-4 text-muted-foreground" />
                        )}
                        <span className="text-sm">
                          {sponsor.companyName || "Untitled"}
                        </span>
                      </div>
                    ))}
                  </div>
                </div>
              )}
          </CardContent>
        </Card>
      )}
    </div>
  );
}

function SponsorPreviewCard({
  sponsor,
}: {
  sponsor: CompetitionSponsorInput;
}) {
  return (
    <div className="flex items-center gap-3 rounded-lg border p-3">
      {sponsor.logoUrl ? (
        <img
          src={sponsor.logoUrl}
          alt={sponsor.companyName}
          className="size-8 rounded object-contain"
          onError={(e) => {
            (e.target as HTMLImageElement).style.display = "none";
          }}
        />
      ) : (
        <div className="flex size-8 items-center justify-center rounded bg-muted">
          <Building2 className="size-4 text-muted-foreground" />
        </div>
      )}
      <div className="min-w-0 flex-1">
        <p className="truncate text-sm font-medium">
          {sponsor.companyName || "Untitled Sponsor"}
        </p>
        <div className="flex items-center gap-1.5 mt-0.5">
          <Badge
            variant="outline"
            className={`border text-[10px] h-4 ${TIER_COLORS[sponsor.sponsorTier] ?? ""}`}
          >
            {TIER_LABELS[sponsor.sponsorTier] ?? sponsor.sponsorTier}
          </Badge>
          <Badge variant="secondary" className="text-[10px] h-4">
            {CONTRIBUTION_LABELS[sponsor.contributionType] ??
              sponsor.contributionType}
          </Badge>
        </div>
      </div>
    </div>
  );
}
