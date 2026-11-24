import type { ComponentProps } from "react";
import { FileX, ImageOff, Lock } from "lucide-react";
import { Banner } from "../Banner.tsx";
import { Button } from "../Button.tsx";
import { EmptyState } from "../EmptyState.tsx";
import { ListGroup } from "../ListGroup.tsx";
import { Skeleton } from "../Skeleton.tsx";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "../Tabs.tsx";
import { AssistantFileRow, type AssistantFile } from "./AssistantFileRow.tsx";

export type AssistantAttachmentPickerBodyProps = Omit<ComponentProps<"div">, "children"> & {
  /** Photos or documents. */
  tab: "photos" | "documents";
  /** Android's access for the tab: not asked yet, allowed, allowed for some files only, or refused. */
  access: "unasked" | "granted" | "limited" | "denied";
  /** The page of files is being read, was read, or could not be. */
  status: "loading" | "loaded" | "failed";
  /** The files listed so far. */
  files: AssistantFile[];
  /** The ids of the files chosen. */
  selected: string[];
  /** How many files the composer has room for. */
  room: number;
  /** More files can be listed. */
  more?: boolean;
  /** The chosen files are being read and checked. */
  reading?: boolean;
  /** The names of files that were refused for their type, name or size; they are never attached. */
  refused?: string[];
  /** Switches the tab; the choice starts again. */
  onTabChange: (tab: "photos" | "documents") => void;
  /** Chooses or unchooses a file; chosen files stay within the room. */
  onSelect: (id: string, selected: boolean) => void;
  /** Reads the chosen files and attaches them. */
  onAttach?: () => void;
  /** Asks Android for access, once. */
  onRequestAccess?: () => void;
  /** Opens Android's Settings, where access is changed after it was asked. */
  onOpenSettings?: () => void;
  /** Reads the folder again after it failed. */
  onRetry?: () => void;
  /** Lists the next page of files. */
  onMore?: () => void;
};

/**
 * Choosing photos or documents to attach: the two tabs, Android's access, a page of files at a time with the room
 * left, the files refused, and Attach.
 * @model spec/app/assistant/attachments.md
 */
export function AssistantAttachmentPickerBody({
  tab, access, status, files, selected, room, more = false, reading = false, refused = [], onTabChange, onSelect, onAttach, onRequestAccess, onOpenSettings, onRetry, onMore, ...props
}: AssistantAttachmentPickerBodyProps) {
  const lacking = access === "unasked" || access === "denied";
  const photos = tab === "photos";
  const empty = lacking ? (
    <EmptyState icon={<Lock />} title={photos ? "Alpha needs access to your photos" : "Alpha needs access to your files"}>
      {access === "unasked" && onRequestAccess ? <Button onClick={onRequestAccess}>Allow access</Button> : null}
      {access === "denied" && onOpenSettings ? <Button variant="secondary" onClick={onOpenSettings}>Open Settings</Button> : null}
    </EmptyState>
  ) : status === "loading" && !files.length ? (
    <div aria-busy className="flex flex-col gap-3"><Skeleton className="h-13" /><Skeleton className="h-13" /><Skeleton className="h-13" /></div>
  ) : status === "failed" && !files.length ? (
    <EmptyState icon={<FileX />} title="Could not open the folder">{onRetry ? <Button variant="secondary" onClick={onRetry}>Try again</Button> : null}</EmptyState>
  ) : !files.length ? (
    <EmptyState icon={photos ? <ImageOff /> : <FileX />} title={photos ? "No photos" : "No documents"} />
  ) : undefined;
  return (
    <div className="flex flex-col gap-3" {...props}>
      <Tabs value={tab} onValueChange={(value) => onTabChange(value === "documents" ? "documents" : "photos")} className="gap-3">
        <TabsList aria-label="What to attach">
          <TabsTrigger value="photos">Photos</TabsTrigger>
          <TabsTrigger value="documents">Documents</TabsTrigger>
        </TabsList>
        <TabsContent value={tab} className="flex flex-col gap-3">
          {access === "limited" && onOpenSettings ? <Banner variant="info" action={<Button variant="outline" size="sm" onClick={onOpenSettings}>Settings</Button>}>Some files are hidden</Banner> : null}
          {refused.length ? <Banner variant="warn">{`Not attached: ${refused.join(", ")}`}</Banner> : null}
          {empty ?? (
            <ListGroup surface="plain" aria-label={photos ? "Photos" : "Documents"}>
              {files.map((file) => {
                const chosen = selected.includes(file.id);
                return <AssistantFileRow key={file.id} file={file} selected={chosen} onSelect={reading || (!chosen && selected.length >= room) ? undefined : (value) => onSelect(file.id, value)} />;
              })}
            </ListGroup>
          )}
          {status === "failed" && files.length && onRetry ? <Button variant="secondary" onClick={onRetry}>Try again</Button> : null}
          {more && onMore ? <Button variant="ghost" onClick={onMore}>More</Button> : null}
        </TabsContent>
      </Tabs>
      <div className="flex items-center gap-3">
        <span className="flex-1 text-sm text-muted-foreground tabular-nums">{`${selected.length} of ${room}`}</span>
        <Button loading={reading} disabled={!onAttach || !selected.length} onClick={onAttach}>Attach</Button>
      </div>
    </div>
  );
}
