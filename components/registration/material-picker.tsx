"use client";

import { usePaginatedQuery } from "convex/react";
import { useState } from "react";
import { Button } from "@/components/ui/Button";
import { Field, Money, TextInput, Toggle } from "@/components/ui/field";
import { api } from "@/convex/_generated/api";
import type { Id } from "@/convex/_generated/dataModel";
import type { Settings } from "@/shared/registration/domain";

export function defaultMaterialIds(materials: Settings["materials"]) {
  return materials
    .filter((item) => item.policy !== "optional")
    .map((item) => item.materialId);
}

/** Staff can remove included materials and add from the full material catalog. */
export function MaterialPicker({
  materials,
  value,
  onChange,
  tuition,
  disabled = false,
}: {
  materials: Settings["materials"];
  value: Id<"registrationMaterials">[];
  onChange: (ids: Id<"registrationMaterials">[]) => void;
  tuition?: number;
  disabled?: boolean;
}) {
  const catalog = usePaginatedQuery(
    api.registrationOperations.materials,
    {},
    { initialNumItems: 50 }
  );
  const [search, setSearch] = useState("");
  const attached = new Set(materials.map((item) => item.materialId));
  const options = [
    ...materials,
    ...catalog.results
      .filter((item) => !(item.archived || attached.has(item._id)))
      .map((item) => ({
        id: item._id,
        materialId: item._id,
        title: item.title,
        cents: item.defaultPrice ?? 0,
        policy: "optional" as const,
      })),
  ];
  const visible = options.filter(
    (item) =>
      value.includes(item.materialId) ||
      item.title.toLowerCase().includes(search.toLowerCase())
  );
  const total = options
    .filter((item) => value.includes(item.materialId))
    .reduce((sum, item) => sum + item.cents, tuition ?? 0);
  return (
    <fieldset
      className="space-y-3 rounded-lg border border-slate-200 p-4"
      disabled={disabled}
    >
      <legend className="px-1 font-medium text-sm">Materials</legend>
      <p className="text-slate-500 text-sm">
        Check the materials to provide. Included course materials can be
        unchecked for this attendee.
      </p>
      <Field label="Find materials">
        {(props) => (
          <TextInput
            {...props}
            onChange={(event) => setSearch(event.target.value)}
            placeholder="Search loaded materials"
            value={search}
          />
        )}
      </Field>
      <div className="max-h-72 space-y-3 overflow-y-auto">
        {visible.map((item) => (
          <Toggle
            checked={value.includes(item.materialId)}
            description={
              <>
                <Money cents={item.cents} />
                {item.policy === "included"
                  ? " · Included by default"
                  : " · Optional selection"}
              </>
            }
            key={item.materialId}
            label={item.title}
            onChange={(checked) =>
              onChange(
                checked
                  ? [...value, item.materialId]
                  : value.filter((id) => id !== item.materialId)
              )
            }
          />
        ))}
        {visible.length === 0 ? (
          <p className="text-slate-500 text-sm">
            No matching materials loaded.
          </p>
        ) : null}
      </div>
      {catalog.status === "CanLoadMore" ? (
        <Button
          onClick={() => catalog.loadMore(50)}
          size="xs"
          type="button"
          variant="secondary"
        >
          Load more materials
        </Button>
      ) : null}
      {catalog.status === "LoadingFirstPage" ||
      catalog.status === "LoadingMore" ? (
        <p role="status">Loading materials…</p>
      ) : null}
      {tuition === undefined ? null : (
        <p className="font-medium text-sm">
          Enrollment subtotal: <Money cents={total} /> before tax
        </p>
      )}
    </fieldset>
  );
}
