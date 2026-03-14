ALTER TABLE public.leave_balances ALTER COLUMN sick_leave_total SET DEFAULT 12;
ALTER TABLE public.leave_balances ALTER COLUMN casual_leave_total SET DEFAULT 12;
UPDATE public.leave_balances SET sick_leave_total = 12 WHERE sick_leave_total = 10;
UPDATE public.leave_balances SET casual_leave_total = 12 WHERE casual_leave_total = 8;