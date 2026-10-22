"use client";
import { useMutation, useQuery } from "convex/react";
import { Bot } from "lucide-react";
import { useState } from "react";
import { errorText } from "@/components/registration/errors";
import { formatDate } from "@/components/registration/format";
import { Button } from "@/components/ui/Button";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";
import { CopyButton } from "@/components/ui/copy-button";
import { ConfirmDialog, Modal } from "@/components/ui/dialog";
import { Field, TextInput } from "@/components/ui/field";
import {
  EmptyState,
  PageHeader,
  ResultNotice,
  Skeleton,
} from "@/components/ui/page-header";
import { Table, TBody, TD, TH, THead, TR } from "@/components/ui/table";
import { api } from "@/convex/_generated/api";
import type { Id } from "@/convex/_generated/dataModel";

type Issued = { label: string; token: string };
type Token = {
  _id: Id<"mcpTokens">;
  label: string;
  prefix: string;
  createdAt: number;
  lastUsedAt?: number;
  revokedAt?: number;
};

function endpoint() {
  if (typeof window === "undefined") {
    return "/api/mcp";
  }
  return `${window.location.origin}/api/mcp`;
}

function ClientSnippets({ token }: { token: string }) {
  const url = endpoint();
  const claudeCode = `claude mcp add --transport http taylored ${url} --header "Authorization: Bearer ${token}"`;
  const json = JSON.stringify(
    {
      mcpServers: {
        taylored: {
          type: "http",
          url,
          headers: { Authorization: `Bearer ${token}` },
        },
      },
    },
    null,
    2
  );
  return (
    <div className="space-y-4">
      <div className="space-y-1.5">
        <p className="font-medium text-slate-700 text-sm">Claude Code</p>
        <pre className="overflow-x-auto rounded-md bg-slate-900 p-3 text-slate-100 text-xs">
          {claudeCode}
        </pre>
        <CopyButton label="Copy command" value={claudeCode} />
      </div>
      <div className="space-y-1.5">
        <p className="font-medium text-slate-700 text-sm">
          Claude Desktop, Cursor, and other MCP clients
        </p>
        <pre className="overflow-x-auto rounded-md bg-slate-900 p-3 text-slate-100 text-xs">
          {json}
        </pre>
        <CopyButton label="Copy config" value={json} />
      </div>
    </div>
  );
}

function IssuedModal({
  issued,
  onClose,
}: {
  issued: Issued | null;
  onClose: () => void;
}) {
  return (
    <Modal
      description="Copy it now. For security the token is shown once and cannot be retrieved later."
      footer={
        <Button onClick={onClose} size="sm" type="button">
          Done
        </Button>
      }
      onClose={onClose}
      open={issued !== null}
      size="lg"
      title={issued ? `Token for ${issued.label}` : "Token"}
    >
      {issued ? (
        <div className="space-y-5">
          <div className="space-y-1.5">
            <p className="font-medium text-slate-700 text-sm">Agent token</p>
            <code className="block break-all rounded-md border border-slate-200 bg-slate-50 p-3 text-slate-900 text-xs">
              {issued.token}
            </code>
            <CopyButton label="Copy token" value={issued.token} />
          </div>
          <ClientSnippets token={issued.token} />
        </div>
      ) : null}
    </Modal>
  );
}

function CreateForm({
  onIssued,
  onError,
}: {
  onIssued: (issued: Issued) => void;
  onError: (message: string) => void;
}) {
  const create = useMutation(api.mcp.createToken);
  const [label, setLabel] = useState("");
  const [busy, setBusy] = useState(false);
  return (
    <form
      className="flex flex-col gap-3 sm:flex-row sm:items-end"
      onSubmit={async (event) => {
        event.preventDefault();
        setBusy(true);
        try {
          const result = await create({ label });
          onIssued({ label, token: result.token });
          setLabel("");
        } catch (error) {
          onError(errorText(error));
        } finally {
          setBusy(false);
        }
      }}
    >
      <Field
        className="flex-1"
        hint="Name the agent or device, for example “Evan’s Claude Code”."
        label="New token label"
        required
      >
        {(props) => (
          <TextInput
            {...props}
            maxLength={80}
            onChange={(event) => setLabel(event.target.value)}
            required
            value={label}
          />
        )}
      </Field>
      <Button disabled={busy || !label.trim()} type="submit">
        {busy ? "Creating…" : "Create token"}
      </Button>
    </form>
  );
}

