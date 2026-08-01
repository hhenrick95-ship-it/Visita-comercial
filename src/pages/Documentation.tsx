import { useState, useEffect } from "react";
import { useAuth } from "@/contexts/AuthContext";
import { supabase } from "@/integrations/supabase/client";
import { Layout } from "@/components/Layout";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { toast } from "sonner";
import { Save, Download, FileText, Eye, Edit3, Loader2, BookOpen } from "lucide-react";
import ReactMarkdown from "react-markdown";
import { generateDocumentationPDF } from "@/lib/generateDocumentationPDF";
import { PageHeader } from "@/components/PageHeader";

interface DocumentSection {
  id: string;
  section_key: string;
  title: string;
  content: string;
  display_order: number;
  updated_at: string;
}

const Documentation = () => {
  const { role, user } = useAuth();
  const [sections, setSections] = useState<DocumentSection[]>([]);
  const [activeSection, setActiveSection] = useState<string>("");
  const [editContent, setEditContent] = useState<string>("");
  const [isEditing, setIsEditing] = useState(false);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [exportingPDF, setExportingPDF] = useState(false);

  const isAdmin = role === "admin";

  useEffect(() => {
    fetchSections();
  }, []);

  const fetchSections = async () => {
    try {
      const { data, error } = await supabase
        .from("system_documentation")
        .select("*")
        .order("display_order");

      if (error) throw error;

      setSections(data || []);
      if (data && data.length > 0) {
        setActiveSection(data[0].section_key);
        setEditContent(data[0].content);
      }
    } catch (error) {
      console.error("Error fetching documentation:", error);
      toast.error("Erro ao carregar documentação");
    } finally {
      setLoading(false);
    }
  };

  const handleSectionChange = (sectionKey: string) => {
    const section = sections.find((s) => s.section_key === sectionKey);
    if (section) {
      setActiveSection(sectionKey);
      setEditContent(section.content);
      setIsEditing(false);
    }
  };

  const handleSave = async () => {
    if (!isAdmin) return;

    setSaving(true);
    try {
      const { error } = await supabase
        .from("system_documentation")
        .update({
          content: editContent,
          updated_at: new Date().toISOString(),
          updated_by: user?.id,
        })
        .eq("section_key", activeSection);

      if (error) throw error;

      setSections((prev) =>
        prev.map((s) =>
          s.section_key === activeSection ? { ...s, content: editContent } : s
        )
      );
      setIsEditing(false);
      toast.success("Documentação salva com sucesso!");
    } catch (error) {
      console.error("Error saving documentation:", error);
      toast.error("Erro ao salvar documentação");
    } finally {
      setSaving(false);
    }
  };

  const exportToMarkdown = () => {
    // Header with metadata
    let allContent = `# Documentação do Sistema\n\n`;
    allContent += `**Sistema de Acompanhamento de Rotas Comerciais**\n\n`;
    allContent += `**LOPES DISTRIBUIDORA**\n\n`;
    allContent += `Data de Geração: ${new Date().toLocaleDateString("pt-BR", { day: "2-digit", month: "long", year: "numeric" })}\n\n`;
    allContent += `---\n\n`;
    
    // Status legend
    allContent += `## Legenda de Status\n\n`;
    allContent += `| Indicador | Descrição |\n`;
    allContent += `|-----------|----------|\n`;
    allContent += `| ✅ | Concluído - Funcionalidade implementada e testada |\n`;
    allContent += `| 🚧 | Em Desenvolvimento - Funcionalidade em construção |\n`;
    allContent += `| 📌 | Planejado - Funcionalidade planejada para próximas versões |\n`;
    allContent += `| 💡 | Ideia / Sugestão - Para avaliação futura |\n`;
    allContent += `| 🌙 | Futuro Distante - Funcionalidade para longo prazo |\n\n`;
    allContent += `---\n\n`;
    
    // Table of contents
    allContent += `## Índice\n\n`;
    sections.forEach((s, idx) => {
      allContent += `${idx + 1}. [${s.title}](#${s.section_key})\n`;
    });
    allContent += `\n---\n\n`;
    
    // Sections
    sections.forEach((s, idx) => {
      allContent += `# ${idx + 1}. ${s.title}\n\n`;
      allContent += `${s.content}\n\n`;
      allContent += `---\n\n`;
    });

    const blob = new Blob([allContent], { type: "text/markdown" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = "documentacao-sistema.md";
    a.click();
    URL.revokeObjectURL(url);
    toast.success("Documentação exportada em Markdown!");
  };

  const exportToPDF = async () => {
    setExportingPDF(true);
    try {
      await generateDocumentationPDF(sections);
      toast.success("Documentação exportada em PDF!");
    } catch (error) {
      console.error("Error exporting PDF:", error);
      toast.error("Erro ao exportar PDF");
    } finally {
      setExportingPDF(false);
    }
  };

  const currentSection = sections.find((s) => s.section_key === activeSection);

  if (loading) {
    return (
      <Layout>
        <div className="flex items-center justify-center h-[calc(100vh-4rem)]">
          <Loader2 className="h-8 w-8 animate-spin text-primary" />
        </div>
      </Layout>
    );
  }

  return (
    <Layout>
      <div className="container mx-auto px-4 py-6">
        <div className="mb-6">
          <PageHeader
            icon={BookOpen}
            title="Documentação do Sistema"
            description={isAdmin ? "Visualize e edite a documentação" : "Consulte a documentação do sistema"}
            actions={
              <>
                <Button variant="outline" size="sm" onClick={exportToMarkdown} className="glass-card border-0">
                  <FileText className="h-4 w-4 mr-2" />
                  Exportar MD
                </Button>
                <Button variant="outline" size="sm" onClick={exportToPDF} disabled={exportingPDF} className="glass-card border-0">
                  {exportingPDF ? (
                    <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                  ) : (
                    <Download className="h-4 w-4 mr-2" />
                  )}
                  {exportingPDF ? "Gerando..." : "Exportar PDF"}
                </Button>
              </>
            }
          />
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-4 gap-6">
          {/* Sidebar with sections */}
          <Card className="lg:col-span-1">
            <CardHeader className="pb-3">
              <CardTitle className="text-lg">Seções</CardTitle>
            </CardHeader>
            <CardContent className="p-0">
              <nav className="flex flex-col">
                {sections.map((section) => (
                  <button
                    key={section.section_key}
                    onClick={() => handleSectionChange(section.section_key)}
                    className={`text-left px-4 py-3 border-l-2 transition-colors ${
                      activeSection === section.section_key
                        ? "border-primary bg-primary/10 text-primary font-medium"
                        : "border-transparent hover:bg-muted text-muted-foreground hover:text-foreground"
                    }`}
                  >
                    {section.title}
                  </button>
                ))}
              </nav>
            </CardContent>
          </Card>

          {/* Content area */}
          <Card className="lg:col-span-3">
            <CardHeader className="flex flex-row items-center justify-between pb-3">
              <CardTitle className="text-xl">{currentSection?.title}</CardTitle>
              {isAdmin && (
                <div className="flex gap-2">
                  {isEditing ? (
                    <>
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => {
                          setEditContent(currentSection?.content || "");
                          setIsEditing(false);
                        }}
                      >
                        Cancelar
                      </Button>
                      <Button size="sm" onClick={handleSave} disabled={saving}>
                        {saving ? (
                          <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                        ) : (
                          <Save className="h-4 w-4 mr-2" />
                        )}
                        Salvar
                      </Button>
                    </>
                  ) : (
                    <Button variant="outline" size="sm" onClick={() => setIsEditing(true)}>
                      <Edit3 className="h-4 w-4 mr-2" />
                      Editar
                    </Button>
                  )}
                </div>
              )}
            </CardHeader>
            <CardContent>
              {isEditing ? (
                <Tabs defaultValue="edit" className="w-full">
                  <TabsList className="mb-4">
                    <TabsTrigger value="edit" className="flex items-center gap-2">
                      <Edit3 className="h-4 w-4" />
                      Editar
                    </TabsTrigger>
                    <TabsTrigger value="preview" className="flex items-center gap-2">
                      <Eye className="h-4 w-4" />
                      Preview
                    </TabsTrigger>
                  </TabsList>
                  <TabsContent value="edit">
                    <Textarea
                      value={editContent}
                      onChange={(e) => setEditContent(e.target.value)}
                      className="min-h-[500px] font-mono text-sm"
                      placeholder="Escreva o conteúdo em Markdown..."
                    />
                  </TabsContent>
                  <TabsContent value="preview">
                    <div className="prose prose-sm dark:prose-invert max-w-none min-h-[500px] p-4 border rounded-md bg-muted/30">
                      <ReactMarkdown>{editContent}</ReactMarkdown>
                    </div>
                  </TabsContent>
                </Tabs>
              ) : (
              <div className="prose prose-sm dark:prose-invert max-w-none">
                  <ReactMarkdown>{currentSection?.content || ""}</ReactMarkdown>
                </div>
              )}
            </CardContent>
          </Card>
        </div>
      </div>
    </Layout>
  );
};

export default Documentation;
