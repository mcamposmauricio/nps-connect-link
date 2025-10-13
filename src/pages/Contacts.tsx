import { useEffect, useState, useRef } from "react";
import Layout from "@/components/Layout";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card } from "@/components/ui/card";
import { useToast } from "@/hooks/use-toast";
import { Plus, Trash2, Loader2, Upload, Building2, User, Download } from "lucide-react";
import { Switch } from "@/components/ui/switch";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Label } from "@/components/ui/label";
import Papa from "papaparse";
import { exportToCSV } from "@/lib/utils";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";

interface Contact {
  id: string;
  name: string;
  email: string;
  phone: string | null;
  is_company: boolean;
  company_document: string | null;
  company_sector: string | null;
  custom_fields: Record<string, any>;
  created_at: string;
}

const Contacts = () => {
  const [contacts, setContacts] = useState<Contact[]>([]);
  const [loading, setLoading] = useState(true);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [displayCount, setDisplayCount] = useState(15);
  const [formData, setFormData] = useState({ 
    name: "", 
    email: "", 
    phone: "", 
    is_company: false,
    company_document: "",
    company_sector: "",
    custom_fields: {} as Record<string, string>
  });
  const [customFieldKey, setCustomFieldKey] = useState("");
  const [customFieldValue, setCustomFieldValue] = useState("");
  const [saving, setSaving] = useState(false);
  const [importing, setImporting] = useState(false);
  const [activeTab, setActiveTab] = useState<"all" | "companies" | "individuals">("all");
  const fileInputRef = useRef<HTMLInputElement>(null);
  const { toast } = useToast();

  useEffect(() => {
    fetchContacts();
  }, []);

  const fetchContacts = async () => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      const { data, error } = await supabase
        .from("contacts")
        .select("*")
        .eq("user_id", user.id)
        .order("created_at", { ascending: false });

      if (error) throw error;
      setContacts((data || []).map(c => ({
        ...c,
        custom_fields: (c.custom_fields as any) || {}
      })));
    } catch (error: any) {
      toast({
        title: "Erro",
        description: error.message,
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

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
        custom_fields: formData.custom_fields,
      });

      if (error) throw error;

      toast({
        title: "Sucesso!",
        description: "Contato adicionado com sucesso.",
      });

      setFormData({ name: "", email: "", phone: "", is_company: false, company_document: "", company_sector: "", custom_fields: {} });
      setCustomFieldKey("");
      setCustomFieldValue("");
      setDialogOpen(false);
      fetchContacts();
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

  const handleDelete = async (id: string) => {
    try {
      const { error } = await supabase.from("contacts").delete().eq("id", id);
      if (error) throw error;

      toast({
        title: "Sucesso!",
        description: "Contato removido.",
      });

      fetchContacts();
    } catch (error: any) {
      toast({
        title: "Erro",
        description: error.message,
        variant: "destructive",
      });
    }
  };

  const handleFileUpload = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    setImporting(true);

    Papa.parse(file, {
      header: true,
      skipEmptyLines: true,
      complete: async (results) => {
        try {
          const { data: { user } } = await supabase.auth.getUser();
          if (!user) throw new Error("Usuário não autenticado");

          const contactsToInsert = results.data.map((row: any) => {
            const isCompany = row.is_company === "true" || row.is_company === "TRUE" || row["Empresa"] === "Sim" || false;
            return {
              user_id: user.id,
              name: row.name || row.Nome || "",
              email: row.email || row.Email || row["E-mail"] || "",
              phone: row.phone || row.Telefone || row.telefone || null,
              is_company: isCompany,
              company_document: isCompany ? (row.company_document || row.CNPJ || row.cnpj || null) : null,
              company_sector: isCompany ? (row.company_sector || row.Setor || row.setor || null) : null,
              custom_fields: {},
            };
          }).filter(contact => contact.name && contact.email);

          const { error } = await supabase.from("contacts").insert(contactsToInsert);
          
          if (error) throw error;

          toast({
            title: "Sucesso!",
            description: `${contactsToInsert.length} contatos importados com sucesso.`,
          });

          fetchContacts();
        } catch (error: any) {
          toast({
            title: "Erro",
            description: error.message,
            variant: "destructive",
          });
        } finally {
          setImporting(false);
          if (fileInputRef.current) fileInputRef.current.value = "";
        }
      },
      error: (error) => {
        toast({
          title: "Erro",
          description: "Erro ao processar arquivo CSV.",
          variant: "destructive",
        });
        setImporting(false);
      }
    });
  };

  const filteredContacts = contacts.filter(contact => {
    if (activeTab === "companies") return contact.is_company;
    if (activeTab === "individuals") return !contact.is_company;
    return true;
  });

  const handleExportCSV = () => {
    const csvData = filteredContacts.map((contact) => ({
      "Tipo": contact.is_company ? "Empresa" : "Pessoa",
      "Nome": contact.name,
      "Email": contact.email,
      "Telefone": contact.phone || "",
      "CNPJ": contact.company_document || "",
      "Setor": contact.company_sector || "",
      ...contact.custom_fields,
    }));
    exportToCSV(csvData, `contatos_${activeTab}`);
    toast({
      title: "CSV exportado!",
      description: "Arquivo baixado com sucesso.",
    });
  };

  return (
    <Layout>
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-4xl font-bold mb-2">Contatos</h1>
            <p className="text-muted-foreground">Gerencie seus clientes e contatos</p>
          </div>

          <div className="flex gap-2">
            {contacts.length > 0 && (
              <Button onClick={handleExportCSV} variant="outline">
                <Download className="mr-2 h-4 w-4" />
                Exportar CSV
              </Button>
            )}
            <input
              ref={fileInputRef}
              type="file"
              accept=".csv"
              onChange={handleFileUpload}
              className="hidden"
            />
            <Button 
              variant="outline" 
              onClick={() => fileInputRef.current?.click()}
              disabled={importing}
            >
              {importing ? (
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
              ) : (
                <Upload className="mr-2 h-4 w-4" />
              )}
              Importar CSV
            </Button>
            <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
              <DialogTrigger asChild>
                <Button>
                  <Plus className="mr-2 h-4 w-4" />
                  Novo Contato
                </Button>
              </DialogTrigger>
            <DialogContent>
              <DialogHeader>
                <DialogTitle>Adicionar Contato</DialogTitle>
              </DialogHeader>
              <form onSubmit={handleSubmit} className="space-y-4">
                <div>
                  <label className="block text-sm font-medium mb-2">Nome</label>
                  <Input
                    value={formData.name}
                    onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                    placeholder="Nome do contato"
                    required
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium mb-2">Email</label>
                  <Input
                    type="email"
                    value={formData.email}
                    onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                    placeholder="email@exemplo.com"
                    required
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium mb-2">Telefone (opcional)</label>
                  <Input
                    value={formData.phone}
                    onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
                    placeholder="(00) 00000-0000"
                  />
                </div>
                <div className="flex items-center justify-between">
                  <Label htmlFor="is-company">Este contato é uma empresa?</Label>
                  <Switch
                    id="is-company"
                    checked={formData.is_company}
                    onCheckedChange={(checked) => setFormData({ ...formData, is_company: checked })}
                  />
                </div>
                
                {formData.is_company && (
                  <>
                    <div>
                      <label className="block text-sm font-medium mb-2">CNPJ (opcional)</label>
                      <Input
                        value={formData.company_document}
                        onChange={(e) => setFormData({ ...formData, company_document: e.target.value })}
                        placeholder="00.000.000/0000-00"
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-medium mb-2">Setor (opcional)</label>
                      <Input
                        value={formData.company_sector}
                        onChange={(e) => setFormData({ ...formData, company_sector: e.target.value })}
                        placeholder="Ex: Tecnologia, Varejo, Saúde"
                      />
                    </div>
                  </>
                )}

                <div className="border-t pt-4">
                  <label className="block text-sm font-medium mb-2">Campos Personalizados</label>
                  <div className="space-y-2">
                    {Object.entries(formData.custom_fields).map(([key, value]) => (
                      <div key={key} className="flex items-center gap-2 text-sm">
                        <span className="font-medium">{key}:</span>
                        <span className="text-muted-foreground">{value}</span>
                        <Button
                          type="button"
                          variant="ghost"
                          size="sm"
                          onClick={() => {
                            const newFields = { ...formData.custom_fields };
                            delete newFields[key];
                            setFormData({ ...formData, custom_fields: newFields });
                          }}
                        >
                          <Trash2 className="h-3 w-3" />
                        </Button>
                      </div>
                    ))}
                    <div className="flex gap-2">
                      <Input
                        placeholder="Nome do campo"
                        value={customFieldKey}
                        onChange={(e) => setCustomFieldKey(e.target.value)}
                      />
                      <Input
                        placeholder="Valor"
                        value={customFieldValue}
                        onChange={(e) => setCustomFieldValue(e.target.value)}
                      />
                      <Button
                        type="button"
                        variant="outline"
                        size="sm"
                        onClick={() => {
                          if (customFieldKey && customFieldValue) {
                            setFormData({
                              ...formData,
                              custom_fields: {
                                ...formData.custom_fields,
                                [customFieldKey]: customFieldValue,
                              },
                            });
                            setCustomFieldKey("");
                            setCustomFieldValue("");
                          }
                        }}
                      >
                        <Plus className="h-4 w-4" />
                      </Button>
                    </div>
                  </div>
                </div>
                <Button type="submit" className="w-full" disabled={saving}>
                  {saving && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                  Salvar
                </Button>
              </form>
            </DialogContent>
          </Dialog>
          </div>
        </div>

        {loading ? (
          <div className="flex items-center justify-center h-64">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary"></div>
          </div>
        ) : contacts.length === 0 ? (
          <Card className="p-12 text-center">
            <p className="text-muted-foreground">Nenhum contato cadastrado ainda.</p>
            <p className="text-sm text-muted-foreground mt-2">
              Importe contatos via CSV (Google Sheets) ou adicione manualmente.
            </p>
          </Card>
        ) : (
          <Tabs value={activeTab} onValueChange={(value) => setActiveTab(value as any)} className="w-full">
            <TabsList className="grid w-full max-w-md grid-cols-3">
              <TabsTrigger value="all">
                Todos ({contacts.length})
              </TabsTrigger>
              <TabsTrigger value="companies">
                <Building2 className="h-4 w-4 mr-1" />
                Empresas ({contacts.filter(c => c.is_company).length})
              </TabsTrigger>
              <TabsTrigger value="individuals">
                <User className="h-4 w-4 mr-1" />
                Pessoas ({contacts.filter(c => !c.is_company).length})
              </TabsTrigger>
            </TabsList>

            <TabsContent value={activeTab} className="mt-6">
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                {filteredContacts.slice(0, displayCount).map((contact) => (
                  <Card key={contact.id} className="p-4 hover:shadow-md transition-shadow">
                    <div className="flex items-start justify-between mb-2">
                      <div className="flex items-center gap-2">
                        {contact.is_company ? (
                          <Building2 className="h-5 w-5 text-primary" />
                        ) : (
                          <User className="h-5 w-5 text-muted-foreground" />
                        )}
                        <h3 className="font-semibold text-lg">{contact.name}</h3>
                      </div>
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => handleDelete(contact.id)}
                        className="text-destructive hover:text-destructive"
                      >
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    </div>
                    <p className="text-sm text-muted-foreground">{contact.email}</p>
                    {contact.phone && <p className="text-sm text-muted-foreground">{contact.phone}</p>}
                    {contact.company_document && (
                      <p className="text-sm text-muted-foreground">CNPJ: {contact.company_document}</p>
                    )}
                    {contact.company_sector && (
                      <p className="text-sm text-muted-foreground">Setor: {contact.company_sector}</p>
                    )}
                    {Object.keys(contact.custom_fields || {}).length > 0 && (
                      <div className="mt-2 pt-2 border-t">
                        {Object.entries(contact.custom_fields).map(([key, value]) => (
                          <p key={key} className="text-xs text-muted-foreground">
                            {key}: {value}
                          </p>
                        ))}
                      </div>
                    )}
                  </Card>
                ))}
              </div>
              
              {displayCount < filteredContacts.length && (
                <div className="flex justify-center mt-6">
                  <Button 
                    variant="outline" 
                    onClick={() => setDisplayCount(prev => prev + 15)}
                  >
                    Carregar mais
                  </Button>
                </div>
              )}
            </TabsContent>
          </Tabs>
        )}
      </div>
    </Layout>
  );
};

export default Contacts;
