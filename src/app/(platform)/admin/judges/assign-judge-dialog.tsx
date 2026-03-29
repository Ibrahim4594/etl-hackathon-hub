"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { UserPlus } from "lucide-react";
import { toast } from "sonner";
import { useRouter } from "next/navigation";

interface AssignJudgeDialogProps {
  judgeEmail: string;
  judgeName: string;
  competitions: { id: string; title: string }[];
}

export function AssignJudgeDialog({
  judgeEmail,
  judgeName,
  competitions,
}: AssignJudgeDialogProps) {
  const [open, setOpen] = useState(false);
  const [selectedCompetition, setSelectedCompetition] = useState<string>("");
  const [loading, setLoading] = useState(false);
  const router = useRouter();

  async function handleAssign() {
    if (!selectedCompetition) {
      toast.error("Please select a competition");
      return;
    }

    setLoading(true);
    try {
      const res = await fetch("/api/judge/invite", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          email: judgeEmail,
          competitionId: selectedCompetition,
        }),
      });

      const data = await res.json();

      if (!res.ok) {
        toast.error(data.error ?? "Failed to assign judge");
        return;
      }

      toast.success(`${judgeName} assigned successfully`);
      setOpen(false);
      setSelectedCompetition("");
      router.refresh();
    } catch {
      toast.error("Something went wrong");
    } finally {
      setLoading(false);
    }
  }

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger
        render={
          <Button variant="outline" size="sm">
            <UserPlus className="size-4 mr-1.5" />
            Assign
          </Button>
        }
      />
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Assign Judge to Competition</DialogTitle>
          <DialogDescription>
            Assign <span className="font-medium text-foreground">{judgeName}</span> to
            a competition. They will receive a notification and email.
          </DialogDescription>
        </DialogHeader>

        <div className="py-4">
          <label className="text-[13px] font-medium text-foreground/70 mb-2 block">
            Competition
          </label>
          <Select
            value={selectedCompetition}
            onValueChange={(val) => setSelectedCompetition(val ?? "")}
          >
            <SelectTrigger className="w-full h-10 rounded-xl bg-background/50">
              <SelectValue placeholder="Select a competition" />
            </SelectTrigger>
            <SelectContent>
              {competitions.length === 0 ? (
                <SelectItem value="_none" disabled>
                  No competitions available
                </SelectItem>
              ) : (
                competitions.map((comp) => (
                  <SelectItem key={comp.id} value={comp.id}>
                    {comp.title}
                  </SelectItem>
                ))
              )}
            </SelectContent>
          </Select>
        </div>

        <DialogFooter>
          <Button
            onClick={handleAssign}
            disabled={loading || !selectedCompetition}
          >
            {loading ? "Assigning..." : "Assign Judge"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
