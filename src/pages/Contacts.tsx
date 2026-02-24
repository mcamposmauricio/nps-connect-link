import { useEffect, useState, useCallback } from "react";

import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { useToast } from "@/hooks/use-toast";
import { Plus, Loader2, Building2, Users, Upload, ChevronDown, Filter, X } from "lucide-react";
import { useAuth } from "@/hooks/useAuth";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { useLanguage } from "@/contexts/LanguageContext";
import { CompanyCard } from "@/components/CompanyCard";
import { CompanyForm } from "@/components/CompanyForm";
import { CompanyDetailsSheet } from "@/components/CompanyDetailsSheet";
import { QuickContactForm } from "@/components/QuickContactForm";
import { BulkImportDialog } from "@/components/BulkImportDialog";
import { Input } from "@/components/ui/input";
import { Search } from "lucide-react";

interface CompanyContact {
  id: string;
  name: string;
  email: string;
  phone: string | null;
  role: string | null;
  department: string | null;
  is_primary: boolean;
  created_at: string;
  external_id: string | null;
  public_token: string | null;
}

interface Company {
  id: string;
  name: string;
  trade_name: string | null;
  email: string;
  phone: string | null;
  company_document: string | null;
  company_sector: string | null;
  street: string | null;
  street_number: string | null;
  complement: string | null;
  neighborhood: string | null;
  city: string | null;
  state: string | null;
  zip_code: string | null;
  created_at: string;
  contacts_count: number;
  primary_contact: CompanyContact | null;
  cs_status: string | null;
  health_score: number | null;
  service_priority: string | null;
  last_nps_score: number | null;
  mrr: number | null;
  custom_fields: any;
}

