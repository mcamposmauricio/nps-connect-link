import { useEffect, useState } from "react";
import { useParams } from "react-router-dom";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import SidebarLayout from "@/components/SidebarLayout";
import { useLanguage } from "@/contexts/LanguageContext";
import { useToast } from "@/hooks/use-toast";
import { supabase } from "@/integrations/supabase/client";
import { Save } from "lucide-react";

const AdminSettings = () => {
  const { tab } = useParams();
  const { t } = useLanguage();
  const { toast } = useToast();
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [settings, setSettings] = useState({
    id: "",
    welcome_message: "Bem-vindo ao nosso chat!",
    offline_message: "Estamos offline no momento.",
    auto_assignment: true,
    max_queue_size: 50,
    require_approval: false,
  });

  useEffect(() => {
    const fetchSettings = async () => {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) return;

      const { data } = await supabase
        .from("chat_settings")
        .select("*")
        .eq("user_id", session.user.id)
        .maybeSingle();

      if (data) {
        setSettings({
          id: data.id,
          welcome_message: data.welcome_message ?? "",
          offline_message: data.offline_message ?? "",
          auto_assignment: data.auto_assignment ?? true,
          max_queue_size: data.max_queue_size ?? 50,
          require_approval: data.require_approval ?? false,
        });
      }
      setLoading(false);
    };

    fetchSettings();
  }, []);

  const handleSave = async () => {
    setSaving(true);
    const { data: { session } } = await supabase.auth.getSession();
    if (!session) return;

    const payload = {
      user_id: session.user.id,
      welcome_message: settings.welcome_message,
      offline_message: settings.offline_message,
      auto_assignment: settings.auto_assignment,
      max_queue_size: settings.max_queue_size,
      require_approval: settings.require_approval,
    };

    if (settings.id) {
      await supabase.from("chat_settings").update(payload).eq("id", settings.id);
    } else {
      await supabase.from("chat_settings").insert(payload);
    }

    toast({ title: t("chat.settings.saved") });
    setSaving(false);
  };

  if (loading) {
    return (
      <SidebarLayout>
        <div className="flex justify-center py-12">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary" />
        </div>
      </SidebarLayout>
    );
  }

  return (
    <SidebarLayout>
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold">{t("chat.settings.title")}</h1>
            <p className="text-muted-foreground">{t("chat.settings.subtitle")}</p>
          </div>
          <Button onClick={handleSave} disabled={saving}>
            <Save className="h-4 w-4 mr-2" />
            {saving ? t("common.saving") : t("common.save")}
          </Button>
        </div>

        <Tabs defaultValue={tab ?? "general"}>
          <TabsList>
            <TabsTrigger value="general">{t("chat.settings.tab_general")}</TabsTrigger>
            <TabsTrigger value="widget">{t("chat.settings.tab_widget")}</TabsTrigger>
          </TabsList>

          <TabsContent value="general" className="space-y-4 mt-4">
            <Card>
              <CardHeader>
                <CardTitle className="text-base">{t("chat.settings.messages")}</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="space-y-2">
                  <Label>{t("chat.settings.welcome_message")}</Label>
                  <Textarea
                    value={settings.welcome_message}
                    onChange={(e) => setSettings({ ...settings, welcome_message: e.target.value })}
                  />
                </div>
                <div className="space-y-2">
                  <Label>{t("chat.settings.offline_message")}</Label>
                  <Textarea
                    value={settings.offline_message}
                    onChange={(e) => setSettings({ ...settings, offline_message: e.target.value })}
                  />
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle className="text-base">{t("chat.settings.behavior")}</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="flex items-center justify-between">
                  <Label>{t("chat.settings.auto_assignment")}</Label>
                  <Switch
                    checked={settings.auto_assignment}
                    onCheckedChange={(v) => setSettings({ ...settings, auto_assignment: v })}
                  />
                </div>
                <div className="space-y-2">
                  <Label>{t("chat.settings.max_queue")}</Label>
                  <Input
                    type="number"
                    value={settings.max_queue_size}
                    onChange={(e) => setSettings({ ...settings, max_queue_size: Number(e.target.value) })}
                  />
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="widget" className="mt-4">
            <Card>
              <CardHeader>
                <CardTitle className="text-base">{t("chat.settings.widget_code")}</CardTitle>
              </CardHeader>
              <CardContent>
                <pre className="bg-muted p-4 rounded-md text-sm overflow-auto">
{`<iframe
  src="${window.location.origin}/widget?embed=true"
  style="position:fixed;bottom:20px;right:20px;width:400px;height:600px;border:none;border-radius:12px;box-shadow:0 4px 20px rgba(0,0,0,0.15);z-index:9999;"
></iframe>`}
                </pre>
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
      </div>
    </SidebarLayout>
  );
};

export default AdminSettings;
