import React, { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { UiLoadingSpinner } from "@/components/ui/ui-loading-spinner";
import { useTheme } from "@/contexts/ThemeContext";
import { getProxyBaseUrl, getGlobalLitellmHeaderName } from "@/components/networking";
import { toast } from "@/lib/toast";

interface UIThemeSettingsProps {
  userID: string | null;
  userRole: string | null;
  accessToken: string | null;
}

const UIThemeSettings: React.FC<UIThemeSettingsProps> = ({ userID, userRole, accessToken }) => {
  const { setLogoUrl, setLogoUrlDark, setFaviconUrl } = useTheme();
  const [logoUrlInput, setLogoUrlInput] = useState<string>("");
  const [logoUrlDarkInput, setLogoUrlDarkInput] = useState<string>("");
  const [faviconUrlInput, setFaviconUrlInput] = useState<string>("");
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (accessToken) {
      fetchThemeSettings();
    }
  }, [accessToken]);

  const fetchThemeSettings = async () => {
    try {
      const proxyBaseUrl = getProxyBaseUrl();
      const url = proxyBaseUrl ? `${proxyBaseUrl}/get/ui_theme_settings` : "/get/ui_theme_settings";
      const response = await fetch(url, {
        method: "GET",
        headers: {
          [getGlobalLitellmHeaderName()]: `Bearer ${accessToken}`,
          "Content-Type": "application/json",
        },
      });
      if (response.ok) {
        const data = await response.json();
        setLogoUrlInput(data.values?.logo_url || "");
        setLogoUrlDarkInput(data.values?.logo_url_dark || "");
        setFaviconUrlInput(data.values?.favicon_url || "");
        setLogoUrl(data.values?.logo_url || null);
        setLogoUrlDark(data.values?.logo_url_dark || null);
        setFaviconUrl(data.values?.favicon_url || null);
      }
    } catch (error) {
      console.error("Error fetching theme settings:", error);
    }
  };

  const handleSave = async () => {
    setLoading(true);
    try {
      const proxyBaseUrl = getProxyBaseUrl();
      const url = proxyBaseUrl ? `${proxyBaseUrl}/update/ui_theme_settings` : "/update/ui_theme_settings";
      const response = await fetch(url, {
        method: "PATCH",
        headers: {
          [getGlobalLitellmHeaderName()]: `Bearer ${accessToken}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          logo_url: logoUrlInput || null,
          logo_url_dark: logoUrlDarkInput || null,
          favicon_url: faviconUrlInput || null,
        }),
      });
      if (response.ok) {
        toast.success("主题设置更新成功！");
        setLogoUrl(logoUrlInput || null);
        setLogoUrlDark(logoUrlDarkInput || null);
        setFaviconUrl(faviconUrlInput || null);
      } else {
        throw new Error("Failed to update settings");
      }
    } catch (error) {
      console.error("Error updating theme settings:", error);
      toast.fromError("Failed to update theme settings");
    } finally {
      setLoading(false);
    }
  };

  const handleReset = async () => {
    setLogoUrlInput("");
    setLogoUrlDarkInput("");
    setFaviconUrlInput("");
    setLogoUrl(null);
    setLogoUrlDark(null);
    setFaviconUrl(null);
    setLoading(true);
    try {
      const proxyBaseUrl = getProxyBaseUrl();
      const url = proxyBaseUrl ? `${proxyBaseUrl}/update/ui_theme_settings` : "/update/ui_theme_settings";
      const response = await fetch(url, {
        method: "PATCH",
        headers: {
          [getGlobalLitellmHeaderName()]: `Bearer ${accessToken}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ logo_url: null, logo_url_dark: null, favicon_url: null }),
      });
      if (response.ok) {
        toast.success("主题设置已恢复默认！");
      } else {
        throw new Error("Failed to reset");
      }
    } catch (error) {
      console.error("Error resetting theme settings:", error);
      toast.fromError("Failed to reset theme settings");
    } finally {
      setLoading(false);
    }
  };

  if (!accessToken) {
    return null;
  }

  return (
    <div className="w-full mx-auto max-w-4xl px-6 py-8">
      <div className="mb-8">
        <h1 className="mb-2 text-2xl font-bold">{"界面主题定制"}</h1>
        <p className="text-sm text-muted-foreground">{"使用自定义标志和网站图标，定制 LiteLLM 管理界面。"}</p>
      </div>
      <Card>
        <CardContent className="space-y-6">
          <div>
            <Label htmlFor="ui-theme-logo-url" className="mb-2">{"自定义标志地址"}</Label>
            <Input
              id="ui-theme-logo-url"
              placeholder="https://example.com/logo.png"
              value={logoUrlInput}
              onChange={(event) => {
                setLogoUrlInput(event.target.value);
                setLogoUrl(event.target.value || null);
              }}
            />
            <p className="mt-1 text-xs text-muted-foreground">{"输入自定义标志地址，留空则使用默认标志"}</p>
          </div>
          <div>
            <Label htmlFor="ui-theme-logo-url-dark" className="mb-2">{"自定义标志地址（深色模式）"}</Label>
            <Input
              id="ui-theme-logo-url-dark"
              placeholder="https://example.com/logo-dark.png"
              value={logoUrlDarkInput}
              onChange={(event) => {
                setLogoUrlDarkInput(event.target.value);
                setLogoUrlDark(event.target.value || null);
              }}
            />
            <p className="mt-1 text-xs text-muted-foreground">{"输入适合深色背景的标志地址，留空则复用上方标志"}</p>
          </div>
          <div>
            <Label htmlFor="ui-theme-favicon-url" className="mb-2">{"自定义网站图标地址"}</Label>
            <Input
              id="ui-theme-favicon-url"
              placeholder="https://example.com/favicon.ico"
              value={faviconUrlInput}
              onChange={(event) => {
                setFaviconUrlInput(event.target.value);
                setFaviconUrl(event.target.value || null);
              }}
            />
            <p className="mt-1 text-xs text-muted-foreground">{"输入自定义网站图标地址（.ico、.png 或 .svg），留空则使用默认图标"}</p>
          </div>
          <div className="flex gap-3 pt-4">
            <Button onClick={handleSave} disabled={loading}>
              {loading && <UiLoadingSpinner className="size-4" />}{"保存更改"}</Button>
            <Button variant="outline" onClick={handleReset} disabled={loading}>
              {loading && <UiLoadingSpinner className="size-4" />}{"恢复默认设置"}</Button>
          </div>
        </CardContent>
      </Card>
    </div>
  );
};

export default UIThemeSettings;
