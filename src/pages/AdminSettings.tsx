import { useEffect, useState, useCallback } from "react";
import { useParams } from "react-router-dom";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import SidebarLayout from "@/components/SidebarLayout";
import { useLanguage } from "@/contexts/LanguageContext";
import { useToast } from "@/hooks/use-toast";
import { supabase } from "@/integrations/supabase/client";
import { Save, Plus, Edit, Trash2 } from "lucide-react";

interface Macro {
  id: string;
  title: string;
  content: string;
  shortcut: string | null;
  category: string | null;
}

interface BusinessHour {
  id?: string;
  day_of_week: number;
  start_time: string;
  end_time: string;
  is_active: boolean;
}

interface AutoRule {
  id: string;
  rule_type: string;
  is_enabled: boolean;
  trigger_minutes: number | null;
  message_content: string | null;
}

const DAY_NAMES_PT = ["Domingo", "Segunda", "Terça", "Quarta", "Quinta", "Sexta", "Sábado"];
const DAY_NAMES_EN = ["Sunday", "Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday"];

const AdminSettings = () => {
  const { tab } = useParams();
  const { t, language } = useLanguage();
  const { toast } = useToast();
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  // General settings
  const [settings, setSettings] = useState({
    id: "",
    welcome_message: "Bem-vindo ao nosso chat!",
    offline_message: "Estamos offline no momento.",
    auto_assignment: true,
    max_queue_size: 50,
    require_approval: false,
  });

  // Macros
  const [macros, setMacros] = useState<Macro[]>([]);
  const [macroDialog, setMacroDialog] = useState(false);
  const [editingMacro, setEditingMacro] = useState<Macro | null>(null);
  const [macroForm, setMacroForm] = useState({ title: "", content: "", shortcut: "", category: "" });

  // Business Hours
  const [hours, setHours] = useState<BusinessHour[]>([]);

  // Auto Rules
  const [rules, setRules] = useState<AutoRule[]>([]);

  const fetchAll = useCallback(async () => {
    const { data: { session } } = await supabase.auth.getSession();
    if (!session) return;
    const userId = session.user.id;

    // Settings
    const { data: settingsData } = await supabase
      .from("chat_settings")
      .select("*")
      .maybeSingle();

    if (settingsData) {
      setSettings({
        id: settingsData.id,
        welcome_message: settingsData.welcome_message ?? "",
        offline_message: settingsData.offline_message ?? "",
        auto_assignment: settingsData.auto_assignment ?? true,
        max_queue_size: settingsData.max_queue_size ?? 50,
        require_approval: settingsData.require_approval ?? false,
      });
    }

    // Macros
    const { data: macrosData } = await supabase
      .from("chat_macros")
      .select("id, title, content, shortcut, category")
      .order("created_at");
    setMacros(macrosData ?? []);

    // Business Hours
    const { data: hoursData } = await supabase
      .from("chat_business_hours")
      .select("id, day_of_week, start_time, end_time, is_active")
      .order("day_of_week");

    if (hoursData && hoursData.length > 0) {
      setHours(hoursData);
    } else {
      // Create defaults
      const defaults: BusinessHour[] = Array.from({ length: 7 }, (_, i) => ({
        day_of_week: i,
        start_time: "08:00",
        end_time: "18:00",
        is_active: i >= 1 && i <= 5,
      }));
      setHours(defaults);
    }

    // Auto Rules
    const { data: rulesData } = await supabase
      .from("chat_auto_rules")
      .select("id, rule_type, is_enabled, trigger_minutes, message_content")
      .order("created_at");
    setRules(rulesData ?? []);

    setLoading(false);
  }, []);

  useEffect(() => {
    fetchAll();
  }, [fetchAll]);

  // Save general settings
  const handleSaveGeneral = async () => {
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

  // Macro CRUD
  const openMacroDialog = (macro?: Macro) => {
    if (macro) {
      setEditingMacro(macro);
      setMacroForm({ title: macro.title, content: macro.content, shortcut: macro.shortcut ?? "", category: macro.category ?? "" });
    } else {
      setEditingMacro(null);
      setMacroForm({ title: "", content: "", shortcut: "", category: "" });
    }
    setMacroDialog(true);
  };

  const saveMacro = async () => {
    const { data: { session } } = await supabase.auth.getSession();
    if (!session) return;

    if (editingMacro) {
      await supabase.from("chat_macros").update({
        title: macroForm.title,
        content: macroForm.content,
        shortcut: macroForm.shortcut || null,
        category: macroForm.category || null,
      }).eq("id", editingMacro.id);
    } else {
      await supabase.from("chat_macros").insert({
        user_id: session.user.id,
        title: macroForm.title,
        content: macroForm.content,
        shortcut: macroForm.shortcut || null,
        category: macroForm.category || null,
      });
    }

    setMacroDialog(false);
    toast({ title: t("chat.settings.saved") });
    fetchAll();
  };

  const deleteMacro = async (id: string) => {
    await supabase.from("chat_macros").delete().eq("id", id);
    toast({ title: t("chat.settings.saved") });
    fetchAll();
  };

  // Save Business Hours
  const saveBusinessHours = async () => {
    setSaving(true);
    const { data: { session } } = await supabase.auth.getSession();
    if (!session) return;

    for (const h of hours) {
      if (h.id) {
        await supabase.from("chat_business_hours").update({
          start_time: h.start_time,
          end_time: h.end_time,
          is_active: h.is_active,
        }).eq("id", h.id);
      } else {
        await supabase.from("chat_business_hours").insert({
          user_id: session.user.id,
          day_of_week: h.day_of_week,
          start_time: h.start_time,
          end_time: h.end_time,
          is_active: h.is_active,
        });
      }
    }

    toast({ title: t("chat.settings.saved") });
    setSaving(false);
    fetchAll();
  };

  // Auto Rules
  const toggleRule = async (id: string, enabled: boolean) => {
    await supabase.from("chat_auto_rules").update({ is_enabled: enabled }).eq("id", id);
    setRules((prev) => prev.map((r) => r.id === id ? { ...r, is_enabled: enabled } : r));
  };

  const updateRuleField = async (id: string, field: string, value: string | number | null) => {
    await supabase.from("chat_auto_rules").update({ [field]: value }).eq("id", id);
    setRules((prev) => prev.map((r) => r.id === id ? { ...r, [field]: value } : r));
  };

  const addRule = async (ruleType: string) => {
    const { data: { session } } = await supabase.auth.getSession();
    if (!session) return;

    await supabase.from("chat_auto_rules").insert({
      user_id: session.user.id,
      rule_type: ruleType,
      is_enabled: false,
      message_content: "",
    });

    fetchAll();
  };

  const deleteRule = async (id: string) => {
    await supabase.from("chat_auto_rules").delete().eq("id", id);
    fetchAll();
  };

  const dayNames = language === "pt-BR" ? DAY_NAMES_PT : DAY_NAMES_EN;

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
        <div>
          <h1 className="text-2xl font-bold">{t("chat.settings.title")}</h1>
          <p className="text-muted-foreground">{t("chat.settings.subtitle")}</p>
        </div>

        <Tabs defaultValue={tab ?? "general"}>
          <TabsList className="flex-wrap">
            <TabsTrigger value="general">{t("chat.settings.tab_general")}</TabsTrigger>
            <TabsTrigger value="widget">{t("chat.settings.tab_widget")}</TabsTrigger>
            <TabsTrigger value="macros">{t("chat.settings.tab_macros")}</TabsTrigger>
            <TabsTrigger value="hours">{t("chat.settings.tab_hours")}</TabsTrigger>
            <TabsTrigger value="rules">{t("chat.settings.tab_rules")}</TabsTrigger>
          </TabsList>

          {/* General Tab */}
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
            <Button onClick={handleSaveGeneral} disabled={saving}>
              <Save className="h-4 w-4 mr-2" />
              {saving ? t("common.saving") : t("common.save")}
            </Button>
          </TabsContent>

          {/* Widget Tab */}
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

          {/* Macros Tab */}
          <TabsContent value="macros" className="space-y-4 mt-4">
            <Card>
              <CardHeader>
                <div className="flex items-center justify-between">
                  <div>
                    <CardTitle className="text-base">{t("chat.settings.macros.title")}</CardTitle>
                    <CardDescription>{t("chat.settings.macros.description")}</CardDescription>
                  </div>
                  <Button size="sm" onClick={() => openMacroDialog()}>
                    <Plus className="h-4 w-4 mr-1" />
                    {t("chat.settings.macros.new")}
                  </Button>
                </div>
              </CardHeader>
              <CardContent>
                {macros.length === 0 ? (
                  <p className="text-sm text-muted-foreground text-center py-8">{t("chat.gerencial.no_data")}</p>
                ) : (
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>{t("chat.settings.macros.title_label")}</TableHead>
                        <TableHead>{t("chat.settings.macros.shortcut")}</TableHead>
                        <TableHead>{t("chat.settings.macros.category")}</TableHead>
                        <TableHead className="w-[100px]" />
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {macros.map((m) => (
                        <TableRow key={m.id}>
                          <TableCell className="font-medium">{m.title}</TableCell>
                          <TableCell className="font-mono text-sm">{m.shortcut ?? "—"}</TableCell>
                          <TableCell>{m.category ?? "—"}</TableCell>
                          <TableCell>
                            <div className="flex gap-1">
                              <Button variant="ghost" size="icon" className="h-8 w-8" onClick={() => openMacroDialog(m)}>
                                <Edit className="h-4 w-4" />
                              </Button>
                              <Button variant="ghost" size="icon" className="h-8 w-8" onClick={() => deleteMacro(m.id)}>
                                <Trash2 className="h-4 w-4 text-destructive" />
                              </Button>
                            </div>
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                )}
              </CardContent>
            </Card>
          </TabsContent>

          {/* Hours Tab */}
          <TabsContent value="hours" className="space-y-4 mt-4">
            <Card>
              <CardHeader>
                <CardTitle className="text-base">{t("chat.settings.hours.title")}</CardTitle>
                <CardDescription>{t("chat.settings.hours.description")}</CardDescription>
              </CardHeader>
              <CardContent>
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>{t("chat.settings.hours.day")}</TableHead>
                      <TableHead>{t("chat.settings.hours.start")}</TableHead>
                      <TableHead>{t("chat.settings.hours.end")}</TableHead>
                      <TableHead>{t("chat.settings.hours.active")}</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {hours.map((h, i) => (
                      <TableRow key={h.day_of_week}>
                        <TableCell className="font-medium">{dayNames[h.day_of_week]}</TableCell>
                        <TableCell>
                          <Input
                            type="time"
                            value={h.start_time}
                            className="w-[120px]"
                            onChange={(e) => {
                              const updated = [...hours];
                              updated[i] = { ...updated[i], start_time: e.target.value };
                              setHours(updated);
                            }}
                          />
                        </TableCell>
                        <TableCell>
                          <Input
                            type="time"
                            value={h.end_time}
                            className="w-[120px]"
                            onChange={(e) => {
                              const updated = [...hours];
                              updated[i] = { ...updated[i], end_time: e.target.value };
                              setHours(updated);
                            }}
                          />
                        </TableCell>
                        <TableCell>
                          <Switch
                            checked={h.is_active}
                            onCheckedChange={(v) => {
                              const updated = [...hours];
                              updated[i] = { ...updated[i], is_active: v };
                              setHours(updated);
                            }}
                          />
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
                <Button className="mt-4" onClick={saveBusinessHours} disabled={saving}>
                  <Save className="h-4 w-4 mr-2" />
                  {saving ? t("common.saving") : t("common.save")}
                </Button>
              </CardContent>
            </Card>
          </TabsContent>

          {/* Rules Tab */}
          <TabsContent value="rules" className="space-y-4 mt-4">
            <Card>
              <CardHeader>
                <div className="flex items-center justify-between">
                  <div>
                    <CardTitle className="text-base">{t("chat.settings.rules.title")}</CardTitle>
                    <CardDescription>{t("chat.settings.rules.description")}</CardDescription>
                  </div>
                  <div className="flex gap-2">
                    {["welcome_message", "offline_message", "inactivity_warning", "auto_close"].map((type) => {
                      const exists = rules.some((r) => r.rule_type === type);
                      if (exists) return null;
                      return (
                        <Button key={type} variant="outline" size="sm" onClick={() => addRule(type)}>
                          <Plus className="h-4 w-4 mr-1" />
                          {t(`chat.settings.rules.${type.replace("_message", "").replace("_warning", "").replace("auto_", "auto_")}`)}
                        </Button>
                      );
                    })}
                  </div>
                </div>
              </CardHeader>
              <CardContent className="space-y-4">
                {rules.length === 0 ? (
                  <p className="text-sm text-muted-foreground text-center py-8">{t("chat.gerencial.no_data")}</p>
                ) : (
                  rules.map((rule) => (
                    <Card key={rule.id} className="p-4">
                      <div className="flex items-center justify-between mb-3">
                        <div className="flex items-center gap-3">
                          <Switch
                            checked={rule.is_enabled}
                            onCheckedChange={(v) => toggleRule(rule.id, v)}
                          />
                          <Label className="font-medium capitalize">
                            {rule.rule_type.replace(/_/g, " ")}
                          </Label>
                        </div>
                        <Button variant="ghost" size="icon" className="h-8 w-8" onClick={() => deleteRule(rule.id)}>
                          <Trash2 className="h-4 w-4 text-destructive" />
                        </Button>
                      </div>
                      {(rule.rule_type === "inactivity_warning" || rule.rule_type === "auto_close") && (
                        <div className="space-y-2 mb-3">
                          <Label>{t("chat.settings.rules.minutes")}</Label>
                          <Input
                            type="number"
                            value={rule.trigger_minutes ?? ""}
                            className="w-[120px]"
                            onChange={(e) => updateRuleField(rule.id, "trigger_minutes", Number(e.target.value) || null)}
                          />
                        </div>
                      )}
                      {(rule.rule_type === "welcome_message" || rule.rule_type === "offline_message" || rule.rule_type === "inactivity_warning") && (
                        <div className="space-y-2">
                          <Label>{t("chat.settings.macros.content")}</Label>
                          <Textarea
                            value={rule.message_content ?? ""}
                            onChange={(e) => updateRuleField(rule.id, "message_content", e.target.value)}
                          />
                        </div>
                      )}
                    </Card>
                  ))
                )}
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>

        {/* Macro Dialog */}
        <Dialog open={macroDialog} onOpenChange={setMacroDialog}>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>
                {editingMacro ? t("chat.settings.macros.title_label") : t("chat.settings.macros.new")}
              </DialogTitle>
            </DialogHeader>
            <div className="space-y-4">
              <div className="space-y-2">
                <Label>{t("chat.settings.macros.title_label")}</Label>
                <Input
                  value={macroForm.title}
                  onChange={(e) => setMacroForm({ ...macroForm, title: e.target.value })}
                />
              </div>
              <div className="space-y-2">
                <Label>{t("chat.settings.macros.content")}</Label>
                <Textarea
                  value={macroForm.content}
                  onChange={(e) => setMacroForm({ ...macroForm, content: e.target.value })}
                  rows={4}
                />
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label>{t("chat.settings.macros.shortcut")}</Label>
                  <Input
                    value={macroForm.shortcut}
                    onChange={(e) => setMacroForm({ ...macroForm, shortcut: e.target.value })}
                    placeholder="/saudacao"
                  />
                </div>
                <div className="space-y-2">
                  <Label>{t("chat.settings.macros.category")}</Label>
                  <Input
                    value={macroForm.category}
                    onChange={(e) => setMacroForm({ ...macroForm, category: e.target.value })}
                  />
                </div>
              </div>
            </div>
            <DialogFooter>
              <Button variant="outline" onClick={() => setMacroDialog(false)}>{t("common.cancel")}</Button>
              <Button onClick={saveMacro} disabled={!macroForm.title || !macroForm.content}>
                {t("common.save")}
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </div>
    </SidebarLayout>
  );
};

export default AdminSettings;
