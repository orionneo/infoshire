import { Copy, Key, Loader2, Search, Trash2, Users as UsersIcon, User } from 'lucide-react';
import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
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
import { Input } from '@/components/ui/input';
import { deleteProfile, getAllProfiles } from '@/db/api';
import { supabase } from '@/db/supabase';
import { useToast } from '@/hooks/use-toast';
import type { Profile } from '@/types/types';

export default function AdminClients() {
  const navigate = useNavigate();
  const [clients, setClients] = useState<Profile[]>([]);
  const [filteredClients, setFilteredClients] = useState<Profile[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [resettingPassword, setResettingPassword] = useState<string | null>(null);
  const [deletingClient, setDeletingClient] = useState<string | null>(null);
  const { toast } = useToast();

  useEffect(() => {
    loadClients();
  }, []);

  useEffect(() => {
    filterClients();
  }, [clients, searchTerm]);

  const loadClients = async () => {
    try {
      const data = await getAllProfiles();
      const clientsOnly = data.filter(p => p.role === 'client');
      setClients(clientsOnly);
    } catch (error) {
      console.error('Erro ao carregar clientes:', error);
    } finally {
      setLoading(false);
    }
  };

  const filterClients = () => {
    if (!searchTerm) {
      setFilteredClients(clients);
      return;
    }

    const filtered = clients.filter(
      (client) =>
        client.name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
        client.email?.toLowerCase().includes(searchTerm.toLowerCase()) ||
        client.phone?.toLowerCase().includes(searchTerm.toLowerCase())
    );

    setFilteredClients(filtered);
  };

  const handleResetPassword = async (clientId: string, clientEmail: string) => {
    setResettingPassword(clientId);
    try {
      // Call Edge Function to reset password
      const { data, error } = await supabase.functions.invoke('reset-user-password', {
        body: JSON.stringify({
          userId: clientId,
          newPassword: '123456',
        }),
      });

      if (error) {
        const errorMsg = await error?.context?.text();
        console.error('Erro ao resetar senha:', errorMsg || error?.message);
        throw new Error(errorMsg || error?.message);
      }

      if (data?.error) {
        throw new Error(data.error);
      }

      // Update profile to mark password as not changed
      const { error: profileError } = await supabase
        .from('profiles')
        .update({ password_changed: false })
        .eq('id', clientId);

      if (profileError) throw profileError;

      toast({
        title: 'Senha resetada',
        description: `A senha do cliente ${clientEmail} foi resetada para 123456`,
      });
    } catch (error: any) {
      console.error('Erro ao resetar senha:', error);
      toast({
        title: 'Erro',
        description: error.message || 'Não foi possível resetar a senha do cliente',
        variant: 'destructive',
      });
    } finally {
      setResettingPassword(null);
    }
  };

  const handleGenerateResetLink = async (clientId: string, clientEmail: string) => {
    try {
      // Generate a unique token
      const token = crypto.randomUUID();
      const expiresAt = new Date();
      expiresAt.setHours(expiresAt.getHours() + 24); // Valid for 24 hours

      // Insert token into database
      const { error } = await supabase
        .from('password_reset_tokens')
        .insert({
          user_id: clientId,
          token: token,
          expires_at: expiresAt.toISOString(),
        });

      if (error) throw error;

      // Generate reset link
      const resetLink = `${window.location.origin}/reset-password/${token}`;

      // Copy to clipboard
      await navigator.clipboard.writeText(resetLink);

      toast({
        title: 'Link copiado!',
        description: `Link de recuperação copiado para a área de transferência. Envie para ${clientEmail} via WhatsApp.`,
      });
    } catch (error: any) {
      console.error('Erro ao gerar link:', error);
      toast({
        title: 'Erro',
        description: 'Não foi possível gerar o link de recuperação',
        variant: 'destructive',
      });
    }
  };

  const handleDeleteClient = async (clientId: string, clientName: string) => {
    setDeletingClient(clientId);
    try {
      await deleteProfile(clientId);

      toast({
        title: 'Cliente deletado',
        description: `O cliente ${clientName} foi removido com sucesso`,
      });

      // Reload clients list
      loadClients();
    } catch (error: any) {
      console.error('Erro ao deletar cliente:', error);
      toast({
        title: 'Erro',
        description: error.message || 'Não foi possível deletar o cliente',
        variant: 'destructive',
      });
    } finally {
      setDeletingClient(null);
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
          <h1 className="text-3xl font-bold">Clientes</h1>
          <p className="text-muted-foreground">Visualize todos os clientes cadastrados</p>
        </div>

        <Card>
          <CardHeader>
            <div className="relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="Buscar por nome, e-mail ou telefone..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="pl-10"
              />
            </div>
          </CardHeader>
          <CardContent>
            {filteredClients.length === 0 ? (
              <div className="flex flex-col items-center justify-center py-12">
                <UsersIcon className="h-12 w-12 text-muted-foreground mb-4" />
                <p className="text-muted-foreground">
                  {searchTerm ? 'Nenhum cliente encontrado' : 'Nenhum cliente cadastrado'}
                </p>
              </div>
            ) : (
              <div className="space-y-4">
                {filteredClients.map((client) => (
                  <div
                    key={client.id}
                    className="flex items-center justify-between p-4 border rounded-lg hover:bg-accent transition-colors"
                  >
                    <div 
                      className="flex-1 cursor-pointer"
                      onClick={() => navigate(`/admin/clients/${client.id}`)}
                    >
                      <div className="flex items-center gap-3 mb-1">
                        <User className="h-4 w-4 text-primary" />
                        <p className="font-medium hover:text-primary transition-colors">
                          {client.name || 'Sem nome'}
                        </p>
                        <Badge variant="outline">Cliente</Badge>
                      </div>
                      <p className="text-sm text-muted-foreground">{client.email}</p>
                      {client.phone && (
                        <p className="text-sm text-muted-foreground">{client.phone}</p>
                      )}
                    </div>
                    <div className="flex gap-2">
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => handleGenerateResetLink(client.id, client.email || 'cliente')}
                      >
                        <Copy className="mr-2 h-4 w-4" />
                        Gerar Link
                      </Button>
                      <AlertDialog>
                        <AlertDialogTrigger asChild>
                          <Button 
                            variant="outline" 
                            size="sm"
                            disabled={resettingPassword === client.id}
                          >
                            {resettingPassword === client.id ? (
                              <>
                                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                                Resetando...
                              </>
                            ) : (
                              <>
                                <Key className="mr-2 h-4 w-4" />
                                Resetar Senha
                              </>
                            )}
                          </Button>
                        </AlertDialogTrigger>
                        <AlertDialogContent>
                          <AlertDialogHeader>
                            <AlertDialogTitle>Resetar Senha do Cliente</AlertDialogTitle>
                            <AlertDialogDescription>
                              Tem certeza que deseja resetar a senha de <strong>{client.name || client.email}</strong> para a senha padrão <strong>123456</strong>?
                              <br /><br />
                              O cliente será obrigado a alterar a senha no próximo login.
                            </AlertDialogDescription>
                          </AlertDialogHeader>
                          <AlertDialogFooter>
                            <AlertDialogCancel>Cancelar</AlertDialogCancel>
                            <AlertDialogAction
                              onClick={() => handleResetPassword(client.id, client.email || 'cliente')}
                            >
                              Resetar Senha
                            </AlertDialogAction>
                          </AlertDialogFooter>
                        </AlertDialogContent>
                      </AlertDialog>
                      <AlertDialog>
                        <AlertDialogTrigger asChild>
                          <Button 
                            variant="destructive" 
                            size="sm"
                            disabled={deletingClient === client.id}
                          >
                            {deletingClient === client.id ? (
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
                            <AlertDialogTitle>Deletar Cliente</AlertDialogTitle>
                            <AlertDialogDescription>
                              Tem certeza que deseja deletar <strong>{client.name || client.email}</strong>?
                              <br /><br />
                              <span className="text-destructive font-semibold">Esta ação é irreversível!</span> Todos os dados do cliente, incluindo ordens de serviço e mensagens, serão permanentemente removidos.
                            </AlertDialogDescription>
                          </AlertDialogHeader>
                          <AlertDialogFooter>
                            <AlertDialogCancel>Cancelar</AlertDialogCancel>
                            <AlertDialogAction
                              onClick={() => handleDeleteClient(client.id, client.name || client.email || 'cliente')}
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
      </div>
    </AdminLayout>
  );
}
