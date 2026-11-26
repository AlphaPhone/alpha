import { Context, Effect, Layer, Stream } from "effect";
import { type ReactElement, Suspense, lazy } from "react";
import { captureReviewedDraft, MediaHandoff, stageAttachment, stageTranscript } from "./assistant/attachments.vibe";
import { readPage, stopPage } from "./assistant/read-aloud.vibe";
import { executeMedia } from "./assistant/media-executors.ts";
import { FileContext } from "./assistant/file-context.vibe";
import { Machine as Shell, showing } from "../gen/app__shell.effect.vibe";
import { Machine as Layers, pageInert } from "../gen/app__shell__layers.effect.vibe";
import { MediaExecutors } from "./assistant/media-review.vibe";
import { type Mount, type Place, mounts as every } from "./areas.ts";
import { ScanExports } from "./files/scanEntry.vibe";
import { InboxCardEntry } from "./home/cards.vibe";
import { AgentPages, BrowserDownloadsHandoff, InboxBrowserLinks } from "./platform/browser.vibe";
import { Device } from "./platform/device.vibe";
import type { Platform } from "./platform/platform.vibe";
import { resident } from "./resident.vibe";
import type { Alpha } from "./runtime/area.tsx";
import { Contained } from "./runtime/contained.tsx";
import { rooted } from "./runtime/root.vibe";
import { accessCover, startupAccessLifecycle } from "./startup/settingsAccess.vibe";
import { startupSignIn, StartupSignIn } from "./startup/signIn.vibe";
import * as Access from "../gen/app__startup__access.effect.vibe";
import { back, taking } from "./shell/shell.vibe";

