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
  supportVolume: number;
  supportWeight: number;
  supportEnabled: boolean;
  isAutoOriented: boolean;
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
  setSupportEstimates: (params: { supportVolume: number; supportWeight: number }) => void;
  toggleSupports: (nextState?: boolean) => void;
  setSupportsEnabled: (enabled: boolean) => void;
  setAutoOrientStatus: (status: LoadingState, message?: string) => void;
  setInteractionLock: (disabled: boolean, message?: string) => void;
  addWarning: (message: string) => void;
  clearWarnings: () => void;
  setBoundsStatus: (status: OrientationBoundsStatus | null) => void;
  setHelpersVisible: (visible: boolean) => void;
  setGizmoEnabledState: (enabled: boolean) => void;
  setGizmoMode: (mode: OrientationGizmoMode) => void;
  reset: () => void;
  resetForNewFile: () => void;
}

const initialQuaternion: OrientationQuaternion = [0, 0, 0, 1];
const initialPosition: OrientationPosition = [0, 0, 0];

const initialState: OrientationState = {
  quaternion: initialQuaternion,
  position: initialPosition,
  supportVolume: 0,
  supportWeight: 0,
  supportEnabled: true,
  isAutoOriented: false,
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
    set((state) => {
      const nextQuat = normalizeQuaternion(quaternion);
      const nextPos: OrientationPosition = [...position] as OrientationPosition;
      const unchangedQuat =
        state.quaternion[0] === nextQuat[0] &&
        state.quaternion[1] === nextQuat[1] &&
        state.quaternion[2] === nextQuat[2] &&
        state.quaternion[3] === nextQuat[3];
      const unchangedPos =
        state.position[0] === nextPos[0] &&
        state.position[1] === nextPos[1] &&
        state.position[2] === nextPos[2];
      const nextAuto = options?.auto ?? state.isAutoOriented;
      if (unchangedQuat && unchangedPos && nextAuto === state.isAutoOriented) {
        return state;
      }
      return {
        quaternion: nextQuat,
        position: nextPos,
        isAutoOriented: nextAuto,
      };
    }),
  setSupportEstimates: ({ supportVolume, supportWeight }) =>
    set(() => ({
      supportVolume,
      supportWeight,
    })),
  toggleSupports: (nextState) =>
    set((state) => ({ supportEnabled: nextState ?? !state.supportEnabled })),
  setSupportsEnabled: (enabled) => set(() => ({ supportEnabled: enabled })),
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
  setBoundsStatus: (status) =>
    set((state) => {
      const prev = state.boundsStatus;
      const same =
        (!prev && !status) ||
        (prev &&
          status &&
          prev.inBounds === status.inBounds &&
          prev.width === status.width &&
          prev.depth === status.depth &&
          prev.height === status.height &&
          prev.violations.length === status.violations.length &&
          prev.violations.every((v, i) => v === status.violations[i]));
      return same ? state : { boundsStatus: status };
    }),
  setHelpersVisible: (visible) => set(() => ({ helpersVisible: visible })),
  setGizmoEnabledState: (enabled) => set(() => ({ gizmoEnabled: enabled })),
  setGizmoMode: (mode) => set(() => ({ gizmoMode: mode })),
  reset: () => {
    clearOrientationPersistence();
    set({ ...initialState });
  },
  resetForNewFile: () =>
    set((state) => ({
      // reset orientation + analysis data while keeping UI toggles
      quaternion: initialQuaternion,
      position: initialPosition,
      supportVolume: 0,
      supportWeight: 0,
      isAutoOriented: false,
      autoOrientStatus: "idle",
      autoOrientMessage: undefined,
      interactionDisabled: false,
      interactionMessage: undefined,
      warnings: [],
      boundsStatus: null,
      // preserve toggle-able UI bits
      supportEnabled: state.supportEnabled,
      helpersVisible: state.helpersVisible,
      gizmoEnabled: state.gizmoEnabled,
      gizmoMode: state.gizmoMode,
    })),
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
