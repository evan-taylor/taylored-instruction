"use client";
import { useMutation, usePaginatedQuery } from "convex/react";
import { useSearchParams } from "next/navigation";
import { useEffect, useState } from "react";
import { pluralize } from "@/components/registration/format";
import { InventoryManager } from "@/components/registration/inventory";
import { Button } from "@/components/ui/Button";
import { Badge } from "@/components/ui/badge";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Modal } from "@/components/ui/dialog";
import {
  Field,
  Select,
  TextArea,
  TextInput,
  Toggle,
} from "@/components/ui/field";
import {
  EmptyState,
  Notice,
  PageHeader,
  ResultNotice,
  Skeleton,
} from "@/components/ui/page-header";
import { Meter } from "@/components/ui/stat";
import { Table, TBody, TD, TH, THead, TR } from "@/components/ui/table";
import { TaxCodeSelect } from "@/components/ui/tax-code-select";
import { api } from "@/convex/_generated/api";
import type { Doc, Id } from "@/convex/_generated/dataModel";
import { inventoryPreview } from "@/shared/registration/domain";

type Material = Doc<"registrationMaterials">;
type Kind = Material["kind"];
type PaginationStatus =
  | "LoadingFirstPage"
  | "CanLoadMore"
  | "LoadingMore"
  | "Exhausted";
type EditorState = { open: boolean; material?: Material };

const LOW_STOCK = 5;
const KIND_LABELS: Record<Kind, string> = {
  pdf: "PDF",
  link: "Shared link",
  keycode: "Keycode inventory",
};
const KIND_TONES = {
  pdf: "info",
  link: "neutral",
  keycode: "primary",
} as const;

function KindBadge({ kind }: { kind: Kind }) {
  return <Badge tone={KIND_TONES[kind]}>{KIND_LABELS[kind]}</Badge>;
}

function StockCell({ material }: { material: Material }) {
  if (material.kind !== "keycode") {
    return <span className="text-slate-400">—</span>;
  }
  const available = material.availableCount ?? 0;
  const assigned = material.assignedCount ?? 0;
  const total = available + assigned;
  return (
    <div className="space-y-1.5">
      <Meter
        label={`${assigned} of ${total} codes assigned, ${available} available`}
        max={total}
        value={assigned}
      />
      <div className="flex flex-wrap items-center gap-1.5 text-slate-600 text-xs">
        <span className="tabular-nums">
          {available} available · {assigned} assigned
        </span>
        {available <= LOW_STOCK ? (
          <Badge tone="warning">Low stock</Badge>
        ) : null}
      </div>
    </div>
  );
}

function MaterialRow({
  material,
  onEdit,
  onRestock,
  onInventory,
  inventoryOpen,
}: {
  material: Material;
  onEdit: () => void;
  onRestock: () => void;
  onInventory: () => void;
  inventoryOpen: boolean;
}) {
  const keycode = material.kind === "keycode";
  return (
    <TR>
      <TD>
        <div className="font-medium text-slate-900">{material.title}</div>
        <div className="text-slate-500 text-xs">
          {material.taxCode
            ? `Tax code ${material.taxCode}`
            : "Account default tax code"}
        </div>
        {material.kind === "link" && material.url ? (
          <div
            className="max-w-xs truncate text-slate-500 text-xs"
            title={material.url}
          >
            {material.url}
          </div>
        ) : null}
      </TD>
      <TD>
        <KindBadge kind={material.kind} />
      </TD>
      <TD className="tabular-nums">v{material.version}</TD>
      <TD>
        <StockCell material={material} />
      </TD>
      <TD className="tabular-nums">
        {keycode ? (
          <>
            <div>
              {pluralize(material.assignedCount ?? 0, "assigned", "assigned")}
            </div>
            <div className="text-slate-500 text-xs">
              {material.retiredCount ?? 0} retired
            </div>
          </>
        ) : (
          <span className="text-slate-400">—</span>
        )}
      </TD>
      <TD>
        {material.archived ? (
          <Badge tone="neutral">Archived</Badge>
        ) : (
          <Badge tone="success">Active</Badge>
        )}
      </TD>
      <TD className="text-right">
        <div className="flex justify-end gap-1">
          <Button onClick={onEdit} size="xs" type="button" variant="ghost">
            Edit
          </Button>
          {keycode ? (
            <>
              <Button
                onClick={onRestock}
                size="xs"
                type="button"
                variant="secondary"
              >
                Restock
              </Button>
              <Button
                onClick={onInventory}
                size="xs"
                type="button"
                variant={inventoryOpen ? "primary" : "secondary"}
              >
                {inventoryOpen ? "Viewing inventory" : "Manage inventory"}
              </Button>
            </>
          ) : null}
        </div>
      </TD>
    </TR>
  );
}

