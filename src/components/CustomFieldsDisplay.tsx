import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { useLanguage } from "@/contexts/LanguageContext";

interface FieldDef {
  id: string;
  key: string;
  label: string;
  field_type: string;
  target: string;
  display_order: number | null;
  is_active: boolean;
}

interface CustomFieldsDisplayProps {
  fields: Record<string, any> | null | undefined;
  target?: "company" | "contact";
}

function formatFieldValue(value: any, fieldType: string) {
  if (value === null || value === undefined || value === "") return null;

  switch (fieldType) {
    case "decimal":
      return new Intl.NumberFormat("pt-BR", { style: "currency", currency: "BRL" }).format(Number(value));
    case "integer":
      return Number(value).toLocaleString("pt-BR");
    case "date":
      try {
        return new Date(value).toLocaleDateString("pt-BR");
      } catch {
        return String(value);
      }
    case "url":
      return (
        <a
          href={String(value).startsWith("http") ? String(value) : `https://${value}`}
          target="_blank"
          rel="noopener noreferrer"
          className="text-primary hover:underline truncate"
        >
          {String(value).replace(/^https?:\/\//, "").slice(0, 40)}
        </a>
      );
    case "boolean":
      return (
        <Badge variant={value === true || value === "true" ? "default" : "secondary"} className="text-[10px]">
          {value === true || value === "true" ? "Sim" : "Não"}
        </Badge>
      );
    default:
      return String(value);
  }
}

export function CustomFieldsDisplay({ fields, target }: CustomFieldsDisplayProps) {
  const { t } = useLanguage();

  const { data: fieldDefs = [] } = useQuery({
    queryKey: ["custom-field-definitions"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("chat_custom_field_definitions" as any)
        .select("*")
        .eq("is_active", true)
        .order("display_order", { ascending: true });
      if (error) throw error;
      return (data as any as FieldDef[]) ?? [];
    },
    staleTime: 5 * 60 * 1000,
  });

  if (!fields || Object.keys(fields).length === 0) return null;

  // Build display entries: match definitions with field values
  const defsForTarget = target
    ? fieldDefs.filter((d) => d.target === target)
    : fieldDefs;

  const defsByKey = new Map(defsForTarget.map((d) => [d.key, d]));

  type DisplayEntry = { key: string; label: string; value: any; fieldType: string; order: number };
  const entries: DisplayEntry[] = [];

  for (const [key, val] of Object.entries(fields)) {
    if (val === null || val === undefined || val === "") continue;
    const def = defsByKey.get(key);
    if (def) {
      entries.push({
        key,
        label: def.label,
        value: val,
        fieldType: def.field_type,
        order: def.display_order ?? 999,
      });
    } else {
      // Fallback: show raw key
      entries.push({
        key,
        label: key,
        value: val,
        fieldType: "text",
        order: 9999,
      });
    }
  }

  // Sort by display_order
  entries.sort((a, b) => a.order - b.order);

  if (entries.length === 0) return null;

  return (
    <Card>
      <CardHeader className="pb-2">
        <CardTitle className="text-sm">{t("customFields.title")}</CardTitle>
      </CardHeader>
      <CardContent className="space-y-2 text-sm">
        {entries.map((entry) => {
          const formatted = formatFieldValue(entry.value, entry.fieldType);
          if (formatted === null) return null;
          return (
            <div key={entry.key} className="flex justify-between items-center">
              <span className="text-muted-foreground">{entry.label}</span>
              <span className="font-medium text-right max-w-[60%] truncate">{formatted}</span>
            </div>
          );
        })}
      </CardContent>
    </Card>
  );
}

/** Compact version for use in cards/panels (no Card wrapper) */
export function CustomFieldsInline({
  fields,
  target,
  maxFields = 2,
}: CustomFieldsDisplayProps & { maxFields?: number }) {
  const { data: fieldDefs = [] } = useQuery({
    queryKey: ["custom-field-definitions"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("chat_custom_field_definitions" as any)
        .select("*")
        .eq("is_active", true)
        .order("display_order", { ascending: true });
      if (error) throw error;
      return (data as any as FieldDef[]) ?? [];
    },
    staleTime: 5 * 60 * 1000,
  });

  if (!fields || Object.keys(fields).length === 0) return null;

  const defsForTarget = target
    ? fieldDefs.filter((d) => d.target === target)
    : fieldDefs;

  const defsByKey = new Map(defsForTarget.map((d) => [d.key, d]));

  const entries: { key: string; label: string; value: any; fieldType: string; order: number }[] = [];

  for (const [key, val] of Object.entries(fields)) {
    if (val === null || val === undefined || val === "") continue;
    const def = defsByKey.get(key);
    if (def) {
      entries.push({ key, label: def.label, value: val, fieldType: def.field_type, order: def.display_order ?? 999 });
    }
  }

  entries.sort((a, b) => a.order - b.order);
  const visible = entries.slice(0, maxFields);

  if (visible.length === 0) return null;

  return (
    <div className="space-y-1">
      {visible.map((entry) => {
        const formatted = formatFieldValue(entry.value, entry.fieldType);
        if (formatted === null) return null;
        return (
          <div key={entry.key} className="flex items-center justify-between text-xs">
            <span className="text-muted-foreground truncate mr-2">{entry.label}</span>
            <span className="font-medium text-right truncate max-w-[60%]">{formatted}</span>
          </div>
        );
      })}
    </div>
  );
}
