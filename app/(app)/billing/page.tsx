import { BillingPage } from "@/routes/_app.billing";
import { getManualBillingConfig } from "@/lib/manual-billing";

export default function Page() {
  return <BillingPage manualConfig={getManualBillingConfig()} />;
}
