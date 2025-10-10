import { useEffect, useState } from "react";
import Layout from "@/components/Layout";
import { supabase } from "@/integrations/supabase/client";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Users, Send, TrendingUp, MessageSquare, Search, Mail, Building2, User } from "lucide-react";
import {
  ChartContainer,
  ChartTooltip,
  ChartTooltipContent,
} from "@/components/ui/chart";
import { ResponsiveContainer, PieChart, Pie, Cell, Legend } from "recharts";
import { useNavigate } from "react-router-dom";
import { useToast } from "@/hooks/use-toast";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";

interface Stats {
  totalContacts: number;
  totalCampaigns: number;
  totalResponses: number;
  npsScore: number;
  promoters: number;
  passives: number;
  detractors: number;
}

interface Contact {
  id: string;
  name: string;
  email: string;
  phone: string | null;
  is_company: boolean;
  company_document: string | null;
  company_sector: string | null;
}

interface ContactResponse {
  id: string;
  score: number;
  comment: string | null;
  responded_at: string;
  campaigns: {
    name: string;
  };
}

interface ContactCampaign {
  campaign_id: string;
  email_sent: boolean;
  campaigns: {
    name: string;
    status: string;
  };
}

interface RecentResponse {
  id: string;
  score: number;
  comment: string | null;
  responded_at: string;
  contact_id: string;
  campaign_id: string;
  contacts: {
    name: string;
    email: string;
    is_company: boolean;
  };
  campaigns: {
    name: string;
  };
}

interface CampaignStats {
  id: string;
  name: string;
  totalResponses: number;
  npsScore: number;
  promoters: number;
  passives: number;
  detractors: number;
}

