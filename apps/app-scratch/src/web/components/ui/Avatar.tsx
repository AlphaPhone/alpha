import { cn } from "../../lib/cn.ts";

export type AvatarProps = {
  /** The person's display name; the initials and accessible name come from it. */
  name: string;
  /** A photo of the person, when the owner's contacts have one. */
  src?: string;
  size?: "sm" | "md" | "lg";
  className?: string;
};

const sizes = { sm: "size-8 text-xs", md: "size-10 text-sm", lg: "size-20 text-2xl" } as const;

const initials = (name: string) => name.trim().split(/\s+/).slice(0, 2).map((part) => part[0]?.toUpperCase() ?? "").join("") || "#";

/** A person's photo, or their initials on a quiet fill. */
export function Avatar({ name, src, size = "md", className }: AvatarProps) {
  return src ? (
    <img src={src} alt={name} className={cn("shrink-0 rounded-full object-cover", sizes[size], className)} />
  ) : (
    <span role="img" aria-label={name} className={cn("flex shrink-0 items-center justify-center rounded-full bg-secondary font-medium text-secondary-foreground", sizes[size], className)}>
      {initials(name)}
    </span>
  );
}
