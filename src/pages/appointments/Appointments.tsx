import { addDays, format, startOfDay, startOfWeek } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { Calendar, CalendarDays, Clock, List, Loader2, User, Wrench } from 'lucide-react';
import { useCallback, useEffect, useMemo, useState } from 'react';
import { AdminLayout } from '@/components/layouts/AdminLayout';
import { ClientLayout } from '@/components/layouts/ClientLayout';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Drawer, DrawerContent, DrawerDescription, DrawerFooter, DrawerHeader, DrawerTitle } from '@/components/ui/drawer';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Textarea } from '@/components/ui/textarea';
import { useToast } from '@/hooks/use-toast';
import { createServiceOrder } from '@/db/api';
import { supabase } from '@/db/supabase';
import { useAuth } from '@/contexts/AuthContext';

const WINDOW_DAYS = 14;

const formatTimeLabel = (hour: number) => `${hour.toString().padStart(2, '0')}:00`;

const getAvailableHoursForDate = (date: Date) => {
  const day = date.getDay();
  if (day === 0) return [];
  const isSaturday = day === 6;
  const startHour = 9;
  const endHour = isSaturday ? 13 : 18;
  const hours: number[] = [];
  for (let hour = startHour; hour < endHour; hour += 1) {
    hours.push(hour);
  }
  return hours;
};

const formatDateKey = (date: Date) => format(date, 'yyyy-MM-dd');

const formatTimeKey = (value: string) => value.slice(0, 5);

const formatAppointmentTime = (time: string) => {
  if (!time) return '';
  return time.slice(0, 5);
};

interface AppointmentRecord {
  id: string;
  client_id: string;
  requested_date: string;
  requested_time: string;
  status: 'REQUESTED' | 'CONFIRMED' | 'CONVERTED' | 'CANCELED';
  equipment: string;
  problem_description: string;
  notes: string | null;
  os_id: string | null;
  created_at: string;
  client?: {
    id: string;
    name: string | null;
    email: string | null;
    phone: string | null;
  } | null;
}

