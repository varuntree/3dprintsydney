import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";

type ResumeOrderDialogProps = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onStartFresh: () => void;
  onResume: () => void;
};

export function ResumeOrderDialog({
  open,
  onOpenChange,
  onStartFresh,
  onResume,
}: ResumeOrderDialogProps) {
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Resume Previous Project?</DialogTitle>
          <DialogDescription>
            You have an unsaved draft from a previous session. Would you like to continue where you left off?
          </DialogDescription>
        </DialogHeader>
        <DialogFooter className="gap-3">
          <Button variant="outline" onClick={onStartFresh}>
            Start Fresh
          </Button>
          <Button onClick={onResume}>Resume Draft</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
