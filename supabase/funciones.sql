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

-- Fase 4 — índice para el listado de cotizaciones (migración fase4_cotizaciones_index)
-- create index cotizaciones_created_idx on public.cotizaciones (created_at desc);

-- Fase 5 — seed de contenido_sitio: ver migración fase5_seed_contenido
--   (20 claves con el texto que estaba en index.html; hero_titulo usa
--    convención *x*->em y \n->br que interpreta assets/contenido.js)
