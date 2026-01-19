import { Building2, Users, Star, MapPin, ChevronRight, Trash2 } from "lucide-react";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { useLanguage } from "@/contexts/LanguageContext";

interface CompanyContact {
  id: string;
  name: string;
  email: string;
  phone: string | null;
  role: string | null;
  is_primary: boolean;
}

interface Company {
  id: string;
  name: string;
  trade_name: string | null;
  email: string;
  phone: string | null;
  company_document: string | null;
  company_sector: string | null;
  city: string | null;
  state: string | null;
  contacts_count: number;
  primary_contact: CompanyContact | null;
}

interface CompanyCardProps {
  company: Company;
  onClick: () => void;
  onDelete: () => void;
}

export function CompanyCard({ company, onClick, onDelete }: CompanyCardProps) {
  const { t } = useLanguage();
  
  return (
    <Card 
      className="p-4 hover:shadow-md transition-shadow cursor-pointer group"
      onClick={onClick}
    >
      <div className="flex items-start justify-between mb-3">
        <div className="flex items-center gap-2">
          <div className="p-2 bg-primary/10 rounded-lg">
            <Building2 className="h-5 w-5 text-primary" />
          </div>
          <div>
            <h3 className="font-semibold text-lg leading-tight">{company.name}</h3>
            {company.trade_name && company.trade_name !== company.name && (
              <p className="text-sm text-muted-foreground">{company.trade_name}</p>
            )}
          </div>
        </div>
        <div className="flex items-center gap-1">
          <Button
            variant="ghost"
            size="icon"
            className="h-8 w-8 opacity-0 group-hover:opacity-100 transition-opacity"
            onClick={(e) => {
              e.stopPropagation();
              onDelete();
            }}
          >
            <Trash2 className="h-4 w-4 text-destructive" />
          </Button>
          <ChevronRight className="h-5 w-5 text-muted-foreground" />
        </div>
      </div>

      {company.company_document && (
        <p className="text-xs text-muted-foreground mb-2">
          CNPJ: {company.company_document}
        </p>
      )}

      <div className="flex flex-wrap gap-2 mb-3">
        {company.company_sector && (
          <Badge variant="secondary" className="text-xs">
            {company.company_sector}
          </Badge>
        )}
        <Badge variant="outline" className="text-xs">
          <Users className="h-3 w-3 mr-1" />
          {company.contacts_count} {company.contacts_count === 1 ? t("companies.contact") : t("companies.contacts")}
        </Badge>
      </div>

      {(company.city || company.state) && (
        <div className="flex items-center gap-1 text-xs text-muted-foreground mb-3">
          <MapPin className="h-3 w-3" />
          {[company.city, company.state].filter(Boolean).join(" - ")}
        </div>
      )}

      {company.primary_contact && (
        <div className="border-t pt-3 mt-2">
          <div className="flex items-center gap-2">
            <Star className="h-4 w-4 text-amber-500 fill-amber-500" />
            <div className="min-w-0 flex-1">
              <p className="text-sm font-medium truncate">{company.primary_contact.name}</p>
              <p className="text-xs text-muted-foreground truncate">{company.primary_contact.email}</p>
            </div>
          </div>
        </div>
      )}

      {!company.primary_contact && company.contacts_count === 0 && (
        <div className="border-t pt-3 mt-2">
          <p className="text-xs text-amber-600">{t("companies.noPrimaryContact")}</p>
        </div>
      )}
    </Card>
  );
}