function MaterialsTable({
  materials,
  status,
  onLoadMore,
  onNew,
  onEdit,
  onRestock,
  onInventory,
  inventoryId,
}: {
  materials: Material[];
  status: PaginationStatus;
  onLoadMore: () => void;
  onNew: () => void;
  onEdit: (m: Material) => void;
  onRestock: (m: Material) => void;
  onInventory: (m: Material) => void;
  inventoryId: Id<"registrationMaterials"> | undefined;
}) {
  if (status === "LoadingFirstPage") {
    return (
      <div className="space-y-2 p-4">
        {["a", "b", "c", "d"].map((k) => (
          <Skeleton className="h-10 w-full" key={k} />
        ))}
      </div>
    );
  }
  if (materials.length === 0) {
    return (
      <div className="p-5">
        <EmptyState
          action={
            <Button onClick={onNew} size="sm" type="button">
              New material
            </Button>
          }
          description="Materials are attached to course templates and delivered automatically after payment."
          title="No materials yet"
        />
      </div>
    );
  }
  return (
    <>
      <Table wrapperClassName="rounded-none border-0">
        <THead>
          <TR>
            <TH>Material</TH>
            <TH>Kind</TH>
            <TH>Version</TH>
            <TH>Stock</TH>
            <TH>Assigned / retired</TH>
            <TH>Status</TH>
            <TH className="text-right">Actions</TH>
          </TR>
        </THead>
        <TBody>
          {materials.map((m) => (
            <MaterialRow
              inventoryOpen={inventoryId === m._id}
              key={m._id}
              material={m}
              onEdit={() => onEdit(m)}
              onInventory={() => onInventory(m)}
              onRestock={() => onRestock(m)}
            />
          ))}
        </TBody>
      </Table>
      {status === "CanLoadMore" || status === "LoadingMore" ? (
        <div className="flex justify-center border-slate-100 border-t px-4 py-3">
          <Button
            disabled={status === "LoadingMore"}
            onClick={onLoadMore}
            size="sm"
            type="button"
            variant="secondary"
          >
            {status === "LoadingMore" ? "Loading…" : "Load more"}
          </Button>
        </div>
      ) : null}
    </>
  );
}

function PdfUpload({
  fileName,
  uploading,
  storageId,
  onFile,
}: {
  fileName: string;
  uploading: boolean;
  storageId: Id<"_storage"> | undefined;
  onFile: (file: File) => void;
}) {
  let hint =
    "Saving creates a new version. Students who already received an earlier version keep it.";
  if (uploading) {
    hint = "Uploading…";
  } else if (fileName) {
    hint = `Ready to save: ${fileName}`;
  } else if (storageId) {
    hint = "The current PDF is kept unless you choose a new file.";
  }
  return (
    <Field hint={hint} label="PDF file" required={!storageId}>
      {(props) => (
        <TextInput
          {...props}
          accept="application/pdf"
          className="file:mr-3 file:rounded-md file:border-0 file:bg-slate-100 file:px-3 file:py-1 file:font-medium file:text-slate-700 file:text-xs"
          disabled={uploading}
          onChange={(e) => {
            const file = e.target.files?.[0];
            if (file) {
              onFile(file);
            }
          }}
          type="file"
        />
      )}
    </Field>
  );
}

