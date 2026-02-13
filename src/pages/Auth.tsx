import { useState, useEffect } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card } from "@/components/ui/card";
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

  // Check if already logged in
  useEffect(() => {
    const checkUser = async () => {
      const { data: { session } } = await supabase.auth.getSession();
      if (session) {
        navigate("/dashboard");
      }
    };
    checkUser();
  }, [navigate]);

  // Load invite profile if token exists
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

  // Handle login
  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);

    try {
      const { error } = await supabase.auth.signInWithPassword({
        email,
        password,
      });
      if (error) throw error;
      navigate("/dashboard");
    } catch (error: any) {
      toast({
        title: t("auth.error"),
        description: error.message,
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  // Handle invite acceptance (signup)
  const handleAcceptInvite = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!inviteProfile) return;
    setLoading(true);

    try {
      // 1. Sign up the user
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

      // 2. Update the invite profile with the new user_id and mark as accepted
      const { error: updateError } = await supabase
        .from("user_profiles")
        .update({
          user_id: newUserId,
          invite_status: "accepted",
          display_name: displayName || inviteProfile.display_name,
          last_sign_in_at: new Date().toISOString(),
        })
        .eq("id", inviteProfile.id)
        .eq("invite_status", "pending");

      if (updateError) {
        console.error("Profile update error:", updateError);
        // Don't throw - the user was created, they can still log in
      }

      // 3. If profile has CS specialties, create a CSM record
      if (inviteProfile.specialty && inviteProfile.specialty.length > 0) {
        await supabase.from("csms").insert({
          user_id: newUserId,
          name: displayName || inviteProfile.display_name || inviteProfile.email.split("@")[0],
          email: inviteProfile.email,
          specialty: inviteProfile.specialty,
        });
      }

      toast({
        title: t("auth.signupSuccess"),
        description: t("auth.checkEmail"),
      });

      // Clear the invite token from URL and show login
      navigate("/auth", { replace: true });
    } catch (error: any) {
      toast({
        title: t("auth.error"),
        description: error.message,
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  // Invite loading state
  if (inviteToken && inviteLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-primary via-accent to-purple-600 p-4">
        <Card className="w-full max-w-md p-8 shadow-xl text-center">
          <Loader2 className="h-8 w-8 animate-spin mx-auto mb-4 text-primary" />
          <p className="text-muted-foreground">{t("auth.loadingInvite")}</p>
        </Card>
      </div>
    );
  }

  // Invalid/expired invite
  if (inviteToken && inviteError) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-primary via-accent to-purple-600 p-4">
        <Card className="w-full max-w-md p-8 shadow-xl text-center">
          <UserPlus className="h-12 w-12 mx-auto mb-4 text-muted-foreground" />
          <h2 className="text-xl font-semibold mb-2">{t("auth.inviteInvalid")}</h2>
          <p className="text-muted-foreground mb-4">{t("auth.inviteInvalidDesc")}</p>
          <Button onClick={() => navigate("/auth", { replace: true })} variant="outline">
            {t("auth.backToLogin")}
          </Button>
        </Card>
      </div>
    );
  }

  // Invite acceptance form
  if (inviteToken && inviteProfile) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-primary via-accent to-purple-600 p-4">
        <Card className="w-full max-w-md p-8 shadow-xl">
          <div className="flex items-center justify-center mb-6">
            <Zap className="h-10 w-10 text-primary mr-3" />
            <h1 className="text-2xl font-bold bg-gradient-to-r from-primary to-accent bg-clip-text text-transparent">
              Journey CS
            </h1>
          </div>

          <div className="text-center mb-6">
            <Badge variant="secondary" className="mb-2">
              <UserPlus className="h-3 w-3 mr-1" />
              {t("auth.inviteBadge")}
            </Badge>
            <h2 className="text-lg font-semibold">{t("auth.welcomeInvite")}</h2>
            <p className="text-sm text-muted-foreground">{t("auth.completeSignup")}</p>
          </div>

          <form onSubmit={handleAcceptInvite} className="space-y-4">
            <div>
              <label htmlFor="invite-name" className="block text-sm font-medium mb-2">
                {t("auth.displayName")}
              </label>
              <Input
                id="invite-name"
                type="text"
                value={displayName}
                onChange={(e) => setDisplayName(e.target.value)}
                placeholder={t("auth.displayNamePlaceholder")}
              />
            </div>

            <div>
              <label htmlFor="invite-email" className="block text-sm font-medium mb-2">
                {t("auth.email")}
              </label>
              <Input
                id="invite-email"
                type="email"
                value={inviteProfile.email}
                disabled
                className="bg-muted"
              />
            </div>

            <div>
              <label htmlFor="invite-password" className="block text-sm font-medium mb-2">
                {t("auth.password")}
              </label>
              <Input
                id="invite-password"
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="••••••••"
                required
                minLength={6}
              />
            </div>

            <Button type="submit" className="w-full" disabled={loading}>
              {loading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              {t("auth.acceptInvite")}
            </Button>
          </form>
        </Card>
      </div>
    );
  }

  // Default: Login-only form (no signup toggle)
  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-primary via-accent to-purple-600 p-4">
      <Card className="w-full max-w-md p-8 shadow-xl">
        <div className="flex items-center justify-center mb-8">
          <Zap className="h-12 w-12 text-primary mr-3" />
          <h1 className="text-3xl font-bold bg-gradient-to-r from-primary to-accent bg-clip-text text-transparent">
            Journey CS
          </h1>
        </div>

        <form onSubmit={handleLogin} className="space-y-4">
          <div>
            <label htmlFor="email" className="block text-sm font-medium mb-2">
              {t("auth.email")}
            </label>
            <Input
              id="email"
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder={t("auth.email")}
              required
            />
          </div>

          <div>
            <label htmlFor="password" className="block text-sm font-medium mb-2">
              {t("auth.password")}
            </label>
            <Input
              id="password"
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="••••••••"
              required
              minLength={6}
            />
          </div>

          <Button type="submit" className="w-full" disabled={loading}>
            {loading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
            {t("auth.login")}
          </Button>
        </form>

        <div className="mt-4 text-center space-y-2">
          <button
            type="button"
            onClick={() => navigate("/auth/forgot-password")}
            className="text-sm text-primary hover:underline block w-full"
          >
            {t("auth.forgotPassword")}
          </button>
          <button
            type="button"
            onClick={() => navigate("/")}
            className="text-sm text-muted-foreground hover:text-foreground block w-full"
          >
            {t("auth.discoverJourney")}
          </button>
        </div>
      </Card>
    </div>
  );
};

export default Auth;
