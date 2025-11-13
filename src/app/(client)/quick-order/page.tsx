"use client";

import { useEffect, useRef, useState, useCallback, useMemo } from "react";
import * as THREE from "three";
import { useRouter } from "nextjs-toploader/app";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Switch } from "@/components/ui/switch";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { Badge } from "@/components/ui/badge";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  UploadCloud,
  Settings2,
  Package,
  CreditCard,
  Check,
  ChevronDown,
  ChevronUp,
  ChevronLeft,
  ChevronRight,
  X,
  Loader2,
  FileText,
  Box,
  AlertTriangle,
  Info,
  Truck,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { formatCurrency } from "@/lib/currency";
import ModelViewerWrapper, { type ModelViewerRef } from "@/components/3d/ModelViewerWrapper";
import RotationControls from "@/components/3d/RotationControls";
import ViewNavigationControls from "@/components/3d/ViewNavigationControls";
import {
  useOrientationStore,
  type OrientationQuaternion,
  type OrientationPosition,
  clearOrientationPersistence,
} from "@/stores/orientation-store";
import { browserLogger } from "@/lib/logging/browser-logger";

type Upload = { id: string; filename: string; size: number };
type Material = { id: number; name: string; costPerGram: number };

type Step = "upload" | "orient" | "configure" | "price" | "checkout";

const STEP_META = [
  { id: "upload" as const, label: "Upload", icon: UploadCloud },
  { id: "orient" as const, label: "Orient", icon: Box },
  { id: "configure" as const, label: "Configure", icon: Settings2 },
  { id: "price" as const, label: "Price", icon: Package },
  { id: "checkout" as const, label: "Checkout", icon: CreditCard },
];

const STEP_SEQUENCE = STEP_META.map((step) => step.id) as readonly Step[];

type ShippingQuote = {
  code: string;
  label: string;
  baseAmount: number;
  amount: number;
  remoteSurcharge?: number;
  remoteApplied: boolean;
};

type FileSettings = {
  materialId: number;
  layerHeight: number;
  infill: number;
  quantity: number;
  supportsEnabled: boolean;
  supportPattern: "normal" | "tree";
  supportAngle: number;
  supportStyle: "grid" | "organic";
  supportInterfaceLayers: number;
};

type FileStatus = "idle" | "running" | "success" | "fallback" | "error";

type FileStatusState = {
  state: FileStatus;
  message?: string;
  fallback?: boolean;
};

type GizmoMode = "rotate" | "translate";

type PriceDataState = {
  originalSubtotal: number;
  subtotal: number;
  discountAmount: number;
  discountType: "NONE" | "PERCENT" | "FIXED";
  discountValue: number;
  shipping: number;
  taxAmount: number;
  taxRate?: number;
  total: number;
  items: Array<{
    filename: string;
    quantity: number;
    unitPrice: number;
    total: number;
    breakdown?: Record<string, number> | null;
  }>;
};

type OrientationSnapshot = {
  quaternion: OrientationQuaternion;
  position: OrientationPosition;
  autoOriented?: boolean;
  supportVolume?: number;
  supportWeight?: number;
  helpersVisible?: boolean;
  gizmoEnabled?: boolean;
  gizmoMode?: GizmoMode;
};

type SliceResult = { grams: number; timeSec: number; fallback?: boolean; error?: string };

function eulerFromQuaternion(tuple?: OrientationQuaternion) {
  if (!tuple) return null;
  const euler = new THREE.Euler().setFromQuaternion(new THREE.Quaternion(...tuple), "XYZ");
  const format = (value: number) => {
    const deg = THREE.MathUtils.radToDeg(value);
    const normalized = ((deg % 360) + 360) % 360;
    return normalized.toFixed(1);
  };
  return { x: format(euler.x), y: format(euler.y), z: format(euler.z) };
}

type DraftState = {
  timestamp: number;
  step: Step;
  uploads: Array<{ id: string; filename: string; size: number }>;
  settings: Record<string, FileSettings>;
  orientationState: Record<string, OrientationSnapshot>;
  orientationLocked: Record<string, boolean>;
  address: {
    name: string;
    line1: string;
    line2: string;
    city: string;
    state: string;
    postcode: string;
    phone: string;
  };
  metrics: Record<string, { grams: number; timeSec: number; fallback?: boolean; error?: string }>;
};

const logQuickPrintError = (scopeSuffix: string, message: string, error?: unknown) => {
  browserLogger.error({
    scope: `browser.quick-print.${scopeSuffix}`,
    message,
    error,
  });
};

