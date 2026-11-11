import React from "react";
import { SearchSelect } from "@/components/shared/SearchSelect";
import { ProjectResponse } from "@/app/(dashboard)/hooks/projects/useProjects";

interface ProjectDropdownProps {
  projects?: ProjectResponse[] | null;
  value?: string | null;
  onChange?: (value: string | null) => void;
  disabled?: boolean;
  loading?: boolean;
  /** When set, only show projects belonging to this team */
  teamId?: string | null;
  id?: string;
}

const ProjectDropdown: React.FC<ProjectDropdownProps> = ({
  projects,
  value,
  onChange,
  disabled,
  loading,
  teamId,
  id,
}) => {
  const filtered = teamId ? projects?.filter((p) => p.team_id === teamId) : projects;

  return (
    <SearchSelect
      options={
        loading
          ? []
          : (filtered ?? []).map((project) => ({
              label: project.project_alias || project.project_id,
              value: project.project_id,
              sublabel: project.project_id,
            }))
      }
      value={value}
      onValueChange={(projectId) => onChange?.(projectId)}
      placeholder={"搜索或选择项目"}
      emptyText={loading ? "正在加载项目…" : "未找到项目"}
      disabled={disabled}
      inputId={id}
    />
  );
};

export default ProjectDropdown;
