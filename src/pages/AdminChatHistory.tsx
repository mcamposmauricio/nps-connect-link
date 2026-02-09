import { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import SidebarLayout from "@/components/SidebarLayout";
import { useLanguage } from "@/contexts/LanguageContext";
import { useChatHistory } from "@/hooks/useChatHistory";
import { useAttendants } from "@/hooks/useAttendants";
import { format } from "date-fns";
import { Download, Search, ChevronLeft, ChevronRight } from "lucide-react";

const AdminChatHistory = () => {
  const { t } = useLanguage();
  const { attendants } = useAttendants();
  const [page, setPage] = useState(0);
  const [resolutionStatus, setResolutionStatus] = useState<string | null>(null);
  const [attendantId, setAttendantId] = useState<string | null>(null);
  const [search, setSearch] = useState("");

  const { rooms, loading, totalCount, totalPages, exportToCSV } = useChatHistory({
    page,
    resolutionStatus,
    attendantId,
    search,
  });

  const resolutionBadge = (status: string | null) => {
    switch (status) {
      case "resolved":
        return <Badge className="bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-400">{t("chat.history.resolved")}</Badge>;
      case "escalated":
        return <Badge className="bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-400">{t("chat.history.escalated")}</Badge>;
      case "pending":
        return <Badge className="bg-orange-100 text-orange-800 dark:bg-orange-900/30 dark:text-orange-400">{t("chat.history.pending_status")}</Badge>;
      default:
        return <Badge variant="secondary">{status ?? "—"}</Badge>;
    }
  };

  const handleFilterChange = () => {
    setPage(0);
  };

  return (
    <SidebarLayout>
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-semibold">{t("chat.history.title")}</h1>
            <p className="text-muted-foreground">
              {totalCount} {t("chat.history.total_closed")}
            </p>
          </div>
          <Button onClick={exportToCSV} variant="outline" disabled={rooms.length === 0}>
            <Download className="h-4 w-4 mr-2" />
            {t("chat.history.export_csv")}
          </Button>
        </div>

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
                      <TableHead>ID</TableHead>
                      <TableHead>{t("chat.history.client")}</TableHead>
                      <TableHead>{t("chat.history.attendant")}</TableHead>
                      <TableHead>{t("chat.history.resolution")}</TableHead>
                      <TableHead>{t("chat.history.csat")}</TableHead>
                      <TableHead>{t("chat.history.tags")}</TableHead>
                      <TableHead>{t("chat.history.started_at")}</TableHead>
                      <TableHead>{t("chat.history.closed_at")}</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {rooms.map((room) => (
                      <TableRow key={room.id}>
                        <TableCell className="font-mono text-xs">{room.id.slice(0, 8)}</TableCell>
                        <TableCell>{room.visitor_name ?? "—"}</TableCell>
                        <TableCell>{room.attendant_name ?? "—"}</TableCell>
                        <TableCell>{resolutionBadge(room.resolution_status)}</TableCell>
                        <TableCell>
                          {room.csat_score != null ? `${room.csat_score}/5` : "—"}
                        </TableCell>
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
                      </TableRow>
                    ))}
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
    </SidebarLayout>
  );
};

export default AdminChatHistory;
