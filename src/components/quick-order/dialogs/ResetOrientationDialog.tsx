import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";

type ResetOrientationDialogProps = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onConfirmReset: () => void;
  onCancel: () => void;
  disabled?: boolean;
};

export function ResetOrientationDialog({
  open,
  onOpenChange,
  onConfirmReset,
  onCancel,
  disabled = false,
}: ResetOrientationDialogProps) {
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-sm">
        <DialogHeader>
          <DialogTitle>Reset orientation and settings?</DialogTitle>
          <DialogDescription>
            This will revert the selected model to its import orientation and default QuickPrint settings.
          </DialogDescription>
        </DialogHeader>
        <p className="text-sm text-muted-foreground">
          You&apos;ll need to re-lock the orientation and re-run preparation before pricing again.
        </p>
        <DialogFooter className="gap-2">
          <Button variant="outline" onClick={onCancel}>
            Cancel
          </Button>
          <Button variant="destructive" onClick={onConfirmReset} disabled={disabled}>
            Reset file
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
