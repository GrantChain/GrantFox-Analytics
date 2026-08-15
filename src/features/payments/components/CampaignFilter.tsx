"use client";

import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import type { Campaign } from "../types";

export const ALL_CAMPAIGNS = "all";
export function CampaignFilter({
  campaigns,
  selected,
  onSelect,
}: {
  campaigns: Campaign[];
  selected: string;
  onSelect: (campaign: string) => void;
}) {
  return (
    <div className="flex items-center gap-3">
      <label
        htmlFor="campaign-filter"
        className="text-sm font-medium text-muted-foreground"
      >
        Campaign
      </label>
      <Select value={selected} onValueChange={onSelect}>
        <SelectTrigger id="campaign-filter" className="w-[240px]">
          <SelectValue placeholder="All campaigns" />
        </SelectTrigger>
        <SelectContent>
          <SelectItem value={ALL_CAMPAIGNS}>All campaigns</SelectItem>
          {campaigns.map((c) => (
            <SelectItem key={c.campaign_id} value={c.campaign_id}>
              {c.name}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>
    </div>
  );
}
