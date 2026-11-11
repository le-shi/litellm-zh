import React, { useState, useEffect } from "react";
import { Loader2 } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { cn } from "@/lib/cva.config";
import { enableClaudeCodePlugin, disableClaudeCodePlugin } from "../networking";
import { toast } from "@/lib/toast";
import { Plugin } from "./types";

const STEP_TITLES = ["Select Skills", "Confirm"];

interface MakeSkillPublicFormProps {
  visible: boolean;
  onClose: () => void;
  accessToken: string;
  skillsList: Plugin[];
  onSuccess: () => void;
}

const MakeSkillPublicForm: React.FC<MakeSkillPublicFormProps> = ({
  visible,
  onClose,
  accessToken,
  skillsList,
  onSuccess,
}) => {
  const [currentStep, setCurrentStep] = useState(0);
  const [selectedSkills, setSelectedSkills] = useState<Set<string>>(new Set());
  const [loading, setLoading] = useState(false);

  const handleClose = () => {
    setCurrentStep(0);
    setSelectedSkills(new Set());
    onClose();
  };

  const handleNext = () => {
    if (selectedSkills.size === 0) {
      toast.fromError("Please select at least one skill");
      return;
    }
    setCurrentStep(1);
  };

  const handleSkillSelection = (name: string, checked: boolean) => {
    const next = new Set(selectedSkills);
    if (checked) {
      next.add(name);
    } else {
      next.delete(name);
    }
    setSelectedSkills(next);
  };

  const handleSelectAll = (checked: boolean) => {
    if (checked) {
      setSelectedSkills(new Set(skillsList.map((s) => s.name)));
    } else {
      setSelectedSkills(new Set());
    }
  };

  // Pre-check already-published skills when modal opens
  useEffect(() => {
    if (visible && skillsList.length > 0) {
      setSelectedSkills(new Set(skillsList.filter((s) => s.enabled).map((s) => s.name)));
    }
  }, [visible, skillsList]);

  const handleSubmit = async () => {
    if (selectedSkills.size === 0) {
      toast.fromError("Please select at least one skill");
      return;
    }

    setLoading(true);
    try {
      const selectedSet = selectedSkills;
      await Promise.all(
        skillsList.map((skill) => {
          const shouldBePublic = selectedSet.has(skill.name);
          if (shouldBePublic && !skill.enabled) {
            return enableClaudeCodePlugin(accessToken, skill.name);
          }
          if (!shouldBePublic && skill.enabled) {
            return disableClaudeCodePlugin(accessToken, skill.name);
          }
          return Promise.resolve();
        }),
      );

      toast.success(`Skill Hub updated — ${selectedSkills.size} skill(s) published`);
      handleClose();
      onSuccess();
    } catch (error) {
      console.error("Error publishing skills:", error);
      toast.fromError("Failed to update skills. Please try again.");
    } finally {
      setLoading(false);
    }
  };

  const allSelected = skillsList.length > 0 && skillsList.every((s) => selectedSkills.has(s.name));
  const isIndeterminate = selectedSkills.size > 0 && !allSelected;

  const renderStep1 = () => (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h3 className="text-lg font-semibold">{"选择要发布的技能"}</h3>
        <label className="flex items-center gap-2 text-sm">
          <Checkbox
            checked={allSelected}
            indeterminate={isIndeterminate}
            onCheckedChange={(checked) => handleSelectAll(checked === true)}
            disabled={skillsList.length === 0}
          />{"全选（"}{skillsList.length})
        </label>
      </div>

      <p className="text-sm text-muted-foreground">{"所选技能将在技能中心对所有用户可见，取消选择的技能将被取消发布。"}</p>

      <div className="max-h-96 overflow-y-auto border rounded-lg p-4">
        <div className="space-y-3">
          {skillsList.length === 0 ? (
            <div className="text-center py-8 text-muted-foreground">
              <p>{"尚未注册技能。"}</p>
            </div>
          ) : (
            skillsList.map((skill) => (
              <div key={skill.name} className="flex items-center space-x-3 p-3 border rounded-lg hover:bg-accent">
                <Checkbox
                  aria-label={skill.name}
                  checked={selectedSkills.has(skill.name)}
                  onCheckedChange={(checked) => handleSkillSelection(skill.name, checked === true)}
                />
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2">
                    <p className="font-medium font-mono text-sm break-words">{skill.name}</p>
                    {skill.enabled && <Badge variant="secondary">{"公开"}</Badge>}
                  </div>
                  {skill.description && (
                    <p className="text-xs text-muted-foreground truncate max-w-sm">{skill.description}</p>
                  )}
                </div>
                {skill.domain && <Badge variant="outline">{skill.domain}</Badge>}
              </div>
            ))
          )}
        </div>
      </div>

      {selectedSkills.size > 0 && (
        <div className="bg-info/10 border border-info/20 rounded-lg p-3">
          <p className="text-sm text-info">
            <strong>{selectedSkills.size}</strong>{" 项技能"}{selectedSkills.size !== 1 ? "s" : ""}{" 将被发布"}</p>
        </div>
      )}
    </div>
  );

  const renderStep2 = () => (
    <div className="space-y-4">
      <h3 className="text-lg font-semibold">{"确认发布到技能中心"}</h3>

      <div className="bg-warning/10 border border-warning/20 rounded-lg p-4">
        <p className="text-sm text-warning">
          <strong>{"注意："}</strong>{" 已发布的技能对技能中心中的所有用户可见，不在下方列表中的技能将被取消发布。"}</p>
      </div>

      <div className="space-y-3">
        <p className="font-medium">{"待发布技能："}</p>
        <div className="max-h-48 overflow-y-auto border rounded-lg p-3">
          <div className="space-y-2">
            {Array.from(selectedSkills).map((name) => {
              const skill = skillsList.find((s) => s.name === name);
              return (
                <div key={name} className="flex items-center justify-between gap-2 p-2 bg-muted rounded-sm">
                  <p className="font-mono text-sm min-w-0 break-words">{name}</p>
                  {skill?.domain && <Badge variant="outline">{skill.domain}</Badge>}
                </div>
              );
            })}
          </div>
        </div>
      </div>

      <div className="bg-info/10 border border-info/20 rounded-lg p-3">
        <p className="text-sm text-info">{"总计： "}<strong>{selectedSkills.size}</strong>{" 项技能"}{selectedSkills.size !== 1 ? "s" : ""}{" 将被发布"}</p>
      </div>
    </div>
  );

  return (
    <Dialog open={visible} onOpenChange={(open) => !open && handleClose()} disablePointerDismissal>
      <DialogContent className="max-h-[calc(100dvh-2rem)] overflow-y-auto sm:max-w-[700px]">
        <DialogHeader>
          <DialogTitle>{"发布到技能中心"}</DialogTitle>
        </DialogHeader>

        <div>
          <ol className="mb-6 flex items-center gap-6">
            {STEP_TITLES.map((title, index) => (
              <li
                key={title}
                className="flex items-center gap-2"
                aria-current={currentStep === index ? "step" : undefined}
              >
                <span
                  className={cn(
                    "flex size-6 items-center justify-center rounded-full border text-xs",
                    currentStep === index
                      ? "border-primary bg-primary text-primary-foreground"
                      : "border-border text-muted-foreground",
                  )}
                >
                  {index + 1}
                </span>
                <span className={cn("text-sm", currentStep === index ? "font-medium" : "text-muted-foreground")}>
                  {title}
                </span>
              </li>
            ))}
          </ol>

          {currentStep === 0 ? renderStep1() : renderStep2()}

          <div className="flex justify-between mt-6">
            <Button variant="outline" onClick={currentStep === 0 ? handleClose : () => setCurrentStep(0)}>
              {currentStep === 0 ? "取消" : "上一步"}
            </Button>
            <div className="flex space-x-2">
              {currentStep === 0 && (
                <Button onClick={handleNext} disabled={selectedSkills.size === 0}>{"下一步"}</Button>
              )}
              {currentStep === 1 && (
                <Button onClick={handleSubmit} disabled={loading}>
                  {loading && <Loader2 className="size-4 animate-spin" />}{"发布到中心"}</Button>
              )}
            </div>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
};

export default MakeSkillPublicForm;
