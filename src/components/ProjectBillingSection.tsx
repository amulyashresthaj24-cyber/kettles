"use client";

import type { Client } from "@/lib/types";
import { Checkbox } from "@/components/ui/checkbox";
import { CurrencyDollar } from "@/components/ui/icon";
import { cn } from "@/lib/utils";
import { formatHourlyRate, parseRateInput, resolveHourlyRate } from "@/lib/rates";

interface ProjectBillingSectionProps {
  billable: boolean;
  onBillableChange: (billable: boolean) => void;
  /** Raw input text so an empty field can mean "clear the rate". */
  hourlyRate: string;
  onHourlyRateChange: (value: string) => void;
  budget: string;
  onBudgetChange: (value: string) => void;
  client?: Client;
}

/**
 * Billing controls shared by the create and edit project modals. Shows which
 * rate earnings will actually use, so an empty field never looks like $0/hr
 * when the client already has a rate.
 */
export function ProjectBillingSection({
  billable,
  onBillableChange,
  hourlyRate,
  onHourlyRateChange,
  budget,
  onBudgetChange,
  client,
}: ProjectBillingSectionProps) {
  const parsed = parseRateInput(hourlyRate);
  const rateError = parsed.ok ? null : parsed.error;
  const effective = resolveHourlyRate(
    { hourlyRate: parsed.ok ? parsed.value : null },
    client
  );

  const clientRate = resolveHourlyRate(null, client);
  const inheritPlaceholder =
    clientRate.source === "client" ? String(clientRate.dollarsPerHour) : "0.00";

  let hint: string;
  if (!billable) {
    hint = "Time logged here stays out of earnings until you mark it billable.";
  } else if (rateError) {
    hint = rateError;
  } else if (effective.source === "project") {
    hint =
      clientRate.source === "client" && clientRate.dollarsPerHour !== effective.dollarsPerHour
        ? `Earnings use ${formatHourlyRate(effective.dollarsPerHour)} — overrides ${formatHourlyRate(clientRate.dollarsPerHour)} from ${client?.name ?? "the client"}.`
        : `Earnings use ${formatHourlyRate(effective.dollarsPerHour)} for every hour logged here.`;
  } else if (effective.source === "client") {
    hint = `Inherits ${formatHourlyRate(effective.dollarsPerHour)} from ${client?.name ?? "the client"}. Set a rate to override it.`;
  } else {
    hint = "No rate yet, so earnings stay at $0. Add one here or on the client.";
  }

  return (
    <section className="rounded-lg border border-border-subtle bg-surface-mid/40 p-4">
      <div className="flex items-center justify-between gap-3">
        <div className="flex items-center gap-2 text-[13px] font-medium text-text-primary">
          <CurrencyDollar size={14} className="text-text-muted" />
          Billing
        </div>
        <div className="flex items-center gap-2 text-[12px] font-medium text-text-secondary">
          <Checkbox checked={billable} onChange={onBillableChange} size="sm" />
          <span className="cursor-pointer" onClick={() => onBillableChange(!billable)}>
            Billable project
          </span>
        </div>
      </div>

      <div className="mt-3 grid grid-cols-2 gap-3">
        <label className="flex flex-col gap-1.5">
          <span className="text-[11px] uppercase tracking-[0.04em] text-text-faint">
            Hourly rate
          </span>
          <span
            className={cn(
              "flex h-9 items-center gap-1 rounded-[8px] bg-surface-raised px-3 text-[14px] transition-colors",
              rateError ? "ring-1 ring-error" : "focus-within:ring-2 focus-within:ring-accent/40",
              !billable && "opacity-60"
            )}
          >
            <span className="text-text-muted">$</span>
            <input
              type="number"
              min="0"
              step="0.01"
              inputMode="decimal"
              placeholder={inheritPlaceholder}
              aria-label="Project hourly rate in dollars"
              className="w-full bg-transparent text-[14px] text-text-primary outline-none placeholder:text-text-faint"
              value={hourlyRate}
              onChange={(e) => onHourlyRateChange(e.target.value)}
            />
            <span className="shrink-0 text-[12px] text-text-muted">/hr</span>
          </span>
        </label>

        <label className="flex flex-col gap-1.5">
          <span className="text-[11px] uppercase tracking-[0.04em] text-text-faint">
            Budget
          </span>
          <span
            className={cn(
              "flex h-9 items-center gap-1 rounded-[8px] bg-surface-raised px-3 text-[14px] transition-colors focus-within:ring-2 focus-within:ring-accent/40",
              !billable && "opacity-60"
            )}
          >
            <span className="text-text-muted">$</span>
            <input
              type="number"
              min="0"
              step="1"
              inputMode="decimal"
              placeholder="Optional"
              aria-label="Project budget in dollars"
              className="w-full bg-transparent text-[14px] text-text-primary outline-none placeholder:text-text-faint"
              value={budget}
              onChange={(e) => onBudgetChange(e.target.value)}
            />
          </span>
        </label>
      </div>

      <p className={cn("mt-2.5 text-[12px] leading-relaxed", rateError && billable ? "text-error" : "text-text-muted")}>
        {hint}
      </p>
    </section>
  );
}
