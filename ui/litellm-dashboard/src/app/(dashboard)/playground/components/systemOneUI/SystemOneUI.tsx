"use client";

import { Button, buttonVariants } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { SimpleTooltip } from "@/components/ui/tooltip";
import { SearchSelect } from "@/components/shared/SearchSelect";
import { cn } from "@/lib/cva.config";
import { DECISIONS_DOCS_URL } from "@/lib/decisionModels";
import { getGatewayBaseUrl, getGlobalLitellmHeaderName } from "@/components/networking";
import { uiHref } from "@/utils/uiHref";
import { useMutation } from "@tanstack/react-query";
import { BookOpen, ChevronDown, Eraser, FileText, LoaderCircle, Send } from "lucide-react";
import { useEffect, useMemo, useRef, useState, type ReactNode } from "react";
import { makePlaygroundDecisionRequest, type PlaygroundDecisionRequest } from "../../llm_calls/system_one";
import { DECISION_PRESETS, emptyPayload, presetPayload } from "./lib/example";
import { payloadModel, withPayloadModel } from "./lib/payloadModel";
import CurlPreview from "./CurlPreview";
import ResponseView from "./ResponseView";
import { ValidationSummary } from "./ValidationFeedback";
import SystemOneForm from "./SystemOneForm";
import OpenAIDecisionsForm from "./OpenAIDecisionsForm";
import { validateSystemOnePayload, validateOpenAIDecisionsPayload, errorCount } from "./lib/validatePayload";
import { useDecisionModels, type ApiKeySource } from "./useDecisionModels";

interface SystemOneUIProps {
  accessToken: string | null;
  disabledPersonalKeyCreation?: boolean;
}

type EditorView = "form" | "curl";

interface SystemOneSendVariables {
  request: PlaygroundDecisionRequest;
  apiKey: string;
  signal: AbortSignal;
}

function SetupField({ label, htmlFor, children }: { label: string; htmlFor: string; children: ReactNode }) {
  return (
    <div className="grid min-w-0 content-start gap-1.5">
      <label htmlFor={htmlFor} className="text-xs font-medium text-muted-foreground">
        {label}
      </label>
      {children}
    </div>
  );
}

function ExamplesMenu({ onPick }: { onPick: (id: string) => void }) {
  return (
    <DropdownMenu>
      <DropdownMenuTrigger className={cn(buttonVariants({ variant: "outline", size: "sm" }))}>
        <FileText className="text-muted-foreground" />{"加载示例"}<ChevronDown className="text-muted-foreground" />
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="w-48">
        {DECISION_PRESETS.map((preset) => (
          <DropdownMenuItem key={preset.id} onClick={() => onPick(preset.id)}>
            {preset.label}
          </DropdownMenuItem>
        ))}
      </DropdownMenuContent>
    </DropdownMenu>
  );
}

function getCustomProxyBaseUrl(): string | undefined {
  return typeof window === "undefined" ? undefined : window.sessionStorage.getItem("customProxyBaseUrl") || undefined;
}