export function ClientAppointments() {
  const { user, profile } = useAuth();
  const { toast } = useToast();
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [availableSlots, setAvailableSlots] = useState<Record<string, string[]>>({});
  const [selectedDate, setSelectedDate] = useState('');
  const [selectedTime, setSelectedTime] = useState('');
  const [equipment, setEquipment] = useState('');
  const [problem, setProblem] = useState('');
  const [notes, setNotes] = useState('');

  const windowDates = useMemo(() => {
    const today = startOfDay(new Date());
    return Array.from({ length: WINDOW_DAYS }, (_, index) => addDays(today, index)).filter(
      (date) => date.getDay() !== 0
    );
  }, []);

  const loadSlots = useCallback(async () => {
    if (!user) return;
    setLoading(true);
    const startDate = formatDateKey(windowDates[0]);
    const endDate = formatDateKey(windowDates[windowDates.length - 1]);

    const { data, error } = await supabase
      .from('appointments')
      .select('requested_date, requested_time, status')
      .gte('requested_date', startDate)
      .lte('requested_date', endDate)
      .in('status', ['REQUESTED', 'CONFIRMED', 'CONVERTED']);

    if (error) {
      console.error('Erro ao carregar agendamentos:', error);
      toast({
        title: 'Erro ao carregar horários',
        description: 'Não foi possível carregar a agenda disponível.',
        variant: 'destructive',
      });
      setLoading(false);
      return;
    }

    const reserved = new Set(
      (data || []).map((item) => `${item.requested_date}|${formatTimeKey(item.requested_time)}`)
    );

    const slotsByDate: Record<string, string[]> = {};

    windowDates.forEach((date) => {
      const dateKey = formatDateKey(date);
      const hours = getAvailableHoursForDate(date);
      const slots = hours
        .map((hour) => formatTimeLabel(hour))
        .filter((time) => !reserved.has(`${dateKey}|${time}`));
      if (slots.length > 0) {
        slotsByDate[dateKey] = slots;
      }
    });

    setAvailableSlots(slotsByDate);
    const firstDate = Object.keys(slotsByDate)[0] || '';
    setSelectedDate((prev) => (prev && slotsByDate[prev] ? prev : firstDate));
    setSelectedTime('');
    setLoading(false);
  }, [toast, user, windowDates]);

  useEffect(() => {
    loadSlots();
  }, [loadSlots]);

  useEffect(() => {
    if (selectedDate && availableSlots[selectedDate]?.length) {
      setSelectedTime((prev) => (availableSlots[selectedDate].includes(prev) ? prev : ''));
    }
  }, [availableSlots, selectedDate]);

  const handleSubmit = async () => {
    if (!user) return;
    if (!selectedDate || !selectedTime || !equipment || !problem) {
      toast({
        title: 'Preencha todos os campos obrigatórios',
        description: 'Informe equipamento, problema, data e horário.',
        variant: 'destructive',
      });
      return;
    }

    setSubmitting(true);
    const { error } = await supabase.from('appointments').insert({
      client_id: user.id,
      requested_date: selectedDate,
      requested_time: `${selectedTime}:00`,
      equipment,
      problem_description: problem,
      notes: notes || null,
      status: 'REQUESTED',
    });

    if (error) {
      console.error('Erro ao criar agendamento:', error);
      toast({
        title: 'Erro ao solicitar agendamento',
        description: error.message || 'Não foi possível salvar o agendamento.',
        variant: 'destructive',
      });
      setSubmitting(false);
      return;
    }

    try {
      await supabase.functions.invoke('send-telegram-notification', {
        body: {
          notificationType: 'appointment_requested',
          clientName: profile?.name || profile?.email || 'Cliente',
          equipment,
          requestedDate: selectedDate,
          requestedTime: selectedTime,
        },
      });
    } catch (telegramError) {
      console.error('Erro ao enviar notificação do Telegram:', telegramError);
    }

    toast({
      title: 'Agendamento solicitado',
      description: 'Seu pedido foi registrado. Em breve entraremos em contato.',
    });

    setEquipment('');
    setProblem('');
    setNotes('');
    setSelectedTime('');
    await loadSlots();
    setSubmitting(false);
  };

  const availableDates = Object.keys(availableSlots);
  const timesForSelectedDate = selectedDate ? availableSlots[selectedDate] || [] : [];

  return (
    <ClientLayout>
      <div className="space-y-6">
        <div>
          <h1 className="text-3xl font-bold">Solicitar agendamento</h1>
          <p className="text-muted-foreground">Escolha um horário disponível para seu atendimento.</p>
        </div>

        <Card>
          <CardHeader>
            <CardTitle>Dados do agendamento</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            {loading ? (
              <div className="flex items-center justify-center py-10">
                <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
              </div>
            ) : (
              <>
                {availableDates.length === 0 ? (
                  <div className="rounded-lg border border-dashed p-6 text-center text-sm text-muted-foreground">
                    Nenhum horário disponível nos próximos 14 dias.
                  </div>
                ) : (
                  <div className="grid gap-4 md:grid-cols-2">
                    <div className="space-y-2">
                      <label className="text-sm font-medium">Data</label>
                      <Select value={selectedDate} onValueChange={setSelectedDate}>
                        <SelectTrigger>
                          <SelectValue placeholder="Selecione a data" />
                        </SelectTrigger>
                        <SelectContent>
                          {availableDates.map((date) => (
                            <SelectItem key={date} value={date}>
                              {format(new Date(date), "dd/MM/yyyy '·' EEEE", { locale: ptBR })}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>

                    <div className="space-y-2">
                      <label className="text-sm font-medium">Horário</label>
                      <Select value={selectedTime} onValueChange={setSelectedTime}>
                        <SelectTrigger>
                          <SelectValue placeholder="Selecione o horário" />
                        </SelectTrigger>
                        <SelectContent>
                          {timesForSelectedDate.map((time) => (
                            <SelectItem key={time} value={time}>
                              {time}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>
                  </div>
                )}

                <div className="space-y-2">
                  <label className="text-sm font-medium">Equipamento</label>
                  <Input value={equipment} onChange={(event) => setEquipment(event.target.value)} placeholder="Ex: Notebook Dell" />
                </div>

                <div className="space-y-2">
                  <label className="text-sm font-medium">Descrição do problema</label>
                  <Textarea value={problem} onChange={(event) => setProblem(event.target.value)} placeholder="Descreva o problema" />
                </div>

                <div className="space-y-2">
                  <label className="text-sm font-medium">Observações (opcional)</label>
                  <Textarea value={notes} onChange={(event) => setNotes(event.target.value)} placeholder="Alguma observação adicional" />
                </div>

                <div className="flex justify-end">
                  <Button onClick={handleSubmit} disabled={submitting || loading || availableDates.length === 0}>
                    {submitting ? (
                      <>
                        <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                        Enviando...
                      </>
                    ) : (
                      'Solicitar agendamento'
                    )}
                  </Button>
                </div>
              </>
            )}
          </CardContent>
        </Card>
      </div>
    </ClientLayout>
  );
}

export function AdminAppointments() {
  const { toast } = useToast();
  const [loading, setLoading] = useState(true);
  const [appointments, setAppointments] = useState<AppointmentRecord[]>([]);
  const [selectedAppointment, setSelectedAppointment] = useState<AppointmentRecord | null>(null);
  const [drawerOpen, setDrawerOpen] = useState(false);
  const [converting, setConverting] = useState(false);
  const [calendarView, setCalendarView] = useState<'week' | 'day'>('week');
  const [activeDate, setActiveDate] = useState(startOfDay(new Date()));

  const loadAppointments = useCallback(async () => {
    setLoading(true);
    const { data, error } = await supabase
      .from('appointments')
      .select('*, client:profiles!client_id(id, name, email, phone)')
      .order('requested_date', { ascending: true })
      .order('requested_time', { ascending: true });

    if (error) {
      console.error('Erro ao carregar agendamentos:', error);
      toast({
        title: 'Erro ao carregar agendamentos',
        description: 'Não foi possível carregar o hub de agendamentos.',
        variant: 'destructive',
      });
      setLoading(false);
      return;
    }

    setAppointments((data || []) as AppointmentRecord[]);
    setLoading(false);
  }, [toast]);

  useEffect(() => {
    loadAppointments();
  }, [loadAppointments]);

  const weekStart = startOfWeek(activeDate, { weekStartsOn: 1 });
  const weekDays = useMemo(() => Array.from({ length: 7 }, (_, index) => addDays(weekStart, index)), [weekStart]);

  const appointmentsByDate = useMemo(() => {
    return appointments.reduce<Record<string, AppointmentRecord[]>>((acc, appointment) => {
      const key = appointment.requested_date;
      if (!acc[key]) acc[key] = [];
      acc[key].push(appointment);
      return acc;
    }, {});
  }, [appointments]);

  const listAppointments = appointments;

  const openDrawer = (appointment: AppointmentRecord) => {
    setSelectedAppointment(appointment);
    setDrawerOpen(true);
  };

  const handleConvertToOrder = async () => {
    if (!selectedAppointment) return;

    setConverting(true);
    try {
      const { data: fresh, error: freshError } = await supabase
        .from('appointments')
        .select('id, os_id, status')
        .eq('id', selectedAppointment.id)
        .maybeSingle();

      if (freshError) throw freshError;

      if (fresh?.os_id || fresh?.status === 'CONVERTED') {
        toast({
          title: 'OS já criada',
          description: 'Este agendamento já foi convertido em ordem de serviço.',
        });
        await loadAppointments();
        setConverting(false);
        return;
      }

      const entryDate = new Date().toISOString();

      const newOrder = await createServiceOrder({
        client_id: selectedAppointment.client_id,
        equipment: selectedAppointment.equipment,
        problem_description: selectedAppointment.problem_description,
        entry_date: entryDate,
      });

      const { data: updated, error: updateError } = await supabase
        .from('appointments')
        .update({ status: 'CONVERTED', os_id: newOrder.id })
        .eq('id', selectedAppointment.id)
        .is('os_id', null)
        .select()
        .maybeSingle();

      if (updateError || !updated) {
        const { data: existing } = await supabase
          .from('appointments')
          .select('os_id, status')
          .eq('id', selectedAppointment.id)
          .maybeSingle();

        if (existing?.os_id) {
          toast({
            title: 'OS já criada',
            description: 'Este agendamento já foi convertido em ordem de serviço.',
          });
        } else {
          throw updateError || new Error('Falha ao atualizar o agendamento');
        }
      } else {
        toast({
          title: 'OS criada com sucesso',
          description: `OS #${newOrder.order_number} criada a partir do agendamento.`,
        });
      }

      setDrawerOpen(false);
      await loadAppointments();
    } catch (error: any) {
      console.error('Erro ao converter agendamento:', error);
      toast({
        title: 'Erro ao criar OS',
        description: error.message || 'Não foi possível converter o agendamento.',
        variant: 'destructive',
      });
    } finally {
      setConverting(false);
    }
  };

  const renderAppointmentItem = (appointment: AppointmentRecord) => (
    <button
      key={appointment.id}
      className="w-full rounded-lg border p-3 text-left transition hover:bg-accent"
      onClick={() => openDrawer(appointment)}
    >
      <div className="flex items-start justify-between gap-4">
        <div>
          <p className="text-sm font-semibold">{appointment.equipment}</p>
          <p className="text-xs text-muted-foreground">
            {appointment.client?.name || appointment.client?.email || 'Cliente'}
          </p>
        </div>
        <span className="text-xs font-medium text-muted-foreground">{appointment.status}</span>
      </div>
      <div className="mt-2 flex items-center gap-2 text-xs text-muted-foreground">
        <Calendar className="h-3.5 w-3.5" />
        <span>
          {format(new Date(appointment.requested_date), 'dd/MM/yyyy')} · {formatAppointmentTime(appointment.requested_time)}
        </span>
      </div>
    </button>
  );

  return (
    <AdminLayout>
      <div className="space-y-6">
        <div className="flex items-center justify-between gap-4">
          <div>
            <h1 className="text-3xl font-bold">Agendamentos</h1>
            <p className="text-muted-foreground">Centralize solicitações e converta em OS.</p>
          </div>
          <Button variant="outline" onClick={loadAppointments} disabled={loading}>
            Atualizar
          </Button>
        </div>

        <Tabs defaultValue="calendar" className="space-y-4">
          <TabsList>
            <TabsTrigger value="calendar" className="gap-2">
              <CalendarDays className="h-4 w-4" />
              Calendário
            </TabsTrigger>
            <TabsTrigger value="list" className="gap-2">
              <List className="h-4 w-4" />
              Lista
            </TabsTrigger>
          </TabsList>

          <TabsContent value="calendar" className="space-y-4">
            <div className="flex flex-wrap items-center gap-2">
              <Button
                variant={calendarView === 'week' ? 'default' : 'outline'}
                onClick={() => setCalendarView('week')}
              >
                Semana
              </Button>
              <Button
                variant={calendarView === 'day' ? 'default' : 'outline'}
                onClick={() => setCalendarView('day')}
              >
                Dia
              </Button>
              <div className="ml-auto flex items-center gap-2">
                <Button variant="ghost" onClick={() => setActiveDate(addDays(activeDate, -1))}>
                  ◀
                </Button>
                <span className="text-sm font-medium">
                  {format(activeDate, "dd 'de' MMMM", { locale: ptBR })}
                </span>
                <Button variant="ghost" onClick={() => setActiveDate(addDays(activeDate, 1))}>
                  ▶
                </Button>
              </div>
            </div>

            {loading ? (
              <div className="flex items-center justify-center py-10">
                <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
              </div>
            ) : calendarView === 'day' ? (
              <Card>
                <CardHeader>
                  <CardTitle>Agenda do dia</CardTitle>
                </CardHeader>
                <CardContent className="space-y-3">
                  {(appointmentsByDate[formatDateKey(activeDate)] || []).length === 0 ? (
                    <p className="text-sm text-muted-foreground">Nenhum agendamento para esta data.</p>
                  ) : (
                    appointmentsByDate[formatDateKey(activeDate)].map(renderAppointmentItem)
                  )}
                </CardContent>
              </Card>
            ) : (
              <div className="grid gap-4 lg:grid-cols-3">
                {weekDays.map((day) => (
                  <Card key={day.toISOString()}>
                    <CardHeader>
                      <CardTitle className="text-base">
                        {format(day, "EEE, dd/MM", { locale: ptBR })}
                      </CardTitle>
                    </CardHeader>
                    <CardContent className="space-y-3">
                      {(appointmentsByDate[formatDateKey(day)] || []).length === 0 ? (
                        <p className="text-sm text-muted-foreground">Sem agendamentos.</p>
                      ) : (
                        appointmentsByDate[formatDateKey(day)].map(renderAppointmentItem)
                      )}
                    </CardContent>
                  </Card>
                ))}
              </div>
            )}
          </TabsContent>

          <TabsContent value="list" className="space-y-4">
            {loading ? (
              <div className="flex items-center justify-center py-10">
                <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
              </div>
            ) : listAppointments.length === 0 ? (
              <Card>
                <CardContent className="py-10 text-center text-sm text-muted-foreground">
                  Nenhum agendamento registrado.
                </CardContent>
              </Card>
            ) : (
              <div className="grid gap-3">
                {listAppointments.map(renderAppointmentItem)}
              </div>
            )}
          </TabsContent>
        </Tabs>
      </div>

      <Drawer open={drawerOpen} onOpenChange={setDrawerOpen}>
        <DrawerContent>
          <DrawerHeader>
            <DrawerTitle>Detalhes do agendamento</DrawerTitle>
            <DrawerDescription>Revise as informações antes de criar a OS.</DrawerDescription>
          </DrawerHeader>
          {selectedAppointment && (
            <div className="space-y-4 px-4">
              <div className="space-y-2">
                <div className="flex items-center gap-2 text-sm">
                  <Wrench className="h-4 w-4 text-muted-foreground" />
                  <span className="font-medium">{selectedAppointment.equipment}</span>
                </div>
                <div className="flex items-center gap-2 text-sm text-muted-foreground">
                  <User className="h-4 w-4" />
                  <span>{selectedAppointment.client?.name || selectedAppointment.client?.email || 'Cliente'}</span>
                </div>
                <div className="flex items-center gap-2 text-sm text-muted-foreground">
                  <Calendar className="h-4 w-4" />
                  <span>
                    {format(new Date(selectedAppointment.requested_date), "dd/MM/yyyy 'às'", { locale: ptBR })}{' '}
                    {formatAppointmentTime(selectedAppointment.requested_time)}
                  </span>
                </div>
                <div className="flex items-center gap-2 text-sm text-muted-foreground">
                  <Clock className="h-4 w-4" />
                  <span>Status: {selectedAppointment.status}</span>
                </div>
              </div>

              <div>
                <p className="text-sm font-medium">Descrição do problema</p>
                <p className="text-sm text-muted-foreground">{selectedAppointment.problem_description}</p>
              </div>

              {selectedAppointment.notes && (
                <div>
                  <p className="text-sm font-medium">Observações</p>
                  <p className="text-sm text-muted-foreground">{selectedAppointment.notes}</p>
                </div>
              )}
            </div>
          )}
          <DrawerFooter>
            <Button onClick={handleConvertToOrder} disabled={converting || selectedAppointment?.status === 'CONVERTED'}>
              {converting ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Criando OS...
                </>
              ) : (
                'Criar OS'
              )}
            </Button>
            <Button variant="outline" onClick={() => setDrawerOpen(false)}>
              Fechar
            </Button>
          </DrawerFooter>
        </DrawerContent>
      </Drawer>
    </AdminLayout>
  );
}
