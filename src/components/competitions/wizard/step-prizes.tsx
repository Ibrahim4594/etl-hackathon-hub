"use client";

import { useCompetitionForm } from "@/hooks/use-competition-form";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { Checkbox } from "@/components/ui/checkbox";
import { Trophy, Plus, Trash2, ShieldCheck } from "lucide-react";

export function StepPrizes() {
  const { formData, updateFormData } = useCompetitionForm();

  const addPrize = () => {
    const nextPosition = formData.prizes.length + 1;
    const defaultTitles: Record<number, string> = {
      1: "1st Place",
      2: "2nd Place",
      3: "3rd Place",
    };
    updateFormData({
      prizes: [
        ...formData.prizes,
        {
          position: nextPosition,
          title: defaultTitles[nextPosition] ?? `${nextPosition}th Place`,
          amount: 0,
          currency: "PKR",
          description: "",
        },
      ],
    });
  };

  const removePrize = (index: number) => {
    const updated = formData.prizes
      .filter((_, i) => i !== index)
      .map((prize, i) => ({ ...prize, position: i + 1 }));
    updateFormData({ prizes: updated });
  };

  const updatePrize = (
    index: number,
    field: string,
    value: string | number
  ) => {
    const updated = formData.prizes.map((p, i) =>
      i === index ? { ...p, [field]: value } : p
    );
    updateFormData({ prizes: updated });
  };

  const totalPrizePool = formData.prizes.reduce(
    (sum, prize) => sum + (prize.amount || 0),
    0
  );

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat("en-PK", {
      style: "currency",
      currency: "PKR",
      minimumFractionDigits: 0,
      maximumFractionDigits: 0,
    }).format(amount);
  };

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Trophy className="size-5 text-primary" />
            Prizes
          </CardTitle>
          <CardDescription>
            Define the prizes for your competition. Attractive prizes help draw more
            participants.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
          {/* Total Prize Pool */}
          <div className="flex items-center justify-between rounded-lg bg-primary/5 p-4">
            <div>
              <p className="text-sm font-medium text-muted-foreground">Total Prize Pool</p>
              <p className="text-2xl font-bold text-primary">{formatCurrency(totalPrizePool)}</p>
            </div>
            <Badge variant="secondary">
              {formData.prizes.length} {formData.prizes.length === 1 ? "prize" : "prizes"}
            </Badge>
          </div>

          <Separator />

          {/* Prize List */}
          {formData.prizes.length === 0 && (
            <div className="rounded-lg border border-dashed p-6 text-center">
              <Trophy className="mx-auto size-8 text-muted-foreground/50" />
              <p className="mt-2 text-sm text-muted-foreground">
                No prizes added yet. Add prizes to incentivize participants.
              </p>
            </div>
          )}

          <div className="space-y-4">
            {formData.prizes.map((prize, index) => (
              <div key={index} className="rounded-lg border p-4 space-y-4">
                <div className="flex items-center justify-between">
                  <Badge variant="outline">Position #{prize.position}</Badge>
                  <Button
                    variant="ghost"
                    size="icon-sm"
                    className="text-muted-foreground hover:text-destructive"
                    onClick={() => removePrize(index)}
                  >
                    <Trash2 className="size-4" />
                  </Button>
                </div>

                <div className="grid gap-4 sm:grid-cols-2">
                  <div className="space-y-2">
                    <Label htmlFor={`prize-title-${index}`}>Prize Title</Label>
                    <Input
                      id={`prize-title-${index}`}
                      placeholder="e.g., 1st Place"
                      value={prize.title}
                      onChange={(e) => updatePrize(index, "title", e.target.value)}
                    />
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor={`prize-amount-${index}`}>Amount (PKR)</Label>
                    <Input
                      id={`prize-amount-${index}`}
                      type="number"
                      min={0}
                      placeholder="0"
                      value={prize.amount || ""}
                      onChange={(e) =>
                        updatePrize(index, "amount", parseInt(e.target.value) || 0)
                      }
                    />
                  </div>
                </div>

                <div className="grid gap-4 sm:grid-cols-2">
                  <div className="space-y-2">
                    <Label htmlFor={`prize-currency-${index}`}>Currency</Label>
                    <Input
                      id={`prize-currency-${index}`}
                      placeholder="PKR"
                      value={prize.currency}
                      onChange={(e) => updatePrize(index, "currency", e.target.value)}
                    />
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor={`prize-desc-${index}`}>Description (optional)</Label>
                    <Input
                      id={`prize-desc-${index}`}
                      placeholder="Additional prize details"
                      value={prize.description ?? ""}
                      onChange={(e) => updatePrize(index, "description", e.target.value)}
                    />
                  </div>
                </div>
              </div>
            ))}
          </div>

          <Button variant="outline" onClick={addPrize} className="w-full">
            <Plus className="size-4" />
            Add Prize
          </Button>

          <Separator />

          {/* Prize Confirmation */}
          <div className="rounded-lg border border-primary/20 bg-primary/5 p-4 space-y-3">
            <div className="flex items-start gap-3">
              <Checkbox
                id="prize-confirmed"
                checked={formData.prizeConfirmed}
                onCheckedChange={(checked) =>
                  updateFormData({ prizeConfirmed: checked === true })
                }
                className="mt-0.5 border-primary data-[state=checked]:bg-primary data-[state=checked]:text-primary-foreground"
              />
              <Label htmlFor="prize-confirmed" className="text-sm leading-relaxed cursor-pointer">
                <ShieldCheck className="inline size-4 text-primary mr-1 -mt-0.5" />
                I confirm that the prize pool of{" "}
                <strong className="text-primary">{formatCurrency(totalPrizePool)} PKR</strong>{" "}
                is secured and ready for distribution to winners.
              </Label>
            </div>
            <p className="text-xs text-muted-foreground pl-7">
              Prize money must be available before your competition can go live.
              ETL will verify prize availability during the review process.
            </p>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
