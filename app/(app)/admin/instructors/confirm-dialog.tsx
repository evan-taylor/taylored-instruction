<<<<<<< HEAD
interface ConfirmDialogProps {
=======
import { ConfirmDialog as Confirm } from "@/components/ui/dialog";

type ConfirmDialogProps = {
>>>>>>> origin/master
  isOpen: boolean;
  onCancel: () => void;
  onConfirm: () => void;
  userEmail: string | null;
  userId: string | null;
}

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
      <p className="text-slate-700 text-sm">
        <strong>{userEmail || userId}</strong> will lose access immediately.
      </p>
    </Confirm>
  );
}
