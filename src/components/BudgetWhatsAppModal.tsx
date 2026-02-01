import type { ReactNode } from 'react';
import { useEffect, useMemo, useRef, useState } from 'react';
import { ArrowLeft, CheckCircle2, MessageCircle, X } from 'lucide-react';
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
import { useIsMobile } from '@/hooks/use-mobile';

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

const formatValue = (value: string) => (value.trim() ? value.trim() : '(não informado)');

const buildWhatsAppMessage = (data: {
  equipmentType: string;
  brand: string;
  model: string;
  problem: string;
  details: string;
  urgency: string;
  hasMedia: string;
}) => {
  const dragonEmoji = '🐉';
  const dragonLine = dragonEmoji.includes('\uFFFD') ? '[DRAGAO]' : dragonEmoji;
  return [
    'InfoShire - Pedido de Orçamento',
    dragonLine,
    '------------------------------',
    'Equipamento',
    `- Tipo: ${formatValue(data.equipmentType)}`,
    `- Marca: ${formatValue(data.brand)}`,
    `- Modelo: ${formatValue(data.model)}`,
    `- Problema: ${formatValue(data.problem)}`,
    '',
    'Detalhes',
    `- Detalhes: ${formatValue(data.details)}`,
    `- Urgência: ${formatValue(data.urgency)}`,
    `- Fotos/Vídeo: ${formatValue(data.hasMedia)}`,
    '------------------------------',
    'Site: https://infoshire.com.br',
  ].join('\n');
};

const buildWhatsAppUrl = (phone: string, message: string) => {
  const encoded = encodeURIComponent(message);
  return `https://wa.me/${phone}?text=${encoded}`;
};

