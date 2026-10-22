"use client";
import { useMutation, usePaginatedQuery } from "convex/react";
import { Download, FileText, Trash2, Upload } from "lucide-react";
import type React from "react";
import { useId, useRef, useState } from "react";
import { errorText } from "@/components/registration/errors";
import { formatDateTime } from "@/components/registration/format";
import { Button } from "@/components/ui/Button";
import { Card, CardContent } from "@/components/ui/card";
import { ConfirmDialog } from "@/components/ui/dialog";
import {
  EmptyState,
  Notice,
  ResultNotice,
  Skeleton,
} from "@/components/ui/page-header";
import { Table, TBody, TD, TH, THead, TR } from "@/components/ui/table";
import { api } from "@/convex/_generated/api";
import type { Id } from "@/convex/_generated/dataModel";
import { cn } from "@/lib/utils";

const MAX_FILE_BYTES = 25 * 1024 * 1024;

function formatSize(bytes: number) {
  if (bytes < 1024) {
    return `${bytes} B`;
  }
  if (bytes < 1024 * 1024) {
    return `${(bytes / 1024).toFixed(0)} KB`;
  }
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

type SessionFile = {
  _id: Id<"registrationSessionFiles">;
  name: string;
  type: string;
  size: number;
  uploadedAt: number;
  uploadedBy: string;
  url: string | null;
};
const PAGE = 50;

/** Staff uploads for one session: sign-in sheets, handouts, completed paperwork. */
export function SessionFiles({
  sessionId,
}: {
  sessionId: Id<"registrationSessions">;
}) {
  const paged = usePaginatedQuery(
    api.registrationOperations.sessionFiles,
    { sessionId },
    { initialNumItems: PAGE }
  );
  const files: SessionFile[] | undefined =
    paged.status === "LoadingFirstPage" ? undefined : paged.results;
  const uploadUrl = useMutation(api.registrationOperations.fileUploadUrl);
  const attach = useMutation(api.registrationOperations.attachFile);
  const remove = useMutation(api.registrationOperations.removeFile);
  const inputId = useId();
  const inputRef = useRef<HTMLInputElement>(null);
  const [dragging, setDragging] = useState(false);
  const [progress, setProgress] = useState<string | null>(null);
  const [message, setMessage] = useState("");
  const [tone, setTone] = useState<"success" | "danger">("success");
  const [removing, setRemoving] = useState<SessionFile | null>(null);

  async function upload(selected: FileList | File[]) {
    const picked = Array.from(selected);
    if (!picked.length) {
      return;
    }
    setMessage("");
    let done = 0;
    for (const file of picked) {
      setProgress(`Uploading ${file.name} (${done + 1} of ${picked.length})…`);
      try {
        if (file.size > MAX_FILE_BYTES) {
          throw new Error(`${file.name} is larger than 25 MB`);
        }
        // biome-ignore lint/performance/noAwaitInLoops: uploads run one at a time so progress is readable
        const url = await uploadUrl({
          sessionId,
          name: file.name,
          size: file.size,
        });
        const response = await fetch(url, {
          method: "POST",
          headers: { "Content-Type": file.type || "application/octet-stream" },
          body: file,
        });
        if (!response.ok) {
          throw new Error(`${file.name} could not be uploaded`);
        }
        const { storageId } = (await response.json()) as {
          storageId: Id<"_storage">;
        };
        await attach({
          sessionId,
          storageId,
          name: file.name,
          type: file.type || "application/octet-stream",
          size: file.size,
        });
        done += 1;
      } catch (error) {
        setTone("danger");
        setMessage(errorText(error, `${file.name} could not be uploaded.`));
        setProgress(null);
        return;
      }
    }
    setProgress(null);
    setTone("success");
    setMessage(done === 1 ? "File uploaded." : `${done} files uploaded.`);
  }

  let list: React.ReactNode;
  if (files === undefined) {
    list = <Skeleton className="h-40" />;
  } else if (files.length === 0) {
    list = (
      <EmptyState
        description="Files you upload here are visible to administrators and this session’s instructors."
        icon={<FileText aria-hidden="true" className="h-6 w-6" />}
        title="No files yet"
      />
    );
  } else {
    list = (
      <>
        <Table>
          <THead>
            <tr>
              <TH>File</TH>
              <TH>Size</TH>
              <TH>Uploaded</TH>
              <TH className="text-right">Actions</TH>
            </tr>
          </THead>
          <TBody>
            {files.map((file) => (
              <TR key={file._id}>
                <TD>
                  <div className="flex items-center gap-2">
                    <FileText
                      aria-hidden="true"
                      className="h-4 w-4 shrink-0 text-slate-400"
                    />
                    <span className="font-medium text-slate-900">
                      {file.name}
                    </span>
                  </div>
                </TD>
                <TD className="whitespace-nowrap tabular-nums">
                  {formatSize(file.size)}
                </TD>
                <TD className="whitespace-nowrap">
                  <div>{formatDateTime(file.uploadedAt)}</div>
                  <div className="text-slate-500 text-xs">
                    {file.uploadedBy}
                  </div>
                </TD>
                <TD className="whitespace-nowrap text-right">
                  <div className="flex justify-end gap-1">
                    {file.url ? (
                      <Button
                        aria-label={`Download ${file.name}`}
                        href={file.url}
                        size="xs"
                        target="_blank"
                        variant="secondary"
                      >
                        <Download aria-hidden="true" className="h-3.5 w-3.5" />
                        Download
                      </Button>
                    ) : null}
                    <Button
                      aria-label={`Delete ${file.name}`}
                      className="text-rose-700 hover:bg-rose-50 hover:text-rose-800"
                      onClick={() => setRemoving(file)}
                      size="xs"
                      type="button"
                      variant="ghost"
                    >
                      <Trash2 aria-hidden="true" className="h-3.5 w-3.5" />
                      Delete
                    </Button>
                  </div>
                </TD>
              </TR>
            ))}
          </TBody>
        </Table>
        {paged.status === "CanLoadMore" || paged.status === "LoadingMore" ? (
          <div className="flex justify-center">
            <Button
              disabled={paged.status === "LoadingMore"}
              onClick={() => paged.loadMore(PAGE)}
              size="sm"
              type="button"
              variant="secondary"
            >
              {paged.status === "LoadingMore" ? "Loading…" : "Load more files"}
            </Button>
          </div>
        ) : null}
      </>
    );
  }
  return (
    <div className="space-y-5">
      <Card>
        <CardContent className="p-0">
          <button
            className={cn(
              "flex w-full cursor-pointer flex-col items-center justify-center gap-2 rounded-xl border-2 border-dashed px-6 py-10 text-center transition-colors focus-visible:outline-hidden focus-visible:ring-2 focus-visible:ring-primary/30",
              dragging
                ? "border-primary bg-primary/5"
                : "border-slate-300 hover:border-slate-400 hover:bg-slate-50"
            )}
            disabled={progress !== null}
            onClick={() => inputRef.current?.click()}
            onDragLeave={() => setDragging(false)}
            onDragOver={(e) => {
              e.preventDefault();
              setDragging(true);
            }}
            onDrop={(e) => {
              e.preventDefault();
              setDragging(false);
              upload(e.dataTransfer.files);
            }}
            type="button"
          >
            <Upload aria-hidden="true" className="h-6 w-6 text-slate-400" />
            <span className="font-medium text-slate-900">
              {progress ?? "Drop files here or click to choose"}
            </span>
            <span className="text-slate-500 text-sm">
              Sign-in sheets, handouts, completed paperwork. Up to 25 MB each.
            </span>
          </button>
          <input
            accept="*/*"
            aria-label="Choose files to upload"
            className="sr-only"
            disabled={progress !== null}
            id={inputId}
            multiple
            onChange={(e) => {
              if (e.target.files) {
                upload(e.target.files);
              }
              e.target.value = "";
            }}
            ref={inputRef}
            type="file"
          />
        </CardContent>
      </Card>
      {progress ? (
        <p aria-live="polite" className="sr-only">
          {progress}
        </p>
      ) : null}
      <ResultNotice message={message} tone={tone} />
      {list}
      <ConfirmDialog
        confirmLabel="Delete file"
        danger
        description="The file is removed from storage and cannot be recovered."
        onClose={() => setRemoving(null)}
        onConfirm={async () => {
          if (!removing) {
            return;
          }
          await remove({ id: removing._id });
          setRemoving(null);
          setTone("success");
          setMessage(`Deleted ${removing.name}.`);
        }}
        open={removing !== null}
        title={`Delete ${removing?.name ?? "this file"}?`}
      >
        <Notice tone="warning">
          Attendees never see these files, but instructors assigned to this
          session do.
        </Notice>
      </ConfirmDialog>
    </div>
  );
}
