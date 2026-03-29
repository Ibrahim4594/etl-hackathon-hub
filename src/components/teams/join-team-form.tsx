"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent } from "@/components/ui/card";
import { Loader2, UserPlus } from "lucide-react";
import { toast } from "sonner";

export function JoinTeamForm() {
  const router = useRouter();
  const [code, setCode] = useState("");
  const [loading, setLoading] = useState(false);

  const handleJoin = async (e: React.FormEvent) => {
    e.preventDefault();
    const trimmed = code.trim().toUpperCase();
    if (!trimmed) {
      toast.error("Please enter an invite code");
      return;
    }
    setLoading(true);
    try {
      const res = await fetch(`/api/teams/join`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ inviteCode: trimmed }),
      });
      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.error || "Failed to join team");
      }
      toast.success(`Joined team "${data.team.name}"!`);
      setCode("");
      router.refresh();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Failed to join team");
    } finally {
      setLoading(false);
    }
  };

  return (
    <Card className="border-dashed">
      <CardContent className="pt-6">
        <form onSubmit={handleJoin} className="flex items-center gap-3">
          <UserPlus className="h-5 w-5 text-muted-foreground shrink-0" />
          <Input
            placeholder="Enter invite code to join a team..."
            value={code}
            onChange={(e) => setCode(e.target.value)}
            className="flex-1 font-mono uppercase"
            maxLength={8}
          />
          <Button type="submit" disabled={loading || !code.trim()} size="sm">
            {loading && <Loader2 className="mr-1.5 h-3.5 w-3.5 animate-spin" />}
            Join Team
          </Button>
        </form>
      </CardContent>
    </Card>
  );
}
