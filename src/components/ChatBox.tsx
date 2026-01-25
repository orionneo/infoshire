import { format } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { Edit2, Image as ImageIcon, Loader2, Maximize2, Minimize2, MoreVertical, Send, Trash2, X } from 'lucide-react';
import { useEffect, useRef, useState } from 'react';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog';
import { Button } from '@/components/ui/button';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { SmartTextarea } from '@/components/ui/SmartTextarea';
import { useAuth } from '@/contexts/AuthContext';
import { createMessage, deleteMessage, getOrderMessages, updateMessage } from '@/db/api';
import { supabase } from '@/db/supabase';
import { useToast } from '@/hooks/use-toast';
import type { MessageWithSender } from '@/types/types';

// Helper function to format message content with clickable links
function formatMessageContent(content: string) {
  // Detect URLs in the message
  const urlRegex = /(https?:\/\/[^\s]+)/g;
  const parts = content.split(urlRegex);
  
  return parts.map((part, index) => {
    if (part.match(urlRegex)) {
      return (
        <a
          key={index}
          href={part}
          target="_blank"
          rel="noopener noreferrer"
          className="underline font-semibold hover:opacity-80 break-all"
        >
          {part}
        </a>
      );
    }
    return <span key={index} className="whitespace-pre-wrap">{part}</span>;
  });
}

