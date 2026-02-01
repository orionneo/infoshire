import type { ReactNode } from 'react';
import { useEffect, useMemo, useRef, useState } from 'react';
import { ArrowLeft, CheckCircle2, MessageCircle } from 'lucide-react';
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
  const [currentStep, setCurrentStep] = useState(0);
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

  useEffect(() => {
    if (!dialogOpen) {
      setCurrentStep(0);
    }
  }, [dialogOpen]);

  const whatsappUrl = useMemo(() => {
    const normalizedDetails = details.trim() || 'Não informado';
    const normalizedModel = model.trim() || 'Não informado';
    const message = [
      '🐉 InfoShire — Pedido de Orçamento',
      '',
      `📌 Tipo: ${equipmentType || 'Não informado'}`,
      `🏷️ Marca: ${brand || 'Não informado'}`,
      `🔧 Modelo: ${normalizedModel}`,
      `🧩 Problema: ${problem || 'Não informado'}`,
      '',
      `📝 Detalhes: ${normalizedDetails}`,
      `⏱️ Urgência: ${urgency || 'Não informado'}`,
      `📷 Fotos/vídeo: ${hasMedia || 'Não informado'}`,
      '',
      '🌐 Site: infoshire.com.br',
    ].join('\n');

    return `https://wa.me/5519993352727?text=${encodeURIComponent(message)}`;
  }, [brand, details, equipmentType, hasMedia, model, problem, urgency]);

  const handleSubmit = (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    window.open(whatsappUrl, '_blank', 'noopener,noreferrer');
    setDialogOpen(false);
  };

  const totalSteps = 3;
  const stepLabels = ['Equipamento', 'Detalhes', 'Confirmação'];
  const isLastStep = currentStep === totalSteps - 1;

  const handleNext = () => setCurrentStep((prev) => Math.min(prev + 1, totalSteps - 1));
  const handlePrev = () => setCurrentStep((prev) => Math.max(prev - 1, 0));

  return (
    <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
      {trigger ? <DialogTrigger asChild>{trigger}</DialogTrigger> : null}
      <DialogContent className="w-[95vw] max-w-xl rounded-2xl border border-primary/30 bg-card/95 p-0 backdrop-blur-sm">
        <div className="flex flex-col">
          <div className="sticky top-0 z-20 border-b border-primary/20 bg-card/90 px-4 pb-4 pt-[calc(env(safe-area-inset-top)+0.75rem)] backdrop-blur sm:px-8">
            <div className="flex items-center justify-between">
              <DialogClose asChild>
                <button
                  type="button"
                  className="inline-flex items-center gap-2 text-sm font-semibold text-primary hover:text-primary/80"
                >
                  <ArrowLeft className="h-4 w-4" />
                  Voltar
                </button>
              </DialogClose>
              <div className="text-xs text-muted-foreground">
                Etapa {currentStep + 1} de {totalSteps}
              </div>
            </div>

            <DialogHeader className="mt-4 space-y-2 text-left">
              <DialogTitle className="text-2xl font-bold text-primary">
                Pedir orçamento pelo WhatsApp
              </DialogTitle>
              <DialogDescription className="text-sm text-muted-foreground">
                Preencha as informações principais para receber um atendimento rápido e direto com nossa equipe técnica.
              </DialogDescription>
            </DialogHeader>

            <div className="mt-4 flex items-center gap-2">
              {stepLabels.map((label, index) => (
                <button
                  key={label}
                  type="button"
                  onClick={() => setCurrentStep(index)}
                  className={`flex-1 rounded-full border px-3 py-1 text-xs font-semibold transition ${
                    index === currentStep
                      ? 'border-primary/70 bg-primary/20 text-primary shadow-[0_0_12px_rgba(139,255,0,0.3)]'
                      : 'border-primary/20 text-muted-foreground hover:border-primary/50 hover:text-primary'
                  }`}
                >
                  {label}
                </button>
              ))}
            </div>
          </div>

          <form onSubmit={handleSubmit} className="flex flex-col">
            <div className="budget-modal__scroll px-4 pb-6 pt-4 sm:px-8">
              {currentStep === 0 && (
                <div className="space-y-4">
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
              )}

              {currentStep === 1 && (
                <div className="space-y-4">
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
                    <Label htmlFor="details">Detalhes (opcional)</Label>
                    <Textarea
                      id="details"
                      placeholder="Conte o que aconteceu ou sintomas principais"
                      value={details}
                      onChange={(event) => setDetails(event.target.value)}
                      className="min-h-[120px] resize-none"
                    />
                  </div>
                </div>
              )}

              {currentStep === 2 && (
                <div className="space-y-4">
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

                  <div className="rounded-xl border border-primary/20 bg-primary/5 p-4">
                    <h4 className="text-sm font-semibold text-primary">Resumo do pedido</h4>
                    <div className="mt-3 space-y-2 text-sm text-muted-foreground">
                      <p><span className="text-foreground">Tipo:</span> {equipmentType || 'Não informado'}</p>
                      <p><span className="text-foreground">Problema:</span> {problem || 'Não informado'}</p>
                      <p><span className="text-foreground">Marca:</span> {brand || 'Não informado'}</p>
                      <p><span className="text-foreground">Modelo:</span> {model || 'Não informado'}</p>
                      <p><span className="text-foreground">Detalhes:</span> {details.trim() || 'Não informado'}</p>
                      <p><span className="text-foreground">Urgência:</span> {urgency || 'Não informado'}</p>
                      <p><span className="text-foreground">Fotos/vídeo:</span> {hasMedia || 'Não informado'}</p>
                    </div>
                  </div>
                </div>
              )}
            </div>

            <div className="sticky bottom-0 z-20 border-t border-primary/20 bg-card/95 px-4 pb-[calc(env(safe-area-inset-bottom)+0.9rem)] pt-4 backdrop-blur sm:px-8">
              <div className="flex flex-col gap-3 sm:flex-row">
                <Button
                  type="button"
                  size="lg"
                  variant="outline"
                  className="h-12 w-full border-primary/40 text-primary hover:border-primary hover:bg-primary/10"
                  onClick={handlePrev}
                  disabled={currentStep === 0}
                >
                  Voltar
                </Button>
                {isLastStep ? (
                  <Button
                    type="submit"
                    size="lg"
                    className="h-12 w-full bg-primary text-black hover:bg-primary/90"
                  >
                    <MessageCircle className="mr-2 h-5 w-5" />
                    Enviar no WhatsApp
                  </Button>
                ) : (
                  <Button
                    type="button"
                    size="lg"
                    className="h-12 w-full bg-primary text-black hover:bg-primary/90"
                    onClick={handleNext}
                  >
                    Próximo
                  </Button>
                )}
              </div>

              <div className="mt-3 flex items-center justify-between text-xs text-muted-foreground">
                <div>Etapa {currentStep + 1} de {totalSteps}</div>
                <DialogClose asChild>
                  <button type="button" className="underline underline-offset-4 hover:text-primary">
                    Voltar pro site
                  </button>
                </DialogClose>
              </div>

              <div className="mt-3 flex items-center justify-center gap-2 text-xs text-muted-foreground">
                <CheckCircle2 className="h-4 w-4 text-primary" />
                Sua mensagem será enviada direto para nossa equipe.
              </div>
            </div>
          </form>
        </div>
      </DialogContent>
    </Dialog>
  );
}