export default function SystemOneUI({ accessToken, disabledPersonalKeyCreation = false }: SystemOneUIProps) {
  const [apiKeySource, setApiKeySource] = useState<ApiKeySource>(disabledPersonalKeyCreation ? "custom" : "session");
  const [customApiKey, setCustomApiKey] = useState("");
  const effectiveApiKey = apiKeySource === "session" ? accessToken || "" : customApiKey.trim();
  const { decisionModels, isLoaded: decisionModelsLoaded } = useDecisionModels(
    apiKeySource,
    effectiveApiKey,
    getCustomProxyBaseUrl(),
  );
  const [endpoint, setEndpoint] = useState<PlaygroundDecisionRequest["endpoint"]>("/v1/systemone");
  const [drafts, setDrafts] = useState<Partial<Record<PlaygroundDecisionRequest["endpoint"], string>>>({});
  const [view, setView] = useState<EditorView>("form");
  const rawPayload = drafts[endpoint] ?? emptyPayload(endpoint, decisionModels[0]);
  const draftModel = drafts[endpoint] === undefined ? decisionModels[0] : payloadModel(rawPayload);
  const clearedPayload = emptyPayload(endpoint, draftModel);
  const activeController = useRef<AbortController | null>(null);
  const validated = useMemo(
    () =>
      endpoint === "/v1/decisions"
        ? ({ endpoint, validation: validateOpenAIDecisionsPayload(rawPayload) } as const)
        : ({ endpoint, validation: validateSystemOnePayload(rawPayload, endpoint) } as const),
    [rawPayload, endpoint],
  );
  const validation = validated.validation;

  const systemOne = useMutation({
    mutationFn: ({ request, apiKey, signal }: SystemOneSendVariables) =>
      makePlaygroundDecisionRequest(request, apiKey, getCustomProxyBaseUrl(), { signal }),
  });
  const isLoading = systemOne.isPending;
  const { reset: resetSystemOne } = systemOne;

  useEffect(() => () => activeController.current?.abort(), []);

  useEffect(() => {
    activeController.current?.abort();
    activeController.current = null;
    resetSystemOne();
  }, [effectiveApiKey, resetSystemOne]);

  function clearRequestState() {
    activeController.current?.abort();
    activeController.current = null;
    systemOne.reset();
  }

  function handleReset() {
    handlePayloadChange(presetPayload(DECISION_PRESETS[0], endpoint, draftModel ?? decisionModels[0]));
  }

  function handlePayloadChange(value: string) {
    if (value !== rawPayload) {
      clearRequestState();
      setDrafts((current) => ({ ...current, [endpoint]: value }));
    }
  }

  function handlePresetPick(id: string) {
    const preset = DECISION_PRESETS.find((candidate) => candidate.id === id);
    if (preset !== undefined) {
      handlePayloadChange(presetPayload(preset, endpoint, draftModel));
    }
  }

  function handleModelPick(model: string | null) {
    const next = model === null ? undefined : withPayloadModel(rawPayload, model);
    if (next !== undefined) {
      handlePayloadChange(next);
    }
  }

  function handleSend() {
    const request: PlaygroundDecisionRequest | undefined =
      validated.endpoint === "/v1/decisions"
        ? validated.validation.payload && { endpoint: validated.endpoint, payload: validated.validation.payload }
        : validated.validation.payload && { endpoint: validated.endpoint, payload: validated.validation.payload };
    if (!request || !effectiveApiKey) {
      return;
    }
    clearRequestState();
    setDrafts((current) => ({ ...current, [endpoint]: rawPayload }));
    const controller = new AbortController();
    activeController.current = controller;
    const variables = { request, apiKey: effectiveApiKey, signal: controller.signal };
    systemOne.mutate(variables);
  }

  return (
    <div className="flex h-full min-h-0 flex-col overflow-auto p-4 xl:overflow-hidden">
      <div className="mx-auto grid w-full max-w-[1400px] gap-4 xl:min-h-0 xl:flex-1 xl:grid-cols-[minmax(0,11fr)_minmax(0,9fr)]">
        <section className="flex min-h-96 flex-col gap-4 xl:min-h-0" aria-label={"决策请求编辑器"}>
          <div className="grid gap-3 rounded-lg border bg-card p-3 sm:grid-cols-3">
            <SetupField label={"端点"} htmlFor="decision-endpoint">
              <Select
                value={endpoint}
                onValueChange={(value) => {
                  if (value === "/v1/decisions" || value === "/v1/systemone") {
                    clearRequestState();
                    setEndpoint(value);
                  }
                }}
              >
                <SelectTrigger id="decision-endpoint" className="w-full" aria-label={"决策端点"}>
                  <SelectValue>{endpoint}</SelectValue>
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="/v1/decisions">/v1/decisions</SelectItem>
                  <SelectItem value="/v1/systemone">/v1/systemone</SelectItem>
                </SelectContent>
              </Select>
            </SetupField>
            <SetupField label={"模型"} htmlFor="decision-model">
              <SearchSelect
                id="decision-model"
                aria-label={"决策模型"}
                options={decisionModels.map((model) => ({ label: model, value: model }))}
                value={payloadModel(rawPayload) ?? null}
                onValueChange={handleModelPick}
                placeholder={decisionModels.length > 0 ? "选择决策模型" : "暂无决策模型"}
                emptyText={"未找到决策模型"}
                allowClear={false}
              />
              {decisionModelsLoaded && decisionModels.length === 0 && (
                <a href={uiHref("models-and-endpoints")} className="text-xs text-primary underline">{"添加决策模型"}</a>
              )}
            </SetupField>
            <SetupField label={"API 密钥"} htmlFor="decision-key-source">
              <Select
                value={apiKeySource}
                onValueChange={(value) => {
                  if (value === "session" || value === "custom") {
                    setApiKeySource(value);
                  }
                }}
                disabled={disabledPersonalKeyCreation}
              >
                <SelectTrigger id="decision-key-source" className="w-full" aria-label={"虚拟密钥来源"}>
                  <SelectValue>{apiKeySource === "custom" ? "虚拟密钥" : "当前界面会话"}</SelectValue>
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="session" disabled={!accessToken}>{"当前界面会话"}</SelectItem>
                  <SelectItem value="custom">{"虚拟密钥"}</SelectItem>
                </SelectContent>
              </Select>
              {apiKeySource === "custom" && (
                <Input
                  type="password"
                  aria-label={"虚拟密钥"}
                  value={customApiKey}
                  onChange={(event) => setCustomApiKey(event.target.value)}
                  placeholder={"输入虚拟密钥"}
                />
              )}
            </SetupField>
          </div>

          <Tabs
            role="group"
            aria-label={"请求编辑器"}
            value={view}
            onValueChange={(value) => (value === "form" || value === "curl") && setView(value)}
            className={cn(
              "flex min-h-0 flex-1 flex-col gap-0 overflow-hidden rounded-lg border bg-card",
              !validation.isValid && "border-destructive/60",
            )}
          >
            <div className="flex flex-wrap items-center justify-between gap-2 border-b px-3 py-2">
              <TabsList aria-label={"请求编辑器视图"}>
                <TabsTrigger value="form">{"表单"}</TabsTrigger>
                <TabsTrigger value="curl">cURL</TabsTrigger>
              </TabsList>
              <div className="flex items-center gap-2">
                <ExamplesMenu onPick={handlePresetPick} />
                <SimpleTooltip content="Clear form">
                  <Button
                    variant="ghost"
                    size="icon"
                    aria-label={"清空表单"}
                    className="hover:text-destructive"
                    onClick={() => handlePayloadChange(clearedPayload)}
                    disabled={rawPayload === clearedPayload || isLoading}
                  >
                    <Eraser />
                  </Button>
                </SimpleTooltip>
                <SimpleTooltip content="How to call /v1/decisions and /v1/systemone">
                  <a
                    href={DECISIONS_DOCS_URL}
                    target="_blank"
                    rel="noopener noreferrer"
                    aria-label={"如何调用 /v1/decisions 和 /v1/systemone"}
                    className={cn(buttonVariants({ variant: "ghost", size: "icon" }), "shrink-0")}
                  >
                    <BookOpen />
                  </a>
                </SimpleTooltip>
              </div>
            </div>
            <TabsContent value="form" className="flex min-h-0 flex-1 flex-col">
              {validated.endpoint === "/v1/decisions" ? (
                <OpenAIDecisionsForm
                  value={rawPayload}
                  onChange={handlePayloadChange}
                  validation={validated.validation}
                  onReset={handleReset}
                />
              ) : (
                <SystemOneForm
                  value={rawPayload}
                  onChange={handlePayloadChange}
                  validation={validated.validation}
                  onReset={handleReset}
                />
              )}
            </TabsContent>
            <TabsContent value="curl" className="flex min-h-0 flex-1 flex-col">
              <CurlPreview
                baseUrl={getCustomProxyBaseUrl() ?? getGatewayBaseUrl()}
                endpoint={endpoint}
                payload={validation.payload === undefined ? rawPayload : JSON.stringify(validation.payload)}
                authHeaderName={getGlobalLitellmHeaderName()}
                errorCount={errorCount(validation)}
              />
            </TabsContent>
            <div
              role="toolbar"
              aria-label={"请求操作"}
              className="flex flex-wrap items-center justify-between gap-3 border-t bg-muted/50 px-4 py-3"
            >
              <ValidationSummary validation={validation} />
              <div className="flex items-center gap-2">
                {isLoading && (
                  <Button variant="outline" onClick={clearRequestState}>{"取消请求"}</Button>
                )}
                <Button size="sm" onClick={handleSend} disabled={!validation.isValid || isLoading || !effectiveApiKey}>
                  {isLoading ? <LoaderCircle className="animate-spin" /> : <Send />}{"发送"}</Button>
              </div>
            </div>
          </Tabs>
        </section>

        <section className="grid content-start gap-4 xl:min-h-0 xl:overflow-auto" aria-label={"决策结果"}>
          <ResponseView
            response={systemOne.data?.response}
            view={view}
            fallbackModel={validation.payload?.model}
            latencyMs={systemOne.data?.latencyMs}
            error={systemOne.error?.message}
            isLoading={isLoading}
          />
        </section>
      </div>
    </div>
  );
}
