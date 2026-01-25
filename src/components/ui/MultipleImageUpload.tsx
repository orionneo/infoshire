import { Camera, Loader2, Upload, X } from 'lucide-react';
import { useRef, useState } from 'react';
import { Button } from '@/components/ui/button';
import { supabase } from '@/db/supabase';
import { useToast } from '@/hooks/use-toast';

interface MultipleImageUploadProps {
  onImagesChange: (files: File[]) => void;
  maxImages?: number;
}

interface ImagePreview {
  file: File;
  preview: string;
}

export function MultipleImageUpload({ onImagesChange, maxImages = 10 }: MultipleImageUploadProps) {
  const [images, setImages] = useState<ImagePreview[]>([]);
  const [uploading, setUploading] = useState(false);
  const cameraInputRef = useRef<HTMLInputElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const { toast } = useToast();

  const compressImage = async (file: File): Promise<File> => {
    const MAX_SIZE = 800 * 1024; // 800KB
    
    return new Promise((resolve) => {
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
              console.error('Falha ao criar contexto do canvas');
              resolve(file);
              return;
            }
            
            ctx.drawImage(img, 0, 0, width, height);

            const tryCompress = (quality: number, attempt: number = 0) => {
              // Limite de tentativas
              if (attempt > 20) {
                console.warn('Limite de tentativas atingido');
                canvas.toBlob(
                  (blob) => {
                    if (blob) {
                      const finalFile = new File([blob], file.name.replace(/\.[^/.]+$/, '.webp'), {
                        type: 'image/webp',
                        lastModified: Date.now(),
                      });
                      resolve(finalFile);
                    } else {
                      resolve(file);
                    }
                  },
                  'image/webp',
                  0.1
                );
                return;
              }

              canvas.toBlob(
                (result) => {
                  if (!result) {
                    if (quality > 0.05) {
                      tryCompress(quality - 0.1, attempt + 1);
                    } else {
                      resolve(file);
                    }
                    return;
                  }

                  if (result.size > MAX_SIZE && quality > 0.05) {
                    tryCompress(quality - 0.1, attempt + 1);
                  } else {
                    const compressedFile = new File([result], file.name.replace(/\.[^/.]+$/, '.webp'), {
                      type: 'image/webp',
                      lastModified: Date.now(),
                    });
                    resolve(compressedFile);
                  }
                },
                'image/webp',
                quality
              );
            };

            tryCompress(0.7);
          } catch (error) {
            console.error('Erro durante compressão:', error);
            resolve(file);
          }
        };
        
        img.onerror = () => {
          console.error('Erro ao carregar imagem');
          resolve(file);
        };
      };
      
      reader.onerror = () => {
        console.error('Erro ao ler arquivo');
        resolve(file);
      };
    });
  };

  const handleFileSelect = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(e.target.files || []);
    
    if (files.length === 0) return;

    // Verificar limite de imagens
    if (images.length + files.length > maxImages) {
      toast({
        title: 'Limite excedido',
        description: `Você pode adicionar no máximo ${maxImages} fotos`,
        variant: 'destructive',
      });
      return;
    }

    // Validar tipo de arquivo
    const invalidFiles = files.filter(f => !f.type.startsWith('image/'));
    if (invalidFiles.length > 0) {
      toast({
        title: 'Arquivo inválido',
        description: 'Por favor, selecione apenas arquivos de imagem',
        variant: 'destructive',
      });
      return;
    }

    // Remover validação de tamanho - a compressão vai resolver
    setUploading(true);

    try {
      // Comprimir todas as imagens com tratamento de erro individual
      const compressedFiles = await Promise.all(
        files.map(async (file) => {
          try {
            console.log(`Comprimindo ${file.name}: ${(file.size / 1024).toFixed(0)}KB`);
            const compressed = await compressImage(file);
            console.log(`${file.name} comprimido: ${(compressed.size / 1024).toFixed(0)}KB`);
            return compressed;
          } catch (error) {
            console.error(`Erro ao comprimir ${file.name}:`, error);
            // Retornar arquivo original em caso de erro
            return file;
          }
        })
      );

      // Criar previews
      const newPreviews: ImagePreview[] = compressedFiles.map(file => ({
        file,
        preview: URL.createObjectURL(file),
      }));

      const updatedImages = [...images, ...newPreviews];
      setImages(updatedImages);
      onImagesChange(updatedImages.map(img => img.file));

      toast({
        title: 'Fotos adicionadas',
        description: `${files.length} foto(s) adicionada(s) com sucesso`,
      });
    } catch (error) {
      console.error('Erro ao processar imagens:', error);
      toast({
        title: 'Erro',
        description: 'Erro ao processar as imagens',
        variant: 'destructive',
      });
    } finally {
      setUploading(false);
      // Limpar input
      if (e.target) {
        e.target.value = '';
      }
    }
  };

  const removeImage = (index: number) => {
    const updatedImages = images.filter((_, i) => i !== index);
    setImages(updatedImages);
    onImagesChange(updatedImages.map(img => img.file));
    
    // Liberar URL do preview
    URL.revokeObjectURL(images[index].preview);
  };

  return (
    <div className="space-y-4">
      {/* Botões de upload */}
      <div className="flex gap-2">
        <Button
          type="button"
          variant="outline"
          onClick={() => fileInputRef.current?.click()}
          disabled={uploading || images.length >= maxImages}
          className="flex-1"
        >
          {uploading ? (
            <>
              <Loader2 className="h-4 w-4 mr-2 animate-spin" />
              Processando...
            </>
          ) : (
            <>
              <Upload className="h-4 w-4 mr-2" />
              Selecionar Fotos
            </>
          )}
        </Button>

        <Button
          type="button"
          variant="outline"
          onClick={() => cameraInputRef.current?.click()}
          disabled={uploading || images.length >= maxImages}
          className="flex-1"
        >
          <Camera className="h-4 w-4 mr-2" />
          Tirar Foto
        </Button>
      </div>

      {/* Inputs ocultos */}
      <input
        ref={fileInputRef}
        type="file"
        accept="image/*"
        multiple
        onChange={handleFileSelect}
        className="hidden"
      />
      <input
        ref={cameraInputRef}
        type="file"
        accept="image/*"
        capture="environment"
        onChange={handleFileSelect}
        className="hidden"
      />

      {/* Contador */}
      {images.length > 0 && (
        <p className="text-sm text-muted-foreground">
          {images.length} de {maxImages} foto(s) selecionada(s)
        </p>
      )}

      {/* Grid de previews */}
      {images.length > 0 && (
        <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
          {images.map((image, index) => (
            <div key={index} className="relative group">
              <div className="aspect-square rounded-lg overflow-hidden border border-border">
                <img
                  src={image.preview}
                  alt={`Preview ${index + 1}`}
                  className="w-full h-full object-cover"
                />
              </div>
              <Button
                type="button"
                variant="destructive"
                size="sm"
                className="absolute top-2 right-2 h-6 w-6 p-0 opacity-0 group-hover:opacity-100 transition-opacity"
                onClick={() => removeImage(index)}
              >
                <X className="h-4 w-4" />
              </Button>
              <div className="absolute bottom-2 left-2 bg-black/70 text-white text-xs px-2 py-1 rounded">
                Foto {index + 1}
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Mensagem de ajuda */}
      <p className="text-xs text-muted-foreground">
        Você pode adicionar múltiplas fotos do equipamento. Máximo {maxImages} fotos, 5MB cada.
      </p>
    </div>
  );
}
