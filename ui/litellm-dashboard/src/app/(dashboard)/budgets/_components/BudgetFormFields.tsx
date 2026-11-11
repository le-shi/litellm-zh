import React, { useId } from "react";
import { Controller } from "react-hook-form";
import { z } from "zod";
import { FormField } from "@/components/shared/form/FormField";
import { Badge } from "@/components/ui/badge";
import { ButtonGroup } from "@/components/ui/button-group";
import {
  Field,
  FieldDescription,
  FieldGroup,
  FieldLabel,
  FieldLegend,
  FieldSeparator,
  FieldSet,
} from "@/components/ui/field";
import { Input } from "@/components/ui/input";
import { InputGroup, InputGroupAddon, InputGroupInput, InputGroupText } from "@/components/ui/input-group";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useZodForm } from "@/lib/forms/useZodForm";

const budgetShape = {
  budget_id: z.string().min(1, "Enter a budget ID"),
  tpm_limit: z.number().nullish(),
  rpm_limit: z.number().nullish(),
  tpd_limit: z.number().nullish(),
  max_budget: z.number().nullish(),
  budget_duration: z.string().nullish(),
};

const budgetSchema = z.object(budgetShape);

export type BudgetFormValues = z.output<typeof budgetSchema>;

export const useBudgetForm = (defaultValues: z.input<typeof budgetSchema>) =>
  useZodForm(budgetSchema, { defaultValues });

type BudgetForm = ReturnType<typeof useBudgetForm>;
type NumberFieldName = "tpm_limit" | "rpm_limit" | "tpd_limit" | "max_budget";

const NO_RESET = "never";

const RESET_OPTIONS = [
  { value: NO_RESET, label: "总计" },
  { value: "24h", label: "每天" },
  { value: "7d", label: "每周" },
  { value: "30d", label: "每月" },
];

const numberProps = <T extends { value?: number | null; onChange: (value: number | null) => void }>({
  value,
  onChange,
  ...field
}: T) => ({
  ...field,
  type: "number",
  value: value ?? "",
  placeholder: "No limit",
  onChange: (event: React.ChangeEvent<HTMLInputElement>) =>
    onChange(event.target.value === "" ? null : event.target.valueAsNumber),
});

const OptionalBadge = () => <Badge variant="secondary">{"可选"}</Badge>;

function SpendLimitField({ form }: { form: BudgetForm }) {
  const amountId = useId();
  return (
    <Field className="gap-2">
      <FieldLabel htmlFor={amountId}>{"费用上限"}<OptionalBadge />
      </FieldLabel>
      <ButtonGroup className="w-full">
        <Controller
          control={form.control}
          name="max_budget"
          render={({ field }) => (
            <InputGroup>
              <InputGroupAddon>
                <InputGroupText>$</InputGroupText>
              </InputGroupAddon>
              <InputGroupInput {...numberProps(field)} id={amountId} step={0.01} />
            </InputGroup>
          )}
        />
        <Controller
          control={form.control}
          name="budget_duration"
          render={({ field }) => (
            <Select
              items={RESET_OPTIONS}
              value={field.value ?? NO_RESET}
              onValueChange={(next) => field.onChange(next === NO_RESET ? null : next)}
            >
              <SelectTrigger aria-label={"重置周期"} className="w-32">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {RESET_OPTIONS.map((option) => (
                  <SelectItem key={option.value} value={option.value}>
                    {option.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          )}
        />
      </ButtonGroup>
    </Field>
  );
}

function RateLimitField({ form, name, label }: { form: BudgetForm; name: NumberFieldName; label: string }) {
  return (
    <FormField
      control={form.control}
      name={name}
      label={label}
      orientation="horizontal"
      className="justify-between *:data-[slot=field-label]:flex-none"
    >
      {(control) => <Input {...numberProps(control)} className="w-36" />}
    </FormField>
  );
}

export function BudgetFormFields({ form, isEditing }: { form: BudgetForm; isEditing: boolean }) {
  return (
    <FieldGroup className="gap-4">
      <FormField
        control={form.control}
        name="budget_id"
        label={"预算 ID"}
        description={isEditing ? "预算 ID 创建后不可修改" : undefined}
        className="gap-2"
      >
        {({ ref, ...field }) => <Input {...field} ref={ref} value={field.value ?? ""} disabled={isEditing} />}
      </FormField>
      <SpendLimitField form={form} />
      <FieldSeparator />
      <FieldSet className="gap-3">
        <FieldLegend className="mb-4 flex items-center gap-2 text-[15px] leading-[22px] font-semibold">{"速率限制"}<OptionalBadge />
        </FieldLegend>
        <RateLimitField form={form} name="tpm_limit" label={"每分钟令牌数"} />
        <RateLimitField form={form} name="rpm_limit" label={"每分钟请求数"} />
        <RateLimitField form={form} name="tpd_limit" label={"每日批处理令牌数"} />
        <FieldDescription>{"批处理计入每日限额而非每分钟限额，提供商的速率限制仍然生效。"}</FieldDescription>
      </FieldSet>
    </FieldGroup>
  );
}
