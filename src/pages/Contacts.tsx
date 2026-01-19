import { useEffect, useState, useCallback } from "react";
import Layout from "@/components/Layout";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { useToast } from "@/hooks/use-toast";
import { Plus, Loader2, Building2 } from "lucide-react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
} from "@/components/ui/sheet";
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
import { CompanyContactForm } from "@/components/CompanyContactForm";
import { CompanyContactsList } from "@/components/CompanyContactsList";

interface CompanyContact {
  id: string;
  name: string;
  email: string;
  phone: string | null;
  role: string | null;
  department: string | null;
  is_primary: boolean;
  created_at: string;
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
  const [selectedCompany, setSelectedCompany] = useState<Company | null>(null);
  const [companyContacts, setCompanyContacts] = useState<CompanyContact[]>([]);
  const [loadingContacts, setLoadingContacts] = useState(false);
  const [addContactDialogOpen, setAddContactDialogOpen] = useState(false);
  const [editContactData, setEditContactData] = useState<CompanyContact | null>(null);
  const [deleteCompanyId, setDeleteCompanyId] = useState<string | null>(null);
  
  const { toast } = useToast();
  const { t } = useLanguage();

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
        .eq("user_id", user.id)
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

  const fetchCompanyContacts = useCallback(async (companyId: string) => {
    setLoadingContacts(true);
    try {
      const { data, error } = await supabase
        .from("company_contacts")
        .select("*")
        .eq("company_id", companyId)
        .order("created_at");

      if (error) throw error;
      setCompanyContacts(data || []);
    } catch (error: any) {
      toast({
        title: t("common.error"),
        description: error.message,
        variant: "destructive",
      });
    } finally {
      setLoadingContacts(false);
    }
  }, [toast, t]);

  const handleCompanyClick = useCallback((company: Company) => {
    setSelectedCompany(company);
    fetchCompanyContacts(company.id);
  }, [fetchCompanyContacts]);

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
      if (selectedCompany?.id === deleteCompanyId) {
        setSelectedCompany(null);
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

  const handleAddContact = async (data: any) => {
    if (!selectedCompany) return;

    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error(t("auth.error"));

      // If setting as primary, unset other primary contacts first
      if (data.is_primary) {
        await supabase
          .from("company_contacts")
          .update({ is_primary: false })
          .eq("company_id", selectedCompany.id);
      }

      const { error } = await supabase.from("company_contacts").insert({
        company_id: selectedCompany.id,
        user_id: user.id,
        name: data.name,
        email: data.email,
        phone: data.phone || null,
        role: data.role || null,
        department: data.department || null,
        is_primary: data.is_primary || companyContacts.length === 0, // First contact is primary
      });

      if (error) throw error;

      toast({
        title: t("common.success"),
        description: t("contacts.addSuccess"),
      });

      setAddContactDialogOpen(false);
      fetchCompanyContacts(selectedCompany.id);
      fetchCompanies(); // Update counts
    } catch (error: any) {
      toast({
        title: t("common.error"),
        description: error.message,
        variant: "destructive",
      });
    }
  };

  const handleEditContact = async (data: any) => {
    if (!selectedCompany || !editContactData) return;

    try {
      // If setting as primary, unset other primary contacts first
      if (data.is_primary && !editContactData.is_primary) {
        await supabase
          .from("company_contacts")
          .update({ is_primary: false })
          .eq("company_id", selectedCompany.id);
      }

      const { error } = await supabase
        .from("company_contacts")
        .update({
          name: data.name,
          email: data.email,
          phone: data.phone || null,
          role: data.role || null,
          department: data.department || null,
          is_primary: data.is_primary,
        })
        .eq("id", editContactData.id);

      if (error) throw error;

      toast({
        title: t("common.success"),
        description: t("companies.updateSuccess"),
      });

      setEditContactData(null);
      fetchCompanyContacts(selectedCompany.id);
      fetchCompanies();
    } catch (error: any) {
      toast({
        title: t("common.error"),
        description: error.message,
        variant: "destructive",
      });
    }
  };

  const handleDeleteContact = async (contactId: string) => {
    if (!selectedCompany) return;

    try {
      const { error } = await supabase
        .from("company_contacts")
        .delete()
        .eq("id", contactId);

      if (error) throw error;

      toast({
        title: t("common.success"),
        description: t("contacts.deleteSuccess"),
      });

      fetchCompanyContacts(selectedCompany.id);
      fetchCompanies();
    } catch (error: any) {
      toast({
        title: t("common.error"),
        description: error.message,
        variant: "destructive",
      });
    }
  };

