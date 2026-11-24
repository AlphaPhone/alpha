// spec/camera/library.md, "Story: See my whole permitted library, newest first"; spec/camera/browse.md, "Story: Look at one photo"; spec/camera/albums.md, "Story: Keep my photos in albums"; spec/camera/agentLibrary.md, "Story: Let the assistant point at photos I can see"
import { Effect } from "effect";
import { useState } from "react";
import { useMachine as useCatalog } from "../../../gen/camera__library.react.ts";
import { useMachine as useBrowse } from "../../../gen/camera__browse.react.ts";
import { useMachine as useAlbums } from "../../../gen/camera__albums.react.ts";
import { useMachine as useReviews } from "../../../gen/camera__libraryReview.react.ts";
import { useMachine as useHost } from "../../../gen/camera__agentLibrary.react.ts";
import { useMachine as useNotices } from "../../../gen/camera__notices.react.ts";
import { useMachine as useEdit } from "../../../gen/camera__edit.react.ts";
import { useMachine as useDialogs } from "../../../gen/camera__scanDialogs.react.ts";
import { useMachine as useScan } from "../../../gen/camera__scan.react.ts";
import { useMachine as useVideo } from "../../../gen/camera__videoEdit.react.ts";
import { AgentPhotos } from "../../camera/agentPhotos.vibe";
import { MediaEditor } from "../../camera/editor.vibe";
import { PhotoLibrary } from "../../camera/library.vibe";
import { MediaReview } from "../../camera/mediaReview.vibe";
import { Scanner } from "../../camera/scanner.vibe";
import type { ScreenProps } from "../app-screen.ts";
import { PhotosView } from "./PhotosView.tsx";
import { act, buildInfo, readNow, runtime } from "../shell/services.ts";

const library = (use: (l: PhotoLibrary.Shape) => Effect.Effect<unknown>) => act(Effect.flatMap(Effect.service(PhotoLibrary), use));
const agent = (use: (a: AgentPhotos.Shape) => Effect.Effect<unknown>) => act(Effect.flatMap(Effect.service(AgentPhotos), use));
const media = (use: (m: MediaReview.Shape) => Effect.Effect<unknown>) => act(Effect.flatMap(Effect.service(MediaReview), use));
const scanner = (use: (s: Scanner.Shape) => Effect.Effect<unknown>) => act(Effect.flatMap(Effect.service(Scanner), use));
const edit = (use: (e: MediaEditor.Shape) => Effect.Effect<unknown>) => act(Effect.flatMap(Effect.service(MediaEditor), use));

/** Follow the Photos visit while the grid is mounted; the page's visibility reaches Photos through the foreground. */
function mountPhotos(element: HTMLElement | null): void | (() => void) {
  if (element === null) return;
  library((l) => l.enter());
  agent((a) => a.visit(true));
  return () => {
    agent((a) => a.visit(false));
    library((l) => l.leave());
  };
}

/** The Photos app's screen props: the shell's route and close. */
export type PhotosScreenProps = ScreenProps;

/**
 * The Photos app.
 * @model spec/camera/library.md
 */
export function PhotosScreen({ onClose, route }: PhotosScreenProps) {
  const { state: catalog } = useCatalog(runtime);
  const { state: browse, can } = useBrowse(runtime);
  const { state: notices } = useNotices(runtime);
  const { state: albums, can: canAlbum } = useAlbums(runtime);
  const { state: reviews } = useReviews(runtime);
  const { state: host } = useHost(runtime);
  const { state: photoEdit, can: canEdit } = useEdit(runtime);
  const { state: videoEdit, can: canVideo } = useVideo(runtime);
  const { state: dialogs, can: canDialog } = useDialogs(runtime);
  const { state: scan, can: canScan } = useScan(runtime);
  const [variant] = useState(() => buildInfo().variant);
  if (catalog === undefined || browse === undefined) return null;
  const searchLines = dialogs?.searchable.ready === true ? readNow(Effect.flatMap(Effect.service(Scanner), (s) => s.searchablePages())) : [];
  const now = Date.now();
  const pool = new Set(browse.pool);
  const rows = (browse.tab === "TrashTab" ? catalog.trash.rows : catalog.main.rows).filter((row) => pool.has(row.id));
  return (
    <PhotosView route={route} catalog={catalog} browse={browse} rows={rows} said={notices?.said ?? ""} now={now} messages={variant === "aosp"} browser={variant === "browser"} onClose={onClose}
      can={can} albums={albums} canAlbum={canAlbum} reviews={reviews} host={host} photoEdit={photoEdit} canEdit={canEdit} videoEdit={videoEdit} canVideo={canVideo}
      dialogs={dialogs} scan={scan} canDialog={canDialog} canScan={canScan} searchLines={searchLines}
      visit={mountPhotos} library={library} agent={agent} media={media} scanner={scanner} edit={edit} />
  );
}
