interface AlertMessagesProps {
  actionMessage: string | null;
  error: string | null;
}

export function AlertMessages({ error, actionMessage }: AlertMessagesProps) {
  return (
    <>
      {error && (
        <div
          className="mb-4 rounded border border-red-400 bg-red-100 px-4 py-3 text-red-700"
          role="alert"
        >
          <strong className="font-bold">Error:</strong>
          <span className="block sm:inline"> {error}</span>
        </div>
      )}

      {actionMessage && (
        <div
          className="mb-4 rounded border border-blue-400 bg-blue-100 px-4 py-3 text-blue-700"
          role="alert"
        >
          <strong className="font-bold">Info:</strong>
          <span className="block sm:inline"> {actionMessage}</span>
        </div>
      )}
    </>
  );
}
