import { useState, useEffect } from "react";
import { useLanguage } from "@/contexts/LanguageContext";
import { useAuth } from "@/hooks/useAuth";
import { supabase } from "@/integrations/supabase/client";
import { PageHeader } from "@/components/ui/page-header";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { useToast } from "@/hooks/use-toast";
import { Loader2, Save } from "lucide-react";

export default function HelpSettings() {
  const { t } = useLanguage();
  const { tenantId } = useAuth();
  const { toast } = useToast();
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  const [homeTitle, setHomeTitle] = useState("Central de Ajuda");
  const [homeSubtitle, setHomeSubtitle] = useState("Como podemos ajudar?");
  const [theme, setTheme] = useState("light");
  const [logoUrl, setLogoUrl] = useState("");
  const [primaryColor, setPrimaryColor] = useState("#3B82F6");
  const [secondaryColor, setSecondaryColor] = useState("");
  const [footerHtml, setFooterHtml] = useState("");
  const [contactChannels, setContactChannels] = useState("[]");

  useEffect(() => { if (tenantId) loadSettings(); }, [tenantId]);

  const loadSettings = async () => {
    setLoading(true);
    const { data } = await supabase.from("help_site_settings").select("*").eq("tenant_id", tenantId!).maybeSingle();
    if (data) {
      setHomeTitle(data.home_title || "");
      setHomeSubtitle(data.home_subtitle || "");
      setTheme(data.theme || "light");
      setLogoUrl(data.brand_logo_url || "");
      setPrimaryColor(data.brand_primary_color || "#3B82F6");
      setSecondaryColor(data.brand_secondary_color || "");
      setFooterHtml(data.footer_html || "");
      setContactChannels(JSON.stringify(data.contact_channels_json || [], null, 2));
    }
    setLoading(false);
  };

  const handleSave = async () => {
    if (!tenantId) return;
    setSaving(true);

    let channelsJson;
    try { channelsJson = JSON.parse(contactChannels); } catch { channelsJson = []; }

    await supabase.from("help_site_settings").upsert({
      tenant_id: tenantId,
      home_title: homeTitle,
      home_subtitle: homeSubtitle,
      theme,
      brand_logo_url: logoUrl || null,
      brand_primary_color: primaryColor,
      brand_secondary_color: secondaryColor || null,
      footer_html: footerHtml || null,
      contact_channels_json: channelsJson,
    });

    toast({ title: t("help.siteSaveSuccess") });
    setSaving(false);
  };

  if (loading) return <div className="flex items-center justify-center py-16"><Loader2 className="h-6 w-6 animate-spin" /></div>;

  return (
    <div className="space-y-6 p-6">
      <PageHeader title={t("help.settings")} subtitle={t("help.title")}>
        <Button onClick={handleSave} disabled={saving}>
          {saving ? <Loader2 className="h-4 w-4 mr-2 animate-spin" /> : <Save className="h-4 w-4 mr-2" />}
          {t("team.save")}
        </Button>
      </PageHeader>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <Card>
          <CardHeader><CardTitle className="text-sm">{t("help.publicHome")}</CardTitle></CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-1.5">
              <Label>{t("help.siteTitle")}</Label>
              <Input value={homeTitle} onChange={e => setHomeTitle(e.target.value)} placeholder={t("help.siteTitlePlaceholder")} />
            </div>
            <div className="space-y-1.5">
              <Label>{t("help.siteSubtitle")}</Label>
              <Input value={homeSubtitle} onChange={e => setHomeSubtitle(e.target.value)} placeholder={t("help.siteSubtitlePlaceholder")} />
            </div>
            <div className="space-y-1.5">
              <Label>{t("help.siteTheme")}</Label>
              <Select value={theme} onValueChange={setTheme}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="light">Light</SelectItem>
                  <SelectItem value="dark">Dark</SelectItem>
                  <SelectItem value="auto">Auto</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader><CardTitle className="text-sm">Branding</CardTitle></CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-1.5">
              <Label>{t("help.siteLogo")}</Label>
              <Input value={logoUrl} onChange={e => setLogoUrl(e.target.value)} placeholder="https://..." />
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-1.5">
                <Label>{t("help.sitePrimaryColor")}</Label>
                <div className="flex items-center gap-2">
                  <input type="color" value={primaryColor} onChange={e => setPrimaryColor(e.target.value)} className="h-9 w-12 rounded border cursor-pointer" />
                  <Input value={primaryColor} onChange={e => setPrimaryColor(e.target.value)} className="flex-1" />
                </div>
              </div>
              <div className="space-y-1.5">
                <Label>{t("help.siteSecondaryColor")}</Label>
                <div className="flex items-center gap-2">
                  <input type="color" value={secondaryColor || "#6366f1"} onChange={e => setSecondaryColor(e.target.value)} className="h-9 w-12 rounded border cursor-pointer" />
                  <Input value={secondaryColor} onChange={e => setSecondaryColor(e.target.value)} className="flex-1" />
                </div>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="lg:col-span-2">
          <CardHeader><CardTitle className="text-sm">{t("help.siteFooter")}</CardTitle></CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-1.5">
              <Label>Footer HTML</Label>
              <Textarea value={footerHtml} onChange={e => setFooterHtml(e.target.value)} rows={4} className="font-mono text-xs" />
            </div>
            <div className="space-y-1.5">
              <Label>{t("help.siteContactChannels")} (JSON)</Label>
              <Textarea value={contactChannels} onChange={e => setContactChannels(e.target.value)} rows={4} className="font-mono text-xs" placeholder='[{"type": "email", "value": "suporte@empresa.com"}]' />
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
