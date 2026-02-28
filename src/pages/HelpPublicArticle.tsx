import { useState, useEffect, useRef, useCallback } from "react";

import { useParams, Link, useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { ChevronRight } from "lucide-react";

interface ArticleData {
  id: string;
  title: string;
  subtitle: string | null;
  slug: string;
  status: string;
  current_version_id: string | null;
  collection_id: string | null;
  tenant_id: string;
}

export default function HelpPublicArticle() {
  const { tenantSlug, articleSlug } = useParams();
  const navigate = useNavigate();
  const [article, setArticle] = useState<ArticleData | null>(null);
  const [htmlContent, setHtmlContent] = useState("");
  const [collectionName, setCollectionName] = useState<string | null>(null);
  const [collectionSlug, setCollectionSlug] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const contentRef = useRef<HTMLDivElement>(null);
  const trackedRef = useRef(false);
  const [resolvedSlug, setResolvedSlug] = useState<string | null>(tenantSlug || null);

  const helpBase = resolvedSlug ? `/${resolvedSlug}/help` : "/help";

  useEffect(() => {
    if (articleSlug) loadArticle();
  }, [tenantSlug, articleSlug]);

  const loadArticle = async () => {
    let tenantIdResolved: string | null = null;

    if (tenantSlug) {
      const { data: tenant } = await supabase.from("tenants").select("id, slug").or(`slug.eq.${tenantSlug},id.eq.${tenantSlug}`).maybeSingle();
      if (!tenant) { setLoading(false); return; }
      tenantIdResolved = tenant.id;
      setResolvedSlug(tenant.slug);
    }

    // Find article - with or without tenant filter
    let query = supabase.from("help_articles")
      .select("id, title, subtitle, slug, status, current_version_id, collection_id, tenant_id")
      .eq("slug", articleSlug!);
    
    if (tenantIdResolved) {
      query = query.eq("tenant_id", tenantIdResolved);
    }

    const { data: art } = await query.maybeSingle();

    if (!art || art.status === "archived") {
      navigate(helpBase, { replace: true });
      return;
    }

    if (art.status !== "published") { setLoading(false); return; }

    setArticle(art);

    // Resolve tenant slug for breadcrumb if not in URL
    if (!tenantSlug && art.tenant_id) {
      const { data: t } = await supabase.from("tenants").select("slug").eq("id", art.tenant_id).single();
      if (t) setResolvedSlug(t.slug);
    }

    // Load version HTML
    if (art.current_version_id) {
      const { data: ver } = await supabase.from("help_article_versions")
        .select("html_snapshot")
        .eq("id", art.current_version_id)
        .single();
      setHtmlContent(ver?.html_snapshot || "");
    }

    // Load collection name
    if (art.collection_id) {
      const { data: col } = await supabase.from("help_collections")
        .select("name, slug")
        .eq("id", art.collection_id)
        .single();
      if (col) { setCollectionName(col.name); setCollectionSlug(col.slug); }
    }

    setLoading(false);
  };

  // Track page view
  const trackView = useCallback(async () => {
    if (!article || trackedRef.current) return;
    trackedRef.current = true;

    const visitorId = localStorage.getItem("help_visitor_id") || crypto.randomUUID();
    localStorage.setItem("help_visitor_id", visitorId);
    const sessionId = sessionStorage.getItem("help_session_id") || crypto.randomUUID();
    sessionStorage.setItem("help_session_id", sessionId);

    await supabase.from("help_article_events").insert({
      tenant_id: article.tenant_id,
      article_id: article.id,
      event_type: "page_view",
      visitor_id: visitorId,
      session_id: sessionId,
      event_meta: { referrer: document.referrer, url: window.location.href },
    });

    const dayAgo = new Date(Date.now() - 86400000).toISOString();
    const { data: existing } = await supabase.from("help_article_events")
      .select("id")
      .eq("article_id", article.id)
      .eq("visitor_id", visitorId)
      .eq("event_type", "unique_view")
      .gte("occurred_at", dayAgo)
      .limit(1);

    if (!existing || existing.length === 0) {
      await supabase.from("help_article_events").insert({
        tenant_id: article.tenant_id,
        article_id: article.id,
        event_type: "unique_view",
        visitor_id: visitorId,
        session_id: sessionId,
      });
    }
  }, [article]);

  useEffect(() => { trackView(); }, [trackView]);

  // Track link clicks
  useEffect(() => {
    if (!contentRef.current || !article) return;
    const handler = (e: MouseEvent) => {
      const link = (e.target as HTMLElement).closest("a");
      if (!link) return;
      const href = link.getAttribute("href");
      if (!href) return;

      const visitorId = localStorage.getItem("help_visitor_id") || "";
      supabase.from("help_article_events").insert({
        tenant_id: article.tenant_id,
        article_id: article.id,
        event_type: "link_click",
        visitor_id: visitorId,
        event_meta: { url: href },
      });
    };
    contentRef.current.addEventListener("click", handler);
    return () => contentRef.current?.removeEventListener("click", handler);
  }, [htmlContent, article]);

  // SEO meta tags
  useEffect(() => {
    if (!article) return;
    document.title = `${article.title} | Help Center`;
    const setMeta = (name: string, content: string) => {
      let el = document.querySelector(`meta[name="${name}"]`) || document.querySelector(`meta[property="${name}"]`);
      if (!el) { el = document.createElement("meta"); (name.startsWith("og:") ? el.setAttribute("property", name) : el.setAttribute("name", name)); document.head.appendChild(el); }
      el.setAttribute("content", content);
    };
    const desc = article.subtitle || "";
    setMeta("description", desc);
    setMeta("og:title", article.title);
    setMeta("og:description", desc);
    setMeta("og:type", "article");
  }, [article]);

  if (loading) return <div className="flex items-center justify-center min-h-screen"><div className="h-6 w-6 animate-spin rounded-full border-2 border-primary border-t-transparent" /></div>;
  if (!article) return <div className="flex items-center justify-center min-h-screen text-muted-foreground">Artigo não encontrado</div>;

  return (
    <div className="min-h-screen bg-background">
      <div className="max-w-3xl mx-auto px-4 py-8">
        {/* Breadcrumb */}
        <nav className="flex items-center gap-1 text-sm text-muted-foreground mb-8 flex-wrap">
          <Link to={helpBase} className="hover:text-foreground">Help Center</Link>
          {collectionName && collectionSlug && (
            <>
              <ChevronRight className="h-3 w-3" />
              <Link to={`${helpBase}/c/${collectionSlug}`} className="hover:text-foreground">{collectionName}</Link>
            </>
          )}
          <ChevronRight className="h-3 w-3" />
          <span className="text-foreground">{article.title}</span>
        </nav>

        <article>
          <h1 className="text-3xl font-bold mb-2">{article.title}</h1>
          {article.subtitle && <p className="text-lg text-muted-foreground mb-8">{article.subtitle}</p>}

          <div
            ref={contentRef}
            className="prose prose-sm dark:prose-invert max-w-none help-article-content"
            dangerouslySetInnerHTML={{ __html: htmlContent }}
          />
        </article>
      </div>
    </div>
  );
}