function MaterialEditor({
  material,
  onClose,
}: {
  material: Material | undefined;
  onClose: () => void;
}) {
  const save = useMutation(api.registrationOperations.saveMaterial);
  const upload = useMutation(api.registrationOperations.uploadUrl);
  const [title, setTitle] = useState(material?.title ?? "");
  const [kind, setKind] = useState<Kind>(material?.kind ?? "link");
  const [url, setUrl] = useState(material?.url ?? "");
  const [storageId, setStorageId] = useState(material?.storageId);
  const [fileName, setFileName] = useState("");
  const [archived, setArchived] = useState(material?.archived ?? false);
  const [taxCode, setTaxCode] = useState(material?.taxCode ?? "");
  const [uploading, setUploading] = useState(false);
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState("");

  const uploadPdf = async (file: File) => {
    setMessage("");
    setUploading(true);
    try {
      const response = await fetch(await upload({}), {
        method: "POST",
        headers: { "Content-Type": "application/pdf" },
        body: file,
      });
      const data = (await response.json()) as { storageId: Id<"_storage"> };
      setStorageId(data.storageId);
      setFileName(file.name);
    } catch (error) {
      setMessage(String(error));
    } finally {
      setUploading(false);
    }
  };

  const submit = async () => {
    setMessage("");
    setBusy(true);
    try {
      await save({
        id: material?._id,
        title,
        kind,
        url: kind === "link" ? url : undefined,
        storageId,
        archived,
        taxCode: taxCode || undefined,
      });
      onClose();
    } catch (error) {
      setMessage(String(error));
    } finally {
      setBusy(false);
    }
  };

  return (
    <Modal
      description={
        material
          ? "Changes create a new version. Versions already delivered to students are preserved."
          : "Materials are reusable: attach one to any number of course templates."
      }
      footer={
        <>
          <Button onClick={onClose} size="sm" type="button" variant="secondary">
            Cancel
          </Button>
          <Button
            disabled={busy || uploading || !title.trim()}
            onClick={submit}
            size="sm"
            type="button"
          >
            {busy ? "Working…" : "Save material"}
          </Button>
        </>
      }
      onClose={onClose}
      open
      size="lg"
      title={material ? `Edit ${material.title}` : "New material"}
    >
      <form
        className="space-y-5"
        onSubmit={(e) => {
          e.preventDefault();
          submit();
        }}
      >
        <Field label="Title" required>
          {(props) => (
            <TextInput
              {...props}
              onChange={(e) => setTitle(e.target.value)}
              placeholder="BLS Provider eBook"
              required
              value={title}
            />
          )}
        </Field>
        <Field
          hint={
            material
              ? "Kind is immutable once a material exists."
              : "PDFs are stored and served from your portal; shared links are the same URL for everyone; keycode inventories hand each student a unique link."
          }
          label="Kind"
          required
        >
          {(props) => (
            <Select
              {...props}
              disabled={material !== undefined}
              onChange={(e) => setKind(e.target.value as Kind)}
              value={kind}
            >
              <option value="link">Shared link</option>
              <option value="pdf">PDF</option>
              <option value="keycode">Unique keycode inventory</option>
            </Select>
          )}
        </Field>
        {kind === "link" ? (
          <Field
            hint="Must start with https://. Every student receives this same link."
            label="HTTPS link"
            required
          >
            {(props) => (
              <TextInput
                {...props}
                onChange={(e) => setUrl(e.target.value)}
                pattern="https://.*"
                placeholder="https://"
                required
                type="url"
                value={url}
              />
            )}
          </Field>
        ) : null}
        {kind === "pdf" ? (
          <PdfUpload
            fileName={fileName}
            onFile={uploadPdf}
            storageId={storageId}
            uploading={uploading}
          />
        ) : null}
        {kind === "keycode" ? (
          <Notice tone="info">
            After saving, use Restock to paste unique links. Paid students are
            fulfilled oldest-first as stock arrives.
          </Notice>
        ) : null}
        <TaxCodeSelect
          hint="Applied to this material on checkout and invoices. Digital access codes usually use an electronically supplied services code; printed manuals use tangible goods."
          onChange={setTaxCode}
          value={taxCode}
        />
        <Toggle
          checked={archived}
          description="Archived materials stay attached to existing templates but are hidden from new ones."
          label="Archived"
          onChange={setArchived}
        />
        <ResultNotice message={message} />
      </form>
    </Modal>
  );
}

function CountBadge({
  count,
  label,
  tone,
}: {
  count: number;
  label: string;
  tone: "success" | "warning" | "danger";
}) {
  return (
    <Badge tone={count ? tone : "neutral"}>
      {count} {label}
    </Badge>
  );
}

