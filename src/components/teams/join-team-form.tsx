"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent } from "@/components/ui/card";
import { Loader2, UserPlus } from "lucide-react";
import { toast } from "sonner";

const joinSchema = z.object({
  code: z.string().min(1, "Invite code cannot be empty"),
});

type JoinFormValues = z.infer<typeof joinSchema>;

export function JoinTeamForm() {
  const router = useRouter();
  const [loading, setLoading] = useState(false);

  const {
    register,
    handleSubmit,
    reset,
    formState: { errors },
  } = useForm<JoinFormValues>({
    resolver: zodResolver(joinSchema),
  });

  const onSubmit = async (values: JoinFormValues) => {
    const trimmed = values.code.trim().toUpperCase();
    setLoading(true);
    try {
      const res = await fetch(`/api/teams/join`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ inviteCode: trimmed }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Failed to join team");
      toast.success(`Joined team "${data.team.name}"!`);
      reset();
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
        <form onSubmit={handleSubmit(onSubmit)} className="space-y-2">
          <div className="flex items-center gap-3">
            <UserPlus className="h-5 w-5 text-muted-foreground shrink-0" />
            <Input
              placeholder="Enter invite code to join a team..."
              className="flex-1 font-mono uppercase"
              maxLength={8}
              {...register("code")}
            />
            <Button type="submit" disabled={loading} size="sm">
              {loading && <Loader2 className="mr-1.5 h-3.5 w-3.5 animate-spin" />}
              Join Team
            </Button>
          </div>
          {errors.code && (
            <p className="text-xs text-destructive mt-1 pl-8">{errors.code.message}</p>
          )}
        </form>
      </CardContent>
    </Card>
  );
}
