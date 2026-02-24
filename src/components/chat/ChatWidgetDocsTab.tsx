import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { BookOpen, Copy, Check, Code, FileJson, AlertCircle } from "lucide-react";

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
  { key: "company_id", type: "string", desc: "ID externo da empresa (para vincular ao cadastro)", required: false },
  { key: "company_name", type: "string", desc: "Nome da empresa (cria empresa se não existir)", required: false },
  { key: "mrr", type: "number", desc: "MRR — atualiza coluna direta na empresa", required: false },
  { key: "contract_value", type: "number", desc: "Valor do contrato — atualiza coluna direta", required: false },
  { key: "company_sector", type: "string", desc: "Setor — atualiza coluna direta", required: false },
  { key: "company_document", type: "string", desc: "CNPJ — atualiza coluna direta", required: false },
];

export default function ChatWidgetDocsTab() {
  const [fields, setFields] = useState<FieldDef[]>([]);
  const [loading, setLoading] = useState(true);
  const [copiedItems, setCopiedItems] = useState<Record<string, boolean>>({});

  useEffect(() => {
    const fetch = async () => {
      const { data } = await supabase
        .from("chat_custom_field_definitions" as any)
        .select("*")
        .order("display_order", { ascending: true });
      setFields((data as any as FieldDef[]) ?? []);
      setLoading(false);
    };
    fetch();
  }, []);

  const copyToClipboard = (text: string, id: string) => {
    navigator.clipboard.writeText(text);
    setCopiedItems((prev) => ({ ...prev, [id]: true }));
    setTimeout(() => setCopiedItems((prev) => ({ ...prev, [id]: false })), 2000);
  };

  const CopyButton = ({ text, id }: { text: string; id: string }) => (
    <Button variant="ghost" size="sm" onClick={() => copyToClipboard(text, id)} className="h-7 px-2">
      {copiedItems[id] ? <Check className="h-3.5 w-3.5 text-green-500" /> : <Copy className="h-3.5 w-3.5" />}
    </Button>
  );

  const buildPayloadJson = () => {
    const lines: string[] = ["{"];
    lines.push('  // Identificação (pula formulário se name + email presentes)');
    lines.push('  "name": "Nome do usuário",');
    lines.push('  "email": "email@empresa.com",');
    lines.push('  "phone": "(11) 99999-9999",');
    lines.push("");
    lines.push("  // Empresa");
    lines.push('  "company_id": "ID_DA_EMPRESA",');
    lines.push('  "company_name": "Nome da Empresa"');

    if (fields.length > 0) {
      // Remove trailing comma issue: add comma to company_name
      lines[lines.length - 1] = '  "company_name": "Nome da Empresa",';
      lines.push("");
      lines.push("  // Campos customizados configurados");
      fields.forEach((f, i) => {
        const val = EXAMPLE_VALUES[f.field_type] ?? '"Exemplo"';
        const comma = i < fields.length - 1 ? "," : "";
        const comment = `// ${f.label} (${f.field_type})`;
        lines.push(`  "${f.key}": ${val}${comma}  ${comment}`);
      });
    }

    lines.push("}");
    return lines.join("\n");
  };

  const buildSnippet = () => {
    const lines: string[] = [];
    lines.push("window.NPSChat.update({");
    lines.push("  // Identificação (pula formulário se name + email presentes)");
    lines.push('  name: "Nome do usuário",');
    lines.push('  email: "email@empresa.com",');
    lines.push('  phone: "(11) 99999-9999",');
    lines.push("");
    lines.push("  // Empresa");
    lines.push('  company_id: "ID_DA_EMPRESA",');

    if (fields.length > 0) {
      lines.push('  company_name: "Nome da Empresa",');
      lines.push("");
      lines.push("  // Campos customizados configurados");
      fields.forEach((f, i) => {
        const val = EXAMPLE_VALUES[f.field_type] ?? '"Exemplo"';
        const comma = i < fields.length - 1 ? "," : "";
        const comment = `// ${f.label} (${f.field_type})`;
        lines.push(`  ${f.key}: ${val}${comma}  ${comment}`);
      });
    } else {
      lines.push('  company_name: "Nome da Empresa"');
    }

    lines.push("});");
    return lines.join("\n");
  };

  if (loading) return null;

  const payloadJson = buildPayloadJson();
  const snippet = buildSnippet();

  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-base flex items-center gap-2">
          <BookOpen className="h-4 w-4" />
          Documentação para Desenvolvedores
        </CardTitle>
        <CardDescription>
          Referência completa da API <code className="text-xs bg-muted px-1 rounded">window.NPSChat.update()</code> para integração do widget de chat.
          Compartilhe esta seção com o time de desenvolvimento do seu cliente.
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-6">

        {/* 1. API Reference */}
        <div>
          <h4 className="text-sm font-semibold mb-2 flex items-center gap-2">
            <Code className="h-4 w-4" />
            Método de Integração
          </h4>
          <div className="p-3 bg-muted rounded-lg text-sm">
            <p className="text-muted-foreground">
              Use <code className="bg-background px-1 rounded font-mono text-xs">window.NPSChat.update(payload)</code> para enviar dados do usuário logado na sua plataforma.
              Se <code className="bg-background px-1 rounded font-mono text-xs">name</code> e <code className="bg-background px-1 rounded font-mono text-xs">email</code> forem enviados, o formulário de identificação é pulado automaticamente (auto-start).
            </p>
          </div>
        </div>

        {/* 2. Reserved Fields Table */}
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
                  <TableCell>
                    <Badge variant="outline" className="text-xs">{f.type}</Badge>
                  </TableCell>
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

        {/* 3. Custom Fields Table */}
        <div>
          <h4 className="text-sm font-semibold mb-2">Campos Customizados Configurados</h4>
          {fields.length === 0 ? (
            <div className="flex items-start gap-2 p-3 bg-muted rounded-lg text-sm text-muted-foreground">
              <AlertCircle className="h-4 w-4 mt-0.5 shrink-0" />
              <span>
                Nenhum campo customizado configurado. Use a seção <strong>"Campos Customizados do Chat"</strong> acima para definir campos adicionais.
                Após configurar, os snippets abaixo serão atualizados automaticamente.
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
                    <TableCell>
                      <Badge variant="outline" className="text-xs">{TYPE_LABELS[f.field_type] ?? f.field_type}</Badge>
                    </TableCell>
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

        {/* 4. Example Payload */}
        <div>
          <div className="flex items-center justify-between mb-2">
            <h4 className="text-sm font-semibold flex items-center gap-2">
              <FileJson className="h-4 w-4" />
              Payload de Exemplo
            </h4>
            <CopyButton text={payloadJson} id="payload" />
          </div>
          <pre className="bg-muted p-4 rounded-lg text-xs overflow-x-auto max-h-80 font-mono">
            <code>{payloadJson}</code>
          </pre>
        </div>

        {/* 5. Full Snippet */}
        <div>
          <div className="flex items-center justify-between mb-2">
            <h4 className="text-sm font-semibold flex items-center gap-2">
              <Code className="h-4 w-4" />
              Snippet JavaScript Completo
            </h4>
            <CopyButton text={snippet} id="snippet" />
          </div>
          <pre className="bg-muted p-4 rounded-lg text-xs overflow-x-auto max-h-80 font-mono">
            <code>{snippet}</code>
          </pre>
        </div>

      </CardContent>
    </Card>
  );
}
