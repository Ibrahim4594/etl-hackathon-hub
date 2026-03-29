"use client";

import { useCompetitionForm, WIZARD_STEPS, STEP_TITLES } from "@/hooks/use-competition-form";
import { Button } from "@/components/ui/button";
import { Separator } from "@/components/ui/separator";
import { ChevronLeft, ChevronRight, Check } from "lucide-react";
import { cn } from "@/lib/utils";

interface WizardShellProps {
  children: React.ReactNode;
}

export function WizardShell({ children }: WizardShellProps) {
  const { currentStep, setStep } = useCompetitionForm();
  const totalSteps = WIZARD_STEPS.length;
  const isFirstStep = currentStep === 0;
  const isLastStep = currentStep === totalSteps - 1;

  return (
    <div className="space-y-8">
      {/* Step indicator */}
      <div className="overflow-x-auto">
        <nav aria-label="Wizard progress" className="flex items-center justify-between gap-2 min-w-[640px]">
          {WIZARD_STEPS.map((step, index) => {
            const isCompleted = index < currentStep;
            const isCurrent = index === currentStep;

            return (
              <div key={step} className="flex flex-1 items-center">
                <button
                  type="button"
                  onClick={() => setStep(index)}
                  className={cn(
                    "flex flex-col items-center gap-1.5 group",
                    index <= currentStep ? "cursor-pointer" : "cursor-pointer"
                  )}
                >
                  <div
                    className={cn(
                      "flex size-8 items-center justify-center rounded-full border-2 text-xs font-semibold transition-colors",
                      isCompleted && "border-primary bg-primary text-primary-foreground",
                      isCurrent && "border-primary bg-primary/10 text-primary",
                      !isCompleted && !isCurrent && "border-muted-foreground/30 text-muted-foreground"
                    )}
                  >
                    {isCompleted ? <Check className="size-4" /> : index + 1}
                  </div>
                  <span
                    className={cn(
                      "text-[11px] font-medium whitespace-nowrap",
                      isCurrent && "text-primary",
                      isCompleted && "text-foreground",
                      !isCompleted && !isCurrent && "text-muted-foreground"
                    )}
                  >
                    {STEP_TITLES[step]}
                  </span>
                </button>

                {index < totalSteps - 1 && (
                  <div
                    className={cn(
                      "mx-2 h-px flex-1 transition-colors",
                      index < currentStep ? "bg-primary" : "bg-border"
                    )}
                  />
                )}
              </div>
            );
          })}
        </nav>
      </div>

      <Separator />

      {/* Step content */}
      <div className="min-h-[400px]">{children}</div>

      <Separator />

      {/* Navigation buttons */}
      <div className="flex items-center justify-between">
        <Button
          variant="outline"
          onClick={() => setStep(currentStep - 1)}
          disabled={isFirstStep}
        >
          <ChevronLeft className="size-4" />
          Previous
        </Button>

        <span className="text-sm text-muted-foreground">
          Step {currentStep + 1} of {totalSteps}
        </span>

        {!isLastStep && (
          <Button onClick={() => setStep(currentStep + 1)}>
            Next
            <ChevronRight className="size-4" />
          </Button>
        )}

        {isLastStep && <div />}
      </div>
    </div>
  );
}
