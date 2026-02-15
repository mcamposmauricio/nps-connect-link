import { useEffect, useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Switch } from "@/components/ui/switch";
import { Badge } from "@/components/ui/badge";
import { useLanguage } from "@/contexts/LanguageContext";
import { useToast } from "@/hooks/use-toast";
import { supabase } from "@/integrations/supabase/client";
import { Headphones, X } from "lucide-react";

interface CSMWithChat {
  id: string;
  name: string;
  email: string;
  is_chat_enabled: boolean | null;
  chat_max_conversations: number | null;
}

interface Team {
  id: string;
  name: string;
}

interface TeamMember {
  team_id: string;
  attendant_id: string;
}

const AttendantsTab = () => {
  const { t } = useLanguage();
  const { toast } = useToast();
  const [csms, setCsms] = useState<CSMWithChat[]>([]);
  const [teams, setTeams] = useState<Team[]>([]);
  const [teamMembers, setTeamMembers] = useState<TeamMember[]>([]);
  const [attendantProfiles, setAttendantProfiles] = useState<{ id: string; csm_id: string }[]>([]);
  const [loading, setLoading] = useState(true);

  const fetchAll = async () => {
    setLoading(true);
    const [{ data: csmsData }, { data: teamsData }, { data: membersData }, { data: profilesData }] = await Promise.all([
      supabase.from("csms").select("id, name, email, is_chat_enabled, chat_max_conversations").order("name"),
      supabase.from("chat_teams").select("id, name").order("name"),
      supabase.from("chat_team_members").select("team_id, attendant_id"),
      supabase.from("attendant_profiles").select("id, csm_id"),
    ]);
    setCsms((csmsData as CSMWithChat[]) ?? []);
    setTeams(teamsData ?? []);
    setTeamMembers((membersData as TeamMember[]) ?? []);
    setAttendantProfiles((profilesData as any[]) ?? []);
    setLoading(false);
  };

  useEffect(() => { fetchAll(); }, []);

  const toggleChatEnabled = async (csmId: string, enabled: boolean) => {
    const { error } = await supabase.from("csms").update({ is_chat_enabled: enabled }).eq("id", csmId);
    if (error) {
      toast({ title: "Erro", description: error.message, variant: "destructive" });
    } else {
      toast({ title: enabled ? t("chat.attendants.enabled") : t("chat.attendants.disabled") });
      fetchAll();
    }
  };

  const getAttendantId = (csmId: string) => attendantProfiles.find(p => p.csm_id === csmId)?.id;

  const getCsmTeams = (csmId: string) => {
    const attId = getAttendantId(csmId);
    if (!attId) return [];
    return teamMembers.filter(m => m.attendant_id === attId).map(m => teams.find(t => t.id === m.team_id)).filter(Boolean) as Team[];
  };

  const addToTeam = async (csmId: string, teamId: string) => {
    const attId = getAttendantId(csmId);
    if (!attId) return;
    const tenant = teams.find(t => t.id === teamId);
    const { data: teamData } = await supabase.from("chat_teams").select("tenant_id").eq("id", teamId).single();
    await supabase.from("chat_team_members").insert({
      team_id: teamId,
      attendant_id: attId,
      tenant_id: teamData?.tenant_id,
    });
    fetchAll();
  };

  const removeFromTeam = async (csmId: string, teamId: string) => {
    const attId = getAttendantId(csmId);
    if (!attId) return;
    await supabase.from("chat_team_members").delete().eq("team_id", teamId).eq("attendant_id", attId);
    fetchAll();
  };

  if (loading) {
    return (
      <div className="flex justify-center py-12">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary" />
      </div>
    );
  }

  if (csms.length === 0) {
    return (
      <div className="rounded-lg border bg-card shadow-sm p-8 text-center text-muted-foreground">
        <Headphones className="h-12 w-12 mx-auto mb-4 opacity-30" />
        <p>{t("chat.attendants.no_csms")}</p>
      </div>
    );
  }

  return (
    <div className="grid gap-4">
      {csms.map((csm) => {
        const csmTeams = getCsmTeams(csm.id);
        const availableTeams = teams.filter(t => !csmTeams.some(ct => ct.id === t.id));
        return (
          <Card key={csm.id}>
            <CardHeader className="pb-2">
              <div className="flex items-center justify-between">
                <CardTitle className="text-base">{csm.name}</CardTitle>
                <div className="flex items-center gap-3">
                  {csm.is_chat_enabled && (
                    <Badge variant="secondary" className="text-xs">{t("chat.attendants.active")}</Badge>
                  )}
                  <Switch checked={csm.is_chat_enabled ?? false} onCheckedChange={(v) => toggleChatEnabled(csm.id, v)} />
                </div>
              </div>
            </CardHeader>
            <CardContent>
              <p className="text-sm text-muted-foreground">{csm.email}</p>
              {csm.is_chat_enabled && (
                <>
                  <p className="text-xs text-muted-foreground mt-1">
                    Max: {csm.chat_max_conversations ?? 5} {t("chat.attendants.conversations")}
                  </p>
                  <div className="mt-3">
                    <p className="text-xs font-medium mb-1.5">{t("chat.teams.title")}</p>
                    <div className="flex flex-wrap gap-1.5">
                      {csmTeams.map(team => (
                        <Badge key={team.id} variant="outline" className="text-xs gap-1">
                          {team.name}
                          <button onClick={() => removeFromTeam(csm.id, team.id)} className="ml-0.5 hover:text-destructive">
                            <X className="h-3 w-3" />
                          </button>
                        </Badge>
                      ))}
                      {availableTeams.length > 0 && (
                        <select
                          className="text-xs border rounded px-1.5 py-0.5 bg-background"
                          value=""
                          onChange={(e) => { if (e.target.value) addToTeam(csm.id, e.target.value); }}
                        >
                          <option value="">+ {t("chat.teams.addMember")}</option>
                          {availableTeams.map(t => (
                            <option key={t.id} value={t.id}>{t.name}</option>
                          ))}
                        </select>
                      )}
                    </div>
                  </div>
                </>
              )}
            </CardContent>
          </Card>
        );
      })}
    </div>
  );
};

export default AttendantsTab;