export default function QuickOrderPage() {
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
  const [dragActive, setDragActive] = useState(false);
  const [walletBalance, setWalletBalance] = useState(0);
  const [paymentReviewOpen, setPaymentReviewOpen] = useState(false);
  const [creditManualEntry, setCreditManualEntry] = useState("0");
  const [applyCredit, setApplyCredit] = useState(true);
  const fileInputRef = useRef<HTMLInputElement | null>(null);
  const initializedRef = useRef(false);
  const addressDebounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const [orientationState, setOrientationState] = useState<Record<string, OrientationSnapshot>>({});
  const [orientationLocked, setOrientationLocked] = useState<Record<string, boolean>>({});
  const [currentlyOrienting, setCurrentlyOrienting] = useState<string | null>(null);
  const [facePickMode, setFacePickMode] = useState(false);
  const [isLocking, setIsLocking] = useState(false);
  const viewerRef = useRef<ModelViewerRef>(null);
  const [acceptedFallbacks, setAcceptedFallbacks] = useState<Set<string>>(new Set<string>());
  const viewHelpersVisible = useOrientationStore((state) => state.helpersVisible);
  const setViewHelpersVisible = useOrientationStore((state) => state.setHelpersVisible);
  const gizmoEnabled = useOrientationStore((state) => state.gizmoEnabled);
  const setGizmoEnabledState = useOrientationStore((state) => state.setGizmoEnabledState);
  const gizmoMode = useOrientationStore((state) => state.gizmoMode);
  const setGizmoModeStore = useOrientationStore((state) => state.setGizmoMode);
  const boundsStatus = useOrientationStore((state) => state.boundsStatus);
  const interactionDisabled = useOrientationStore((state) => state.interactionDisabled);
  const interactionMessage = useOrientationStore((state) => state.interactionMessage);
  const orientationHydratingRef = useRef(false);
  const handleViewerReset = useCallback(() => {
    setViewHelpersVisible(false);
    viewerRef.current?.resetView();
  }, [setViewHelpersVisible, viewerRef]);

  const handleToggleGizmo = useCallback(
    (enabled: boolean) => {
      setGizmoEnabledState(enabled);
      if (!enabled) {
        setGizmoModeStore("rotate");
      }
      viewerRef.current?.setGizmoEnabled(enabled);
      if (!enabled) {
        viewerRef.current?.setGizmoMode?.("rotate");
      }
    },
    [setGizmoEnabledState, setGizmoModeStore, viewerRef]
  );

  const handleGizmoModeChange = useCallback(
    (mode: GizmoMode) => {
      setGizmoModeStore(mode);
      viewerRef.current?.setGizmoMode?.(mode);
    },
    [setGizmoModeStore, viewerRef]
  );

  const maxCreditAvailable = useMemo(() => {
    if (!priceData) return 0;
    return Math.min(walletBalance, priceData.total);
  }, [walletBalance, priceData]);

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
  const currentOrientationMaterialCost = useMemo(() => {
    if (!currentlyOrienting) return 0.25;
    const materialId = settings[currentlyOrienting]?.materialId;
    const material = materials.find((m) => m.id === materialId);
    return Number(material?.costPerGram ?? 0.25);
  }, [currentlyOrienting, settings, materials]);

  // Draft auto-save state
  const [draftSaved, setDraftSaved] = useState(false);
  const [showResumeDialog, setShowResumeDialog] = useState(false);
  const draftLoadedRef = useRef(false);

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
    setViewHelpersVisible(false);
  }, [currentlyOrienting, setViewHelpersVisible]);

  useEffect(() => {
    setFacePickMode(false);
    handleToggleGizmo(false);
  }, [currentlyOrienting, handleToggleGizmo]);

  useEffect(() => {
    setSettings((prev) => {
      let changed = false;
      const next = { ...prev } as Record<string, FileSettings>;
      Object.entries(next).forEach(([key, config]) => {
        const style = config.supportStyle ?? (config.supportPattern === "tree" ? "organic" : "grid");
        const interfaceLayers = config.supportInterfaceLayers ?? 3;
        if (style !== config.supportStyle || interfaceLayers !== config.supportInterfaceLayers) {
          next[key] = {
            ...config,
            supportStyle: style,
            supportInterfaceLayers: interfaceLayers,
          };
          changed = true;
        }
      });
      return changed ? next : prev;
    });
  }, []);

  useEffect(() => {
    if (currentStep !== "orient") {
      setFacePickMode(false);
    }
  }, [currentStep]);

  useEffect(() => {
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
          supportVolume: snapshot.supportVolume ?? 0,
          supportWeight: snapshot.supportWeight ?? snapshot.supportVolume ?? 0,
          overhangFaces: [],
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
    // eslint-disable-next-line react-hooks/exhaustive-deps
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

  useEffect(() => {
    if (!paymentReviewOpen) return;
    setApplyCredit(maxCreditAvailable > 0);
    setCreditManualEntry(maxCreditAvailable.toFixed(2));
  }, [paymentReviewOpen, maxCreditAvailable]);

  // Draft localStorage management
  const DRAFT_KEY = "quick-order-draft";

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
        // Restore uploaded file metadata (IDs map to server-side tmp files)
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
      // If returning to the Orient step, select a file to preview
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

  // Check for existing draft on mount
  useEffect(() => {
    const draft = loadDraft();
    if (draft && !draftLoadedRef.current) {
      setShowResumeDialog(true);
    }
  }, [loadDraft]);

  // Auto-save on changes
  useEffect(() => {
    if (!draftLoadedRef.current && uploads.length === 0) return; // Don't save empty state on initial load
    if (uploads.length === 0 && Object.keys(settings).length === 0) return; // Don't save completely empty

    const timeoutId = setTimeout(() => {
      saveDraft();
    }, 1000); // Debounce saves by 1 second

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

  async function processFiles(fileList: FileList | File[]) {
    const files = Array.from(fileList);
    if (files.length === 0) return;
    const fd = new FormData();
    files.forEach((file) => fd.append("files", file));
    setLoading(true);
    setError(null);
    const res = await fetch("/api/quick-order/upload", { method: "POST", body: fd });
    setLoading(false);
    if (!res.ok) {
      setError("Upload failed");
      return;
    }
    const { data } = await res.json();
    const uploaded = data as Upload[];
    setUploads((prev) => [...prev, ...uploaded]);
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
          supportPattern: "normal",
          supportAngle: 45,
          supportStyle: "grid",
          supportInterfaceLayers: 3,
        };
      });
      return next;
    });
    setFileStatuses((prev) => {
      const next = { ...prev } as Record<string, FileStatusState>;
      uploaded.forEach((it) => {
        next[it.id] = { state: "idle" };
      });
      return next;
    });
    if (uploads.length === 0) {
      goToStep("orient");
      // Automatically select the first uploaded file for orientation
      if (uploaded.length > 0) {
        setCurrentlyOrienting(uploaded[0].id);
      }
    }
  }

  async function onUpload(e: React.ChangeEvent<HTMLInputElement>) {
    if (e.target.files) {
      await processFiles(e.target.files);
      e.target.value = "";
    }
  }

  function handleDragOver(event: React.DragEvent<HTMLDivElement>) {
    event.preventDefault();
    event.stopPropagation();
    setDragActive(true);
  }

  function handleDragLeave(event: React.DragEvent<HTMLDivElement>) {
    event.preventDefault();
    event.stopPropagation();
    setDragActive(false);
  }

  async function handleDrop(event: React.DragEvent<HTMLDivElement>) {
    event.preventDefault();
    event.stopPropagation();
    setDragActive(false);
    if (event.dataTransfer?.files?.length) {
      await processFiles(event.dataTransfer.files);
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

    try {
      setIsLocking(true);
      setError(null);
      setFacePickMode(false);

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
                pattern: fileSettings.supportPattern,
                angle: fileSettings.supportAngle,
                style: fileSettings.supportStyle,
                interfaceLayers: fileSettings.supportInterfaceLayers,
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
          pattern: fileSettings.supportPattern,
          angle: fileSettings.supportAngle,
          style: fileSettings.supportStyle,
          interfaceLayers: fileSettings.supportInterfaceLayers,
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
          pattern: fileSettings.supportPattern,
          angle: fileSettings.supportAngle,
          style: fileSettings.supportStyle,
          interfaceLayers: fileSettings.supportInterfaceLayers,
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

    // Clear draft on successful checkout
    clearDraft();

    if (data.checkoutUrl) {
      window.location.href = data.checkoutUrl;
    } else {
      const dest = role === "CLIENT" ? `/client/orders/${data.invoiceId}` : `/invoices/${data.invoiceId}`;
      router.replace(dest);
    }
  }

  const parsedCreditInput = Number.parseFloat(creditManualEntry);
  const normalizedCredit = Number.isFinite(parsedCreditInput) ? parsedCreditInput : 0;
  const effectiveCreditAmount = applyCredit
    ? Math.min(maxCreditAvailable, Math.max(0, normalizedCredit))
    : 0;
  const remainingBalance = Math.max((priceData?.total ?? 0) - effectiveCreditAmount, 0);

  async function handlePaymentReviewConfirm() {
    if (!priceData) return;
    const preference = effectiveCreditAmount >= priceData.total
      ? "CREDIT_ONLY"
      : effectiveCreditAmount > 0
        ? "SPLIT"
        : "CARD_ONLY";
    setPaymentReviewOpen(false);
    await checkout({ creditRequestedAmount: effectiveCreditAmount, paymentPreference: preference });
  }

  function toggleFileExpanded(id: string) {
    if (currentStep !== "configure") {
      return;
    }
    // Accordion behavior: only one file open at a time
    if (expandedFiles.has(id)) {
      // Close if already open
      setExpandedFiles(new Set());
    } else {
      // Open this file and close all others
      setExpandedFiles(new Set([id]));
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

  const canPrepare = uploads.length > 0 && allOrientationsLocked;
  const hasPreparedAll = uploads.every((u) => metrics[u.id]);
  const hasFallbacks = uploads.some((u) => metrics[u.id]?.fallback);
  const fallbackNeedsAttention = uploads.some(
    (u) => metrics[u.id]?.fallback && !acceptedFallbacks.has(u.id),
  );
  const hasStudentDiscount = Boolean(
    priceData && priceData.discountType === "PERCENT" && priceData.discountValue > 0,
  );
  const displayDiscountRate = hasStudentDiscount
    ? priceData?.discountValue ?? studentDiscountRate
    : studentDiscountRate;
  const formattedDisplayDiscountRate =
    typeof displayDiscountRate === "number"
      ? displayDiscountRate % 1 === 0
        ? displayDiscountRate.toFixed(0)
        : displayDiscountRate.toFixed(2)
      : "0";
  const taxLabelSuffix =
    typeof priceData?.taxRate === "number"
      ? ` (${priceData.taxRate % 1 === 0 ? priceData.taxRate.toFixed(0) : priceData.taxRate.toFixed(2)}%)`
      : "";

  const currentStepIndexRaw = STEP_META.findIndex((s) => s.id === currentStep);
  const currentStepIndex = currentStepIndexRaw === -1 ? 0 : currentStepIndexRaw;
  const previousStepId = currentStepIndex > 0 ? STEP_SEQUENCE[currentStepIndex - 1] : null;
  const nextStepId = currentStepIndex < STEP_SEQUENCE.length - 1 ? STEP_SEQUENCE[currentStepIndex + 1] : null;
  const hasUploads = uploads.length > 0;
  const isUploadStep = currentStep === "upload";
  const isConfigureStep = currentStep === "configure";
  const currentFileMeta = useMemo(
    () => (currentlyOrienting ? uploads.find((u) => u.id === currentlyOrienting) ?? null : null),
    [currentlyOrienting, uploads]
  );
  const viewerErrorActive = currentlyOrienting ? Boolean(viewerErrors[currentlyOrienting]) : false;

  return (
    <div className="space-y-4 pb-24 sm:space-y-6">
      {/* Resume Draft Dialog */}
      <Dialog open={showResumeDialog} onOpenChange={setShowResumeDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Resume Previous Project?</DialogTitle>
            <DialogDescription>
              You have an unsaved draft from a previous session. Would you like to continue where you left off?
            </DialogDescription>
          </DialogHeader>
          <DialogFooter className="gap-3">
            <Button
              variant="outline"
              onClick={() => {
                clearDraft();
                setShowResumeDialog(false);
              }}
            >
              Start Fresh
            </Button>
            <Button
              onClick={() => {
                const draft = loadDraft();
                if (draft) {
                  restoreDraft(draft);
                }
              }}
            >
              Resume Draft
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Draft Saved Indicator */}
      {draftSaved && (
        <div className="fixed right-4 top-20 z-50 animate-in fade-in slide-in-from-top-2 duration-300">
          <div className="rounded-lg border border-green-200 bg-green-50 px-4 py-2 text-sm font-medium text-green-800 shadow-lg dark:border-green-800 dark:bg-green-950 dark:text-green-200">
            Draft saved
          </div>
        </div>
      )}

      {/* Workflow Steps - Sticky compact progress */}
      <div className="sticky top-[calc(env(safe-area-inset-top)+0.5rem)] z-30 overflow-x-auto rounded-xl border border-border/70 bg-surface-overlay/95 p-3 shadow-sm shadow-black/10 backdrop-blur supports-[backdrop-filter]:bg-surface-overlay/80 sm:p-4">
        <div className="mb-2 flex items-center justify-between gap-2 text-[11px] font-medium text-muted-foreground sm:text-xs">
          <span>
            Step {currentStepIndex + 1} of {STEP_META.length}: {STEP_META[currentStepIndex]?.label ?? ""}
          </span>
          <div className="flex items-center gap-1.5">
            <Button
              variant="ghost"
              size="sm"
              onClick={() => previousStepId && goToStep(previousStepId)}
              disabled={!previousStepId}
              className="h-8 px-2 text-[11px] sm:h-8 sm:text-xs"
            >
              <ChevronLeft className="h-3.5 w-3.5 sm:h-4 sm:w-4" />
              <span className="hidden sm:inline">Previous</span>
            </Button>
            <Button
              variant="ghost"
              size="sm"
              onClick={() => nextStepId && goToStep(nextStepId)}
              disabled={!nextStepId || !isStepUnlocked(nextStepId)}
              className="h-8 px-2 text-[11px] sm:h-8 sm:text-xs"
            >
              <span className="hidden sm:inline">Next</span>
              <ChevronRight className="h-3.5 w-3.5 sm:h-4 sm:w-4" />
            </Button>
          </div>
        </div>
        <div className="flex min-w-max items-center justify-between gap-1 sm:gap-2">
          {STEP_META.map((step, index) => {
            const Icon = step.icon;
            const isActive = step.id === currentStep;
            const isComplete = stepCompletion[step.id as keyof typeof stepCompletion];
            const canNavigate = isStepUnlocked(step.id) || Boolean(isComplete);
            const statusLabel = isComplete
              ? "Done"
              : isActive
              ? "In Progress"
              : canNavigate
              ? "Pending"
              : "Locked";

            return (
              <div key={step.id} className="flex flex-1 items-center">
                <button
                  type="button"
                  onClick={() => (canNavigate ? goToStep(step.id) : null)}
                  disabled={!canNavigate}
                  aria-current={isActive ? "step" : undefined}
                  className={cn(
                    "flex flex-1 flex-col items-center gap-1 rounded-lg p-1 text-left transition focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary sm:flex-row sm:gap-2",
                    canNavigate ? "cursor-pointer" : "cursor-not-allowed",
                  )}
                >
                  <span
                    className={cn(
                      "flex h-9 w-9 items-center justify-center rounded-full border-2 text-sm font-medium transition-colors sm:h-10 sm:w-10",
                      isComplete
                        ? "border-success bg-success text-white"
                        : isActive
                        ? "border-primary bg-primary text-primary-foreground"
                        : canNavigate
                        ? "border-border bg-card text-muted-foreground"
                        : "border-border/60 bg-muted text-muted-foreground",
                    )}
                  >
                    {isComplete ? <Check className="h-4 w-4 sm:h-5 sm:w-5" /> : <Icon className="h-4 w-4 sm:h-5 sm:w-5" />}
                  </span>
                  <span
                    className={cn(
                      "text-[10px] font-medium sm:text-sm",
                      isActive ? "text-foreground" : "text-muted-foreground",
                    )}
                  >
                    {step.label}
                    <span className="ml-1 hidden text-[10px] font-normal uppercase tracking-wide text-muted-foreground sm:inline">
                      {statusLabel}
                    </span>
                  </span>
                </button>
                {index < STEP_META.length - 1 && (
                  <div
                    className={cn(
                      "mx-1 h-0.5 flex-1 bg-border/60 sm:mx-2",
                      isComplete && "bg-primary"
                    )}
                  />
                )}
              </div>
            );
          })}
        </div>
      </div>

      {error && (
        <div className="rounded-lg border border-red-300 bg-red-50 p-3 text-sm text-red-800">
          {error}
        </div>
      )}

      {hasFallbacks && (
        <div className="rounded-lg border border-amber-300 bg-yellow-50 p-3 text-xs text-amber-800">
          {fallbackNeedsAttention
            ? "One or more files are using estimated metrics. Accept the estimate or adjust settings and prepare again before pricing."
            : "You’re using estimated metrics for at least one file. You can proceed, but re-run Prepare later for exact figures."}
        </div>
      )}

      {studentDiscountEligible && (
        <div className="rounded-lg border border-emerald-300 bg-emerald-50 p-3 text-sm text-emerald-800">
          <div className="flex items-start gap-2">
            <Info className="mt-0.5 h-4 w-4 flex-shrink-0" />
            <div>
              <p className="font-semibold">Student pricing applied</p>
              <p className="text-xs sm:text-sm">
                A {formattedDisplayDiscountRate}% discount is automatically applied to your subtotal whenever you checkout with
                your student account.
              </p>
            </div>
          </div>
        </div>
      )}

      {/* Two-Column Layout - Mobile optimized: Full width on mobile, 3-column grid on lg+ */}
      <div className="grid grid-cols-1 gap-4 sm:gap-6 lg:grid-cols-3">
        {/* Left Column - Upload & Files */}
        <div className="space-y-4 sm:space-y-6 lg:col-span-2">
          {(isUploadStep || isConfigureStep) && (
            <>
          {/* Upload & File List - Mobile optimized: Stack on mobile */}
          <section className="rounded-2xl border border-border bg-surface-overlay/90 p-4 shadow-sm backdrop-blur supports-[backdrop-filter]:bg-surface-overlay/80 sm:p-6">
            <div className="mb-4 flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
              <div className="flex items-center gap-2">
                <h2 className="text-base font-semibold sm:text-lg">
                  {isUploadStep ? "Upload Files" : "Configure Files"}
                </h2>
                <span className="text-xs text-muted-foreground">
                  {isUploadStep ? "Upload STL or 3MF" : "Adjust per-file settings"}
                </span>
              </div>
              {hasUploads ? (
                <span className="text-xs font-medium uppercase tracking-[0.2em] text-muted-foreground">{uploads.length} file{uploads.length === 1 ? "" : "s"}</span>
              ) : null}
            </div>
            <div className="grid gap-4 sm:gap-6 lg:grid-cols-[minmax(0,1fr)_minmax(0,1fr)]">
              <div
                className={cn(
                  "relative flex min-h-[260px] flex-col items-center justify-center rounded-2xl border-2 border-dashed border-border/70 bg-surface-muted text-center transition",
                  dragActive && "border-primary bg-primary/5",
                  loading && "pointer-events-none opacity-60"
                )}
                onDragOver={handleDragOver}
                onDragLeave={handleDragLeave}
                onDrop={handleDrop}
                onClick={() => fileInputRef.current?.click()}
                role="button"
                tabIndex={0}
                onKeyDown={(event) => {
                  if (event.key === "Enter" || event.key === " ") {
                    event.preventDefault();
                    fileInputRef.current?.click();
                  }
                }}
              >
                {loading ? (
                  <>
                    <Loader2 className="h-14 w-14 animate-spin text-primary" />
                    <p className="mt-3 text-sm font-medium text-foreground">Uploading files...</p>
                    <p className="text-xs text-muted-foreground">Please wait</p>
                  </>
                ) : (
                  <>
                    <UploadCloud className="h-14 w-14 text-primary" />
                    <p className="mt-3 text-sm font-medium text-foreground">Drop files here</p>
                    <p className="text-xs text-muted-foreground">or click to browse your computer</p>
                  </>
                )}
                <input
                  ref={fileInputRef}
                  id="file-upload"
                  type="file"
                  multiple
                  accept=".stl,.3mf"
                  onChange={onUpload}
                  className="hidden"
                  disabled={loading}
                />
              </div>
              <div className="flex flex-col overflow-hidden rounded-2xl border border-border/70 bg-background/70 p-4">
                <div className="mb-3 flex flex-shrink-0 items-center justify-between">
                  <h3 className="text-sm font-semibold text-foreground">Uploaded files</h3>
                  {isConfigureStep && (
                    <Button
                      type="button"
                      variant="outline"
                      size="sm"
                      disabled={!canPrepare || preparing || !hasUploads}
                      onClick={prepareFiles}
                    >
                      {preparing ? "Preparing..." : hasPreparedAll ? "Re-prepare" : "Prepare files"}
                    </Button>
                  )}
                </div>
                {hasUploads ? (
                  <ul className="flex-1 space-y-2 overflow-y-auto overflow-x-hidden pr-2 [scrollbar-width:thin]">
                    {uploads.map((file) => {
                      const isExpanded = expandedFiles.has(file.id);
                      const fileMetrics = metrics[file.id];
                      return (
                        <li key={file.id}>
                          <div
                            className={cn(
                              "group flex w-full items-center gap-3 overflow-hidden rounded-xl border border-border/70 bg-surface-overlay/60 p-3 transition hover:border-primary/40",
                              isExpanded && "border-primary/70 bg-primary/5"
                            )}
                          >
                            <button
                              type="button"
                              className={cn(
                                "flex flex-1 items-center gap-3 text-left",
                                !isConfigureStep && "cursor-default opacity-80",
                              )}
                              onClick={() => toggleFileExpanded(file.id)}
                              disabled={!isConfigureStep}
                            >
                              <div className="flex h-9 w-9 flex-shrink-0 items-center justify-center rounded-lg bg-primary/10 text-primary">
                                <FileText className="h-4 w-4" />
                              </div>
                              <div className="min-w-0 flex-1">
                                <p className="truncate text-sm font-medium text-foreground" title={file.filename}>{file.filename}</p>
                                {fileMetrics ? (
                                  <p className="text-xs text-muted-foreground">
                                    ~{Math.round(fileMetrics.grams)}g · ~{Math.ceil((fileMetrics.timeSec || 0) / 60)} min
                                    {fileMetrics.fallback ? " (est.)" : ""}
                                  </p>
                                ) : (
                                  <p className="text-xs text-muted-foreground">Settings pending</p>
                                )}
                              </div>
                            </button>
                            <button
                              type="button"
                              onClick={(event) => {
                                event.stopPropagation();
                                removeUpload(file.id);
                              }}
                              aria-label={`Remove ${file.filename}`}
                              className="flex h-8 w-8 items-center justify-center rounded-full border border-destructive/20 text-destructive transition hover:bg-destructive/10"
                            >
                              <X className="h-4 w-4" />
                            </button>
                          </div>
                        </li>
                      );
                    })}
                  </ul>
                ) : (
                  <div className="flex flex-1 flex-col items-center justify-center rounded-xl border border-dashed border-border/60 bg-background/60 p-4 text-center text-sm text-muted-foreground">
                    <p>No files yet. Drag and drop or click the square to upload.</p>
                  </div>
                )}
              </div>
            </div>
          </section>

          {/* Files Configuration - Mobile optimized: Reduced padding on mobile */}
          {isConfigureStep && uploads.length > 0 && (
            <section className="rounded-2xl border border-border bg-surface-overlay/90 p-4 shadow-sm backdrop-blur supports-[backdrop-filter]:bg-surface-overlay/80 sm:p-6">
              <div className="mb-4 flex items-center gap-2">
                <Settings2 className="h-5 w-5 text-muted-foreground" />
                <h2 className="text-base font-semibold sm:text-lg">File Settings</h2>
              </div>
              <div className="max-h-[500px] space-y-3 overflow-y-auto pr-1 sm:pr-2">
                {uploads.map((u) => {
                  const isExpanded = expandedFiles.has(u.id);
                  const hasMetrics = !!metrics[u.id];
                  const status = fileStatuses[u.id]?.state ?? "idle";
                  const statusMessage = fileStatuses[u.id]?.message;
                  const fallbackActive = metrics[u.id]?.fallback ?? false;
                  const fallbackAccepted = acceptedFallbacks.has(u.id);
                  const orientationSnapshot = orientationState[u.id];
                  const angles = eulerFromQuaternion(orientationSnapshot?.quaternion);
                  const supportEstimate = orientationSnapshot?.supportWeight ?? orientationSnapshot?.supportVolume;
                  const lockedOrientation = orientationLocked[u.id];
                  const statusBadge = (() => {
                    switch (status) {
                      case "running":
                        return { text: "Preparing...", className: "bg-info-subtle text-info-foreground" };
                      case "success":
                        return { text: "Ready", className: "bg-success-subtle text-success-foreground" };
                      case "fallback":
                        return fallbackAccepted
                          ? { text: "Estimate accepted", className: "bg-warning-subtle text-warning-foreground" }
                          : { text: "Needs review", className: "bg-danger-subtle text-danger-foreground" };
                      case "error":
                        return { text: "Error", className: "bg-danger-subtle text-danger-foreground" };
                      default:
                        return null;
                    }
                  })();

                  return (
                    <div key={u.id} className="rounded-lg border border-border bg-background">
                      {/* File Header - Always Visible */}
                      <div
                        className="flex cursor-pointer items-center justify-between gap-3 p-3 hover:bg-surface-muted"
                        onClick={() => toggleFileExpanded(u.id)}
                      >
                        <div className="flex min-w-0 flex-1 flex-col gap-1">
                          <div className="flex items-start justify-between gap-2">
                            <span className="truncate font-medium">{u.filename}</span>
                            <button
                              type="button"
                              onClick={(event) => {
                                event.stopPropagation();
                                removeUpload(u.id);
                              }}
                              aria-label={`Remove ${u.filename}`}
                              className="flex h-7 w-7 flex-shrink-0 items-center justify-center rounded-full border border-destructive/30 text-destructive transition-colors hover:bg-destructive/10"
                            >
                              <X className="h-3.5 w-3.5" />
                            </button>
                          </div>
                          {hasMetrics ? (
                            <div className="flex flex-wrap items-center gap-2 text-xs text-muted-foreground">
                              <span>
                                ~{Math.round(metrics[u.id].grams)}g · ~
                                {Math.ceil((metrics[u.id].timeSec || 0) / 60)} min
                                {fallbackActive ? " (est.)" : ""}
                              </span>
                              {statusBadge ? (
                                <span
                                  className={cn(
                                    "inline-flex items-center rounded-full px-2 py-0.5 font-medium",
                                    statusBadge.className,
                                  )}
                                >
                                  {statusBadge.text}
                                </span>
                              ) : null}
                            </div>
                          ) : statusBadge ? (
                            <div className="text-xs text-muted-foreground">
                              <span
                                className={cn(
                                  "inline-flex items-center rounded-full px-2 py-0.5 font-medium",
                                  statusBadge.className,
                                )}
                              >
                                {statusBadge.text}
                              </span>
                            </div>
                          ) : null}
                          <div className="mt-1 flex flex-wrap items-center gap-2 text-[11px] text-muted-foreground">
                            <Badge variant={lockedOrientation ? "default" : "outline"} className="px-2 py-0.5">
                              {lockedOrientation ? "Locked" : "Needs lock"}
                            </Badge>
                            {angles ? (
                              <span>
                                Orientation · X {angles.x}° · Y {angles.y}° · Z {angles.z}°
                              </span>
                            ) : (
                              <span>Orient this file before pricing</span>
                            )}
                            {typeof supportEstimate === "number" ? (
                              <span>Supports ~{supportEstimate.toFixed(1)}g</span>
                            ) : null}
                          </div>
                        </div>
                        {isConfigureStep ? (
                          isExpanded ? (
                            <ChevronUp className="h-4 w-4 text-muted-foreground" />
                          ) : (
                            <ChevronDown className="h-4 w-4 text-muted-foreground" />
                          )
                        ) : null}
                      </div>

                      {/* File Settings - Collapsible - Mobile optimized: Full width fields on mobile */}
                      {isConfigureStep && isExpanded && (
                        <div className="border-t border-border p-3">
                          <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
                            <div>
                              <Label className="text-xs">Material</Label>
                              <Select
                                value={String(settings[u.id]?.materialId ?? "")}
                                onValueChange={(v) =>
                                  setSettings((s) => ({
                                    ...s,
                                    [u.id]: { ...s[u.id], materialId: Number(v) },
                                  }))
                                }
                                disabled={!Array.isArray(materials) || materials.length === 0}
                              >
                                <SelectTrigger className="h-9">
                                  <SelectValue />
                                </SelectTrigger>
                                <SelectContent>
                                  {(Array.isArray(materials) ? materials : []).map((m) => (
                                    <SelectItem key={m.id} value={String(m.id)}>
                                      {m.name}
                                    </SelectItem>
                                  ))}
                                </SelectContent>
                              </Select>
                            </div>
                            <div>
                              <Label className="text-xs">Layer Height</Label>
                              <Select
                                value={String(settings[u.id]?.layerHeight ?? 0.2)}
                                onValueChange={(v) =>
                                  setSettings((s) => ({
                                    ...s,
                                    [u.id]: { ...s[u.id], layerHeight: Number(v) },
                                  }))
                                }
                              >
                                <SelectTrigger className="h-9">
                                  <SelectValue />
                                </SelectTrigger>
                                <SelectContent>
                                  <SelectItem value="0.12">0.12mm - Fine</SelectItem>
                                  <SelectItem value="0.16">0.16mm - High</SelectItem>
                                  <SelectItem value="0.20">0.20mm - Standard</SelectItem>
                                  <SelectItem value="0.28">0.28mm - Draft</SelectItem>
                                </SelectContent>
                              </Select>
                            </div>
                            <div>
                              <Label className="text-xs">Infill %</Label>
                              <Input
                                type="number"
                                min={0}
                                max={100}
                                value={settings[u.id]?.infill ?? 20}
                                onChange={(e) =>
                                  setSettings((s) => ({
                                    ...s,
                                    [u.id]: { ...s[u.id], infill: Number(e.target.value) },
                                  }))
                                }
                                className="h-9"
                              />
                            </div>
                            <div>
                              <Label className="text-xs">Quantity</Label>
                              <Input
                                type="number"
                                min={1}
                                value={settings[u.id]?.quantity ?? 1}
                                onChange={(e) =>
                                  setSettings((s) => ({
                                    ...s,
                                    [u.id]: { ...s[u.id], quantity: Number(e.target.value) },
                                  }))
                                }
                                className="h-9"
                              />
                            </div>
                            <div className="col-span-2 rounded-md border border-border/70 bg-surface-muted px-3 py-2">
                              <div className="flex items-center justify-between gap-3">
                                <div>
                                  <p className="text-xs font-medium text-foreground">Supports</p>
                                  <p className="text-[11px] text-muted-foreground">
                                    Auto-generate support material when overhangs exceed the angle threshold.
                                  </p>
                                </div>
                                <Switch
                                  checked={settings[u.id]?.supportsEnabled ?? true}
                                  onCheckedChange={(checked) => {
                                    setSettings((s) => ({
                                      ...s,
                                      [u.id]: {
                                        ...s[u.id],
                                        supportsEnabled: checked,
                                      },
                                    }));
                                    if (currentlyOrienting === u.id) {
                                      useOrientationStore.getState().setSupportsEnabled(checked);
                                    }
                                  }}
                                />
                              </div>
                            </div>
                            <div>
                              <Label className="text-xs">Support pattern</Label>
                              <Select
                                value={settings[u.id]?.supportPattern ?? "normal"}
                                onValueChange={(value) =>
                                  setSettings((s) => ({
                                    ...s,
                                    [u.id]: {
                                      ...s[u.id],
                                      supportPattern: value as "normal" | "tree",
                                    },
                                  }))
                                }
                                disabled={!settings[u.id]?.supportsEnabled}
                              >
                                <SelectTrigger className="h-9">
                                  <SelectValue />
                                </SelectTrigger>
                                <SelectContent>
                                  <SelectItem value="normal">Standard</SelectItem>
                                  <SelectItem value="tree">Organic (Tree)</SelectItem>
                                </SelectContent>
                              </Select>
                            </div>
                            <div>
                              <Label className="text-xs">Support style</Label>
                              <Select
                                value={settings[u.id]?.supportStyle ?? "grid"}
                                onValueChange={(value) =>
                                  setSettings((s) => ({
                                    ...s,
                                    [u.id]: {
                                      ...s[u.id],
                                      supportStyle: value as "grid" | "organic",
                                    },
                                  }))
                                }
                                disabled={!settings[u.id]?.supportsEnabled}
                              >
                                <SelectTrigger className="h-9">
                                  <SelectValue />
                                </SelectTrigger>
                                <SelectContent>
                                  <SelectItem value="grid">Grid / Linear</SelectItem>
                                  <SelectItem value="organic">Organic</SelectItem>
                                </SelectContent>
                              </Select>
                            </div>
                            <div>
                              <Label className="text-xs">Support threshold (°)</Label>
                              <Input
                                type="number"
                                min={1}
                                max={89}
                                step="1"
                                value={settings[u.id]?.supportAngle ?? 45}
                                onChange={(e) =>
                                  setSettings((s) => ({
                                    ...s,
                                    [u.id]: {
                                      ...s[u.id],
                                      supportAngle: Number(e.target.value) || 45,
                                    },
                                  }))
                                }
                                disabled={!settings[u.id]?.supportsEnabled}
                                className="h-9"
                              />
                            </div>
                            <div>
                              <Label className="text-xs">Interface layers</Label>
                              <Input
                                type="number"
                                min={1}
                                max={6}
                                step="1"
                                value={settings[u.id]?.supportInterfaceLayers ?? 3}
                                onChange={(e) =>
                                  setSettings((s) => ({
                                    ...s,
                                    [u.id]: {
                                      ...s[u.id],
                                      supportInterfaceLayers: Number(e.target.value) || 3,
                                    },
                                  }))
                                }
                                disabled={!settings[u.id]?.supportsEnabled}
                                className="h-9"
                              />
                            </div>
                          </div>

                          {(status === "error" || statusMessage) && (
                            <div className="mt-3 rounded-md border border-red-200 bg-red-50 p-3 text-xs text-red-700">
                              <p className="font-medium">Unable to prepare this file</p>
                              <p className="mt-1">{statusMessage ?? "The slicer reported an error."}</p>
                              <p className="mt-2 text-[11px]">
                                Review the orientation or adjust the settings and try preparing again.
                              </p>
                            </div>
                          )}

                          {fallbackActive && (
                            <div className="mt-3 rounded-md border border-amber-300 bg-amber-50 p-3 text-xs text-amber-800">
                              <div className="flex items-start gap-2">
                                <AlertTriangle className="mt-0.5 h-4 w-4 flex-shrink-0" />
                                <div className="space-y-2">
                                  <div>
                                    <p className="font-medium">We’re using estimated metrics</p>
                                    <p className="mt-1 text-[11px] text-amber-700">
                                      {statusMessage ||
                                        "The slicer couldn't return precise numbers. Accept this estimate now or re-run Prepare after adjusting settings."}
                                    </p>
                                  </div>
                                  {!fallbackAccepted ? (
                                    <Button
                                      size="sm"
                                      variant="outline"
                                      onClick={(event) => {
                                        event.stopPropagation();
                                        acceptFallback(u.id);
                                      }}
                                    >
                                      Accept estimate for pricing
                                    </Button>
                                  ) : (
                                    <p className="text-[11px] font-medium text-amber-700">
                                      Estimate accepted. You can re-prepare later for exact numbers.
                                    </p>
                                  )}
                                </div>
                              </div>
                            </div>
                          )}
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
              {/* Mobile optimized: Full-width button on mobile */}
              {isConfigureStep && (
                <div className="mt-4 flex justify-end">
                  <Button
                    onClick={computePrice}
                    disabled={uploads.length === 0 || loading || pricing || !allOrientationsLocked}
                    className={cn(
                      "flex w-full items-center justify-center gap-2 sm:w-auto",
                      pricing && "animate-pulse"
                    )}
                  >
                    {pricing ? (
                      <>
                        <Loader2 className="h-4 w-4 animate-spin" />
                        Calculating...
                      </>
                    ) : (
                      "Calculate Price"
                    )}
                  </Button>
                </div>
              )}
            </section>
          )}
            </>
          )}

          {/* Orientation Step - Mobile optimized */}
          {currentStep === "orient" && uploads.length > 0 && (
            <section className="rounded-2xl border border-border bg-surface-overlay/90 p-4 shadow-sm backdrop-blur supports-[backdrop-filter]:bg-surface-overlay/80 sm:p-6">
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
                <div className="flex items-center gap-2">
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => goToStep("configure")}
                    disabled={isLocking || !allOrientationsLocked}
                    title={allOrientationsLocked ? undefined : "Lock each file before moving on"}
                    className="whitespace-nowrap"
                  >
                    Continue
                  </Button>
                </div>
              </div>

              {/* File Selection - Mobile optimized: Horizontal scroll on mobile */}
              <div className="mb-4 -mx-4 overflow-x-auto px-4 sm:mx-0 sm:px-0">
                <div className="flex min-w-max gap-2 sm:flex-wrap">
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
                <div className="space-y-4">
                  {/* 3D Viewer with always-visible controls */}
                  <div className="relative">
                    <ModelViewerWrapper
                      ref={viewerRef}
                      url={`/api/tmp-file/${currentlyOrienting}`}
                      filename={currentFileMeta?.filename}
                      fileSizeBytes={currentFileMeta?.size}
                      onError={(err) => handleViewerError(currentlyOrienting, err)}
                      facePickMode={facePickMode}
                      onFacePickComplete={() => setFacePickMode(false)}
                      overhangThreshold={settings[currentlyOrienting]?.supportAngle ?? 45}
                    />
                  </div>
                  {viewerErrorActive && currentlyOrienting ? (
                    <div className="rounded-lg border border-destructive/40 bg-destructive/10 p-3 text-sm text-destructive">
                      <div className="flex items-center gap-2 font-semibold">
                        <AlertTriangle className="h-4 w-4" />
                        <span>{viewerErrors[currentlyOrienting]}</span>
                      </div>
                      <p className="mt-2 text-xs text-destructive/80">
                        Remove the file or upload a clean copy to continue. Orientation controls stay disabled until a valid model loads.
                      </p>
                      <div className="mt-3 flex flex-wrap gap-2">
                        <Button
                          type="button"
                          variant="outline"
                          size="sm"
                          onClick={() => fileInputRef.current?.click()}
                        >
                          Re-upload file
                        </Button>
                        <Button
                          type="button"
                          variant="ghost"
                          size="sm"
                          className="text-destructive hover:bg-destructive/10"
                          onClick={() => removeUpload(currentlyOrienting)}
                        >
                          Remove file
                        </Button>
                      </div>
                    </div>
                  ) : null}

                  {(boundsViolationMessage || (interactionDisabled && interactionMessage)) ? (
                    <div className="rounded-lg border border-amber-200 bg-amber-50 p-3 text-sm text-amber-900">
                      <div className="flex items-start gap-2">
                        <AlertTriangle className="mt-0.5 h-4 w-4" />
                        <div className="space-y-1">
                          {boundsViolationMessage ? <p>{boundsViolationMessage}</p> : null}
                          {interactionDisabled && interactionMessage ? <p>{interactionMessage}</p> : null}
                        </div>
                      </div>
                    </div>
                  ) : null}

                  <div className="space-y-3">
                    <ViewNavigationControls
                      helpersVisible={viewHelpersVisible}
                      disabled={isLocking || viewerErrorActive}
                      onPan={(direction) => viewerRef.current?.pan(direction)}
                      onZoom={(direction) => viewerRef.current?.zoom(direction)}
                      onPreset={(preset) => viewerRef.current?.setView(preset)}
                      onFit={() => viewerRef.current?.fit()}
                      onReset={handleViewerReset}
                      onToggleHelpers={() => setViewHelpersVisible(!viewHelpersVisible)}
                      onToggleGizmo={handleToggleGizmo}
                      gizmoEnabled={gizmoEnabled}
                      onGizmoModeChange={handleGizmoModeChange}
                      gizmoMode={gizmoMode}
                    />
                    <div className="overflow-x-auto rounded-xl border border-border/70 bg-card/80 p-3 shadow-sm">
                      <RotationControls
                        onReset={handleViewerReset}
                        onRecenter={() => viewerRef.current?.recenter()}
                        onFitView={() => viewerRef.current?.fit()}
                        onAutoOrient={() => {
                          setFacePickMode(false);
                          viewerRef.current?.autoOrient();
                        }}
                        onLock={handleLockOrientation}
                        onRotate={(axis, degrees) => viewerRef.current?.rotate(axis, degrees)}
                        onOrientToFaceToggle={(enabled) => {
                          setFacePickMode(enabled);
                          if (enabled) {
                            handleToggleGizmo(false);
                          }
                        }}
                        orientToFaceActive={facePickMode}
                        isLocking={isLocking}
                        disabled={isLocking || viewerErrorActive}
                        lockGuardReason={boundsViolationMessage}
                        supportCostPerGram={currentOrientationMaterialCost}
                      />
                    </div>
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
          )}
        </div>

        {/* Right Column - Price Summary & Checkout - Mobile optimized */}
        <div className="space-y-4 sm:space-y-6">
          {/* Price Summary - Mobile optimized: Reduced padding on mobile */}
          {priceData && (currentStep === "price" || currentStep === "checkout") && (
            <section className="rounded-lg border border-border bg-surface-overlay p-4 sm:p-6">
              <div className="mb-4 flex items-center gap-2">
                <Package className="h-5 w-5 text-muted-foreground" />
                <h2 className="text-base font-semibold sm:text-lg">Price Summary</h2>
              </div>
              <div className="space-y-2 text-sm">
                {hasStudentDiscount ? (
                  <>
                    <div className="flex items-center justify-between text-muted-foreground">
                      <span>Original subtotal</span>
                      <span className="line-through">${priceData.originalSubtotal.toFixed(2)}</span>
                    </div>
                    <div className="flex items-center justify-between text-emerald-600">
                      <span>
                        Student discount (
                        {priceData.discountValue % 1 === 0
                          ? priceData.discountValue.toFixed(0)
                          : priceData.discountValue.toFixed(2)}
                        %)
                      </span>
                      <span>- ${priceData.discountAmount.toFixed(2)}</span>
                    </div>
                    <div className="flex items-center justify-between">
                      <span className="text-muted-foreground">Subtotal after discount</span>
                      <span className="font-medium">${priceData.subtotal.toFixed(2)}</span>
                    </div>
                  </>
                ) : (
                  <div className="flex items-center justify-between">
                    <span className="text-muted-foreground">Subtotal</span>
                    <span className="font-medium">${priceData.subtotal.toFixed(2)}</span>
                  </div>
                )}
                <div className="border-t border-border/50 pt-2">
                  <div className="flex items-center justify-between">
                    <span className="flex items-center gap-1.5 text-muted-foreground">
                      <Truck className="h-3.5 w-3.5" />
                      Delivery
                    </span>
                    <span className="font-medium">
                      {shippingQuote ? `$${priceData.shipping.toFixed(2)}` : "Awaiting address"}
                    </span>
                  </div>
                  {shippingQuote ? (
                    <p className="mt-1 text-xs text-muted-foreground">
                      {shippingQuote.label}
                      {shippingQuote.remoteApplied && shippingQuote.remoteSurcharge
                        ? ` (+$${shippingQuote.remoteSurcharge.toFixed(2)} remote surcharge)`
                        : ""}
                    </p>
                  ) : null}
                </div>
                {priceData.taxAmount > 0 && (
                  <div className="flex items-center justify-between">
                    <span className="text-muted-foreground">{`Tax${taxLabelSuffix}`}</span>
                    <span className="font-medium">${priceData.taxAmount.toFixed(2)}</span>
                  </div>
                )}
              <div className="border-t border-border pt-2">
                <div className="flex justify-between text-base font-semibold">
                  <span>Total</span>
                  <span>${priceData.total.toFixed(2)}</span>
                </div>
              </div>
              {priceData.items?.length ? (
                <div className="mt-4 space-y-3 text-xs">
                  <p className="text-[11px] font-semibold uppercase tracking-wide text-muted-foreground">
                    Per-file breakdown
                  </p>
                  {priceData.items.map((item) => (
                    <div key={item.filename} className="rounded-md border border-border/60 p-3">
                      <div className="flex flex-wrap items-center justify-between gap-2 text-sm">
                        <span className="font-medium text-foreground">{item.filename}</span>
                        <span className="text-muted-foreground">
                          Qty {item.quantity} · ${item.unitPrice.toFixed(2)} ea
                        </span>
                      </div>
                      {item.breakdown ? (
                        <dl className="mt-2 grid gap-1 text-[11px] text-muted-foreground sm:grid-cols-2">
                          <div className="flex items-center justify-between">
                            <dt>Model weight</dt>
                            <dd>{(item.breakdown.modelWeight ?? item.breakdown.grams ?? 0).toFixed(1)} g</dd>
                          </div>
                          <div className="flex items-center justify-between">
                            <dt>Support weight</dt>
                            <dd>{(item.breakdown.supportWeight ?? item.breakdown.supportGrams ?? 0).toFixed(1)} g</dd>
                          </div>
                          <div className="flex items-center justify-between">
                            <dt>Material cost</dt>
                            <dd>${(item.breakdown.materialCost ?? 0).toFixed(2)}</dd>
                          </div>
                          <div className="flex items-center justify-between">
                            <dt>Time cost</dt>
                            <dd>${(item.breakdown.timeCost ?? 0).toFixed(2)}</dd>
                          </div>
                        </dl>
                      ) : null}
                      <div className="mt-2 flex items-center justify-between text-sm font-semibold">
                        <span>Line total</span>
                        <span>${item.total.toFixed(2)}</span>
                      </div>
                    </div>
                  ))}
                </div>
              ) : null}
            </div>
              {currentStep === "price" && (
                <Button className="mt-4 w-full" onClick={() => goToStep("checkout")} disabled={loading}>
                  Continue to Checkout
                </Button>
              )}
            </section>
          )}

          {/* Delivery Details - Mobile optimized: Reduced padding on mobile */}
          {priceData && currentStep === "checkout" && (
            <section className="rounded-lg border border-border bg-surface-overlay p-4 sm:p-6">
              <div className="mb-4 flex items-center gap-2">
                <Truck className="h-5 w-5 text-muted-foreground" />
                <h2 className="text-base font-semibold sm:text-lg">Delivery Details</h2>
              </div>
              <div className="space-y-4">
                {/* Delivery Summary Card */}
                <div className="rounded-xl border border-blue-200/60 bg-gradient-to-br from-blue-50/50 to-blue-100/30 p-4 dark:border-blue-800/40 dark:from-blue-950/20 dark:to-blue-900/10">
                  {shippingQuote ? (
                    <div className="space-y-3">
                      <div className="flex items-start justify-between gap-3">
                        <div className="flex-1 space-y-1">
                          <p className="flex items-center gap-2 text-sm font-semibold text-blue-900 dark:text-blue-100">
                            <Truck className="h-4 w-4" />
                            {shippingQuote.label}
                          </p>
                          <p className="text-xs text-blue-700 dark:text-blue-300">
                            Delivery cost: ${shippingQuote.amount.toFixed(2)}
                            {shippingQuote.remoteApplied && shippingQuote.remoteSurcharge
                              ? ` (incl. +$${shippingQuote.remoteSurcharge.toFixed(2)} remote area)`
                              : ""}
                          </p>
                        </div>
                      </div>
                      {/* Show delivery address if entered */}
                      {address.line1 && address.city && address.state && address.postcode && (
                        <div className="border-t border-blue-200/60 pt-2.5 dark:border-blue-800/40">
                          <p className="mb-1 text-xs font-medium text-blue-900 dark:text-blue-100">
                            Delivering to:
                          </p>
                          <div className="text-xs text-blue-700 dark:text-blue-300">
                            {address.name && <p className="font-medium">{address.name}</p>}
                            <p>{address.line1}</p>
                            {address.line2 && <p>{address.line2}</p>}
                            <p>
                              {address.city}, {address.state} {address.postcode}
                            </p>
                            {address.phone && <p>Ph: {address.phone}</p>}
                          </div>
                        </div>
                      )}
                    </div>
                  ) : (
                    <p className="text-sm text-muted-foreground">
                      Enter address below to calculate delivery cost
                    </p>
                  )}
                </div>

                <div className="space-y-3">
                  <div>
                    <Label className="text-xs">Name</Label>
                    <Input
                      value={address.name}
                      onChange={(e) => setAddress({ ...address, name: e.target.value })}
                      className="h-9"
                    />
                  </div>
                  <div>
                    <Label className="text-xs">Phone</Label>
                    <Input
                      value={address.phone}
                      onChange={(e) => setAddress({ ...address, phone: e.target.value })}
                      className="h-9"
                    />
                  </div>
                  <div>
                    <Label className="text-xs">Address Line 1</Label>
                    <Input
                      value={address.line1}
                      onChange={(e) => setAddress({ ...address, line1: e.target.value })}
                      className="h-9"
                    />
                  </div>
                  <div>
                    <Label className="text-xs">Address Line 2</Label>
                    <Input
                      value={address.line2}
                      onChange={(e) => setAddress({ ...address, line2: e.target.value })}
                      className="h-9"
                    />
                  </div>
                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <Label className="text-xs">City</Label>
                      <Input
                        value={address.city}
                        onChange={(e) => setAddress({ ...address, city: e.target.value })}
                        className="h-9"
                      />
                    </div>
                    <div>
                      <Label className="text-xs">State</Label>
                      <Input
                        value={address.state}
                        onChange={(e) =>
                          setAddress({
                            ...address,
                            state: e.target.value.toUpperCase(),
                          })
                        }
                        className="h-9"
                      />
                    </div>
                  </div>
                  <div>
                    <Label className="text-xs">Postcode</Label>
                    <Input
                      value={address.postcode}
                      onChange={(e) => setAddress({ ...address, postcode: e.target.value })}
                      className="h-9"
                    />
                  </div>
                </div>

                <Button
                  className="w-full"
                  onClick={() => setPaymentReviewOpen(true)}
                  disabled={!priceData || !shippingQuote || loading}
                >
                  {loading ? "Processing..." : "Place Project"}
                </Button>
              </div>
            </section>
          )}

          {/* Help Card - Mobile optimized: Reduced padding on mobile */}
          {uploads.length === 0 && isUploadStep && (
            <section className="rounded-lg border border-border bg-surface-overlay p-4 sm:p-6">
              <h3 className="mb-2 text-base font-semibold">How it works</h3>
              <ol className="space-y-2 text-sm text-muted-foreground">
                <li>1. Upload your 3D model files</li>
                <li>2. Configure print settings</li>
                <li>3. Get instant pricing</li>
                <li>4. Complete checkout</li>
              </ol>
              </section>
            )}
        </div>
        <Dialog open={paymentReviewOpen} onOpenChange={setPaymentReviewOpen}>
          <DialogContent className="max-w-md">
            <DialogHeader>
              <DialogTitle>Review payment</DialogTitle>
              <DialogDescription>
                Choose how much of your wallet credit to apply before charging your card.
              </DialogDescription>
            </DialogHeader>
            <div className="space-y-4">
              <div className="rounded-2xl border border-border bg-surface-overlay p-4">
                <div className="flex items-center justify-between text-sm text-muted-foreground">
                  <span>Project total</span>
                  <span className="font-semibold">{formatCurrency(priceData?.total ?? 0)}</span>
                </div>
                <div className="flex items-center justify-between text-sm text-muted-foreground">
                  <span>Shipping</span>
                  <span className="font-semibold text-blue-600">{formatCurrency(priceData?.shipping ?? 0)}</span>
                </div>
                <div className="flex items-center justify-between text-sm text-muted-foreground">
                  <span>Wallet balance</span>
                  <span className="font-semibold text-green-600">{formatCurrency(walletBalance)}</span>
                </div>
              </div>

              <RadioGroup value={applyCredit ? "credit" : "card"} onValueChange={(value) => setApplyCredit(value === "credit")}> 
                <div className="space-y-3">
                  <label className="flex items-center gap-2 rounded-lg border border-border p-3">
                    <RadioGroupItem value="card" />
                    <div>
                      <p className="text-sm font-semibold">Pay with card only</p>
                      <p className="text-xs text-muted-foreground">Save your credits for later</p>
                    </div>
                  </label>
                  <label className="flex items-start gap-2 rounded-lg border border-border p-3">
                    <RadioGroupItem value="credit" className="mt-0.5" />
                    <div className="flex-1 space-y-1">
                      <p className="text-sm font-semibold">Apply wallet credit</p>
                      <p className="text-xs text-muted-foreground">{formatCurrency(maxCreditAvailable)} available to use</p>
                    </div>
                  </label>
                </div>
              </RadioGroup>

              {applyCredit ? (
                <div className="space-y-2">
                  <div className="flex items-center gap-2">
                    <Label className="text-xs">Credit amount</Label>
                    <Button size="sm" variant="outline" onClick={() => setCreditManualEntry(maxCreditAvailable.toFixed(2))}>
                      Max
                    </Button>
                  </div>
                  <Input
                    type="number"
                    step="0.01"
                    min="0"
                    max={maxCreditAvailable}
                    value={creditManualEntry}
                    onChange={(event) => setCreditManualEntry(event.target.value)}
                  />
                  <p className="text-xs text-muted-foreground">
                    You&rsquo;ll pay {formatCurrency(remainingBalance)} after the credit is applied.
                  </p>
                </div>
              ) : null}

              <div className="rounded-2xl border border-border bg-muted/20 p-3 text-sm">
                <p className="text-muted-foreground">Credit applied</p>
                <div className="text-lg font-semibold text-foreground">{formatCurrency(effectiveCreditAmount)}</div>
                <p className="text-muted-foreground">Remaining balance: {formatCurrency(remainingBalance)}</p>
              </div>
            </div>
            <DialogFooter className="gap-2">
              <Button variant="outline" onClick={() => setPaymentReviewOpen(false)} disabled={loading}>
                Cancel
              </Button>
              <Button onClick={handlePaymentReviewConfirm} disabled={loading}>
                {loading ? "Processing..." : "Continue to payment"}
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </div>
    </div>
  );
}
