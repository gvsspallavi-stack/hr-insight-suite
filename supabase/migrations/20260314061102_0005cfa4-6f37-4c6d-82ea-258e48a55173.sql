
-- Holiday calendar table
CREATE TABLE public.holidays (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  date date NOT NULL UNIQUE,
  name text NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now()
);
ALTER TABLE public.holidays ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Admins manage holidays" ON public.holidays FOR ALL USING (public.has_role(auth.uid(), 'admin'));
CREATE POLICY "Everyone can view holidays" ON public.holidays FOR SELECT TO authenticated USING (true);

-- Employee leave balances table
CREATE TABLE public.leave_balances (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  employee_id uuid NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  year integer NOT NULL DEFAULT EXTRACT(YEAR FROM now()),
  sick_leave_total integer NOT NULL DEFAULT 10,
  sick_leave_used integer NOT NULL DEFAULT 0,
  casual_leave_total integer NOT NULL DEFAULT 8,
  casual_leave_used integer NOT NULL DEFAULT 0,
  created_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE(employee_id, year)
);
ALTER TABLE public.leave_balances ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Admins manage leave_balances" ON public.leave_balances FOR ALL USING (public.has_role(auth.uid(), 'admin'));
CREATE POLICY "Employees view own leave_balances" ON public.leave_balances FOR SELECT USING (
  employee_id IN (SELECT id FROM profiles WHERE user_id = auth.uid())
);

-- Add base_salary to profiles for payroll calculation
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS base_salary numeric DEFAULT 0;

-- Add lop_days column to leave_requests for tracking
ALTER TABLE public.leave_requests ADD COLUMN IF NOT EXISTS lop_days integer DEFAULT 0;
