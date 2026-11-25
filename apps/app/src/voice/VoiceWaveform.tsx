// spec/app/voice/index.md, "Story: Hold a spoken conversation"
import { cn } from "@repo/ui";
import { useCallback } from "react";
import type { Phase } from "../../gen/app__voice.ts";

type ShownPhase = Exclude<Phase, "Idle" | "Failed"> | "Muted";
type Motion = { readonly scale: readonly number[]; readonly opacity: readonly number[]; readonly duration: number };
const motif = [8, 13, 18, 13, 8] as const;
const motion: Readonly<Record<ShownPhase, Motion>> = {
  Starting: { scale: [0.26, 0.48, 0.26], opacity: [0.35, 0.88, 0.35], duration: 1050 },
  Listening: { scale: [0.32, 0.9, 0.48, 1, 0.32], opacity: [0.58, 1, 0.72, 0.94, 0.58], duration: 920 },
  Transcribing: { scale: [0.38, 0.7, 0.38], opacity: [0.52, 0.92, 0.52], duration: 720 },
  Thinking: { scale: [0.24, 0.52, 0.24], opacity: [0.38, 0.92, 0.38], duration: 1600 },
  Speaking: { scale: [0.42, 1, 0.52, 0.84, 0.42], opacity: [0.68, 1, 0.8, 0.96, 0.68], duration: 640 },
  Paused: { scale: [0.24], opacity: [0.36], duration: 0 },
  Stopping: { scale: [0.58, 0.22], opacity: [0.82, 0.36], duration: 200 },
  Muted: { scale: [0.24], opacity: [0.36], duration: 0 },
};
const tones: Partial<Record<ShownPhase, string>> = {
  Paused: "text-voice-paused",
  Muted: "text-voice-paused",
  Transcribing: "text-voice-processing",
  Thinking: "text-voice-processing",
  Speaking: "text-voice-speaking",
};
const bars = Array.from({ length: 35 }, (_, number) => ({ number, height: motif[number % motif.length] }));

/** Voice phase motion, with the waveform and animation parameters used in Alpha's Develop renderer. */
export function VoiceWaveform({ phase, compact = false }: { phase: ShownPhase; compact?: boolean }) {
  const visual = motion[phase];
  const animated = useCallback((element: HTMLSpanElement | null) => {
    if (element === null || visual.duration === 0) return;
    const preference = matchMedia("(prefers-reduced-motion: reduce)");
    if (typeof element.animate !== "function") return;
    const frames = visual.scale.map((scale, frame) => ({ transform: `scaleY(${scale})`, opacity: visual.opacity[frame], easing: "ease-in-out" }));
    const animations = Array.from(element.children, (child, number) =>
      child.animate(frames, {
        duration: visual.duration,
        iterations: Infinity,
        delay: phase === "Thinking" || phase === "Transcribing" ? number * (compact ? 110 : 32) : (number % motif.length) * (phase === "Speaking" ? 38 : 70),
        fill: "both",
      }));
    const update = () => {
      for (const animation of animations) {
        if (preference.matches) animation.cancel();
        else if (document.hidden) animation.pause();
        else animation.play();
      }
    };
    update();
    document.addEventListener("visibilitychange", update);
    preference.addEventListener("change", update);
    return () => {
      document.removeEventListener("visibilitychange", update);
      preference.removeEventListener("change", update);
      for (const animation of animations) animation.cancel();
    };
  }, [compact, phase, visual]);
  return (
    <span aria-hidden="true" data-alpha-voice-animation="" data-phase={phase} ref={animated}
      className={cn("flex items-center justify-between gap-0.5 overflow-hidden", tones[phase] ?? "text-alpha")}
      style={{ width: compact ? 30 : "100%", height: 28 }}>
      {(compact ? bars.slice(0, motif.length) : bars).map(({ number, height }) => (
        <span key={number} className="w-0.5 shrink-0 rounded-full bg-current" style={{ height, transform: `scaleY(${visual.scale.at(-1)})`, opacity: visual.opacity.at(-1) }} />
      ))}
    </span>
  );
}
