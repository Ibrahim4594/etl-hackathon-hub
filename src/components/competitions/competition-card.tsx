"use client";

import Link from "next/link";
import Image from "next/image";
import { Trophy, Users, Clock, ArrowRight } from "lucide-react";
import { formatDistanceToNow, isPast } from "date-fns";
import { MagicCard } from "@/components/ui/magic-card";

interface CompetitionCardProps {
  id: string;
  title: string;
  slug: string;
  tagline?: string | null;
  category?: string | null;
  tags?: string[];
  coverImageUrl?: string | null;
  organizationName: string;
  organizationLogoUrl?: string | null;
  totalPrizePool?: number;
  maxTeamSize?: number;
  minTeamSize?: number;
  submissionEnd?: Date | null;
  status: string;
  targetParticipants?: string[];
  sponsors?: { companyName: string; logoUrl: string | null; sponsorTier: string }[];
}

const STATUS_CONFIG: Record<string, { label: string; dot: string; text: string }> = {
  active: { label: "Open", dot: "bg-emerald-500", text: "text-emerald-600 dark:text-emerald-400" },
  judging: { label: "Judging", dot: "bg-amber-500", text: "text-amber-600 dark:text-amber-400" },
  completed: { label: "Ended", dot: "bg-zinc-400", text: "text-muted-foreground" },
  approved: { label: "Coming Soon", dot: "bg-blue-500", text: "text-blue-600 dark:text-blue-400" },
};

export function CompetitionCard({
  title,
  slug,
  tagline,
  category,
  tags,
  coverImageUrl,
  organizationName,
  organizationLogoUrl,
  totalPrizePool,
  maxTeamSize,
  minTeamSize,
  submissionEnd,
  status,
  targetParticipants,
}: CompetitionCardProps) {
  const statusCfg = STATUS_CONFIG[status] ?? STATUS_CONFIG.active;

  const deadlineLabel = submissionEnd
    ? isPast(new Date(submissionEnd))
      ? "Ended"
      : formatDistanceToNow(new Date(submissionEnd), { addSuffix: false }) + " left"
    : null;

  const teamLabel =
    minTeamSize && maxTeamSize
      ? minTeamSize === maxTeamSize
        ? `${maxTeamSize}`
        : `${minTeamSize}–${maxTeamSize}`
      : null;

  const prizeDisplay = totalPrizePool
    ? totalPrizePool >= 1000000
      ? `${(totalPrizePool / 1000000).toFixed(1)}M`
      : totalPrizePool >= 1000
        ? `${Math.round(totalPrizePool / 1000)}K`
        : totalPrizePool.toLocaleString()
    : null;

  return (
    <Link href={`/competitions/${slug}`} className="group block h-full">
      <MagicCard
        gradientSize={250}
        gradientOpacity={0.1}
        className="flex h-full flex-col transition-all duration-300 hover:-translate-y-0.5 hover:shadow-lg hover:border-primary/25"
      >
        {/* ── Cover Image ── */}
        {coverImageUrl && (
          <div className="relative h-32 overflow-hidden">
            <Image
              src={coverImageUrl}
              alt={title}
              fill
              className="object-cover transition-transform duration-500 group-hover:scale-105"
            />
            <div className="absolute inset-0 bg-gradient-to-t from-card to-transparent" />
          </div>
        )}

        {/* ── Content ── */}
        <div className="flex flex-1 flex-col p-5">
          {/* Status + Category */}
          <div className="flex items-center gap-2">
            <span className={`inline-flex items-center gap-1.5 text-[11px] font-semibold ${statusCfg.text}`}>
              <span className={`h-1.5 w-1.5 rounded-full ${statusCfg.dot} ${status === "active" ? "animate-pulse" : ""}`} />
              {statusCfg.label}
            </span>
            {category && (
              <>
                <span className="text-border">·</span>
                <span className="text-[11px] text-muted-foreground">{category}</span>
              </>
            )}
          </div>

          {/* Title */}
          <h3 className="mt-2.5 text-base font-semibold leading-snug text-foreground transition-colors group-hover:text-primary line-clamp-2">
            {title}
          </h3>

          {/* Org */}
          <div className="mt-1.5 flex items-center gap-2">
            {organizationLogoUrl ? (
              <Image
                src={organizationLogoUrl}
                alt={organizationName}
                width={16}
                height={16}
                className="h-4 w-4 rounded-full object-cover"
              />
            ) : (
              <div className="flex h-4 w-4 items-center justify-center rounded-full bg-muted text-[7px] font-bold text-muted-foreground">
                {organizationName.charAt(0).toUpperCase()}
              </div>
            )}
            <span className="text-[12px] text-muted-foreground">{organizationName}</span>
          </div>

          {/* Tagline */}
          {tagline && (
            <p className="mt-2 text-[12px] leading-relaxed text-muted-foreground/70 line-clamp-2">
              {tagline}
            </p>
          )}

          {/* Tags */}
          {tags && tags.length > 0 && (
            <div className="mt-3 flex flex-wrap gap-1.5">
              {tags.slice(0, 3).map((tag) => (
                <span
                  key={tag}
                  className="rounded-full bg-muted/70 px-2 py-0.5 text-[10px] text-muted-foreground"
                >
                  {tag}
                </span>
              ))}
              {tags.length > 3 && (
                <span className="rounded-full bg-muted/70 px-2 py-0.5 text-[10px] text-muted-foreground">
                  +{tags.length - 3}
                </span>
              )}
            </div>
          )}

          {/* Target participants */}
          {targetParticipants &&
            targetParticipants.length > 0 &&
            !targetParticipants.includes("all") && (
              <div className="mt-2 flex flex-wrap gap-1">
                {targetParticipants.slice(0, 2).map((tp) => (
                  <span
                    key={tp}
                    className="rounded-full bg-primary/8 text-primary px-2 py-0.5 text-[10px] font-medium"
                  >
                    {tp.replace(/_/g, " ").replace(/\b\w/g, (c) => c.toUpperCase())}
                  </span>
                ))}
              </div>
            )}

          {/* Spacer */}
          <div className="flex-1 min-h-4" />

          {/* ── Footer ── */}
          <div className="flex items-center justify-between border-t border-border/30 pt-3.5 mt-2">
            <div className="flex items-center gap-3">
              {prizeDisplay && (
                <div className="flex items-center gap-1">
                  <Trophy className="h-3.5 w-3.5 text-primary" />
                  <span className="text-[12px] font-semibold text-foreground">PKR {prizeDisplay}</span>
                </div>
              )}
              {teamLabel && (
                <div className="flex items-center gap-1 text-[11px] text-muted-foreground">
                  <Users className="h-3 w-3" />
                  {teamLabel}
                </div>
              )}
              {deadlineLabel && (
                <div className="flex items-center gap-1 text-[11px] text-muted-foreground">
                  <Clock className="h-3 w-3" />
                  {deadlineLabel}
                </div>
              )}
            </div>

            <ArrowRight className="h-3.5 w-3.5 text-muted-foreground/40 transition-all group-hover:text-primary group-hover:translate-x-0.5" />
          </div>
        </div>
      </MagicCard>
    </Link>
  );
}
