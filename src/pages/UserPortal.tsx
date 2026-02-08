import { useEffect, useState, useCallback } from "react";
import { useParams } from "react-router-dom";
import { Card, CardContent } from "@/components/ui/card";
import { supabase } from "@/integrations/supabase/client";
import { MessageSquare, User } from "lucide-react";
import { useLanguage } from "@/contexts/LanguageContext";
import PortalChatList from "@/components/portal/PortalChatList";
import PortalChatView from "@/components/portal/PortalChatView";

interface PortalContact {
  id: string;
  name: string;
  email: string;
  phone: string | null;
  company_id: string;
  user_id: string;
  chat_visitor_id: string | null;
  role: string | null;
  department: string | null;
}

interface PortalRoom {
  id: string;
  status: string;
  created_at: string;
  closed_at: string | null;
  csat_score: number | null;
  resolution_status: string | null;
}

const UserPortal = () => {
  const { token } = useParams<{ token: string }>();
  const { t } = useLanguage();
  const [contact, setContact] = useState<PortalContact | null>(null);
  const [companyName, setCompanyName] = useState<string>("");
  const [rooms, setRooms] = useState<PortalRoom[]>([]);
  const [loading, setLoading] = useState(true);
  const [notFound, setNotFound] = useState(false);

  // Chat mode state
  const [activeRoomId, setActiveRoomId] = useState<string | null>(null);
  const [activeVisitorId, setActiveVisitorId] = useState<string | null>(null);
  const [creatingChat, setCreatingChat] = useState(false);

  const fetchRooms = useCallback(async (contactId: string) => {
    const { data: roomsData } = await supabase
      .from("chat_rooms")
      .select("id, status, created_at, closed_at, csat_score, resolution_status")
      .eq("company_contact_id", contactId)
      .order("created_at", { ascending: false });

    setRooms(roomsData ?? []);
  }, []);

  useEffect(() => {
    const fetchPortalData = async () => {
      if (!token) {
        setNotFound(true);
        setLoading(false);
        return;
      }

      const { data: contactData } = await supabase
        .from("company_contacts")
        .select("id, name, email, phone, company_id, user_id, chat_visitor_id, role, department")
        .eq("public_token", token)
        .maybeSingle();

      if (!contactData) {
        setNotFound(true);
        setLoading(false);
        return;
      }

      setContact(contactData);

      const { data: company } = await supabase
        .from("contacts")
        .select("name")
        .eq("id", contactData.company_id)
        .maybeSingle();

      setCompanyName(company?.name ?? "");

      await fetchRooms(contactData.id);
      setLoading(false);
    };

    fetchPortalData();
  }, [token, fetchRooms]);

  // Find active/waiting room
  const activeRoom = rooms.find((r) => r.status === "active" || r.status === "waiting") ?? null;

  const getOrCreateVisitor = async (): Promise<string | null> => {
    if (!contact) return null;

    // Reuse existing visitor
    if (contact.chat_visitor_id) {
      const { data: existing } = await supabase
        .from("chat_visitors")
        .select("id")
        .eq("id", contact.chat_visitor_id)
        .maybeSingle();

      if (existing) return existing.id;
    }

    // Create new visitor with all linking fields
    const { data: visitor } = await supabase
      .from("chat_visitors")
      .insert({
        name: contact.name,
        email: contact.email,
        phone: contact.phone || null,
        owner_user_id: contact.user_id,
        company_contact_id: contact.id,
        contact_id: contact.company_id,
        role: contact.role || null,
        department: contact.department || null,
      })
      .select("id")
      .single();

    if (!visitor) return null;

    // Save visitor ID back to contact for reuse
    await supabase
      .from("company_contacts")
      .update({ chat_visitor_id: visitor.id })
      .eq("id", contact.id);

    // Update local state
    setContact((prev) => prev ? { ...prev, chat_visitor_id: visitor.id } : prev);

    return visitor.id;
  };

  const handleNewChat = async () => {
    if (!contact || creatingChat) return;

    // If there's already an active room, resume it
    if (activeRoom) {
      handleResumeChat(activeRoom.id);
      return;
    }

    setCreatingChat(true);

    const visitorId = await getOrCreateVisitor();
    if (!visitorId) {
      setCreatingChat(false);
      return;
    }

    // Create room with all linking fields so triggers fire correctly
    const { data: room } = await supabase
      .from("chat_rooms")
      .insert({
        visitor_id: visitorId,
        owner_user_id: contact.user_id,
        company_contact_id: contact.id,
        contact_id: contact.company_id,
        status: "waiting",
      })
      .select("id")
      .single();

    if (room) {
      setActiveRoomId(room.id);
      setActiveVisitorId(visitorId);
      // Refresh rooms list
      await fetchRooms(contact.id);
    }

    setCreatingChat(false);
  };

  const handleResumeChat = (roomId: string) => {
    const room = rooms.find((r) => r.id === roomId);
    if (!room || !contact) return;

    setActiveRoomId(roomId);
    setActiveVisitorId(contact.chat_visitor_id);
  };

  const handleBackToList = async () => {
    setActiveRoomId(null);
    setActiveVisitorId(null);
    if (contact) {
      await fetchRooms(contact.id);
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

  // Chat view
  if (activeRoomId && activeVisitorId) {
    return (
      <div className="min-h-screen bg-background flex flex-col">
        {/* Header */}
        <header className="border-b bg-card">
          <div className="max-w-3xl mx-auto px-4 py-3 flex items-center gap-3">
            <div className="p-2 bg-primary/10 rounded-full">
              <User className="h-4 w-4 text-primary" />
            </div>
            <div>
              <h1 className="font-semibold text-sm">{contact?.name}</h1>
              <p className="text-xs text-muted-foreground">{companyName}</p>
            </div>
          </div>
        </header>
        <main className="flex-1 max-w-3xl mx-auto w-full">
          <PortalChatView
            roomId={activeRoomId}
            visitorId={activeVisitorId}
            contactName={contact?.name ?? "Visitante"}
            onBack={handleBackToList}
          />
        </main>
      </div>
    );
  }

  // List view
  return (
    <div className="min-h-screen bg-background">
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

      <main className="max-w-3xl mx-auto px-4 py-6">
        <PortalChatList
          rooms={rooms}
          activeRoom={activeRoom}
          onNewChat={handleNewChat}
          onResumeChat={handleResumeChat}
          loading={creatingChat}
        />
      </main>
    </div>
  );
};

export default UserPortal;
