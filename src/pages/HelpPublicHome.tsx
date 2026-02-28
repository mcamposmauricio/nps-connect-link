import { useState, useEffect } from "react";
import { useParams, Link } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Input } from "@/components/ui/input";
import { Search } from "lucide-react";

interface SiteSettings {
  home_title: string;
  home_subtitle: string;
  theme: string;
  brand_logo_url: string | null;
  brand_primary_color: string;
}

interface Collection {
  id: string;
  name: string;
  slug: string;
  description: string | null;
  icon: string | null;
  article_count: number;
}

interface SearchResult {
  id: string;
  title: string;
  subtitle: string | null;
  slug: string;
}

export default function HelpPublicHome() {
  const { tenantSlug } = useParams();
  const [settings, setSettings] = useState<SiteSettings | null>(null);
  const [collections, setCollections] = useState<Collection[]>([]);
  const [recentArticles, setRecentArticles] = useState<SearchResult[]>([]);
  const [search, setSearch] = useState("");
  const [searchResults, setSearchResults] = useState<SearchResult[]>([]);
  const [tenantId, setTenantId] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [resolvedSlug, setResolvedSlug] = useState<string | null>(tenantSlug || null);

  // Helper to build links - always use tenant slug when available
  const helpBase = resolvedSlug ? `/${resolvedSlug}/help` : "/help";

  useEffect(() => {
    loadTenant();
  }, [tenantSlug]);

  const loadTenant = async () => {
    if (tenantSlug) {
      // Try slug first, then id
      const { data: tenant } = await supabase.from("tenants").select("id, slug").eq("slug", tenantSlug).maybeSingle();
      if (tenant) { setTenantId(tenant.id); setResolvedSlug(tenant.slug); return; }
      const { data: t2 } = await supabase.from("tenants").select("id, slug").eq("id", tenantSlug).maybeSingle();
      if (t2) { setTenantId(t2.id); setResolvedSlug(t2.slug); return; }
      setLoading(false);
    } else {
      // No tenantSlug: resolve tenant from help_site_settings (first found)
      const { data: site } = await supabase.from("help_site_settings").select("tenant_id").limit(1).maybeSingle();
      if (site) {
        setTenantId(site.tenant_id);
        const { data: t } = await supabase.from("tenants").select("slug").eq("id", site.tenant_id).single();
        if (t) setResolvedSlug(t.slug);
        return;
      }
      // Fallback: find any tenant with published articles
      const { data: art } = await supabase.from("help_articles").select("tenant_id").eq("status", "published").limit(1).maybeSingle();
      if (art) {
        setTenantId(art.tenant_id);
        const { data: t } = await supabase.from("tenants").select("slug").eq("id", art.tenant_id).single();
        if (t) setResolvedSlug(t.slug);
        return;
      }
      setLoading(false);
    }
  };

  useEffect(() => {
    if (tenantId) loadData();
  }, [tenantId]);

  const loadData = async () => {
    const [{ data: site }, { data: cols }, { data: arts }] = await Promise.all([
      supabase.from("help_site_settings").select("*").eq("tenant_id", tenantId!).maybeSingle(),
      supabase.from("help_collections").select("id, name, slug, description, icon").eq("tenant_id", tenantId!).eq("status", "active").order("order_index"),
      supabase.from("help_articles").select("id, title, subtitle, slug, collection_id").eq("tenant_id", tenantId!).eq("status", "published").order("published_at", { ascending: false }).limit(10),
    ]);

    if (site) setSettings(site as any);
    else setSettings({ home_title: "Central de Ajuda", home_subtitle: "Como podemos ajudar?", theme: "light", brand_logo_url: null, brand_primary_color: "#3B82F6" });

    // Count articles per collection
    const countMap: Record<string, number> = {};
    (arts ?? []).forEach(a => { if (a.collection_id) countMap[a.collection_id] = (countMap[a.collection_id] || 0) + 1; });
    setCollections((cols ?? []).map(c => ({ ...c, article_count: countMap[c.id] || 0 })));
    setRecentArticles((arts ?? []).map(a => ({ id: a.id, title: a.title, subtitle: a.subtitle, slug: a.slug })));
    setLoading(false);
  };

  useEffect(() => {
    if (!search.trim() || !tenantId) { setSearchResults([]); return; }
    const timer = setTimeout(async () => {
      const { data } = await supabase
        .from("help_articles")
        .select("id, title, subtitle, slug")
        .eq("tenant_id", tenantId!)
        .eq("status", "published")
        .or(`title.ilike.%${search}%,subtitle.ilike.%${search}%`)
        .limit(10);
      setSearchResults(data ?? []);
    }, 300);
    return () => clearTimeout(timer);
  }, [search, tenantId]);

  if (loading) return <div className="flex items-center justify-center min-h-screen"><div className="h-6 w-6 animate-spin rounded-full border-2 border-primary border-t-transparent" /></div>;
  if (!tenantId) return <div className="flex items-center justify-center min-h-screen text-muted-foreground">Help Center not found</div>;

  const primaryColor = settings?.brand_primary_color || "#3B82F6";

  return (
    <div className="min-h-screen bg-background">
      {/* Hero */}
      <div className="py-16 px-4 text-center" style={{ background: `linear-gradient(135deg, ${primaryColor}10, ${primaryColor}05)` }}>
        {settings?.brand_logo_url && <img src={settings.brand_logo_url} alt="" className="h-10 mx-auto mb-6" />}
        <h1 className="text-3xl font-bold mb-2">{settings?.home_title}</h1>
        <p className="text-muted-foreground mb-8">{settings?.home_subtitle}</p>
        <div className="relative max-w-lg mx-auto">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="Buscar na base de conhecimento..."
            value={search}
            onChange={e => setSearch(e.target.value)}
            className="pl-10 h-12 text-base"
          />
          {searchResults.length > 0 && (
            <div className="absolute top-full left-0 right-0 mt-1 bg-background border rounded-lg shadow-lg z-10 max-h-64 overflow-auto">
              {searchResults.map(r => (
                <Link key={r.id} to={`${helpBase}/a/${r.slug}`} className="block px-4 py-3 hover:bg-muted border-b last:border-0">
                  <p className="font-medium text-sm">{r.title}</p>
                  {r.subtitle && <p className="text-xs text-muted-foreground">{r.subtitle}</p>}
                </Link>
              ))}
            </div>
          )}
        </div>
      </div>

      <div className="max-w-4xl mx-auto px-4 py-12">
        {/* Collections grid */}
        {collections.length > 0 && (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 mb-12">
            {collections.map(col => (
              <Link key={col.id} to={`${helpBase}/c/${col.slug}`} className="block p-6 border rounded-lg hover:shadow-md transition-shadow bg-card">
                <span className="text-2xl mb-3 block">{col.icon || "📚"}</span>
                <h3 className="font-semibold mb-1">{col.name}</h3>
                {col.description && <p className="text-sm text-muted-foreground mb-2">{col.description}</p>}
                <span className="text-xs text-muted-foreground">{col.article_count} artigos</span>
              </Link>
            ))}
          </div>
        )}

        {/* Recent articles */}
        {recentArticles.length > 0 && (
          <div>
            <h2 className="text-lg font-semibold mb-4">Artigos Recentes</h2>
            <div className="space-y-2">
              {recentArticles.map(art => (
                <Link key={art.id} to={`${helpBase}/a/${art.slug}`} className="block p-4 border rounded-lg hover:bg-muted/50 transition-colors">
                  <p className="font-medium text-sm">{art.title}</p>
                  {art.subtitle && <p className="text-xs text-muted-foreground mt-0.5">{art.subtitle}</p>}
                </Link>
              ))}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
