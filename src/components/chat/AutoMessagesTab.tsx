import { useEffect, useState, useCallback } from "react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { useLanguage } from "@/contexts/LanguageContext";
import { useToast } from "@/hooks/use-toast";
import { supabase } from "@/integrations/supabase/client";
import {
  MessageSquare,
  WifiOff,
  Clock,
  XCircle,
  ListOrdered,
  UserCheck,
  ArrowRightLeft,
  Star,
  Sunrise,
  UserX,
  Save,
  type LucideIcon,
} from "lucide-react";

interface AutoRule {
  id: string;
  rule_type: string;
  is_enabled: boolean;
  trigger_minutes: number | null;
  message_content: string | null;
}

interface AutoMessageTypeConfig {
  rule_type: string;
  icon: LucideIcon;
  hasMinutes: boolean;
  defaultEnabled: boolean;
  defaultMinutes?: number;
  group: "session" | "time" | "special";
}

const AUTO_MESSAGE_TYPES: AutoMessageTypeConfig[] = [
  // Session group
  { rule_type: "welcome_message", icon: MessageSquare, hasMinutes: false, defaultEnabled: true, group: "session" },
  { rule_type: "queue_position", icon: ListOrdered, hasMinutes: false, defaultEnabled: false, group: "session" },
  { rule_type: "attendant_assigned", icon: UserCheck, hasMinutes: false, defaultEnabled: true, group: "session" },
  { rule_type: "transfer_notice", icon: ArrowRightLeft, hasMinutes: false, defaultEnabled: false, group: "session" },
  // Time group
  { rule_type: "inactivity_warning", icon: Clock, hasMinutes: true, defaultEnabled: false, defaultMinutes: 5, group: "time" },
  { rule_type: "auto_close", icon: XCircle, hasMinutes: true, defaultEnabled: false, defaultMinutes: 30, group: "time" },
  { rule_type: "attendant_absence", icon: UserX, hasMinutes: true, defaultEnabled: false, defaultMinutes: 3, group: "time" },
  // Special group
  { rule_type: "offline_message", icon: WifiOff, hasMinutes: false, defaultEnabled: true, group: "special" },
  { rule_type: "post_service_csat", icon: Star, hasMinutes: false, defaultEnabled: false, group: "special" },
  { rule_type: "return_online", icon: Sunrise, hasMinutes: false, defaultEnabled: false, group: "special" },
];

const GROUP_LABELS: Record<string, string> = {
  session: "chat.autoMsg.sessionGroup",
  time: "chat.autoMsg.timeGroup",
  special: "chat.autoMsg.specialGroup",
};

