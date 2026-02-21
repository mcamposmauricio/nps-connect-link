import { useState, useEffect, useCallback } from "react";
import { useParams, useSearchParams } from "react-router-dom";

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
import { ReassignDialog } from "@/components/chat/ReassignDialog";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Sheet, SheetContent, SheetTrigger } from "@/components/ui/sheet";
import { ResizablePanelGroup, ResizablePanel, ResizableHandle } from "@/components/ui/resizable";
import { Popover, PopoverTrigger, PopoverContent } from "@/components/ui/popover";
import { ChatTagSelector } from "@/components/chat/ChatTagSelector";
import { MessageSquare, PanelRightClose, PanelRightOpen, ArrowLeft, Info, Clock, X, ArrowRightLeft, Tag } from "lucide-react";
import { useIsMobile } from "@/hooks/use-mobile";

type MobileView = "list" | "chat" | "info";

interface ReplyTarget {
  id: string;
  content: string;
  sender_name: string | null;
}

function durationLabel(startedAt: string): string {
  const diff = Math.floor((Date.now() - new Date(startedAt).getTime()) / 60000);
  if (diff < 60) return `${diff}min`;
  const h = Math.floor(diff / 60);
  const m = diff % 60;
  return m > 0 ? `${h}h${m}min` : `${h}h`;
}

