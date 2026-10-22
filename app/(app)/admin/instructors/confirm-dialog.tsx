import { ConfirmDialog as Confirm } from "@/components/ui/dialog";

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
  return (
    <Confirm
      confirmLabel="Delete user"
      danger
      description="This removes their sign-in and profile. It cannot be undone."
      onClose={onCancel}
      onConfirm={onConfirm}
      open={isOpen}
      title="Reject and delete this user?"
    >
      <p className="m-0 text-slate-700 text-sm">
        <strong>{userEmail || userId}</strong> will lose access immediately.
      </p>
    </Confirm>
  );
}
