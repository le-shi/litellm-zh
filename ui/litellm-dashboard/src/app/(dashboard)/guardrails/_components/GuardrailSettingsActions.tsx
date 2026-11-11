import { Code, Trash2 } from "lucide-react";
import React, { useState } from "react";
import { Button } from "@/components/ui/button";
import { DeletableGuardrail, GuardrailDeleteModal } from "./GuardrailDeleteModal";

interface GuardrailSettingsActionsProps {
  guardrail: DeletableGuardrail & { guardrail_definition_location?: string };
  isEditing: boolean;
  onEdit: () => void;
  onEditCode: () => void;
  accessToken: string | null;
  onDeleted: () => void;
}

export function GuardrailSettingsActions({
  guardrail,
  isEditing,
  onEdit,
  onEditCode,
  accessToken,
  onDeleted,
}: GuardrailSettingsActionsProps) {
  const [isModalOpen, setIsModalOpen] = useState(false);

  if (isEditing || guardrail.guardrail_definition_location === "config") return null;

  return (
    <>
      {guardrail.litellm_params?.guardrail === "custom_code" ? (
        <Button variant="outline" onClick={onEditCode}>
          <Code />{"编辑代码"}</Button>
      ) : (
        <Button variant="outline" onClick={onEdit}>{"编辑设置"}</Button>
      )}
      <Button variant="destructive" onClick={() => setIsModalOpen(true)}>
        <Trash2 />{"删除"}</Button>
      <GuardrailDeleteModal
        guardrail={isModalOpen ? guardrail : null}
        accessToken={accessToken}
        onClose={() => setIsModalOpen(false)}
        onDeleted={onDeleted}
      />
    </>
  );
}
