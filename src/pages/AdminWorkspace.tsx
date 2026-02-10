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
import { CloseRoomDialog } from "@/components/chat/CloseRoomDialog";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Sheet, SheetContent, SheetTrigger } from "@/components/ui/sheet";
import { MessageSquare, PanelRightClose, PanelRightOpen, ArrowLeft, Info } from "lucide-react";
import { useIsMobile } from "@/hooks/use-mobile";

type MobileView = "list" | "chat" | "info";

const AdminWorkspace = () => {
  const { roomId: paramRoomId } = useParams();
  const { t } = useLanguage();
  const { user } = useAuth();
  const isMobile = useIsMobile();
  const [selectedRoomId, setSelectedRoomId] = useState<string | null>(paramRoomId ?? null);
  const { rooms, loading: roomsLoading } = useChatRooms(user?.id ?? null, { excludeClosed: true });
  const { messages, loading: messagesLoading } = useChatMessages(selectedRoomId);
  const [infoPanelOpen, setInfoPanelOpen] = useState(true);
  const [mobileView, setMobileView] = useState<MobileView>("list");
  const [closeDialogOpen, setCloseDialogOpen] = useState(false);
  const [closingRoomId, setClosingRoomId] = useState<string | null>(null);

  useEffect(() => {
    if (paramRoomId) setSelectedRoomId(paramRoomId);
  }, [paramRoomId]);

  const selectedRoom = rooms.find((r) => r.id === selectedRoomId);

  // Mobile: when selecting a room, switch to chat view
  const handleSelectRoom = (id: string) => {
    setSelectedRoomId(id);
    if (isMobile) setMobileView("chat");
  };

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

  const handleRequestClose = (roomId: string) => {
    setClosingRoomId(roomId);
    setCloseDialogOpen(true);
  };

  const handleConfirmClose = async (resolutionStatus: "resolved" | "pending", note?: string) => {
    if (!closingRoomId || !user) return;

    // If there's a note, insert it as an internal message first
    if (note) {
      await supabase.from("chat_messages").insert({
        room_id: closingRoomId,
        sender_type: "attendant",
        sender_id: user.id,
        sender_name: user.email?.split("@")[0] ?? "Atendente",
        content: `[Encerramento] ${note}`,
        is_internal: true,
      });
    }

    await supabase
      .from("chat_rooms")
      .update({
        status: "closed",
        resolution_status: resolutionStatus,
        closed_at: new Date().toISOString(),
      })
      .eq("id", closingRoomId);

    setClosingRoomId(null);
    toast.success(resolutionStatus === "resolved" ? "Conversa encerrada como resolvida" : "Conversa encerrada com pendência");
  };

  const handleSendMessage = async (
    content: string,
    isInternal = false,
    metadata?: { file_url: string; file_name: string; file_type: string; file_size: number }
  ) => {
    if (!selectedRoomId || !user) return;

    await supabase.from("chat_messages").insert({
      room_id: selectedRoomId,
      sender_type: "attendant",
      sender_id: user.id,
      sender_name: user.email?.split("@")[0] ?? "Atendente",
      content,
      is_internal: isInternal,
      ...(metadata
        ? { message_type: "file", metadata: metadata as any }
        : {}),
    });
  };

  // Mobile layout
  if (isMobile) {
    return (
      <SidebarLayout>
        <div className="h-[calc(100vh-3.5rem)] flex flex-col">
          {mobileView === "list" && (
            <ChatRoomList
              rooms={rooms}
              selectedRoomId={selectedRoomId}
              onSelectRoom={handleSelectRoom}
              loading={roomsLoading}
            />
          )}

          {mobileView === "chat" && selectedRoom && (
            <Card className="flex-1 flex flex-col rounded-none border-0 overflow-hidden">
              <div className="p-3 flex items-center justify-between border-b">
                <div className="flex items-center gap-2">
                  <Button size="icon" variant="ghost" className="h-8 w-8" onClick={() => setMobileView("list")}>
                    <ArrowLeft className="h-4 w-4" />
                  </Button>
                  <span className="font-medium text-sm truncate">
                    {selectedRoom.visitor_name || `#${selectedRoom.id.slice(0, 8)}`}
                  </span>
                  <span className={`text-xs px-2 py-0.5 rounded-full ${
                    selectedRoom.status === "active" ? "bg-green-100 text-green-700" :
                    selectedRoom.status === "waiting" ? "bg-amber-100 text-amber-700" :
                    "bg-muted text-muted-foreground"
                  }`}>
                    {selectedRoom.status}
                  </span>
                </div>
                <div className="flex gap-1">
                  <Sheet>
                    <SheetTrigger asChild>
                      <Button size="icon" variant="ghost" className="h-8 w-8">
                        <Info className="h-4 w-4" />
                      </Button>
                    </SheetTrigger>
                    <SheetContent side="right" className="w-[85vw] p-0">
                      <VisitorInfoPanel
                        roomId={selectedRoom.id}
                        visitorId={selectedRoom.visitor_id}
                        contactId={selectedRoom.contact_id}
                        companyContactId={selectedRoom.company_contact_id}
                      />
                    </SheetContent>
                  </Sheet>
                  {selectedRoom.status === "waiting" && (
                    <Button size="sm" className="h-8 text-xs" onClick={() => handleAssignRoom(selectedRoom.id)}>
                      {t("chat.workspace.assign")}
                    </Button>
                  )}
                  {selectedRoom.status === "active" && (
                    <Button size="sm" variant="destructive" className="h-8 text-xs" onClick={() => handleRequestClose(selectedRoom.id)}>
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
          )}
        </div>

        <CloseRoomDialog
          open={closeDialogOpen}
          onOpenChange={setCloseDialogOpen}
          onConfirm={handleConfirmClose}
        />
      </SidebarLayout>
    );
  }

  // Desktop layout
  return (
    <SidebarLayout>
      <div className="h-[calc(100vh-3.5rem)] flex gap-3 p-3">
        {/* Left: Room list */}
        <div className="w-72 xl:w-80 shrink-0">
          <ChatRoomList
            rooms={rooms}
            selectedRoomId={selectedRoomId}
            onSelectRoom={handleSelectRoom}
            loading={roomsLoading}
          />
        </div>

        {/* Center: Chat area */}
        <div className="flex-1 min-w-0 flex flex-col">
          {selectedRoom ? (
            <Card className="flex-1 flex flex-col rounded-lg border bg-card shadow-sm overflow-hidden">
              <div className="p-3 flex items-center justify-between border-b">
                <div className="flex items-center gap-2 min-w-0">
                  <MessageSquare className="h-4 w-4 text-primary shrink-0" />
                  <span className="font-medium text-sm truncate">
                    {selectedRoom.visitor_name || `${t("chat.workspace.room")} #${selectedRoom.id.slice(0, 8)}`}
                  </span>
                  <span className={`text-xs px-2 py-0.5 rounded-full shrink-0 ${
                    selectedRoom.status === "active" ? "bg-green-100 text-green-700" :
                    selectedRoom.status === "waiting" ? "bg-amber-100 text-amber-700" :
                    "bg-muted text-muted-foreground"
                  }`}>
                    {selectedRoom.status}
                  </span>
                </div>
                <div className="flex gap-2 shrink-0">
                  {selectedRoom.status === "waiting" && (
                    <Button size="sm" onClick={() => handleAssignRoom(selectedRoom.id)}>
                      {t("chat.workspace.assign")}
                    </Button>
                  )}
                  {selectedRoom.status === "active" && (
                    <Button size="sm" variant="destructive" onClick={() => handleRequestClose(selectedRoom.id)}>
                      {t("chat.workspace.close")}
                    </Button>
                  )}
                  <Button
                    size="icon"
                    variant="ghost"
                    className="h-8 w-8"
                    onClick={() => setInfoPanelOpen(!infoPanelOpen)}
                    title={infoPanelOpen ? "Esconder painel" : "Mostrar painel"}
                  >
                    {infoPanelOpen ? <PanelRightClose className="h-4 w-4" /> : <PanelRightOpen className="h-4 w-4" />}
                  </Button>
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
        {selectedRoom && infoPanelOpen && (
          <div className="w-80 xl:w-96 shrink-0">
            <VisitorInfoPanel
              roomId={selectedRoom.id}
              visitorId={selectedRoom.visitor_id}
              contactId={selectedRoom.contact_id}
              companyContactId={selectedRoom.company_contact_id}
            />
          </div>
        )}
      </div>

      <CloseRoomDialog
        open={closeDialogOpen}
        onOpenChange={setCloseDialogOpen}
        onConfirm={handleConfirmClose}
      />
    </SidebarLayout>
  );
};

export default AdminWorkspace;