  const handleSetPrimary = async (contactId: string) => {
    if (!selectedCompany) return;

    try {
      // Unset all primary first
      await supabase
        .from("company_contacts")
        .update({ is_primary: false })
        .eq("company_id", selectedCompany.id);

      // Set new primary
      const { error } = await supabase
        .from("company_contacts")
        .update({ is_primary: true })
        .eq("id", contactId);

      if (error) throw error;

      fetchCompanyContacts(selectedCompany.id);
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
    <Layout>
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-4xl font-bold mb-2">{t("companies.title")}</h1>
            <p className="text-muted-foreground">{t("companies.subtitle")}</p>
          </div>

          <Button onClick={() => setAddCompanyDialogOpen(true)}>
            <Plus className="mr-2 h-4 w-4" />
            {t("companies.addCompany")}
          </Button>
        </div>

        {loading ? (
          <div className="flex items-center justify-center h-64">
            <Loader2 className="h-12 w-12 animate-spin text-muted-foreground" />
          </div>
        ) : companies.length === 0 ? (
          <Card className="p-12 text-center">
            <Building2 className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
            <p className="text-muted-foreground">{t("companies.noCompanies")}</p>
            <Button 
              className="mt-4"
              onClick={() => setAddCompanyDialogOpen(true)}
            >
              <Plus className="mr-2 h-4 w-4" />
              {t("companies.addCompany")}
            </Button>
          </Card>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {companies.map((company) => (
              <CompanyCard
                key={company.id}
                company={company}
                onClick={() => handleCompanyClick(company)}
                onDelete={() => setDeleteCompanyId(company.id)}
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

        {/* Company Details Sheet */}
        <Sheet 
          open={!!selectedCompany} 
          onOpenChange={(open) => !open && setSelectedCompany(null)}
        >
          <SheetContent className="w-full sm:max-w-lg overflow-y-auto">
            <SheetHeader>
              <SheetTitle className="flex items-center gap-2">
                <Building2 className="h-5 w-5" />
                {selectedCompany?.trade_name || selectedCompany?.name}
              </SheetTitle>
            </SheetHeader>
            
            {selectedCompany && (
              <div className="mt-6 space-y-6">
                <div className="space-y-2 text-sm">
                  {selectedCompany.name !== selectedCompany.trade_name && selectedCompany.trade_name && (
                    <p><span className="text-muted-foreground">{t("companies.companyName")}:</span> {selectedCompany.name}</p>
                  )}
                  {selectedCompany.company_document && (
                    <p><span className="text-muted-foreground">CNPJ:</span> {selectedCompany.company_document}</p>
                  )}
                  {selectedCompany.company_sector && (
                    <p><span className="text-muted-foreground">{t("contacts.sector")}:</span> {selectedCompany.company_sector}</p>
                  )}
                  {selectedCompany.email && (
                    <p><span className="text-muted-foreground">{t("contacts.email")}:</span> {selectedCompany.email}</p>
                  )}
                  {selectedCompany.phone && (
                    <p><span className="text-muted-foreground">{t("contacts.phone")}:</span> {selectedCompany.phone}</p>
                  )}
                  {(selectedCompany.street || selectedCompany.city) && (
                    <div>
                      <span className="text-muted-foreground">{t("cnpj.address")}:</span>
                      <p className="mt-1">
                        {[
                          selectedCompany.street,
                          selectedCompany.street_number,
                          selectedCompany.complement,
                        ].filter(Boolean).join(", ")}
                        {selectedCompany.neighborhood && (
                          <><br />{selectedCompany.neighborhood}</>
                        )}
                        {(selectedCompany.city || selectedCompany.state) && (
                          <><br />{[selectedCompany.city, selectedCompany.state].filter(Boolean).join(" - ")}</>
                        )}
                        {selectedCompany.zip_code && (
                          <><br />CEP: {selectedCompany.zip_code}</>
                        )}
                      </p>
                    </div>
                  )}
                </div>

                <CompanyContactsList
                  contacts={companyContacts}
                  loading={loadingContacts}
                  onAddContact={() => setAddContactDialogOpen(true)}
                  onEditContact={(contact) => setEditContactData(contact)}
                  onDeleteContact={handleDeleteContact}
                  onSetPrimary={handleSetPrimary}
                />
              </div>
            )}
          </SheetContent>
        </Sheet>

        {/* Add Contact Dialog */}
        <Dialog open={addContactDialogOpen} onOpenChange={setAddContactDialogOpen}>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>{t("companyContacts.add")}</DialogTitle>
            </DialogHeader>
            <CompanyContactForm
              onSubmit={handleAddContact}
              onCancel={() => setAddContactDialogOpen(false)}
              showPrimaryOption={companyContacts.length > 0}
            />
          </DialogContent>
        </Dialog>

        {/* Edit Contact Dialog */}
        <Dialog open={!!editContactData} onOpenChange={(open) => !open && setEditContactData(null)}>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>{t("companyContacts.edit")}</DialogTitle>
            </DialogHeader>
            {editContactData && (
              <CompanyContactForm
                initialData={{
                  name: editContactData.name,
                  email: editContactData.email,
                  phone: editContactData.phone || "",
                  role: editContactData.role || "",
                  department: editContactData.department || "",
                  is_primary: editContactData.is_primary,
                }}
                onSubmit={handleEditContact}
                onCancel={() => setEditContactData(null)}
              />
            )}
          </DialogContent>
        </Dialog>

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
    </Layout>
  );
};

export default Contacts;
