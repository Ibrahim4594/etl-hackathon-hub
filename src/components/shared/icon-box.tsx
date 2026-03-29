import { type LucideIcon } from "lucide-react";
import { cn } from "@/lib/utils";

type IconBoxSize = "sm" | "md" | "lg";
type IconBoxVariant = "primary" | "secondary" | "muted";

const sizeClasses: Record<IconBoxSize, string> = {
  sm: "p-2 rounded-lg",
  md: "p-3 rounded-xl",
  lg: "p-4 rounded-2xl",
};

const iconSizeClasses: Record<IconBoxSize, string> = {
  sm: "h-4 w-4",
  md: "h-5 w-5",
  lg: "h-6 w-6",
};

const variantClasses: Record<IconBoxVariant, string> = {
  primary:
    "bg-gradient-to-br from-primary/20 to-primary/5 border border-primary/10 text-primary shadow-inner shadow-primary/5",
  secondary:
    "bg-gradient-to-br from-secondary/20 to-secondary/5 border border-secondary/10 text-secondary-foreground shadow-inner shadow-secondary/5",
  muted:
    "bg-muted/50 border border-border/50 text-muted-foreground shadow-inner shadow-black/5",
};

interface IconBoxProps {
  icon: LucideIcon;
  size?: IconBoxSize;
  variant?: IconBoxVariant;
  className?: string;
}

export function IconBox({
  icon: Icon,
  size = "md",
  variant = "primary",
  className,
}: IconBoxProps) {
  return (
    <div
      className={cn(
        "flex items-center justify-center shrink-0 transition-transform duration-300 group-hover:scale-110",
        sizeClasses[size],
        variantClasses[variant],
        className
      )}
    >
      <Icon className={iconSizeClasses[size]} />
    </div>
  );
}
