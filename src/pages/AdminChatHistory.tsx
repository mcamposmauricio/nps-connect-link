import { useEffect, useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import SidebarLayout from "@/components/SidebarLayout";
import { useLanguage } from "@/contexts/LanguageContext";
import { supabase } from "@/integrations/supabase/client";
import { format } from "date-fns";

interface HistoryRoom {
  id: string;
  status: string;
  created_at: string;
  closed_at: string | null;
  csat_score: number | null;
  visitor_id: string;
}

const AdminChatHistory = () => {
  const { t } = useLanguage();
  const [rooms, setRooms] = useState<HistoryRoom[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchHistory = async () => {
      const { data } = await supabase
        .from("chat_rooms")
        .select("id, status, created_at, closed_at, csat_score, visitor_id")
        .order("created_at", { ascending: false })
        .limit(100);

      setRooms((data as HistoryRoom[]) ?? []);
      setLoading(false);
    };

    fetchHistory();
  }, []);

  const statusColor = (status: string) => {
    switch (status) {
      case "active": return "default";
      case "waiting": return "secondary";
      case "closed": return "outline";
      default: return "secondary";
    }
  };

  return (
    <SidebarLayout>
      <div className="space-y-6">
        <div>
          <h1 className="text-2xl font-bold">{t("chat.history.title")}</h1>
          <p className="text-muted-foreground">{t("chat.history.subtitle")}</p>
        </div>

        <Card>
          <CardHeader>
            <CardTitle>{t("chat.history.recent")}</CardTitle>
          </CardHeader>
          <CardContent>
            {loading ? (
              <div className="flex justify-center py-8">
                <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary" />
              </div>
            ) : rooms.length === 0 ? (
              <p className="text-sm text-muted-foreground text-center py-8">
                {t("chat.history.no_chats")}
              </p>
            ) : (
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>ID</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead>{t("chat.history.started_at")}</TableHead>
                    <TableHead>{t("chat.history.closed_at")}</TableHead>
                    <TableHead>CSAT</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {rooms.map((room) => (
                    <TableRow key={room.id}>
                      <TableCell className="font-mono text-xs">
                        {room.id.slice(0, 8)}
                      </TableCell>
                      <TableCell>
                        <Badge variant={statusColor(room.status)}>{room.status}</Badge>
                      </TableCell>
                      <TableCell className="text-sm">
                        {format(new Date(room.created_at), "dd/MM/yyyy HH:mm")}
                      </TableCell>
                      <TableCell className="text-sm">
                        {room.closed_at
                          ? format(new Date(room.closed_at), "dd/MM/yyyy HH:mm")
                          : "—"}
                      </TableCell>
                      <TableCell>
                        {room.csat_score != null ? `${room.csat_score}/5` : "—"}
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            )}
          </CardContent>
        </Card>
      </div>
    </SidebarLayout>
  );
};

export default AdminChatHistory;
