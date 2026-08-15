import {
  getCampaigns,
  getContributorPayments,
  getExcludedEscrowCount,
  getMaintainerPayouts,
  getSummaries,
} from "@/features/payments/server/queries";
import { PaymentsDashboard } from "@/features/payments/components/PaymentsDashboard";

// Cold snapshot builds can take minutes; warm renders are a single cache read.
export const maxDuration = 300;

export const revalidate = 3600;

export default async function PaymentsPage() {
  const [campaigns, payments, maintainers, summaries, excluded] =
    await Promise.all([
      getCampaigns(),
      getContributorPayments(),
      getMaintainerPayouts(),
      getSummaries(),
      getExcludedEscrowCount(),
    ]);

  return (
    <div className="mx-auto max-w-7xl space-y-8 px-4 py-10 sm:px-6 lg:px-8">
      <PaymentsDashboard
        campaigns={campaigns ?? []}
        payments={payments}
        maintainers={maintainers}
        summaries={summaries}
        excluded={excluded}
      />
    </div>
  );
}
