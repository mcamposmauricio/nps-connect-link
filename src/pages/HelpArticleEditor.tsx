import { useState, useEffect, useCallback } from "react";
import { useLanguage } from "@/contexts/LanguageContext";
import { useAuth } from "@/hooks/useAuth";
import { supabase } from "@/integrations/supabase/client";
import { useNavigate, useParams } from "react-router-dom";
import { PageHeader } from "@/components/ui/page-header";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { ScrollArea } from "@/components/ui/scroll-area";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";
import { Save, Eye, Archive, Send, Loader2, Plus, Trash2, GripVertical, ChevronUp, ChevronDown, MoreHorizontal, History, RotateCcw, Type, AlignLeft, List, ImageIcon, Minus, MousePointerClick, AlertCircle, Table2, Footprints, Smile } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { slugify } from "@/utils/helpSlug";
import {
  EditorBlock, BlockType, HeadingData, ParagraphData, ListData, ImageData, GifData,
  ButtonData, CalloutData, DividerData, StepsData, TableData, IconTextData,
  createDefaultBlock, blocksToHtml, generateBlockId,
} from "@/utils/helpBlocks";
import { format } from "date-fns";

interface Collection { id: string; name: string; }
interface Version { id: string; version_number: number; change_summary: string | null; created_at: string; created_by_user_id: string; }

const BLOCK_TYPES: { type: BlockType; label: string; icon: React.ReactNode }[] = [
  { type: "heading", label: "Título", icon: <Type className="h-4 w-4" /> },
  { type: "paragraph", label: "Parágrafo", icon: <AlignLeft className="h-4 w-4" /> },
  { type: "list", label: "Lista", icon: <List className="h-4 w-4" /> },
  { type: "image", label: "Imagem", icon: <ImageIcon className="h-4 w-4" /> },
  { type: "divider", label: "Divisor", icon: <Minus className="h-4 w-4" /> },
  { type: "button", label: "Botão/CTA", icon: <MousePointerClick className="h-4 w-4" /> },
  { type: "callout", label: "Aviso", icon: <AlertCircle className="h-4 w-4" /> },
  { type: "steps", label: "Passo a passo", icon: <Footprints className="h-4 w-4" /> },
  { type: "table", label: "Tabela", icon: <Table2 className="h-4 w-4" /> },
  { type: "icon_text", label: "Ícone + Texto", icon: <Smile className="h-4 w-4" /> },
];

