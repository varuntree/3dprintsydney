"use client";

import { QuickOrderProvider, useQuickOrder } from "@/components/quick-order/context/QuickOrderContext";
import { StepNavigation } from "@/components/quick-order/shared/StepNavigation";
import { StatusBanners } from "@/components/quick-order/shared/StatusBanners";
import { RightSidebar } from "@/components/quick-order/shared/RightSidebar";
import { GlobalDialogs } from "@/components/quick-order/shared/GlobalDialogs";
import { UploadStep } from "@/components/quick-order/steps/UploadStep";
import { OrientStep } from "@/components/quick-order/steps/OrientStep";
import { ConfigureStep } from "@/components/quick-order/steps/ConfigureStep";
import { PriceStep } from "@/components/quick-order/steps/PriceStep";
import { CheckoutStep } from "@/components/quick-order/steps/CheckoutStep";

function QuickOrderContent() {
  const { currentStep } = useQuickOrder();

  const StepComponents = {
    upload: UploadStep,
    orient: OrientStep,
    configure: ConfigureStep,
    price: PriceStep,
    checkout: CheckoutStep,
  };

  const CurrentComponent = StepComponents[currentStep];

  return (
    <div className="pb-24">
      <GlobalDialogs />
      <StepNavigation />
      <StatusBanners />
      
      <div className="mt-6 grid grid-cols-1 gap-4 sm:gap-6 md:grid-cols-3">
        {/* Left Column */}
        <div className="space-y-4 sm:space-y-6 md:col-span-2">
          <CurrentComponent />
        </div>

        {/* Right Column */}
        <div className="space-y-4 sm:space-y-6">
          <RightSidebar />
        </div>
      </div>
    </div>
  );
}

export default function QuickOrderPage() {
  return (
    <QuickOrderProvider>
      <QuickOrderContent />
    </QuickOrderProvider>
  );
}
