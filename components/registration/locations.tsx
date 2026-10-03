"use client";
import { useMutation, useQuery } from "convex/react";
import { useState } from "react";
import { Button } from "@/components/ui/Button";
import { Input } from "@/components/ui/input";
import { api } from "@/convex/_generated/api";
import type { Id } from "@/convex/_generated/dataModel";
export function LocationEditor() {
  const locations = useQuery(api.registrationOperations.locations);
  const save = useMutation(api.registrationOperations.saveLocation);
  const [id, setId] = useState<Id<"registrationLocations">>();
  const [name, setName] = useState("");
  const [address, setAddress] = useState("");
  const [instructions, setInstructions] = useState("");
  const [message, setMessage] = useState("");
  return (
    <form
      className="space-y-3 rounded border p-5"
      onSubmit={async (e) => {
        e.preventDefault();
        try {
          setId(
            await save({ id, name, address, instructions, archived: false })
          );
          setMessage("Location saved");
        } catch (error) {
          setMessage(String(error));
        }
      }}
    >
      <h2 className="text-2xl">Saved locations</h2>
      <label className="block">
        Edit saved location
        <select
          className="block rounded border p-2"
          onChange={(e) => {
            const location = locations?.find((l) => l._id === e.target.value);
            setId(location?._id);
            setName(location?.name ?? "");
            setAddress(location?.address ?? "");
            setInstructions(location?.instructions ?? "");
          }}
          value={id ?? ""}
        >
          <option value="">New location</option>
          {locations?.map((l) => (
            <option key={l._id} value={l._id}>
              {l.name}
            </option>
          ))}
        </select>
      </label>
      <label className="block">
        Name
        <Input
          onChange={(e) => setName(e.target.value)}
          required
          value={name}
        />
      </label>
      <label className="block">
        Public address
        <Input
          onChange={(e) => setAddress(e.target.value)}
          required
          value={address}
        />
      </label>
      <label className="block">
        Private instructions
        <Input
          onChange={(e) => setInstructions(e.target.value)}
          value={instructions}
        />
      </label>
      <Button type="submit">Save location</Button>
      {message ? <p role="status">{message}</p> : null}
    </form>
  );
}
