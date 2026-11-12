import type { ReactNode } from "react";
import { formatExpiryDate, getDaysUntilExpiration } from "@/utils/licenseUtils";

const LICENSE_EXPIRY_PREFIX = "license_expiry:";
const SALES_EMAIL = "sales@berri.ai";

export interface DeploymentWarningContent {
  title: string;
  fix?: ReactNode;
  docsUrl?: string;
}

const STATIC_CONTENT: Readonly<Record<string, DeploymentWarningContent>> = {
  env_credential_login: {
    title: "Environment-credential login is enabled",
    fix: (
      <>{"任何持有 "}<code>UI_USERNAME</code>/<code>UI_PASSWORD</code>{" 的用户（如果未设置 "}<code>UI_PASSWORD</code>{" "}{"，则使用主密钥）都能通过共享静态凭据以代理管理员身份登录。请创建具有独立密码的普通管理员账号，然后设置 "}<code>general_settings.disable_env_credential_login: true</code>
      </>
    ),
    docsUrl: "https://docs.litellm.ai/docs/proxy/ui",
  },
  no_redis: {
    title: "No Redis configured",
    fix: (
      <>{"此代理运行多个工作进程，或无法确认工作进程数量。未配置 Redis 时，限速、预算、路由状态和缓存失效仅在各进程内生效，可能导致总体费用超过限额"}</>
    ),
    docsUrl: "https://docs.litellm.ai/docs/proxy/redis_requirements",
  },
  detailed_debug: {
    title: "Detailed debug logging is on",
    fix: (
      <>
        <code>LITELLM_LOG=DEBUG</code>{" 会记录大量诊断信息并显著降低代理速度。请仅在排查故障时使用，并在生产环境中关闭"}</>
    ),
    docsUrl: "https://docs.litellm.ai/docs/proxy/prod",
  },
};

const describeCountdown = (days: number): string => {
  if (days <= 0) return "expires today";
  if (days === 1) return "expires in 1 day";
  return `expires in ${days} days`;
};

const licenseExpiryContent = (expirationDate: string, now: Date): DeploymentWarningContent => {
  const days = getDaysUntilExpiration(expirationDate, now) ?? 0;
  const formattedDate = formatExpiryDate(expirationDate);
  const salesLink = <a href={`mailto:${SALES_EMAIL}`}>{SALES_EMAIL}</a>;
  return days < 0
    ? {
        title: `Your LiteLLM Enterprise license expired on ${formattedDate}`,
        fix: <>Enterprise features are now disabled. Reach out to {salesLink} to restore access</>,
        docsUrl: "https://docs.litellm.ai/docs/enterprise",
      }
    : {
        title: `Your LiteLLM Enterprise license ${describeCountdown(days)} (${formattedDate})`,
        fix: <>Renew before it lapses to keep enterprise features. Reach out to {salesLink}</>,
        docsUrl: "https://docs.litellm.ai/docs/enterprise",
      };
};

export const deploymentWarningContent = (warningId: string, now: Date = new Date()): DeploymentWarningContent => {
  if (warningId.startsWith(LICENSE_EXPIRY_PREFIX)) {
    return licenseExpiryContent(warningId.slice(LICENSE_EXPIRY_PREFIX.length), now);
  }
  return STATIC_CONTENT[warningId] ?? { title: warningId };
};