/** Alpha over `platform`: one root runtime of the resident machines, and each screen of `mounts` at its place, loaded when it is first drawn, and contained: one that throws or cannot be loaded stops alone. */
export function boot(platform: Layer.Layer<Platform>, mounts: readonly Mount[] = every, requireNativeSignIn = false): Alpha {
  const media = Layer.succeed(MediaHandoff, {
    attach: (file, current, suggestion) => Effect.promise(async () => {
      const { default: assistant } = await import("./assistant/index.tsx");
      return assistant.runtime(alpha).runPromise(stageAttachment(file, current, suggestion));
    }).pipe(Effect.catchCause(() => Effect.succeed(false))),
    offerTranscript: (transcript) => Effect.promise(async () => {
      const { default: assistant } = await import("./assistant/index.tsx");
      return assistant.runtime(alpha).runPromise(stageTranscript(transcript));
    }).pipe(Effect.catchCause(() => Effect.succeed(false))),
    reviewedDraft: () => Effect.promise(async () => {
      const { default: assistant } = await import("./assistant/index.tsx");
      return assistant.runtime(alpha).runPromise(captureReviewedDraft());
    }).pipe(Effect.catchCause(() => Effect.succeed(undefined))),
    offerPageSpeech: (speech) => Effect.promise(async () => {
      const { default: assistant } = await import("./assistant/index.tsx");
      return assistant.runtime(alpha).runPromise(readPage(speech));
    }).pipe(Effect.catchCause(() => Effect.succeed(false))),
    stopPageSpeech: (item, source) => Effect.promise(async () => {
      const { default: assistant } = await import("./assistant/index.tsx");
      return assistant.runtime(alpha).runPromise(stopPage(item, source));
    }).pipe(Effect.ignoreCause),
  });
  const executors = Layer.succeed(MediaExecutors, {
    filesContext: () => Effect.tryPromise(async () => {
      const [{ default: files }, { filesReadContext }] = await Promise.all([import("./files/index.tsx"), import("./files/agent.vibe")]);
      return files.runtime(alpha).runPromise(filesReadContext);
    }).pipe(Effect.orElseSucceed(() => undefined)),
    readyFiles: () => Effect.tryPromise(async (signal) => {
      const [{ default: files }, { readyFilesReadContext }] = await Promise.all([import("./files/index.tsx"), import("./files/agent.vibe")]);
      return files.runtime(alpha).runPromise(readyFilesReadContext, { signal });
    }).pipe(Effect.orElseSucceed(() => undefined)),
    reviewFiles: (operation) => Effect.tryPromise(async () => {
      const [{ default: files }, { reviewFileAction }] = await Promise.all([import("./files/index.tsx"), import("./files/agent.vibe")]);
      return files.runtime(alpha).runPromise(reviewFileAction(operation));
    }).pipe(Effect.orElseSucceed(() => undefined)),
    execute: (operation, call, authority) => Effect.tryPromise(() => executeMedia(alpha, operation, call, authority)).pipe(Effect.orElseSucceed(() => undefined)),
  });
  const filesShowing = Effect.gen(function* () {
    const shell = yield* Shell;
    const layers = yield* Layers;
    const device = yield* Device;
    return (yield* device.showing()) && showing(yield* shell.get(), "Files") && !pageInert(yield* layers.get());
  });
  const inFiles = <A,>(read: (signal: AbortSignal) => Promise<A | undefined>) => Effect.tryPromise(async (signal) => {
    if (!(await alpha.runtime.runPromise(filesShowing, { signal }))) return undefined;
    const result = await read(signal);
    return (await alpha.runtime.runPromise(filesShowing, { signal })) ? result : undefined;
  }).pipe(Effect.orElseSucceed(() => undefined));
  const fileContext = Layer.succeed(FileContext, {
    selected: () => inFiles(async (signal) => {
      const [{ default: files }, { selectedTextContext }] = await Promise.all([import("./files/index.tsx"), import("./files/preview.vibe")]);
      return files.runtime(alpha).runPromise(selectedTextContext(), { signal });
    }),
    read: (expected) => inFiles(async (signal) => {
      const [{ default: files }, { readCurrentFileText }] = await Promise.all([import("./files/index.tsx"), import("./files/preview.vibe")]);
      return files.runtime(alpha).runPromise(readCurrentFileText(expected), { signal });
    }),
  });
  const downloads = Layer.succeed(BrowserDownloadsHandoff, {
    open: () => Effect.tryPromise(async () => {
      const [{ default: files }, { showBrowserDownloads }] = await Promise.all([import("./files/index.tsx"), import("./files/files.vibe")]);
      await files.runtime(alpha).runPromise(showBrowserDownloads);
    }).pipe(Effect.orElseSucceed(() => undefined)),
  });
  const agentPages = Layer.succeed(AgentPages, {
    open: (page, current) => Effect.tryPromise(async () => {
      const [{ default: browser }, { openAgentPage }] = await Promise.all([import("./browser/index.tsx"), import("./browser/agent.vibe")]);
      return browser.runtime(alpha).runPromise(openAgentPage({ ...page, current }));
    }).pipe(Effect.orElseSucceed(() => false)),
  });
  const inboxLinks = Layer.succeed(InboxBrowserLinks, {
    open: (href, current) => Effect.tryPromise(async (signal) => {
      const [{ default: browser }, { openMessageLink }] = await Promise.all([import("./browser/index.tsx"), import("./browser/browser.vibe")]);
      return browser.runtime(alpha).runPromise(openMessageLink(href, "Inbox", current), { signal });
    }).pipe(Effect.orElseSucceed(() => false)),
  });
  const inboxCard = Layer.succeed(InboxCardEntry, {
    prepare: () => Effect.tryPromise(async (signal) => {
      const [{ default: inbox }, { prepareInboxCardEntry }] = await Promise.all([import("./inbox/index.tsx"), import("./inbox/message.vibe")]);
      const runtime = inbox.runtime(alpha);
      const enter = await runtime.runPromise(prepareInboxCardEntry(), { signal });
      return (route: number) => Effect.promise((signal) => runtime.runPromise(enter(route), { signal })).pipe(Effect.ignoreCause);
    }).pipe(Effect.orElseSucceed(() => undefined)),
  });
  const scans = Layer.succeed(ScanExports, {
    record: (selection) => Effect.tryPromise(async () => {
      const [{ default: files }, { retainScanExport }] = await Promise.all([import("./files/index.tsx"), import("./files/scan.vibe")]);
      await files.runtime(alpha).runPromise(retainScanExport(selection));
    }).pipe(Effect.orElseSucceed(() => undefined)),
  });
  // The resident's Settings pages read StartupSignIn, and StartupSignIn is built over the resident's own machines
  // (Page, Device, …). The resident gets a late-bound StartupSignIn that forwards each call to the one built over it;
  // nothing in the resident calls it while the root is being built.
  let builtSignIn: Context.Service.Shape<typeof StartupSignIn> | undefined;
  const signedIn = () => {
    if (builtSignIn === undefined) throw new Error("StartupSignIn was read before the root was built");
    return builtSignIn;
  };
  const lateSignIn = Layer.succeed(StartupSignIn, {
    changes: Stream.unwrap(Effect.sync(() => signedIn().changes)),
    active: () => Effect.suspend(() => signedIn().active()),
    confirmedAccount: () => Effect.suspend(() => signedIn().confirmedAccount()),
    check: () => Effect.suspend(() => signedIn().check()),
    touch: () => Effect.suspend(() => signedIn().touch()),
    openNetwork: () => Effect.suspend(() => signedIn().openNetwork()),
    send: (method, address) => Effect.suspend(() => signedIn().send(method, address)),
    chooseGoogle: () => Effect.suspend(() => signedIn().chooseGoogle()),
    verify: (code) => Effect.suspend(() => signedIn().verify(code)),
    resend: () => Effect.suspend(() => signedIn().resend()),
    back: () => Effect.suspend(() => signedIn().back()),
  });
  const signIn = Layer.tap(startupSignIn(requireNativeSignIn), (context) => Effect.sync(() => { builtSignIn = Context.get(context, StartupSignIn); }));
  const startup = Layer.provideMerge(startupAccessLifecycle(requireNativeSignIn), Layer.provideMerge(signIn, Layer.provideMerge(resident, lateSignIn)));
  const root = rooted(Layer.provideMerge(startup, Layer.mergeAll(platform, media, executors, fileContext, downloads, agentPages, inboxLinks, inboxCard, scans)));
  const placed = new Map<Place, ReactElement[]>();
  const alpha: Alpha = {
    runtime: root.runtime,
    over: (layer) => root.over(layer),
    slot: (place) => placed.get(place),
    back: () => root.runtime.runPromiseExit(back()),
    requiresSignIn: requireNativeSignIn,
    taking: (place, took) => void root.runtime.runPromiseExit(taking(place, took)),
    dispose: root.dispose,
  };
  if (requireNativeSignIn) alpha.taking("startup/sign-in", () => root.runtime.runPromise(StartupSignIn.use((signIn) => Effect.gen(function* () {
    if (yield* signIn.active()) {
      yield* signIn.back();
      return true;
    }
    const covered = yield* accessCover();
    const current = () => Effect.runSync(signIn.confirmedAccount()) && !covered();
    if (!current()) return false;
    const permissions = yield* Access.Machine;
    const access = yield* permissions.get();
    if (Access.canDone(access, "Owner")) {
      const done = yield* Effect.exit(permissions.send({ type: "done" }, "Owner", current));
      return done._tag === "Success";
    }
    return current() && !access.covered && (!access.begun || !Access.completed(access));
  }))));
  const stopped = (place: string, cause: unknown) => void root.runtime.runPromiseExit(Effect.logError(`the screen at ${place} stopped`, cause));
  for (const mount of mounts) {
    const Screen = mount.first?.open(alpha, mount.at) ?? lazy(async () => ({ default: (await mount.load()).default.open(alpha, mount.at) }));
    const drawn = (
      <Contained key={`${mount.at} ${placed.get(mount.at)?.length ?? 0}`} place={mount.at} told={mount.at.startsWith("view:")} onStopped={stopped}>
        <Suspense fallback={null}><Screen /></Suspense>
      </Contained>
    );
    placed.set(mount.at, [...(placed.get(mount.at) ?? []), drawn]);
  }
  return alpha;
}
