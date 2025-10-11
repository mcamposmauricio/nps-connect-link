import { useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { useToast } from "@/hooks/use-toast";
import { Loader2 } from "lucide-react";

interface QuickContactFormProps {
  onSuccess: () => void;
  onCancel?: () => void;
}

export const QuickContactForm = ({ onSuccess, onCancel }: QuickContactFormProps) => {
  const [formData, setFormData] = useState({
    name: "",
    email: "",
    phone: "",
    is_company: false,
    company_document: "",
    company_sector: "",
  });
  const [saving, setSaving] = useState(false);
  const { toast } = useToast();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);

    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error("Usuário não autenticado");

      const { error } = await supabase.from("contacts").insert({
        user_id: user.id,
        name: formData.name,
        email: formData.email,
        phone: formData.phone || null,
        is_company: formData.is_company,
        company_document: formData.is_company ? formData.company_document || null : null,
        company_sector: formData.is_company ? formData.company_sector || null : null,
        custom_fields: {},
      });

      if (error) throw error;

      toast({
        title: "Sucesso!",
        description: "Contato criado com sucesso.",
      });

      setFormData({
        name: "",
        email: "",
        phone: "",
        is_company: false,
        company_document: "",
        company_sector: "",
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
    <form onSubmit={handleSubmit} className="space-y-4">
      <div className="space-y-2">
        <div className="flex items-center justify-between">
          <Label htmlFor="is_company">Tipo de Contato</Label>
          <div className="flex items-center gap-2">
            <span className="text-sm text-muted-foreground">
              {formData.is_company ? "Empresa" : "Pessoa"}
            </span>
            <Switch
              id="is_company"
              checked={formData.is_company}
              onCheckedChange={(checked) =>
                setFormData({ ...formData, is_company: checked })
              }
            />
          </div>
        </div>
      </div>

      <div className="space-y-2">
        <Label htmlFor="name">Nome {formData.is_company ? "da Empresa" : "Completo"} *</Label>
        <Input
          id="name"
          value={formData.name}
          onChange={(e) => setFormData({ ...formData, name: e.target.value })}
          placeholder={formData.is_company ? "Nome da empresa" : "Nome completo"}
          required
        />
      </div>

      <div className="space-y-2">
        <Label htmlFor="email">E-mail *</Label>
        <Input
          id="email"
          type="email"
          value={formData.email}
          onChange={(e) => setFormData({ ...formData, email: e.target.value })}
          placeholder="email@exemplo.com"
          required
        />
      </div>

      <div className="space-y-2">
        <Label htmlFor="phone">Telefone</Label>
        <Input
          id="phone"
          value={formData.phone}
          onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
          placeholder="(00) 00000-0000"
        />
      </div>

      {formData.is_company && (
        <>
          <div className="space-y-2">
            <Label htmlFor="company_document">CNPJ</Label>
            <Input
              id="company_document"
              value={formData.company_document}
              onChange={(e) =>
                setFormData({ ...formData, company_document: e.target.value })
              }
              placeholder="00.000.000/0000-00"
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="company_sector">Setor</Label>
            <Input
              id="company_sector"
              value={formData.company_sector}
              onChange={(e) =>
                setFormData({ ...formData, company_sector: e.target.value })
              }
              placeholder="Ex: Tecnologia, Varejo, etc."
            />
          </div>
        </>
      )}

      <div className="flex gap-2 pt-4">
        {onCancel && (
          <Button type="button" variant="outline" onClick={onCancel} className="flex-1">
            Cancelar
          </Button>
        )}
        <Button type="submit" disabled={saving} className="flex-1">
          {saving && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
          {saving ? "Salvando..." : "Criar Contato"}
        </Button>
      </div>
    </form>
  );
};
