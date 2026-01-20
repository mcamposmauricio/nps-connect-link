import { useState } from "react";
import { useLanguage } from "@/contexts/LanguageContext";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { CSKanbanCard, type KanbanCompany } from "./CSKanbanCard";
import { CompanyCSDetailsSheet } from "./CompanyCSDetailsSheet";

interface CSM {
  id: string;
  name: string;
}

interface CSKanbanBoardProps {
  companies: KanbanCompany[];
  csms: CSM[];
  isLoading: boolean;
  onRefresh: () => void;
}

const CS_STATUSES = [
  { key: "implementacao", color: "bg-blue-500" },
  { key: "onboarding", color: "bg-purple-500" },
  { key: "acompanhamento", color: "bg-green-500" },
  { key: "churn", color: "bg-destructive" },
];

export function CSKanbanBoard({ companies, csms, isLoading, onRefresh }: CSKanbanBoardProps) {
  const { t } = useLanguage();
  const { toast } = useToast();
  const [selectedCompany, setSelectedCompany] = useState<KanbanCompany | null>(null);
  const [draggedCompany, setDraggedCompany] = useState<KanbanCompany | null>(null);

  const getCompaniesByStatus = (status: string) => {
    return companies.filter((c) => (c.cs_status || "implementacao") === status);
  };

  const handleDragStart = (company: KanbanCompany) => {
    setDraggedCompany(company);
  };

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
  };

  const handleDrop = async (status: string) => {
    if (!draggedCompany || draggedCompany.cs_status === status) {
      setDraggedCompany(null);
      return;
    }

    try {
      const { error } = await supabase
        .from("contacts")
        .update({ cs_status: status })
        .eq("id", draggedCompany.id);

      if (error) throw error;

      toast({
        title: t("cs.statusUpdated"),
        description: `${draggedCompany.name} → ${t(`cs.status.${status}`)}`,
      });
      
      onRefresh();
    } catch (error) {
      console.error("Error updating status:", error);
      toast({
        title: t("common.error"),
        description: t("cs.statusUpdateError"),
        variant: "destructive",
      });
    } finally {
      setDraggedCompany(null);
    }
  };

  if (isLoading) {
    return (
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        {CS_STATUSES.map((status) => (
          <Card key={status.key}>
            <CardHeader className="pb-2">
              <Skeleton className="h-6 w-32" />
            </CardHeader>
            <CardContent className="space-y-2">
              <Skeleton className="h-24 w-full" />
              <Skeleton className="h-24 w-full" />
            </CardContent>
          </Card>
        ))}
      </div>
    );
  }

  return (
    <>
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        {CS_STATUSES.map((status) => {
          const statusCompanies = getCompaniesByStatus(status.key);
          return (
            <Card 
              key={status.key}
              onDragOver={handleDragOver}
              onDrop={() => handleDrop(status.key)}
              className="min-h-[400px]"
            >
              <CardHeader className="pb-2">
                <div className="flex items-center justify-between">
                  <CardTitle className="text-sm font-medium flex items-center gap-2">
                    <div className={`w-3 h-3 rounded-full ${status.color}`} />
                    {t(`cs.status.${status.key}`)}
                  </CardTitle>
                  <Badge variant="secondary">{statusCompanies.length}</Badge>
                </div>
              </CardHeader>
              <CardContent className="space-y-2 max-h-[600px] overflow-y-auto">
                {statusCompanies.length === 0 ? (
                  <p className="text-sm text-muted-foreground text-center py-8">
                    {t("cs.noCompaniesInStatus")}
                  </p>
                ) : (
                  statusCompanies.map((company) => (
                    <CSKanbanCard
                      key={company.id}
                      company={company as KanbanCompany}
                      csms={csms}
                      onDragStart={() => handleDragStart(company)}
                      onClick={() => setSelectedCompany(company)}
                    />
                  ))
                )}
              </CardContent>
            </Card>
          );
        })}
      </div>

      <CompanyCSDetailsSheet
        company={selectedCompany}
        onClose={() => setSelectedCompany(null)}
      />
    </>
  );
}
