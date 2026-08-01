import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Layout } from "@/components/Layout";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { toast } from "sonner";
import { Check, X, UserCheck, UserX, Lock, Trash2, RefreshCw, Users } from "lucide-react";
import { useAuth } from "@/contexts/AuthContext";
import { ChangePasswordDialog } from "@/components/ChangePasswordDialog";
import { DeleteUserDialog } from "@/components/DeleteUserDialog";
import { PageHeader } from "@/components/PageHeader";

interface PendingUser {
  id: string;
  email: string;
  full_name: string | null;
  created_at: string;
}

interface ApprovedUser {
  id: string;
  email: string;
  full_name: string | null;
  role: string;
  assigned_at: string;
}

export default function UserManagement() {
  const { user: currentUser } = useAuth();
  const [pendingUsers, setPendingUsers] = useState<PendingUser[]>([]);
  const [approvedUsers, setApprovedUsers] = useState<ApprovedUser[]>([]);
  const [loading, setLoading] = useState(true);
  const [passwordDialogOpen, setPasswordDialogOpen] = useState(false);
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [deleteLoading, setDeleteLoading] = useState(false);
  const [selectedUser, setSelectedUser] = useState<{ id: string; email: string; name: string | null } | null>(null);

  const openPasswordDialog = (userId: string, email: string, name: string | null) => {
    setSelectedUser({ id: userId, email, name });
    setPasswordDialogOpen(true);
  };

  const openDeleteDialog = (userId: string, email: string, name: string | null) => {
    setSelectedUser({ id: userId, email, name });
    setDeleteDialogOpen(true);
  };

  const deleteUser = async () => {
    if (!selectedUser) return;
    
    setDeleteLoading(true);
    try {
      // Usar edge function para deletar completamente o usuário
      const response = await supabase.functions.invoke("delete-user", {
        body: { userId: selectedUser.id },
      });

      if (response.error) throw response.error;
      if (response.data?.error) throw new Error(response.data.error);
      
      toast.success("Usuário excluído com sucesso");
      setDeleteDialogOpen(false);
      loadUsers();
    } catch (error: any) {
      toast.error("Erro ao excluir usuário: " + error.message);
    } finally {
      setDeleteLoading(false);
    }
  };

  const loadUsers = async () => {
    try {
      // Buscar todos os perfis
      const { data: profiles, error: profilesError } = await supabase
        .from("profiles")
        .select("*")
        .order("created_at", { ascending: false });

      if (profilesError) throw profilesError;

      // Buscar todos os roles
      const { data: roles, error: rolesError } = await supabase
        .from("user_roles")
        .select("*");

      if (rolesError) throw rolesError;

      // Separar pendentes e aprovados
      const pending: PendingUser[] = [];
      const approved: ApprovedUser[] = [];

      profiles?.forEach((profile) => {
        const userRole = roles?.find((r) => r.user_id === profile.id);
        
        if (userRole) {
          approved.push({
            id: profile.id,
            email: profile.email,
            full_name: profile.full_name,
            role: userRole.role,
            assigned_at: userRole.assigned_at,
          });
        } else {
          pending.push({
            id: profile.id,
            email: profile.email,
            full_name: profile.full_name,
            created_at: profile.created_at,
          });
        }
      });

      setPendingUsers(pending);
      setApprovedUsers(approved);
    } catch (error: any) {
      toast.error("Erro ao carregar usuários: " + error.message);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadUsers();
  }, []);

  const approveUser = async (userId: string, role: "admin" | "gestor" | "usuario" = "usuario") => {
    try {
      const { error } = await supabase.from("user_roles").insert({
        user_id: userId,
        role: role,
        assigned_by: currentUser?.id,
      });

      if (error) throw error;

      toast.success("Usuário aprovado com sucesso!");
      loadUsers();
    } catch (error: any) {
      toast.error("Erro ao aprovar usuário: " + error.message);
    }
  };

  const rejectUser = async (userId: string) => {
    try {
      // Usar edge function para deletar completamente o usuário
      const response = await supabase.functions.invoke("delete-user", {
        body: { userId },
      });

      if (response.error) throw response.error;
      if (response.data?.error) throw new Error(response.data.error);

      toast.success("Usuário rejeitado e removido do sistema");
      loadUsers();
    } catch (error: any) {
      toast.error("Erro ao rejeitar usuário: " + error.message);
    }
  };

  const changeRole = async (userId: string, newRole: "admin" | "gestor" | "usuario") => {
    try {
      const { error } = await supabase
        .from("user_roles")
        .update({ role: newRole })
        .eq("user_id", userId);

      if (error) throw error;

      toast.success("Role atualizada com sucesso!");
      loadUsers();
    } catch (error: any) {
      toast.error("Erro ao atualizar role: " + error.message);
    }
  };

  const resetPassword = async (email: string) => {
    try {
      const redirectUrl = `${window.location.origin}/auth`;
      
      const { error } = await supabase.auth.resetPasswordForEmail(email, {
        redirectTo: redirectUrl,
      });

      if (error) throw error;

      toast.success(`E-mail de redefinição enviado para ${email}`);
    } catch (error: any) {
      toast.error("Erro ao enviar e-mail: " + error.message);
    }
  };

  const forceResetPassword = async (userId: string, userName: string | null) => {
    try {
      const { data: { session } } = await supabase.auth.getSession();
      
      const response = await supabase.functions.invoke("reset-user-password", {
        body: { userId },
      });

      if (response.error) throw response.error;

      toast.success(`${userName || "Usuário"} precisará definir nova senha no próximo login`);
    } catch (error: any) {
      toast.error("Erro ao resetar senha: " + error.message);
    }
  };

  if (loading) {
    return (
      <Layout>
        <div className="container mx-auto p-4">
          <div className="flex items-center justify-center h-64">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary"></div>
          </div>
        </div>
      </Layout>
    );
  }

  return (
    <Layout>
      <div className="container mx-auto p-4 space-y-6">
        <PageHeader
          icon={Users}
          title="Gerenciar Usuários"
          description="Aprove novos usuários e gerencie permissões"
        />

        {/* Usuários Pendentes */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <UserCheck className="h-5 w-5" />
              Usuários Pendentes de Aprovação
            </CardTitle>
            <CardDescription>
              {pendingUsers.length} usuário(s) aguardando aprovação
            </CardDescription>
          </CardHeader>
          <CardContent>
            {pendingUsers.length === 0 ? (
              <p className="text-center text-muted-foreground py-8">
                Nenhum usuário pendente
              </p>
            ) : (
              <div className="space-y-4">
                {pendingUsers.map((user) => (
                  <div
                    key={user.id}
                    className="flex items-center justify-between p-4 border rounded-lg"
                  >
                    <div>
                      <p className="font-medium">{user.full_name || "Sem nome"}</p>
                      <p className="text-sm text-muted-foreground">{user.email}</p>
                      <p className="text-xs text-muted-foreground mt-1">
                        Cadastrado em {new Date(user.created_at).toLocaleDateString("pt-BR")}
                      </p>
                    </div>
                    <div className="flex gap-2 flex-wrap">
                      <Button
                        size="sm"
                        onClick={() => approveUser(user.id, "usuario")}
                        className="gap-1"
                        variant="outline"
                      >
                        <Check className="h-4 w-4" />
                        Usuário
                      </Button>
                      <Button
                        size="sm"
                        onClick={() => approveUser(user.id, "gestor")}
                        className="gap-1"
                        variant="secondary"
                      >
                        <Check className="h-4 w-4" />
                        Gestor
                      </Button>
                      <Button
                        size="sm"
                        onClick={() => approveUser(user.id, "admin")}
                        className="gap-1"
                      >
                        <Check className="h-4 w-4" />
                        Admin
                      </Button>
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() => openPasswordDialog(user.id, user.email, user.full_name)}
                        className="gap-1"
                      >
                        <Lock className="h-4 w-4" />
                        Definir Senha
                      </Button>
                      <Button
                        size="sm"
                        variant="destructive"
                        onClick={() => rejectUser(user.id)}
                        className="gap-1"
                      >
                        <X className="h-4 w-4" />
                        Rejeitar
                      </Button>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>

        {/* Usuários Aprovados */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <UserX className="h-5 w-5" />
              Usuários Aprovados
            </CardTitle>
            <CardDescription>
              {approvedUsers.length} usuário(s) com acesso ao sistema
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              {approvedUsers.map((user) => (
                <div
                  key={user.id}
                  className="flex items-center justify-between p-4 border rounded-lg"
                >
                  <div>
                    <p className="font-medium">{user.full_name || "Sem nome"}</p>
                    <p className="text-sm text-muted-foreground">{user.email}</p>
                    <p className="text-xs text-muted-foreground mt-1">
                      Aprovado em {new Date(user.assigned_at).toLocaleDateString("pt-BR")}
                    </p>
                  </div>
                  <div className="flex items-center gap-2 flex-wrap">
                    <Badge variant={user.role === "admin" ? "default" : user.role === "gestor" ? "secondary" : "outline"}>
                      {user.role === "admin" ? "Admin" : user.role === "gestor" ? "Gestor" : "Usuário"}
                    </Badge>
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={() => openPasswordDialog(user.id, user.email, user.full_name)}
                      className="gap-1"
                    >
                      <Lock className="h-4 w-4" />
                      Senha
                    </Button>
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={() => forceResetPassword(user.id, user.full_name)}
                      className="gap-1"
                    >
                      <RefreshCw className="h-4 w-4" />
                      Resetar
                    </Button>
                    {/* Menu de alteração de role */}
                    {user.id !== currentUser?.id && (
                      <>
                        {user.role === "usuario" && (
                          <>
                            <Button size="sm" variant="outline" onClick={() => changeRole(user.id, "gestor")}>
                              → Gestor
                            </Button>
                            <Button size="sm" variant="outline" onClick={() => changeRole(user.id, "admin")}>
                              → Admin
                            </Button>
                          </>
                        )}
                        {user.role === "gestor" && (
                          <>
                            <Button size="sm" variant="outline" onClick={() => changeRole(user.id, "usuario")}>
                              → Usuário
                            </Button>
                            <Button size="sm" variant="outline" onClick={() => changeRole(user.id, "admin")}>
                              → Admin
                            </Button>
                          </>
                        )}
                        {user.role === "admin" && (
                          <>
                            <Button size="sm" variant="outline" onClick={() => changeRole(user.id, "usuario")}>
                              → Usuário
                            </Button>
                            <Button size="sm" variant="outline" onClick={() => changeRole(user.id, "gestor")}>
                              → Gestor
                            </Button>
                          </>
                        )}
                        <Button
                          size="sm"
                          variant="destructive"
                          onClick={() => openDeleteDialog(user.id, user.email, user.full_name)}
                          className="gap-1"
                        >
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      </>
                    )}
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>

        {selectedUser && (
          <>
            <ChangePasswordDialog
              open={passwordDialogOpen}
              onOpenChange={setPasswordDialogOpen}
              userId={selectedUser.id}
              userEmail={selectedUser.email}
              userName={selectedUser.name}
            />
            <DeleteUserDialog
              open={deleteDialogOpen}
              onOpenChange={setDeleteDialogOpen}
              userName={selectedUser.name}
              userEmail={selectedUser.email}
              onConfirm={deleteUser}
              loading={deleteLoading}
            />
          </>
        )}
      </div>
    </Layout>
  );
}
