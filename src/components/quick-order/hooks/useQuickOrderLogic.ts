import { useEffect, useRef, useState, useCallback, useMemo } from "react";
import { useRouter } from "nextjs-toploader/app";
import {
  useOrientationStore,
  type OrientationQuaternion,
  type OrientationPosition,
  clearOrientationPersistence,
} from "@/stores/orientation-store";
import { browserLogger } from "@/lib/logging/browser-logger";
import {
  type Upload,
  type Material,
  type Step,
  type ShippingQuote,
  type FileSettings,
  type FileStatusState,
  type PriceDataState,
  type OrientationSnapshot,
  type SliceResult,
  type DraftState,
} from "../types";
import { STEP_SEQUENCE, DRAFT_KEY } from "../constants";
import { logQuickPrintError } from "../utils";

export function useQuickOrderLogic() {
  const router = useRouter();
  const [currentStep, setCurrentStep] = useState<Step>("upload");
  const [role, setRole] = useState<"ADMIN" | "CLIENT" | null>(null);
  const [studentDiscountEligible, setStudentDiscountEligible] = useState(false);
  const [studentDiscountRate, setStudentDiscountRate] = useState(0);
  const [uploads, setUploads] = useState<Upload[]>([]);
  const [materials, setMaterials] = useState<Material[]>([]);
  const [settings, setSettings] = useState<Record<string, FileSettings>>({});
  const [metrics, setMetrics] = useState<
    Record<string, { grams: number; timeSec: number; fallback?: boolean; error?: string }>
  >({});
  const [fileStatuses, setFileStatuses] = useState<Record<string, FileStatusState>>({});
  const [viewerErrors, setViewerErrors] = useState<Record<string, string>>({});
  const [expandedFiles, setExpandedFiles] = useState<Set<string>>(new Set());
  const [shippingQuote, setShippingQuote] = useState<ShippingQuote | null>(null);
  const [address, setAddress] = useState({
    name: "",
    line1: "",
    line2: "",
    city: "",
    state: "",
    postcode: "",
    phone: "",
  });
  const [priceData, setPriceData] = useState<PriceDataState | null>(null);
  const [loading, setLoading] = useState(false);
  const [pricing, setPricing] = useState(false);
  const [preparing, setPreparing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [walletBalance, setWalletBalance] = useState(0);
  const [orientationState, setOrientationState] = useState<Record<string, OrientationSnapshot>>({});
  const [orientationLocked, setOrientationLocked] = useState<Record<string, boolean>>({});
  const [currentlyOrienting, setCurrentlyOrienting] = useState<string | null>(null);
  const [isLocking, setIsLocking] = useState(false);
  const baselineSettingsRef = useRef<Record<string, FileSettings>>({});
  const [resetCandidate, setResetCandidate] = useState<string | null>(null);
  const [acceptedFallbacks, setAcceptedFallbacks] = useState<Set<string>>(new Set<string>());
  const [uploadQueue, setUploadQueue] = useState<
    Record<string, { filename: string; progress: number; status: "uploading" | "verifying" | "error"; error?: string }>
  >({});
  
  const boundsStatus = useOrientationStore((state) => state.boundsStatus);
  const interactionDisabled = useOrientationStore((state) => state.interactionDisabled);
  const interactionMessage = useOrientationStore((state) => state.interactionMessage);
  const orientationHydratingRef = useRef(false);

  // Draft state
  const [draftSaved, setDraftSaved] = useState(false);
  const [showResumeDialog, setShowResumeDialog] = useState(false);
  const draftLoadedRef = useRef(false);
  const initializedRef = useRef(false);
  const addressDebounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    const store = useOrientationStore.getState();
    store.resetForNewFile();
    clearOrientationPersistence();
  }, []);

  const orientedCount = useMemo(
    () => uploads.reduce((count, upload) => (orientationLocked[upload.id] ? count + 1 : count), 0),
    [uploads, orientationLocked]
  );
  const allOrientationsLocked = uploads.length > 0 && orientedCount === uploads.length;
  const preparedCount = useMemo(
    () => uploads.reduce((count, upload) => (metrics[upload.id]?.grams ? count + 1 : count), 0),
    [uploads, metrics]
  );
  const boundsViolationMessage = useMemo(() => {
    if (!boundsStatus || boundsStatus.inBounds) {
      return undefined;
    }
    return boundsStatus.violations?.[0] ?? "Model exceeds the 240mm build volume. Reorient before locking.";
  }, [boundsStatus]);

  const configurationComplete = uploads.length > 0 && preparedCount === uploads.length;
  const priceStageComplete = configurationComplete && !!priceData;
  const uploadComplete = uploads.length > 0;
  const stepCompletion = useMemo<Record<Step, boolean>>(
    () => ({
      upload: uploadComplete,
      orient: allOrientationsLocked,
      configure: configurationComplete,
      price: priceStageComplete,
      checkout: false,
    }),
    [uploadComplete, allOrientationsLocked, configurationComplete, priceStageComplete]
  );

  const isStepUnlocked = useCallback(
    (step: Step) => {
      if (step === "upload") return true;
      const index = STEP_SEQUENCE.indexOf(step);
      if (index <= 0) return true;
      const previous = STEP_SEQUENCE[index - 1];
      return Boolean(stepCompletion[previous as keyof typeof stepCompletion]);
    },
    [stepCompletion]
  );

  const goToStep = useCallback(
    (step: Step) => {
      if (!isStepUnlocked(step)) return;
      setCurrentStep(step);
    },
    [isStepUnlocked]
  );

  useEffect(() => {
    uploads.forEach((upload) => {
      const fileSettings = settings[upload.id];
      if (fileSettings && !baselineSettingsRef.current[upload.id]) {
        baselineSettingsRef.current[upload.id] = { ...fileSettings };
      }
    });
  }, [uploads, settings]);

  const lastHydratedFileRef = useRef<string | null>(null);

  useEffect(() => {
    if (currentlyOrienting === lastHydratedFileRef.current) return;
    lastHydratedFileRef.current = currentlyOrienting;

    orientationHydratingRef.current = true;
    const store = useOrientationStore.getState();
    if (currentlyOrienting) {
      const snapshot = orientationState[currentlyOrienting];
      if (snapshot) {
        store.setOrientation(snapshot.quaternion, snapshot.position, {
          auto: snapshot.autoOriented,
        });
        useOrientationStore.setState((state) => ({
          ...state,
          helpersVisible: snapshot.helpersVisible ?? false,
          gizmoEnabled: snapshot.gizmoEnabled ?? false,
          gizmoMode: snapshot.gizmoMode ?? "rotate",
        }));
      } else {
        store.reset();
      }
    } else {
      store.reset();
    }
    orientationHydratingRef.current = false;
  }, [currentlyOrienting, orientationState]);

  useEffect(() => {
    if (!currentlyOrienting) return;
    const enabled = settings[currentlyOrienting]?.supportsEnabled ?? true;
    useOrientationStore.getState().setSupportsEnabled(enabled);
  }, [currentlyOrienting, settings]);

  useEffect(() => {
    if (!currentlyOrienting) return;
    const unsubscribe = useOrientationStore.subscribe((state) => {
      if (!currentlyOrienting || orientationHydratingRef.current) return;
      const next = {
        quaternion: state.quaternion,
        position: state.position,
        autoOriented: state.isAutoOriented,
        supportVolume: state.supportVolume,
        supportWeight: state.supportWeight,
        helpersVisible: state.helpersVisible,
        gizmoEnabled: state.gizmoEnabled,
        gizmoMode: state.gizmoMode,
      };
      setOrientationState((prev) => ({
        ...prev,
        [currentlyOrienting]: next,
      }));
      let unlocked = false;
      setOrientationLocked((prev) => {
        if (!prev[currentlyOrienting]) return prev;
        unlocked = true;
        return {
          ...prev,
          [currentlyOrienting]: false,
        };
      });
      if (unlocked) {
        setMetrics((prev) => {
          if (!prev[currentlyOrienting]) return prev;
          const nextMetrics = { ...prev };
          delete nextMetrics[currentlyOrienting];
          return nextMetrics;
        });
        setPriceData(null);
      }
    });
    return () => {
      unsubscribe();
    };
  }, [currentlyOrienting]);

  useEffect(() => {
    if (currentStep !== "configure") {
      setExpandedFiles(new Set());
    }
  }, [currentStep]);

  useEffect(() => {
    if (!priceData || uploads.length === 0) return;
    if (!address.postcode && !address.state) return;
    if (addressDebounceRef.current) {
      clearTimeout(addressDebounceRef.current);
    }
    addressDebounceRef.current = setTimeout(() => {
      void computePrice();
    }, 600);
    return () => {
      if (addressDebounceRef.current) {
        clearTimeout(addressDebounceRef.current);
        addressDebounceRef.current = null;
      }
    };
  }, [address.postcode, address.state, uploads.length, metrics, priceData]);

  useEffect(() => {
    if (priceData) {
      setPriceData(null);
    }
  }, [settings, metrics, uploads, priceData]);

  useEffect(() => {
    async function loadWalletBalance() {
      try {
        const res = await fetch("/api/client/dashboard");
        if (res.ok) {
          const { data } = await res.json();
          setWalletBalance(data.walletBalance ?? 0);
        }
      } catch (err) {
        logQuickPrintError("wallet-balance", "Failed to fetch wallet balance", err);
      }
    }
    loadWalletBalance();
  }, []);

  const saveDraft = useCallback(() => {
    try {
      const draft: DraftState = {
        timestamp: Date.now(),
        step: currentStep,
        uploads: uploads.map((u) => ({ id: u.id, filename: u.filename, size: u.size })),
        settings,
        orientationState,
        orientationLocked,
        address,
        metrics,
      };
      localStorage.setItem(DRAFT_KEY, JSON.stringify(draft));
      setDraftSaved(true);
      setTimeout(() => setDraftSaved(false), 2000);
    } catch (error) {
      logQuickPrintError("draft.save", "Failed to save draft", error);
    }
  }, [currentStep, uploads, settings, orientationState, orientationLocked, address, metrics]);

  const loadDraft = useCallback((): DraftState | null => {
    try {
      const stored = localStorage.getItem(DRAFT_KEY);
      if (!stored) return null;
      return JSON.parse(stored) as DraftState;
    } catch (error) {
      logQuickPrintError("draft.load", "Failed to load draft", error);
      return null;
    }
  }, []);

  const clearDraft = useCallback(() => {
    try {
      localStorage.removeItem(DRAFT_KEY);
      clearOrientationPersistence();
    } catch (error) {
      logQuickPrintError("draft.clear", "Failed to clear draft", error);
    }
  }, []);

  const restoreDraft = useCallback((draft: DraftState) => {
    try {
      if (draft.step) goToStep(draft.step);
      if (draft.uploads && Array.isArray(draft.uploads)) {
        setUploads(draft.uploads);
      }
      if (draft.settings) setSettings(draft.settings);
      if (draft.orientationState) setOrientationState(draft.orientationState);
      if (draft.orientationLocked) {
        setOrientationLocked(draft.orientationLocked);
      } else if ((draft as unknown as { orientedFileIds?: Record<string, string> }).orientedFileIds) {
        const legacyLocks = Object.keys(
          (draft as unknown as { orientedFileIds: Record<string, string> }).orientedFileIds
        ).reduce<Record<string, boolean>>((acc, key) => {
          acc[key] = true;
          return acc;
        }, {});
        setOrientationLocked(legacyLocks);
      }
      if (draft.address) setAddress(draft.address);
      if (draft.metrics) setMetrics(draft.metrics);
      if (draft.step === "orient") {
        const pendingId = draft.uploads?.find(
          (u) => !draft.orientationLocked || !draft.orientationLocked[u.id]
        )?.id;
        const firstId = draft.uploads?.[0]?.id;
        setCurrentlyOrienting(pendingId || firstId || null);
      } else {
        setCurrentlyOrienting(null);
      }
      setShowResumeDialog(false);
      draftLoadedRef.current = true;
    } catch (error) {
      logQuickPrintError("draft.restore", "Failed to restore draft", error);
    }
  }, [goToStep]);

  useEffect(() => {
    const draft = loadDraft();
    if (draft && !draftLoadedRef.current) {
      setShowResumeDialog(true);
    }
  }, [loadDraft]);

  useEffect(() => {
    if (!draftLoadedRef.current && uploads.length === 0) return;
    if (uploads.length === 0 && Object.keys(settings).length === 0) return;
    const timeoutId = setTimeout(() => {
      saveDraft();
    }, 1000);
    return () => clearTimeout(timeoutId);
  }, [uploads, settings, orientationState, orientationLocked, address, saveDraft]);

  useEffect(() => {
    if (initializedRef.current) return;
    initializedRef.current = true;
    fetch("/api/auth/me").then(async (r) => {
      if (!r.ok) {
        router.replace("/login");
        return;
      }
      const { data } = await r.json();
      setRole(data.role ?? null);
      if (typeof data.studentDiscountEligible === "boolean") {
        setStudentDiscountEligible(data.studentDiscountEligible);
      }
      if (typeof data.studentDiscountRate === "number") {
        setStudentDiscountRate(data.studentDiscountRate);
      }
    });
    fetch("/api/client/materials").then(async (r) => {
      try {
        if (!r.ok) {
          setMaterials([]);
          return;
        }
        const j = await r.json();
        const arr = (j && (j.data ?? j)) as unknown;
        if (Array.isArray(arr)) {
          setMaterials(arr as Material[]);
        } else {
          setMaterials([]);
        }
      } catch {
        setMaterials([]);
      }
    });
  }, [router]);

  useEffect(() => {
    let target = currentStep;
    if (currentStep === "orient" && !stepCompletion.upload) {
      target = "upload";
    } else if (currentStep === "configure" && !stepCompletion.orient) {
      target = "orient";
    } else if (currentStep === "price" && !stepCompletion.configure) {
      target = "configure";
    } else if (currentStep === "checkout" && !stepCompletion.price) {
      target = stepCompletion.configure ? "price" : "configure";
    }
    if (target !== currentStep) {
      setCurrentStep(target);
    }
  }, [currentStep, stepCompletion]);

  function addUploadQueueItem(localId: string, filename: string) {
    setUploadQueue((prev) => ({
      ...prev,
      [localId]: { filename, progress: 0, status: "uploading" },
    }));
  }

  function updateUploadQueueItem(
    localId: string,
    patch: Partial<{ progress: number; status: "uploading" | "verifying" | "error"; error?: string }>,
  ) {
    setUploadQueue((prev) => {
      const existing = prev[localId];
      if (!existing) return prev;
      return {
        ...prev,
        [localId]: { ...existing, ...patch },
      };
    });
  }

  function removeUploadQueueItem(localId: string) {
    setUploadQueue((prev) => {
      const next = { ...prev };
      delete next[localId];
      return next;
    });
  }

  async function processFiles(fileList: FileList | File[]) {
    const files = Array.from(fileList);
    if (files.length === 0) return;
    setLoading(true);
    setError(null);

    for (const file of files) {
      const localId = crypto.randomUUID();
      addUploadQueueItem(localId, file.name);
      try {
        const uploaded = await new Promise<Upload[]>((resolve, reject) => {
          const formData = new FormData();
          formData.append("files", file);
          const xhr = new XMLHttpRequest();
          xhr.open("POST", "/api/quick-order/upload");
          xhr.responseType = "json";
          xhr.upload.onprogress = (event) => {
            if (!event.lengthComputable) return;
            const progress = Math.min(100, Math.round((event.loaded / event.total) * 100));
            updateUploadQueueItem(localId, { progress });
          };
          xhr.onload = () => {
            if (xhr.status >= 200 && xhr.status < 300) {
              const payload = xhr.response ?? {};
              const data = (payload as { data?: Upload[] }).data;
              if (!data) {
                reject(new Error("Upload response missing payload"));
                return;
              }
              resolve(data);
            } else {
              const payload = xhr.response ?? {};
              const message =
                (payload as { error?: { userMessage?: string; message?: string } }).error?.userMessage ||
                (payload as { error?: { userMessage?: string; message?: string } }).error?.message ||
                "Upload failed. Please check file type and size (max 50 MB).";
              reject(new Error(message));
            }
          };
          xhr.onerror = () => reject(new Error("Network error while uploading. Please retry."));
          xhr.send(formData);
        });

        updateUploadQueueItem(localId, { progress: 100, status: "verifying" });
        setUploads((prev) => {
          const next = [...prev, ...uploaded];
          if (prev.length === 0 && uploaded.length > 0) {
            goToStep("orient");
            setCurrentlyOrienting(uploaded[0].id);
          }
          return next;
        });

        const defaultMat = materials[0]?.id ?? 0;
        setSettings((prev) => {
          const next = { ...prev } as Record<string, FileSettings>;
          uploaded.forEach((it) => {
            next[it.id] = {
              materialId: defaultMat,
              layerHeight: 0.2,
              infill: 20,
              quantity: 1,
              supportsEnabled: true,
            };
            baselineSettingsRef.current[it.id] = { ...next[it.id] };
          });
          return next;
        });
        setFileStatuses((prev) => {
          const next = { ...prev } as Record<string, FileStatusState>;
          uploaded.forEach((it) => {
            next[it.id] = { state: it.duplicate ? "success" : "idle" };
          });
          return next;
        });
        removeUploadQueueItem(localId);
      } catch (err) {
        const message = err instanceof Error ? err.message : "Upload failed. Please try again.";
        updateUploadQueueItem(localId, { status: "error", error: message });
        setError(message);
      }
    }

    setLoading(false);
  }

  async function onUpload(e: React.ChangeEvent<HTMLInputElement>) {
    if (e.target.files) {
      await processFiles(e.target.files);
      e.target.value = "";
    }
  }

  const handleViewerError = useCallback(
    (fileId: string | null, err: Error) => {
      if (!fileId) return;
      const message = err?.message?.length
        ? err.message
        : "We couldn't display this model. Delete it and upload a fresh copy.";
      setViewerErrors((prev) => ({
        ...prev,
        [fileId]: message,
      }));
      setFileStatuses((prev) => ({
        ...prev,
        [fileId]: { state: "error", message },
      }));
      useOrientationStore.getState().setInteractionLock(true, "Model failed to load. Delete and re-upload.");
      setError("One of your files failed to load. Remove it and upload a new copy.");
    },
    []
  );

  function removeUpload(id: string) {
    const nextUploads = uploads.filter((u) => u.id !== id);
    if (nextUploads.length === uploads.length) return;
    setUploads(nextUploads);
    delete baselineSettingsRef.current[id];
    setSettings((prev) => {
      const copy = { ...prev } as typeof prev;
      delete copy[id];
      return copy;
    });
    setMetrics((prev) => {
      const copy = { ...prev };
      delete copy[id];
      return copy;
    });
    setOrientationState((prev) => {
      const copy = { ...prev };
      delete copy[id];
      return copy;
    });
    setOrientationLocked((prev) => {
      const copy = { ...prev };
      delete copy[id];
      return copy;
    });
    setFileStatuses((prev) => {
      const copy = { ...prev };
      delete copy[id];
      return copy;
    });
    setAcceptedFallbacks((prev) => {
      if (!prev.has(id)) return prev;
      const next = new Set(prev);
      next.delete(id);
      return next;
    });
    setViewerErrors((prev) => {
      if (!prev[id]) return prev;
      const next = { ...prev } as Record<string, string>;
      delete next[id];
      return next;
    });
    setExpandedFiles((prev) => {
      const next = new Set(prev);
      next.delete(id);
      return next;
    });
    setPriceData(null);
    setShippingQuote(null);
    goToStep(nextUploads.length === 0 ? "upload" : "configure");
  }

  const resetFileToBaseline = useCallback(
    (fileId: string) => {
      setSettings((prev) => {
        const baseline = baselineSettingsRef.current[fileId];
        if (!prev[fileId] && !baseline) return prev;
        const next = { ...prev } as Record<string, FileSettings>;
        if (baseline) {
          next[fileId] = { ...baseline };
        } else if (prev[fileId]) {
          next[fileId] = { ...prev[fileId] };
        }
        return next;
      });
      setOrientationState((prev) => {
        if (!prev[fileId]) return prev;
        const next = { ...prev };
        delete next[fileId];
        return next;
      });
      setOrientationLocked((prev) => {
        if (!prev[fileId]) return prev;
        const next = { ...prev };
        delete next[fileId];
        return next;
      });
      setMetrics((prev) => {
        if (!prev[fileId]) return prev;
        const next = { ...prev };
        delete next[fileId];
        return next;
      });
      setFileStatuses((prev) => ({
        ...prev,
        [fileId]: { state: "idle" },
      }));
      setViewerErrors((prev) => {
        if (!prev[fileId]) return prev;
        const next = { ...prev };
        delete next[fileId];
        return next;
      });
      setAcceptedFallbacks((prev) => {
        if (!prev.has(fileId)) return prev;
        const next = new Set(prev);
        next.delete(fileId);
        return next;
      });
      useOrientationStore.getState().reset();
      clearOrientationPersistence();
      setPriceData(null);
      setCurrentlyOrienting(fileId);
    },
    [
      setSettings,
      setOrientationState,
      setOrientationLocked,
      setMetrics,
      setFileStatuses,
      setViewerErrors,
      setAcceptedFallbacks,
      setPriceData,
      setCurrentlyOrienting,
    ]
  );

  async function handleLockOrientation() {
    if (!currentlyOrienting) return;
    if (boundsViolationMessage) {
      browserLogger.warn({
        scope: "browser.quick-print.orientation",
        message: "Lock blocked due to bounds violation",
        data: { fileId: currentlyOrienting },
      });
      setError(boundsViolationMessage);
      return;
    }
    if (interactionDisabled && interactionMessage) {
      browserLogger.warn({
        scope: "browser.quick-print.orientation",
        message: "Lock blocked due to interaction lock",
        data: { fileId: currentlyOrienting },
      });
      setError(interactionMessage);
      return;
    }

    try {
      setIsLocking(true);
      setError(null);

      const store = useOrientationStore.getState();
      const snapshot = orientationState[currentlyOrienting] ?? {
        quaternion: [...store.quaternion] as OrientationQuaternion,
        position: [...store.position] as OrientationPosition,
        autoOriented: store.isAutoOriented,
        supportVolume: store.supportVolume,
        supportWeight: store.supportWeight,
        helpersVisible: store.helpersVisible,
        gizmoEnabled: store.gizmoEnabled,
        gizmoMode: store.gizmoMode,
      };

      const resolvedSupportVolume = (() => {
        const volume = snapshot.supportVolume ?? store.supportVolume;
        return typeof volume === "number" && Number.isFinite(volume) ? volume : undefined;
      })();
      const resolvedSupportWeight = (() => {
        const weight = snapshot.supportWeight ?? store.supportWeight ?? resolvedSupportVolume;
        return typeof weight === "number" && Number.isFinite(weight) ? weight : undefined;
      })();

      const payload: Record<string, unknown> = {
        originalFileId: currentlyOrienting,
        quaternion: snapshot.quaternion,
        position: snapshot.position,
        autoOriented: snapshot.autoOriented ?? false,
      };
      if (resolvedSupportVolume !== undefined) {
        payload.supportVolume = resolvedSupportVolume;
      }
      if (resolvedSupportWeight !== undefined) {
        payload.supportWeight = resolvedSupportWeight;
      }

      const res = await fetch("/api/quick-order/orient", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });

      if (!res.ok) {
        throw new Error("Failed to save orientation");
      }

      const result = (await res.json()) as {
        success?: boolean;
        orientation?: {
          quaternion: OrientationQuaternion;
          position: OrientationPosition;
          autoOriented?: boolean;
          supportVolume?: number;
          supportWeight?: number;
        };
      };

      if (!result?.success || !result.orientation) {
        throw new Error("Orientation snapshot missing from response");
      }

      const persisted = result.orientation;
      const nextSnapshot: OrientationSnapshot = {
        ...snapshot,
        quaternion: persisted.quaternion,
        position: persisted.position,
        autoOriented: persisted.autoOriented ?? snapshot.autoOriented,
        supportVolume: persisted.supportVolume ?? resolvedSupportVolume ?? snapshot.supportVolume,
        supportWeight: persisted.supportWeight ?? resolvedSupportWeight ?? snapshot.supportWeight,
      };

      setOrientationState((prev) => ({
        ...prev,
        [currentlyOrienting]: nextSnapshot,
      }));
      browserLogger.info({
        scope: "browser.quick-print.orientation",
        message: "Orientation locked",
        data: { fileId: currentlyOrienting },
      });
      const updatedLockState = { ...orientationLocked, [currentlyOrienting]: true };
      setOrientationLocked(updatedLockState);

      const nextFile = uploads.find((upload) => !updatedLockState[upload.id]);
      if (nextFile) {
        setCurrentlyOrienting(nextFile.id);
      } else {
        setCurrentlyOrienting(null);
        goToStep("configure");
      }
    } catch (err) {
      logQuickPrintError("orientation-lock", "Orientation lock error", err);
      setError("Failed to lock orientation");
    } finally {
      setIsLocking(false);
    }
  }

  async function prepareFiles() {
    if (uploads.length === 0) return;
    setPreparing(true);
    setError(null);
    setAcceptedFallbacks(new Set<string>());
    setPriceData(null);
    setShippingQuote(null);

    for (const upload of uploads) {
      const fileId = upload.id;
      const fileSettings = settings[upload.id];
      if (!fileSettings) continue;

      setFileStatuses((prev) => ({
        ...prev,
        [upload.id]: { state: "running" },
      }));

      const runSliceRequest = async (supportsEnabledOverride?: boolean): Promise<SliceResult> => {
        const res = await fetch("/api/quick-order/slice", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            file: {
              id: fileId,
              layerHeight: fileSettings.layerHeight,
              infill: fileSettings.infill,
              supports: {
                enabled:
                  typeof supportsEnabledOverride === "boolean"
                    ? supportsEnabledOverride
                    : fileSettings.supportsEnabled,
              },
            },
          }),
        });

        const payload = await res.json().catch(() => ({ error: "Prepare failed" }));

        if (!res.ok || !payload) {
          const message = typeof payload?.error === "string" ? payload.error : "Prepare failed";
          throw new Error(message);
        }

        const { data } = payload as { data?: SliceResult };
        if (!data || typeof data.grams !== "number" || typeof data.timeSec !== "number") {
          throw new Error("Unexpected slicer response");
        }
        return data;
      };

      const applySuccess = (result: SliceResult, overrideMessage?: string) => {
        const fallback = overrideMessage ? true : Boolean(result?.fallback);
        const grams = Number(result?.grams) || 0;
        const timeSec = Number(result?.timeSec) || 0;
        const errorMessage = overrideMessage ?? (typeof result?.error === "string" ? result.error : undefined);

        setMetrics((prev) => ({
          ...prev,
          [upload.id]: { grams, timeSec, fallback, error: errorMessage },
        }));

        setFileStatuses((prev) => ({
          ...prev,
          [upload.id]: {
            state: fallback ? "fallback" : "success",
            message: errorMessage,
            fallback,
          },
        }));

        setAcceptedFallbacks((prev) => {
          if (!prev.size && !fallback) return prev;
          const next = new Set(prev);
          next.delete(upload.id);
          return next;
        });
      };

      const applyFailure = (message: string) => {
        setFileStatuses((prev) => ({
          ...prev,
          [upload.id]: { state: "error", message },
        }));
        setError("Preparing files failed. Expand the file for details and try again.");
      };

      try {
        const result = await runSliceRequest();
        applySuccess(result);
      } catch (err) {
        const primaryMessage = err instanceof Error ? err.message : "Prepare failed";
        if (fileSettings.supportsEnabled) {
          try {
            const fallbackResult = await runSliceRequest(false);
            applySuccess(fallbackResult, `Supports disabled after slicer failure: ${primaryMessage}`);
            setError("Supports failed for at least one file. Review the warnings before continuing.");
            continue;
          } catch (fallbackErr) {
            const fallbackMessage = fallbackErr instanceof Error ? fallbackErr.message : primaryMessage;
            applyFailure(fallbackMessage);
            continue;
          }
        }
        applyFailure(primaryMessage);
        continue;
      }
    }

    setPreparing(false);
  }

  async function computePrice() {
    setLoading(true);
    setPricing(true);
    setError(null);
    setShippingQuote(null);
    setPriceData(null);
    if (!allOrientationsLocked) {
      setLoading(false);
      setPricing(false);
      setError("Lock orientations for all files before pricing.");
      return;
    }
    const fallbackPending = uploads.some(
      (u) => metrics[u.id]?.fallback && !acceptedFallbacks.has(u.id),
    );
    if (fallbackPending) {
      setLoading(false);
      setPricing(false);
      setError("Accept fallback estimates or re-prepare the affected files before pricing.");
      return;
    }
    const items = uploads.map((u) => {
      const fileSettings = settings[u.id];
      return {
        fileId: u.id,
        filename: u.filename,
        materialId: fileSettings.materialId,
        materialName:
          materials.find((m) => m.id === fileSettings.materialId)?.name ?? undefined,
        layerHeight: fileSettings.layerHeight,
        infill: fileSettings.infill,
        quantity: fileSettings.quantity,
        orientation: orientationState[u.id],
        supports: {
          enabled: fileSettings.supportsEnabled,
          acceptedFallback: acceptedFallbacks.has(u.id),
        },
        metrics:
          metrics[u.id] ?? {
            grams: 80,
            timeSec: 3600,
            fallback: true,
          },
      };
    });
    try {
      const res = await fetch("/api/quick-order/price", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          items,
          location: {
            state: address.state,
            postcode: address.postcode,
          },
        }),
      });
      if (!res.ok) {
        setError("Pricing failed");
        return;
      }
      const { data } = await res.json();
      const quote: ShippingQuote | null = data.shipping ?? null;
      setShippingQuote(quote);
      if (typeof data.studentDiscountEligible === "boolean") {
        setStudentDiscountEligible(data.studentDiscountEligible);
      }
      if (typeof data.studentDiscountRate === "number") {
        setStudentDiscountRate(data.studentDiscountRate);
      }
      const shippingAmount = quote ? Number(quote.amount ?? 0) : 0;
      const originalSubtotalRaw = Number(data.originalSubtotal ?? data.subtotal ?? 0);
      const subtotalRaw = Number(data.subtotal ?? originalSubtotalRaw);
      const discountAmountRaw = Number(
        data.discountAmount ?? Math.max(0, originalSubtotalRaw - subtotalRaw),
      );
      const rawDiscountType = typeof data.discountType === "string" ? data.discountType : "NONE";
      const discountType: PriceDataState["discountType"] =
        rawDiscountType === "PERCENT" || rawDiscountType === "FIXED" ? rawDiscountType : "NONE";
      const discountValue = Number(data.discountValue ?? 0);
      const taxAmountRaw = Number(data.taxAmount ?? 0);
      const totalRaw = Number(
        data.total ?? subtotalRaw + shippingAmount + taxAmountRaw,
      );
      const taxRate = typeof data.taxRate === "number" ? data.taxRate : undefined;
      setPriceData({
        originalSubtotal: Math.round(originalSubtotalRaw * 100) / 100,
        subtotal: Math.round(subtotalRaw * 100) / 100,
        discountAmount: Math.round(discountAmountRaw * 100) / 100,
        discountType,
        discountValue,
        shipping: Math.round(shippingAmount * 100) / 100,
        taxAmount: Math.round(taxAmountRaw * 100) / 100,
        taxRate,
        total: Math.round(totalRaw * 100) / 100,
        items: Array.isArray(data.items) ? data.items : [],
      });
      goToStep("price");
    } catch (err) {
      logQuickPrintError("pricing", "Pricing failed", err);
      setError("Pricing failed");
    } finally {
      setLoading(false);
      setPricing(false);
    }
  }

  async function checkout(options?: { creditRequestedAmount?: number; paymentPreference?: string }) {
    setLoading(true);
    setError(null);
    const fallbackPending = uploads.some(
      (u) => metrics[u.id]?.fallback && !acceptedFallbacks.has(u.id),
    );
    if (fallbackPending) {
      setLoading(false);
      setError("Accept fallback estimates or re-prepare the affected files before checkout.");
      return;
    }
    if (!allOrientationsLocked) {
      setLoading(false);
      setError("Lock orientations for all files before checkout.");
      return;
    }
    const items = uploads.map((u) => {
      const fileSettings = settings[u.id];
      return {
        fileId: u.id,
        filename: u.filename,
        materialId: fileSettings.materialId,
        materialName:
          materials.find((m) => m.id === fileSettings.materialId)?.name ?? undefined,
        layerHeight: fileSettings.layerHeight,
        infill: fileSettings.infill,
        quantity: fileSettings.quantity,
        orientation: orientationState[u.id],
        supports: {
          enabled: fileSettings.supportsEnabled,
          acceptedFallback: acceptedFallbacks.has(u.id),
        },
        metrics:
          metrics[u.id] ?? {
            grams: 80,
            timeSec: 3600,
            fallback: true,
          },
      };
    });
    const res = await fetch("/api/quick-order/checkout", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        items,
        address,
        creditRequestedAmount: options?.creditRequestedAmount ?? 0,
        paymentPreference: options?.paymentPreference,
      }),
    });
    setLoading(false);
    if (!res.ok) {
      setError("Checkout failed");
      return;
    }
    const { data } = await res.json();

    clearDraft();

    if (data.checkoutUrl) {
      window.location.href = data.checkoutUrl;
    } else {
      const dest = role === "CLIENT" ? `/client/orders/${data.invoiceId}` : `/invoices/${data.invoiceId}`;
      router.replace(dest);
    }
  }

  function acceptFallback(id: string) {
    setAcceptedFallbacks((prev) => {
      const next = new Set(prev);
      next.add(id);
      return next;
    });
    setFileStatuses((prev) => {
      const entry = prev[id];
      if (!entry) return prev;
      return {
        ...prev,
        [id]: {
          ...entry,
          message: entry.message,
          fallback: true,
        },
      };
    });
  }

  function toggleFileExpanded(id: string) {
    if (currentStep !== "configure") {
      return;
    }
    if (expandedFiles.has(id)) {
      setExpandedFiles(new Set());
    } else {
      setExpandedFiles(new Set([id]));
    }
  }

  const maxCreditAvailable = useMemo(() => {
    if (!priceData) return 0;
    return Math.min(walletBalance, priceData.total);
  }, [walletBalance, priceData]);

  return {
    // State
    currentStep,
    role,
    studentDiscountEligible,
    studentDiscountRate,
    uploads,
    materials,
    settings,
    metrics,
    fileStatuses,
    viewerErrors,
    expandedFiles,
    shippingQuote,
    address,
    priceData,
    loading,
    pricing,
    preparing,
    error,
    walletBalance,
    uploadQueue,
    orientationState,
    orientationLocked,
    currentlyOrienting,
    isLocking,
    draftSaved,
    showResumeDialog,
    resetCandidate,
    acceptedFallbacks,
    dragActive: false, // Handled in UI? Or state? I'll let UI handle local drag state if needed, or add here if shared. Drag is usually local to dropzone.
    
    // Computed
    orientedCount,
    allOrientationsLocked,
    preparedCount,
    boundsViolationMessage,
    configurationComplete,
    priceStageComplete,
    uploadComplete,
    stepCompletion,
    maxCreditAvailable,
    
    // Methods
    isStepUnlocked,
    setCurrentStep,
    setSettings,
    setAddress,
    setCurrentlyOrienting,
    setResetCandidate,
    goToStep,
    processFiles,
    onUpload,
    handleViewerError,
    removeUpload,
    resetFileToBaseline,
    handleLockOrientation,
    prepareFiles,
    computePrice,
    checkout,
    acceptFallback,
    toggleFileExpanded,
    clearDraft,
    restoreDraft,
    loadDraft,
    setShowResumeDialog,
  };
}