function TokenTable({
  tokens,
  onRevoke,
}: {
  tokens: Token[] | undefined;
  onRevoke: (id: Id<"mcpTokens">, label: string) => void;
}) {
  if (tokens === undefined) {
    return <Skeleton className="h-40" />;
  }
  if (tokens.length === 0) {
    return (
      <EmptyState
        description="Create a token above and paste it into your MCP client."
        icon={<Bot aria-hidden className="size-8" />}
        title="No active agent tokens"
      />
    );
  }
  return (
    <Table>
      <THead>
        <TR>
          <TH>Label</TH>
          <TH>Token</TH>
          <TH>Created</TH>
          <TH>Last used</TH>
          <TH />
        </TR>
      </THead>
      <TBody>
        {tokens.map((token) => (
          <TR key={token._id}>
            <TD className="font-medium text-slate-900">{token.label}</TD>
            <TD>
              <code className="text-slate-600 text-xs">{token.prefix}…</code>
            </TD>
            <TD>{formatDate(token.createdAt)}</TD>
            <TD>
              {token.lastUsedAt ? (
                formatDate(token.lastUsedAt)
              ) : (
                <Badge>Never</Badge>
              )}
            </TD>
            <TD className="text-right">
              <Button
                onClick={() => onRevoke(token._id, token.label)}
                size="xs"
                variant="danger"
              >
                Revoke
              </Button>
            </TD>
          </TR>
        ))}
      </TBody>
    </Table>
  );
}

export function AgentAccessAdmin() {
  const tokens = useQuery(api.mcp.tokens);
  const revoke = useMutation(api.mcp.revokeToken);
  const [issued, setIssued] = useState<Issued | null>(null);
  const [message, setMessage] = useState("");
  const [revoking, setRevoking] = useState<{
    id: Id<"mcpTokens">;
    label: string;
  } | null>(null);
  const active = tokens?.filter((token) => !token.revokedAt) ?? [];
  const revoked = tokens?.filter((token) => token.revokedAt) ?? [];
  return (
    <div className="space-y-6">
      <PageHeader
        description="Let an AI agent run the admin workspace through the Model Context Protocol. Each token acts as you: every action is audited under your account and limited to what you can do here."
        title="Agent access"
      />
      <ResultNotice message={message} />
      <Card>
        <CardContent className="space-y-4">
          <CreateForm
            onError={setMessage}
            onIssued={(value) => {
              setMessage("");
              setIssued(value);
            }}
          />
          <p className="text-slate-500 text-sm">
            Endpoint: <code className="text-slate-700">{endpoint()}</code>.
            Agents authenticate with{" "}
            <code className="text-slate-700">Authorization: Bearer</code> and
            get tools, resources, and prompts for every admin task.
          </p>
        </CardContent>
      </Card>
      <TokenTable
        onRevoke={(id, label) => setRevoking({ id, label })}
        tokens={tokens === undefined ? undefined : active}
      />
      {revoked.length > 0 ? (
        <p className="text-slate-500 text-sm">
          {revoked.length} revoked{" "}
          {revoked.length === 1 ? "token remains" : "tokens remain"} in the
          audit history.
        </p>
      ) : null}
      <IssuedModal issued={issued} onClose={() => setIssued(null)} />
      <ConfirmDialog
        confirmLabel="Revoke token"
        danger
        description="Agents using this token lose access immediately. This cannot be undone."
        onClose={() => setRevoking(null)}
        onConfirm={async () => {
          if (!revoking) {
            return;
          }
          await revoke({ id: revoking.id });
          setMessage(`Revoked ${revoking.label}.`);
          setRevoking(null);
        }}
        open={revoking !== null}
        title={revoking ? `Revoke ${revoking.label}?` : "Revoke token"}
      />
    </div>
  );
}
