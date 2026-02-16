import { useEffect, useState } from "react";
import SidebarLayout from "@/components/SidebarLayout";
import { supabase } from "@/integrations/supabase/client";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { useToast } from "@/hooks/use-toast";
import { Search, Download } from "lucide-react";
import { exportToCSV } from "@/lib/utils";

interface Response {
  id: string;
  score: number;
  comment: string | null;
  responded_at: string;
  campaigns: {
    name: string;
  };
  contacts: {
    name: string;
    email: string;
  };
}

const Results = () => {
  const [responses, setResponses] = useState<Response[]>([]);
  const [filteredResponses, setFilteredResponses] = useState<Response[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState("");
  const { toast } = useToast();

  useEffect(() => {
    fetchResponses();
  }, []);

  useEffect(() => {
    if (searchTerm) {
      const filtered = responses.filter(
        (r) =>
          r.campaigns.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
          r.contacts.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
          r.contacts.email.toLowerCase().includes(searchTerm.toLowerCase())
      );
      setFilteredResponses(filtered);
    } else {
      setFilteredResponses(responses);
    }
  }, [searchTerm, responses]);

  const fetchResponses = async () => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      const { data, error } = await supabase
        .from("responses")
        .select(
          `
          id,
          score,
          comment,
          responded_at,
          campaigns!inner (
            name
          ),
          contacts (
            name,
            email
          )
        `
        )
        .order("responded_at", { ascending: false });

      if (error) throw error;
      setResponses(data || []);
      setFilteredResponses(data || []);
    } catch (error: any) {
      toast({
        title: "Erro",
        description: error.message,
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  const getScoreColor = (score: number) => {
    if (score >= 9) return "bg-success/10 text-success border-success/20";
    if (score >= 7) return "bg-warning/10 text-warning border-warning/20";
    return "bg-destructive/10 text-destructive border-destructive/20";
  };

  const getScoreLabel = (score: number) => {
    if (score >= 9) return "Promotor";
    if (score >= 7) return "Neutro";
    return "Detrator";
  };

  const handleExportCSV = () => {
    const csvData = filteredResponses.map((r) => ({
      "Nome do Contato": r.contacts.name,
      "Email": r.contacts.email,
      "Campanha": r.campaigns.name,
      "Nota": r.score,
      "Categoria": getScoreLabel(r.score),
      "Comentário": r.comment || "",
      "Data de Resposta": new Date(r.responded_at).toLocaleString("pt-BR"),
    }));
    exportToCSV(csvData, "resultados_nps");
    toast({
      title: "CSV exportado!",
      description: "Arquivo baixado com sucesso.",
    });
  };

  return (
    <SidebarLayout>
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-4xl font-bold mb-2">Resultados</h1>
            <p className="text-muted-foreground">Visualize todas as respostas de NPS</p>
          </div>
          {filteredResponses.length > 0 && (
            <Button onClick={handleExportCSV} variant="outline">
              <Download className="mr-2 h-4 w-4" />
              Exportar CSV
            </Button>
          )}
        </div>

        <div className="relative">
          <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="Buscar por campanha, contato ou email..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="pl-10"
          />
        </div>

        {loading ? (
          <div className="flex items-center justify-center h-64">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary"></div>
          </div>
        ) : filteredResponses.length === 0 ? (
          <Card className="p-12 text-center">
            <p className="text-muted-foreground">
              {searchTerm ? "Nenhum resultado encontrado." : "Nenhuma resposta ainda."}
            </p>
          </Card>
        ) : (
          <div className="space-y-4">
            {filteredResponses.map((response) => (
              <Card key={response.id} className="p-6">
                <div className="flex items-start justify-between mb-4">
                  <div className="flex-1">
                    <div className="flex items-center space-x-3 mb-2">
                      <h3 className="text-lg font-semibold">{response.contacts.name}</h3>
                      <span className="text-sm text-muted-foreground">{response.contacts.email}</span>
                    </div>
                    <p className="text-sm text-muted-foreground">Campanha: {response.campaigns.name}</p>
                  </div>

                  <div className={`px-4 py-2 rounded-lg border ${getScoreColor(response.score)}`}>
                    <div className="text-center">
                      <div className="text-2xl font-bold">{response.score}</div>
                      <div className="text-xs">{getScoreLabel(response.score)}</div>
                    </div>
                  </div>
                </div>

                {response.comment && (
                  <div className="mt-4 p-4 bg-muted rounded-lg">
                    <p className="text-sm italic">&ldquo;{response.comment}&rdquo;</p>
                  </div>
                )}

                <p className="text-xs text-muted-foreground mt-4">
                  Respondido em {new Date(response.responded_at).toLocaleString("pt-BR")}
                </p>
              </Card>
            ))}
          </div>
        )}
      </div>
    </SidebarLayout>
  );
};

export default Results;
