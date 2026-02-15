import SidebarLayout from "@/components/SidebarLayout";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Users, Building2, Globe } from "lucide-react";
import { useLanguage } from "@/contexts/LanguageContext";
import { useAuth } from "@/hooks/useAuth";
import TeamSettingsTab from "@/components/TeamSettingsTab";
import OrganizationSettingsTab from "@/components/OrganizationSettingsTab";
import ExternalApiTab from "@/components/ExternalApiTab";

const Settings = () => {
  const { t } = useLanguage();
  const { isAdmin } = useAuth();

  if (!isAdmin) {
    return (
      <SidebarLayout>
        <div className="text-center py-12 text-muted-foreground">
          {t("common.noPermission") || "Sem permissão para acessar esta página."}
        </div>
      </SidebarLayout>
    );
  }

  return (
    <SidebarLayout>
      <div className="space-y-6">
        <div>
          <h1 className="text-2xl font-semibold">{t("settings.title")}</h1>
          <p className="text-sm text-muted-foreground mt-1">
            {t("settings.pageSubtitle")}
          </p>
        </div>

        <Tabs defaultValue="team" className="space-y-6">
          <TabsList className="w-full lg:w-auto lg:inline-flex flex-wrap">
            <TabsTrigger value="team" className="flex items-center gap-2">
              <Users className="h-4 w-4" />
              <span className="hidden sm:inline">{t("settings.tabs.team")}</span>
            </TabsTrigger>
            <TabsTrigger value="organization" className="flex items-center gap-2">
              <Building2 className="h-4 w-4" />
              <span className="hidden sm:inline">{t("settings.tabs.organization")}</span>
            </TabsTrigger>
            <TabsTrigger value="externalApi" className="flex items-center gap-2">
              <Globe className="h-4 w-4" />
              <span className="hidden sm:inline">{t("settings.tabs.externalApi")}</span>
            </TabsTrigger>
          </TabsList>

          <TabsContent value="team">
            <TeamSettingsTab />
          </TabsContent>

          <TabsContent value="organization">
            <OrganizationSettingsTab />
          </TabsContent>

          <TabsContent value="externalApi">
            <ExternalApiTab />
          </TabsContent>
        </Tabs>
      </div>
    </SidebarLayout>
  );
};

export default Settings;
