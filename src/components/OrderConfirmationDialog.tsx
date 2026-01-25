import { AlertCircle, CheckCircle2, User, Wrench, FileText, Calendar, Image as ImageIcon, Package } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Card, CardContent } from '@/components/ui/card';
import { Separator } from '@/components/ui/separator';
import { Badge } from '@/components/ui/badge';
import { ScrollArea } from '@/components/ui/scroll-area';
import type { Profile } from '@/types/types';

interface OrderConfirmationData {
  // Cliente
  client?: Profile;
  isNewClient?: boolean;
  newClientData?: {
    first_name: string;
    last_name: string;
    email: string;
    phone: string;
  };
  // Equipamento principal
  equipment: string;
  serial_number?: string;
  problem_description: string;
  equipment_photo_url?: string;
  // Itens adicionais
  hasMultipleItems?: boolean;
  additionalItems?: Array<{
    equipment: string;
    serial_number?: string;
    description?: string;
  }>;
  // Imagens
  selectedImages?: File[];
}

interface OrderConfirmationDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  data: OrderConfirmationData;
  onConfirm: () => void;
  loading?: boolean;
}

export function OrderConfirmationDialog({
  open,
  onOpenChange,
  data,
  onConfirm,
  loading = false,
}: OrderConfirmationDialogProps) {
  const {
    client,
    isNewClient,
    newClientData,
    equipment,
    serial_number,
    problem_description,
    equipment_photo_url,
    hasMultipleItems,
    additionalItems,
    selectedImages,
  } = data;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-3xl max-h-[90vh]">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <CheckCircle2 className="h-5 w-5 text-primary" />
            Confirmar Abertura de Ordem de Serviço
          </DialogTitle>
          <DialogDescription>
            Revise todos os dados antes de criar a ordem de serviço
          </DialogDescription>
        </DialogHeader>

        <ScrollArea className="max-h-[60vh] pr-4">
          <div className="space-y-4">
            {/* Informações do Cliente */}
            <Card>
              <CardContent className="pt-6">
                <div className="flex items-center gap-2 mb-3">
                  <User className="h-4 w-4 text-primary" />
                  <h3 className="font-semibold">Informações do Cliente</h3>
                  {isNewClient && (
                    <Badge variant="secondary" className="ml-auto">
                      Novo Cliente
                    </Badge>
                  )}
                </div>
                <Separator className="mb-3" />
                <div className="space-y-2 text-sm">
                  {isNewClient && newClientData ? (
                    <>
                      <div className="flex justify-between">
                        <span className="text-muted-foreground">Nome:</span>
                        <span className="font-medium">
                          {newClientData.first_name} {newClientData.last_name}
                        </span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-muted-foreground">E-mail:</span>
                        <span className="font-medium">{newClientData.email}</span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-muted-foreground">Telefone:</span>
                        <span className="font-medium">{newClientData.phone}</span>
                      </div>
                    </>
                  ) : client ? (
                    <>
                      <div className="flex justify-between">
                        <span className="text-muted-foreground">Nome:</span>
                        <span className="font-medium">{client.name}</span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-muted-foreground">E-mail:</span>
                        <span className="font-medium">{client.email}</span>
                      </div>
                      {client.phone && (
                        <div className="flex justify-between">
                          <span className="text-muted-foreground">Telefone:</span>
                          <span className="font-medium">{client.phone}</span>
                        </div>
                      )}
                    </>
                  ) : (
                    <div className="text-destructive text-sm">
                      ⚠️ Nenhum cliente selecionado
                    </div>
                  )}
                </div>
              </CardContent>
            </Card>

            {/* Equipamento Principal */}
            <Card>
              <CardContent className="pt-6">
                <div className="flex items-center gap-2 mb-3">
                  <Wrench className="h-4 w-4 text-primary" />
                  <h3 className="font-semibold">Equipamento Principal</h3>
                </div>
                <Separator className="mb-3" />
                <div className="space-y-2 text-sm">
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">Equipamento:</span>
                    <span className="font-medium">{equipment || '—'}</span>
                  </div>
                  {serial_number && (
                    <div className="flex justify-between">
                      <span className="text-muted-foreground">Número de Série:</span>
                      <span className="font-medium font-mono text-xs">{serial_number}</span>
                    </div>
                  )}
                  {equipment_photo_url && (
                    <div className="flex items-center gap-2 text-green-600">
                      <ImageIcon className="h-4 w-4" />
                      <span className="text-xs">Foto do equipamento incluída</span>
                    </div>
                  )}
                </div>
              </CardContent>
            </Card>

            {/* Descrição do Problema */}
            <Card>
              <CardContent className="pt-6">
                <div className="flex items-center gap-2 mb-3">
                  <FileText className="h-4 w-4 text-primary" />
                  <h3 className="font-semibold">Descrição do Problema</h3>
                </div>
                <Separator className="mb-3" />
                <div className="text-sm bg-muted/50 p-3 rounded-md whitespace-pre-wrap">
                  {problem_description || (
                    <span className="text-muted-foreground italic">Nenhuma descrição fornecida</span>
                  )}
                </div>
              </CardContent>
            </Card>

            {/* Itens Adicionais */}
            {hasMultipleItems && additionalItems && additionalItems.length > 0 && (
              <Card>
                <CardContent className="pt-6">
                  <div className="flex items-center gap-2 mb-3">
                    <Package className="h-4 w-4 text-primary" />
                    <h3 className="font-semibold">Itens Adicionais</h3>
                    <Badge variant="secondary" className="ml-auto">
                      {additionalItems.length} {additionalItems.length === 1 ? 'item' : 'itens'}
                    </Badge>
                  </div>
                  <Separator className="mb-3" />
                  <div className="space-y-3">
                    {additionalItems.map((item, index) => (
                      <div key={index} className="bg-muted/30 p-3 rounded-md space-y-1">
                        <div className="flex items-center gap-2">
                          <Badge variant="outline" className="text-xs">
                            Item {index + 1}
                          </Badge>
                          <span className="font-medium text-sm">{item.equipment}</span>
                        </div>
                        {item.serial_number && (
                          <div className="text-xs text-muted-foreground">
                            Série: <span className="font-mono">{item.serial_number}</span>
                          </div>
                        )}
                        {item.description && (
                          <div className="text-xs text-muted-foreground">
                            {item.description}
                          </div>
                        )}
                      </div>
                    ))}
                  </div>
                </CardContent>
              </Card>
            )}

            {/* Imagens Anexadas */}
            {selectedImages && selectedImages.length > 0 && (
              <Card>
                <CardContent className="pt-6">
                  <div className="flex items-center gap-2 mb-3">
                    <ImageIcon className="h-4 w-4 text-primary" />
                    <h3 className="font-semibold">Imagens Anexadas</h3>
                    <Badge variant="secondary" className="ml-auto">
                      {selectedImages.length} {selectedImages.length === 1 ? 'imagem' : 'imagens'}
                    </Badge>
                  </div>
                  <Separator className="mb-3" />
                  <div className="grid grid-cols-4 gap-2">
                    {selectedImages.map((file, index) => (
                      <div key={index} className="relative aspect-square rounded-md overflow-hidden bg-muted">
                        <img
                          src={URL.createObjectURL(file)}
                          alt={`Imagem ${index + 1}`}
                          className="w-full h-full object-cover"
                        />
                        <div className="absolute bottom-0 left-0 right-0 bg-black/60 text-white text-xs p-1 text-center">
                          {index + 1}
                        </div>
                      </div>
                    ))}
                  </div>
                </CardContent>
              </Card>
            )}

            {/* Informações Automáticas */}
            <Card className="bg-blue-50/50 dark:bg-blue-950/20 border-blue-200 dark:border-blue-800">
              <CardContent className="pt-6">
                <div className="flex items-center gap-2 mb-3">
                  <Calendar className="h-4 w-4 text-blue-600" />
                  <h3 className="font-semibold text-blue-900 dark:text-blue-100">
                    Informações Automáticas
                  </h3>
                </div>
                <Separator className="mb-3" />
                <div className="space-y-2 text-sm text-blue-900 dark:text-blue-100">
                  <div className="flex items-start gap-2">
                    <span className="text-blue-600">•</span>
                    <span>Data de entrada será registrada automaticamente</span>
                  </div>
                  <div className="flex items-start gap-2">
                    <span className="text-blue-600">•</span>
                    <span>Previsão de conclusão será definida para 3 dias após a entrada</span>
                  </div>
                  <div className="flex items-start gap-2">
                    <span className="text-blue-600">•</span>
                    <span>Status inicial: <Badge variant="secondary" className="ml-1">Recebido</Badge></span>
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* Aviso */}
            <Card className="bg-yellow-50/50 dark:bg-yellow-950/20 border-yellow-200 dark:border-yellow-800">
              <CardContent className="pt-6">
                <div className="flex items-start gap-3">
                  <AlertCircle className="h-5 w-5 text-yellow-600 flex-shrink-0 mt-0.5" />
                  <div className="space-y-1">
                    <p className="font-medium text-yellow-900 dark:text-yellow-100">
                      Atenção
                    </p>
                    <p className="text-sm text-yellow-800 dark:text-yellow-200">
                      Após confirmar, a ordem de serviço será criada e o cliente receberá notificação.
                      Certifique-se de que todos os dados estão corretos.
                    </p>
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>
        </ScrollArea>

        <DialogFooter className="gap-2">
          <Button
            type="button"
            variant="outline"
            onClick={() => onOpenChange(false)}
            disabled={loading}
          >
            Voltar e Editar
          </Button>
          <Button
            type="button"
            onClick={onConfirm}
            disabled={loading}
            className="min-w-[140px]"
          >
            {loading ? (
              <>
                <span className="animate-spin mr-2">⏳</span>
                Criando...
              </>
            ) : (
              <>
                <CheckCircle2 className="h-4 w-4 mr-2" />
                Confirmar e Criar OS
              </>
            )}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
