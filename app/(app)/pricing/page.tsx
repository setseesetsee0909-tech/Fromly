import { PricingPage } from "@/routes/_app.pricing";
import { getBillingCheckoutMode } from "@/lib/billing-checkout";
import { getManualBillingConfig } from "@/lib/manual-billing";

const IS_DEV = process.env.NODE_ENV !== "production";

export default function Page() {
  const manualBillingConfig = getManualBillingConfig();
  const checkoutMode = getBillingCheckoutMode({
    billingProvider: process.env.BILLING_PROVIDER,
    isDev: IS_DEV,
    manualAccountName: manualBillingConfig.accountName,
    manualAccountNumber: manualBillingConfig.accountNumber,
    manualAmounts: [
      manualBillingConfig.planAmounts.pro,
      manualBillingConfig.planAmounts.team,
    ],
    manualBankName: manualBillingConfig.bankName,
    monpayAmounts: [process.env.MONPAY_PLAN_PRO_AMOUNT, process.env.MONPAY_PLAN_TEAM_AMOUNT],
    monpayClientId: process.env.MONPAY_CLIENT_ID,
    monpayClientSecret: process.env.MONPAY_CLIENT_SECRET,
    qpayAmounts: [process.env.QPAY_PLAN_PRO_AMOUNT, process.env.QPAY_PLAN_TEAM_AMOUNT],
    qpayClientId: process.env.QPAY_CLIENT_ID,
    qpayClientSecret: process.env.QPAY_CLIENT_SECRET,
    qpayInvoiceCodes: [process.env.QPAY_INVOICE_CODE_PRO, process.env.QPAY_INVOICE_CODE_TEAM],
    stripePriceIds: [process.env.STRIPE_PRICE_PRO, process.env.STRIPE_PRICE_TEAM],
    stripeSecretKey: process.env.STRIPE_SECRET_KEY,
  });

  return <PricingPage checkoutMode={checkoutMode} manualConfig={manualBillingConfig} />;
}
