import { Loader2, Shield, Trash2, User } from 'lucide-react';
import { useEffect, useState } from 'react';
import { AdminLayout } from '@/components/layouts/AdminLayout';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from '@/components/ui/alert-dialog';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { deleteProfile, getAllProfiles, updateProfileRole } from '@/db/api';
import { useToast } from '@/hooks/use-toast';
import type { Profile } from '@/types/types';

export default function AdminUserManagement() {
  const { toast } = useToast();
  const [users, setUsers] = useState<Profile[]>([]);
  const [loading, setLoading] = useState(true);
  const [updating, setUpdating] = useState<string | null>(null);
  const [deletingUser, setDeletingUser] = useState<string | null>(null);

  useEffect(() => {
    loadUsers();
  }, []);

  const loadUsers = async () => {
    try {
      const data = await getAllProfiles();
      setUsers(data);
    } catch (error) {
      console.error('Erro ao carregar usuários:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleRoleChange = async (userId: string, newRole: 'client' | 'admin') => {
    setUpdating(userId);
    try {
      await updateProfileRole(userId, newRole);
      
      toast({
        title: 'Função atualizada',
        description: 'A função do usuário foi atualizada com sucesso',
      });

      loadUsers();
    } catch (error) {
      console.error('Erro ao atualizar função:', error);
      toast({
        title: 'Erro',
        description: 'Não foi possível atualizar a função do usuário',
        variant: 'destructive',
      });
    } finally {
      setUpdating(null);
    }
  };

  const handleDeleteUser = async (userId: string, userName: string) => {
    setDeletingUser(userId);
    try {
      await deleteProfile(userId);

      toast({
        title: 'Usuário deletado',
        description: `O usuário ${userName} foi removido com sucesso`,
      });

      // Reload users list
      loadUsers();
    } catch (error: any) {
      console.error('Erro ao deletar usuário:', error);
      toast({
        title: 'Erro',
        description: error.message || 'Não foi possível deletar o usuário',
        variant: 'destructive',
      });
    } finally {
      setDeletingUser(null);
    }
  };

  if (loading) {
    return (
      <AdminLayout>
        <div className="flex items-center justify-center h-64">
          <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
        </div>
      </AdminLayout>
    );
  }

  return (
    <AdminLayout>
      <div className="space-y-6">
        <div>
          <h1 className="text-3xl font-bold">Gerenciar Usuários</h1>
          <p className="text-muted-foreground">Gerencie as funções dos usuários do sistema</p>
        </div>

        <Card>
          <CardHeader>
            <CardTitle>Usuários do Sistema</CardTitle>
          </CardHeader>
          <CardContent>
            {users.length === 0 ? (
              <p className="text-muted-foreground text-center py-8">
                Nenhum usuário cadastrado
              </p>
            ) : (
              <div className="space-y-4">
                {users.map((user) => (
                  <div
                    key={user.id}
                    className="flex items-center justify-between p-4 border rounded-lg"
                  >
                    <div className="flex-1">
                      <div className="flex items-center gap-3 mb-1">
                        <p className="font-medium">{user.name || 'Sem nome'}</p>
                        <Badge variant={user.role === 'admin' ? 'default' : 'secondary'}>
                          {user.role === 'admin' ? (
                            <>
                              <Shield className="h-3 w-3 mr-1" />
                              Administrador
                            </>
                          ) : (
                            <>
                              <User className="h-3 w-3 mr-1" />
                              Cliente
                            </>
                          )}
                        </Badge>
                      </div>
                      <p className="text-sm text-muted-foreground">{user.email}</p>
                    </div>
                    <div className="flex items-center gap-2">
                      <Select
                        value={user.role}
                        onValueChange={(value) => handleRoleChange(user.id, value as 'client' | 'admin')}
                        disabled={updating === user.id}
                      >
                        <SelectTrigger className="w-[180px]">
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="client">Cliente</SelectItem>
                          <SelectItem value="admin">Administrador</SelectItem>
                        </SelectContent>
                      </Select>
                      {updating === user.id && (
                        <Loader2 className="h-4 w-4 animate-spin text-muted-foreground" />
                      )}
                      <AlertDialog>
                        <AlertDialogTrigger asChild>
                          <Button 
                            variant="destructive" 
                            size="sm"
                            disabled={deletingUser === user.id}
                          >
                            {deletingUser === user.id ? (
                              <>
                                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                                Deletando...
                              </>
                            ) : (
                              <>
                                <Trash2 className="mr-2 h-4 w-4" />
                                Deletar
                              </>
                            )}
                          </Button>
                        </AlertDialogTrigger>
                        <AlertDialogContent>
                          <AlertDialogHeader>
                            <AlertDialogTitle>Deletar Usuário</AlertDialogTitle>
                            <AlertDialogDescription>
                              Tem certeza que deseja deletar <strong>{user.name || user.email}</strong>?
                              <br /><br />
                              <span className="text-destructive font-semibold">Esta ação é irreversível!</span> Todos os dados do usuário, incluindo ordens de serviço e mensagens, serão permanentemente removidos.
                            </AlertDialogDescription>
                          </AlertDialogHeader>
                          <AlertDialogFooter>
                            <AlertDialogCancel>Cancelar</AlertDialogCancel>
                            <AlertDialogAction
                              onClick={() => handleDeleteUser(user.id, user.name || user.email || 'usuário')}
                              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
                            >
                              Sim, Deletar
                            </AlertDialogAction>
                          </AlertDialogFooter>
                        </AlertDialogContent>
                      </AlertDialog>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>

        <Card className="bg-muted/50">
          <CardContent className="pt-6">
            <div className="space-y-2 text-sm">
              <p className="font-medium">Informações Importantes:</p>
              <ul className="list-disc list-inside space-y-1 text-muted-foreground">
                <li>O primeiro usuário cadastrado no sistema é automaticamente definido como administrador</li>
                <li>Administradores têm acesso total ao sistema e podem gerenciar ordens de serviço</li>
                <li>Clientes podem apenas visualizar suas próprias ordens de serviço</li>
                <li>Tenha cuidado ao alterar funções de usuários</li>
              </ul>
            </div>
          </CardContent>
        </Card>
      </div>
    </AdminLayout>
  );
}