const Contacts = () => {
  const [companies, setCompanies] = useState<Company[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchFilter, setSearchFilter] = useState("");
  const [addCompanyDialogOpen, setAddCompanyDialogOpen] = useState(false);
  const [addContactDialogOpen, setAddContactDialogOpen] = useState(false);
  const [editCompanyData, setEditCompanyData] = useState<Company | null>(null);
  const [selectedCompanyId, setSelectedCompanyId] = useState<string | null>(null);
  const [deleteCompanyId, setDeleteCompanyId] = useState<string | null>(null);
  const [bulkImportType, setBulkImportType] = useState<"companies" | "contacts" | null>(null);
  const [sectorFilter, setSectorFilter] = useState("");
  const [stateFilter, setStateFilter] = useState("");
  const [cityFilter, setCityFilter] = useState("");
  const [csStatusFilter, setCsStatusFilter] = useState("");
  const [priorityFilter, setPriorityFilter] = useState("");
  const [healthFilter, setHealthFilter] = useState("");
  const [npsFilter, setNpsFilter] = useState("");
  
  const { toast } = useToast();
  const { t } = useLanguage();
  const { hasPermission } = useAuth();
  const canEdit = hasPermission('contacts', 'edit');
  const canDelete = hasPermission('contacts', 'delete');

  useEffect(() => {
    fetchCompanies();
  }, []);

  const fetchCompanies = async () => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      const { data: companiesData, error: companiesError } = await supabase
        .from("contacts")
        .select("*")
        .eq("is_company", true)
        .order("name");

      if (companiesError) throw companiesError;

      const companyIds = (companiesData || []).map(c => c.id);
      
      let contactsData: any[] = [];
      if (companyIds.length > 0) {
        const { data, error: contactsError } = await supabase
          .from("company_contacts")
          .select("*")
          .in("company_id", companyIds);
        
        if (contactsError) throw contactsError;
        contactsData = data || [];
      }

      const companiesWithContacts: Company[] = (companiesData || []).map(company => {
        const companyContactsList = contactsData.filter(c => c.company_id === company.id);
        const primaryContact = companyContactsList.find(c => c.is_primary) || null;
        
        return {
          ...company,
          contacts_count: companyContactsList.length,
          primary_contact: primaryContact ? {
            id: primaryContact.id,
            name: primaryContact.name,
            email: primaryContact.email,
            phone: primaryContact.phone,
            role: primaryContact.role,
            department: primaryContact.department,
            is_primary: primaryContact.is_primary,
            created_at: primaryContact.created_at,
            external_id: primaryContact.external_id,
            public_token: primaryContact.public_token,
          } : null,
        };
      });

      setCompanies(companiesWithContacts);
    } catch (error: any) {
      toast({
        title: t("common.error"),
        description: error.message,
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  const handleCompanyClick = useCallback((company: Company) => {
    setSelectedCompanyId(company.id);
  }, []);

  const handleAddCompany = async (data: any) => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error(t("auth.error"));

      const { error } = await supabase.from("contacts").insert({
        user_id: user.id,
        name: data.name,
        email: data.email,
        phone: data.phone || null,
        is_company: true,
        company_document: data.company_document || null,
        company_sector: data.company_sector || null,
        trade_name: data.trade_name || null,
        street: data.street || null,
        street_number: data.street_number || null,
        complement: data.complement || null,
        neighborhood: data.neighborhood || null,
        city: data.city || null,
        state: data.state || null,
        zip_code: data.zip_code || null,
        service_priority: data.service_priority || 'normal',
        service_category_id: data.service_category_id || null,
        custom_fields: data.custom_fields && Object.keys(data.custom_fields).length > 0 ? data.custom_fields : {},
      } as any);

      if (error) throw error;

      toast({
        title: t("common.success"),
        description: t("companies.addSuccess"),
      });

      setAddCompanyDialogOpen(false);
      fetchCompanies();
    } catch (error: any) {
      toast({
        title: t("common.error"),
        description: error.message,
        variant: "destructive",
      });
    }
  };

  const handleEditCompany = async (data: any) => {
    if (!editCompanyData) return;

    try {
      const { error } = await supabase
        .from("contacts")
        .update({
          name: data.name,
          email: data.email,
          phone: data.phone || null,
          company_document: data.company_document || null,
          company_sector: data.company_sector || null,
          trade_name: data.trade_name || null,
          street: data.street || null,
          street_number: data.street_number || null,
          complement: data.complement || null,
          neighborhood: data.neighborhood || null,
          city: data.city || null,
          state: data.state || null,
          zip_code: data.zip_code || null,
          service_priority: data.service_priority || 'normal',
          service_category_id: data.service_category_id || null,
          custom_fields: data.custom_fields && Object.keys(data.custom_fields).length > 0 ? data.custom_fields : {},
        } as any)
        .eq("id", editCompanyData.id);

      if (error) throw error;

      toast({
        title: t("common.success"),
        description: t("companies.updateSuccess"),
      });

      setEditCompanyData(null);
      fetchCompanies();
      
      if (selectedCompanyId === editCompanyData.id) {
        setSelectedCompanyId(null);
      }
    } catch (error: any) {
      toast({
        title: t("common.error"),
        description: error.message,
        variant: "destructive",
      });
    }
  };

  const handleDeleteCompany = async () => {
    if (!deleteCompanyId) return;
    
    try {
      const { error } = await supabase
        .from("contacts")
        .delete()
        .eq("id", deleteCompanyId);

      if (error) throw error;

      toast({
        title: t("common.success"),
        description: t("companies.deleteSuccess"),
      });

      setDeleteCompanyId(null);
      if (selectedCompanyId === deleteCompanyId) {
        setSelectedCompanyId(null);
      }
      fetchCompanies();
    } catch (error: any) {
      toast({
        title: t("common.error"),
        description: error.message,
        variant: "destructive",
      });
    }
  };

  const addDropdownContent = (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button>
          <Plus className="mr-2 h-4 w-4" />
          {t("companies.add")}
          <ChevronDown className="ml-2 h-4 w-4" />
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end">
        <DropdownMenuItem onClick={() => setAddCompanyDialogOpen(true)}>
          <Building2 className="mr-2 h-4 w-4" />
          {t("companies.addCompanyManual")}
        </DropdownMenuItem>
        <DropdownMenuItem onClick={() => setAddContactDialogOpen(true)}>
          <Users className="mr-2 h-4 w-4" />
          {t("companies.addContactManual")}
        </DropdownMenuItem>
        <DropdownMenuItem onClick={() => setBulkImportType("companies")}>
          <Upload className="mr-2 h-4 w-4" />
          {t("companies.importCompaniesCsv")}
        </DropdownMenuItem>
        <DropdownMenuItem onClick={() => setBulkImportType("contacts")}>
          <Upload className="mr-2 h-4 w-4" />
          {t("companies.importContactsCsv")}
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  );

  return (
    <div className="space-y-6">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-semibold">{t("companies.title")}</h1>
            <p className="text-sm text-muted-foreground mt-1">{t("companies.subtitle")}</p>
          </div>

          {canEdit && addDropdownContent}
        </div>

        {/* Search & Filters */}
        {!loading && companies.length > 0 && (() => {
          const sectors = [...new Set(companies.map(c => c.company_sector).filter(Boolean))] as string[];
          const states = [...new Set(companies.map(c => c.state).filter(Boolean))] as string[];
          const cities = [...new Set(
            companies
              .filter(c => !stateFilter || c.state === stateFilter)
              .map(c => c.city)
              .filter(Boolean)
          )] as string[];
          const csStatuses = [...new Set(companies.map(c => c.cs_status).filter(Boolean))] as string[];
          const priorities = [...new Set(companies.map(c => c.service_priority).filter(Boolean))] as string[];
          const activeFilterCount = [sectorFilter, stateFilter, cityFilter, csStatusFilter, priorityFilter, healthFilter, npsFilter].filter(Boolean).length;

          return (
            <div className="space-y-3">
              <div className="flex items-center gap-3 flex-wrap">
                <div className="relative max-w-md flex-1 min-w-[200px]">
                  <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                  <Input
                    placeholder={t("companies.searchPlaceholder")}
                    value={searchFilter}
                    onChange={(e) => setSearchFilter(e.target.value)}
                    className="pl-10"
                  />
                </div>
                {sectors.length > 0 && (
                  <Select value={sectorFilter} onValueChange={(v) => setSectorFilter(v === "all" ? "" : v)}>
                    <SelectTrigger className="w-[180px]">
                      <Filter className="h-4 w-4 mr-2 text-muted-foreground" />
                      <SelectValue placeholder={t("companies.filterBySector")} />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">{t("companies.allSectors")}</SelectItem>
                      {sectors.sort().map(s => (
                        <SelectItem key={s} value={s}>{s}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                )}
                {states.length > 0 && (
                  <Select value={stateFilter} onValueChange={(v) => { setStateFilter(v === "all" ? "" : v); setCityFilter(""); }}>
                    <SelectTrigger className="w-[160px]">
                      <SelectValue placeholder={t("companies.filterByState")} />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">{t("companies.allStates")}</SelectItem>
                      {states.sort().map(s => (
                        <SelectItem key={s} value={s}>{s}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                )}
                {cities.length > 0 && (
                  <Select value={cityFilter} onValueChange={(v) => setCityFilter(v === "all" ? "" : v)}>
                    <SelectTrigger className="w-[180px]">
                      <SelectValue placeholder={t("companies.filterByCity")} />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">{t("companies.allCities")}</SelectItem>
                      {cities.sort().map(s => (
                        <SelectItem key={s} value={s}>{s}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                )}
                {csStatuses.length > 0 && (
                  <Select value={csStatusFilter} onValueChange={(v) => setCsStatusFilter(v === "all" ? "" : v)}>
                    <SelectTrigger className="w-[180px]">
                      <SelectValue placeholder={t("companies.filterByKanban")} />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">{t("companies.allKanbanStages")}</SelectItem>
                      {csStatuses.sort().map(s => (
                        <SelectItem key={s} value={s}>{t(`cs.status.${s}`) !== `cs.status.${s}` ? t(`cs.status.${s}`) : s}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                )}
                {priorities.length > 0 && (
                  <Select value={priorityFilter} onValueChange={(v) => setPriorityFilter(v === "all" ? "" : v)}>
                    <SelectTrigger className="w-[160px]">
                      <SelectValue placeholder={t("companies.filterByPriority")} />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">{t("companies.allPriorities")}</SelectItem>
                      {priorities.sort().map(s => (
                        <SelectItem key={s} value={s}>{t(`companies.priority.${s}`) !== `companies.priority.${s}` ? t(`companies.priority.${s}`) : s}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                )}
                <Select value={healthFilter} onValueChange={(v) => setHealthFilter(v === "all" ? "" : v)}>
                  <SelectTrigger className="w-[180px]">
                    <SelectValue placeholder={t("companies.filterByHealth")} />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">{t("companies.allHealthScores")}</SelectItem>
                    <SelectItem value="healthy">{t("companies.health.healthy")}</SelectItem>
                    <SelectItem value="warning">{t("companies.health.warning")}</SelectItem>
                    <SelectItem value="critical">{t("companies.health.critical")}</SelectItem>
                  </SelectContent>
                </Select>
                <Select value={npsFilter} onValueChange={(v) => setNpsFilter(v === "all" ? "" : v)}>
                  <SelectTrigger className="w-[140px]">
                    <SelectValue placeholder={t("companies.filterByNPS")} />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">{t("companies.allNPS")}</SelectItem>
                    <SelectItem value="promoter">{t("companies.nps.promoter")}</SelectItem>
                    <SelectItem value="neutral">{t("companies.nps.neutral")}</SelectItem>
                    <SelectItem value="detractor">{t("companies.nps.detractor")}</SelectItem>
                    <SelectItem value="none">{t("companies.nps.noResponse")}</SelectItem>
                  </SelectContent>
                </Select>
                {activeFilterCount > 0 && (
                  <Button variant="ghost" size="sm" onClick={() => { setSectorFilter(""); setStateFilter(""); setCityFilter(""); setCsStatusFilter(""); setPriorityFilter(""); setHealthFilter(""); setNpsFilter(""); }}>
                    <X className="h-4 w-4 mr-1" />
                    {activeFilterCount} {t("companies.activeFilters")}
                  </Button>
                )}
              </div>
            </div>
          );
        })()}

        {loading ? (
          <div className="flex items-center justify-center h-64">
            <Loader2 className="h-12 w-12 animate-spin text-muted-foreground" />
          </div>
        ) : companies.length === 0 ? (
          <Card className="p-12 text-center">
            <Building2 className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
            <p className="text-muted-foreground">{t("companies.noCompanies")}</p>
            {canEdit && <div className="mt-4">{addDropdownContent}</div>}
          </Card>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {companies.filter((c) => {
              if (searchFilter.trim()) {
                const term = searchFilter.toLowerCase();
                if (!(
                  c.name.toLowerCase().includes(term) ||
                  (c.trade_name && c.trade_name.toLowerCase().includes(term)) ||
                  (c.company_document && c.company_document.includes(term))
                )) return false;
              }
              if (sectorFilter && c.company_sector !== sectorFilter) return false;
              if (stateFilter && c.state !== stateFilter) return false;
              if (cityFilter && c.city !== cityFilter) return false;
              if (csStatusFilter && c.cs_status !== csStatusFilter) return false;
              if (priorityFilter && c.service_priority !== priorityFilter) return false;
              if (healthFilter) {
                const h = c.health_score;
                if (healthFilter === "healthy" && (h == null || h < 70)) return false;
                if (healthFilter === "warning" && (h == null || h < 40 || h > 69)) return false;
                if (healthFilter === "critical" && (h == null || h > 39)) return false;
              }
              if (npsFilter) {
                const n = c.last_nps_score;
                if (npsFilter === "promoter" && (n == null || n < 9)) return false;
                if (npsFilter === "neutral" && (n == null || n < 7 || n > 8)) return false;
                if (npsFilter === "detractor" && (n == null || n > 6)) return false;
                if (npsFilter === "none" && n != null) return false;
              }
              return true;
            }).map((company) => (
              <CompanyCard
                key={company.id}
                company={company}
                onClick={() => handleCompanyClick(company)}
                onDelete={() => setDeleteCompanyId(company.id)}
                canDelete={canDelete}
              />
            ))}
          </div>
        )}

        {/* Add Company Dialog */}
        <Dialog open={addCompanyDialogOpen} onOpenChange={setAddCompanyDialogOpen}>
          <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
            <DialogHeader>
              <DialogTitle>{t("companies.addCompany")}</DialogTitle>
            </DialogHeader>
            <CompanyForm
              onSubmit={handleAddCompany}
              onCancel={() => setAddCompanyDialogOpen(false)}
            />
          </DialogContent>
        </Dialog>

        {/* Add Contact Dialog */}
        <Dialog open={addContactDialogOpen} onOpenChange={setAddContactDialogOpen}>
          <DialogContent className="max-w-lg max-h-[90vh] overflow-y-auto">
            <DialogHeader>
              <DialogTitle>{t("companies.addContact")}</DialogTitle>
            </DialogHeader>
            <QuickContactForm
              onSuccess={() => {
                setAddContactDialogOpen(false);
                fetchCompanies();
              }}
              onCancel={() => setAddContactDialogOpen(false)}
            />
          </DialogContent>
        </Dialog>

        {/* Edit Company Dialog */}
        <Dialog open={!!editCompanyData} onOpenChange={(open) => !open && setEditCompanyData(null)}>
          <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
            <DialogHeader>
              <DialogTitle>{t("companies.editCompany")}</DialogTitle>
            </DialogHeader>
            {editCompanyData && (
              <CompanyForm
                initialData={{
                  name: editCompanyData.name,
                  email: editCompanyData.email,
                  phone: editCompanyData.phone || "",
                  trade_name: editCompanyData.trade_name || "",
                  company_document: editCompanyData.company_document || "",
                  company_sector: editCompanyData.company_sector || "",
                  street: editCompanyData.street || "",
                  street_number: editCompanyData.street_number || "",
                  complement: editCompanyData.complement || "",
                  neighborhood: editCompanyData.neighborhood || "",
                  city: editCompanyData.city || "",
                  state: editCompanyData.state || "",
                  zip_code: editCompanyData.zip_code || "",
                  service_priority: (editCompanyData as any).service_priority || "normal",
                  service_category_id: (editCompanyData as any).service_category_id || "",
                  custom_fields: (editCompanyData as any).custom_fields || {},
                }}
                onSubmit={handleEditCompany}
                onCancel={() => setEditCompanyData(null)}
              />
            )}
          </DialogContent>
        </Dialog>

        {/* Bulk Import Dialog */}
        <BulkImportDialog
          open={!!bulkImportType}
          onOpenChange={(open) => !open && setBulkImportType(null)}
          type={bulkImportType || "companies"}
          onSuccess={fetchCompanies}
        />

        {/* Unified Company Details Sheet */}
        <CompanyDetailsSheet
          companyId={selectedCompanyId}
          onClose={() => {
            setSelectedCompanyId(null);
            fetchCompanies();
          }}
          onEdit={() => {
            const company = companies.find(c => c.id === selectedCompanyId);
            if (company) setEditCompanyData(company);
          }}
          canEdit={canEdit}
          canDelete={canDelete}
        />

        {/* Delete Company Confirmation */}
        <AlertDialog open={!!deleteCompanyId} onOpenChange={() => setDeleteCompanyId(null)}>
          <AlertDialogContent>
            <AlertDialogHeader>
              <AlertDialogTitle>{t("companies.deleteCompany")}</AlertDialogTitle>
              <AlertDialogDescription>
                {t("companies.deleteConfirm")}
              </AlertDialogDescription>
            </AlertDialogHeader>
            <AlertDialogFooter>
              <AlertDialogCancel>{t("common.cancel")}</AlertDialogCancel>
              <AlertDialogAction
                className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
                onClick={handleDeleteCompany}
              >
                {t("common.delete")}
              </AlertDialogAction>
            </AlertDialogFooter>
          </AlertDialogContent>
        </AlertDialog>
    </div>
  );
};

export default Contacts;
