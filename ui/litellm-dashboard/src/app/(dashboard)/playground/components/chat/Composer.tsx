"use client";

import { useRef, type DragEvent, type KeyboardEvent, type MouseEvent, type ReactNode, type RefObject } from "react";
import { ArrowUp, Code2, Database, Paperclip, Shield, Square } from "lucide-react";
import { EndpointType } from "@/components/chat_ui/mode_endpoint_mapping";
import MCPToolArgumentsForm, { type MCPToolArgumentsFormRef } from "@/components/mcp_tools/MCPToolArgumentsForm";
import type { MCPTool } from "@/components/mcp_tools/types";
import { InputGroup, InputGroupAddon, InputGroupButton, InputGroupTextarea } from "@/components/ui/input-group";
import { Toggle } from "@/components/ui/toggle";
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip";
import { DraftAttachments } from "./ComposerControls";
import type { DraftFile } from "./composerFiles";
import { ACCEPT_FOR, ATTACH_LABEL, type Capabilities } from "./endpointCapabilities";
import { ChecklistMenu, type OptionGroup } from "./Pickers";

export type ChecklistProps = Readonly<{
  groups: readonly OptionGroup[];
  value: readonly string[];
  onValueChange: (value: readonly string[]) => void;
  isLoading: boolean;
}>;

export type DraftState = Readonly<{
  text: string;
  setText: (text: string) => void;
  files: readonly DraftFile[];
  attach: (files: readonly File[]) => void;
  removeFile: (index: number) => void;
  isLoading: boolean;
  send: () => Promise<void>;
  cancel: () => void;
}>;

function AttachButton({
  capabilities,
  attach,
}: {
  capabilities: Capabilities;
  attach: (files: readonly File[]) => void;
}) {
  const input = useRef<HTMLInputElement>(null);
  if (!capabilities.attach) return null;
  const label = ATTACH_LABEL[capabilities.attach];
  return (
    <>
      <Tooltip>
        <TooltipTrigger
          render={<InputGroupButton size="icon-xs" aria-label={label} onClick={() => input.current?.click()} />}
        >
          <Paperclip />
        </TooltipTrigger>
        <TooltipContent>{label}</TooltipContent>
      </Tooltip>
      <input
        ref={input}
        type="file"
        className="sr-only"
        tabIndex={-1}
        aria-hidden
        accept={ACCEPT_FOR[capabilities.attach]}
        multiple={capabilities.attach === "images"}
        onChange={(event) => {
          attach(Array.from(event.target.files ?? []));
          event.target.value = "";
        }}
      />
    </>
  );
}

function SendButton({ draft, disabled }: { draft: DraftState; disabled: boolean }) {
  if (draft.isLoading)
    return (
      <InputGroupButton size="icon-xs" variant="default" aria-label={"停止"} onClick={draft.cancel}>
        <Square className="fill-current" />
      </InputGroupButton>
    );
  return (
    <InputGroupButton
      size="icon-xs"
      variant="default"
      aria-label={"发送消息"}
      disabled={disabled}
      onClick={() => void draft.send()}
    >
      <ArrowUp />
    </InputGroupButton>
  );
}

export function Composer({
  capabilities,
  endpoint,
  targetRow,
  draft,
  directTool,
  toolArgsForm,
  mcpControl,
  vectorStores,
  guardrails,
  codeInterpreter,
  settingsControl,
  sendDisabled,
}: {
  capabilities: Capabilities;
  endpoint: EndpointType;
  targetRow: ReactNode;
  draft: DraftState;
  directTool: MCPTool | null;
  toolArgsForm: RefObject<MCPToolArgumentsFormRef | null>;
  mcpControl: ReactNode;
  vectorStores: ChecklistProps;
  guardrails: ChecklistProps;
  codeInterpreter: Readonly<{ enabled: boolean; onToggle: (enabled: boolean) => void }>;
  settingsControl: ReactNode;
  sendDisabled: boolean;
}) {
  const isDirectCall = endpoint === EndpointType.MCP;
  const isRealtime = endpoint === EndpointType.REALTIME;
  const message = useRef<HTMLTextAreaElement>(null);
  const focusMessage = (event: MouseEvent<HTMLDivElement>) => {
    const target = event.target as HTMLElement;
    if (!event.currentTarget.contains(target) || target.closest("button, input, textarea")) return;
    message.current?.focus();
  };
  const handleDrop = (event: DragEvent<HTMLDivElement>) => {
    if (!capabilities.attach) return;
    event.preventDefault();
    draft.attach(Array.from(event.dataTransfer.files));
  };
  const handleKeyDown = (event: KeyboardEvent<HTMLTextAreaElement>) => {
    if (event.key !== "Enter" || event.shiftKey || event.nativeEvent.isComposing) return;
    event.preventDefault();
    if (!sendDisabled) void draft.send();
  };
  const directCallBody = (
    <div data-slot="input-group-control" className="w-full px-3 py-3">
      {directTool ? (
        <MCPToolArgumentsForm ref={toolArgsForm} tool={directTool} className="flex flex-col gap-3" />
      ) : (
        <p className="text-sm text-muted-foreground">{"在上方选择服务器和工具，以填写参数"}</p>
      )}
    </div>
  );
  const textBody = (
    <InputGroupTextarea
      ref={message}
      value={draft.text}
      onChange={(event) => draft.setText(event.target.value)}
      onKeyDown={handleKeyDown}
      placeholder={capabilities.placeholder}
      rows={2}
      aria-label={"消息"}
      className="max-h-60"
    />
  );
  return (
    <InputGroup onDragOver={(event) => capabilities.attach && event.preventDefault()} onDrop={handleDrop}>
      <InputGroupAddon align="block-start" className="gap-1 border-b border-border pb-2" onClick={focusMessage}>
        {targetRow}
      </InputGroupAddon>
      {draft.files.length > 0 && (
        <InputGroupAddon align="block-start" className="pt-2" onClick={focusMessage}>
          <DraftAttachments files={draft.files} onRemove={draft.removeFile} />
        </InputGroupAddon>
      )}
      {!isRealtime && (isDirectCall ? directCallBody : textBody)}
      <InputGroupAddon align="block-end" className="gap-1" onClick={focusMessage}>
        {capabilities.mcp && mcpControl}
        {capabilities.vectorStores && (
          <ChecklistMenu label={"向量存储"} icon={<Database />} emptyText={"暂无向量存储"} {...vectorStores} />
        )}
        {capabilities.guardrails && (
          <ChecklistMenu label={"安全防护规则"} icon={<Shield />} emptyText={"暂无防护规则"} {...guardrails} />
        )}
        {capabilities.codeInterpreter && (
          <Toggle
            size="sm"
            pressed={codeInterpreter.enabled}
            onPressedChange={codeInterpreter.onToggle}
            aria-label={"代码解释器"}
            className="h-6 gap-1 px-1.5 text-xs"
          >
            <Code2 />{"代码解释器"}</Toggle>
        )}
        <span className="ml-auto flex items-center gap-1">
          {settingsControl}
          <AttachButton capabilities={capabilities} attach={draft.attach} />
          {!isRealtime && <SendButton draft={draft} disabled={sendDisabled} />}
        </span>
      </InputGroupAddon>
    </InputGroup>
  );
}
