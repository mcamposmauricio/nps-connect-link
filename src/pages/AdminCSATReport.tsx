import { useState, useEffect } from "react";
import { Star, ThumbsUp, ThumbsDown, BarChart3, Download, MessageSquare, Filter, ChevronLeft, ChevronRight } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip";
import { Input } from "@/components/ui/input";
import { MetricCard } from "@/components/ui/metric-card";
import { ReadOnlyChatDialog } from "@/components/chat/ReadOnlyChatDialog";
import { PageHeader } from "@/components/ui/page-header";
import { useLanguage } from "@/contexts/LanguageContext";
import { useCSATReport, type CSATReportFilters } from "@/hooks/useCSATReport";
import { supabase } from "@/integrations/supabase/client";
import { BarChart, Bar, LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip as RechartsTooltip, ResponsiveContainer } from "recharts";

const AdminCSATReport = () => {
  const { t } = useLanguage();

  const [filters, setFilters] = useState<CSATReportFilters>({
    period: "month",
    scores: [],
    attendantId: null,
    teamId: null,
    tagId: null,
    dateFrom: null,
    dateTo: null,
    sortBy: "date",
    sortDir: "desc",
    page: 0,
  });

  const { records, stats, totalCount, loading, pageSize } = useCSATReport(filters);

  const [attendantOptions, setAttendantOptions] = useState<{ id: string; name: string }[]>([]);
  const [teamOptions, setTeamOptions] = useState<{ id: string; name: string }[]>([]);
  const [tagOptions, setTagOptions] = useState<{ id: string; name: string }[]>([]);
  const [readOnlyRoom, setReadOnlyRoom] = useState<{ id: string; name: string } | null>(null);

  useEffect(() => {
    Promise.all([
      supabase.from("attendant_profiles").select("id, display_name").order("display_name"),
      supabase.from("chat_teams").select("id, name").order("name"),
      supabase.from("chat_tags").select("id, name").order("name"),
    ]).then(([attRes, teamRes, tagRes]) => {
      setAttendantOptions((attRes.data ?? []).map((a) => ({ id: a.id, name: a.display_name })));
      setTeamOptions((teamRes.data ?? []).map((t) => ({ id: t.id, name: t.name })));
      setTagOptions((tagRes.data ?? []).map((t) => ({ id: t.id, name: t.name })));
    });
  }, []);

  const totalPages = Math.ceil(totalCount / pageSize);

  const scoreColor = (score: number) => {
    if (score >= 4) return "text-green-600 bg-green-50 border-green-200";
    if (score === 3) return "text-amber-600 bg-amber-50 border-amber-200";
    return "text-red-600 bg-red-50 border-red-200";
  };

  const renderStars = (score: number) => {
    return (
      <div className="flex items-center gap-0.5">
        {[1, 2, 3, 4, 5].map((s) => (
          <Star
            key={s}
            className={`h-3.5 w-3.5 ${s <= score ? (score >= 4 ? "fill-green-500 text-green-500" : score === 3 ? "fill-amber-500 text-amber-500" : "fill-red-500 text-red-500") : "text-muted-foreground/30"}`}
          />
        ))}
      </div>
    );
  };

  const toggleScore = (score: number) => {
    setFilters((f) => ({
      ...f,
      page: 0,
      scores: f.scores.includes(score) ? f.scores.filter((s) => s !== score) : [...f.scores, score],
    }));
  };

  const handleExportCSV = () => {
    if (records.length === 0) return;
    const headers = ["Cliente", "Atendente", "Nota", "Comentário", "Duração (min)", "Tags", "Data"];
    const rows = records.map((r) => [
      r.visitorName,
      r.attendantName,
      r.csatScore,
      (r.csatComment ?? "").replace(/"/g, '""'),
      r.durationMinutes ?? "",
      r.tags.map((t) => t.name).join("; "),
      new Date(r.closedAt).toLocaleDateString("pt-BR"),
    ]);
    const csv = [headers.join(","), ...rows.map((r) => r.map((v) => `"${v}"`).join(","))].join("\n");
    const blob = new Blob([csv], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.download = `csat-report-${new Date().toISOString().slice(0, 10)}.csv`;
    link.click();
    URL.revokeObjectURL(url);
  };

  const scoreDistColors = ["hsl(0 84% 60%)", "hsl(15 80% 55%)", "hsl(45 93% 47%)", "hsl(120 40% 50%)", "hsl(142 71% 45%)"];

  return (
    <>
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <PageHeader title={t("csat.report.title")} subtitle={t("csat.report.subtitle")} />
          <Button variant="outline" size="sm" onClick={handleExportCSV} disabled={records.length === 0}>
            <Download className="h-4 w-4 mr-2" />
            {t("csat.report.export")}
          </Button>
        </div>

        {/* Filters */}
        <Card className="rounded-lg border bg-card shadow-sm">
          <CardContent className="p-4">
            <div className="flex items-center gap-2 flex-wrap">
              <Filter className="h-4 w-4 text-muted-foreground" />
              <Select value={filters.period} onValueChange={(v) => setFilters((f) => ({ ...f, period: v as any, page: 0 }))}>
                <SelectTrigger className="w-[120px]"><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="today">{t("chat.gerencial.today")}</SelectItem>
                  <SelectItem value="week">{t("chat.gerencial.week")}</SelectItem>
                  <SelectItem value="month">{t("chat.gerencial.month_period")}</SelectItem>
                  <SelectItem value="all">{t("chat.gerencial.all_time")}</SelectItem>
                </SelectContent>
              </Select>

              <Select value={filters.attendantId ?? "all"} onValueChange={(v) => setFilters((f) => ({ ...f, attendantId: v === "all" ? null : v, page: 0 }))}>
                <SelectTrigger className="w-[180px]"><SelectValue placeholder={t("chat.gerencial.filter_by_attendant")} /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">{t("chat.gerencial.all_time")}</SelectItem>
                  {attendantOptions.map((a) => (
                    <SelectItem key={a.id} value={a.id}>{a.name}</SelectItem>
                  ))}
                </SelectContent>
              </Select>

              {teamOptions.length > 0 && (
                <Select value={filters.teamId ?? "all"} onValueChange={(v) => setFilters((f) => ({ ...f, teamId: v === "all" ? null : v, page: 0 }))}>
                  <SelectTrigger className="w-[160px]"><SelectValue placeholder={t("csat.report.team")} /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">{t("chat.gerencial.all_time")}</SelectItem>
                    {teamOptions.map((team) => (
                      <SelectItem key={team.id} value={team.id}>{team.name}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              )}

              {tagOptions.length > 0 && (
                <Select value={filters.tagId ?? "all"} onValueChange={(v) => setFilters((f) => ({ ...f, tagId: v === "all" ? null : v, page: 0 }))}>
                  <SelectTrigger className="w-[150px]"><SelectValue placeholder="Tag" /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">{t("chat.gerencial.all_time")}</SelectItem>
                    {tagOptions.map((tag) => (
                      <SelectItem key={tag.id} value={tag.id}>{tag.name}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              )}

              <Input
                type="date"
                className="w-[140px]"
                value={filters.dateFrom ?? ""}
                onChange={(e) => setFilters((f) => ({ ...f, dateFrom: e.target.value || null, page: 0 }))}
                placeholder="De"
              />
              <Input
                type="date"
                className="w-[140px]"
                value={filters.dateTo ?? ""}
                onChange={(e) => setFilters((f) => ({ ...f, dateTo: e.target.value || null, page: 0 }))}
                placeholder="Até"
              />
            </div>

            {/* Score filter chips */}
            <div className="flex items-center gap-2 mt-3">
              <span className="text-xs text-muted-foreground">{t("csat.report.filter_score")}:</span>
              {[1, 2, 3, 4, 5].map((score) => (
                <button
                  key={score}
                  onClick={() => toggleScore(score)}
                  className={`inline-flex items-center gap-1 px-2 py-1 rounded-full text-xs font-medium border transition-colors ${
                    filters.scores.includes(score) ? scoreColor(score) : "text-muted-foreground border-border bg-background"
                  }`}
                >
                  <Star className={`h-3 w-3 ${filters.scores.includes(score) ? "" : "text-muted-foreground/50"}`} />
                  {score}
                </button>
              ))}
              {filters.scores.length > 0 && (
                <button onClick={() => setFilters((f) => ({ ...f, scores: [], page: 0 }))} className="text-xs text-muted-foreground underline">
                  {t("csat.report.clear")}
                </button>
              )}
            </div>
          </CardContent>
        </Card>

        {loading ? (
          <div className="flex justify-center py-12">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary" />
          </div>
        ) : (
          <>
            {/* KPI Cards */}
            <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
              <MetricCard
                title={t("csat.report.avg_csat")}
                value={stats.avgCsat != null ? `${stats.avgCsat}/5` : "—"}
                icon={Star}
                iconColor="text-yellow-500"
                iconBgColor="bg-yellow-500/10"
              />
              <MetricCard
                title={t("csat.report.total_evaluations")}
                value={stats.totalEvaluations}
                icon={BarChart3}
                iconColor="text-blue-500"
                iconBgColor="bg-blue-500/10"
              />
              <MetricCard
                title={t("csat.report.positive")}
                value={stats.positivePercent != null ? `${stats.positivePercent}%` : "—"}
                icon={ThumbsUp}
                iconColor="text-green-500"
                iconBgColor="bg-green-500/10"
              />
              <MetricCard
                title={t("csat.report.negative")}
                value={stats.negativePercent != null ? `${stats.negativePercent}%` : "—"}
                icon={ThumbsDown}
                iconColor="text-red-500"
                iconBgColor="bg-red-500/10"
              />
            </div>

            {/* Charts */}
            <div className="grid gap-4 lg:grid-cols-2">
              <Card className="rounded-lg border bg-card shadow-sm">
                <CardHeader><CardTitle>{t("csat.report.csat_by_day")}</CardTitle></CardHeader>
                <CardContent>
                  {stats.csatByDay.length > 0 ? (
                    <ResponsiveContainer width="100%" height={250}>
                      <LineChart data={stats.csatByDay}>
                        <CartesianGrid strokeDasharray="3 3" />
                        <XAxis dataKey="date" />
                        <YAxis domain={[0, 5]} />
                        <RechartsTooltip />
                        <Line type="monotone" dataKey="avg" stroke="hsl(var(--primary))" strokeWidth={2} dot={{ r: 3 }} />
                      </LineChart>
                    </ResponsiveContainer>
                  ) : (
                    <p className="text-sm text-muted-foreground py-12 text-center">{t("chat.gerencial.no_data")}</p>
                  )}
                </CardContent>
              </Card>

              <Card className="rounded-lg border bg-card shadow-sm">
                <CardHeader><CardTitle>{t("csat.report.score_distribution")}</CardTitle></CardHeader>
                <CardContent>
                  {stats.scoreDistribution.some((d) => d.count > 0) ? (
                    <ResponsiveContainer width="100%" height={250}>
                      <BarChart data={stats.scoreDistribution} layout="vertical">
                        <CartesianGrid strokeDasharray="3 3" />
                        <XAxis type="number" allowDecimals={false} />
                        <YAxis dataKey="score" type="category" tickFormatter={(s) => `★ ${s}`} />
                        <RechartsTooltip />
                        <Bar
                          dataKey="count"
                          radius={[0, 4, 4, 0]}
                          fill="hsl(var(--primary))"
                        />
                      </BarChart>
                    </ResponsiveContainer>
                  ) : (
                    <p className="text-sm text-muted-foreground py-12 text-center">{t("chat.gerencial.no_data")}</p>
                  )}
                </CardContent>
              </Card>
            </div>

            {/* Results Table */}
            <Card className="rounded-lg border bg-card shadow-sm">
              <CardHeader>
                <div className="flex items-center justify-between">
                  <CardTitle>{t("csat.report.results")} ({totalCount})</CardTitle>
                  <div className="flex items-center gap-2">
                    <Select value={`${filters.sortBy}-${filters.sortDir}`} onValueChange={(v) => {
                      const [sortBy, sortDir] = v.split("-") as [CSATReportFilters["sortBy"], CSATReportFilters["sortDir"]];
                      setFilters((f) => ({ ...f, sortBy, sortDir, page: 0 }));
                    }}>
                      <SelectTrigger className="w-[180px]"><SelectValue /></SelectTrigger>
                      <SelectContent>
                        <SelectItem value="date-desc">{t("csat.report.sort_date_desc")}</SelectItem>
                        <SelectItem value="date-asc">{t("csat.report.sort_date_asc")}</SelectItem>
                        <SelectItem value="score-desc">{t("csat.report.sort_score_desc")}</SelectItem>
                        <SelectItem value="score-asc">{t("csat.report.sort_score_asc")}</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                </div>
              </CardHeader>
              <CardContent>
                {records.length === 0 ? (
                  <p className="text-sm text-muted-foreground py-8 text-center">{t("chat.gerencial.no_data")}</p>
                ) : (
                  <>
                    <Table>
                      <TableHeader>
                        <TableRow>
                          <TableHead>{t("csat.report.client")}</TableHead>
                          <TableHead>{t("chat.gerencial.attendant")}</TableHead>
                          <TableHead className="text-center">{t("csat.report.score")}</TableHead>
                          <TableHead>{t("csat.report.comment")}</TableHead>
                          <TableHead className="text-center">{t("csat.report.duration")}</TableHead>
                          <TableHead>Tags</TableHead>
                          <TableHead>{t("csat.report.date")}</TableHead>
                          <TableHead className="text-center">{t("csat.report.action")}</TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {records.map((record) => (
                          <TableRow key={record.roomId}>
                            <TableCell className="font-medium">{record.visitorName}</TableCell>
                            <TableCell>{record.attendantName}</TableCell>
                            <TableCell className="text-center">
                              <div className="flex flex-col items-center gap-0.5">
                                {renderStars(record.csatScore)}
                                <span className={`text-xs font-medium px-1.5 py-0.5 rounded border ${scoreColor(record.csatScore)}`}>
                                  {record.csatScore}
                                </span>
                              </div>
                            </TableCell>
                            <TableCell className="max-w-[200px]">
                              {record.csatComment ? (
                                <Tooltip>
                                  <TooltipTrigger asChild>
                                    <span className="text-sm truncate block cursor-default">{record.csatComment}</span>
                                  </TooltipTrigger>
                                  <TooltipContent className="max-w-sm">
                                    <p>{record.csatComment}</p>
                                  </TooltipContent>
                                </Tooltip>
                              ) : (
                                <span className="text-muted-foreground text-xs">—</span>
                              )}
                            </TableCell>
                            <TableCell className="text-center text-sm">
                              {record.durationMinutes != null ? (
                                record.durationMinutes < 60
                                  ? `${record.durationMinutes}min`
                                  : `${Math.floor(record.durationMinutes / 60)}h${record.durationMinutes % 60}min`
                              ) : "—"}
                            </TableCell>
                            <TableCell>
                              <div className="flex flex-wrap gap-1">
                                {record.tags.map((tag) => (
                                  <Badge key={tag.id} variant="secondary" className="text-[10px]" style={{ borderColor: tag.color ?? undefined }}>
                                    {tag.name}
                                  </Badge>
                                ))}
                              </div>
                            </TableCell>
                            <TableCell className="text-sm whitespace-nowrap">
                              {new Date(record.closedAt).toLocaleDateString("pt-BR")}
                            </TableCell>
                            <TableCell className="text-center">
                              <Button
                                size="sm"
                                variant="ghost"
                                className="h-7 text-xs gap-1"
                                onClick={() => setReadOnlyRoom({ id: record.roomId, name: record.visitorName })}
                              >
                                <MessageSquare className="h-3 w-3" />
                                {t("csat.report.view_chat")}
                              </Button>
                            </TableCell>
                          </TableRow>
                        ))}
                      </TableBody>
                    </Table>

                    {/* Pagination */}
                    {totalPages > 1 && (
                      <div className="flex items-center justify-between mt-4">
                        <span className="text-xs text-muted-foreground">
                          {t("csat.report.page")} {filters.page + 1} / {totalPages}
                        </span>
                        <div className="flex gap-1">
                          <Button
                            size="sm"
                            variant="outline"
                            disabled={filters.page === 0}
                            onClick={() => setFilters((f) => ({ ...f, page: f.page - 1 }))}
                          >
                            <ChevronLeft className="h-4 w-4" />
                          </Button>
                          <Button
                            size="sm"
                            variant="outline"
                            disabled={filters.page >= totalPages - 1}
                            onClick={() => setFilters((f) => ({ ...f, page: f.page + 1 }))}
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
          </>
        )}
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

export default AdminCSATReport;
