"use client";

import React, { useEffect, useMemo } from "react";
import { useWatch } from "react-hook-form";
import { z } from "zod";
import { FieldGroup } from "@/components/ui/field";
import { FormField } from "@/components/shared/form/FormField";
import {
  Combobox,
  ComboboxChip,
  ComboboxChips,
  ComboboxChipsInput,
  ComboboxContent,
  ComboboxEmpty,
  ComboboxItem,
  ComboboxList,
  ComboboxValue,
  useComboboxAnchor,
} from "@/components/ui/combobox";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { useZodForm } from "@/lib/forms/useZodForm";
import {
  GROUP_NAME_MAX_LENGTH,
  STRATEGIES_WITH_ARGS,
  argsForStrategy,
  buildRoutingGroupPayload,
  prioritiesForModels,
  toRoutingGroupFormValues,
} from "./routingGroupPayload";
import type { RoutingGroup } from "./types";
import { modelConflictError } from "./modelOwnership";
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";

interface RoutingGroupModalProps {
  open: boolean;
  mode: "create" | "edit";
  initialValue: RoutingGroup | null;
  availableStrategies: string[];
  strategyDescriptions: Record<string, string>;
  modelOptions: string[];
  existingGroupNames: string[];
  groupNameByModel: Record<string, string>;
  onClose: () => void;
  onSubmit: (group: RoutingGroup) => Promise<void> | void;
  saving?: boolean;
}

const ARGS_EXAMPLES: Record<string, string> = {
  "latency-based-routing": 'Example: { "ttl": 3600, "lowest_latency_buffer": 0 }',
};