function RestockModal({
  material,
  onClose,
}: {
  material: Material;
  onClose: () => void;
}) {
  const addStock = useMutation(api.registrationOperations.addStock);
  const [links, setLinks] = useState("");
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState("");
  const [preview, setPreview] = useState<{
    valid: number;
    duplicates: number;
    invalid: number;
  }>();

  let local: { valid: number; duplicates: number; invalid: number } = {
    valid: 0,
    duplicates: 0,
    invalid: 0,
  };
  let localError = "";
  try {
    const parsed = inventoryPreview(links);
    local = {
      valid: parsed.valid.length,
      duplicates: parsed.duplicates.length,
      invalid: parsed.invalid.length,
    };
  } catch (error) {
    localError = String(error);
  }

  const run = async (dryRun: boolean) => {
    setMessage("");
    setBusy(true);
    try {
      const result = await addStock({
        materialId: material._id,
        input: links,
        preview: dryRun,
      });
      if (dryRun) {
        setPreview({
          valid: result.valid.length,
          duplicates: result.duplicates.length,
          invalid: result.invalid.length,
        });
      } else {
        setPreview(undefined);
        setLinks("");
        setMessage(
          `${pluralize(result.added, "link")} added. Outstanding paid entitlements are fulfilled oldest-first automatically.`
        );
      }
    } catch (error) {
      setMessage(String(error));
    } finally {
      setBusy(false);
    }
  };

  return (
    <Modal
      description="Paste unique HTTPS links, one per line. Duplicates already in any inventory are skipped."
      footer={
        <>
          <Button onClick={onClose} size="sm" type="button" variant="secondary">
            Close
          </Button>
          <Button
            disabled={busy || local.valid === 0 || localError !== ""}
            onClick={() => run(true)}
            size="sm"
            type="button"
            variant="outline"
          >
            Preview against inventory
          </Button>
          <Button
            disabled={busy || local.valid === 0 || localError !== ""}
            onClick={() => run(false)}
            size="sm"
            type="button"
          >
            {busy ? "Working…" : `Import ${pluralize(local.valid, "link")}`}
          </Button>
        </>
      }
      onClose={onClose}
      open
      size="lg"
      title={`Restock ${material.title}`}
    >
      <div className="space-y-4">
        <Field
          error={localError || undefined}
          hint="Up to 200 links per batch."
          label="One HTTPS link per line"
          required
        >
          {(props) => (
            <TextArea
              {...props}
              className="min-h-48 font-mono text-xs"
              onChange={(e) => {
                setLinks(e.target.value);
                setPreview(undefined);
              }}
              placeholder={
                "https://example.com/code/abc\nhttps://example.com/code/def"
              }
              value={links}
            />
          )}
        </Field>
        <div className="flex flex-wrap items-center gap-2">
          <span className="text-slate-500 text-xs">In this paste:</span>
          <CountBadge count={local.valid} label="valid" tone="success" />
          <CountBadge
            count={local.duplicates}
            label="duplicates in paste"
            tone="warning"
          />
          <CountBadge count={local.invalid} label="invalid" tone="danger" />
        </div>
        {preview ? (
          <Notice tone={preview.valid ? "info" : "warning"}>
            <span className="font-medium">Against inventory:</span>{" "}
            {preview.valid} new · {preview.duplicates} duplicates (including
            codes already in inventory) · {preview.invalid} invalid. Importing
            adds only the new links.
          </Notice>
        ) : null}
        <ResultNotice message={message} />
      </div>
    </Modal>
  );
}

export function MaterialAdmin() {
  const params = useSearchParams();
  const materials = usePaginatedQuery(
    api.registrationOperations.materials,
    {},
    { initialNumItems: 20 }
  );
  const [editor, setEditor] = useState<EditorState>({ open: false });
  const [restocking, setRestocking] = useState<Material>();
  const [inventoryId, setInventoryId] = useState<Id<"registrationMaterials">>();

  useEffect(() => {
    if (params.get("new") === "1") {
      setEditor({ open: true });
    }
  }, [params]);

  const inventoryMaterial = materials.results.find(
    (m) => m._id === inventoryId
  );

  return (
    <div className="space-y-6">
      <PageHeader
        actions={
          <Button
            onClick={() => setEditor({ open: true })}
            size="sm"
            type="button"
          >
            New material
          </Button>
        }
        description="Three kinds: a PDF you upload, a shared link every student receives, or a keycode inventory that hands out one unique link per paid seat. Materials are reusable across course templates."
        title="Materials & keycodes"
      />
      <Card>
        <CardContent className="p-0">
          <MaterialsTable
            inventoryId={inventoryId}
            materials={materials.results}
            onEdit={(m) => setEditor({ open: true, material: m })}
            onInventory={(m) =>
              setInventoryId((current) =>
                current === m._id ? undefined : m._id
              )
            }
            onLoadMore={() => materials.loadMore(20)}
            onNew={() => setEditor({ open: true })}
            onRestock={setRestocking}
            status={materials.status}
          />
        </CardContent>
      </Card>
      {inventoryMaterial ? (
        <Card id="inventory">
          <CardHeader>
            <div>
              <CardTitle>Inventory · {inventoryMaterial.title}</CardTitle>
              <CardDescription>
                {inventoryMaterial.availableCount ?? 0} available ·{" "}
                {inventoryMaterial.assignedCount ?? 0} assigned ·{" "}
                {inventoryMaterial.retiredCount ?? 0} retired
              </CardDescription>
            </div>
            <div className="flex gap-2">
              <Button
                onClick={() => setRestocking(inventoryMaterial)}
                size="xs"
                type="button"
                variant="secondary"
              >
                Restock
              </Button>
              <Button
                onClick={() => setInventoryId(undefined)}
                size="xs"
                type="button"
                variant="ghost"
              >
                Close
              </Button>
            </div>
          </CardHeader>
          <CardContent className="px-0 pt-4 pb-0">
            <InventoryManager
              key={inventoryMaterial._id}
              materialId={inventoryMaterial._id}
            />
          </CardContent>
        </Card>
      ) : null}
      {editor.open ? (
        <MaterialEditor
          key={editor.material?._id ?? "new"}
          material={editor.material}
          onClose={() => setEditor({ open: false })}
        />
      ) : null}
      {restocking ? (
        <RestockModal
          key={restocking._id}
          material={restocking}
          onClose={() => setRestocking(undefined)}
        />
      ) : null}
    </div>
  );
}
