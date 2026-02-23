import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { useToast } from "@/hooks/use-toast";
import { Plus, Pencil, Building2, Users, Send, MessageSquare, Eye } from "lucide-react";
import { Separator } from "@/components/ui/separator";
import { format } from "date-fns";

interface Tenant {
  id: string;
  name: string;
  slug: string | null;
  logo_url: string | null;
  is_active: boolean | null;
  created_at: string | null;
}

interface TenantStats {
  tenant_id: string;
  users: number;
  contacts: number;
  campaigns: number;
  chat_rooms: number;
}

export default function TenantManagement() {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const navigate = useNavigate();
  const { setImpersonation } = useAuth();
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editingTenant, setEditingTenant] = useState<Tenant | null>(null);
  const [form, setForm] = useState({ name: "", slug: "", logo_url: "", admin_email: "", admin_name: "" });
  const [search, setSearch] = useState("");

  const { data: tenants = [], isLoading } = useQuery({
    queryKey: ["backoffice-tenants"],
    queryFn: async () => {
      const { data, error } = await supabase.from("tenants").select("*").order("created_at", { ascending: false });
      if (error) throw error;
      return data as Tenant[];
    },
  });

  const { data: stats = [] } = useQuery({
    queryKey: ["backoffice-tenant-stats"],
    queryFn: async () => {
      const results: TenantStats[] = [];
      for (const t of tenants) {
        const [users, contacts, campaigns, rooms] = await Promise.all([
          supabase.from("user_profiles").select("id", { count: "exact", head: true }).eq("tenant_id", t.id),
          supabase.from("contacts").select("id", { count: "exact", head: true }).eq("tenant_id", t.id),
          supabase.from("campaigns").select("id", { count: "exact", head: true }).eq("tenant_id", t.id),
          supabase.from("chat_rooms").select("id", { count: "exact", head: true }).eq("tenant_id", t.id),
        ]);
        results.push({
          tenant_id: t.id,
          users: users.count ?? 0,
          contacts: contacts.count ?? 0,
          campaigns: campaigns.count ?? 0,
          chat_rooms: rooms.count ?? 0,
        });
      }
      return results;
    },
    enabled: tenants.length > 0,
  });

  const saveMutation = useMutation({
    mutationFn: async () => {
      if (editingTenant) {
        const { error } = await supabase.from("tenants").update({
          name: form.name,
          slug: form.slug || null,
          logo_url: form.logo_url || null,
        }).eq("id", editingTenant.id);
        if (error) throw error;
      } else {
        // Create tenant and get ID
        const { data: newTenant, error } = await supabase.from("tenants").insert({
          name: form.name,
          slug: form.slug || null,
          logo_url: form.logo_url || null,
        }).select("id").single();
        if (error) throw error;

        // Provision first admin via edge function
        if (form.admin_email && form.admin_name) {
          const { data: provisionData, error: provisionError } = await supabase.functions.invoke("backoffice-admin", {
            body: {
              action: "provision-tenant-admin",
              tenantId: newTenant.id,
              email: form.admin_email,
              displayName: form.admin_name,
            },
          });
          if (provisionError) throw provisionError;
          if (provisionData?.error) throw new Error(provisionData.error);
        }
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["backoffice-tenants"] });
      setDialogOpen(false);
      setEditingTenant(null);
      setForm({ name: "", slug: "", logo_url: "", admin_email: "", admin_name: "" });
      toast({
        title: editingTenant ? "Tenant atualizado" : "Plataforma criada!",
        description: !editingTenant && form.admin_email ? `Convite enviado para ${form.admin_email}` : undefined,
      });
    },
    onError: (err: Error) => toast({ title: "Erro", description: err.message, variant: "destructive" }),
  });

  const toggleActive = useMutation({
    mutationFn: async ({ id, active }: { id: string; active: boolean }) => {
      const { error } = await supabase.from("tenants").update({ is_active: active }).eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["backoffice-tenants"] }),
  });

  const openEdit = (t: Tenant) => {
    setEditingTenant(t);
    setForm({ name: t.name, slug: t.slug || "", logo_url: t.logo_url || "", admin_email: "", admin_name: "" });
    setDialogOpen(true);
  };

  const openNew = () => {
    setEditingTenant(null);
    setForm({ name: "", slug: "", logo_url: "", admin_email: "", admin_name: "" });
    setDialogOpen(true);
  };

  const filtered = tenants.filter(t =>
    t.name.toLowerCase().includes(search.toLowerCase()) ||
    (t.slug || "").toLowerCase().includes(search.toLowerCase())
  );

  const getStats = (id: string) => stats.find(s => s.tenant_id === id);

  return (
    <Card>
      <CardHeader className="flex flex-row items-center justify-between">
        <CardTitle className="text-lg">Plataformas / Tenants</CardTitle>
        <div className="flex items-center gap-2">
          <Input placeholder="Buscar tenant..." value={search} onChange={e => setSearch(e.target.value)} className="w-64" />
          <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
            <DialogTrigger asChild>
              <Button onClick={openNew} size="sm" className="gap-2"><Plus className="h-4 w-4" />Novo Tenant</Button>
            </DialogTrigger>
            <DialogContent>
              <DialogHeader>
                <DialogTitle>{editingTenant ? "Editar Tenant" : "Novo Tenant"}</DialogTitle>
              </DialogHeader>
              <div className="space-y-4">
                <div><Label>Nome</Label><Input value={form.name} onChange={e => setForm(f => ({ ...f, name: e.target.value }))} placeholder="Nome da plataforma" /></div>
                <div><Label>Slug</Label><Input value={form.slug} onChange={e => setForm(f => ({ ...f, slug: e.target.value }))} placeholder="slug-unico" /></div>
                <div><Label>Logo URL</Label><Input value={form.logo_url} onChange={e => setForm(f => ({ ...f, logo_url: e.target.value }))} placeholder="https://..." /></div>
                {!editingTenant && (
                  <>
                    <Separator className="my-2" />
                    <p className="text-sm font-medium text-muted-foreground">Primeiro Administrador</p>
                    <div><Label>Nome do admin</Label><Input value={form.admin_name} onChange={e => setForm(f => ({ ...f, admin_name: e.target.value }))} placeholder="Nome completo" /></div>
                    <div><Label>Email do admin</Label><Input type="email" value={form.admin_email} onChange={e => setForm(f => ({ ...f, admin_email: e.target.value }))} placeholder="admin@empresa.com" /></div>
                  </>
                )}
                <Button onClick={() => saveMutation.mutate()} disabled={!form.name || (!editingTenant && (!form.admin_email || !form.admin_name)) || saveMutation.isPending} className="w-full">
                  {saveMutation.isPending ? "Salvando..." : "Salvar"}
                </Button>
              </div>
            </DialogContent>
          </Dialog>
        </div>
      </CardHeader>
      <CardContent>
        {isLoading ? (
          <div className="space-y-2">{[1,2,3].map(i => <div key={i} className="h-12 bg-muted animate-pulse rounded" />)}</div>
        ) : (
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Nome</TableHead>
                <TableHead>Slug</TableHead>
                <TableHead>Status</TableHead>
                <TableHead>Criado em</TableHead>
                <TableHead className="text-center"><Users className="h-4 w-4 inline" /></TableHead>
                <TableHead className="text-center"><Building2 className="h-4 w-4 inline" /></TableHead>
                <TableHead className="text-center"><Send className="h-4 w-4 inline" /></TableHead>
                <TableHead className="text-center"><MessageSquare className="h-4 w-4 inline" /></TableHead>
                <TableHead>Ações</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {filtered.map(t => {
                const s = getStats(t.id);
                return (
                  <TableRow key={t.id}>
                    <TableCell className="font-medium">
                      <div className="flex items-center gap-2">
                        {t.logo_url && <img src={t.logo_url} className="h-6 w-6 rounded object-cover" alt="" />}
                        {t.name}
                      </div>
                    </TableCell>
                    <TableCell className="text-muted-foreground">{t.slug || "—"}</TableCell>
                    <TableCell>
                      <Badge variant={t.is_active ? "default" : "secondary"}>
                        {t.is_active ? "Ativo" : "Inativo"}
                      </Badge>
                    </TableCell>
                    <TableCell className="text-muted-foreground text-sm">
                      {t.created_at ? format(new Date(t.created_at), "dd/MM/yyyy") : "—"}
                    </TableCell>
                    <TableCell className="text-center">{s?.users ?? "—"}</TableCell>
                    <TableCell className="text-center">{s?.contacts ?? "—"}</TableCell>
                    <TableCell className="text-center">{s?.campaigns ?? "—"}</TableCell>
                    <TableCell className="text-center">{s?.chat_rooms ?? "—"}</TableCell>
                    <TableCell>
                      <div className="flex items-center gap-1">
                        <Button
                          variant="ghost"
                          size="icon"
                          title="Visualizar plataforma"
                          onClick={() => {
                            setImpersonation(t.id, t.name);
                            navigate("/admin/dashboard");
                          }}
                        >
                          <Eye className="h-4 w-4" />
                        </Button>
                        <Button variant="ghost" size="icon" onClick={() => openEdit(t)}><Pencil className="h-4 w-4" /></Button>
                        <Switch checked={!!t.is_active} onCheckedChange={v => toggleActive.mutate({ id: t.id, active: v })} />
                      </div>
                    </TableCell>
                  </TableRow>
                );
              })}
              {filtered.length === 0 && (
                <TableRow><TableCell colSpan={9} className="text-center text-muted-foreground py-8">Nenhum tenant encontrado</TableCell></TableRow>
              )}
            </TableBody>
          </Table>
        )}
      </CardContent>
    </Card>
  );
}
