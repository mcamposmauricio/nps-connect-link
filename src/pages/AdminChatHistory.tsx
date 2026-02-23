import { useState, useCallback, useEffect } from "react";
import { Card, CardContent } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Calendar } from "@/components/ui/calendar";
import { Checkbox } from "@/components/ui/checkbox";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";

import { useLanguage } from "@/contexts/LanguageContext";
import { useChatHistory } from "@/hooks/useChatHistory";
import { useAttendants } from "@/hooks/useAttendants";
import { useAuth } from "@/hooks/useAuth";
import { ReadOnlyChatDialog } from "@/components/chat/ReadOnlyChatDialog";
import { format } from "date-fns";
import { Download, Search, ChevronLeft, ChevronRight, Eye, CalendarIcon, Star, Loader2, RotateCcw, MoreHorizontal, Archive, CheckCircle2 } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";

function formatDuration(minutes: number | null): string {
  if (minutes == null) return "—";
  if (minutes < 60) return `${minutes}min`;
  const h = Math.floor(minutes / 60);
  const m = minutes % 60;
  return m > 0 ? `${h}h${m}min` : `${h}h`;
}

function csatColor(score: number | null): string {
  if (score == null) return "";
  if (score <= 2) return "text-red-500";
  if (score === 3) return "text-yellow-500";
  return "text-green-500";
}

