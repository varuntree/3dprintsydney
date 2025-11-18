import { useQuickOrder } from "../context/QuickOrderContext";
import { ResumeOrderDialog } from "../dialogs/ResumeOrderDialog";
import { ResetOrientationDialog } from "../dialogs/ResetOrientationDialog";

export function GlobalDialogs() {
  const {
    showResumeDialog,
    setShowResumeDialog,
    clearDraft,
    loadDraft,
    restoreDraft,
    resetCandidate,
    setResetCandidate,
    resetFileToBaseline,
  } = useQuickOrder();

  return (
    <>
      <ResumeOrderDialog
        open={showResumeDialog}
        onOpenChange={setShowResumeDialog}
        onStartFresh={() => {
          clearDraft();
          setShowResumeDialog(false);
        }}
        onResume={() => {
          const draft = loadDraft();
          if (draft) {
            restoreDraft(draft);
          }
        }}
      />
      <ResetOrientationDialog
        open={Boolean(resetCandidate)}
        onOpenChange={(open) => {
          if (!open) setResetCandidate(null);
        }}
        onConfirmReset={() => {
          if (resetCandidate) {
            resetFileToBaseline(resetCandidate);
            setResetCandidate(null);
          }
        }}
        onCancel={() => setResetCandidate(null)}
        disabled={!resetCandidate}
      />
    </>
  );
}
