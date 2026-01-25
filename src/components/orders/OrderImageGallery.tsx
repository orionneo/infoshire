import { Image as ImageIcon, Loader2, Upload, X, ZoomIn } from 'lucide-react';
import { useEffect, useState } from 'react';
import { toast } from 'sonner';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { SmartTextarea } from '@/components/ui/SmartTextarea';
import { useAuth } from '@/contexts/AuthContext';
import { createMessage, deleteOrderImage, getOrderImages, uploadOrderImage } from '@/db/api';
import { OrderImageWithUploader } from '@/types/types';

interface OrderImageGalleryProps {
  orderId: string;
  isAdmin?: boolean;
  onImageUploaded?: () => void;
}

export function OrderImageGallery({ orderId, isAdmin = false, onImageUploaded }: OrderImageGalleryProps) {
  const { profile } = useAuth();
  const [images, setImages] = useState<OrderImageWithUploader[]>([]);
  const [loading, setLoading] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [description, setDescription] = useState('');
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const [selectedImage, setSelectedImage] = useState<OrderImageWithUploader | null>(null);

  // Load images
  const loadImages = async () => {
    try {
      setLoading(true);
      const data = await getOrderImages(orderId);
      setImages(data as OrderImageWithUploader[]);
    } catch (error) {
      console.error('Erro ao carregar imagens:', error);
      toast.error('Erro ao carregar imagens');
    } finally {
      setLoading(false);
    }
  };

  // Handle file selection
  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      // Validate file type
      if (!file.type.startsWith('image/')) {
        toast.error('Por favor, selecione apenas arquivos de imagem');
        return;
      }

      // Validate file size (max 5MB before compression)
      if (file.size > 5 * 1024 * 1024) {
        toast.error('Arquivo muito grande. Máximo 5MB');
        return;
      }

      setSelectedFile(file);
      const url = URL.createObjectURL(file);
      setPreviewUrl(url);
    }
  };

  // Handle upload
  const handleUpload = async () => {
    if (!selectedFile || !profile) return;

    try {
      setUploading(true);
      const uploadedImage = await uploadOrderImage(orderId, selectedFile, description);
      
      // Criar mensagem automática direcionando para a aba Fotos
      const messageText = description 
        ? `📷 Nova foto adicionada: ${description}\n\n👉 Clique na aba "Fotos" acima para visualizar`
        : `📷 Nova foto do equipamento adicionada\n\n👉 Clique na aba "Fotos" acima para visualizar`;
      
      try {
        await createMessage({
          order_id: orderId,
          sender_id: profile.id,
          content: messageText,
        });
      } catch (msgError) {
        console.error('Erro ao criar mensagem automática:', msgError);
        // Não bloquear o upload se a mensagem falhar
      }

      toast.success('Foto enviada com sucesso!');
      setSelectedFile(null);
      setPreviewUrl(null);
      setDescription('');
      await loadImages();
      
      // Notificar componente pai para atualizar mensagens
      if (onImageUploaded) {
        onImageUploaded();
      }
    } catch (error) {
      console.error('Erro ao enviar foto:', error);
      toast.error('Erro ao enviar foto');
    } finally {
      setUploading(false);
    }
  };

  // Handle delete
  const handleDelete = async (imageId: string) => {
    if (!confirm('Tem certeza que deseja excluir esta foto?')) return;

    try {
      await deleteOrderImage(imageId);
      toast.success('Foto excluída com sucesso');
      await loadImages();
    } catch (error) {
      console.error('Erro ao excluir foto:', error);
      toast.error('Erro ao excluir foto');
    }
  };

  // Load images on mount
  useEffect(() => {
    loadImages();
  }, [orderId]);

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <ImageIcon className="h-5 w-5" />
          Fotos do Equipamento
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        {/* Upload Section (Admin Only) */}
        {isAdmin && profile?.role === 'admin' && (
          <div className="space-y-4 p-4 border border-primary/30 rounded-lg bg-card/50">
            <h3 className="font-semibold text-sm">Enviar Nova Foto</h3>
            
            <div className="space-y-2">
              <Label htmlFor="image-upload">Selecionar Foto</Label>
              <Input
                id="image-upload"
                type="file"
                accept="image/*"
                onChange={handleFileSelect}
                disabled={uploading}
              />
              <p className="text-xs text-muted-foreground">
                Formatos: JPG, PNG, WEBP. Máximo 5MB (será comprimido automaticamente)
              </p>
            </div>

            {previewUrl && (
              <div className="space-y-2">
                <Label>Pré-visualização</Label>
                <img
                  src={previewUrl}
                  alt="Preview"
                  className="w-full h-48 object-contain rounded-lg border border-border"
                />
              </div>
            )}

            <div className="space-y-2">
              <Label htmlFor="description">Descrição (opcional)</Label>
              <SmartTextarea
                id="description"
                value={description}
                onChange={(value) => setDescription(value)}
                placeholder="Ex: Vista frontal do equipamento, defeito identificado..."
                disabled={uploading}
                rows={2}
              />
            </div>

            <Button
              onClick={handleUpload}
              disabled={!selectedFile || uploading}
              className="w-full neon-hover"
            >
              {uploading ? (
                <>
                  <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                  Enviando...
                </>
              ) : (
                <>
                  <Upload className="h-4 w-4 mr-2" />
                  Enviar Foto
                </>
              )}
            </Button>
          </div>
        )}

        {/* Images Grid */}
        {loading ? (
          <div className="flex items-center justify-center py-8">
            <Loader2 className="h-6 w-6 animate-spin text-primary" />
          </div>
        ) : images.length === 0 ? (
          <div className="text-center py-8 text-muted-foreground">
            <ImageIcon className="h-12 w-12 mx-auto mb-2 opacity-50" />
            <p>Nenhuma foto enviada ainda</p>
          </div>
        ) : (
          <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
            {images.map((image) => (
              <div key={image.id} className="relative group">
                <Dialog>
                  <DialogTrigger asChild>
                    <div
                      className="relative aspect-square rounded-lg overflow-hidden border border-border cursor-pointer hover:border-primary transition-colors bg-muted"
                      onClick={() => setSelectedImage(image)}
                    >
                      <img
                        src={image.image_url}
                        alt={image.description || 'Foto do equipamento'}
                        className="w-full h-full object-cover"
                        loading="lazy"
                        onError={(e) => {
                          // Fallback para imagem quebrada
                          const target = e.target as HTMLImageElement;
                          target.style.display = 'none';
                          const parent = target.parentElement;
                          if (parent && !parent.querySelector('.fallback-icon')) {
                            const fallback = document.createElement('div');
                            fallback.className = 'fallback-icon absolute inset-0 flex items-center justify-center text-muted-foreground';
                            fallback.innerHTML = '<svg class="h-12 w-12" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z"></path></svg>';
                            parent.appendChild(fallback);
                          }
                        }}
                      />
                      <div className="absolute inset-0 bg-black/50 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center">
                        <ZoomIn className="h-8 w-8 text-white" />
                      </div>
                    </div>
                  </DialogTrigger>
                  <DialogContent className="max-w-4xl">
                    <DialogHeader>
                      <DialogTitle>Foto do Equipamento</DialogTitle>
                    </DialogHeader>
                    <div className="space-y-4">
                      <img
                        src={image.image_url}
                        alt={image.description || 'Foto do equipamento'}
                        className="w-full h-auto rounded-lg"
                        onError={(e) => {
                          const target = e.target as HTMLImageElement;
                          target.src = 'data:image/svg+xml,%3Csvg xmlns="http://www.w3.org/2000/svg" width="400" height="300" viewBox="0 0 400 300"%3E%3Crect fill="%23ddd" width="400" height="300"/%3E%3Ctext fill="%23999" font-family="sans-serif" font-size="18" dy="10.5" font-weight="bold" x="50%25" y="50%25" text-anchor="middle"%3EImagem não disponível%3C/text%3E%3C/svg%3E';
                        }}
                      />
                      {image.description && (
                        <div>
                          <p className="text-sm font-semibold mb-1">Descrição:</p>
                          <p className="text-sm text-muted-foreground">{image.description}</p>
                        </div>
                      )}
                      <div className="text-xs text-muted-foreground">
                        <p>Enviado por: {image.uploader?.name || 'Técnico'}</p>
                        <p>Data: {new Date(image.created_at).toLocaleString('pt-BR')}</p>
                      </div>
                    </div>
                  </DialogContent>
                </Dialog>

                {isAdmin && profile?.role === 'admin' && (
                  <Button
                    variant="destructive"
                    size="icon"
                    className="absolute top-2 right-2 h-6 w-6 opacity-0 group-hover:opacity-100 transition-opacity"
                    onClick={() => handleDelete(image.id)}
                  >
                    <X className="h-4 w-4" />
                  </Button>
                )}

                {image.description && (
                  <p className="text-xs text-muted-foreground mt-1 line-clamp-2">
                    {image.description}
                  </p>
                )}
              </div>
            ))}
          </div>
        )}
      </CardContent>
    </Card>
  );
}