const AdminChatHistory = () => {
  const { t } = useLanguage();
  const { user } = useAuth();
  const { attendants } = useAttendants();
  const [page, setPage] = useState(0);
  const [resolutionStatus, setResolutionStatus] = useState<string | null>(null);
  const [attendantId, setAttendantId] = useState<string | null>(null);
  const [search, setSearch] = useState("");
  const [csatFilter, setCsatFilter] = useState<string | null>(null);
  const [dateFrom, setDateFrom] = useState<Date | undefined>(undefined);
  const [dateTo, setDateTo] = useState<Date | undefined>(undefined);
  const [exporting, setExporting] = useState(false);
  const [tagId, setTagId] = useState<string | null>(null);
  const [tags, setTags] = useState<{ id: string; name: string; color: string }[]>([]);
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());

  // ReadOnly dialog
  const [readOnlyRoom, setReadOnlyRoom] = useState<{ id: string; name: string } | null>(null);

  useEffect(() => {
    supabase.from("chat_tags").select("id, name, color").order("name").then(({ data }) => {
      setTags(data ?? []);
    });
  }, []);

  const { rooms, loading, totalCount, totalPages, exportToCSV, refetch } = useChatHistory({
    page,
    resolutionStatus,
    attendantId,
    search,
    tagId,
    csatFilter: csatFilter ?? undefined,
    dateFrom: dateFrom?.toISOString(),
    dateTo: dateTo ? new Date(dateTo.getTime() + 86400000).toISOString() : undefined,
  });

  const resolutionBadge = (status: string | null) => {
    switch (status) {
      case "resolved":
        return <Badge className="bg-green-100 text-green-800">{t("chat.history.resolved")}</Badge>;
      case "escalated":
        return <Badge className="bg-red-100 text-red-800">{t("chat.history.escalated")}</Badge>;
      case "pending":
        return <Badge className="bg-orange-100 text-orange-800">{t("chat.history.pending_status")}</Badge>;
      case "archived":
        return <Badge className="bg-muted text-muted-foreground">Arquivado</Badge>;
      default:
        return <Badge variant="secondary">{status ?? "—"}</Badge>;
    }
  };

  const handleFilterChange = () => {
    setPage(0);
    setSelectedIds(new Set());
  };

  // Reopen a pending chat
  const handleReopenChat = async (roomId: string, originalAttendantId: string | null) => {
    // Get attendant name for system message
    let attendantName = "Atendente";
    if (user) {
      const { data: profile } = await supabase
        .from("user_profiles")
        .select("display_name")
        .eq("user_id", user.id)
        .maybeSingle();
      if (profile?.display_name) attendantName = profile.display_name;
    }

    // Reactivate room
    const updateData: Record<string, any> = {
      status: originalAttendantId ? "active" : "waiting",
      closed_at: null,
      resolution_status: null,
    };

    await supabase.from("chat_rooms").update(updateData).eq("id", roomId);

    // Insert system message
    await supabase.from("chat_messages").insert({
      room_id: roomId,
      sender_type: "system",
      sender_name: "Sistema",
      content: `[Sistema] Chat reaberto por ${attendantName}`,
      is_internal: false,
    });

    toast.success("Chat reaberto com sucesso!");
    refetch();
  };

  // Bulk actions
  const handleBulkAction = async (action: "resolved" | "archived") => {
    if (selectedIds.size === 0) return;

    const ids = Array.from(selectedIds);
    await supabase
      .from("chat_rooms")
      .update({ resolution_status: action })
      .in("id", ids);

    toast.success(`${ids.length} chat(s) ${action === "resolved" ? "marcado(s) como resolvido(s)" : "arquivado(s)"}`);
    setSelectedIds(new Set());
    refetch();
  };

  // Individual action
  const handleIndividualAction = async (roomId: string, action: "resolved" | "archived") => {
    await supabase
      .from("chat_rooms")
      .update({ resolution_status: action })
      .eq("id", roomId);

    toast.success(action === "resolved" ? "Marcado como resolvido" : "Arquivado");
    refetch();
  };

  const toggleSelect = (id: string) => {
    setSelectedIds((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };

  const toggleSelectAll = () => {
    if (selectedIds.size === rooms.length) {
      setSelectedIds(new Set());
    } else {
      setSelectedIds(new Set(rooms.map((r) => r.id)));
    }
  };

  // Full export
  const handleFullExport = async () => {
    setExporting(true);
    try {
      const PAGE_SIZE = 100;
      let allRooms: any[] = [];
      let from = 0;
      let hasMore = true;

      while (hasMore) {
        let query = supabase
          .from("chat_rooms")
          .select("id, status, resolution_status, created_at, closed_at, csat_score, visitor_id, attendant_id")
          .eq("status", "closed")
          .order("closed_at", { ascending: false })
          .range(from, from + PAGE_SIZE - 1);

        if (resolutionStatus) query = query.eq("resolution_status", resolutionStatus);
        if (attendantId) query = query.eq("attendant_id", attendantId);
        if (dateFrom) query = query.gte("closed_at", dateFrom.toISOString());
        if (dateTo) query = query.lte("closed_at", new Date(dateTo.getTime() + 86400000).toISOString());
        if (csatFilter === "low") query = query.lte("csat_score", 2).not("csat_score", "is", null);
        else if (csatFilter === "neutral") query = query.eq("csat_score", 3);
        else if (csatFilter === "good") query = query.gte("csat_score", 4);

        const { data } = await query;
        if (!data || data.length === 0) {
          hasMore = false;
        } else {
          allRooms = [...allRooms, ...data];
          from += PAGE_SIZE;
          if (data.length < PAGE_SIZE) hasMore = false;
        }
      }

      const visitorIds = [...new Set(allRooms.map((r) => r.visitor_id))];
      const { data: visitors } = await supabase.from("chat_visitors").select("id, name").in("id", visitorIds);
      const visitorMap = new Map(visitors?.map((v) => [v.id, v.name]) ?? []);

      const attIds = [...new Set(allRooms.filter((r) => r.attendant_id).map((r) => r.attendant_id!))];
      let attMap = new Map<string, string>();
      if (attIds.length > 0) {
        const { data: atts } = await supabase.from("attendant_profiles").select("id, display_name").in("id", attIds);
        attMap = new Map(atts?.map((a) => [a.id, a.display_name]) ?? []);
      }

      const headers = ["ID", "Cliente", "Atendente", "Resolução", "CSAT", "Duração (min)", "Início", "Encerramento"];
      const rows = allRooms.map((r) => {
        const dur = r.closed_at && r.created_at
          ? Math.floor((new Date(r.closed_at).getTime() - new Date(r.created_at).getTime()) / 60000)
          : "";
        return [
          r.id.slice(0, 8),
          visitorMap.get(r.visitor_id) ?? "—",
          r.attendant_id ? (attMap.get(r.attendant_id) ?? "—") : "—",
          r.resolution_status ?? "—",
          r.csat_score != null ? `${r.csat_score}/5` : "—",
          String(dur),
          r.created_at ? new Date(r.created_at).toLocaleString("pt-BR") : "—",
          r.closed_at ? new Date(r.closed_at).toLocaleString("pt-BR") : "—",
        ];
      });

      const csv = [headers, ...rows].map((row) => row.map((v) => `"${v}"`).join(",")).join("\n");
      const blob = new Blob([csv], { type: "text/csv;charset=utf-8;" });
      const url = URL.createObjectURL(blob);
      const link = document.createElement("a");
      link.href = url;
      link.download = `historico-completo-${new Date().toISOString().split("T")[0]}.csv`;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      URL.revokeObjectURL(url);
      toast.success(`${allRooms.length} conversas exportadas`);
    } catch {
      toast.error("Erro ao exportar");
    }
    setExporting(false);
  };

  return (
    <>
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-semibold">{t("chat.history.title")}</h1>
            <p className="text-muted-foreground">
              {totalCount} {t("chat.history.total_closed")}
            </p>
          </div>
          <div className="flex gap-2">
            <Button onClick={exportToCSV} variant="outline" size="sm" disabled={rooms.length === 0}>
              <Download className="h-4 w-4 mr-2" />
              Página
            </Button>
            <Button onClick={handleFullExport} variant="outline" size="sm" disabled={exporting}>
              {exporting ? <Loader2 className="h-4 w-4 mr-2 animate-spin" /> : <Download className="h-4 w-4 mr-2" />}
              Exportar Tudo
            </Button>
          </div>
        </div>

        {/* Bulk action bar */}
        {selectedIds.size > 0 && (
          <div className="flex items-center gap-3 bg-muted/50 border rounded-lg px-4 py-2">
            <span className="text-sm font-medium">{selectedIds.size} selecionado(s)</span>
            <Button size="sm" variant="outline" onClick={() => handleBulkAction("resolved")}>
              <CheckCircle2 className="h-4 w-4 mr-1" />
              Marcar como Resolvido
            </Button>
            <Button size="sm" variant="outline" onClick={() => handleBulkAction("archived")}>
              <Archive className="h-4 w-4 mr-1" />
              Arquivar
            </Button>
            <Button size="sm" variant="ghost" onClick={() => setSelectedIds(new Set())}>
              Limpar seleção
            </Button>
          </div>
        )}

        {/* Filters */}
        <div className="flex flex-wrap gap-3">
          <div className="relative flex-1 min-w-[200px]">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input
              placeholder={t("chat.history.search_client")}
              value={search}
              onChange={(e) => { setSearch(e.target.value); handleFilterChange(); }}
              className="pl-9"
            />
          </div>
          <Select
            value={resolutionStatus ?? "all"}
            onValueChange={(v) => { setResolutionStatus(v === "all" ? null : v); handleFilterChange(); }}
          >
            <SelectTrigger className="w-[180px]">
              <SelectValue placeholder={t("chat.history.filter.status")} />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">{t("common.all")}</SelectItem>
              <SelectItem value="resolved">{t("chat.history.resolved")}</SelectItem>
              <SelectItem value="pending">{t("chat.history.pending_status")}</SelectItem>
              <SelectItem value="escalated">{t("chat.history.escalated")}</SelectItem>
              <SelectItem value="archived">Arquivado</SelectItem>
            </SelectContent>
          </Select>
          <Select
            value={attendantId ?? "all"}
            onValueChange={(v) => { setAttendantId(v === "all" ? null : v); handleFilterChange(); }}
          >
            <SelectTrigger className="w-[200px]">
              <SelectValue placeholder={t("chat.history.filter.attendant")} />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">{t("common.all")}</SelectItem>
              {attendants.map((a) => (
                <SelectItem key={a.id} value={a.id}>{a.display_name}</SelectItem>
              ))}
            </SelectContent>
          </Select>
          <Select
            value={csatFilter ?? "all"}
            onValueChange={(v) => { setCsatFilter(v === "all" ? null : v); handleFilterChange(); }}
          >
            <SelectTrigger className="w-[150px]">
              <SelectValue placeholder="CSAT" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">Todos CSAT</SelectItem>
              <SelectItem value="low">1-2 (Ruim)</SelectItem>
              <SelectItem value="neutral">3 (Neutro)</SelectItem>
              <SelectItem value="good">4-5 (Bom)</SelectItem>
            </SelectContent>
          </Select>
          {tags.length > 0 && (
            <Select
              value={tagId ?? "all"}
              onValueChange={(v) => { setTagId(v === "all" ? null : v); handleFilterChange(); }}
            >
              <SelectTrigger className="w-[180px]">
                <SelectValue placeholder="Tag" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Todas Tags</SelectItem>
                {tags.map((tag) => (
                  <SelectItem key={tag.id} value={tag.id}>{tag.name}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          )}

          {/* Date range */}
          <Popover>
            <PopoverTrigger asChild>
              <Button variant="outline" size="sm" className="gap-2 h-10">
                <CalendarIcon className="h-4 w-4" />
                {dateFrom ? format(dateFrom, "dd/MM") : "De"} — {dateTo ? format(dateTo, "dd/MM") : "Até"}
              </Button>
            </PopoverTrigger>
            <PopoverContent className="w-auto p-0" align="start">
              <div className="flex gap-2 p-3">
                <div>
                  <p className="text-xs text-muted-foreground mb-1">De</p>
                  <Calendar
                    mode="single"
                    selected={dateFrom}
                    onSelect={(d) => { setDateFrom(d); handleFilterChange(); }}
                  />
                </div>
                <div>
                  <p className="text-xs text-muted-foreground mb-1">Até</p>
                  <Calendar
                    mode="single"
                    selected={dateTo}
                    onSelect={(d) => { setDateTo(d); handleFilterChange(); }}
                  />
                </div>
              </div>
              {(dateFrom || dateTo) && (
                <div className="p-2 border-t">
                  <Button variant="ghost" size="sm" className="w-full text-xs" onClick={() => { setDateFrom(undefined); setDateTo(undefined); handleFilterChange(); }}>
                    Limpar datas
                  </Button>
                </div>
              )}
            </PopoverContent>
          </Popover>
        </div>

        {/* Table */}
        <Card className="rounded-lg border bg-card shadow-sm">
          <CardContent className="pt-6">
            {loading ? (
              <div className="flex justify-center py-8">
                <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary" />
              </div>
            ) : rooms.length === 0 ? (
              <p className="text-sm text-muted-foreground text-center py-8">
                {t("chat.history.no_data")}
              </p>
            ) : (
              <>
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead className="w-[40px]">
                        <Checkbox
                          checked={selectedIds.size === rooms.length && rooms.length > 0}
                          onCheckedChange={toggleSelectAll}
                        />
                      </TableHead>
                      <TableHead className="w-[40px]"></TableHead>
                      <TableHead>ID</TableHead>
                      <TableHead>{t("chat.history.client")}</TableHead>
                      <TableHead>{t("chat.history.attendant")}</TableHead>
                      <TableHead>{t("chat.history.resolution")}</TableHead>
                      <TableHead>{t("chat.history.csat")}</TableHead>
                      <TableHead>Duração</TableHead>
                      <TableHead>{t("chat.history.tags")}</TableHead>
                      <TableHead>{t("chat.history.started_at")}</TableHead>
                      <TableHead>{t("chat.history.closed_at")}</TableHead>
                      <TableHead className="w-[80px]">Ações</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {rooms.map((room) => {
                      const duration = room.closed_at && room.created_at
                        ? Math.floor((new Date(room.closed_at).getTime() - new Date(room.created_at).getTime()) / 60000)
                        : null;

                      return (
                        <TableRow key={room.id} className="hover:bg-muted/50">
                          <TableCell onClick={(e) => e.stopPropagation()}>
                            <Checkbox
                              checked={selectedIds.has(room.id)}
                              onCheckedChange={() => toggleSelect(room.id)}
                            />
                          </TableCell>
                          <TableCell
                            className="cursor-pointer"
                            onClick={() => setReadOnlyRoom({ id: room.id, name: room.visitor_name ?? "Visitante" })}
                          >
                            <Eye className="h-4 w-4 text-muted-foreground" />
                          </TableCell>
                          <TableCell className="font-mono text-xs">{room.id.slice(0, 8)}</TableCell>
                          <TableCell>{room.visitor_name ?? "—"}</TableCell>
                          <TableCell>{room.attendant_name ?? "—"}</TableCell>
                          <TableCell>{resolutionBadge(room.resolution_status)}</TableCell>
                          <TableCell>
                            {room.csat_score != null ? (
                              <span className={`flex items-center gap-1 font-medium ${csatColor(room.csat_score)}`}>
                                <Star className="h-3 w-3 fill-current" />
                                {room.csat_score}/5
                              </span>
                            ) : "—"}
                          </TableCell>
                          <TableCell className="text-sm">{formatDuration(duration)}</TableCell>
                          <TableCell>
                            <div className="flex gap-1 flex-wrap">
                              {room.tags.length > 0
                                ? room.tags.map((tag, i) => (
                                    <Badge key={i} variant="outline" style={{ borderColor: tag.color, color: tag.color }}>
                                      {tag.name}
                                    </Badge>
                                  ))
                                : "—"}
                            </div>
                          </TableCell>
                          <TableCell className="text-sm">
                            {format(new Date(room.created_at), "dd/MM/yyyy HH:mm")}
                          </TableCell>
                          <TableCell className="text-sm">
                            {room.closed_at
                              ? format(new Date(room.closed_at), "dd/MM/yyyy HH:mm")
                              : "—"}
                          </TableCell>
                          <TableCell onClick={(e) => e.stopPropagation()}>
                            <DropdownMenu>
                              <DropdownMenuTrigger asChild>
                                <Button variant="ghost" size="icon" className="h-8 w-8">
                                  <MoreHorizontal className="h-4 w-4" />
                                </Button>
                              </DropdownMenuTrigger>
                              <DropdownMenuContent align="end">
                                {room.resolution_status === "pending" && (
                                  <DropdownMenuItem onClick={() => handleReopenChat(room.id, room.attendant_id)}>
                                    <RotateCcw className="h-4 w-4 mr-2" />
                                    Reabrir
                                  </DropdownMenuItem>
                                )}
                                {room.resolution_status !== "resolved" && (
                                  <DropdownMenuItem onClick={() => handleIndividualAction(room.id, "resolved")}>
                                    <CheckCircle2 className="h-4 w-4 mr-2" />
                                    Marcar como Resolvido
                                  </DropdownMenuItem>
                                )}
                                {room.resolution_status !== "archived" && (
                                  <DropdownMenuItem onClick={() => handleIndividualAction(room.id, "archived")}>
                                    <Archive className="h-4 w-4 mr-2" />
                                    Arquivar
                                  </DropdownMenuItem>
                                )}
                              </DropdownMenuContent>
                            </DropdownMenu>
                          </TableCell>
                        </TableRow>
                      );
                    })}
                  </TableBody>
                </Table>

                {/* Pagination */}
                {totalPages > 1 && (
                  <div className="flex items-center justify-between mt-4">
                    <p className="text-sm text-muted-foreground">
                      {t("chat.history.page").replace("{page}", String(page + 1)).replace("{total}", String(totalPages))}
                    </p>
                    <div className="flex gap-2">
                      <Button
                        variant="outline"
                        size="sm"
                        disabled={page === 0}
                        onClick={() => setPage((p) => p - 1)}
                      >
                        <ChevronLeft className="h-4 w-4" />
                      </Button>
                      <Button
                        variant="outline"
                        size="sm"
                        disabled={page >= totalPages - 1}
                        onClick={() => setPage((p) => p + 1)}
                      >
                        <ChevronRight className="h-4 w-4" />
                      </Button>
                    </div>
                  </div>
                )}
              </>
            )}
          </CardContent>
        </Card>
      </div>

      <ReadOnlyChatDialog
        roomId={readOnlyRoom?.id ?? null}
        visitorName={readOnlyRoom?.name ?? ""}
        open={!!readOnlyRoom}
        onOpenChange={(open) => !open && setReadOnlyRoom(null)}
      />
    </>
  );
};

export default AdminChatHistory;
