"use client";

import { MCPServer } from "@/components/mcp_tools/types";

export interface RequiredFieldDef {
  key: string;
  label: string;
  description: string;
  check: (server: MCPServer) => boolean;
}

export interface FieldGroup {
  label: string;
  fields: RequiredFieldDef[];
}

export const FIELD_GROUPS: FieldGroup[] = [
  {
    label: "文档",
    fields: [
      {
        key: "description",
        label: "描述",
        description: "必须填写非空描述",
        check: (s) => !!s.description?.trim(),
      },
      {
        key: "alias",
        label: "别名",
        description: "必须填写显示别名",
        check: (s) => !!s.alias?.trim(),
      },
    ],
  },
  {
    label: "来源",
    fields: [
      {
        key: "source_url",
        label: "GitHub / 源码地址",
        description: "必须提供源码仓库链接",
        check: (s) => !!s.source_url?.trim(),
      },
    ],
  },
  {
    label: "连接",
    fields: [
      {
        key: "url",
        label: "服务器地址",
        description: "必须配置服务器地址",
        check: (s) => !!s.url?.trim(),
      },
    ],
  },
  {
    label: "安全",
    fields: [
      {
        key: "auth_type",
        label: "已配置认证",
        description: "必须启用认证，不能设为 none",
        check: (s) => !!s.auth_type && s.auth_type !== "none",
      },
    ],
  },
];

export const MCP_REQUIRED_FIELD_DEFS: RequiredFieldDef[] = FIELD_GROUPS.flatMap((g) => g.fields);

export const SETTINGS_KEY = "mcp_required_fields";
