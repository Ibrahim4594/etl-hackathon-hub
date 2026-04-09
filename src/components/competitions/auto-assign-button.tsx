"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Wand2 } from "lucide-react";

interface Props {
  competitionId: string;
  judgesCount: number;
}

export function AutoAssignButton({ competitionId, judgesCount }: Props) {
  const [loading, setLoading] = useState(false);
  const router = useRouter();

  async function handleAutoAssign() {
    setLoading(true);
    try {
      const res = await fetch(`/api/competitions/${competitionId}/auto-assign`, { method: "POST" });
      const data = await res.json();
      if (!res.ok) {
        toast.error(data.error ?? "Auto-assign failed");
      } else {
        toast.success(
          `Assigned ${data.submissions} submission${data.submissions !== 1 ? "s" : ""} to ${data.assigned} judge${data.assigned !== 1 ? "s" : ""}`,
        );
        router.refresh();
      }
    } catch {
      toast.error("Something went wrong");
    } finally {
      setLoading(false);
    }
  }

  if (judgesCount === 0) return null;

  return (
    <Button variant="outline" size="sm" onClick={handleAutoAssign} disabled={loading}>
      <Wand2 className="mr-1.5 h-3.5 w-3.5" />
      {loading ? "Assigning…" : "Auto-Assign"}
    </Button>
  );
}
