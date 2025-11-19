import { useRef, useState, useCallback, useMemo, useEffect } from "react";
import { Box, Lock, Check, RotateCcw, AlertTriangle } from "lucide-react";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import ModelViewerWrapper, { type ModelViewerRef } from "@/components/3d/ModelViewerWrapper";
import OrientationControls from "./OrientationControls";
import { useOrientationStore } from "@/stores/orientation-store";
import { useQuickOrder } from "../context/QuickOrderContext";

export function OrientStep() {
  const {
    uploads,
    currentlyOrienting,
    orientationLocked,
    orientedCount,
    allOrientationsLocked,
    goToStep,
    isLocking,
    handleLockOrientation,
    setCurrentlyOrienting,
    viewerErrors,
    handleViewerError,
    removeUpload,
    boundsViolationMessage,
    settings,
    materials,
    setResetCandidate,
  } = useQuickOrder();

  const viewerRef = useRef<ModelViewerRef>(null);
  const [facePickMode, setFacePickMode] = useState(false);
  const fileInputRef = useRef<HTMLInputElement | null>(null); // For re-upload if error

  const viewHelpersVisible = useOrientationStore((state) => state.helpersVisible);
  const setViewHelpersVisible = useOrientationStore((state) => state.setHelpersVisible);
  const interactionDisabled = useOrientationStore((state) => state.interactionDisabled);
  const interactionMessage = useOrientationStore((state) => state.interactionMessage);

  const handleViewerReset = useCallback(() => {
    setViewHelpersVisible(false);
    viewerRef.current?.resetView();
  }, [setViewHelpersVisible]);

  useEffect(() => {
    setFacePickMode(false);
  }, [currentlyOrienting]);

  const currentFileMeta = useMemo(
    () => (currentlyOrienting ? uploads.find((u) => u.id === currentlyOrienting) ?? null : null),
    [currentlyOrienting, uploads]
  );

  const currentOrientationMaterialCost = useMemo(() => {
    if (!currentlyOrienting) return 0.25;
    const materialId = settings[currentlyOrienting]?.materialId;
    const material = materials.find((m) => m.id === materialId);
    return Number(material?.costPerGram ?? 0.25);
  }, [currentlyOrienting, settings, materials]);

  const viewerErrorActive = currentlyOrienting ? Boolean(viewerErrors[currentlyOrienting]) : false;
  const orientationLockBlocked = !allOrientationsLocked;

  // Helper for re-upload input
  const onReUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    // This functionality is handled by the main uploader
  };
  const { onUpload } = useQuickOrder();

  return (
    <section className="rounded-2xl border border-border bg-surface-overlay/90 p-4 shadow-sm backdrop-blur supports-[backdrop-filter]:bg-surface-overlay/80 sm:p-6 md:scroll-mt-[8.5rem] lg:scroll-mt-[9.5rem]">
      <div className="mb-4 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex items-center gap-3">
          <Box className="h-5 w-5 text-muted-foreground" />
          <div>
            <h2 className="text-base font-semibold sm:text-lg">Orient Your Models</h2>
            {currentlyOrienting && (
              <p className="text-xs text-muted-foreground">
                File {uploads.findIndex((u) => u.id === currentlyOrienting) + 1} of {uploads.length}
                {" · "}
                {orientedCount} oriented
              </p>
            )}
          </div>
        </div>
        <div className="flex flex-col items-start gap-1 sm:items-end">
          <Button
            variant="outline"
            size="sm"
            onClick={() => goToStep("configure")}
            disabled={isLocking || !allOrientationsLocked}
            title={orientationLockBlocked ? "Lock orientation to continue" : undefined}
            className="whitespace-nowrap"
          >
            Continue
          </Button>
          {orientationLockBlocked ? (
            <span className="flex items-center gap-1.5 text-xs font-semibold text-amber-700">
              <Lock className="h-3.5 w-3.5" /> Lock orientation to continue
            </span>
          ) : null}
        </div>
      </div>

      {/* File Selection */}
      <div className="mb-4 -mx-4 overflow-x-auto px-4 sm:mx-0 sm:px-0">
        <div className="flex w-full gap-2 sm:flex-wrap sm:w-auto">
          {uploads.map((u) => {
            const isOriented = !!orientationLocked[u.id];
            const isCurrent = currentlyOrienting === u.id;

            return (
              <Button
                key={u.id}
                size="sm"
                variant={isCurrent ? "default" : "outline"}
                onClick={() => setCurrentlyOrienting(u.id)}
                disabled={isLocking}
                className={cn(
                  "relative max-w-full overflow-hidden",
                  isOriented && "border-green-500 bg-green-50 text-green-700"
                )}
              >
                {isOriented && (
                  <Check className="mr-1 h-3 w-3 text-green-600" />
                )}
                <span className="block max-w-[180px] truncate" title={u.filename}>{u.filename}</span>
              </Button>
            );
          })}
        </div>
      </div>

      {currentlyOrienting ? (
        <div className="flex flex-col lg:flex-row gap-4 lg:gap-6 lg:items-start">
          {/* 3D Viewer Column */}
          <div className="relative flex-1 min-h-[400px] lg:min-h-[600px] bg-surface-muted rounded-xl border border-border overflow-hidden">
            <ModelViewerWrapper
              ref={viewerRef}
              url={`/api/tmp-file/${currentlyOrienting}`}
              filename={currentFileMeta?.filename}
              fileSizeBytes={currentFileMeta?.size}
              onError={(err) => handleViewerError(currentlyOrienting, err)}
              facePickMode={facePickMode}
              onFacePickComplete={() => setFacePickMode(false)}
              overhangThreshold={45}
            />
            
            {/* Mobile Controls Overlay */}
            <div className="lg:hidden absolute bottom-0 left-0 right-0 p-2 z-10 pointer-events-none">
              <div className="pointer-events-auto">
                 <OrientationControls
                    onReset={handleViewerReset}
                    onRecenter={() => viewerRef.current?.recenter()}
                    onFitView={() => viewerRef.current?.fit()}
                    onAutoOrient={() => {
                      setFacePickMode(false);
                      viewerRef.current?.autoOrient();
                    }}
                    onLock={handleLockOrientation}
                    onRotate={(axis, degrees) => viewerRef.current?.rotate(axis, degrees)}
                    onOrientToFaceToggle={(enabled) => setFacePickMode(enabled)}
                    orientToFaceActive={facePickMode}
                    onToggleHelpers={() => setViewHelpersVisible(!viewHelpersVisible)}
                    helpersVisible={viewHelpersVisible}
                    isLocking={isLocking}
                    disabled={isLocking || viewerErrorActive}
                    lockGuardReason={boundsViolationMessage}
                    supportCostPerGram={currentOrientationMaterialCost}
                  />
              </div>
            </div>

            {viewerErrorActive && currentlyOrienting ? (
              <div className="absolute top-4 left-4 right-4 z-20 rounded-lg border border-destructive/40 bg-destructive/90 text-white p-3 text-sm shadow-md backdrop-blur-sm">
                <div className="flex items-center gap-2 font-semibold">
                  <AlertTriangle className="h-4 w-4" />
                  <span>{viewerErrors[currentlyOrienting]}</span>
                </div>
                <p className="mt-2 text-xs opacity-90">
                  Remove the file or upload a clean copy to continue.
                </p>
                <div className="mt-3 flex flex-wrap gap-2">
                  <Button
                    type="button"
                    variant="secondary"
                    size="sm"
                    onClick={() => fileInputRef.current?.click()}
                  >
                    Re-upload
                  </Button>
                  <Button
                    type="button"
                    variant="ghost"
                    size="sm"
                    className="text-white hover:bg-white/20"
                    onClick={() => removeUpload(currentlyOrienting)}
                  >
                    Remove
                  </Button>
                </div>
                <input
                  ref={fileInputRef}
                  type="file"
                  multiple
                  accept=".stl,.3mf"
                  onChange={onUpload}
                  className="hidden"
                />
              </div>
            ) : null}

             {/* Bounds / Interaction alerts (Overlay on Viewer) */}
             {(!viewerErrorActive && (boundsViolationMessage || (interactionDisabled && interactionMessage))) ? (
              <div className="absolute top-4 left-4 right-4 z-20 rounded-lg border border-amber-200 bg-amber-50/95 p-3 text-sm text-amber-900 shadow-sm backdrop-blur-sm">
                <div className="flex items-start gap-2">
                  <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0" />
                  <div className="space-y-1">
                    {boundsViolationMessage ? <p>{boundsViolationMessage}</p> : null}
                    {interactionDisabled && interactionMessage ? <p>{interactionMessage}</p> : null}
                  </div>
                </div>
              </div>
            ) : null}
            
            <div className="hidden lg:block absolute top-4 right-4 z-10">
               <Button
                type="button"
                variant="secondary"
                size="sm"
                className="gap-2 opacity-80 hover:opacity-100 shadow-sm"
                disabled={!currentlyOrienting}
                onClick={() => currentlyOrienting && setResetCandidate(currentlyOrienting)}
              >
                <RotateCcw className="h-3.5 w-3.5" /> Reset to import
              </Button>
            </div>
          </div>
          
          {/* Desktop Controls Column */}
          <div className="hidden lg:block w-80 shrink-0 sticky top-4">
             <OrientationControls
                onReset={handleViewerReset}
                onRecenter={() => viewerRef.current?.recenter()}
                onFitView={() => viewerRef.current?.fit()}
                onAutoOrient={() => {
                  setFacePickMode(false);
                  viewerRef.current?.autoOrient();
                }}
                onLock={handleLockOrientation}
                onRotate={(axis, degrees) => viewerRef.current?.rotate(axis, degrees)}
                onOrientToFaceToggle={(enabled) => setFacePickMode(enabled)}
                orientToFaceActive={facePickMode}
                onToggleHelpers={() => setViewHelpersVisible(!viewHelpersVisible)}
                helpersVisible={viewHelpersVisible}
                isLocking={isLocking}
                disabled={isLocking || viewerErrorActive}
                lockGuardReason={boundsViolationMessage}
                supportCostPerGram={currentOrientationMaterialCost}
              />
          </div>
        </div>
      ) : allOrientationsLocked ? (
        <div className="flex min-h-[400px] items-center justify-center rounded-lg border border-green-200 bg-green-50 p-8 text-center">
          <div>
            <div className="mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-full bg-green-100">
              <Check className="h-8 w-8 text-green-600" />
            </div>
            <p className="text-lg font-semibold text-green-800">
              All files oriented!
            </p>
            <p className="mt-2 text-sm text-green-700">
              {uploads.length} file{uploads.length === 1 ? "" : "s"} ready for configuration
            </p>
            <Button
              onClick={() => goToStep("configure")}
              className="mt-4 bg-success text-white hover:bg-success-light"
            >
              Continue to Configure
            </Button>
          </div>
        </div>
      ) : (
        <div className="flex min-h-[400px] items-center justify-center rounded-lg border border-dashed border-border bg-surface-muted p-8 text-center">
          <div>
            <Box className="mx-auto h-12 w-12 text-muted-foreground" />
            <p className="mt-4 text-sm text-muted-foreground">
              Select a file above to begin orientation
            </p>
          </div>
        </div>
      )}
    </section>
  );
}

