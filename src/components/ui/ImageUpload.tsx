import { Camera, Loader2, Upload, X } from 'lucide-react';
import { useRef, useState } from 'react';
import { Button } from '@/components/ui/button';
import { supabase } from '@/db/supabase';
import { useToast } from '@/hooks/use-toast';

interface ImageUploadProps {
  onUploadComplete: (url: string) => void;
  currentImageUrl?: string;
  onRemove?: () => void;
}

export function ImageUpload({ onUploadComplete, currentImageUrl, onRemove }: ImageUploadProps) {
  const [uploading, setUploading] = useState(false);
  const [preview, setPreview] = useState<string | null>(currentImageUrl || null);
  const cameraInputRef = useRef<HTMLInputElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const { toast } = useToast();

  const compressImage = async (file: File): Promise<File> => {
    // Tamanho máximo: 800KB
    const MAX_SIZE = 800 * 1024;
    
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.readAsDataURL(file);
      
      reader.onload = (event) => {
        const img = new Image();
        img.src = event.target?.result as string;
        
        img.onload = () => {
          try {
            const canvas = document.createElement('canvas');
            let width = img.width;
            let height = img.height;

            // Redimensionar para max 1280x720
            const MAX_WIDTH = 1280;
            const MAX_HEIGHT = 720;

            if (width > height) {
              if (width > MAX_WIDTH) {
                height = Math.round((height * MAX_WIDTH) / width);
                width = MAX_WIDTH;
              }
            } else {
              if (height > MAX_HEIGHT) {
                width = Math.round((width * MAX_HEIGHT) / height);
                height = MAX_HEIGHT;
              }
            }

            canvas.width = width;
            canvas.height = height;

            const ctx = canvas.getContext('2d');
            if (!ctx) {
              reject(new Error('Falha ao criar contexto do canvas'));
              return;
            }
            
            ctx.drawImage(img, 0, 0, width, height);

            // Função recursiva para comprimir até atingir o tamanho máximo
            const tryCompress = (quality: number, attempt: number = 0) => {
              // Limite de tentativas para evitar loop infinito
              if (attempt > 20) {
                console.warn('Limite de tentativas atingido, usando última compressão');
                canvas.toBlob(
                  (blob) => {
                    if (blob) {
                      const finalFile = new File([blob], file.name.replace(/\.[^/.]+$/, '.webp'), {
                        type: 'image/webp',
                        lastModified: Date.now(),
                      });
                      resolve(finalFile);
                    } else {
                      // Fallback: retornar arquivo original se tudo falhar
                      resolve(file);
                    }
                  },
                  'image/webp',
                  0.1
                );
                return;
              }

              canvas.toBlob(
                (blob) => {
                  if (!blob) {
                    // Se falhar, tentar com qualidade menor
                    if (quality > 0.05) {
                      tryCompress(quality - 0.1, attempt + 1);
                    } else {
                      // Último recurso: retornar arquivo original
                      resolve(file);
                    }
                    return;
                  }

                  console.log(`Tentativa ${attempt + 1} - Qualidade ${quality.toFixed(2)}: ${(blob.size / 1024).toFixed(0)}KB`);
                  
                  // Se ainda está muito grande e a qualidade pode ser reduzida
                  if (blob.size > MAX_SIZE && quality > 0.05) {
                    tryCompress(quality - 0.1, attempt + 1);
                  } else {
                    const compressedFile = new File([blob], file.name.replace(/\.[^/.]+$/, '.webp'), {
                      type: 'image/webp',
                      lastModified: Date.now(),
                    });
                    console.log(`Compressão final: ${(compressedFile.size / 1024).toFixed(0)}KB`);
                    resolve(compressedFile);
                  }
                },
                'image/webp',
                quality
              );
            };

            // Começar com qualidade 0.7
            tryCompress(0.7);
          } catch (error) {
            console.error('Erro durante compressão:', error);
            // Fallback: retornar arquivo original
            resolve(file);
          }
        };
        
        img.onerror = () => {
          console.error('Erro ao carregar imagem');
          // Fallback: retornar arquivo original
          resolve(file);
        };
      };
      
      reader.onerror = () => {
        console.error('Erro ao ler arquivo');
        // Fallback: retornar arquivo original
        resolve(file);
      };
    });
  };

  const sanitizeFileName = (fileName: string): string => {
    // Remover extensão
    const nameWithoutExt = fileName.replace(/\.[^/.]+$/, '');
    // Manter apenas letras, números e underscores
    const sanitized = nameWithoutExt.replace(/[^a-zA-Z0-9_]/g, '_');
    // Adicionar timestamp para unicidade
    return `${sanitized}_${Date.now()}.webp`;
  };

  const handleFileSelect = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    // Validar tipo de arquivo
    const validTypes = ['image/jpeg', 'image/png', 'image/webp', 'image/gif', 'image/avif'];
    if (!validTypes.includes(file.type)) {
      toast({
        title: 'Formato inválido',
        description: 'Por favor, selecione uma imagem (JPEG, PNG, WEBP, GIF ou AVIF)',
        variant: 'destructive',
      });
      return;
    }

    setUploading(true);

    try {
      // SEMPRE comprimir a imagem, independente do tamanho
      console.log(`Arquivo original: ${(file.size / 1024).toFixed(0)}KB`);
      const fileToUpload = await compressImage(file);
      console.log(`Arquivo após compressão: ${(fileToUpload.size / 1024).toFixed(0)}KB`);
      
      const wasCompressed = fileToUpload.size < file.size;

      // Sanitizar nome do arquivo
      const sanitizedFileName = sanitizeFileName(file.name);

      // Upload para Supabase Storage
      const { data, error } = await supabase.storage
        .from('app-8pj0bpgfx6v5_equipment_photos')
        .upload(sanitizedFileName, fileToUpload, {
          cacheControl: '3600',
          upsert: false,
        });

      if (error) {
        console.error('Erro no upload do Supabase:', error);
        throw error;
      }

      // Obter URL pública
      const { data: urlData } = supabase.storage
        .from('app-8pj0bpgfx6v5_equipment_photos')
        .getPublicUrl(data.path);

      setPreview(urlData.publicUrl);
      onUploadComplete(urlData.publicUrl);

      toast({
        title: 'Upload concluído!',
        description: wasCompressed
          ? `Imagem comprimida automaticamente para ${(fileToUpload.size / 1024).toFixed(0)}KB`
          : 'Foto do equipamento enviada com sucesso',
      });
    } catch (error: any) {
      console.error('Erro no upload:', error);
      toast({
        title: 'Erro no upload',
        description: error.message || 'Não foi possível enviar a imagem. Tente novamente.',
        variant: 'destructive',
      });
    } finally {
      setUploading(false);
      // Limpar ambos os inputs
      if (fileInputRef.current) {
        fileInputRef.current.value = '';
      }
      if (cameraInputRef.current) {
        cameraInputRef.current.value = '';
      }
    }
  };

  const handleRemove = () => {
    setPreview(null);
    if (onRemove) {
      onRemove();
    }
  };

  return (
    <div className="space-y-3">
      {/* Input para câmera (com capture) */}
      <input
        ref={cameraInputRef}
        type="file"
        accept="image/jpeg,image/png,image/webp,image/gif,image/avif"
        onChange={handleFileSelect}
        className="hidden"
        capture="environment"
      />

      {/* Input para escolher arquivo (sem capture) */}
      <input
        ref={fileInputRef}
        type="file"
        accept="image/jpeg,image/png,image/webp,image/gif,image/avif"
        onChange={handleFileSelect}
        className="hidden"
      />

      {preview ? (
        <div className="relative">
          <img
            src={preview}
            alt="Foto do equipamento"
            className="w-full h-48 object-cover rounded-lg border-2 border-border"
          />
          <Button
            type="button"
            variant="destructive"
            size="icon"
            className="absolute top-2 right-2"
            onClick={handleRemove}
            disabled={uploading}
          >
            <X className="h-4 w-4" />
          </Button>
        </div>
      ) : (
        <div className="flex gap-2">
          <Button
            type="button"
            variant="outline"
            className="flex-1"
            onClick={() => cameraInputRef.current?.click()}
            disabled={uploading}
          >
            {uploading ? (
              <>
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                Enviando...
              </>
            ) : (
              <>
                <Camera className="mr-2 h-4 w-4" />
                Tirar Foto
              </>
            )}
          </Button>
          <Button
            type="button"
            variant="outline"
            className="flex-1"
            onClick={() => fileInputRef.current?.click()}
            disabled={uploading}
          >
            {uploading ? (
              <>
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                Enviando...
              </>
            ) : (
              <>
                <Upload className="mr-2 h-4 w-4" />
                Escolher Arquivo
              </>
            )}
          </Button>
        </div>
      )}

      <p className="text-xs text-muted-foreground">
        Formatos aceitos: JPEG, PNG, WEBP, GIF, AVIF. Máximo 800KB (compressão automática aplicada)
      </p>
    </div>
  );
}
