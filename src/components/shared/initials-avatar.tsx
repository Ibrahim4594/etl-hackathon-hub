import { cn } from "@/lib/utils";

const COLORS = [
  "from-teal-500 to-cyan-500",
  "from-blue-500 to-indigo-500",
  "from-purple-500 to-pink-500",
  "from-emerald-500 to-teal-500",
  "from-orange-500 to-red-500",
  "from-amber-500 to-yellow-500",
  "from-rose-500 to-pink-500",
  "from-indigo-500 to-violet-500",
];

function getColorIndex(name: string): number {
  let hash = 0;
  for (let i = 0; i < name.length; i++) {
    hash = name.charCodeAt(i) + ((hash << 5) - hash);
  }
  return Math.abs(hash) % COLORS.length;
}

const SIZE_CLASSES = {
  sm: "h-6 w-6 text-[10px]",
  md: "h-8 w-8 text-xs",
  lg: "h-10 w-10 text-sm",
  xl: "h-16 w-16 text-xl",
} as const;

interface InitialsAvatarProps {
  name: string;
  size?: keyof typeof SIZE_CLASSES;
  className?: string;
}

export function InitialsAvatar({
  name,
  size = "md",
  className,
}: InitialsAvatarProps) {
  const initials = name
    .split(/\s+/)
    .map((w) => w[0])
    .join("")
    .slice(0, 2)
    .toUpperCase();

  const gradient = COLORS[getColorIndex(name)];

  return (
    <div
      className={cn(
        "flex shrink-0 items-center justify-center rounded-full bg-gradient-to-br font-bold text-white",
        gradient,
        SIZE_CLASSES[size],
        className
      )}
    >
      {initials || "?"}
    </div>
  );
}
