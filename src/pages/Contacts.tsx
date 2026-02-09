import { useEffect, useState, useCallback } from "react";
import SidebarLayout from "@/components/SidebarLayout";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { useToast } from "@/hooks/use-toast";
import { Plus, Loader2, Building2 } from "lucide-react";
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
import { useLanguage } from "@/contexts/LanguageContext";
import { CompanyCard } from "@/components/CompanyCard";
import { CompanyForm } from "@/components/CompanyForm";
import { CompanyDetailsSheet } from "@/components/CompanyDetailsSheet";

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
}

const Contacts = () => {
  const [companies, setCompanies] = useState<Company[]>([]);
  const [loading, setLoading] = useState(true);
  const [addCompanyDialogOpen, setAddCompanyDialogOpen] = useState(false);
  const [editCompanyData, setEditCompanyData] = useState<Company | null>(null);
  const [selectedCompanyId, setSelectedCompanyId] = useState<string | null>(null);
  const [deleteCompanyId, setDeleteCompanyId] = useState<string | null>(null);
  
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

      // Fetch companies (contacts where is_company = true)
      const { data: companiesData, error: companiesError } = await supabase
        .from("contacts")
        .select("*")
        .eq("is_company", true)
        .order("name");

      if (companiesError) throw companiesError;

      // Fetch all company_contacts for these companies
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

      // Map companies with their contacts count and primary contact
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
      });

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
        })
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

  return (
    <SidebarLayout>
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-semibold">{t("companies.title")}</h1>
            <p className="text-sm text-muted-foreground mt-1">{t("companies.subtitle")}</p>
          </div>

          {canEdit && (
            <Button onClick={() => setAddCompanyDialogOpen(true)}>
              <Plus className="mr-2 h-4 w-4" />
              {t("companies.addCompany")}
            </Button>
          )}
        </div>

        {loading ? (
          <div className="flex items-center justify-center h-64">
            <Loader2 className="h-12 w-12 animate-spin text-muted-foreground" />
          </div>
        ) : companies.length === 0 ? (
          <Card className="p-12 text-center">
            <Building2 className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
            <p className="text-muted-foreground">{t("companies.noCompanies")}</p>
            {canEdit && (
              <Button 
                className="mt-4"
                onClick={() => setAddCompanyDialogOpen(true)}
              >
                <Plus className="mr-2 h-4 w-4" />
                {t("companies.addCompany")}
              </Button>
            )}
          </Card>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {companies.map((company) => (
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
                }}
                onSubmit={handleEditCompany}
                onCancel={() => setEditCompanyData(null)}
              />
            )}
          </DialogContent>
        </Dialog>

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
    </SidebarLayout>
  );
};

export default Contacts;
