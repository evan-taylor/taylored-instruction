import { Notice } from "@/components/ui/page-header";

type AlertMessagesProps = {
  error: string | null;
  actionMessage: string | null;
};

export function AlertMessages({ error, actionMessage }: AlertMessagesProps) {
  return (
    <>
      {error ? (
        <Notice className="mb-4" tone="danger">
          {error}
        </Notice>
      ) : null}
      {actionMessage ? (
        <Notice className="mb-4" tone="success">
          {actionMessage}
        </Notice>
      ) : null}
    </>
  );
}
