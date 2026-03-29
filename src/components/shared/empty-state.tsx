import { type LucideIcon } from "lucide-react";
import { LottieIllustration } from "./lottie-illustration";

interface EmptyStateProps {
  icon: LucideIcon;
  title: string;
  description: string;
  children?: React.ReactNode;
  lottieSrc?: string;
}

export function EmptyState({
  icon: Icon,
  title,
  description,
  children,
  lottieSrc,
}: EmptyStateProps) {
  return (
    <div className="flex flex-col items-center justify-center rounded-2xl border border-border/50 bg-muted/20 p-16 text-center">
      {lottieSrc ? (
        <LottieIllustration
          src={lottieSrc}
          width={100}
          height={100}
          fallbackIcon={Icon}
        />
      ) : (
        <div className="flex h-14 w-14 items-center justify-center rounded-xl bg-gradient-to-br from-primary/20 to-primary/5">
          <Icon className="h-7 w-7 text-primary" />
        </div>
      )}
      <h3 className="mt-4 text-lg font-semibold">{title}</h3>
      <p className="mt-1 text-sm text-muted-foreground max-w-sm">
        {description}
      </p>
      {children && <div className="mt-6">{children}</div>}
    </div>
  );
}
