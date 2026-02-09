import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { User, Mail, Phone } from "lucide-react";
import { useLanguage } from "@/contexts/LanguageContext";

interface Visitor {
  id: string;
  name: string;
  email: string | null;
  phone: string | null;
  role: string | null;
  department: string | null;
  created_at: string;
}

interface VisitorInfoPanelProps {
  roomId: string;
  visitorId: string;
}

export function VisitorInfoPanel({ visitorId }: VisitorInfoPanelProps) {
  const { t } = useLanguage();
  const [visitor, setVisitor] = useState<Visitor | null>(null);

  useEffect(() => {
    const fetchVisitor = async () => {
      const { data } = await supabase
        .from("chat_visitors")
        .select("*")
        .eq("id", visitorId)
        .maybeSingle();

      setVisitor(data as Visitor | null);
    };

    fetchVisitor();
  }, [visitorId]);

  if (!visitor) {
    return (
      <div className="glass-card h-full flex items-center justify-center p-6">
        <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-primary" />
      </div>
    );
  }

  return (
    <div className="glass-card h-full">
      <div className="p-4 border-b border-white/10">
        <h3 className="text-sm font-semibold">{t("chat.workspace.visitor_info")}</h3>
      </div>
      <div className="p-4 space-y-4">
        <div className="flex items-center gap-3">
          <div className="h-10 w-10 rounded-full bg-primary/10 flex items-center justify-center">
            <User className="h-5 w-5 text-primary" />
          </div>
          <div>
            <p className="font-medium text-sm">{visitor.name}</p>
            {visitor.role && <p className="text-xs text-muted-foreground">{visitor.role}</p>}
          </div>
        </div>

        {visitor.email && (
          <div className="flex items-center gap-2 text-sm">
            <Mail className="h-4 w-4 text-muted-foreground" />
            <span>{visitor.email}</span>
          </div>
        )}

        {visitor.phone && (
          <div className="flex items-center gap-2 text-sm">
            <Phone className="h-4 w-4 text-muted-foreground" />
            <span>{visitor.phone}</span>
          </div>
        )}

        {visitor.department && (
          <div className="text-sm">
            <p className="text-xs text-muted-foreground mb-1">{t("chat.workspace.department")}</p>
            <p>{visitor.department}</p>
          </div>
        )}

        <div className="text-xs text-muted-foreground pt-2 border-t">
          {t("chat.workspace.since")} {new Date(visitor.created_at).toLocaleDateString()}
        </div>
      </div>
    </div>
  );
}