export default function HelpArticleEditor() {
  const { t } = useLanguage();
  const { tenantId, user } = useAuth();
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { toast } = useToast();
  const isNew = !id || id === "new";

  const [title, setTitle] = useState("");
  const [subtitle, setSubtitle] = useState("");
  const [slug, setSlugState] = useState("");
  const [collectionId, setCollectionId] = useState<string | null>(null);
  const [status, setStatus] = useState("draft");
  const [blocks, setBlocks] = useState<EditorBlock[]>([createDefaultBlock("paragraph")]);
  const [collections, setCollections] = useState<Collection[]>([]);
  const [versions, setVersions] = useState<Version[]>([]);
  const [saving, setSaving] = useState(false);
  const [loading, setLoading] = useState(!isNew);
  const [changeSummary, setChangeSummary] = useState("");
  const [showVersions, setShowVersions] = useState(false);

  useEffect(() => {
    if (!tenantId) return;
    loadCollections();
    if (!isNew) loadArticle();
  }, [tenantId, id]);

  const loadCollections = async () => {
    const { data } = await supabase.from("help_collections").select("id, name").eq("tenant_id", tenantId!).eq("status", "active").order("order_index");
    setCollections(data ?? []);
  };

  const loadArticle = async () => {
    setLoading(true);
    const { data: art } = await supabase.from("help_articles").select("*").eq("id", id!).single();
    if (!art) { navigate("/help/articles"); return; }

    setTitle(art.title);
    setSubtitle(art.subtitle || "");
    setSlugState(art.slug);
    setCollectionId(art.collection_id);
    setStatus(art.status);

    // Load current version blocks
    if (art.current_version_id) {
      const { data: ver } = await supabase.from("help_article_versions").select("editor_schema_json").eq("id", art.current_version_id).single();
      if (ver?.editor_schema_json) {
        const schema = ver.editor_schema_json as any;
        setBlocks(schema.blocks?.length > 0 ? schema.blocks : [createDefaultBlock("paragraph")]);
      }
    }

    // Load versions list
    const { data: vers } = await supabase.from("help_article_versions").select("id, version_number, change_summary, created_at, created_by_user_id").eq("article_id", id!).order("version_number", { ascending: false });
    setVersions(vers ?? []);
    setLoading(false);
  };

  const updateBlock = useCallback((blockId: string, data: any) => {
    setBlocks(prev => prev.map(b => b.id === blockId ? { ...b, data } : b));
  }, []);

  const removeBlock = (blockId: string) => {
    setBlocks(prev => prev.filter(b => b.id !== blockId));
  };

  const moveBlock = (index: number, direction: -1 | 1) => {
    const newIndex = index + direction;
    if (newIndex < 0 || newIndex >= blocks.length) return;
    setBlocks(prev => {
      const updated = [...prev];
      [updated[index], updated[newIndex]] = [updated[newIndex], updated[index]];
      return updated;
    });
  };

  const addBlock = (type: BlockType, afterIndex?: number) => {
    const block = createDefaultBlock(type);
    setBlocks(prev => {
      const idx = afterIndex !== undefined ? afterIndex + 1 : prev.length;
      const updated = [...prev];
      updated.splice(idx, 0, block);
      return updated;
    });
  };

  const handleSave = async (publishAction?: "publish" | "archive") => {
    if (!tenantId || !user || !title.trim()) return;
    setSaving(true);

    const finalSlug = slug || slugify(title);
    const htmlSnapshot = blocksToHtml(blocks);
    const editorSchema = { blocks };

    let newStatus = status;
    if (publishAction === "publish") newStatus = "published";
    else if (publishAction === "archive") newStatus = "archived";

    try {
      let articleId = id;

      if (isNew) {
        const { data: art, error } = await supabase.from("help_articles").insert({
          tenant_id: tenantId,
          title,
          subtitle: subtitle || null,
          slug: finalSlug,
          status: newStatus,
          collection_id: collectionId,
          created_by_user_id: user.id,
          updated_by_user_id: user.id,
          published_at: newStatus === "published" ? new Date().toISOString() : null,
        }).select("id").single();

        if (error) throw error;
        articleId = art!.id;
      } else {
        await supabase.from("help_articles").update({
          title,
          subtitle: subtitle || null,
          slug: finalSlug,
          status: newStatus,
          collection_id: collectionId,
          updated_by_user_id: user.id,
          published_at: newStatus === "published" ? new Date().toISOString() : null,
          archived_at: newStatus === "archived" ? new Date().toISOString() : null,
        }).eq("id", id!);
      }

      // Create new version
      const nextVersion = versions.length > 0 ? versions[0].version_number + 1 : 1;
      const { data: ver } = await supabase.from("help_article_versions").insert({
        tenant_id: tenantId,
        article_id: articleId!,
        version_number: nextVersion,
        editor_schema_json: editorSchema as any,
        html_snapshot: htmlSnapshot,
        change_summary: changeSummary || (isNew ? "Versão inicial" : `Versão ${nextVersion}`),
        created_by_user_id: user.id,
      }).select("id").single();

      if (ver) {
        await supabase.from("help_articles").update({ current_version_id: ver.id }).eq("id", articleId!);
      }

      setStatus(newStatus);
      setChangeSummary("");
      toast({ title: t("help.saveSuccess") });

      if (isNew) {
        navigate(`/help/articles/${articleId}/edit`, { replace: true });
      } else {
        loadArticle();
      }
    } catch (err: any) {
      toast({ title: "Erro ao salvar", description: err.message, variant: "destructive" });
    }
    setSaving(false);
  };

  const handleRestoreVersion = async (versionId: string) => {
    const { data: ver } = await supabase.from("help_article_versions").select("editor_schema_json").eq("id", versionId).single();
    if (ver?.editor_schema_json) {
      const schema = ver.editor_schema_json as any;
      setBlocks(schema.blocks || [createDefaultBlock("paragraph")]);
      toast({ title: "Versão restaurada. Salve para confirmar." });
    }
  };

  if (loading) return <div className="flex items-center justify-center py-16"><Loader2 className="h-6 w-6 animate-spin" /></div>;

  return (
    <div className="flex h-[calc(100vh-4rem)]">
      {/* Main editor */}
      <div className="flex-1 overflow-y-auto p-6 space-y-6">
        <PageHeader title={isNew ? t("help.newArticle") : t("help.editArticle")} subtitle={t("help.articles")}>
          <div className="flex items-center gap-2">
            <Button variant="outline" onClick={() => navigate("/help/articles")}>{t("team.cancel")}</Button>
            <Button variant="outline" onClick={() => handleSave()}>{saving ? <Loader2 className="h-4 w-4 mr-2 animate-spin" /> : <Save className="h-4 w-4 mr-2" />}{t("help.saveDraft")}</Button>
            {status !== "published" && (
              <Button onClick={() => handleSave("publish")}><Send className="h-4 w-4 mr-2" />{t("help.publish")}</Button>
            )}
          </div>
        </PageHeader>

        {/* Metadata */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
          <div className="space-y-1.5">
            <Label>{t("help.articleTitle")}</Label>
            <Input value={title} onChange={e => { setTitle(e.target.value); if (isNew) setSlugState(slugify(e.target.value)); }} placeholder="Título do artigo" className="text-lg font-semibold" />
          </div>
          <div className="space-y-1.5">
            <Label>{t("help.articleSlug")}</Label>
            <Input value={slug} onChange={e => setSlugState(e.target.value)} placeholder="slug-do-artigo" className="font-mono text-sm" />
          </div>
          <div className="space-y-1.5 lg:col-span-2">
            <Label>{t("help.articleSubtitle")}</Label>
            <Textarea value={subtitle} onChange={e => setSubtitle(e.target.value)} rows={2} placeholder="Descrição curta do artigo" />
          </div>
          <div className="space-y-1.5">
            <Label>{t("help.articleCollection")}</Label>
            <Select value={collectionId || "none"} onValueChange={v => setCollectionId(v === "none" ? null : v)}>
              <SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="none">Sem coleção</SelectItem>
                {collections.map(c => <SelectItem key={c.id} value={c.id}>{c.name}</SelectItem>)}
              </SelectContent>
            </Select>
          </div>
          <div className="space-y-1.5">
            <Label>Status</Label>
            <Badge className="text-xs">{t(`help.status.${status}`)}</Badge>
          </div>
        </div>

        <Separator />

        {/* Block editor */}
        <div className="space-y-3">
          <div className="flex items-center justify-between">
            <h3 className="text-sm font-medium">Conteúdo ({blocks.length} blocos)</h3>
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button variant="outline" size="sm"><Plus className="h-4 w-4 mr-1" />Adicionar bloco</Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent>
                {BLOCK_TYPES.map(bt => (
                  <DropdownMenuItem key={bt.type} onClick={() => addBlock(bt.type)}>
                    {bt.icon}<span className="ml-2">{bt.label}</span>
                  </DropdownMenuItem>
                ))}
              </DropdownMenuContent>
            </DropdownMenu>
          </div>

          {blocks.map((block, index) => (
            <BlockEditorItem
              key={block.id}
              block={block}
              index={index}
              total={blocks.length}
              onUpdate={updateBlock}
              onRemove={removeBlock}
              onMove={moveBlock}
              onAddAfter={(type) => addBlock(type, index)}
            />
          ))}
        </div>

        {/* Change summary */}
        {!isNew && (
          <div className="space-y-1.5">
            <Label>Resumo da alteração (opcional)</Label>
            <Input value={changeSummary} onChange={e => setChangeSummary(e.target.value)} placeholder="Ex: Corrigido link do vídeo" />
          </div>
        )}
      </div>

      {/* Sidebar: Versions */}
      <div className="w-72 border-l bg-muted/30 overflow-y-auto p-4 space-y-4 hidden lg:block">
        <div className="flex items-center gap-2">
          <History className="h-4 w-4" />
          <h3 className="text-sm font-medium">{t("help.versionHistory")}</h3>
        </div>
        {versions.length === 0 ? (
          <p className="text-xs text-muted-foreground">Nenhuma versão salva ainda.</p>
        ) : (
          <div className="space-y-2">
            {versions.map(v => (
              <Card key={v.id} className="p-3">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-medium">v{v.version_number}</span>
                  <Button variant="ghost" size="sm" className="h-6 px-2 text-xs" onClick={() => handleRestoreVersion(v.id)}>
                    <RotateCcw className="h-3 w-3 mr-1" />Restaurar
                  </Button>
                </div>
                <p className="text-[10px] text-muted-foreground mt-1">{format(new Date(v.created_at), "dd/MM/yy HH:mm")}</p>
                {v.change_summary && <p className="text-[10px] text-muted-foreground truncate">{v.change_summary}</p>}
              </Card>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

/* ─── Block Editor Item ─────────────────────────────────────────────── */

interface BlockEditorItemProps {
  block: EditorBlock;
  index: number;
  total: number;
  onUpdate: (id: string, data: any) => void;
  onRemove: (id: string) => void;
  onMove: (index: number, direction: -1 | 1) => void;
  onAddAfter: (type: BlockType) => void;
}

function BlockEditorItem({ block, index, total, onUpdate, onRemove, onMove, onAddAfter }: BlockEditorItemProps) {
  const renderEditor = () => {
    switch (block.type) {
      case "heading": {
        const d = block.data as HeadingData;
        return (
          <div className="flex items-center gap-2">
            <Select value={String(d.level)} onValueChange={v => onUpdate(block.id, { ...d, level: Number(v) })}>
              <SelectTrigger className="w-20"><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="2">H2</SelectItem>
                <SelectItem value="3">H3</SelectItem>
              </SelectContent>
            </Select>
            <Input value={d.text} onChange={e => onUpdate(block.id, { ...d, text: e.target.value })} placeholder="Título..." className="font-semibold" />
          </div>
        );
      }
      case "paragraph": {
        const d = block.data as ParagraphData;
        return <Textarea value={d.html.replace(/<\/?p>/g, "")} onChange={e => onUpdate(block.id, { html: `<p>${e.target.value}</p>` })} rows={3} placeholder="Texto do parágrafo..." />;
      }
      case "list": {
        const d = block.data as ListData;
        return (
          <div className="space-y-2">
            <div className="flex items-center gap-2">
              <Label className="text-xs">Tipo:</Label>
              <Select value={d.ordered ? "ol" : "ul"} onValueChange={v => onUpdate(block.id, { ...d, ordered: v === "ol" })}>
                <SelectTrigger className="w-32"><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="ul">Não ordenada</SelectItem>
                  <SelectItem value="ol">Ordenada</SelectItem>
                </SelectContent>
              </Select>
            </div>
            {d.items.map((item, i) => (
              <div key={i} className="flex items-center gap-2">
                <span className="text-xs text-muted-foreground w-5">{d.ordered ? `${i+1}.` : "•"}</span>
                <Input value={item} onChange={e => { const items = [...d.items]; items[i] = e.target.value; onUpdate(block.id, { ...d, items }); }} className="flex-1" />
                <Button variant="ghost" size="icon" className="h-7 w-7" onClick={() => { const items = d.items.filter((_, j) => j !== i); onUpdate(block.id, { ...d, items: items.length ? items : [""] }); }}>
                  <Trash2 className="h-3 w-3" />
                </Button>
              </div>
            ))}
            <Button variant="ghost" size="sm" onClick={() => onUpdate(block.id, { ...d, items: [...d.items, ""] })}><Plus className="h-3 w-3 mr-1" />Item</Button>
          </div>
        );
      }
      case "image": {
        const d = block.data as ImageData;
        return (
          <div className="space-y-2">
            <Input value={d.src} onChange={e => onUpdate(block.id, { ...d, src: e.target.value })} placeholder="URL da imagem" />
            <div className="grid grid-cols-2 gap-2">
              <Input value={d.alt || ""} onChange={e => onUpdate(block.id, { ...d, alt: e.target.value })} placeholder="Alt text" />
              <Input value={d.caption || ""} onChange={e => onUpdate(block.id, { ...d, caption: e.target.value })} placeholder="Legenda" />
            </div>
            <Input value={d.link || ""} onChange={e => onUpdate(block.id, { ...d, link: e.target.value })} placeholder="Link ao clicar (opcional)" />
            {d.src && <img src={d.src} alt={d.alt || ""} className="max-h-40 rounded border object-contain" />}
          </div>
        );
      }
      case "button": {
        const d = block.data as ButtonData;
        return (
          <div className="grid grid-cols-3 gap-2">
            <Input value={d.text} onChange={e => onUpdate(block.id, { ...d, text: e.target.value })} placeholder="Texto do botão" />
            <Input value={d.url} onChange={e => onUpdate(block.id, { ...d, url: e.target.value })} placeholder="URL" />
            <Select value={d.variant || "primary"} onValueChange={v => onUpdate(block.id, { ...d, variant: v })}>
              <SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="primary">Primário</SelectItem>
                <SelectItem value="secondary">Secundário</SelectItem>
                <SelectItem value="outline">Outline</SelectItem>
              </SelectContent>
            </Select>
          </div>
        );
      }
      case "callout": {
        const d = block.data as CalloutData;
        return (
          <div className="space-y-2">
            <Select value={d.type} onValueChange={v => onUpdate(block.id, { ...d, type: v })}>
              <SelectTrigger className="w-32"><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="info">Info</SelectItem>
                <SelectItem value="warn">Aviso</SelectItem>
                <SelectItem value="success">Sucesso</SelectItem>
                <SelectItem value="error">Erro</SelectItem>
              </SelectContent>
            </Select>
            <Textarea value={d.text} onChange={e => onUpdate(block.id, { ...d, text: e.target.value })} rows={2} placeholder="Texto do aviso..." />
          </div>
        );
      }
      case "divider":
        return <hr className="my-2" />;
      case "steps": {
        const d = block.data as StepsData;
        return (
          <div className="space-y-3">
            {d.steps.map((step, i) => (
              <div key={i} className="flex items-start gap-2 border rounded p-2">
                <span className="text-xs font-bold text-primary mt-2">{i+1}</span>
                <div className="flex-1 space-y-1">
                  <Input value={step.title} onChange={e => { const steps = [...d.steps]; steps[i] = { ...steps[i], title: e.target.value }; onUpdate(block.id, { steps }); }} placeholder="Título do passo" className="text-sm font-medium" />
                  <Textarea value={step.description} onChange={e => { const steps = [...d.steps]; steps[i] = { ...steps[i], description: e.target.value }; onUpdate(block.id, { steps }); }} rows={2} placeholder="Descrição" className="text-sm" />
                </div>
                <Button variant="ghost" size="icon" className="h-7 w-7" onClick={() => { const steps = d.steps.filter((_, j) => j !== i); onUpdate(block.id, { steps: steps.length ? steps : [{ title: "", description: "" }] }); }}>
                  <Trash2 className="h-3 w-3" />
                </Button>
              </div>
            ))}
            <Button variant="ghost" size="sm" onClick={() => onUpdate(block.id, { steps: [...d.steps, { title: "", description: "" }] })}><Plus className="h-3 w-3 mr-1" />Passo</Button>
          </div>
        );
      }
      case "table": {
        const d = block.data as TableData;
        return (
          <div className="space-y-2 overflow-x-auto">
            <table className="w-full text-sm border">
              <thead>
                <tr>{d.headers.map((h, i) => (
                  <th key={i} className="border p-1"><Input value={h} onChange={e => { const headers = [...d.headers]; headers[i] = e.target.value; onUpdate(block.id, { ...d, headers }); }} className="h-7 text-xs font-medium" /></th>
                ))}</tr>
              </thead>
              <tbody>
                {d.rows.map((row, ri) => (
                  <tr key={ri}>{row.map((cell, ci) => (
                    <td key={ci} className="border p-1"><Input value={cell} onChange={e => { const rows = d.rows.map(r => [...r]); rows[ri][ci] = e.target.value; onUpdate(block.id, { ...d, rows }); }} className="h-7 text-xs" /></td>
                  ))}</tr>
                ))}
              </tbody>
            </table>
            <div className="flex gap-2">
              <Button variant="ghost" size="sm" onClick={() => onUpdate(block.id, { ...d, headers: [...d.headers, ""], rows: d.rows.map(r => [...r, ""]) })}><Plus className="h-3 w-3 mr-1" />Coluna</Button>
              <Button variant="ghost" size="sm" onClick={() => onUpdate(block.id, { ...d, rows: [...d.rows, d.headers.map(() => "")] })}><Plus className="h-3 w-3 mr-1" />Linha</Button>
            </div>
          </div>
        );
      }
      case "icon_text": {
        const d = block.data as IconTextData;
        return (
          <div className="grid grid-cols-[60px_1fr] gap-2">
            <Input value={d.icon} onChange={e => onUpdate(block.id, { ...d, icon: e.target.value })} className="text-center text-lg" />
            <div className="space-y-1">
              <Input value={d.title} onChange={e => onUpdate(block.id, { ...d, title: e.target.value })} placeholder="Título" className="font-medium text-sm" />
              <Textarea value={d.description} onChange={e => onUpdate(block.id, { ...d, description: e.target.value })} rows={2} placeholder="Descrição" className="text-sm" />
            </div>
          </div>
        );
      }
      default:
        return <p className="text-xs text-muted-foreground">Bloco desconhecido: {block.type}</p>;
    }
  };

  const blockLabel = BLOCK_TYPES.find(bt => bt.type === block.type)?.label || block.type;

  return (
    <Card className="relative group">
      <CardContent className="py-3 px-4">
        <div className="flex items-start gap-2">
          {/* Reorder controls */}
          <div className="flex flex-col gap-0.5 pt-1 opacity-0 group-hover:opacity-100 transition-opacity">
            <button onClick={() => onMove(index, -1)} disabled={index === 0} className="text-muted-foreground hover:text-foreground disabled:opacity-20"><ChevronUp className="h-3.5 w-3.5" /></button>
            <button onClick={() => onMove(index, 1)} disabled={index === total - 1} className="text-muted-foreground hover:text-foreground disabled:opacity-20"><ChevronDown className="h-3.5 w-3.5" /></button>
          </div>

          <div className="flex-1 min-w-0">
            <div className="flex items-center justify-between mb-2">
              <Badge variant="outline" className="text-[10px] font-normal">{blockLabel}</Badge>
              <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                <DropdownMenu>
                  <DropdownMenuTrigger asChild>
                    <Button variant="ghost" size="icon" className="h-6 w-6"><Plus className="h-3 w-3" /></Button>
                  </DropdownMenuTrigger>
                  <DropdownMenuContent>
                    {BLOCK_TYPES.map(bt => (
                      <DropdownMenuItem key={bt.type} onClick={() => onAddAfter(bt.type)}>
                        {bt.icon}<span className="ml-2 text-xs">{bt.label}</span>
                      </DropdownMenuItem>
                    ))}
                  </DropdownMenuContent>
                </DropdownMenu>
                <Button variant="ghost" size="icon" className="h-6 w-6 text-destructive" onClick={() => onRemove(block.id)}><Trash2 className="h-3 w-3" /></Button>
              </div>
            </div>
            {renderEditor()}
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
