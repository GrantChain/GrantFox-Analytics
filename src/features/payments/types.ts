export type Campaign = {
  campaign_id: string;
  name: string;
  status: string;
};

export type PaymentSummary = {
  campaign_id: string | null;
  campaign_name?: string;
  currency: string;
  total_distributed: number;
  contributor_total: number;
  contributor_payments: number;
  contributor_count: number;
  maintainer_total: number;
  maintainer_count: number;
  maintainer_available: boolean;
  projects_funded: number;
  snapshot_at: string | null;
};

export type ContributorPayment = {
  payment_id: string;
  username: string | null;
  avatar_url: string | null;
  amount: number;
  project_id: string;
  project_name: string;
  campaign_id: string;
  campaign_name: string;
  escrow_id: string;
};

export type ContributorPaymentsPage = {
  items: ContributorPayment[];
  total_count: number;
  truncated: boolean;
};

export type MaintainerPayout = {
  project_id: string;
  project_name: string;
  campaign_id: string;
  campaign_name: string;
  escrow_id: string;
  funded_amount: number;
  released_amount: number;
  balance: number;
  maintainers: Array<{
    username: string | null;
    avatar_url: string | null;
    is_owner: boolean;
  }>;
};

export type MaintainerPayouts = {
  snapshot_at: string;
  stale: boolean;
  currency: string;
  items: MaintainerPayout[];
  total_funded: number;
  total_released: number;
};

export type CampaignSummaries = {
  all: PaymentSummary;
  by_campaign: Record<string, PaymentSummary>;
};
