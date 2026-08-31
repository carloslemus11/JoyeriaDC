-- Joyería DC — funciones auxiliares
--
-- Estado: aplicadas vía migraciones. Fuente de verdad aquí.

-- Fase 3 — resumen de calificaciones para el sitio público (no expone filas).
-- migración: fase3_resumen_calificaciones
create or replace function public.resumen_calificaciones()
returns table (promedio numeric, total bigint)
language sql
stable
set search_path = ''
as $$
  select round(avg(estrellas)::numeric, 1) as promedio, count(*) as total
  from public.calificaciones;
$$;

grant execute on function public.resumen_calificaciones() to anon, authenticated;
