import { useEffect, useState, useRef } from "react";
import Layout from "@/components/Layout";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card } from "@/components/ui/card";
import { useToast } from "@/hooks/use-toast";
import { Loader2, Upload, Palette } from "lucide-react";
import { Label } from "@/components/ui/label";
import NPSForm from "@/components/NPSForm";
import { useLanguage } from "@/contexts/LanguageContext";

interface BrandSettings {
  id?: string;
  brand_name: string;
  company_name: string;
  logo_url: string | null;
  primary_color: string;
  secondary_color: string;
  accent_color: string;
}

const Settings = () => {
  const [brands, setBrands] = useState<BrandSettings[]>([]);
  const [selectedBrandId, setSelectedBrandId] = useState<string | null>(null);
  const [settings, setSettings] = useState<BrandSettings>({
    brand_name: "",
    company_name: "",
    logo_url: null,
    primary_color: "#8B5CF6",
    secondary_color: "#EC4899",
    accent_color: "#10B981",
  });
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [uploading, setUploading] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const { toast } = useToast();
  const { t } = useLanguage();

  useEffect(() => {
    fetchSettings();
  }, []);

  const fetchSettings = async () => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      const { data, error } = await supabase
        .from("brand_settings")
        .select("*")
        .eq("user_id", user.id)
        .order("created_at", { ascending: true });

      if (error) throw error;

      if (data && data.length > 0) {
        setBrands(data);
        setSelectedBrandId(data[0].id!);
        setSettings(data[0]);
      }
    } catch (error: any) {
      console.error("Error fetching settings:", error);
    } finally {
      setLoading(false);
    }
  };

  const handleSave = async () => {
    setSaving(true);
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error(t("settings.userNotAuthenticated"));

      const settingsData = {
        user_id: user.id,
        brand_name: settings.brand_name,
        company_name: settings.company_name,
        logo_url: settings.logo_url,
        primary_color: settings.primary_color,
        secondary_color: settings.secondary_color,
        accent_color: settings.accent_color,
      };

      const { error } = settings.id
        ? await supabase.from("brand_settings").update(settingsData).eq("id", settings.id)
        : await supabase.from("brand_settings").insert(settingsData);

      if (error) throw error;

      toast({
        title: t("common.success"),
        description: t("settings.updateSuccess"),
      });

      fetchSettings();
    } catch (error: any) {
      toast({
        title: t("common.error"),
        description: error.message,
        variant: "destructive",
      });
    } finally {
      setSaving(false);
    }
  };

  const handleLogoUpload = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    setUploading(true);
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error(t("settings.userNotAuthenticated"));

      const fileExt = file.name.split(".").pop();
      const fileName = `${user.id}/${Date.now()}.${fileExt}`;

      const { error: uploadError } = await supabase.storage
        .from("logos")
        .upload(fileName, file, { upsert: true });

      if (uploadError) throw uploadError;

      const { data: { publicUrl } } = supabase.storage
        .from("logos")
        .getPublicUrl(fileName);

      setSettings({ ...settings, logo_url: publicUrl });

      toast({
        title: t("common.success"),
        description: t("settings.uploadSuccess"),
      });
    } catch (error: any) {
      toast({
        title: t("common.error"),
        description: error.message,
        variant: "destructive",
      });
    } finally {
      setUploading(false);
    }
  };

  const handleAddNewBrand = () => {
    const newBrand: BrandSettings = {
      brand_name: "",
      company_name: "",
      logo_url: null,
      primary_color: "#8B5CF6",
      secondary_color: "#EC4899",
      accent_color: "#10B981",
    };
    setSettings(newBrand);
    setSelectedBrandId(null);
  };

  const handleSelectBrand = (brandId: string) => {
    const brand = brands.find(b => b.id === brandId);
    if (brand) {
      setSettings(brand);
      setSelectedBrandId(brandId);
    }
  };

  const handleDeleteBrand = async () => {
    if (!selectedBrandId) return;
    
    if (!confirm(t("settings.confirmDelete"))) return;

    try {
      const { error } = await supabase
        .from("brand_settings")
        .delete()
        .eq("id", selectedBrandId);

      if (error) throw error;

      toast({
        title: t("common.success"),
        description: t("settings.deleteSuccess"),
      });

      await fetchSettings();
    } catch (error: any) {
      toast({
        title: t("common.error"),
        description: error.message,
        variant: "destructive",
      });
    }
  };

  if (loading) {
    return (
      <Layout>
        <div className="flex items-center justify-center h-64">
          <Loader2 className="h-12 w-12 animate-spin text-primary" />
        </div>
      </Layout>
    );
  }

  return (
    <Layout>
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <div className="space-y-6">
          <div>
            <h1 className="text-4xl font-bold mb-2">{t("settings.brandSettings")}</h1>
            <p className="text-muted-foreground">
              {t("settings.subtitle")}
            </p>
          </div>

          <Card className="p-6 space-y-6">
            <div className="flex gap-2 mb-4">
              <select
                value={selectedBrandId || ""}
                onChange={(e) => handleSelectBrand(e.target.value)}
                className="flex-1 h-10 rounded-md border border-input bg-background px-3 py-2 text-sm"
              >
                <option value="">{t("settings.selectBrand")}</option>
                {brands.map((brand) => (
                  <option key={brand.id} value={brand.id}>
                    {brand.brand_name || brand.company_name}
                  </option>
                ))}
              </select>
              <Button variant="outline" onClick={handleAddNewBrand}>
                {t("settings.addNewBrand")}
              </Button>
              {selectedBrandId && brands.length > 1 && (
                <Button variant="destructive" onClick={handleDeleteBrand}>
                  {t("settings.deleteBrand")}
                </Button>
              )}
            </div>

            <div>
              <Label htmlFor="brand-name">{t("settings.brandName")}</Label>
              <Input
                id="brand-name"
                value={settings.brand_name}
                onChange={(e) => setSettings({ ...settings, brand_name: e.target.value })}
                placeholder={t("settings.brandNamePlaceholder")}
                className="mt-2"
              />
            </div>

            <div>
              <Label htmlFor="company-name">{t("settings.companyName")}</Label>
              <Input
                id="company-name"
                value={settings.company_name}
                onChange={(e) => setSettings({ ...settings, company_name: e.target.value })}
                placeholder={t("settings.companyNamePlaceholder")}
                className="mt-2"
              />
            </div>

            <div>
              <Label>{t("settings.companyLogo")}</Label>
              <div className="mt-2 space-y-4">
                {settings.logo_url && (
                  <div className="flex items-center justify-center p-4 border rounded-lg bg-muted">
                    <img
                      src={settings.logo_url}
                      alt="Logo"
                      className="max-h-24 object-contain"
                    />
                  </div>
                )}
                <input
                  ref={fileInputRef}
                  type="file"
                  accept="image/*"
                  onChange={handleLogoUpload}
                  className="hidden"
                />
                <Button
                  variant="outline"
                  onClick={() => fileInputRef.current?.click()}
                  disabled={uploading}
                  className="w-full"
                >
                  {uploading ? (
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  ) : (
                    <Upload className="mr-2 h-4 w-4" />
                  )}
                  {settings.logo_url ? t("settings.changeLogo") : t("settings.uploadLogo")}
                </Button>
              </div>
            </div>

            <div className="space-y-4">
              <Label>
                <Palette className="inline mr-2 h-4 w-4" />
                {t("settings.brandColors")}
              </Label>
              
              <div>
                <Label htmlFor="primary-color" className="text-sm">{t("settings.primaryColor")}</Label>
                <div className="flex gap-2 mt-2">
                  <Input
                    id="primary-color"
                    type="color"
                    value={settings.primary_color}
                    onChange={(e) => setSettings({ ...settings, primary_color: e.target.value })}
                    className="w-20 h-10 cursor-pointer"
                  />
                  <Input
                    value={settings.primary_color}
                    onChange={(e) => setSettings({ ...settings, primary_color: e.target.value })}
                    placeholder="#8B5CF6"
                  />
                </div>
              </div>

              <div>
                <Label htmlFor="secondary-color" className="text-sm">{t("settings.secondaryColor")}</Label>
                <div className="flex gap-2 mt-2">
                  <Input
                    id="secondary-color"
                    type="color"
                    value={settings.secondary_color}
                    onChange={(e) => setSettings({ ...settings, secondary_color: e.target.value })}
                    className="w-20 h-10 cursor-pointer"
                  />
                  <Input
                    value={settings.secondary_color}
                    onChange={(e) => setSettings({ ...settings, secondary_color: e.target.value })}
                    placeholder="#EC4899"
                  />
                </div>
              </div>

              <div>
                <Label htmlFor="accent-color" className="text-sm">{t("settings.accentColor")}</Label>
                <div className="flex gap-2 mt-2">
                  <Input
                    id="accent-color"
                    type="color"
                    value={settings.accent_color}
                    onChange={(e) => setSettings({ ...settings, accent_color: e.target.value })}
                    className="w-20 h-10 cursor-pointer"
                  />
                  <Input
                    value={settings.accent_color}
                    onChange={(e) => setSettings({ ...settings, accent_color: e.target.value })}
                    placeholder="#10B981"
                  />
                </div>
              </div>
            </div>

            <Button onClick={handleSave} className="w-full" disabled={saving}>
              {saving && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              {t("settings.saveChanges")}
            </Button>
          </Card>
        </div>

        <div className="lg:sticky lg:top-6 h-fit">
          <Card className="p-6">
            <h2 className="text-xl font-semibold mb-4">{t("settings.livePreview")}</h2>
            <p className="text-sm text-muted-foreground mb-4">
              {t("settings.livePreviewDescription")}
            </p>
            <div 
              className="rounded-lg overflow-hidden"
              style={{
                background: `linear-gradient(135deg, ${settings.primary_color}, ${settings.secondary_color})`
              }}
            >
              <div className="p-8 flex items-center justify-center min-h-[500px]">
                <NPSForm
                  brandSettings={{
                    company_name: settings.company_name,
                    logo_url: settings.logo_url,
                    primary_color: settings.primary_color,
                    secondary_color: settings.secondary_color,
                    accent_color: settings.accent_color,
                  }}
                  isPreview={true}
                />
              </div>
            </div>
          </Card>
        </div>
      </div>
    </Layout>
  );
};

export default Settings;