const AdminWorkspace = () => {
  const { roomId: paramRoomId } = useParams();
  const [searchParams] = useSearchParams();
  const viewingAttendantId = searchParams.get("attendant");
  const viewingUnassigned = searchParams.get("queue") === "unassigned";
  const { t } = useLanguage();
  const { user } = useAuth();
  const isMobile = useIsMobile();
  const [selectedRoomId, setSelectedRoomId] = useState<string | null>(paramRoomId ?? null);
  const { rooms, loading: roomsLoading, markRoomAsRead, setSelectedRoomRef } = useChatRooms(user?.id ?? null, { excludeClosed: true });
  const { messages, loading: messagesLoading } = useChatMessages(selectedRoomId);
  const [infoPanelOpen, setInfoPanelOpen] = useState(true);
  const [mobileView, setMobileView] = useState<MobileView>("list");
  const [closeDialogOpen, setCloseDialogOpen] = useState(false);
  const [closingRoomId, setClosingRoomId] = useState<string | null>(null);
  const [replyTarget, setReplyTarget] = useState<ReplyTarget | null>(null);
  const [reassignOpen, setReassignOpen] = useState(false);
  const [userAttendantId, setUserAttendantId] = useState<string | null>(null);

  // Get the current user's attendant profile id
  useEffect(() => {
    if (!user) return;
    supabase
      .from("attendant_profiles")
      .select("id")
      .eq("user_id", user.id)
      .maybeSingle()
      .then(({ data }) => {
        if (data) setUserAttendantId(data.id);
      });
  }, [user]);

  useEffect(() => {
    if (paramRoomId) setSelectedRoomId(paramRoomId);
  }, [paramRoomId]);

  useEffect(() => {
    setSelectedRoomRef(selectedRoomId);
  }, [selectedRoomId, setSelectedRoomRef]);

  // Filter rooms based on viewing context
  const filteredRooms = viewingUnassigned
    ? rooms.filter((r) => !r.attendant_id)
    : viewingAttendantId
    ? rooms.filter((r) => r.attendant_id === viewingAttendantId)
    : rooms.filter((r) => {
        // Show only own chats (not unassigned, not other attendants)
        if (!r.attendant_id) return false;
        return r.attendant_id === userAttendantId;
      });

  const selectedRoom = rooms.find((r) => r.id === selectedRoomId);

  const handleSelectRoom = (id: string) => {
    setSelectedRoomId(id);
    markRoomAsRead(id);
    setReplyTarget(null);
    if (isMobile) setMobileView("chat");
  };

  const handleAssignRoom = async (roomId: string) => {
    if (!user) return;

    // Fetch user profile display_name to use as attendant name
    const { data: userProfile } = await supabase
      .from("user_profiles")
      .select("display_name")
      .eq("user_id", user.id)
      .maybeSingle();
    const profileName = userProfile?.display_name || user.email?.split("@")[0] || "Admin";

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
          display_name: profileName,
          status: "online",
        })
        .select("id")
        .single();

      if (createError) {
        const { data: csm } = await supabase.from("csms").select("id").eq("user_id", user.id).maybeSingle();
        let csmId = csm?.id;
        if (!csmId) {
          const { data: newCsm } = await supabase
            .from("csms")
            .insert({ user_id: user.id, name: profileName, email: user.email ?? "", is_chat_enabled: true })
            .select("id")
            .single();
          csmId = newCsm?.id;
        }
        if (!csmId) { toast.error("Não foi possível criar perfil de atendente"); return; }
        const { data: retryProfile } = await supabase.from("attendant_profiles").select("id").eq("user_id", user.id).maybeSingle();
        profile = retryProfile;
        if (!profile) { toast.error("Não foi possível atribuir a conversa."); return; }
      } else {
        profile = newProfile;
      }
    }

    const { error } = await supabase
      .from("chat_rooms")
      .update({ attendant_id: profile.id, status: "active", assigned_at: new Date().toISOString() })
      .eq("id", roomId);

    if (error) toast.error("Erro ao atribuir conversa");
    else toast.success("Conversa atribuída com sucesso!");
  };

  const handleRequestClose = (roomId: string) => {
    setClosingRoomId(roomId);
    setCloseDialogOpen(true);
  };

  const handleConfirmClose = async (resolutionStatus: "resolved" | "pending", note?: string) => {
    if (!closingRoomId || !user) return;
    if (note) {
      await supabase.from("chat_messages").insert({
        room_id: closingRoomId, sender_type: "attendant", sender_id: user.id,
        sender_name: user.email?.split("@")[0] ?? "Atendente", content: `[Encerramento] ${note}`, is_internal: true,
      });
    }
    await supabase.from("chat_rooms").update({
      status: "closed", resolution_status: resolutionStatus, closed_at: new Date().toISOString(),
    }).eq("id", closingRoomId);
    setClosingRoomId(null);
    toast.success(resolutionStatus === "resolved" ? "Conversa encerrada como resolvida" : "Conversa encerrada com pendência");
  };

  const handleReassign = async (attendantId: string, attendantName: string) => {
    if (!selectedRoomId || !user) return;
    const isWaiting = selectedRoom?.status === "waiting";
    await supabase.from("chat_rooms").update({
      attendant_id: attendantId, assigned_at: new Date().toISOString(),
      ...(isWaiting ? { status: "active" } : {}),
    }).eq("id", selectedRoomId);
    await supabase.from("chat_messages").insert({
      room_id: selectedRoomId, sender_type: "system", sender_name: "Sistema",
      content: `[Sistema] Chat transferido para ${attendantName}`, is_internal: true,
    });
    toast.success(`Conversa transferida para ${attendantName}`);
  };

  const handleReply = useCallback((msg: { id: string; content: string; sender_name: string | null }) => {
    setReplyTarget({ id: msg.id, content: msg.content, sender_name: msg.sender_name });
  }, []);

  const handleSendMessage = async (
    content: string,
    isInternal = false,
    metadata?: { file_url: string; file_name: string; file_type: string; file_size: number }
  ) => {
    if (!selectedRoomId || !user) return;
    let finalContent = content;
    if (replyTarget && !isInternal) {
      const quotedLines = replyTarget.content.split("\n").map((l) => `> ${l}`).join("\n");
      finalContent = `${quotedLines}\n\n${content}`;
    }
    await supabase.from("chat_messages").insert({
      room_id: selectedRoomId, sender_type: "attendant", sender_id: user.id,
      sender_name: user.email?.split("@")[0] ?? "Atendente", content: finalContent, is_internal: isInternal,
      ...(metadata ? { message_type: "file", metadata: metadata as any } : {}),
    });
    setReplyTarget(null);
  };

  const msgCount = messages.length;

  const renderDuration = (room: typeof selectedRoom) => {
    if (!room || !room.started_at || room.status !== "active") return null;
    return (
      <span className="flex items-center gap-1 text-[11px] text-muted-foreground">
        <Clock className="h-3 w-3" />
        {durationLabel(room.started_at)}
      </span>
    );
  };

  const renderReplyBanner = () => {
    if (!replyTarget) return null;
    return (
      <div className="flex items-center gap-2 px-3 py-2 bg-muted/50 border-b text-xs">
        <div className="flex-1 min-w-0">
          <span className="text-muted-foreground">Respondendo a </span>
          <span className="font-medium">{replyTarget.sender_name ?? "Visitante"}</span>
          <p className="truncate text-muted-foreground">{replyTarget.content.slice(0, 80)}</p>
        </div>
        <Button size="icon" variant="ghost" className="h-6 w-6 shrink-0" onClick={() => setReplyTarget(null)}>
          <X className="h-3 w-3" />
        </Button>
      </div>
    );
  };

  // Mobile layout
  if (isMobile) {
    return (
      <>
        <div className="-m-6 h-[calc(100vh-3.5rem)] flex flex-col bg-transparent">
          {mobileView === "list" && (
            <ChatRoomList rooms={filteredRooms} selectedRoomId={selectedRoomId} onSelectRoom={handleSelectRoom} loading={roomsLoading} />
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
                  }`}>{selectedRoom.status}</span>
                  {renderDuration(selectedRoom)}
                </div>
                <div className="flex gap-1">
                  <Sheet>
                    <SheetTrigger asChild>
                      <Button size="icon" variant="ghost" className="h-8 w-8"><Info className="h-4 w-4" /></Button>
                    </SheetTrigger>
                    <SheetContent side="right" className="w-[85vw] p-0">
                      <VisitorInfoPanel roomId={selectedRoom.id} visitorId={selectedRoom.visitor_id} contactId={selectedRoom.contact_id} companyContactId={selectedRoom.company_contact_id} />
                    </SheetContent>
                  </Sheet>
                  {selectedRoom.status === "active" && (
                    <>
                      <Button size="sm" variant="outline" className="h-8 text-xs" onClick={() => setReassignOpen(true)}>
                        <ArrowRightLeft className="h-3 w-3 mr-1" />Transferir
                      </Button>
                      <Popover>
                        <PopoverTrigger asChild>
                          <Button size="sm" variant="outline" className="h-8 text-xs">
                            <Tag className="h-3 w-3 mr-1" />Tags
                          </Button>
                        </PopoverTrigger>
                        <PopoverContent className="w-72" align="end">
                          <ChatTagSelector roomId={selectedRoom.id} compact />
                        </PopoverContent>
                      </Popover>
                      <Button size="sm" variant="destructive" className="h-8 text-xs" onClick={() => handleRequestClose(selectedRoom.id)}>
                        {t("chat.workspace.close")}
                      </Button>
                    </>
                  )}
                  {selectedRoom.status === "waiting" && (
                    <>
                      <Button size="sm" className="h-8 text-xs" onClick={() => handleAssignRoom(selectedRoom.id)}>
                        {t("chat.workspace.assign")}
                      </Button>
                      <Button size="sm" variant="outline" className="h-8 text-xs" onClick={() => setReassignOpen(true)}>
                        <ArrowRightLeft className="h-3 w-3 mr-1" />Transferir
                      </Button>
                      <Popover>
                        <PopoverTrigger asChild>
                          <Button size="sm" variant="outline" className="h-8 text-xs">
                            <Tag className="h-3 w-3 mr-1" />Tags
                          </Button>
                        </PopoverTrigger>
                        <PopoverContent className="w-72" align="end">
                          <ChatTagSelector roomId={selectedRoom.id} compact />
                        </PopoverContent>
                      </Popover>
                    </>
                  )}
                </div>
              </div>
              <div className="flex-1 overflow-auto">
                <ChatMessageList messages={messages} loading={messagesLoading} onReply={handleReply} />
              </div>
              {selectedRoom.status !== "closed" && (
                <>{renderReplyBanner()}<ChatInput onSend={handleSendMessage} /></>
              )}
            </Card>
          )}
        </div>
      <CloseRoomDialog open={closeDialogOpen} onOpenChange={setCloseDialogOpen} onConfirm={handleConfirmClose} roomId={closingRoomId} />
        <ReassignDialog open={reassignOpen} onOpenChange={setReassignOpen} currentAttendantId={selectedRoom?.attendant_id ?? null} onConfirm={handleReassign} />
      </>
    );
  }

  // Desktop layout with resizable panels
  return (
    <>
      <div className="-m-6 h-[calc(100vh-3.5rem)] flex flex-col bg-transparent">
        <ResizablePanelGroup direction="horizontal" className="flex-1">
          {/* Left: Room list */}
          <ResizablePanel defaultSize={20} minSize={15} maxSize={35}>
            <div className="h-full p-1.5 pl-3 pt-3 pb-3">
              <ChatRoomList rooms={filteredRooms} selectedRoomId={selectedRoomId} onSelectRoom={handleSelectRoom} loading={roomsLoading} />
            </div>
          </ResizablePanel>

          <ResizableHandle withHandle />

          {/* Center: Chat area */}
          <ResizablePanel defaultSize={infoPanelOpen ? 50 : 80} minSize={30}>
            <div className="h-full p-1.5 pt-3 pb-3">
              {selectedRoom ? (
                <Card className="h-full flex flex-col rounded-lg border bg-card shadow-sm overflow-hidden">
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
                      }`}>{selectedRoom.status}</span>
                      {renderDuration(selectedRoom)}
                      <span className="text-[10px] text-muted-foreground">{msgCount} msgs</span>
                    </div>
                    <div className="flex gap-2 shrink-0">
                      {selectedRoom.status === "waiting" && (
                        <>
                          <Button size="sm" onClick={() => handleAssignRoom(selectedRoom.id)}>{t("chat.workspace.assign")}</Button>
                          <Button size="sm" variant="outline" onClick={() => setReassignOpen(true)}>
                            <ArrowRightLeft className="h-3 w-3 mr-1" />Transferir
                          </Button>
                          <Popover>
                            <PopoverTrigger asChild>
                              <Button size="sm" variant="outline">
                                <Tag className="h-3 w-3 mr-1" />Tags
                              </Button>
                            </PopoverTrigger>
                            <PopoverContent className="w-72" align="end">
                              <ChatTagSelector roomId={selectedRoom.id} compact />
                            </PopoverContent>
                          </Popover>
                        </>
                      )}
                      {selectedRoom.status === "active" && (
                        <>
                          <Button size="sm" variant="outline" onClick={() => setReassignOpen(true)}>
                            <ArrowRightLeft className="h-3 w-3 mr-1" />Transferir
                          </Button>
                          <Popover>
                            <PopoverTrigger asChild>
                              <Button size="sm" variant="outline">
                                <Tag className="h-3 w-3 mr-1" />Tags
                              </Button>
                            </PopoverTrigger>
                            <PopoverContent className="w-72" align="end">
                              <ChatTagSelector roomId={selectedRoom.id} compact />
                            </PopoverContent>
                          </Popover>
                          <Button size="sm" variant="destructive" onClick={() => handleRequestClose(selectedRoom.id)}>
                            {t("chat.workspace.close")}
                          </Button>
                        </>
                      )}
                      <Button size="icon" variant="ghost" className="h-8 w-8" onClick={() => setInfoPanelOpen(!infoPanelOpen)}
                        title={infoPanelOpen ? "Esconder painel" : "Mostrar painel"}>
                        {infoPanelOpen ? <PanelRightClose className="h-4 w-4" /> : <PanelRightOpen className="h-4 w-4" />}
                      </Button>
                    </div>
                  </div>
                  <div className="flex-1 overflow-auto">
                    <ChatMessageList messages={messages} loading={messagesLoading} onReply={handleReply} />
                  </div>
                  {selectedRoom.status !== "closed" && (
                    <>{renderReplyBanner()}<ChatInput onSend={handleSendMessage} /></>
                  )}
                </Card>
              ) : (
                <div className="h-full flex items-center justify-center text-muted-foreground">
                  <div className="text-center space-y-2">
                    <MessageSquare className="h-12 w-12 mx-auto opacity-30" />
                    <p>{t("chat.workspace.select_room")}</p>
                  </div>
                </div>
              )}
            </div>
          </ResizablePanel>

          {/* Right: Visitor info */}
          {selectedRoom && infoPanelOpen && (
            <>
              <ResizableHandle withHandle />
              <ResizablePanel defaultSize={30} minSize={20} maxSize={40}>
                <div className="h-full p-1.5 pr-3 pt-3 pb-3">
                  <VisitorInfoPanel roomId={selectedRoom.id} visitorId={selectedRoom.visitor_id} contactId={selectedRoom.contact_id} companyContactId={selectedRoom.company_contact_id} />
                </div>
              </ResizablePanel>
            </>
          )}
        </ResizablePanelGroup>
      </div>

      <CloseRoomDialog open={closeDialogOpen} onOpenChange={setCloseDialogOpen} onConfirm={handleConfirmClose} roomId={closingRoomId} />
      <ReassignDialog open={reassignOpen} onOpenChange={setReassignOpen} currentAttendantId={selectedRoom?.attendant_id ?? null} onConfirm={handleReassign} />
    </>
  );
};

export default AdminWorkspace;