export function BudgetWhatsAppModal({ trigger, open, onOpenChange }: BudgetWhatsAppModalProps) {
  const [internalOpen, setInternalOpen] = useState(false);
  const [currentStep, setCurrentStep] = useState(0);
  const [equipmentType, setEquipmentType] = useState('');
  const [brand, setBrand] = useState('');
  const [model, setModel] = useState('');
  const [problem, setProblem] = useState('');
  const [details, setDetails] = useState('');
  const [urgency, setUrgency] = useState('');
  const [hasMedia, setHasMedia] = useState('');
  const originalBodyOverflow = useRef('');
  const originalBodyPaddingRight = useRef('');
  const scrollAreaRef = useRef<HTMLDivElement | null>(null);
  const firstFieldRefs = useRef<Array<HTMLInputElement | HTMLTextAreaElement | HTMLButtonElement | HTMLSelectElement | null>>([]);
  const isMobile = useIsMobile();

  const dialogOpen = open ?? internalOpen;
  const setDialogOpen = onOpenChange ?? setInternalOpen;
  const totalSteps = 3;
  const stepLabels = ['Equipamento', 'Detalhes', 'Confirmação'];
  const isLastStep = currentStep === totalSteps - 1;
  const stepProgress = ((currentStep + 1) / totalSteps) * 100;

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
    const message = buildWhatsAppMessage({
      equipmentType,
      brand,
      model,
      problem,
      details,
      urgency,
      hasMedia,
    });
    return buildWhatsAppUrl('5519993352727', message);
  }, [brand, details, equipmentType, hasMedia, model, problem, urgency]);

  const handleSubmit = (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    window.open(whatsappUrl, '_blank', 'noopener,noreferrer');
    setDialogOpen(false);
  };

  useEffect(() => {
    if (!dialogOpen) {
      return;
    }

    const scrollArea = scrollAreaRef.current;
    if (scrollArea) {
      scrollArea.scrollTo({ top: 0, behavior: 'smooth' });
    }

    const focusTarget = firstFieldRefs.current[currentStep];
    if (focusTarget) {
      window.setTimeout(() => focusTarget.focus(), 80);
    }
  }, [currentStep, dialogOpen]);

  const handleNext = () => setCurrentStep((prev) => Math.min(prev + 1, totalSteps - 1));
  const handlePrev = () => {
    if (currentStep === 0) {
      setDialogOpen(false);
      return;
    }
    setCurrentStep((prev) => Math.max(prev - 1, 0));
  };

  const setStepRef = (index: number) => (element: HTMLInputElement | HTMLTextAreaElement | HTMLButtonElement | HTMLSelectElement | null) => {
    firstFieldRefs.current[index] = element;
  };

  return (
    <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
      {trigger ? <DialogTrigger asChild>{trigger}</DialogTrigger> : null}
      <DialogContent className="flex h-[calc(100dvh-16px)] max-h-[calc(100dvh-16px)] w-[95vw] max-w-xl flex-col overflow-hidden rounded-2xl border border-primary/30 bg-card/95 p-0 backdrop-blur-sm sm:h-[calc(100dvh-32px)] sm:max-h-[calc(100dvh-32px)] [&>button]:hidden">
        <div className="flex flex-1 flex-col">
          <div className="sticky top-0 z-20 border-b border-primary/20 bg-card/90 px-4 pb-4 pt-[calc(env(safe-area-inset-top)+0.75rem)] backdrop-blur sm:px-8">
            <div className="flex items-center justify-between gap-3">
              <button
                type="button"
                onClick={handlePrev}
                className="inline-flex items-center gap-2 text-sm font-semibold text-primary hover:text-primary/80"
              >
                <ArrowLeft className="h-4 w-4" />
                Voltar
              </button>
              <div className="text-xs text-muted-foreground">
                Etapa {currentStep + 1} de {totalSteps}
              </div>
              <DialogClose asChild>
                <button
                  type="button"
                  className="inline-flex h-9 w-9 items-center justify-center rounded-full border border-primary/30 text-primary transition hover:border-primary hover:text-primary/80"
                  aria-label="Fechar"
                >
                  <X className="h-4 w-4" />
                </button>
              </DialogClose>
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

            <div className="mt-3 h-1 w-full overflow-hidden rounded-full bg-primary/10">
              <div
                className="h-full rounded-full bg-primary transition-all duration-300"
                style={{ width: `${stepProgress}%` }}
              />
            </div>
          </div>

          <form onSubmit={handleSubmit} className="flex flex-1 flex-col">
            <div
              ref={scrollAreaRef}
              className="flex-1 overflow-y-auto overscroll-contain px-4 pb-28 pt-4 sm:px-8"
              style={{ WebkitOverflowScrolling: 'touch' }}
            >
              <div key={currentStep} className="animate-fade-in-up">
                {currentStep === 0 && (
                  <div className="space-y-4">
                    <div className="space-y-2">
                      <Label htmlFor="equipment">Tipo de equipamento</Label>
                      {isMobile ? (
                        <select
                          id="equipment"
                          value={equipmentType}
                          onChange={(event) => setEquipmentType(event.target.value)}
                          className="h-11 w-full rounded-md border border-input bg-background px-3 text-sm"
                          ref={setStepRef(0)}
                        >
                          <option value="">Selecione</option>
                          {equipmentOptions.map((option) => (
                            <option key={option} value={option}>
                              {option}
                            </option>
                          ))}
                        </select>
                      ) : (
                        <Select value={equipmentType} onValueChange={setEquipmentType}>
                          <SelectTrigger id="equipment" className="h-11" ref={setStepRef(0)}>
                            <SelectValue placeholder="Selecione" />
                          </SelectTrigger>
                          <SelectContent className="z-[1000]" position="popper">
                            {equipmentOptions.map((option) => (
                              <SelectItem key={option} value={option}>
                                {option}
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      )}
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="problem">Problema</Label>
                      {isMobile ? (
                        <select
                          id="problem"
                          value={problem}
                          onChange={(event) => setProblem(event.target.value)}
                          className="h-11 w-full rounded-md border border-input bg-background px-3 text-sm"
                        >
                          <option value="">Selecione</option>
                          {problemOptions.map((option) => (
                            <option key={option} value={option}>
                              {option}
                            </option>
                          ))}
                        </select>
                      ) : (
                        <Select value={problem} onValueChange={setProblem}>
                          <SelectTrigger id="problem" className="h-11">
                            <SelectValue placeholder="Selecione" />
                          </SelectTrigger>
                          <SelectContent className="z-[1000]" position="popper">
                            {problemOptions.map((option) => (
                              <SelectItem key={option} value={option}>
                                {option}
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      )}
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
                        ref={setStepRef(1)}
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
                        {isMobile ? (
                          <select
                            id="urgency"
                            value={urgency}
                            onChange={(event) => setUrgency(event.target.value)}
                            className="h-11 w-full rounded-md border border-input bg-background px-3 text-sm"
                            ref={setStepRef(2)}
                          >
                            <option value="">Selecione</option>
                            {urgencyOptions.map((option) => (
                              <option key={option} value={option}>
                                {option}
                              </option>
                            ))}
                          </select>
                        ) : (
                          <Select value={urgency} onValueChange={setUrgency}>
                            <SelectTrigger id="urgency" className="h-11" ref={setStepRef(2)}>
                              <SelectValue placeholder="Selecione" />
                            </SelectTrigger>
                            <SelectContent className="z-[1000]" position="popper">
                              {urgencyOptions.map((option) => (
                                <SelectItem key={option} value={option}>
                                  {option}
                                </SelectItem>
                              ))}
                            </SelectContent>
                          </Select>
                        )}
                      </div>
                      <div className="space-y-2">
                        <Label htmlFor="hasMedia">Possui fotos ou vídeos?</Label>
                        {isMobile ? (
                          <select
                            id="hasMedia"
                            value={hasMedia}
                            onChange={(event) => setHasMedia(event.target.value)}
                            className="h-11 w-full rounded-md border border-input bg-background px-3 text-sm"
                          >
                            <option value="">Selecione</option>
                            <option value="Sim">Sim</option>
                            <option value="Não">Não</option>
                          </select>
                        ) : (
                          <Select value={hasMedia} onValueChange={setHasMedia}>
                            <SelectTrigger id="hasMedia" className="h-11">
                              <SelectValue placeholder="Selecione" />
                            </SelectTrigger>
                            <SelectContent className="z-[1000]" position="popper">
                              <SelectItem value="Sim">Sim</SelectItem>
                              <SelectItem value="Não">Não</SelectItem>
                            </SelectContent>
                          </Select>
                        )}
                      </div>
                    </div>

                    <div className="rounded-xl border border-primary/20 bg-primary/5 p-4">
                      <h4 className="text-sm font-semibold text-primary">Resumo do pedido</h4>
                      <div className="mt-3 space-y-2 text-sm text-muted-foreground">
                        <p><span className="text-foreground">Tipo:</span> {equipmentType.trim() || '(não informado)'}</p>
                        <p><span className="text-foreground">Problema:</span> {problem.trim() || '(não informado)'}</p>
                        <p><span className="text-foreground">Marca:</span> {brand.trim() || '(não informado)'}</p>
                        <p><span className="text-foreground">Modelo:</span> {model.trim() || '(não informado)'}</p>
                        <p><span className="text-foreground">Detalhes:</span> {details.trim() || '(não informado)'}</p>
                        <p><span className="text-foreground">Urgência:</span> {urgency.trim() || '(não informado)'}</p>
                        <p><span className="text-foreground">Fotos/vídeo:</span> {hasMedia.trim() || '(não informado)'}</p>
                      </div>
                    </div>
                  </div>
                )}
              </div>
            </div>

            <div className="sticky bottom-0 z-20 border-t border-primary/20 bg-card/95 px-4 pb-[calc(env(safe-area-inset-bottom)+0.9rem)] pt-4 backdrop-blur sm:px-8">
              <div className="flex flex-col gap-3 sm:flex-row">
                <Button
                  type="button"
                  size="lg"
                  variant="outline"
                  className="h-12 w-full border-primary/40 text-primary hover:border-primary hover:bg-primary/10"
                  onClick={handlePrev}
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
