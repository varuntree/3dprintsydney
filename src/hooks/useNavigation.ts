"use client";

import { useNavigationContext } from "@/providers/navigation-provider";

export function useNavigation() {
  return useNavigationContext();
}

