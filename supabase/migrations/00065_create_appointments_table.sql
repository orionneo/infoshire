CREATE TYPE public.appointment_status AS ENUM (
  'REQUESTED',
  'CONFIRMED',
  'CONVERTED',
  'CANCELED'
);

CREATE TABLE public.appointments (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  client_id uuid NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  requested_date date NOT NULL,
  requested_time time NOT NULL,
  status public.appointment_status NOT NULL DEFAULT 'REQUESTED',
  equipment text NOT NULL,
  problem_description text NOT NULL,
  notes text,
  os_id uuid REFERENCES public.service_orders(id),
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.appointments ENABLE ROW LEVEL SECURITY;

CREATE UNIQUE INDEX appointments_unique_slot
  ON public.appointments (requested_date, requested_time)
  WHERE status IN ('REQUESTED', 'CONFIRMED', 'CONVERTED');

CREATE POLICY "Clients can create appointments"
  ON public.appointments
  FOR INSERT
  TO authenticated
  WITH CHECK (client_id = auth.uid());

CREATE POLICY "Clients can view their appointments"
  ON public.appointments
  FOR SELECT
  TO authenticated
  USING (client_id = auth.uid());

CREATE POLICY "Admins can manage appointments"
  ON public.appointments
  FOR ALL
  TO authenticated
  USING (public.is_admin(auth.uid()))
  WITH CHECK (public.is_admin(auth.uid()));
