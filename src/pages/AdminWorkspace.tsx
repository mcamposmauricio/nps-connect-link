import { useState, useEffect } from "react";
import { useParams } from "react-router-dom";
import SidebarLayout from "@/components/SidebarLayout";
import { useLanguage } from "@/contexts/LanguageContext";
import { useAuth } from "@/hooks/useAuth";
import { useChatMessages, useChatRooms } from "@/hooks/useChatRealtime";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { ChatRoomList } from "@/components/chat/ChatRoomList";
import { ChatMessageList } from "@/components/chat/ChatMessageList";
import { ChatInput } from "@/components/chat/ChatInput";
import { VisitorInfoPanel } from "@/components/chat/VisitorInfoPanel";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { MessageSquare } from "lucide-react";

const AdminWorkspace = () => {
  const { roomId: paramRoomId } = useParams();
  const { t } = useLanguage();
  const { user } = useAuth();
  const [selectedRoomId, setSelectedRoomId] = useState<string | null>(paramRoomId ?? null);
  const { rooms, loading: roomsLoading } = useChatRooms(user?.id ?? null, { excludeClosed: true });
  const { messages, loading: messagesLoading } = useChatMessages(selectedRoomId);

  useEffect(() => {
    if (paramRoomId) setSelectedRoomId(paramRoomId);
  }, [paramRoomId]);

  const selectedRoom = rooms.find((r) => r.id === selectedRoomId);

  const handleAssignRoom = async (roomId: string) => {
    if (!user) return;

    let { data: profile } = await supabase
      .from("attendant_profiles")
      .select("id")
      .eq("user_id", user.id)
      .maybeSingle();

    if (!profile) {
      const { data: newProfile, error: createError } = await supabase
        .from("attendant_profiles")
        .insert({
          user_id: user.id,
          csm_id: user.id,
          display_name: user.email?.split("@")[0] ?? "Admin",
          status: "online",
        })
        .select("id")
        .single();

      if (createError) {
        const { data: csm } = await supabase
          .from("csms")
          .select("id")
          .eq("user_id", user.id)
          .maybeSingle();

        let csmId = csm?.id;
        if (!csmId) {
          const { data: newCsm } = await supabase
            .from("csms")
            .insert({
              user_id: user.id,
              name: user.email?.split("@")[0] ?? "Admin",
              email: user.email ?? "",
              is_chat_enabled: true,
            })
            .select("id")
            .single();
          csmId = newCsm?.id;
        }

        if (!csmId) {
          toast.error("Não foi possível criar perfil de atendente");
          return;
        }

        const { data: retryProfile } = await supabase
          .from("attendant_profiles")
          .select("id")
          .eq("user_id", user.id)
          .maybeSingle();

        profile = retryProfile;

        if (!profile) {
          toast.error("Não foi possível atribuir a conversa. Verifique seu perfil de atendente.");
          return;
        }
      } else {
        profile = newProfile;
      }
    }

    const { error } = await supabase
      .from("chat_rooms")
      .update({
        attendant_id: profile.id,
        status: "active",
        assigned_at: new Date().toISOString(),
      })
      .eq("id", roomId);

    if (error) {
      toast.error("Erro ao atribuir conversa");
    } else {
      toast.success("Conversa atribuída com sucesso!");
    }
  };

  const handleCloseRoom = async (roomId: string) => {
    await supabase
      .from("chat_rooms")
      .update({
        status: "closed",
        closed_at: new Date().toISOString(),
      })
      .eq("id", roomId);
  };

  const handleSendMessage = async (content: string, isInternal = false) => {
    if (!selectedRoomId || !user) return;

    await supabase.from("chat_messages").insert({
      room_id: selectedRoomId,
      sender_type: "attendant",
      sender_id: user.id,
      sender_name: user.email?.split("@")[0] ?? "Atendente",
      content,
      is_internal: isInternal,
    });
  };

  return (
    <SidebarLayout>
      <div className="h-[calc(100vh-8rem)] flex gap-4">
        {/* Left: Room list */}
        <div className="w-80 shrink-0">
          <ChatRoomList
            rooms={rooms}
            selectedRoomId={selectedRoomId}
            onSelectRoom={setSelectedRoomId}
            loading={roomsLoading}
          />
        </div>

        {/* Center: Chat area */}
        <div className="flex-1 flex flex-col">
          {selectedRoom ? (
            <Card className="flex-1 flex flex-col rounded-lg border bg-card shadow-sm overflow-hidden">
              <div className="p-3 flex items-center justify-between border-b">
                <div className="flex items-center gap-2">
                  <MessageSquare className="h-4 w-4 text-primary" />
                  <span className="font-medium text-sm">
                    {selectedRoom.visitor_name || `${t("chat.workspace.room")} #${selectedRoom.id.slice(0, 8)}`}
                  </span>
                  <span className={`text-xs px-2 py-0.5 rounded-full ${
                    selectedRoom.status === "active" ? "bg-green-100 text-green-700" :
                    selectedRoom.status === "waiting" ? "bg-amber-100 text-amber-700" :
                    "bg-muted text-muted-foreground"
                  }`}>
                    {selectedRoom.status}
                  </span>
                </div>
                <div className="flex gap-2">
                  {selectedRoom.status === "waiting" && (
                    <Button size="sm" onClick={() => handleAssignRoom(selectedRoom.id)}>
                      {t("chat.workspace.assign")}
                    </Button>
                  )}
                  {selectedRoom.status === "active" && (
                    <Button size="sm" variant="destructive" onClick={() => handleCloseRoom(selectedRoom.id)}>
                      {t("chat.workspace.close")}
                    </Button>
                  )}
                </div>
              </div>

              <div className="flex-1 overflow-auto">
                <ChatMessageList messages={messages} loading={messagesLoading} />
              </div>

              {selectedRoom.status !== "closed" && (
                <ChatInput onSend={handleSendMessage} />
              )}
            </Card>
          ) : (
            <div className="flex-1 flex items-center justify-center text-muted-foreground">
              <div className="text-center space-y-2">
                <MessageSquare className="h-12 w-12 mx-auto opacity-30" />
                <p>{t("chat.workspace.select_room")}</p>
              </div>
            </div>
          )}
        </div>

        {/* Right: Visitor info */}
        {selectedRoom && (
          <div className="w-72 shrink-0">
            <VisitorInfoPanel
              roomId={selectedRoom.id}
              visitorId={selectedRoom.visitor_id}
              contactId={selectedRoom.contact_id}
              companyContactId={selectedRoom.company_contact_id}
            />
          </div>
        )}
      </div>
    </SidebarLayout>
  );
};

export default AdminWorkspace;
