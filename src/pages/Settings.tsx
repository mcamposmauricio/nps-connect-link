import SidebarLayout from "@/components/SidebarLayout";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Key, Users, Building2 } from "lucide-react";
import { useLanguage } from "@/contexts/LanguageContext";
import { useAuth } from "@/hooks/useAuth";
import ApiKeysTab from "@/components/ApiKeysTab";
import TeamSettingsTab from "@/components/TeamSettingsTab";
import OrganizationSettingsTab from "@/components/OrganizationSettingsTab";

const Settings = () => {
  const { t } = useLanguage();
  const { isAdmin, hasPermission } = useAuth();

  const showApiKeys = isAdmin || hasPermission('settings', 'manage');

  // Determine default tab
  const defaultTab = showApiKeys ? "apikeys" : isAdmin ? "team" : "apikeys";

  return (
    <SidebarLayout>
      <div className="space-y-6">
        <div>
          <h1 className="text-2xl font-semibold">{t("settings.title")}</h1>
          <p className="text-sm text-muted-foreground mt-1">
            {t("settings.pageSubtitle")}
          </p>
        </div>

        <Tabs defaultValue={defaultTab} className="space-y-6">
          <TabsList className="w-full lg:w-auto lg:inline-flex flex-wrap">
            {showApiKeys && (
              <TabsTrigger value="apikeys" className="flex items-center gap-2">
                <Key className="h-4 w-4" />
                <span className="hidden sm:inline">{t("settings.tabs.apiKeys")}</span>
              </TabsTrigger>
            )}
            {isAdmin && (
              <TabsTrigger value="team" className="flex items-center gap-2">
                <Users className="h-4 w-4" />
                <span className="hidden sm:inline">{t("settings.tabs.team")}</span>
              </TabsTrigger>
            )}
            {isAdmin && (
              <TabsTrigger value="organization" className="flex items-center gap-2">
                <Building2 className="h-4 w-4" />
                <span className="hidden sm:inline">{t("settings.tabs.organization")}</span>
              </TabsTrigger>
            )}
          </TabsList>

          {showApiKeys && (
            <TabsContent value="apikeys">
              <ApiKeysTab />
            </TabsContent>
          )}

          {isAdmin && (
            <TabsContent value="team">
              <TeamSettingsTab />
            </TabsContent>
          )}

          {isAdmin && (
            <TabsContent value="organization">
              <OrganizationSettingsTab />
            </TabsContent>
          )}
        </Tabs>
      </div>
    </SidebarLayout>
  );
};

export default Settings;
