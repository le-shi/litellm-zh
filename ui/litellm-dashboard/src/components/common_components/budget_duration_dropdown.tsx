import React from "react";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";

export const NEVER_RESETS_BUDGET_DURATION = "none";

const DURATION_LABELS: Record<string, string> = {
  [NEVER_RESETS_BUDGET_DURATION]: "Never resets",
  "1h": "hourly",
  "24h": "daily",
  "7d": "weekly",
  "30d": "monthly",
};

interface BudgetDurationDropdownProps {
  id?: string;
  value?: string | null;
  onChange?: (value: string | null) => void;
  className?: string;
  style?: React.CSSProperties;
  placeholder?: string;
  showNeverResets?: boolean;
}

const BudgetDurationDropdown: React.FC<BudgetDurationDropdownProps> = ({
  id,
  value,
  onChange,
  className = "",
  style = {},
  placeholder = "Never resets",
  showNeverResets = false,
}) => {
  return (
    <Select items={DURATION_LABELS} value={value || null} onValueChange={onChange}>
      <SelectTrigger id={id} className={`w-full ${className}`} style={style}>
        <SelectValue placeholder={placeholder} />
      </SelectTrigger>
      <SelectContent>
        <SelectItem value={null}>{placeholder}</SelectItem>
        {showNeverResets ? <SelectItem value={NEVER_RESETS_BUDGET_DURATION}>{"不重置"}</SelectItem> : null}
        <SelectItem value="1h">{"每小时"}</SelectItem>
        <SelectItem value="24h">{"每天"}</SelectItem>
        <SelectItem value="7d">{"每周"}</SelectItem>
        <SelectItem value="30d">{"每月"}</SelectItem>
      </SelectContent>
    </Select>
  );
};

export const getBudgetDurationLabel = (value: string | null | undefined): string => {
  if (!value) return "Not set";

  const budgetDurationMap: Record<string, string> = {
    "1h": "hourly",
    "24h": "daily",
    "7d": "weekly",
    "30d": "monthly",
  };

  return budgetDurationMap[value] || value;
};

export default BudgetDurationDropdown;
