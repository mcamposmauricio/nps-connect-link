import { useState, useEffect } from "react";
import { useQuery } from "@tanstack/react-query";

import { supabase } from "@/integrations/supabase/client";
import { useLanguage } from "@/contexts/LanguageContext";
import { useToast } from "@/hooks/use-toast";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Search, Users, Link as LinkIcon, Loader2, Copy, Filter, X } from "lucide-react";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { PersonDetailsSheet } from "@/components/PersonDetailsSheet";
import { sanitizeFilterValue } from "@/lib/utils";

interface PersonWithCompany {
  id: string;
  name: string;
  email: string;
  phone: string | null;
  role: string | null;
  department: string | null;
  is_primary: boolean;
  public_token: string | null;
  chat_total: number | null;
  chat_avg_csat: number | null;
  chat_last_at: string | null;
  company_id: string;
  external_id: string | null;
  created_at: string | null;
  company_name: string;
  company_trade_name: string | null;
}

const People = () => {
  const [search, setSearch] = useState("");
  const [debouncedSearch, setDebouncedSearch] = useState("");
  const [selectedPerson, setSelectedPerson] = useState<PersonWithCompany | null>(null);
  const [companyFilter, setCompanyFilter] = useState("");
  const [roleFilter, setRoleFilter] = useState("");
  const [departmentFilter, setDepartmentFilter] = useState("");
  const { t } = useLanguage();
  const { toast } = useToast();

  useEffect(() => {
    const timer = setTimeout(() => setDebouncedSearch(search), 300);
    return () => clearTimeout(timer);
  }, [search]);

  const { data: people = [], isLoading } = useQuery({
    queryKey: ["people-list", debouncedSearch],
    queryFn: async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return [];

      let query = supabase
        .from("company_contacts")
        .select("*")
        .order("name");

      if (debouncedSearch.trim()) {
        const sanitized = sanitizeFilterValue(debouncedSearch.trim());
        query = query.or(`name.ilike.%${sanitized}%,email.ilike.%${sanitized}%`);
      }

      const { data: contacts, error } = await query;
      if (error) throw error;
      if (!contacts || contacts.length === 0) return [];

      // Fetch companies for all contacts
      const companyIds = [...new Set(contacts.map((c) => c.company_id))];
      const { data: companies, error: companiesError } = await supabase
        .from("contacts")
        .select("id, name, trade_name")
        .in("id", companyIds);

      if (companiesError) throw companiesError;

      const companyMap = new Map(
        (companies || []).map((c) => [c.id, { name: c.name, trade_name: c.trade_name }])
      );

      return contacts.map((contact): PersonWithCompany => {
        const company = companyMap.get(contact.company_id);
        return {
          id: contact.id,
          name: contact.name,
          email: contact.email,
          phone: contact.phone,
          role: contact.role,
          department: contact.department,
          is_primary: contact.is_primary ?? false,
          public_token: contact.public_token,
          chat_total: contact.chat_total,
          chat_avg_csat: contact.chat_avg_csat,
          chat_last_at: contact.chat_last_at,
          company_id: contact.company_id,
          external_id: contact.external_id,
          created_at: contact.created_at,
          company_name: company?.name || "-",
          company_trade_name: company?.trade_name || null,
        };
      });
    },
  });

  const copyPortalLink = (token: string | null, e: React.MouseEvent) => {
    e.stopPropagation();
    if (!token) return;
    const url = `${window.location.origin}/portal/${token}`;
    navigator.clipboard.writeText(url);
    toast({ title: t("people.linkCopied") });
  };

  return (
    <div className="space-y-6">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-semibold">
              {t("people.title")}
              {!isLoading && (
                <Badge variant="secondary" className="ml-3 text-sm font-normal">
                  {people.length}
                </Badge>
              )}
            </h1>
            <p className="text-sm text-muted-foreground mt-1">{t("people.subtitle")}</p>
          </div>
        </div>

        {/* Search & Filters */}
        {(() => {
          const companyNames = [...new Set(people.map(p => p.company_trade_name || p.company_name).filter(v => v && v !== "-"))].sort() as string[];
          const roles = [...new Set(people.map(p => p.role).filter(Boolean))].sort() as string[];
          const departments = [...new Set(people.map(p => p.department).filter(Boolean))].sort() as string[];
          const activeFilterCount = [companyFilter, roleFilter, departmentFilter].filter(Boolean).length;

          return (
            <div className="flex items-center gap-3 flex-wrap">
              <div className="relative max-w-md flex-1 min-w-[200px]">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                <Input
                  placeholder={t("people.search")}
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                  className="pl-10"
                />
              </div>
              {companyNames.length > 1 && (
                <Select value={companyFilter} onValueChange={(v) => setCompanyFilter(v === "all" ? "" : v)}>
                  <SelectTrigger className="w-[200px]">
                    <Filter className="h-4 w-4 mr-2 text-muted-foreground" />
                    <SelectValue placeholder={t("people.filterByCompany")} />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">{t("people.allCompanies")}</SelectItem>
                    {companyNames.map(c => (
                      <SelectItem key={c} value={c}>{c}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              )}
              {roles.length > 1 && (
                <Select value={roleFilter} onValueChange={(v) => setRoleFilter(v === "all" ? "" : v)}>
                  <SelectTrigger className="w-[170px]">
                    <SelectValue placeholder={t("people.filterByRole")} />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">{t("people.allRoles")}</SelectItem>
                    {roles.map(r => (
                      <SelectItem key={r} value={r}>{r}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              )}
              {departments.length > 1 && (
                <Select value={departmentFilter} onValueChange={(v) => setDepartmentFilter(v === "all" ? "" : v)}>
                  <SelectTrigger className="w-[180px]">
                    <SelectValue placeholder={t("people.filterByDepartment")} />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">{t("people.allDepartments")}</SelectItem>
                    {departments.map(d => (
                      <SelectItem key={d} value={d}>{d}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              )}
              {activeFilterCount > 0 && (
                <Button variant="ghost" size="sm" onClick={() => { setCompanyFilter(""); setRoleFilter(""); setDepartmentFilter(""); }}>
                  <X className="h-4 w-4 mr-1" />
                  {activeFilterCount} {t("people.activeFilters")}
                </Button>
              )}
            </div>
          );
        })()}

        {isLoading ? (
          <div className="flex items-center justify-center h-64">
            <Loader2 className="h-12 w-12 animate-spin text-muted-foreground" />
          </div>
        ) : people.length === 0 ? (
          <div className="flex flex-col items-center justify-center h-64 text-muted-foreground">
            <Users className="h-12 w-12 mb-4 opacity-50" />
            <p>{t("people.noResults")}</p>
          </div>
        ) : (
          <div className="rounded-lg border bg-card shadow-sm overflow-hidden">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>{t("contacts.name")}</TableHead>
                  <TableHead>{t("contacts.email")}</TableHead>
                  <TableHead>{t("people.company")}</TableHead>
                  <TableHead>{t("people.role")}</TableHead>
                  <TableHead>{t("people.phone")}</TableHead>
                  <TableHead className="text-center">{t("people.chats")}</TableHead>
                  <TableHead className="text-center">{t("people.csat")}</TableHead>
                  <TableHead className="text-center">{t("people.portal")}</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {people.filter((person) => {
                  const displayCompany = person.company_trade_name || person.company_name;
                  if (companyFilter && displayCompany !== companyFilter) return false;
                  if (roleFilter && person.role !== roleFilter) return false;
                  if (departmentFilter && person.department !== departmentFilter) return false;
                  return true;
                }).map((person) => (
                  <TableRow
                    key={person.id}
                    className="cursor-pointer"
                    onClick={() => setSelectedPerson(person)}
                  >
                    <TableCell className="font-medium">
                      {person.name}
                      {person.is_primary && (
                        <Badge variant="secondary" className="ml-2 text-xs">
                          ★
                        </Badge>
                      )}
                    </TableCell>
                    <TableCell className="text-muted-foreground">{person.email}</TableCell>
                    <TableCell>{person.company_trade_name || person.company_name}</TableCell>
                    <TableCell className="text-muted-foreground">{person.role || "-"}</TableCell>
                    <TableCell className="text-muted-foreground">{person.phone || "-"}</TableCell>
                    <TableCell className="text-center">{person.chat_total || 0}</TableCell>
                    <TableCell className="text-center">
                      {person.chat_avg_csat
                        ? `${Number(person.chat_avg_csat).toFixed(1)}/5`
                        : "-"}
                    </TableCell>
                    <TableCell className="text-center">
                      {person.public_token ? (
                        <Button
                          variant="ghost"
                          size="icon"
                          className="h-8 w-8"
                          onClick={(e) => copyPortalLink(person.public_token, e)}
                          title={t("people.copyLink")}
                        >
                          <Copy className="h-4 w-4" />
                        </Button>
                      ) : (
                        "-"
                      )}
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
        )}

        <PersonDetailsSheet
          person={selectedPerson}
          onClose={() => setSelectedPerson(null)}
        />
    </div>
  );
};

export default People;
