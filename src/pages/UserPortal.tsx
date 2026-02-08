import { useEffect, useState } from "react";
import { useParams } from "react-router-dom";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { supabase } from "@/integrations/supabase/client";
import { format } from "date-fns";
import { MessageSquare, User, ChevronDown, ChevronUp, Star } from "lucide-react";
import { useLanguage } from "@/contexts/LanguageContext";
import { Button } from "@/components/ui/button";
import { ScrollArea } from "@/components/ui/scroll-area";

interface PortalContact {
  id: string;
  name: string;
  email: string;
  company_id: string;
}

interface PortalRoom {
  id: string;
  status: string;
  created_at: string;
  closed_at: string | null;
  csat_score: number | null;
  resolution_status: string | null;
}

interface PortalMessage {
  id: string;
  content: string;
  sender_type: string;
  sender_name: string | null;
  created_at: string;
  is_internal: boolean;
}

const UserPortal = () => {
  const { token } = useParams<{ token: string }>();
  const { t } = useLanguage();
  const [contact, setContact] = useState<PortalContact | null>(null);
  const [companyName, setCompanyName] = useState<string>("");
  const [rooms, setRooms] = useState<PortalRoom[]>([]);
  const [loading, setLoading] = useState(true);
  const [notFound, setNotFound] = useState(false);
  const [expandedRoom, setExpandedRoom] = useState<string | null>(null);
  const [messages, setMessages] = useState<PortalMessage[]>([]);
  const [loadingMessages, setLoadingMessages] = useState(false);

  useEffect(() => {
    const fetchPortalData = async () => {
      if (!token) {
        setNotFound(true);
        setLoading(false);
        return;
      }

      // Find contact by public_token
      const { data: contactData } = await supabase
        .from("company_contacts")
        .select("id, name, email, company_id")
        .eq("public_token", token)
        .maybeSingle();

      if (!contactData) {
        setNotFound(true);
        setLoading(false);
        return;
      }

      setContact(contactData);

      // Fetch company name
      const { data: company } = await supabase
        .from("contacts")
        .select("name")
        .eq("id", contactData.company_id)
        .maybeSingle();

      setCompanyName(company?.name ?? "");

      // Fetch chat rooms for this contact
      const { data: roomsData } = await supabase
        .from("chat_rooms")
        .select("id, status, created_at, closed_at, csat_score, resolution_status")
        .eq("company_contact_id", contactData.id)
        .order("created_at", { ascending: false });

      setRooms(roomsData ?? []);
      setLoading(false);
    };

    fetchPortalData();
  }, [token]);

  const loadTranscript = async (roomId: string) => {
    if (expandedRoom === roomId) {
      setExpandedRoom(null);
      return;
    }

    setLoadingMessages(true);
    setExpandedRoom(roomId);

    const { data } = await supabase
      .from("chat_messages")
      .select("id, content, sender_type, sender_name, created_at, is_internal")
      .eq("room_id", roomId)
      .eq("is_internal", false)
      .order("created_at", { ascending: true });

    setMessages(data ?? []);
    setLoadingMessages(false);
  };

  const statusBadge = (status: string) => {
    switch (status) {
      case "active": return <Badge className="bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-400">Ativo</Badge>;
      case "waiting": return <Badge className="bg-yellow-100 text-yellow-800 dark:bg-yellow-900/30 dark:text-yellow-400">Aguardando</Badge>;
      case "closed": return <Badge variant="outline">Encerrado</Badge>;
      default: return <Badge variant="secondary">{status}</Badge>;
    }
  };

  const resolutionBadge = (status: string | null) => {
    switch (status) {
      case "resolved": return <Badge className="bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-400">Resolvido</Badge>;
      case "escalated": return <Badge className="bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-400">Escalado</Badge>;
      case "pending": return <Badge className="bg-orange-100 text-orange-800 dark:bg-orange-900/30 dark:text-orange-400">Pendente</Badge>;
      default: return null;
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary" />
      </div>
    );
  }

  if (notFound) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <Card className="max-w-md w-full mx-4">
          <CardContent className="pt-6 text-center">
            <MessageSquare className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
            <h2 className="text-xl font-semibold mb-2">{t("chat.portal.not_found")}</h2>
            <p className="text-sm text-muted-foreground">Link inválido ou expirado.</p>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background">
      {/* Header */}
      <header className="border-b bg-card">
        <div className="max-w-3xl mx-auto px-4 py-4 flex items-center gap-3">
          <div className="p-2 bg-primary/10 rounded-full">
            <User className="h-5 w-5 text-primary" />
          </div>
          <div>
            <h1 className="font-semibold">{contact?.name}</h1>
            <p className="text-sm text-muted-foreground">{companyName} • {contact?.email}</p>
          </div>
        </div>
      </header>

      {/* Content */}
      <main className="max-w-3xl mx-auto px-4 py-6 space-y-4">
        <h2 className="text-lg font-semibold">{t("chat.portal.chats")}</h2>

        {rooms.length === 0 ? (
          <Card>
            <CardContent className="py-12 text-center">
              <MessageSquare className="h-10 w-10 mx-auto text-muted-foreground mb-3" />
              <p className="text-sm text-muted-foreground">{t("chat.portal.no_chats")}</p>
            </CardContent>
          </Card>
        ) : (
          <div className="space-y-3">
            {rooms.map((room) => (
              <Card key={room.id}>
                <CardHeader className="pb-2">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      {statusBadge(room.status)}
                      {room.status === "closed" && resolutionBadge(room.resolution_status)}
                    </div>
                    <div className="flex items-center gap-2">
                      {room.csat_score != null && (
                        <div className="flex items-center gap-1 text-sm">
                          <Star className="h-4 w-4 fill-amber-500 text-amber-500" />
                          <span>{room.csat_score}/5</span>
                        </div>
                      )}
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => loadTranscript(room.id)}
                      >
                        {expandedRoom === room.id ? (
                          <ChevronUp className="h-4 w-4" />
                        ) : (
                          <ChevronDown className="h-4 w-4" />
                        )}
                        {t("chat.portal.view_transcript")}
                      </Button>
                    </div>
                  </div>
                </CardHeader>
                <CardContent>
                  <div className="text-sm text-muted-foreground space-y-1">
                    <p>Início: {format(new Date(room.created_at), "dd/MM/yyyy HH:mm")}</p>
                    {room.closed_at && (
                      <p>Encerramento: {format(new Date(room.closed_at), "dd/MM/yyyy HH:mm")}</p>
                    )}
                  </div>

                  {/* Transcript */}
                  {expandedRoom === room.id && (
                    <div className="mt-4 border-t pt-4">
                      {loadingMessages ? (
                        <div className="flex justify-center py-4">
                          <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-primary" />
                        </div>
                      ) : messages.length === 0 ? (
                        <p className="text-sm text-muted-foreground text-center py-4">Nenhuma mensagem</p>
                      ) : (
                        <ScrollArea className="max-h-80">
                          <div className="space-y-3">
                            {messages.map((msg) => (
                              <div
                                key={msg.id}
                                className={`flex ${msg.sender_type === "visitor" ? "justify-end" : "justify-start"}`}
                              >
                                <div
                                  className={`max-w-[80%] rounded-lg px-3 py-2 text-sm ${
                                    msg.sender_type === "visitor"
                                      ? "bg-primary text-primary-foreground"
                                      : "bg-muted"
                                  }`}
                                >
                                  {msg.sender_name && (
                                    <p className="text-xs font-medium mb-1 opacity-75">{msg.sender_name}</p>
                                  )}
                                  <p>{msg.content}</p>
                                  <p className="text-xs opacity-60 mt-1">
                                    {format(new Date(msg.created_at!), "HH:mm")}
                                  </p>
                                </div>
                              </div>
                            ))}
                          </div>
                        </ScrollArea>
                      )}
                    </div>
                  )}
                </CardContent>
              </Card>
            ))}
          </div>
        )}
      </main>
    </div>
  );
};

export default UserPortal;