const Dashboard = () => {
  const navigate = useNavigate();
  const [stats, setStats] = useState<Stats>({
    totalContacts: 0,
    totalCampaigns: 0,
    totalResponses: 0,
    npsScore: 0,
    promoters: 0,
    passives: 0,
    detractors: 0,
  });
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState("");
  const [searchResults, setSearchResults] = useState<Contact[]>([]);
  const [selectedContact, setSelectedContact] = useState<Contact | null>(null);
  const [contactResponses, setContactResponses] = useState<ContactResponse[]>([]);
  const [contactCampaigns, setContactCampaigns] = useState<ContactCampaign[]>([]);
  const [detailsLoading, setDetailsLoading] = useState(false);
  const [recentResponses, setRecentResponses] = useState<RecentResponse[]>([]);
  const [viewMode, setViewMode] = useState<"campaign" | "contact">("campaign");
  const [campaignStats, setCampaignStats] = useState<CampaignStats[]>([]);
  const { toast } = useToast();

  useEffect(() => {
    const fetchStats = async () => {
      try {
        const { data: { user } } = await supabase.auth.getUser();
        if (!user) return;

        const [contactsRes, campaignsRes, responsesRes] = await Promise.all([
          supabase.from("contacts").select("id", { count: "exact" }).eq("user_id", user.id),
          supabase.from("campaigns").select("id", { count: "exact" }).eq("user_id", user.id),
          supabase
            .from("responses")
            .select("score, campaigns!inner(user_id)")
            .eq("campaigns.user_id", user.id),
        ]);

        const responses = responsesRes.data || [];
        const promoters = responses.filter((r) => r.score >= 9).length;
        const passives = responses.filter((r) => r.score >= 7 && r.score <= 8).length;
        const detractors = responses.filter((r) => r.score <= 6).length;
        const total = responses.length;
        const npsScore = total > 0 ? Math.round(((promoters - detractors) / total) * 100) : 0;

        setStats({
          totalContacts: contactsRes.count || 0,
          totalCampaigns: campaignsRes.count || 0,
          totalResponses: total,
          npsScore,
          promoters,
          passives,
          detractors,
        });
      } catch (error) {
        console.error("Error fetching stats:", error);
      } finally {
        setLoading(false);
      }
    };

    const fetchRecentResponses = async () => {
      try {
        const { data: { user } } = await supabase.auth.getUser();
        if (!user) return;

        const { data, error } = await supabase
          .from("responses")
          .select(`
            id,
            score,
            comment,
            responded_at,
            contact_id,
            campaign_id,
            contacts (
              name,
              email,
              is_company
            ),
            campaigns!inner (
              name,
              user_id
            )
          `)
          .eq("campaigns.user_id", user.id)
          .order("responded_at", { ascending: false })
          .limit(10);

        if (error) throw error;
        setRecentResponses(data || []);
      } catch (error) {
        console.error("Error fetching recent responses:", error);
      }
    };

    const fetchCampaignStats = async () => {
      try {
        const { data: { user } } = await supabase.auth.getUser();
        if (!user) return;

        const { data: campaigns } = await supabase
          .from("campaigns")
          .select("id, name")
          .eq("user_id", user.id);

        if (!campaigns) return;

        const campaignStatsData = await Promise.all(
          campaigns.map(async (campaign) => {
            const { data: responses } = await supabase
              .from("responses")
              .select("score")
              .eq("campaign_id", campaign.id);

            const responsesData = responses || [];
            const promoters = responsesData.filter((r) => r.score >= 9).length;
            const passives = responsesData.filter((r) => r.score >= 7 && r.score <= 8).length;
            const detractors = responsesData.filter((r) => r.score <= 6).length;
            const total = responsesData.length;
            const npsScore = total > 0 ? Math.round(((promoters - detractors) / total) * 100) : 0;

            return {
              id: campaign.id,
              name: campaign.name,
              totalResponses: total,
              npsScore,
              promoters,
              passives,
              detractors,
            };
          })
        );

        setCampaignStats(campaignStatsData);
      } catch (error) {
        console.error("Error fetching campaign stats:", error);
      }
    };

    fetchStats();
    fetchRecentResponses();
    fetchCampaignStats();
  }, []);

  useEffect(() => {
    const searchContacts = async () => {
      if (searchTerm.trim().length < 2) {
        setSearchResults([]);
        return;
      }

      try {
        const { data: { user } } = await supabase.auth.getUser();
        if (!user) return;

        const { data, error } = await supabase
          .from("contacts")
          .select("*")
          .eq("user_id", user.id)
          .or(`name.ilike.%${searchTerm}%,email.ilike.%${searchTerm}%`)
          .limit(10);

        if (error) throw error;
        setSearchResults(data || []);
      } catch (error: any) {
        console.error("Error searching contacts:", error);
      }
    };

    const debounce = setTimeout(searchContacts, 300);
    return () => clearTimeout(debounce);
  }, [searchTerm]);

  const fetchContactDetails = async (contact: Contact) => {
    setSelectedContact(contact);
    setDetailsLoading(true);

    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      // Fetch responses
      const { data: responsesData } = await supabase
        .from("responses")
        .select(`
          id,
          score,
          comment,
          responded_at,
          campaigns (
            name
          )
        `)
        .eq("contact_id", contact.id)
        .order("responded_at", { ascending: false })
        .limit(5);

      // Fetch campaign associations
      const { data: campaignsData } = await supabase
        .from("campaign_contacts")
        .select(`
          campaign_id,
          email_sent,
          campaigns (
            name,
            status
          )
        `)
        .eq("contact_id", contact.id);

      setContactResponses(responsesData || []);
      setContactCampaigns(campaignsData || []);
    } catch (error: any) {
      toast({
        title: "Erro",
        description: error.message,
        variant: "destructive",
      });
    } finally {
      setDetailsLoading(false);
    }
  };

  const getScoreColor = (score: number) => {
    if (score >= 9) return "text-success";
    if (score >= 7) return "text-warning";
    return "text-destructive";
  };

  const getScoreLabel = (score: number) => {
    if (score >= 9) return "Promotor";
    if (score >= 7) return "Neutro";
    return "Detrator";
  };

  const statCards = [
    { title: "Contatos", value: stats.totalContacts, icon: Users, color: "text-blue-600" },
    { title: "Campanhas", value: stats.totalCampaigns, icon: Send, color: "text-purple-600" },
    { title: "Respostas", value: stats.totalResponses, icon: MessageSquare, color: "text-indigo-600" },
    { title: "NPS Score", value: stats.npsScore, icon: TrendingUp, color: "text-primary", suffix: "" },
  ];

  const pendingCampaigns = contactCampaigns.filter(cc => !cc.email_sent);

  if (loading) {
    return (
      <Layout>
        <div className="flex items-center justify-center h-64">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary"></div>
        </div>
      </Layout>
    );
  }

  return (
    <Layout>
      <div className="space-y-8">
        <div>
          <h1 className="text-4xl font-bold mb-2">Dashboard</h1>
          <p className="text-muted-foreground">Visão geral do seu sistema de NPS</p>
        </div>

        {/* View Mode Filter */}
        <Card className="p-4">
          <div className="flex items-center justify-between flex-wrap gap-4">
            <div>
              <h2 className="text-lg font-semibold">Visualização</h2>
              <p className="text-sm text-muted-foreground">Escolha como visualizar os dados</p>
            </div>
            <Tabs value={viewMode} onValueChange={(v) => setViewMode(v as "campaign" | "contact")}>
              <TabsList>
                <TabsTrigger value="campaign">Por Campanha</TabsTrigger>
                <TabsTrigger value="contact">Por Contato</TabsTrigger>
              </TabsList>
            </Tabs>
          </div>
        </Card>

        {viewMode === "contact" && (
          <Card className="p-4">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="Buscar contato por nome ou email..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="pl-10"
              />
            </div>
            {searchResults.length > 0 && (
              <div className="mt-3 space-y-2">
                {searchResults.map((contact) => (
                  <div
                    key={contact.id}
                    className="flex items-center justify-between p-3 border rounded-lg hover:bg-muted/50 cursor-pointer transition-colors"
                    onClick={() => {
                      fetchContactDetails(contact);
                      setSearchTerm("");
                      setSearchResults([]);
                    }}
                  >
                    <div className="flex items-center gap-3">
                      {contact.is_company ? (
                        <Building2 className="h-5 w-5 text-primary" />
                      ) : (
                        <User className="h-5 w-5 text-muted-foreground" />
                      )}
                      <div>
                        <p className="font-medium">{contact.name}</p>
                        <p className="text-sm text-muted-foreground">{contact.email}</p>
                      </div>
                    </div>
                    <Button variant="outline" size="sm">Ver Detalhes</Button>
                  </div>
                ))}
              </div>
            )}
          </Card>
        )}

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
          {statCards.map((stat) => {
            const Icon = stat.icon;
            return (
              <Card key={stat.title} className="p-6 hover:shadow-lg transition-shadow">
                <div className="flex items-center justify-between mb-4">
                  <h3 className="text-sm font-medium text-muted-foreground">{stat.title}</h3>
                  <Icon className={`h-5 w-5 ${stat.color}`} />
                </div>
                <p className="text-3xl font-bold">
                  {stat.value}
                  {stat.suffix !== undefined ? stat.suffix : ""}
                </p>
              </Card>
            );
          })}
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <Card className="p-6 bg-gradient-to-br from-success/10 to-success/5 border-success/20">
              <div className="flex items-center justify-between mb-2">
                <h3 className="text-lg font-semibold">Promotores</h3>
                <span className="text-2xl">😊</span>
              </div>
              <p className="text-4xl font-bold text-success">{stats.promoters}</p>
              <p className="text-sm text-muted-foreground mt-2">Score 9-10</p>
            </Card>

            <Card className="p-6 bg-gradient-to-br from-warning/10 to-warning/5 border-warning/20">
              <div className="flex items-center justify-between mb-2">
                <h3 className="text-lg font-semibold">Neutros</h3>
                <span className="text-2xl">😐</span>
              </div>
              <p className="text-4xl font-bold text-warning">{stats.passives}</p>
              <p className="text-sm text-muted-foreground mt-2">Score 7-8</p>
            </Card>

            <Card className="p-6 bg-gradient-to-br from-destructive/10 to-destructive/5 border-destructive/20">
              <div className="flex items-center justify-between mb-2">
                <h3 className="text-lg font-semibold">Detratores</h3>
                <span className="text-2xl">😞</span>
              </div>
              <p className="text-4xl font-bold text-destructive">{stats.detractors}</p>
              <p className="text-sm text-muted-foreground mt-2">Score 0-6</p>
            </Card>
          </div>

          {stats.totalResponses > 0 && (
            <Card className="p-6 bg-gradient-to-br from-background via-card to-muted/20 shadow-lg border-primary/10">
              <h3 className="text-lg font-semibold mb-6 flex items-center gap-2">
                <div className="p-2 rounded-lg bg-primary/10">
                  <TrendingUp className="h-5 w-5 text-primary" />
                </div>
                Distribuição NPS
              </h3>
              <div className="h-80">
                <ChartContainer config={{
                  promoters: { label: "Promotores", color: "hsl(var(--promoter))" },
                  passives: { label: "Neutros", color: "hsl(var(--passive))" },
                  detractors: { label: "Detratores", color: "hsl(var(--detractor))" },
                }}>
                  <ResponsiveContainer width="100%" height="100%">
                    <PieChart>
                      <defs>
                        <filter id="shadow" x="-50%" y="-50%" width="200%" height="200%">
                          <feDropShadow dx="0" dy="4" stdDeviation="4" floodOpacity="0.2"/>
                        </filter>
                      </defs>
                      <Pie
                        data={[
                          { name: 'Promotores', value: stats.promoters, label: '😊' },
                          { name: 'Neutros', value: stats.passives, label: '😐' },
                          { name: 'Detratores', value: stats.detractors, label: '😞' },
                        ]}
                        cx="50%"
                        cy="45%"
                        labelLine={{
                          stroke: "hsl(var(--border))",
                          strokeWidth: 2,
                        }}
                        label={({ cx, cy, midAngle, innerRadius, outerRadius, percent, name, label }) => {
                          const RADIAN = Math.PI / 180;
                          const radius = outerRadius + 30;
                          const x = cx + radius * Math.cos(-midAngle * RADIAN);
                          const y = cy + radius * Math.sin(-midAngle * RADIAN);
                          
                          return (
                            <text 
                              x={x} 
                              y={y} 
                              fill="hsl(var(--foreground))" 
                              textAnchor={x > cx ? 'start' : 'end'} 
                              dominantBaseline="central"
                              className="font-semibold text-sm"
                            >
                              {`${label} ${name}`}
                              <tspan x={x} dy="1.2em" className="text-xs font-normal">
                                {`${(percent * 100).toFixed(1)}%`}
                              </tspan>
                            </text>
                          );
                        }}
                        outerRadius={100}
                        innerRadius={60}
                        paddingAngle={2}
                        dataKey="value"
                        filter="url(#shadow)"
                      >
                        <Cell fill="hsl(var(--promoter))" stroke="hsl(var(--background))" strokeWidth={3} />
                        <Cell fill="hsl(var(--passive))" stroke="hsl(var(--background))" strokeWidth={3} />
                        <Cell fill="hsl(var(--detractor))" stroke="hsl(var(--background))" strokeWidth={3} />
                      </Pie>
                      <ChartTooltip 
                        content={<ChartTooltipContent 
                          labelFormatter={(_, payload) => {
                            if (payload && payload[0]) {
                              return payload[0].name;
                            }
                            return "";
                          }}
                        />} 
                      />
                    </PieChart>
                  </ResponsiveContainer>
                </ChartContainer>
              </div>
            </Card>
          )}
        </div>

        {/* Recent Responses or Campaign Stats */}
        {viewMode === "campaign" ? (
          campaignStats.length > 0 && (
            <Card className="p-6">
              <h2 className="text-2xl font-semibold mb-4 flex items-center gap-2">
                <Send className="h-6 w-6" />
                Estatísticas por Campanha
              </h2>
              <div className="space-y-4">
                {campaignStats.map((campaign) => (
                  <div
                    key={campaign.id}
                    className="p-4 border rounded-lg hover:shadow-md transition-shadow cursor-pointer"
                    onClick={() => navigate(`/campaigns/${campaign.id}`)}
                  >
                    <div className="flex items-center justify-between mb-3">
                      <h3 className="font-semibold text-lg">{campaign.name}</h3>
                      <div className="flex items-center gap-2">
                        <span className="text-sm text-muted-foreground">NPS:</span>
                        <span className={`text-xl font-bold ${campaign.npsScore >= 50 ? 'text-success' : campaign.npsScore >= 0 ? 'text-warning' : 'text-destructive'}`}>
                          {campaign.npsScore}
                        </span>
                      </div>
                    </div>
                    <div className="grid grid-cols-4 gap-3">
                      <div className="text-center p-2 rounded bg-muted/50">
                        <p className="text-xs text-muted-foreground">Respostas</p>
                        <p className="text-lg font-semibold">{campaign.totalResponses}</p>
                      </div>
                      <div className="text-center p-2 rounded bg-success/10">
                        <p className="text-xs text-muted-foreground">Promotores</p>
                        <p className="text-lg font-semibold text-success">{campaign.promoters}</p>
                      </div>
                      <div className="text-center p-2 rounded bg-warning/10">
                        <p className="text-xs text-muted-foreground">Neutros</p>
                        <p className="text-lg font-semibold text-warning">{campaign.passives}</p>
                      </div>
                      <div className="text-center p-2 rounded bg-destructive/10">
                        <p className="text-xs text-muted-foreground">Detratores</p>
                        <p className="text-lg font-semibold text-destructive">{campaign.detractors}</p>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </Card>
          )
        ) : (
          <Card className="p-6">
            <h2 className="text-2xl font-semibold mb-4 flex items-center gap-2">
              <MessageSquare className="h-6 w-6" />
              Últimas Respostas NPS
            </h2>
            {recentResponses.length === 0 ? (
              <p className="text-muted-foreground text-center py-8">
                Nenhuma resposta ainda.
              </p>
            ) : (
              <div className="space-y-3">
                {recentResponses.map((response) => (
                  <div
                    key={response.id}
                    className="flex items-center justify-between p-4 border rounded-lg hover:shadow-md transition-shadow cursor-pointer"
                    onClick={() => navigate(`/campaigns/${response.campaign_id}`)}
                  >
                    <div className="flex items-center gap-4 flex-1">
                      {response.contacts.is_company ? (
                        <Building2 className="h-5 w-5 text-primary flex-shrink-0" />
                      ) : (
                        <User className="h-5 w-5 text-muted-foreground flex-shrink-0" />
                      )}
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2 flex-wrap">
                          <p className="font-semibold truncate">{response.contacts.name}</p>
                          <span className="text-xs text-muted-foreground truncate">{response.contacts.email}</span>
                        </div>
                        <div className="flex items-center gap-2 mt-1 flex-wrap">
                          <span className="text-xs text-muted-foreground">
                            Campanha: {response.campaigns.name}
                          </span>
                          <span className="text-xs text-muted-foreground">•</span>
                          <span className="text-xs text-muted-foreground">
                            {new Date(response.responded_at).toLocaleDateString("pt-BR", {
                              day: "2-digit",
                              month: "2-digit",
                              year: "numeric",
                              hour: "2-digit",
                              minute: "2-digit"
                            })}
                          </span>
                        </div>
                        {response.comment && (
                          <p className="text-sm text-muted-foreground italic mt-1 line-clamp-1">
                            &ldquo;{response.comment}&rdquo;
                          </p>
                        )}
                      </div>
                    </div>
                    <div className={`ml-4 px-3 py-2 rounded-lg border ${getScoreColor(response.score)} flex-shrink-0`}>
                      <div className="text-center">
                        <div className="text-xl font-bold">{response.score}</div>
                        <div className="text-xs whitespace-nowrap">{getScoreLabel(response.score)}</div>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </Card>
        )}
      </div>

      {/* Contact Details Dialog */}
      <Dialog open={!!selectedContact} onOpenChange={() => setSelectedContact(null)}>
        <DialogContent className="max-w-3xl max-h-[80vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-3">
              {selectedContact?.is_company ? (
                <Building2 className="h-6 w-6 text-primary" />
              ) : (
                <User className="h-6 w-6 text-muted-foreground" />
              )}
              <div>
                <div className="text-xl font-bold">{selectedContact?.name}</div>
                <div className="text-sm text-muted-foreground font-normal">{selectedContact?.email}</div>
              </div>
            </DialogTitle>
          </DialogHeader>

          {detailsLoading ? (
            <div className="flex items-center justify-center py-8">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
            </div>
          ) : (
            <div className="space-y-6">
              {/* Contact Info */}
              <div className="grid grid-cols-2 gap-4">
                {selectedContact?.phone && (
                  <div>
                    <label className="text-sm font-medium text-muted-foreground">Telefone</label>
                    <p className="text-sm">{selectedContact.phone}</p>
                  </div>
                )}
                {selectedContact?.is_company && selectedContact?.company_document && (
                  <div>
                    <label className="text-sm font-medium text-muted-foreground">CNPJ</label>
                    <p className="text-sm">{selectedContact.company_document}</p>
                  </div>
                )}
                {selectedContact?.is_company && selectedContact?.company_sector && (
                  <div>
                    <label className="text-sm font-medium text-muted-foreground">Setor</label>
                    <p className="text-sm">{selectedContact.company_sector}</p>
                  </div>
                )}
              </div>

              {/* Pending Campaigns */}
              {pendingCampaigns.length > 0 && (
                <div>
                  <h3 className="text-lg font-semibold mb-3 flex items-center gap-2">
                    <Mail className="h-5 w-5" />
                    Campanhas Pendentes ({pendingCampaigns.length})
                  </h3>
                  <div className="space-y-2">
                    {pendingCampaigns.map((cc) => (
                      <div key={cc.campaign_id} className="p-3 border rounded-lg bg-orange-50">
                        <p className="font-medium">{cc.campaigns.name}</p>
                        <p className="text-xs text-muted-foreground">
                          Status: {cc.campaigns.status === "sent" ? "Enviada" : "Rascunho"}
                        </p>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* Latest Responses */}
              <div>
                <h3 className="text-lg font-semibold mb-3 flex items-center gap-2">
                  <MessageSquare className="h-5 w-5" />
                  Últimas Respostas ({contactResponses.length})
                </h3>
                {contactResponses.length === 0 ? (
                  <p className="text-sm text-muted-foreground text-center py-4">
                    Nenhuma resposta ainda.
                  </p>
                ) : (
                  <div className="space-y-3">
                    {contactResponses.map((response) => (
                      <div key={response.id} className="border rounded-lg p-4">
                        <div className="flex items-start justify-between mb-2">
                          <div className="flex-1">
                            <p className="font-medium text-sm">{response.campaigns.name}</p>
                            <p className="text-xs text-muted-foreground">
                              {new Date(response.responded_at).toLocaleDateString("pt-BR")}
                            </p>
                          </div>
                          <div className="text-right">
                            <div className={`text-2xl font-bold ${getScoreColor(response.score)}`}>
                              {response.score}
                            </div>
                            <div className="text-xs text-muted-foreground">
                              {getScoreLabel(response.score)}
                            </div>
                          </div>
                        </div>
                        {response.comment && (
                          <div className="mt-2 p-2 bg-muted rounded text-sm italic">
                            &ldquo;{response.comment}&rdquo;
                          </div>
                        )}
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </Layout>
  );
};

export default Dashboard;