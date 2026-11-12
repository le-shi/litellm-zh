import React, { useEffect, useMemo, useState } from "react";
import { FormProvider, useForm } from "react-hook-form";
import { Button } from "@/components/ui/button";
import { UiLoadingSpinner } from "@/components/ui/ui-loading-spinner";
import { toast } from "@/lib/toast";
import { StatusBadge } from "@/components/shared/table_cells/status_badge";
import {
  useCoordinationRedisSettings,
  useTestCoordinationRedisConnection,
  useUpdateCoordinationRedisSettings,
} from "@/app/(dashboard)/hooks/coordinationRedis/useCoordinationRedisSettings";
import CoordinationRedisFieldSection from "./CoordinationRedisFieldSection";
import CoordinationRedisTypeSelector from "./CoordinationRedisTypeSelector";
import { COORDINATION_FIELDS, CoordinationRedisType } from "./coordinationRedisFields";
import {
  buildCoordinationPayload,
  buildInitialValues,
  configuredSecretFields,
  CoordinationFormValues,
  inferRedisType,
  isFieldVisible,
  sourceBadge,
} from "./coordinationRedisUtils";

const CoordinationRedisSettings: React.FC = () => {
  const form = useForm<CoordinationFormValues>({ defaultValues: buildInitialValues({}) });
  const [selectedRedisType, setSelectedRedisType] = useState<CoordinationRedisType | null>(null);

  const { data, isLoading, isError } = useCoordinationRedisSettings();
  const updateSettings = useUpdateCoordinationRedisSettings();
  const testConnection = useTestCoordinationRedisConnection();

  const redisType = selectedRedisType ?? inferRedisType(data?.values ?? {});

  useEffect(() => {
    if (data) {
      form.reset(buildInitialValues(data.values));
    }
  }, [data, form]);

  useEffect(() => {
    if (isError) {
      toast.fromError("Failed to load coordination Redis settings");
    }
  }, [isError]);

  const validate = (): CoordinationFormValues | null => {
    const values = form.getValues();
    const failures = COORDINATION_FIELDS.filter((field) => isFieldVisible(field, redisType)).flatMap((field) => {
      const message = field.rules?.map((rule) => rule(values[field.name])).find((result) => result !== null);
      return message === undefined || message === null ? [] : [[field.name, message] as const];
    });

    form.clearErrors();
    failures.forEach(([name, message]) => form.setError(name, { message }));
    return failures.length > 0 ? null : values;
  };

  const handleTestConnection = async () => {
    const values = validate();
    if (values === null) {
      return;
    }

    try {
      const result = await testConnection.mutateAsync(buildCoordinationPayload(redisType, values));
      if (result.status === "healthy") {
        toast.success("协调 Redis 连接测试成功！");
      } else {
        toast.fromError(`Connection test failed: ${result.error ?? "Unknown error"}`);
      }
    } catch (error) {
      toast.fromError(`Connection test failed: ${error instanceof Error ? error.message : "Unknown error"}`);
    }
  };

  const handleSaveChanges = async () => {
    const values = validate();
    if (values === null) {
      return;
    }

    try {
      await updateSettings.mutateAsync(buildCoordinationPayload(redisType, values));
      toast.success("协调 Redis 设置已保存，重启代理后生效。");
    } catch {
      toast.fromError("Failed to update coordination Redis settings");
    }
  };

  const badge = sourceBadge(data?.source);
  const configuredSecrets = useMemo(() => configuredSecretFields(data?.values ?? {}), [data]);

  return (
    <div className="w-full space-y-8 py-2">
      <FormProvider {...form}>
        <form onSubmit={(event) => event.preventDefault()} className="space-y-6">
          <div className="max-w-3xl space-y-2">
            <div className="flex items-center gap-3">
              <h3 className="text-sm font-medium text-foreground">{"协调 Redis"}</h3>
              {!isLoading && (
                <StatusBadge tone={badge.tone} label={badge.label} dataTestId="coordination-redis-source" />
              )}
            </div>
            <p className="text-xs text-muted-foreground">{"用于跨代理实例协调的 Redis，负责跨实例速率限制、费用跟踪和实例锁管理，与响应缓存独立配置。"}</p>
            <p className="text-xs text-muted-foreground">{badge.tooltip}</p>
            <p className="text-xs text-warning">{"保存的变更在代理重启后生效。"}</p>
          </div>

          <CoordinationRedisTypeSelector redisType={redisType} onTypeChange={setSelectedRedisType} />

          <div className="pt-4 border-t border-border">
            <CoordinationRedisFieldSection
              title={"连接设置"}
              section="connection"
              redisType={redisType}
              configuredSecrets={configuredSecrets}
            />
          </div>

          {redisType === "cluster" && (
            <div className="pt-4 border-t border-border">
              <CoordinationRedisFieldSection
                title={"集群配置"}
                section="cluster"
                redisType={redisType}
                configuredSecrets={configuredSecrets}
                gridCols="grid-cols-1 gap-6"
              />
            </div>
          )}

          {redisType === "sentinel" && (
            <div className="pt-4 border-t border-border">
              <CoordinationRedisFieldSection
                title={"Sentinel 配置"}
                section="sentinel"
                redisType={redisType}
                configuredSecrets={configuredSecrets}
              />
            </div>
          )}

          <div className="pt-4 border-t border-border">
            <CoordinationRedisFieldSection
              title={"SSL 设置"}
              section="ssl"
              redisType={redisType}
              configuredSecrets={configuredSecrets}
            />
          </div>
        </form>
      </FormProvider>

      <div className="border-t border-border pt-6 flex justify-end gap-3">
        <Button variant="outline" onClick={handleTestConnection} disabled={testConnection.isPending}>
          {testConnection.isPending && <UiLoadingSpinner className="size-4" />}
          {testConnection.isPending ? "正在测试..." : "测试连接"}
        </Button>
        <Button onClick={handleSaveChanges} disabled={updateSettings.isPending}>
          {updateSettings.isPending && <UiLoadingSpinner className="size-4" />}
          {updateSettings.isPending ? "正在保存…" : "保存更改"}
        </Button>
      </div>
    </div>
  );
};

export default CoordinationRedisSettings;
