import { useState, useEffect } from "react";
import { useParams, Link } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { ChevronRight } from "lucide-react";

interface Article {
  id: string;
  title: string;
  subtitle: string | null;
  slug: string;
}

interface CollectionInfo {
  name: string;
  description: string | null;
  icon: string | null;
}

export default function HelpPublicCollection() {
  const { tenantSlug, collectionSlug } = useParams();
  const [collection, setCollection] = useState<CollectionInfo | null>(null);
  const [articles, setArticles] = useState<Article[]>([]);
  const [loading, setLoading] = useState(true);

  const helpBase = tenantSlug ? `/${tenantSlug}/help` : "/help";

  useEffect(() => {
    if (collectionSlug) loadData();
  }, [tenantSlug, collectionSlug]);

  const loadData = async () => {
    let tenantIdResolved: string | null = null;

    if (tenantSlug) {
      const { data: tenant } = await supabase.from("tenants").select("id").or(`slug.eq.${tenantSlug},id.eq.${tenantSlug}`).maybeSingle();
      if (!tenant) { setLoading(false); return; }
      tenantIdResolved = tenant.id;
    } else {
      // Resolve tenant from help_site_settings
      const { data: site } = await supabase.from("help_site_settings").select("tenant_id").limit(1).maybeSingle();
      if (site) tenantIdResolved = site.tenant_id;
      else {
        const { data: art } = await supabase.from("help_articles").select("tenant_id").eq("status", "published").limit(1).maybeSingle();
        if (art) tenantIdResolved = art.tenant_id;
      }
    }

    if (!tenantIdResolved) { setLoading(false); return; }

    // Find collection
    const { data: col } = await supabase.from("help_collections")
      .select("id, name, description, icon")
      .eq("tenant_id", tenantIdResolved)
      .eq("slug", collectionSlug!)
      .eq("status", "active")
      .maybeSingle();
    if (!col) { setLoading(false); return; }
    setCollection(col);

    // Get articles
    const { data: arts } = await supabase.from("help_articles")
      .select("id, title, subtitle, slug")
      .eq("tenant_id", tenantIdResolved)
      .eq("collection_id", col.id)
      .eq("status", "published")
      .order("published_at", { ascending: false });

    setArticles(arts ?? []);
    setLoading(false);
  };

  if (loading) return <div className="flex items-center justify-center min-h-screen"><div className="h-6 w-6 animate-spin rounded-full border-2 border-primary border-t-transparent" /></div>;
  if (!collection) return <div className="flex items-center justify-center min-h-screen text-muted-foreground">Coleção não encontrada</div>;

  return (
    <div className="min-h-screen bg-background">
      <div className="max-w-3xl mx-auto px-4 py-8">
        {/* Breadcrumb */}
        <nav className="flex items-center gap-1 text-sm text-muted-foreground mb-8">
          <Link to={helpBase} className="hover:text-foreground">Help Center</Link>
          <ChevronRight className="h-3 w-3" />
          <span className="text-foreground">{collection.name}</span>
        </nav>

        <div className="mb-8">
          <span className="text-3xl mb-3 block">{collection.icon || "📚"}</span>
          <h1 className="text-2xl font-bold mb-2">{collection.name}</h1>
          {collection.description && <p className="text-muted-foreground">{collection.description}</p>}
        </div>

        {articles.length === 0 ? (
          <p className="text-muted-foreground">Nenhum artigo nesta coleção.</p>
        ) : (
          <div className="space-y-2">
            {articles.map(art => (
              <Link key={art.id} to={`${helpBase}/a/${art.slug}`} className="block p-4 border rounded-lg hover:bg-muted/50 transition-colors">
                <p className="font-medium">{art.title}</p>
                {art.subtitle && <p className="text-sm text-muted-foreground mt-0.5">{art.subtitle}</p>}
              </Link>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
