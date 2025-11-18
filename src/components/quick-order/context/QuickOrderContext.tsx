import { createContext, useContext } from "react";
import { useQuickOrderLogic } from "../hooks/useQuickOrderLogic";

type QuickOrderContextType = ReturnType<typeof useQuickOrderLogic>;

const QuickOrderContext = createContext<QuickOrderContextType | null>(null);

export function QuickOrderProvider({ children }: { children: React.ReactNode }) {
  const logic = useQuickOrderLogic();

  return (
    <QuickOrderContext.Provider value={logic}>
      {children}
    </QuickOrderContext.Provider>
  );
}

export function useQuickOrder() {
  const context = useContext(QuickOrderContext);
  if (!context) {
    throw new Error("useQuickOrder must be used within a QuickOrderProvider");
  }
  return context;
}
