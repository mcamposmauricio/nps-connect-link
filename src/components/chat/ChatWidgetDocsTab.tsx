import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible";
import { Copy, Check, Code, FileJson, AlertCircle, ChevronDown, Sparkles, Terminal, BookOpen } from "lucide-react";

interface ChatWidgetDocsTabProps {
  widgetPosition: string;
  widgetPrimaryColor: string;
  widgetCompanyName: string;
  widgetButtonShape: string;
}

interface FieldDef {
  id: string;
  key: string;
  label: string;
  field_type: string;
  target: string;
  maps_to: string | null;
  display_order: number;
}

const EXAMPLE_VALUES: Record<string, any> = {
  text: '"Exemplo"',
  decimal: "1500.00",
  integer: "10",
  url: '"https://exemplo.com"',
  boolean: "true",
  date: '"2026-01-15"',
};

const TYPE_LABELS: Record<string, string> = {
  text: "string",
  decimal: "number",
  integer: "number",
  url: "string",
  boolean: "boolean",
  date: "string (ISO)",
};

const RESERVED_FIELDS = [
  { key: "name", type: "string", desc: "Nome do visitante (obrigatório para auto-start)", required: true },
  { key: "email", type: "string", desc: "Email do visitante (obrigatório para auto-start)", required: true },
  { key: "phone", type: "string", desc: "Telefone do visitante", required: false },
  { key: "company_id", type: "string", desc: "ID externo da empresa — vincula diretamente ao cadastro da empresa por external_id", required: false },
  { key: "company_name", type: "string", desc: "Nome da empresa (cria empresa se não existir)", required: false },
  { key: "mrr", type: "number", desc: "MRR — atualiza coluna direta na empresa", required: false },
  { key: "contract_value", type: "number", desc: "Valor do contrato — atualiza coluna direta", required: false },
  { key: "company_sector", type: "string", desc: "Setor — atualiza coluna direta", required: false },
  { key: "company_document", type: "string", desc: "CNPJ — atualiza coluna direta", required: false },
];

