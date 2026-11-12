import moment from "moment";

export interface RelativeTimeOption {
  label: string;
  shortLabel: string;
  settingValue: string;
  getValue: () => { from: Date; to: Date };
}

export const relativeTimeOptions: readonly RelativeTimeOption[] = [
  {
    label: "Today",
    shortLabel: "today",
    settingValue: "today",
    getValue: () => ({
      from: moment().startOf("day").toDate(),
      to: moment().endOf("day").toDate(),
    }),
  },
  {
    label: "最近 7 天",
    shortLabel: "7d",
    settingValue: "last_7_days",
    getValue: () => ({
      from: moment().subtract(7, "days").startOf("day").toDate(),
      to: moment().endOf("day").toDate(),
    }),
  },
  {
    label: "最近 30 天",
    shortLabel: "30d",
    settingValue: "last_30_days",
    getValue: () => ({
      from: moment().subtract(30, "days").startOf("day").toDate(),
      to: moment().endOf("day").toDate(),
    }),
  },
  {
    label: "本月至今",
    shortLabel: "MTD",
    settingValue: "month_to_date",
    getValue: () => ({
      from: moment().startOf("month").toDate(),
      to: moment().endOf("day").toDate(),
    }),
  },
  {
    label: "本年至今",
    shortLabel: "YTD",
    settingValue: "year_to_date",
    getValue: () => ({
      from: moment().startOf("year").toDate(),
      to: moment().endOf("day").toDate(),
    }),
  },
];
