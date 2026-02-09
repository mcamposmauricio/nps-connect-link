import { useEffect, useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Switch } from "@/components/ui/switch";
import { Badge } from "@/components/ui/badge";
import SidebarLayout from "@/components/SidebarLayout";
import { useLanguage } from "@/contexts/LanguageContext";
import { useToast } from "@/hooks/use-toast";
import { supabase } from "@/integrations/supabase/client";
import { Headphones } from "lucide-react";

interface CSMWithChat {
  id: string;
  name: string;
  email: string;
  is_chat_enabled: boolean | null;
  chat_max_conversations: number | null;
}

const AdminAttendants = () => {
  const { t } = useLanguage();
  const { toast } = useToast();
  const [csms, setCsms] = useState<CSMWithChat[]>([]);
  const [loading, setLoading] = useState(true);

  const fetchCsms = async () => {
    setLoading(true);
    const { data } = await supabase
      .from("csms")
      .select("id, name, email, is_chat_enabled, chat_max_conversations")
      .order("name");

    setCsms((data as CSMWithChat[]) ?? []);
    setLoading(false);
  };

  useEffect(() => {
    fetchCsms();
  }, []);

  const toggleChatEnabled = async (csmId: string, enabled: boolean) => {
    const { error } = await supabase
      .from("csms")
      .update({ is_chat_enabled: enabled })
      .eq("id", csmId);

    if (error) {
      toast({ title: "Erro", description: error.message, variant: "destructive" });
    } else {
      toast({
        title: enabled ? t("chat.attendants.enabled") : t("chat.attendants.disabled"),
      });
      fetchCsms();
    }
  };

  return (
    <SidebarLayout>
      <div className="space-y-8">
        <div>
          <h1 className="text-2xl font-semibold">{t("chat.attendants.title")}</h1>
          <p className="text-sm text-muted-foreground mt-1">{t("chat.attendants.subtitle")}</p>
        </div>

        {loading ? (
          <div className="flex justify-center py-12">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary" />
          </div>
        ) : csms.length === 0 ? (
          <div className="glass-card p-8 text-center text-muted-foreground">
            <Headphones className="h-12 w-12 mx-auto mb-4 opacity-30" />
            <p>{t("chat.attendants.no_csms")}</p>
          </div>
        ) : (
          <div className="grid gap-4">
            {csms.map((csm) => (
              <Card key={csm.id} className="glass-card">
                <CardHeader className="pb-2">
                  <div className="flex items-center justify-between">
                    <CardTitle className="text-base">{csm.name}</CardTitle>
                    <div className="flex items-center gap-3">
                      {csm.is_chat_enabled && (
                        <Badge variant="secondary" className="text-xs">
                          {t("chat.attendants.active")}
                        </Badge>
                      )}
                      <Switch
                        checked={csm.is_chat_enabled ?? false}
                        onCheckedChange={(v) => toggleChatEnabled(csm.id, v)}
                      />
                    </div>
                  </div>
                </CardHeader>
                <CardContent>
                  <p className="text-sm text-muted-foreground">{csm.email}</p>
                  {csm.is_chat_enabled && (
                    <p className="text-xs text-muted-foreground mt-1">
                      Max: {csm.chat_max_conversations ?? 5} {t("chat.attendants.conversations")}
                    </p>
                  )}
                </CardContent>
              </Card>
            ))}
          </div>
        )}
      </div>
    </SidebarLayout>
  );
};

export default AdminAttendants;
