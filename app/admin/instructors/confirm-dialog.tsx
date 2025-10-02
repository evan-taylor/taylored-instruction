type ConfirmDialogProps = {
  isOpen: boolean;
  userId: string | null;
  userEmail: string | null;
  onConfirm: () => void;
  onCancel: () => void;
};

export function ConfirmDialog({
  isOpen,
  userId,
  userEmail,
  onConfirm,
  onCancel,
}: ConfirmDialogProps) {
  if (!isOpen) {
    return null;
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black bg-opacity-50">
      <div className="mx-4 max-w-md rounded-lg bg-white p-6 shadow-xl">
        <h3 className="mb-4 font-bold text-lg">Confirm Deletion</h3>
        <p className="mb-6 text-gray-700">
          Are you sure you want to reject and delete user{" "}
          <strong>{userEmail || userId}</strong>? This action cannot be undone.
        </p>
        <div className="flex justify-end gap-3">
          <button
            className="rounded bg-gray-200 px-4 py-2 text-gray-800 hover:bg-gray-300"
            onClick={onCancel}
            type="button"
          >
            Cancel
          </button>
          <button
            className="rounded bg-red-600 px-4 py-2 text-white hover:bg-red-700"
            onClick={onConfirm}
            type="button"
          >
            Delete User
          </button>
        </div>
      </div>
    </div>
  );
}
