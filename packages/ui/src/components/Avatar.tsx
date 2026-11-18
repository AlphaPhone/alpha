import type { ComponentProps } from "react";
import * as AvatarPrimitive from "@radix-ui/react-avatar";
import { cva, type VariantProps } from "class-variance-authority";
import { cn } from "../lib/cn.ts";

const avatarVariants = cva("inline-flex shrink-0 items-center justify-center overflow-hidden rounded-full bg-secondary font-semibold text-secondary-foreground select-none", {
  variants: { size: { sm: "size-8 text-xs", md: "size-10 text-sm", lg: "size-16 text-xl" } },
  defaultVariants: { size: "md" },
});

export type AvatarProps = Omit<ComponentProps<typeof AvatarPrimitive.Root>, "children"> &
  VariantProps<typeof avatarVariants> & {
    /** Whose picture it is: the accessible name, and where the initials come from. */
    name: string;
    /** The picture; the initials stand in until it loads, and when it cannot. */
    src?: string;
  };

const initials = (name: string) => {
  const words = name.trim().split(/\s+/);
  return [words[0], words.length > 1 ? words.at(-1) : undefined].map((word) => Array.from(word ?? "")[0] ?? "").join("").toUpperCase();
};

/** A person or a sender as a picture, or as initials on a quiet fill. */
export function Avatar({ name, src, size, className, ...props }: AvatarProps) {
  return (
    <AvatarPrimitive.Root role="img" aria-label={name} className={cn(avatarVariants({ size }), className)} {...props}>
      {src ? <AvatarPrimitive.Image src={src} alt="" className="size-full object-cover" /> : null}
      <AvatarPrimitive.Fallback aria-hidden>{initials(name)}</AvatarPrimitive.Fallback>
    </AvatarPrimitive.Root>
  );
}