const RoutingGroupModal: React.FC<RoutingGroupModalProps> = ({
  open,
  mode,
  initialValue,
  availableStrategies,
  strategyDescriptions,
  modelOptions,
  existingGroupNames,
  groupNameByModel,
  onClose,
  onSubmit,
  saving,
}) => {
  const modelsAnchor = useComboboxAnchor();
  const selectableStrategies =
    mode === "edit" && initialValue
      ? Array.from(new Set([...availableStrategies, initialValue.routing_strategy]))
      : availableStrategies;
  const strategyItems = selectableStrategies.map((strategy) => ({
    label: strategy === "priority" ? "Priority" : strategy,
    value: strategy,
  }));

  const reservedNames = useMemo(() => {
    const others = existingGroupNames.filter((n) => n !== initialValue?.group_name);
    return new Set(others.map((n) => n.toLowerCase()));
  }, [existingGroupNames, initialValue]);

  const schema = useMemo(() => {
    const shape = {
      group_name: z
        .string()
        .trim()
        .min(1, "Group name is required")
        .max(GROUP_NAME_MAX_LENGTH, `Must be ${GROUP_NAME_MAX_LENGTH} characters or fewer`)
        .refine((value) => !reservedNames.has(value.toLowerCase()), "A group with this name already exists"),
      models: z.array(z.string()).min(1, "Select at least one model"),
      routing_strategy: z.string().min(1, "Strategy is required"),
      routing_strategy_args: z.string(),
      model_priorities: z.array(z.object({ model: z.string(), priority: z.string() })),
    };
    return z.object(shape).superRefine((values, ctx) => {
      if (values.routing_strategy === "priority") return;
      const conflict = modelConflictError(values.models, groupNameByModel);
      if (conflict !== null) {
        ctx.addIssue({ code: "custom", message: conflict, path: ["models"] });
      }
    });
  }, [reservedNames, groupNameByModel]);

  const form = useZodForm(schema, { defaultValues: toRoutingGroupFormValues(initialValue, availableStrategies) });

  useEffect(() => {
    form.reset(toRoutingGroupFormValues(initialValue, availableStrategies));
  }, [open, initialValue, availableStrategies, form]);

  const selectedStrategy = useWatch({ control: form.control, name: "routing_strategy" });
  const selectedModels = useWatch({ control: form.control, name: "models" });

  const handleSubmit = async (values: z.infer<typeof schema>) => {
    const payload = buildRoutingGroupPayload(values);
    if (!payload.ok) {
      form.setError(payload.field, { message: payload.message });
      return;
    }
    await onSubmit(payload.group);
  };

  return (
    <Dialog open={open} onOpenChange={(open) => !open && onClose()}>
      <DialogContent className="max-h-[calc(100dvh-2rem)] overflow-y-auto sm:max-w-[560px]">
        <DialogHeader>
          <DialogTitle>
            {mode === "create" ? "创建路由组" : `Edit ${initialValue?.group_name ?? ""}`}
          </DialogTitle>
        </DialogHeader>
        <form onSubmit={(event) => event.preventDefault()} noValidate>
          <FieldGroup>
            <FormField
              control={form.control}
              name="group_name"
              label={"访问组名称"}
              description={"API 调用时将此名称作为模型名，LiteLLM 会将请求路由到组内某个模型。"}
            >
              {({ ref, ...field }) => <Input {...field} ref={ref} placeholder="fast-chat" disabled={mode === "edit"} />}
            </FormField>

            <FormField
              control={form.control}
              name="models"
              label={"模型"}
              description={
                selectedStrategy === "priority"
                  ? "此组将在模型列表中的所选模型之间路由。模型可属于多个优先级组。"
                  : "此组将在模型列表中的所选模型之间路由。每个模型只能属于一个非优先级组。"
              }
            >
              {({ id, value, onChange, "aria-invalid": ariaInvalid, "aria-describedby": ariaDescribedBy }) => (
                <Combobox
                  multiple
                  items={modelOptions}
                  value={value}
                  onValueChange={(models: string[]) => {
                    onChange(models);
                    form.setValue("model_priorities", prioritiesForModels(models, form.getValues("model_priorities")));
                  }}
                >
                  <ComboboxChips render={<div ref={modelsAnchor} />}>
                    <ComboboxValue>
                      {(selected: string[]) => (
                        <>
                          {selected.map((model) => (
                            <ComboboxChip key={model} aria-label={model}>
                              {model}
                            </ComboboxChip>
                          ))}
                          <ComboboxChipsInput
                            id={id}
                            aria-invalid={ariaInvalid}
                            aria-describedby={ariaDescribedBy}
                            placeholder={"选择模型"}
                          />
                        </>
                      )}
                    </ComboboxValue>
                  </ComboboxChips>
                  <ComboboxContent anchor={modelsAnchor}>
                    <ComboboxEmpty>{"未找到模型"}</ComboboxEmpty>
                    <ComboboxList>
                      {(model: string) => (
                        <ComboboxItem key={model} value={model}>
                          {model}
                        </ComboboxItem>
                      )}
                    </ComboboxList>
                  </ComboboxContent>
                </Combobox>
              )}
            </FormField>

            <FormField
              control={form.control}
              name="routing_strategy"
              label={"路由策略"}
              description={
                selectedStrategy === "priority"
                  ? "优先尝试较小的优先级值，同优先级模型共享流量，仅在调用此组时生效。"
                  : strategyDescriptions[selectedStrategy]
              }
            >
              {({ id, value, onChange, "aria-invalid": ariaInvalid, "aria-describedby": ariaDescribedBy }) => (
                <Select
                  items={strategyItems}
                  value={value}
                  onValueChange={(next: string | null) => {
                    onChange(next ?? "");
                    form.setValue(
                      "routing_strategy_args",
                      argsForStrategy(next ?? "", form.getValues("routing_strategy_args")),
                    );
                  }}
                >
                  <SelectTrigger id={id} aria-invalid={ariaInvalid} aria-describedby={ariaDescribedBy}>
                    <SelectValue placeholder={"选择策略"} />
                  </SelectTrigger>
                  <SelectContent>
                    {strategyItems.map((strategy) => (
                      <SelectItem key={strategy.value} value={strategy.value}>
                        {strategy.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              )}
            </FormField>

            {selectedStrategy === "priority" && (
              <FormField
                control={form.control}
                name="model_priorities"
                label={"模型优先级"}
                description={"首选填写 1，次选填写 2，依此类推。不可用的模型将被跳过。"}
              >
                {({ id, value, onChange, "aria-invalid": ariaInvalid, "aria-describedby": ariaDescribedBy }) => (
                  <div id={id} className="space-y-2" role="group" aria-label={"模型优先级"}>
                    {value.length === 0 && (
                      <p className="text-sm text-muted-foreground">{"选择模型以设置优先级"}</p>
                    )}
                    {value.map((entry, index) => (
                      <div key={entry.model} className="flex items-center justify-between gap-3">
                        <label htmlFor={`${id}-${index}`} className="min-w-0 flex-1 break-words text-sm">
                          {entry.model}
                          {!selectedModels.includes(entry.model) && (
                            <span className="block text-xs text-destructive">{"尚未选择模型"}</span>
                          )}
                        </label>
                        <Input
                          id={`${id}-${index}`}
                          aria-label={`Priority for ${entry.model}`}
                          aria-invalid={ariaInvalid}
                          aria-describedby={ariaDescribedBy}
                          inputMode="numeric"
                          className="w-24"
                          value={entry.priority}
                          onChange={(event) =>
                            onChange(
                              value.map((item, itemIndex) =>
                                itemIndex === index ? { ...item, priority: event.target.value } : item,
                              ),
                            )
                          }
                        />
                        {!selectedModels.includes(entry.model) && (
                          <Button
                            type="button"
                            variant="ghost"
                            size="sm"
                            aria-label={`Remove priority for ${entry.model}`}
                            onClick={() => onChange(value.filter((_, itemIndex) => itemIndex !== index))}
                          >{"移除"}</Button>
                        )}
                      </div>
                    ))}
                  </div>
                )}
              </FormField>
            )}

            {STRATEGIES_WITH_ARGS.has(selectedStrategy) && (
              <FormField
                control={form.control}
                name="routing_strategy_args"
                label={"策略参数（JSON）"}
                description={ARGS_EXAMPLES[selectedStrategy] ?? 'Example: { "ttl": 60 }'}
              >
                {({ ref, ...field }) => (
                  <Textarea {...field} ref={ref} rows={4} placeholder='{ "ttl": 3600 }' className="font-mono text-xs" />
                )}
              </FormField>
            )}

            <p className="text-xs text-muted-foreground">
              {selectedStrategy === "priority"
                ? "直接请求成员模型时仍使用原有路由行为。"
                : "不属于任何非优先级组的模型使用代理顶层路由策略。"}
            </p>
          </FieldGroup>
        </form>
        <DialogFooter>
          <Button variant="outline" onClick={onClose}>{"取消"}</Button>
          <Button onClick={() => void form.handleSubmit(handleSubmit)()} disabled={saving} aria-busy={saving}>
            {mode === "create" ? "创建访问组" : "保存更改"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};

export default RoutingGroupModal;
