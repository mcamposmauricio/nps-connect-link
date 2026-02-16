import { useState, useEffect } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { useToast } from "@/hooks/use-toast";
import { Loader2, Zap, UserPlus } from "lucide-react";
import { useLanguage } from "@/contexts/LanguageContext";

interface InviteProfile {
  id: string;
  email: string;
  display_name: string | null;
  invite_token: string;
  invite_status: string;
  specialty: string[];
  tenant_id: string | null;
}

const Auth = () => {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [displayName, setDisplayName] = useState("");
  const [loading, setLoading] = useState(false);
  const [inviteProfile, setInviteProfile] = useState<InviteProfile | null>(null);
  const [inviteLoading, setInviteLoading] = useState(false);
  const [inviteError, setInviteError] = useState(false);
  const navigate = useNavigate();
  const { toast } = useToast();
  const { t } = useLanguage();
  const [searchParams] = useSearchParams();
  const inviteToken = searchParams.get("invite");

  useEffect(() => {
    const checkUser = async () => {
      const { data: { session } } = await supabase.auth.getSession();
      if (session) navigate("/dashboard");
    };
    checkUser();
  }, [navigate]);

  useEffect(() => {
    if (!inviteToken) return;
    const loadInvite = async () => {
      setInviteLoading(true);
      setInviteError(false);
      const { data, error } = await supabase
        .from("user_profiles")
        .select("id, email, display_name, invite_token, invite_status, specialty, tenant_id")
        .eq("invite_token", inviteToken)
        .eq("invite_status", "pending")
        .maybeSingle();
      if (error || !data) {
        setInviteError(true);
      } else {
        setInviteProfile(data as InviteProfile);
        setEmail(data.email);
        setDisplayName(data.display_name || "");
      }
      setInviteLoading(false);
    };
    loadInvite();
  }, [inviteToken]);

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    try {
      const { error } = await supabase.auth.signInWithPassword({ email, password });
      if (error) throw error;
      navigate("/dashboard");
    } catch (error: any) {
      toast({ title: t("auth.error"), description: error.message, variant: "destructive" });
    } finally {
      setLoading(false);
    }
  };

  const handleAcceptInvite = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!inviteProfile) return;
    setLoading(true);
    try {
      const { data: signUpData, error: signUpError } = await supabase.auth.signUp({
        email: inviteProfile.email,
        password,
        options: {
          data: { display_name: displayName || inviteProfile.display_name },
          emailRedirectTo: `${window.location.origin}/dashboard`,
        },
      });
      if (signUpError) throw signUpError;
      const newUserId = signUpData.user?.id;
      if (!newUserId) throw new Error("User creation failed");

      const { error: updateError } = await supabase
        .from("user_profiles")
        .update({
          user_id: newUserId, invite_status: "accepted",
          display_name: displayName || inviteProfile.display_name,
          last_sign_in_at: new Date().toISOString(),
        })
        .eq("id", inviteProfile.id)
        .eq("invite_status", "pending");
      if (updateError) console.error("Profile update error:", updateError);

      if (inviteProfile.specialty && inviteProfile.specialty.length > 0) {
        await supabase.from("csms").insert({
          user_id: newUserId,
          name: displayName || inviteProfile.display_name || inviteProfile.email.split("@")[0],
          email: inviteProfile.email,
          specialty: inviteProfile.specialty,
        });
      }
      toast({ title: t("auth.signupSuccess"), description: t("auth.checkEmail") });
      navigate("/auth", { replace: true });
    } catch (error: any) {
      toast({ title: t("auth.error"), description: error.message, variant: "destructive" });
    } finally {
      setLoading(false);
    }
  };

  const cardClasses = "w-full max-w-md rounded-2xl border border-white/10 bg-white/5 backdrop-blur-xl p-8 shadow-2xl";

  // Invite loading
  if (inviteToken && inviteLoading) {
    return (
      <div className="min-h-screen bg-dark-hero flex items-center justify-center p-4">
        <div className={cardClasses + " text-center"}>
          <Loader2 className="h-8 w-8 animate-spin mx-auto mb-4 text-accent" />
          <p className="text-white/60">{t("auth.loadingInvite")}</p>
        </div>
      </div>
    );
  }

  // Invalid invite
  if (inviteToken && inviteError) {
    return (
      <div className="min-h-screen bg-dark-hero flex items-center justify-center p-4">
        <div className={cardClasses + " text-center"}>
          <UserPlus className="h-12 w-12 mx-auto mb-4 text-white/40" />
          <h2 className="text-xl font-semibold text-white mb-2">{t("auth.inviteInvalid")}</h2>
          <p className="text-white/60 mb-4">{t("auth.inviteInvalidDesc")}</p>
          <Button onClick={() => navigate("/auth", { replace: true })} variant="outline" className="border-white/20 text-white hover:bg-white/10">
            {t("auth.backToLogin")}
          </Button>
        </div>
      </div>
    );
  }

  // Invite acceptance form
  if (inviteToken && inviteProfile) {
    return (
      <div className="min-h-screen bg-dark-hero flex items-center justify-center p-4">
        <div className={cardClasses}>
          <div className="flex items-center justify-center mb-6">
            <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-accent text-white mr-3">
              <Zap className="h-5 w-5" />
            </div>
            <h1 className="text-2xl font-bold text-white">Journey CS</h1>
          </div>
          <div className="text-center mb-6">
            <Badge className="bg-accent/20 text-accent border-accent/30 mb-2">
              <UserPlus className="h-3 w-3 mr-1" />{t("auth.inviteBadge")}
            </Badge>
            <h2 className="text-lg font-semibold text-white">{t("auth.welcomeInvite")}</h2>
            <p className="text-sm text-white/60">{t("auth.completeSignup")}</p>
          </div>
          <form onSubmit={handleAcceptInvite} className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-white/80 mb-2">{t("auth.displayName")}</label>
              <Input id="invite-name" value={displayName} onChange={(e) => setDisplayName(e.target.value)}
                placeholder={t("auth.displayNamePlaceholder")}
                className="bg-white/10 border-white/10 text-white placeholder:text-white/40 focus-visible:ring-accent" />
            </div>
            <div>
              <label className="block text-sm font-medium text-white/80 mb-2">{t("auth.email")}</label>
              <Input value={inviteProfile.email} disabled className="bg-white/5 border-white/10 text-white/60" />
            </div>
            <div>
              <label className="block text-sm font-medium text-white/80 mb-2">{t("auth.password")}</label>
              <Input type="password" value={password} onChange={(e) => setPassword(e.target.value)}
                placeholder="••••••••" required minLength={6}
                className="bg-white/10 border-white/10 text-white placeholder:text-white/40 focus-visible:ring-accent" />
            </div>
            <Button type="submit" variant="gradient" className="w-full" disabled={loading}>
              {loading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              {t("auth.acceptInvite")}
            </Button>
          </form>
        </div>
      </div>
    );
  }

  // Default login
  return (
    <div className="min-h-screen bg-dark-hero flex items-center justify-center p-4">
      <div className={cardClasses + " animate-scale-in"}>
        <div className="flex items-center justify-center mb-8">
          <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-accent text-white mr-3">
            <Zap className="h-6 w-6" />
          </div>
          <h1 className="text-3xl font-bold text-white">Journey CS</h1>
        </div>

        <form onSubmit={handleLogin} className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-white/80 mb-2">{t("auth.email")}</label>
            <Input id="email" type="email" value={email} onChange={(e) => setEmail(e.target.value)}
              placeholder={t("auth.email")} required
              className="bg-white/10 border-white/10 text-white placeholder:text-white/40 focus-visible:ring-accent" />
          </div>
          <div>
            <label className="block text-sm font-medium text-white/80 mb-2">{t("auth.password")}</label>
            <Input id="password" type="password" value={password} onChange={(e) => setPassword(e.target.value)}
              placeholder="••••••••" required minLength={6}
              className="bg-white/10 border-white/10 text-white placeholder:text-white/40 focus-visible:ring-accent" />
          </div>
          <Button type="submit" className="w-full bg-gradient-to-r from-indigo-600 to-emerald-500 text-white font-semibold hover:opacity-90 shadow-md" disabled={loading}>
            {loading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
            {t("auth.login")}
          </Button>
        </form>

        <div className="mt-4 text-center space-y-2">
          <button type="button" onClick={() => navigate("/auth/forgot-password")}
            className="text-sm text-accent hover:underline block w-full">
            {t("auth.forgotPassword")}
          </button>
          <button type="button" onClick={() => navigate("/")}
            className="text-sm text-white/40 hover:text-white/70 block w-full">
            {t("auth.discoverJourney")}
          </button>
        </div>
      </div>
    </div>
  );
};

export default Auth;
