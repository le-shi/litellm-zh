import React from "react";

import { Switch } from "@/components/ui/switch";

import type { ComplexityRouterConfigValue } from "./ComplexityRouterConfig";

export const ModalityRoutingControls: React.FC<{
  value: ComplexityRouterConfigValue;
  onChange: (value: ComplexityRouterConfigValue) => void;
}> = ({ value, onChange }) => {
  const modalityRouting = value.modality_routing ?? false;
  return (
    <>
      <div className="flex items-center gap-2 mb-2">
        <Switch
          checked={modalityRouting}
          onCheckedChange={(nextModalityRouting) => onChange({ ...value, modality_routing: nextModalityRouting })}
          aria-label={"将图像请求路由到支持视觉的模型"}
        />
        <strong className="font-semibold">{"将图像请求路由到支持视觉的模型"}</strong>
      </div>
      <span className="block text-xs mb-3 text-muted-foreground">{"当路由模型不支持图像输入时，改用最近的更高且支持视觉的层级，再尝试默认模型，避免提供商返回 400。仅替换明确声明 supports_vision 为 false 的模型。除非开启下方覆盖选项，否则保留的会话固定模型仍优先。"}</span>
      <div className="flex items-center gap-2 mb-2">
        <Switch
          checked={value.modality_pin_override ?? false}
          onCheckedChange={(modalityPinOverride) => onChange({ ...value, modality_pin_override: modalityPinOverride })}
          disabled={!modalityRouting}
          aria-label={"图像请求覆盖会话固定模型"}
        />
        <strong className="font-semibold">{"图像请求覆盖会话固定模型"}</strong>
      </div>
      <span className="block text-xs text-muted-foreground">{"即使会话固定在不支持图像的模型上，也将图像轮次路由到支持的模型。固定设置会保留，下一轮文本会回到原模型。需要先开启图像路由。"}</span>
    </>
  );
};
