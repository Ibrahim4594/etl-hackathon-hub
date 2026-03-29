"use client";

import { useRef } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Search, X, SlidersHorizontal } from "lucide-react";

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
];

const STATUSES = [
  { value: "", label: "All Statuses" },
  { value: "active", label: "Open" },
  { value: "judging", label: "Judging" },
  { value: "completed", label: "Completed" },
];

const SORTS = [
  { value: "", label: "Newest First" },
  { value: "deadline", label: "Deadline Soon" },
  { value: "prize", label: "Highest Prize" },
];

export function CompetitionFilters() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const currentSearch = searchParams.get("search") || "";
  const currentCategory = searchParams.get("category") || "";
  const currentSort = searchParams.get("sort") || "";
  const currentStatus = searchParams.get("status") || "";
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const hasFilters = currentSearch || currentCategory || currentSort || currentStatus;

  function updateParams(key: string, value: string | null) {
    const params = new URLSearchParams(searchParams.toString());
    if (value) {
      params.set(key, value);
    } else {
      params.delete(key);
    }
    params.delete("page");
    router.push(`/competitions?${params.toString()}`);
  }

  function clearFilters() {
    router.push("/competitions");
  }

  return (
    <div className="sticky top-0 z-20 -mx-4 bg-background/95 px-4 pb-4 pt-2 sm:-mx-6 sm:px-6 lg:-mx-8 lg:px-8">
      {/* Search bar */}
      <div className="relative">
        <Search className="absolute left-4 top-1/2 h-5 w-5 -translate-y-1/2 text-muted-foreground" />
        <Input
          placeholder="Search competitions by name, tech stack, or organizer..."
          defaultValue={currentSearch}
          className="h-12 rounded-xl border-border bg-card pl-12 pr-12 text-base shadow-lg ring-offset-background transition-shadow focus-visible:shadow-xl focus-visible:ring-2 focus-visible:ring-primary/40"
          onChange={(e) => {
            if (debounceRef.current) clearTimeout(debounceRef.current);
            const value = e.target.value;
            debounceRef.current = setTimeout(
              () => updateParams("search", value),
              300
            );
          }}
        />
        {hasFilters && (
          <button
            onClick={clearFilters}
            className="absolute right-4 top-1/2 -translate-y-1/2 rounded-full p-1 text-muted-foreground transition-colors hover:bg-muted hover:text-foreground"
          >
            <X className="h-4 w-4" />
          </button>
        )}
      </div>

      {/* Category pills */}
      <div className="mt-4 flex flex-wrap gap-2">
        <button
          onClick={() => updateParams("category", "")}
          className={`inline-flex items-center rounded-full px-3.5 py-1.5 text-sm font-medium transition-all ${
            !currentCategory
              ? "bg-primary text-primary-foreground shadow-sm"
              : "border border-border bg-card text-foreground hover:border-primary/50 hover:text-primary"
          }`}
        >
          All
        </button>
        {CATEGORIES.map((cat) => (
          <button
            key={cat}
            onClick={() =>
              updateParams("category", currentCategory === cat ? "" : cat)
            }
            className={`inline-flex items-center rounded-full px-3.5 py-1.5 text-sm font-medium transition-all ${
              currentCategory === cat
                ? "bg-primary text-primary-foreground shadow-sm"
                : "border border-border bg-card text-foreground hover:border-primary/50 hover:text-primary"
            }`}
          >
            {cat}
          </button>
        ))}
      </div>

      {/* Sort & Status filters row */}
      <div className="mt-3 flex flex-wrap items-center gap-3">
        <div className="flex items-center gap-1.5 text-sm text-muted-foreground">
          <SlidersHorizontal className="h-4 w-4" />
          <span className="hidden sm:inline">Filters:</span>
        </div>

        <Select
          value={currentStatus}
          onValueChange={(v) => updateParams("status", v)}
        >
          <SelectTrigger className="h-9 w-[150px] rounded-lg border-border bg-card text-sm">
            <SelectValue placeholder="All Statuses" />
          </SelectTrigger>
          <SelectContent>
            {STATUSES.map((s) => (
              <SelectItem key={s.value} value={s.value || "all"}>
                {s.label}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>

        <Select
          value={currentSort}
          onValueChange={(v) => updateParams("sort", v)}
        >
          <SelectTrigger className="h-9 w-[160px] rounded-lg border-border bg-card text-sm">
            <SelectValue placeholder="Newest First" />
          </SelectTrigger>
          <SelectContent>
            {SORTS.map((s) => (
              <SelectItem key={s.value} value={s.value || "newest"}>
                {s.label}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>

        {hasFilters && (
          <Button
            variant="ghost"
            size="sm"
            onClick={clearFilters}
            className="h-9 text-xs text-muted-foreground hover:text-foreground"
          >
            <X className="mr-1 h-3 w-3" />
            Clear all
          </Button>
        )}
      </div>
    </div>
  );
}