export default function ChatWidgetDocsTab({ widgetPosition, widgetPrimaryColor, widgetCompanyName, widgetButtonShape }: ChatWidgetDocsTabProps) {
  const [fields, setFields] = useState<FieldDef[]>([]);
  const [loading, setLoading] = useState(true);
  const [copiedItems, setCopiedItems] = useState<Record<string, boolean>>({});
  const [refOpen, setRefOpen] = useState(false);

  useEffect(() => {
    const fetchFields = async () => {
      const { data } = await supabase
        .from("chat_custom_field_definitions" as any)
        .select("*")
        .order("display_order", { ascending: true });
      setFields((data as any as FieldDef[]) ?? []);
      setLoading(false);
    };
    fetchFields();
  }, []);

  const copyToClipboard = (text: string, id: string) => {
    navigator.clipboard.writeText(text);
    setCopiedItems((prev) => ({ ...prev, [id]: true }));
    setTimeout(() => setCopiedItems((prev) => ({ ...prev, [id]: false })), 2000);
  };

  const CopyBtn = ({ text, id, label }: { text: string; id: string; label?: string }) => (
    <Button
      variant="outline"
      size="sm"
      onClick={() => copyToClipboard(text, id)}
      className="h-8 gap-1.5 text-xs shrink-0"
    >
      {copiedItems[id] ? <Check className="h-3.5 w-3.5 text-emerald-500" /> : <Copy className="h-3.5 w-3.5" />}
      {label ?? (copiedItems[id] ? "Copiado!" : "Copiar")}
    </Button>
  );

  // ─── Build embed script ───
  const companyName = widgetCompanyName || "Suporte";
  const embedAnon = `<script src="${window.location.origin}/nps-chat-embed.js"
  data-position="${widgetPosition}"
  data-primary-color="${widgetPrimaryColor}"
  data-company-name="${companyName}"
  data-button-shape="${widgetButtonShape}">
</script>`;

  const embedIdentified = `<script src="${window.location.origin}/nps-chat-embed.js"
  data-api-key="SUA_CHAT_API_KEY"
  data-external-id="ID_DO_USUARIO_NO_SEU_SISTEMA"
  data-position="${widgetPosition}"
  data-primary-color="${widgetPrimaryColor}"
  data-company-name="${companyName}"
  data-button-shape="${widgetButtonShape}">
</script>`;

  // ─── Build update snippet ───
  const buildUpdateSnippet = () => {
    const lines: string[] = [];
    lines.push("window.NPSChat.update({");
    lines.push('  name: usuario.nome,');
    lines.push('  email: usuario.email,');
    lines.push('  phone: usuario.telefone,');
    lines.push("");
    lines.push("  // Empresa");
    lines.push('  company_id: usuario.empresa_id,');
    lines.push('  company_name: usuario.empresa_nome,');

    if (fields.length > 0) {
      lines.push("");
      lines.push("  // Campos customizados");
      fields.forEach((f, i) => {
        const val = f.field_type === "text" || f.field_type === "url" || f.field_type === "date"
          ? `usuario.${f.key}`
          : `usuario.${f.key}`;
        const comma = i < fields.length - 1 ? "," : "";
        lines.push(`  ${f.key}: ${val}${comma}  // ${f.label} (${TYPE_LABELS[f.field_type] ?? f.field_type})`);
      });
    }

    lines.push("});");
    return lines.join("\n");
  };

  // ─── Build vibecoding prompt ───
  const buildVibecodingPrompt = () => {
    const lines: string[] = [];
    lines.push("Preciso integrar um widget de chat ao vivo na minha aplicação web.");
    lines.push("");
    lines.push("## 1. Script de Embed");
    lines.push("Adicione o seguinte script antes do </body> em todas as páginas que devem ter o chat:");
    lines.push("");
    lines.push("```html");
    lines.push(embedAnon);
    lines.push("```");
    lines.push("");
    lines.push("Se o usuário já estiver autenticado, use a versão com API key:");
    lines.push("");
    lines.push("```html");
    lines.push(embedIdentified);
    lines.push("```");
    lines.push("");
    lines.push("## 2. Identificação do Usuário Logado");
    lines.push("Quando o usuário fizer login na plataforma, chame o método abaixo para pular o formulário de identificação do chat (auto-start):");
    lines.push("");
    lines.push("```javascript");
    lines.push(buildUpdateSnippet());
    lines.push("```");
    lines.push("");
    lines.push("## 3. Campos Aceitos no Payload");
    lines.push("");
    lines.push("### Campos de Identificação (obrigatórios para auto-start)");
    lines.push("| Campo | Tipo | Descrição |");
    lines.push("|-------|------|-----------|");
    lines.push("| name | string | Nome do visitante |");
    lines.push("| email | string | Email do visitante |");
    lines.push("");
    lines.push("### Campos Opcionais");
    lines.push("| Campo | Tipo | Descrição |");
    lines.push("|-------|------|-----------|");
    RESERVED_FIELDS.filter(f => !f.required).forEach(f => {
      lines.push(`| ${f.key} | ${f.type} | ${f.desc} |`);
    });

    if (fields.length > 0) {
      lines.push("");
      lines.push("### Campos Customizados (específicos desta integração)");
      lines.push("| Campo | Tipo | Descrição | Destino |");
      lines.push("|-------|------|-----------|---------|");
      fields.forEach(f => {
        const dest = f.target === "company" ? "Empresa" : "Contato";
        lines.push(`| ${f.key} | ${TYPE_LABELS[f.field_type] ?? f.field_type} | ${f.label} | ${dest} |`);
      });
    }

    lines.push("");
    lines.push("## 4. Comportamento Esperado");
    lines.push("- Se `name` + `email` forem enviados via `update()`, o formulário de identificação é pulado automaticamente");
    lines.push("- Campos de empresa (`company_id`, `company_name`, `mrr`, etc.) atualizam automaticamente o cadastro da empresa no CRM");
    lines.push("- O widget funciona mesmo sem chamar `update()` (modo visitante anônimo)");
    lines.push("- O método `update()` pode ser chamado a qualquer momento — os dados são sincronizados em tempo real");

    return lines.join("\n");
  };

  // ─── Build payload JSON ───
  const buildPayloadJson = () => {
    const lines: string[] = ["{"];
    lines.push('  "name": "João Silva",');
    lines.push('  "email": "joao@empresa.com",');
    lines.push('  "phone": "(11) 99999-9999",');
    lines.push("");
    lines.push('  "company_id": "emp_123",');
    lines.push('  "company_name": "Empresa Exemplo",');
    lines.push('  "mrr": 5000.00,');
    lines.push('  "contract_value": 60000.00,');
    lines.push('  "company_sector": "Tecnologia",');

    if (fields.length > 0) {
      lines.push('  "company_document": "12.345.678/0001-90",');
      lines.push("");
      fields.forEach((f, i) => {
        const val = EXAMPLE_VALUES[f.field_type] ?? '"Exemplo"';
        const comma = i < fields.length - 1 ? "," : "";
        lines.push(`  "${f.key}": ${val}${comma}`);
      });
    } else {
      lines.push('  "company_document": "12.345.678/0001-90"');
    }

    lines.push("}");
    return lines.join("\n");
  };

  // ─── Copy all ───
  const buildFullDoc = () => {
    const parts: string[] = [];
    parts.push("# Documentação de Integração — Widget de Chat\n");
    parts.push("## 1. Instalação do Widget\n");
    parts.push("Cole este script antes do </body> no HTML do seu site:\n");
    parts.push("### Visitante anônimo:\n```html\n" + embedAnon + "\n```\n");
    parts.push("### Usuário identificado:\n```html\n" + embedIdentified + "\n```\n");
    parts.push("## 2. Identificação do Usuário\n");
    parts.push("Quando o usuário logar, chame:\n```javascript\n" + buildUpdateSnippet() + "\n```\n");
    parts.push("## 3. Referência de Campos\n");
    parts.push("### Campos Reservados\n");
    RESERVED_FIELDS.forEach(f => {
      parts.push(`- \`${f.key}\` (${f.type}) — ${f.desc}${f.required ? " ⚠️ obrigatório" : ""}`);
    });
    if (fields.length > 0) {
      parts.push("\n### Campos Customizados\n");
      fields.forEach(f => {
        parts.push(`- \`${f.key}\` (${TYPE_LABELS[f.field_type] ?? f.field_type}) — ${f.label} → ${f.target === "company" ? "Empresa" : "Contato"}`);
      });
    }
    parts.push("\n## 4. Payload de Exemplo\n```json\n" + buildPayloadJson() + "\n```");
    return parts.join("\n");
  };

  if (loading) return null;

  const updateSnippet = buildUpdateSnippet();
  const vibePrompt = buildVibecodingPrompt();
  const payloadJson = buildPayloadJson();

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center justify-between">
          <div>
            <CardTitle className="text-base flex items-center gap-2">
              <BookOpen className="h-4 w-4" />
              Documentação e Integração
            </CardTitle>
            <CardDescription className="mt-1">
              Guia completo para instalar e integrar o widget. Copie e envie ao desenvolvedor do seu cliente.
            </CardDescription>
          </div>
          <CopyBtn text={buildFullDoc()} id="copy-all" label={copiedItems["copy-all"] ? "Copiado!" : "Copiar tudo"} />
        </div>
      </CardHeader>
      <CardContent className="space-y-5">

        {/* ─── Step 1: Install ─── */}
        <div className="relative rounded-lg border border-primary/20 bg-primary/[0.03]">
          <div className="flex items-start gap-3 p-4">
            <div className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-primary text-primary-foreground text-xs font-bold">1</div>
            <div className="flex-1 min-w-0">
              <div className="flex items-center justify-between mb-1">
                <h4 className="text-sm font-semibold flex items-center gap-2">
                  <Terminal className="h-4 w-4" />
                  Instale o Widget
                </h4>
                <CopyBtn text={embedAnon + "\n\n" + embedIdentified} id="step1" />
              </div>
              <p className="text-xs text-muted-foreground mb-3">
                Cole um dos scripts abaixo antes do <code className="bg-muted px-1 rounded">&lt;/body&gt;</code> no HTML do seu site.
              </p>
              <div className="space-y-2">
                <div>
                  <span className="text-[11px] font-medium text-muted-foreground uppercase tracking-wider">Visitante anônimo</span>
                  <pre className="bg-muted/80 p-3 rounded-md text-xs overflow-x-auto mt-1 font-mono"><code>{embedAnon}</code></pre>
                </div>
                <div>
                  <span className="text-[11px] font-medium text-muted-foreground uppercase tracking-wider">Usuário identificado (via API Key)</span>
                  <pre className="bg-muted/80 p-3 rounded-md text-xs overflow-x-auto mt-1 font-mono"><code>{embedIdentified}</code></pre>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* ─── Step 2: Identify ─── */}
        <div className="relative rounded-lg border border-accent/20 bg-accent/[0.03]">
          <div className="flex items-start gap-3 p-4">
            <div className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-accent text-accent-foreground text-xs font-bold">2</div>
            <div className="flex-1 min-w-0">
              <div className="flex items-center justify-between mb-1">
                <h4 className="text-sm font-semibold flex items-center gap-2">
                  <Code className="h-4 w-4" />
                  Identifique o Usuário
                  <Badge variant="secondary" className="text-[10px]">Opcional</Badge>
                </h4>
                <CopyBtn text={updateSnippet} id="step2" />
              </div>
              <p className="text-xs text-muted-foreground mb-3">
                Quando o usuário logar na sua plataforma, envie os dados dele para pular o formulário de identificação.
                Se <code className="bg-muted px-1 rounded">name</code> e <code className="bg-muted px-1 rounded">email</code> estiverem presentes, o chat inicia automaticamente.
              </p>
              <pre className="bg-muted/80 p-3 rounded-md text-xs overflow-x-auto font-mono"><code>{updateSnippet}</code></pre>
            </div>
          </div>
        </div>

        {/* ─── Step 3: Vibecoding ─── */}
        <div className="relative rounded-lg border border-amber-500/30 bg-amber-500/[0.04]">
          <div className="flex items-start gap-3 p-4">
            <div className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-amber-500 text-primary-foreground text-xs font-bold">3</div>
            <div className="flex-1 min-w-0">
              <div className="flex items-center justify-between mb-1">
                <h4 className="text-sm font-semibold flex items-center gap-2">
                  <Sparkles className="h-4 w-4" />
                  Prompt para Vibecoding (IA)
                  <Badge variant="outline" className="text-[10px] border-amber-500/40 text-amber-600">Novo</Badge>
                </h4>
                <CopyBtn text={vibePrompt} id="step3" />
              </div>
              <p className="text-xs text-muted-foreground mb-3">
                Copie o prompt abaixo e cole na sua ferramenta de IA (Cursor, Lovable, Windsurf, etc.) para que ela implemente a integração automaticamente.
              </p>
              <pre className="bg-muted/80 p-3 rounded-md text-xs overflow-x-auto max-h-64 font-mono"><code>{vibePrompt}</code></pre>
            </div>
          </div>
        </div>

        {/* ─── Collapsible: Full Reference ─── */}
        <Collapsible open={refOpen} onOpenChange={setRefOpen}>
          <CollapsibleTrigger asChild>
            <Button variant="ghost" className="w-full justify-between h-10 text-sm text-muted-foreground hover:text-foreground">
              <span className="flex items-center gap-2">
                <FileJson className="h-4 w-4" />
                Referência completa da API
              </span>
              <ChevronDown className={`h-4 w-4 transition-transform ${refOpen ? "rotate-180" : ""}`} />
            </Button>
          </CollapsibleTrigger>
          <CollapsibleContent className="space-y-5 pt-3">

            {/* Reserved Fields */}
            <div>
              <h4 className="text-sm font-semibold mb-2">Campos Reservados (sempre disponíveis)</h4>
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Key</TableHead>
                    <TableHead>Tipo</TableHead>
                    <TableHead>Obrigatório</TableHead>
                    <TableHead>Descrição</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {RESERVED_FIELDS.map((f) => (
                    <TableRow key={f.key}>
                      <TableCell className="font-mono text-xs">{f.key}</TableCell>
                      <TableCell><Badge variant="outline" className="text-xs">{f.type}</Badge></TableCell>
                      <TableCell>
                        <Badge variant={f.required ? "destructive" : "secondary"} className="text-xs">
                          {f.required ? "Auto-start" : "Opcional"}
                        </Badge>
                      </TableCell>
                      <TableCell className="text-sm text-muted-foreground">{f.desc}</TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>

            {/* Custom Fields */}
            <div>
              <h4 className="text-sm font-semibold mb-2">Campos Customizados Configurados</h4>
              {fields.length === 0 ? (
                <div className="flex items-start gap-2 p-3 bg-muted rounded-lg text-sm text-muted-foreground">
                  <AlertCircle className="h-4 w-4 mt-0.5 shrink-0" />
                  <span>
                    Nenhum campo customizado configurado. Use a seção <strong>"Campos Customizados do Chat"</strong> acima para definir campos adicionais.
                  </span>
                </div>
              ) : (
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Key</TableHead>
                      <TableHead>Label</TableHead>
                      <TableHead>Tipo</TableHead>
                      <TableHead>Destino</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {fields.map((f) => (
                      <TableRow key={f.id}>
                        <TableCell className="font-mono text-xs">{f.key}</TableCell>
                        <TableCell className="text-sm">{f.label}</TableCell>
                        <TableCell><Badge variant="outline" className="text-xs">{TYPE_LABELS[f.field_type] ?? f.field_type}</Badge></TableCell>
                        <TableCell>
                          <Badge variant={f.target === "company" ? "default" : "secondary"} className="text-xs">
                            {f.target === "company" ? "Empresa" : "Contato"}
                          </Badge>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              )}
            </div>

            {/* Payload Example */}
            <div>
              <div className="flex items-center justify-between mb-2">
                <h4 className="text-sm font-semibold flex items-center gap-2">
                  <FileJson className="h-4 w-4" />
                  Payload de Exemplo
                </h4>
                <CopyBtn text={payloadJson} id="payload" />
              </div>
              <pre className="bg-muted p-4 rounded-lg text-xs overflow-x-auto max-h-80 font-mono"><code>{payloadJson}</code></pre>
            </div>

          </CollapsibleContent>
        </Collapsible>

      </CardContent>
    </Card>
  );
}
