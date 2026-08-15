import { Card } from "@/components/ui/card";
import { formatAmount, formatCount } from "../formatters";
import type { PaymentSummary } from "../types";

import { UsdcIcon } from "./UsdcIcon";

function Tile({
  label,
  value,
  currency,
  note,
  accent = false,
}: {
  label: string;
  value: string;
  currency?: string;
  note?: string;
  accent?: boolean;
}) {
  return (
    <Card className="gap-2 p-5">
      <span className="text-sm text-muted-foreground">{label}</span>
      <span
        className={`flex items-center gap-2 font-heading text-2xl leading-tight font-semibold tabular-nums lg:text-3xl ${
          accent ? "text-brand-primary" : "text-foreground"
        }`}
      >
        {currency ? (
          <UsdcIcon className="size-6 lg:size-7" />
        ) : null}
        {value}
      </span>
      {note ? (
        <span className="text-xs text-muted-foreground">{note}</span>
      ) : null}
    </Card>
  );
}

export function SummaryTiles({
  summary,
}: {
  summary: PaymentSummary | null;
}) {
  if (!summary) {
    return (
      <Card className="p-6">
        <p className="text-sm text-muted-foreground">
          Totals are temporarily unavailable.
        </p>
      </Card>
    );
  }

  const currency = summary.currency;

  return (
    <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
      <Tile
        label="Total distributed"
        value={formatAmount(summary.total_distributed)}
        currency={currency}
        accent
        note={
          summary.maintainer_available ? undefined : "contributor payments only"
        }
      />
      <Tile
        label="Paid to contributors"
        value={formatAmount(summary.contributor_total)}
        currency={currency}
      />
      {summary.maintainer_available ? (
        <Tile
          label="Paid to maintainers"
          value={formatAmount(summary.maintainer_total)}
          currency={currency}
        />
      ) : (
        <Tile label="Paid to maintainers" value="—" note="unavailable" />
      )}
      <Tile
        label="Contributors paid"
        value={formatCount(summary.contributor_count)}
        note="distinct individuals"
      />
      {summary.maintainer_available ? (
        <Tile
          label="Projects paid"
          value={formatCount(summary.maintainer_count)}
        />
      ) : (
        <Tile label="Projects paid" value="—" note="Unavailable" />
      )}
      <Tile
        label="Projects funded"
        value={formatCount(summary.projects_funded)}
        note="paid at least one contributor"
      />
    </div>
  );
}
