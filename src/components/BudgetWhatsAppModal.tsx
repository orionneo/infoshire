import type { ReactNode } from 'react';
import { useEffect, useMemo, useRef, useState } from 'react';
import { CheckCircle2, MessageCircle } from 'lucide-react';
import { Button } from '@/components/ui/button';
import {
  Dialog,
  DialogClose,
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
  trigger?: ReactNode;
  open?: boolean;
  onOpenChange?: (open: boolean) => void;
}

const equipmentOptions = [
  'Notebook',
  'PC',
  'Mac',
  'Videogame',
  'Smartphone',
  'Placa',
  'TV',
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

const urgencyOptions = ['Hoje', 'Essa semana', 'Sem pressa'];

const brandSuggestions = [
  'Apple',
  'Samsung',
  'Sony',
  'Microsoft',
  'Nintendo',
  'Dell',
  'Lenovo',
  'Asus',
  'Acer',
  'HP',
  'LG',
];

export function BudgetWhatsAppModal({ trigger, open, onOpenChange }: BudgetWhatsAppModalProps) {
  const [internalOpen, setInternalOpen] = useState(false);
  const [equipmentType, setEquipmentType] = useState('');
  const [brand, setBrand] = useState('');
  const [model, setModel] = useState('');
  const [problem, setProblem] = useState('');
  const [details, setDetails] = useState('');
  const [urgency, setUrgency] = useState('');
  const [hasMedia, setHasMedia] = useState('Não');
  const originalBodyOverflow = useRef('');
  const originalBodyPaddingRight = useRef('');

  const dialogOpen = open ?? internalOpen;
  const setDialogOpen = onOpenChange ?? setInternalOpen;

  useEffect(() => {
    if (dialogOpen) {
      originalBodyOverflow.current = document.body.style.overflow;
      originalBodyPaddingRight.current = document.body.style.paddingRight;
      const scrollBarWidth = window.innerWidth - document.documentElement.clientWidth;
      document.body.style.overflow = 'hidden';
      if (scrollBarWidth > 0) {
        document.body.style.paddingRight = `${scrollBarWidth}px`;
      }
    } else {
      document.body.style.overflow = originalBodyOverflow.current;
      document.body.style.paddingRight = originalBodyPaddingRight.current;
    }

    return () => {
      document.body.style.overflow = originalBodyOverflow.current;
      document.body.style.paddingRight = originalBodyPaddingRight.current;
    };
  }, [dialogOpen]);

  const whatsappUrl = useMemo(() => {
    const message = [
      '🐉 *INFO SHIRE – SOLICITAÇÃO DE ORÇAMENTO*',
      '',
      `📱 *Equipamento:* ${equipmentType || 'Não informado'}`,
      `🏷️ *Marca:* ${brand || 'Não informado'}`,
      `🧩 *Modelo:* ${model || 'Não informado'}`,
      `⚠️ *Problema:* ${problem || 'Não informado'}`,
      `📝 *Detalhes:* ${details || 'Não informado'}`,
      `⏱️ *Urgência:* ${urgency || 'Não informado'}`,
      `📸 *Fotos/Vídeo:* ${hasMedia || 'Não informado'}`,
      '',
      '🌐 Site: https://infoshire.com.br',
    ].join('\n');

    return `https://wa.me/5519993352727?text=${encodeURIComponent(message)}`;
  }, [brand, details, equipmentType, hasMedia, model, problem, urgency]);

  const handleSubmit = (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    window.open(whatsappUrl, '_blank');
    setDialogOpen(false);
  };

  return (
    <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
      {trigger ? <DialogTrigger asChild>{trigger}</DialogTrigger> : null}
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
                list="brand-suggestions"
              />
              <datalist id="brand-suggestions">
                {brandSuggestions.map((option) => (
                  <option key={option} value={option} />
                ))}
              </datalist>
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
            <Label htmlFor="details">Detalhes (opcional)</Label>
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
            <div className="space-y-2">
              <Label htmlFor="hasMedia">Possui fotos ou vídeos?</Label>
              <Select value={hasMedia} onValueChange={setHasMedia}>
                <SelectTrigger id="hasMedia" className="h-11">
                  <SelectValue placeholder="Selecione" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="Sim">Sim</SelectItem>
                  <SelectItem value="Não">Não</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>

          <div className="flex flex-col gap-3 sm:flex-row">
            <Button
              type="submit"
              size="lg"
              className="h-12 w-full bg-primary text-black hover:bg-primary/90"
            >
              <MessageCircle className="mr-2 h-5 w-5" />
              Enviar no WhatsApp
            </Button>
            <DialogClose asChild>
              <Button
                type="button"
                size="lg"
                variant="outline"
                className="h-12 w-full border-primary/40 text-primary hover:border-primary hover:bg-primary/10"
              >
                Voltar
              </Button>
            </DialogClose>
          </div>

          <div className="flex items-center justify-center gap-2 text-xs text-muted-foreground">
            <CheckCircle2 className="h-4 w-4 text-primary" />
            Sua mensagem será enviada direto para nossa equipe.
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}