export function ChatBox({ orderId }: { orderId: string }) {
  const { user, profile } = useAuth();
  const { toast } = useToast();
  const [messages, setMessages] = useState<MessageWithSender[]>([]);
  const [newMessage, setNewMessage] = useState('');
  const [loading, setLoading] = useState(true);
  const [sending, setSending] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [editingMessage, setEditingMessage] = useState<MessageWithSender | null>(null);
  const [editContent, setEditContent] = useState('');
  const [updating, setUpdating] = useState(false);
  const [deletingMessageId, setDeletingMessageId] = useState<string | null>(null);
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [isFullscreen, setIsFullscreen] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    loadMessages();
  }, [orderId]);

  useEffect(() => {
    scrollToBottom();
  }, [messages]);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  const loadMessages = async () => {
    try {
      setLoading(true);
      const data = await getOrderMessages(orderId);
      setMessages(data || []);
    } catch (error) {
      console.error('Erro ao carregar mensagens:', error);
      setMessages([]);
      toast({
        title: 'Erro ao carregar mensagens',
        description: 'Não foi possível carregar as mensagens. Tente novamente.',
        variant: 'destructive',
      });
    } finally {
      setLoading(false);
    }
  };

  const handleSend = async () => {
    if (!newMessage.trim() || !user) return;

    setSending(true);
    try {
      const message = await createMessage({
        order_id: orderId,
        sender_id: user.id,
        content: newMessage.trim(),
      });

      setMessages([...messages, { ...message, sender: profile! }]);
      setNewMessage('');
    } catch (error) {
      console.error('Erro ao enviar mensagem:', error);
      toast({
        title: 'Erro',
        description: 'Não foi possível enviar a mensagem',
        variant: 'destructive',
      });
    } finally {
      setSending(false);
    }
  };

  const handleImageUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file || !user) return;

    // Validar tipo de arquivo
    if (!file.type.startsWith('image/')) {
      toast({
        title: 'Erro',
        description: 'Por favor, selecione apenas imagens',
        variant: 'destructive',
      });
      return;
    }

    setUploading(true);
    try {
      // Comprimir imagem se necessário
      let fileToUpload = file;
      if (file.size > 1024 * 1024) {
        fileToUpload = await compressImage(file);
      }

      // Upload para Supabase Storage
      const fileName = `${Date.now()}_${file.name.replace(/[^a-zA-Z0-9.]/g, '_')}`;
      const { data, error } = await supabase.storage
        .from('app-8pj0bpgfx6v5_messages_images')
        .upload(fileName, fileToUpload);

      if (error) throw error;

      // Obter URL pública
      const { data: { publicUrl } } = supabase.storage
        .from('app-8pj0bpgfx6v5_messages_images')
        .getPublicUrl(data.path);

      // Criar mensagem com imagem
      const message = await createMessage({
        order_id: orderId,
        sender_id: user.id,
        content: '[Imagem]',
        image_url: publicUrl,
      });

      setMessages([...messages, { ...message, sender: profile! }]);
      
      toast({
        title: 'Sucesso',
        description: 'Imagem enviada com sucesso',
      });
    } catch (error) {
      console.error('Erro ao enviar imagem:', error);
      toast({
        title: 'Erro',
        description: 'Não foi possível enviar a imagem',
        variant: 'destructive',
      });
    } finally {
      setUploading(false);
      if (fileInputRef.current) {
        fileInputRef.current.value = '';
      }
    }
  };

  const compressImage = async (file: File): Promise<File> => {
    return new Promise((resolve) => {
      const reader = new FileReader();
      reader.onload = (e) => {
        const img = new Image();
        img.onload = () => {
          const canvas = document.createElement('canvas');
          let width = img.width;
          let height = img.height;

          // Redimensionar para max 1080p
          const maxDimension = 1080;
          if (width > maxDimension || height > maxDimension) {
            if (width > height) {
              height = (height / width) * maxDimension;
              width = maxDimension;
            } else {
              width = (width / height) * maxDimension;
              height = maxDimension;
            }
          }

          canvas.width = width;
          canvas.height = height;

          const ctx = canvas.getContext('2d');
          ctx?.drawImage(img, 0, 0, width, height);

          canvas.toBlob(
            (blob) => {
              if (blob) {
                resolve(new File([blob], file.name, { type: 'image/webp' }));
              }
            },
            'image/webp',
            0.8
          );
        };
        img.src = e.target?.result as string;
      };
      reader.readAsDataURL(file);
    });
  };

  const handleEditMessage = (message: MessageWithSender) => {
    if (message.image_url) {
      toast({
        title: 'Não é possível editar',
        description: 'Mensagens com imagens não podem ser editadas',
        variant: 'destructive',
      });
      return;
    }
    setEditingMessage(message);
    setEditContent(message.content);
  };

  const handleUpdateMessage = async () => {
    if (!editingMessage || !editContent.trim()) return;

    setUpdating(true);
    try {
      await updateMessage(editingMessage.id, editContent.trim());
      
      setMessages(messages.map(msg => 
        msg.id === editingMessage.id 
          ? { ...msg, content: editContent.trim() }
          : msg
      ));
      
      setEditingMessage(null);
      setEditContent('');
      
      toast({
        title: 'Sucesso',
        description: 'Mensagem atualizada com sucesso',
      });
    } catch (error) {
      console.error('Erro ao atualizar mensagem:', error);
      toast({
        title: 'Erro',
        description: 'Não foi possível atualizar a mensagem',
        variant: 'destructive',
      });
    } finally {
      setUpdating(false);
    }
  };

  const handleDeleteMessage = async () => {
    if (!deletingMessageId) return;

    try {
      await deleteMessage(deletingMessageId);
      
      setMessages(messages.filter(msg => msg.id !== deletingMessageId));
      
      toast({
        title: 'Sucesso',
        description: 'Mensagem excluída com sucesso',
      });
    } catch (error) {
      console.error('Erro ao excluir mensagem:', error);
      toast({
        title: 'Erro',
        description: 'Não foi possível excluir a mensagem',
        variant: 'destructive',
      });
    } finally {
      setDeletingMessageId(null);
      setDeleteDialogOpen(false);
    }
  };

  const openDeleteDialog = (messageId: string) => {
    setDeletingMessageId(messageId);
    setDeleteDialogOpen(true);
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
      </div>
    );
  }

  return (
    <>
      {/* Fullscreen Overlay for Mobile */}
      {isFullscreen && (
        <div className="fixed inset-0 z-50 bg-background flex flex-col">
          {/* Fullscreen Header */}
          <div className="border-b px-4 py-3 bg-card flex items-center justify-between">
            <h3 className="font-semibold text-lg">Mensagens</h3>
            <Button
              variant="ghost"
              size="icon"
              onClick={() => setIsFullscreen(false)}
              className="h-9 w-9"
            >
              <X className="h-5 w-5" />
            </Button>
          </div>
          
          {/* Fullscreen Messages Area */}
          <div className="flex-1 overflow-y-auto p-4 space-y-4 bg-card">
            {messages.length === 0 ? (
              <div className="flex items-center justify-center h-full text-muted-foreground">
                Nenhuma mensagem ainda
              </div>
            ) : (
              messages.map((message) => {
                if (!message || !message.id) return null;
                const isOwn = message.sender_id === user?.id;
                const senderName = message.sender?.name || message.sender?.email || 'Usuário';
                
                return (
                  <div
                    key={message.id}
                    className={`flex ${isOwn ? 'justify-end' : 'justify-start'}`}
                  >
                    <div className={`max-w-[85%] ${isOwn ? 'items-end' : 'items-start'} flex flex-col gap-1`}>
                      <div className={`rounded-lg px-4 py-2 ${isOwn ? 'bg-primary text-primary-foreground' : 'bg-muted text-foreground'} relative group`}>
                        {message.image_url ? (
                          <img
                            src={message.image_url}
                            alt="Imagem enviada"
                            className="max-w-full rounded"
                            loading="lazy"
                          />
                        ) : (
                          <div className="text-sm">
                            {formatMessageContent(message.content || '')}
                          </div>
                        )}
                        
                        {/* Edit/Delete Menu - Only for own messages */}
                        {isOwn && (
                          <div className="absolute -top-2 -right-2 opacity-0 group-hover:opacity-100 transition-opacity">
                            <DropdownMenu>
                              <DropdownMenuTrigger asChild>
                                <Button
                                  variant="secondary"
                                  size="icon"
                                  className="h-6 w-6 rounded-full shadow-md"
                                >
                                  <MoreVertical className="h-3 w-3" />
                                </Button>
                              </DropdownMenuTrigger>
                              <DropdownMenuContent align="end">
                                {!message.image_url && (
                                  <DropdownMenuItem onClick={() => handleEditMessage(message)}>
                                    <Edit2 className="h-4 w-4 mr-2" />
                                    Editar
                                  </DropdownMenuItem>
                                )}
                                <DropdownMenuItem 
                                  onClick={() => openDeleteDialog(message.id)}
                                  className="text-destructive focus:text-destructive"
                                >
                                  <Trash2 className="h-4 w-4 mr-2" />
                                  Excluir
                                </DropdownMenuItem>
                              </DropdownMenuContent>
                            </DropdownMenu>
                          </div>
                        )}
                      </div>
                      <div className="flex items-center gap-2 px-1">
                        <span className="text-xs text-muted-foreground">
                          {senderName}
                        </span>
                        <span className="text-xs text-muted-foreground">
                          {message.created_at ? format(new Date(message.created_at), 'HH:mm', { locale: ptBR }) : ''}
                        </span>
                      </div>
                    </div>
                  </div>
                );
              })
            )}
            <div ref={messagesEndRef} />
          </div>

          {/* Fullscreen Input Area */}
          <div className="border-t p-4 bg-card">
            <div className="flex gap-2">
              <input
                ref={fileInputRef}
                type="file"
                accept="image/*"
                className="hidden"
                onChange={handleImageUpload}
              />
              <Button
                variant="outline"
                size="icon"
                onClick={() => fileInputRef.current?.click()}
                disabled={uploading}
                className="shrink-0"
              >
                {uploading ? (
                  <Loader2 className="h-4 w-4 animate-spin" />
                ) : (
                  <ImageIcon className="h-4 w-4" />
                )}
              </Button>
              <SmartTextarea
                value={newMessage}
                onChange={(value) => setNewMessage(value)}
                placeholder="Digite sua mensagem..."
                className="min-h-[60px] resize-none"
                onKeyDown={(e) => {
                  if (e.key === 'Enter' && !e.shiftKey) {
                    e.preventDefault();
                    handleSend();
                  }
                }}
              />
              <Button onClick={handleSend} disabled={sending || !newMessage.trim()} className="shrink-0">
                {sending ? (
                  <Loader2 className="h-4 w-4 animate-spin" />
                ) : (
                  <Send className="h-4 w-4" />
                )}
              </Button>
            </div>
          </div>
        </div>
      )}

      {/* Normal View */}
      <div className="flex flex-col h-[500px] max-h-[70vh] bg-card border rounded-lg overflow-hidden">
        {/* Header */}
        <div className="border-b px-4 py-3 bg-card flex items-center justify-between">
          <h3 className="font-semibold text-lg">Mensagens</h3>
          <Button
            variant="ghost"
            size="icon"
            onClick={() => setIsFullscreen(true)}
            className="h-8 w-8 xl:hidden"
            title="Abrir em tela cheia"
          >
            <Maximize2 className="h-4 w-4" />
          </Button>
        </div>
      
      {/* Messages Area */}
      <div className="flex-1 overflow-y-auto p-4 space-y-4 bg-card">
        {messages.length === 0 ? (
          <div className="flex items-center justify-center h-full text-muted-foreground">
            Nenhuma mensagem ainda
          </div>
        ) : (
          messages.map((message) => {
            if (!message || !message.id) return null;
            const isOwn = message.sender_id === user?.id;
            const senderName = message.sender?.name || message.sender?.email || 'Usuário';
            
            return (
              <div
                key={message.id}
                className={`flex ${isOwn ? 'justify-end' : 'justify-start'}`}
              >
                <div className={`max-w-[70%] ${isOwn ? 'items-end' : 'items-start'} flex flex-col gap-1`}>
                  <div className={`rounded-lg px-4 py-2 ${isOwn ? 'bg-primary text-primary-foreground' : 'bg-muted text-foreground'} relative group`}>
                    {message.image_url ? (
                      <img
                        src={message.image_url}
                        alt="Imagem enviada"
                        className="max-w-full rounded"
                        loading="lazy"
                      />
                    ) : (
                      <div className="text-sm">
                        {formatMessageContent(message.content || '')}
                      </div>
                    )}
                    
                    {/* Edit/Delete Menu - Only for own messages */}
                    {isOwn && (
                      <div className="absolute -top-2 -right-2 opacity-0 group-hover:opacity-100 transition-opacity">
                        <DropdownMenu>
                          <DropdownMenuTrigger asChild>
                            <Button
                              variant="secondary"
                              size="icon"
                              className="h-6 w-6 rounded-full shadow-md"
                            >
                              <MoreVertical className="h-3 w-3" />
                            </Button>
                          </DropdownMenuTrigger>
                          <DropdownMenuContent align="end">
                            {!message.image_url && (
                              <DropdownMenuItem onClick={() => handleEditMessage(message)}>
                                <Edit2 className="h-4 w-4 mr-2" />
                                Editar
                              </DropdownMenuItem>
                            )}
                            <DropdownMenuItem 
                              onClick={() => openDeleteDialog(message.id)}
                              className="text-destructive focus:text-destructive"
                            >
                              <Trash2 className="h-4 w-4 mr-2" />
                              Excluir
                            </DropdownMenuItem>
                          </DropdownMenuContent>
                        </DropdownMenu>
                      </div>
                    )}
                  </div>
                  <div className="flex items-center gap-2 px-1">
                    <span className="text-xs text-muted-foreground">
                      {senderName}
                    </span>
                    <span className="text-xs text-muted-foreground">
                      {message.created_at ? format(new Date(message.created_at), 'HH:mm', { locale: ptBR }) : ''}
                    </span>
                  </div>
                </div>
              </div>
            );
          })
        )}
        <div ref={messagesEndRef} />
      </div>

      {/* Input Area */}
      <div className="border-t p-4 bg-card">
        <div className="flex gap-2">
          <input
            ref={fileInputRef}
            type="file"
            accept="image/*"
            className="hidden"
            onChange={handleImageUpload}
          />
          <Button
            variant="outline"
            size="icon"
            onClick={() => fileInputRef.current?.click()}
            disabled={uploading}
          >
            {uploading ? (
              <Loader2 className="h-4 w-4 animate-spin" />
            ) : (
              <ImageIcon className="h-4 w-4" />
            )}
          </Button>
          <SmartTextarea
            value={newMessage}
            onChange={(value) => setNewMessage(value)}
            placeholder="Digite sua mensagem..."
            className="min-h-[60px] resize-none"
            onKeyDown={(e) => {
              if (e.key === 'Enter' && !e.shiftKey) {
                e.preventDefault();
                handleSend();
              }
            }}
          />
          <Button onClick={handleSend} disabled={sending || !newMessage.trim()}>
            {sending ? (
              <Loader2 className="h-4 w-4 animate-spin" />
            ) : (
              <Send className="h-4 w-4" />
            )}
          </Button>
        </div>
      </div>
      </div>

      {/* Edit Dialog */}
      <Dialog open={!!editingMessage} onOpenChange={(open) => !open && setEditingMessage(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Editar Mensagem</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <SmartTextarea
              value={editContent}
              onChange={(value) => setEditContent(value)}
              placeholder="Digite sua mensagem..."
              className="min-h-[120px] resize-none"
            />
            <div className="flex justify-end gap-2">
              <Button
                variant="outline"
                onClick={() => setEditingMessage(null)}
                disabled={updating}
              >
                Cancelar
              </Button>
              <Button
                onClick={handleUpdateMessage}
                disabled={updating || !editContent.trim()}
              >
                {updating ? (
                  <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    Salvando...
                  </>
                ) : (
                  'Salvar'
                )}
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      {/* Delete Confirmation Dialog */}
      <AlertDialog open={deleteDialogOpen} onOpenChange={setDeleteDialogOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Excluir Mensagem</AlertDialogTitle>
            <AlertDialogDescription>
              Tem certeza que deseja excluir esta mensagem? Esta ação não pode ser desfeita.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancelar</AlertDialogCancel>
            <AlertDialogAction onClick={handleDeleteMessage} className="bg-destructive text-destructive-foreground hover:bg-destructive/90">
              Excluir
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
}