const AutoMessagesTab = () => {
  const { t } = useLanguage();
  const { toast } = useToast();
  const [rules, setRules] = useState<AutoRule[]>([]);
  const [localEdits, setLocalEdits] = useState<Record<string, { message_content?: string; trigger_minutes?: number | null }>>({});
  const [savingId, setSavingId] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  const fetchAndSeed = useCallback(async () => {
    const { data: { session } } = await supabase.auth.getSession();
    if (!session) return;

    const { data: rulesData } = await supabase
      .from("chat_auto_rules")
      .select("id, rule_type, is_enabled, trigger_minutes, message_content")
      .order("created_at");

    const existing = rulesData ?? [];
    const existingTypes = new Set(existing.map((r) => r.rule_type));

    // Seed missing types
    const toInsert = AUTO_MESSAGE_TYPES.filter((t) => !existingTypes.has(t.rule_type));

    if (toInsert.length > 0) {
      const inserts = toInsert.map((cfg) => ({
        user_id: session.user.id,
        rule_type: cfg.rule_type,
        is_enabled: cfg.defaultEnabled,
        trigger_minutes: cfg.defaultMinutes ?? null,
        message_content: t(`chat.autoMsg.${cfg.rule_type}.default`),
      }));

      const { data: inserted } = await supabase
        .from("chat_auto_rules")
        .insert(inserts)
        .select("id, rule_type, is_enabled, trigger_minutes, message_content");

      setRules([...existing, ...(inserted ?? [])]);
    } else {
      setRules(existing);
    }

    setLoading(false);
  }, [t]);

  useEffect(() => {
    fetchAndSeed();
  }, [fetchAndSeed]);

  const getRuleForType = (ruleType: string): AutoRule | undefined =>
    rules.find((r) => r.rule_type === ruleType);

  const toggleRule = async (rule: AutoRule, enabled: boolean) => {
    await supabase.from("chat_auto_rules").update({ is_enabled: enabled }).eq("id", rule.id);
    setRules((prev) => prev.map((r) => r.id === rule.id ? { ...r, is_enabled: enabled } : r));
  };

  const saveRule = async (rule: AutoRule) => {
    const edits = localEdits[rule.id];
    if (!edits) return;

    setSavingId(rule.id);
    const updates: Record<string, any> = {};
    if (edits.message_content !== undefined) updates.message_content = edits.message_content;
    if (edits.trigger_minutes !== undefined) updates.trigger_minutes = edits.trigger_minutes;

    await supabase.from("chat_auto_rules").update(updates).eq("id", rule.id);
    setRules((prev) => prev.map((r) => r.id === rule.id ? { ...r, ...updates } : r));
    setLocalEdits((prev) => {
      const next = { ...prev };
      delete next[rule.id];
      return next;
    });
    toast({ title: t("chat.settings.rules.savedRule") });
    setSavingId(null);
  };

  const getLocalValue = (rule: AutoRule, field: "message_content" | "trigger_minutes") => {
    const edit = localEdits[rule.id];
    if (edit && field in edit) return edit[field as keyof typeof edit];
    return rule[field];
  };

  const setLocalEdit = (ruleId: string, field: string, value: any) => {
    setLocalEdits((prev) => ({
      ...prev,
      [ruleId]: { ...prev[ruleId], [field]: value },
    }));
  };

  const hasUnsavedChanges = (ruleId: string) => !!localEdits[ruleId];

  if (loading) {
    return (
      <div className="flex justify-center py-12">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary" />
      </div>
    );
  }

  const groups: Array<{ key: string; types: AutoMessageTypeConfig[] }> = [
    { key: "session", types: AUTO_MESSAGE_TYPES.filter((t) => t.group === "session") },
    { key: "time", types: AUTO_MESSAGE_TYPES.filter((t) => t.group === "time") },
    { key: "special", types: AUTO_MESSAGE_TYPES.filter((t) => t.group === "special") },
  ];

  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-base">{t("chat.settings.rules.title")}</CardTitle>
        <CardDescription>{t("chat.settings.rules.description")}</CardDescription>
      </CardHeader>
      <CardContent className="space-y-8">
        {groups.map((group) => (
          <div key={group.key} className="space-y-4">
            <p className="text-sm font-semibold text-muted-foreground uppercase tracking-wide">
              {t(GROUP_LABELS[group.key])}
            </p>
            <div className="space-y-3">
              {group.types.map((cfg) => {
                const rule = getRuleForType(cfg.rule_type);
                if (!rule) return null;
                const Icon = cfg.icon;
                const isDisabled = !rule.is_enabled;

                return (
                  <div
                    key={rule.id}
                    className="rounded-lg border border-border/50 p-4 space-y-3"
                  >
                    {/* Header */}
                    <div className="flex items-start justify-between gap-3">
                      <div className="flex items-start gap-3 flex-1 min-w-0">
                        <div className="rounded-md bg-primary/10 p-2 mt-0.5">
                          <Icon className="h-4 w-4 text-primary" />
                        </div>
                        <div className="flex-1 min-w-0">
                          <p className="font-medium text-sm">{t(`chat.autoMsg.${cfg.rule_type}.title`)}</p>
                          <p className="text-xs text-muted-foreground mt-0.5">
                            {t(`chat.autoMsg.${cfg.rule_type}.description`)}
                          </p>
                        </div>
                      </div>
                      <Switch
                        checked={rule.is_enabled}
                        onCheckedChange={(v) => toggleRule(rule, v)}
                      />
                    </div>

                    {/* Fields */}
                    <div className={`space-y-3 transition-opacity ${isDisabled ? "opacity-40 pointer-events-none" : ""}`}>
                      {cfg.hasMinutes && (
                        <div className="space-y-1.5">
                          <Label className="text-xs">{t("chat.autoMsg.minutesLabel")}</Label>
                          <Input
                            type="number"
                            min={1}
                            value={getLocalValue(rule, "trigger_minutes") ?? ""}
                            onChange={(e) => setLocalEdit(rule.id, "trigger_minutes", Number(e.target.value) || null)}
                            className="w-[120px]"
                          />
                        </div>
                      )}
                      <div className="space-y-1.5">
                        <Label className="text-xs">{t("chat.settings.macros.content")}</Label>
                        <Textarea
                          value={(getLocalValue(rule, "message_content") as string) ?? ""}
                          onChange={(e) => setLocalEdit(rule.id, "message_content", e.target.value)}
                          rows={2}
                        />
                      </div>
                      {hasUnsavedChanges(rule.id) && (
                        <Button
                          size="sm"
                          onClick={() => saveRule(rule)}
                          disabled={savingId === rule.id}
                        >
                          <Save className="h-3.5 w-3.5 mr-1.5" />
                          {savingId === rule.id ? t("chat.settings.rules.savingRule") : t("common.save")}
                        </Button>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        ))}
      </CardContent>
    </Card>
  );
};

export default AutoMessagesTab;
