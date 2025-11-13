import { create, type StateCreator } from 'zustand';
import { persist, createJSONStorage } from 'zustand/middleware';
import { useShallow } from 'zustand/react/shallow';
import { browserLogger } from '@/lib/logging/browser-logger';

export type OrientationQuaternion = [number, number, number, number];
export type OrientationPosition = [number, number, number];
export type OrientationGizmoMode = "rotate" | "translate";

export interface OrientationBoundsStatus {
  inBounds: boolean;
  width: number;
  depth: number;
  height: number;
  violations: string[];
}

type LoadingState = "idle" | "running" | "error" | "timeout";

interface OrientationState {
  quaternion: OrientationQuaternion;
  position: OrientationPosition;
  overhangFaces: number[];
  supportVolume: number;
  supportWeight: number;
  supportEnabled: boolean;
  isAutoOriented: boolean;
  overhangStatus: LoadingState;
  overhangMessage?: string;
  autoOrientStatus: LoadingState;
  autoOrientMessage?: string;
  interactionDisabled: boolean;
  interactionMessage?: string;
  warnings: string[];
  boundsStatus: OrientationBoundsStatus | null;
  helpersVisible: boolean;
  gizmoEnabled: boolean;
  gizmoMode: OrientationGizmoMode;
}

interface OrientationActions {
  setOrientation: (
    quaternion: OrientationQuaternion,
    position?: OrientationPosition,
    options?: { auto?: boolean }
  ) => void;
  setOverhangData: (params: { faces: number[]; supportVolume: number; supportWeight: number }) => void;
  toggleSupports: (nextState?: boolean) => void;
  setSupportsEnabled: (enabled: boolean) => void;
  setAnalysisStatus: (status: LoadingState, message?: string) => void;
  setAutoOrientStatus: (status: LoadingState, message?: string) => void;
  setInteractionLock: (disabled: boolean, message?: string) => void;
  addWarning: (message: string) => void;
  clearWarnings: () => void;
  setBoundsStatus: (status: OrientationBoundsStatus | null) => void;
  setHelpersVisible: (visible: boolean) => void;
  setGizmoEnabledState: (enabled: boolean) => void;
  setGizmoMode: (mode: OrientationGizmoMode) => void;
  reset: () => void;
}

const initialQuaternion: OrientationQuaternion = [0, 0, 0, 1];
const initialPosition: OrientationPosition = [0, 0, 0];

const initialState: OrientationState = {
  quaternion: initialQuaternion,
  position: initialPosition,
  overhangFaces: [],
  supportVolume: 0,
  supportWeight: 0,
  supportEnabled: true,
  isAutoOriented: false,
  overhangStatus: "idle",
  autoOrientStatus: "idle",
  interactionDisabled: false,
  warnings: [],
  boundsStatus: null,
  helpersVisible: false,
  gizmoEnabled: false,
  gizmoMode: "rotate",
};

export type OrientationStore = OrientationState & OrientationActions;

const STORAGE_KEY = "quickprint-orientation";
export const ORIENTATION_STORAGE_KEY = STORAGE_KEY;

const isClient = typeof window !== "undefined";
const sessionStorage = isClient
  ? createJSONStorage(() => ({
      getItem: (name: string) => {
        try {
          return window.sessionStorage.getItem(name);
        } catch (error) {
          browserLogger.error({
            scope: "bug.31.orientation-missing",
            message: "Failed to read orientation persistence",
            error,
          });
          return null;
        }
      },
      setItem: (name: string, value: string) => {
        try {
          window.sessionStorage.setItem(name, value);
        } catch (error) {
          browserLogger.error({
            scope: "bug.31.orientation-missing",
            message: "Failed to write orientation persistence",
            error,
          });
        }
      },
      removeItem: (name: string) => {
        try {
          window.sessionStorage.removeItem(name);
        } catch (error) {
          browserLogger.error({
            scope: "bug.31.orientation-missing",
            message: "Failed to clear orientation persistence",
            error,
          });
        }
      },
    }))
  : undefined;

export function clearOrientationPersistence() {
  if (!isClient) return;
  try {
    window.sessionStorage.removeItem(STORAGE_KEY);
  } catch (error) {
    browserLogger.error({
      scope: "bug.31.orientation-missing",
      message: "Failed to clear orientation persistence",
      error,
    });
  }
}

const createOrientationStore: StateCreator<OrientationStore> = (set) => ({
  ...initialState,
  setOrientation: (quaternion, position = initialPosition, options) =>
    set((state) => ({
      quaternion: normalizeQuaternion(quaternion),
      position: [...position] as OrientationPosition,
      isAutoOriented: options?.auto ?? state.isAutoOriented,
    })),
  setOverhangData: ({ faces, supportVolume, supportWeight }) =>
    set(() => ({
      overhangFaces: faces,
      supportVolume,
      supportWeight,
      overhangStatus: "idle",
      overhangMessage: undefined,
    })),
  toggleSupports: (nextState) =>
    set((state) => ({ supportEnabled: nextState ?? !state.supportEnabled })),
  setSupportsEnabled: (enabled) => set(() => ({ supportEnabled: enabled })),
  setAnalysisStatus: (status, message) => set(() => ({ overhangStatus: status, overhangMessage: message })),
  setAutoOrientStatus: (status, message) =>
    set(() => ({ autoOrientStatus: status, autoOrientMessage: message })),
  setInteractionLock: (disabled, message) =>
    set(() => ({ interactionDisabled: disabled, interactionMessage: message })),
  addWarning: (message) =>
    set((state) => {
      if (state.warnings.includes(message)) {
        return state;
      }
      return { warnings: [...state.warnings, message] };
    }),
  clearWarnings: () => set(() => ({ warnings: [] })),
  setBoundsStatus: (status) => set(() => ({ boundsStatus: status })),
  setHelpersVisible: (visible) => set(() => ({ helpersVisible: visible })),
  setGizmoEnabledState: (enabled) => set(() => ({ gizmoEnabled: enabled })),
  setGizmoMode: (mode) => set(() => ({ gizmoMode: mode })),
  reset: () => {
    clearOrientationPersistence();
    set({ ...initialState });
  },
});

export const useOrientationStore = create<OrientationStore>()(
  persist(createOrientationStore, {
    name: STORAGE_KEY,
    storage: sessionStorage,
  }),
);

export const useOrientation = () =>
  useOrientationStore(
    useShallow((state) => ({
      quaternion: state.quaternion,
      position: state.position,
      isAutoOriented: state.isAutoOriented,
    })),
  );

export const useSupports = () =>
  useOrientationStore(
    useShallow((state) => ({
      supportEnabled: state.supportEnabled,
      supportVolume: state.supportVolume,
      supportWeight: state.supportWeight,
      overhangFaces: state.overhangFaces,
      overhangStatus: state.overhangStatus,
      overhangMessage: state.overhangMessage,
      autoOrientStatus: state.autoOrientStatus,
      autoOrientMessage: state.autoOrientMessage,
      interactionDisabled: state.interactionDisabled,
      interactionMessage: state.interactionMessage,
      warnings: state.warnings,
      boundsStatus: state.boundsStatus,
    })),
  );

function normalizeQuaternion(tuple: OrientationQuaternion): OrientationQuaternion {
  const [x, y, z, w] = tuple;
  const magnitude = Math.hypot(x, y, z, w);
  if (!Number.isFinite(magnitude) || magnitude < 1e-4) {
    return [...initialQuaternion];
  }
  const inv = 1 / magnitude;
  return [x * inv, y * inv, z * inv, w * inv] as OrientationQuaternion;
}
