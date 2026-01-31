import type { ReactNode } from 'react';
import { useMemo, useState } from 'react';
import { CheckCircle2, MessageCircle } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Checkbox } from '@/components/ui/checkbox';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Textarea } from '@/components/ui/textarea';

interface BudgetWhatsAppModalProps {
  trigger: ReactNode;
}

const equipmentOptions = [
  'Notebook',
  'PC Gamer',
  'MacBook',
  'PlayStation',
  'Xbox',
  'Nintendo Switch',
  'Smart TV',
  'Placa de vídeo',
  'Outro',
];

const problemOptions = [
  'Não liga',
  'Tela sem imagem',
  'Aquecendo demais',
  'Sem áudio',
  'Travando / lento',
  'Queda / dano físico',
  'Reparo eletrônico avançado',
  'Outro',
];

const urgencyOptions = ['Hoje', 'Esta semana', 'Sem pressa'];

export function BudgetWhatsAppModal({ trigger }: BudgetWhatsAppModalProps) {
  const [open, setOpen] = useState(false);
  const [equipmentType, setEquipmentType] = useState('');
  const [brand, setBrand] = useState('');
  const [model, setModel] = useState('');
  const [problem, setProblem] = useState('');
  const [details, setDetails] = useState('');
  const [urgency, setUrgency] = useState('');
  const [hasMedia, setHasMedia] = useState(false);

  const whatsappUrl = useMemo(() => {
    const message = [
      'Olá! Quero um orçamento 😊',
      `Tipo: ${equipmentType || 'Não informado'}`,
      `Marca: ${brand || 'Não informado'}`,
      `Modelo: ${model || 'Não informado'}`,
      `Problema: ${problem || 'Não informado'}`,
      `Detalhes: ${details || 'Não informado'}`,
      `Urgência: ${urgency || 'Não informado'}`,
      `Tenho fotos/vídeo: ${hasMedia ? 'Sim' : 'Não'}`,
      'Site: infoshire.com.br',
    ].join('\n');

    return `https://wa.me/5519993352727?text=${encodeURIComponent(message)}`;
  }, [brand, details, equipmentType, hasMedia, model, problem, urgency]);

  const handleSubmit = (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    window.open(whatsappUrl, '_blank');
    setOpen(false);
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>{trigger}</DialogTrigger>
      <DialogContent className="w-[95vw] max-w-xl rounded-2xl border border-primary/30 bg-card/95 px-4 py-6 backdrop-blur-sm sm:px-8 sm:py-8">
        <DialogHeader className="space-y-3">
          <DialogTitle className="text-2xl font-bold text-primary">
            Pedir orçamento pelo WhatsApp
          </DialogTitle>
          <DialogDescription className="text-sm text-muted-foreground">
            Preencha as informações principais para receber um atendimento rápido e direto com nossa equipe técnica.
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="mt-4 space-y-4">
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            <div className="space-y-2">
              <Label htmlFor="equipment">Tipo de equipamento</Label>
              <Select value={equipmentType} onValueChange={setEquipmentType}>
                <SelectTrigger id="equipment" className="h-11">
                  <SelectValue placeholder="Selecione" />
                </SelectTrigger>
                <SelectContent>
                  {equipmentOptions.map((option) => (
                    <SelectItem key={option} value={option}>
                      {option}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label htmlFor="brand">Marca</Label>
              <Input
                id="brand"
                placeholder="Ex: Apple, Sony, Dell"
                value={brand}
                onChange={(event) => setBrand(event.target.value)}
                className="h-11"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="model">Modelo (opcional)</Label>
              <Input
                id="model"
                placeholder="Ex: PS5, MacBook Pro"
                value={model}
                onChange={(event) => setModel(event.target.value)}
                className="h-11"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="problem">Problema</Label>
              <Select value={problem} onValueChange={setProblem}>
                <SelectTrigger id="problem" className="h-11">
                  <SelectValue placeholder="Selecione" />
                </SelectTrigger>
                <SelectContent>
                  {problemOptions.map((option) => (
                    <SelectItem key={option} value={option}>
                      {option}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>

          <div className="space-y-2">
            <Label htmlFor="details">Detalhes rápidos</Label>
            <Textarea
              id="details"
              placeholder="Conte o que aconteceu ou sintomas principais"
              value={details}
              onChange={(event) => setDetails(event.target.value)}
              className="min-h-[96px] resize-none"
            />
          </div>

          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            <div className="space-y-2">
              <Label htmlFor="urgency">Urgência</Label>
              <Select value={urgency} onValueChange={setUrgency}>
                <SelectTrigger id="urgency" className="h-11">
                  <SelectValue placeholder="Selecione" />
                </SelectTrigger>
                <SelectContent>
                  {urgencyOptions.map((option) => (
                    <SelectItem key={option} value={option}>
                      {option}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="flex items-center gap-3 rounded-lg border border-border bg-background/40 p-3">
              <Checkbox
                id="hasMedia"
                checked={hasMedia}
                onCheckedChange={(checked) => setHasMedia(checked === true)}
              />
              <Label htmlFor="hasMedia" className="text-sm">
                Tenho fotos/vídeo
              </Label>
            </div>
          </div>

          <Button
            type="submit"
            size="lg"
            className="h-12 w-full bg-primary text-black hover:bg-primary/90"
          >
            <MessageCircle className="mr-2 h-5 w-5" />
            Enviar no WhatsApp
          </Button>

          <div className="flex items-center justify-center gap-2 text-xs text-muted-foreground">
            <CheckCircle2 className="h-4 w-4 text-primary" />
            Sua mensagem será enviada direto para nossa equipe.
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}
