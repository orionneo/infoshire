import { Eye, Loader2, Save } from 'lucide-react';
import { useEffect, useState } from 'react';
import { useForm } from 'react-hook-form';
import { AdminLayout } from '@/components/layouts/AdminLayout';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Form, FormControl, FormDescription, FormField, FormItem, FormLabel, FormMessage } from '@/components/ui/form';
import { ImageUpload } from '@/components/ui/ImageUpload';
import { Input } from '@/components/ui/input';
import { Switch } from '@/components/ui/switch';
import { Textarea } from '@/components/ui/textarea';
import { getPopupConfig, updatePopupConfig } from '@/db/api';
import { useToast } from '@/hooks/use-toast';
import type { PopupConfig } from '@/types/types';

export default function AdminPopup() {
  const { toast } = useToast();
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [popupConfig, setPopupConfig] = useState<PopupConfig | null>(null);
  const [previewOpen, setPreviewOpen] = useState(false);

  const form = useForm({
    defaultValues: {
      is_active: false,
      title: '',
      description: '',
      image_url: '',
      button_text: 'Fechar',
    },
  });

  useEffect(() => {
    loadPopupConfig();
  }, []);

  const loadPopupConfig = async () => {
    try {
      setLoading(true);
      const config = await getPopupConfig();
      if (config) {
        setPopupConfig(config);
        form.reset({
          is_active: config.is_active,
          title: config.title,
          description: config.description || '',
          image_url: config.image_url || '',
          button_text: config.button_text,
        });
      }
    } catch (error) {
      console.error('Erro ao carregar configuração do popup:', error);
      toast({
        title: 'Erro',
        description: 'Não foi possível carregar a configuração do popup',
        variant: 'destructive',
      });
    } finally {
      setLoading(false);
    }
  };

  const onSubmit = async (data: any) => {
    if (!popupConfig) return;

    try {
      setSaving(true);
      await updatePopupConfig(popupConfig.id, {
        is_active: data.is_active,
        title: data.title,
        description: data.description || null,
        image_url: data.image_url || null,
        button_text: data.button_text,
      });

      toast({
        title: 'Sucesso',
        description: 'Configuração do popup atualizada com sucesso',
      });

      loadPopupConfig();
    } catch (error) {
      console.error('Erro ao salvar configuração:', error);
      toast({
        title: 'Erro',
        description: 'Não foi possível salvar a configuração',
        variant: 'destructive',
      });
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return (
      <AdminLayout>
        <div className="flex items-center justify-center min-h-[400px]">
          <Loader2 className="h-8 w-8 animate-spin text-primary" />
        </div>
      </AdminLayout>
    );
  }

  return (
    <AdminLayout>
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold">Popup Promocional</h1>
            <p className="text-muted-foreground mt-2">
              Configure o popup que aparece na página inicial do site
            </p>
          </div>
          <Dialog open={previewOpen} onOpenChange={setPreviewOpen}>
            <DialogTrigger asChild>
              <Button variant="outline">
                <Eye className="h-4 w-4 mr-2" />
                Visualizar
              </Button>
            </DialogTrigger>
            <DialogContent className="max-w-2xl">
              <DialogHeader>
                <DialogTitle>Pré-visualização do Popup</DialogTitle>
              </DialogHeader>
              <div className="space-y-4">
                {form.watch('image_url') && (
                  <div className="relative">
                    <img
                      src={form.watch('image_url')}
                      alt="Preview"
                      className="w-full rounded-lg object-cover max-h-64"
                    />
                    <p className="text-xs text-muted-foreground mt-2 text-center">
                      💬 Ao clicar na imagem, abre WhatsApp para saber mais
                    </p>
                  </div>
                )}
                <div>
                  <h2 className="text-2xl font-bold">{form.watch('title') || 'Título do Popup'}</h2>
                  {form.watch('description') && (
                    <p className="text-muted-foreground mt-2 whitespace-pre-wrap">
                      {form.watch('description')}
                    </p>
                  )}
                </div>
                <Button className="w-full">
                  {form.watch('button_text') || 'Fechar'}
                </Button>
              </div>
            </DialogContent>
          </Dialog>
        </div>

        <Card>
          <CardHeader>
            <CardTitle>Configuração do Popup</CardTitle>
            <CardDescription>
              Personalize o conteúdo e a aparência do popup promocional
            </CardDescription>
          </CardHeader>
          <CardContent>
            <Form {...form}>
              <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
                {/* Ativar/Desativar */}
                <FormField
                  control={form.control}
                  name="is_active"
                  render={({ field }) => (
                    <FormItem className="flex items-center justify-between rounded-lg border p-4">
                      <div className="space-y-0.5">
                        <FormLabel className="text-base">Ativar Popup</FormLabel>
                        <FormDescription>
                          Exibir o popup na página inicial do site
                        </FormDescription>
                      </div>
                      <FormControl>
                        <Switch
                          checked={field.value}
                          onCheckedChange={field.onChange}
                        />
                      </FormControl>
                    </FormItem>
                  )}
                />

                {/* Título */}
                <FormField
                  control={form.control}
                  name="title"
                  rules={{ required: 'Título é obrigatório' }}
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Título</FormLabel>
                      <FormControl>
                        <Input
                          placeholder="Ex: Promoção Especial!"
                          {...field}
                        />
                      </FormControl>
                      <FormDescription>
                        Título principal do popup
                      </FormDescription>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                {/* Descrição */}
                <FormField
                  control={form.control}
                  name="description"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Descrição</FormLabel>
                      <FormControl>
                        <Textarea
                          placeholder="Descreva a promoção ou informação que deseja destacar..."
                          className="min-h-[120px]"
                          {...field}
                        />
                      </FormControl>
                      <FormDescription>
                        Texto descritivo do popup (opcional)
                      </FormDescription>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                {/* Imagem */}
                <FormField
                  control={form.control}
                  name="image_url"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Imagem</FormLabel>
                      <FormControl>
                        <ImageUpload
                          currentImageUrl={field.value}
                          onUploadComplete={(url) => {
                            field.onChange(url);
                          }}
                          onRemove={() => {
                            field.onChange('');
                          }}
                        />
                      </FormControl>
                      <FormDescription>
                        Imagem promocional do popup. Ao clicar na imagem, o cliente será direcionado ao WhatsApp (+55 19 99335-2727) para saber mais sobre a promoção.
                      </FormDescription>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                {/* Texto do Botão */}
                <FormField
                  control={form.control}
                  name="button_text"
                  rules={{ required: 'Texto do botão é obrigatório' }}
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Texto do Botão</FormLabel>
                      <FormControl>
                        <Input
                          placeholder="Ex: Fechar, Entendi, Ver Promoção"
                          {...field}
                        />
                      </FormControl>
                      <FormDescription>
                        Texto exibido no botão de fechar
                      </FormDescription>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                {/* Botão Salvar */}
                <div className="flex justify-end gap-2">
                  <Button
                    type="button"
                    variant="outline"
                    onClick={() => form.reset()}
                    disabled={saving}
                  >
                    Cancelar
                  </Button>
                  <Button type="submit" disabled={saving}>
                    {saving ? (
                      <>
                        <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                        Salvando...
                      </>
                    ) : (
                      <>
                        <Save className="h-4 w-4 mr-2" />
                        Salvar Alterações
                      </>
                    )}
                  </Button>
                </div>
              </form>
            </Form>
          </CardContent>
        </Card>
      </div>
    </AdminLayout>
  );
}
