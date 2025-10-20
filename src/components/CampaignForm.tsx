import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { useToast } from "@/hooks/use-toast";
import { useLanguage } from "@/contexts/LanguageContext";

interface CampaignFormProps {
  onSuccess: () => void;
  onCancel: () => void;
}

export const CampaignForm = ({ onSuccess, onCancel }: CampaignFormProps) => {
  const [name, setName] = useState('');
  const [message, setMessage] = useState('');
  const [brandSettingsId, setBrandSettingsId] = useState<string>('');
  const [brands, setBrands] = useState<Array<{ id: string; brand_name: string; company_name: string }>>([]);
  const [saving, setSaving] = useState(false);
  const { toast } = useToast();
  const { t } = useLanguage();

  useEffect(() => {
    fetchBrands();
  }, []);

  const fetchBrands = async () => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      const { data, error } = await supabase
        .from("brand_settings")
        .select("id, brand_name, company_name")
        .eq("user_id", user.id)
        .order("created_at", { ascending: true });

      if (error) throw error;

      if (data && data.length > 0) {
        setBrands(data);
        setBrandSettingsId(data[0].id);
      }
    } catch (error: any) {
      console.error("Error fetching brands:", error);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);

    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error("Usuário não autenticado");

      const campaignData = {
        user_id: user.id,
        name,
        message,
        brand_settings_id: brandSettingsId || null,
        campaign_type: 'manual',
        status: 'draft',
      };

      const { error } = await supabase.from("campaigns").insert(campaignData);

      if (error) throw error;

      toast({
        title: "Sucesso!",
        description: "Campanha criada com sucesso.",
      });

      onSuccess();
    } catch (error: any) {
      toast({
        title: "Erro",
        description: error.message,
        variant: "destructive",
      });
    } finally {
      setSaving(false);
    }
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-6">
      <div className="space-y-4">
        <div>
          <Label>{t("campaigns.campaignName")}</Label>
          <Input
            value={name}
            onChange={(e) => setName(e.target.value)}
            placeholder={t("campaigns.campaignNamePlaceholder")}
            required
          />
        </div>

        <div>
          <Label>{t("campaigns.message")}</Label>
          <Textarea
            value={message}
            onChange={(e) => setMessage(e.target.value)}
            placeholder={t("campaigns.messagePlaceholder")}
            rows={4}
            required
          />
        </div>

        {brands.length > 0 && (
          <div>
            <Label>{t("campaigns.selectBrand")}</Label>
            <select
              value={brandSettingsId}
              onChange={(e) => setBrandSettingsId(e.target.value)}
              className="w-full h-10 rounded-md border border-input bg-background px-3 py-2 text-sm"
              required
            >
              {brands.map((brand) => (
                <option key={brand.id} value={brand.id}>
                  {brand.brand_name || brand.company_name}
                </option>
              ))}
            </select>
          </div>
        )}

      </div>

      <div className="flex gap-2">
        <Button type="button" variant="outline" onClick={onCancel} className="flex-1">
          {t("common.cancel")}
        </Button>
        <Button type="submit" disabled={saving} className="flex-1">
          {saving ? t("campaigns.saving") : t("campaigns.createCampaign")}
        </Button>
      </div>
    </form>
  );
};
