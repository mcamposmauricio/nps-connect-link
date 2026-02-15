import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { useLanguage } from "@/contexts/LanguageContext";

interface CustomFieldsDisplayProps {
  fields: Record<string, string> | null | undefined;
}

export function CustomFieldsDisplay({ fields }: CustomFieldsDisplayProps) {
  const { t } = useLanguage();

  if (!fields || Object.keys(fields).length === 0) return null;

  const entries = Object.entries(fields).filter(([, v]) => v);

  if (entries.length === 0) return null;

  return (
    <Card>
      <CardHeader className="pb-2">
        <CardTitle className="text-sm">{t("customFields.title")}</CardTitle>
      </CardHeader>
      <CardContent className="space-y-2 text-sm">
        {entries.map(([key, val]) => (
          <div key={key} className="flex justify-between">
            <span className="text-muted-foreground">{key}</span>
            <span className="font-medium text-right max-w-[60%] truncate">{val}</span>
          </div>
        ))}
      </CardContent>
    </Card>
  );
}
