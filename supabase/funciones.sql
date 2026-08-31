-- Joyería DC — funciones auxiliares
--
-- Estado: aplicadas vía migraciones. Fuente de verdad aquí.

-- Manejo de visitas — resumen para la pestaña "Visitas" de /admin.
-- migración: visitas_v2. SECURITY INVOKER: la política visitas_admin_select
-- protege los datos (un no-admin recibe ceros). Solo `authenticated` puede
-- ejecutarla; `anon` no.
create or replace function public.resumen_visitas()
returns jsonb
language sql
stable
security invoker
set search_path = ''
as $$
  with hoy as (select (now() at time zone 'America/Bogota')::date as d),
  v as (
    select vi.*, (vi.created_at at time zone 'America/Bogota')::date as dia
    from public.visitas vi, hoy
    where vi.created_at >= (hoy.d - interval '29 days')
  )
  select jsonb_build_object(
    'total_hoy', (select count(*) from v, hoy where v.dia = hoy.d),
    'total_30d', (select count(*) from v),
    'por_dia', coalesce((
      select jsonb_agg(jsonb_build_object('fecha', t.fecha, 'n', t.n) order by t.fecha desc)
      from (
        select gs::date as fecha, count(v.id) as n
        from hoy, generate_series(hoy.d - interval '29 days', hoy.d, interval '1 day') gs
        left join v on v.dia = gs::date
        group by gs::date
      ) t
    ), '[]'::jsonb),
    'por_fuente', coalesce((
      select jsonb_agg(jsonb_build_object('fuente', coalesce(fuente,'otro'), 'n', n) order by n desc)
      from (select fuente, count(*) n from v group by fuente) x
    ), '[]'::jsonb),
    'por_dispositivo', coalesce((
      select jsonb_agg(jsonb_build_object('dispositivo', coalesce(dispositivo,'desconocido'), 'n', n) order by n desc)
      from (select dispositivo, count(*) n from v group by dispositivo) x
    ), '[]'::jsonb),
    'por_pais', coalesce((
      select jsonb_agg(jsonb_build_object('pais', coalesce(nullif(pais,''),'Desconocido'), 'n', n) order by n desc)
      from (select pais, count(*) n from v group by pais) x
    ), '[]'::jsonb)
  );
$$;

revoke all on function public.resumen_visitas() from public;
revoke all on function public.resumen_visitas() from anon;
grant execute on function public.resumen_visitas() to authenticated;

-- Fase 4 — índice para el listado de cotizaciones (migración fase4_cotizaciones_index)
-- create index cotizaciones_created_idx on public.cotizaciones (created_at desc);

-- Fase 5 — seed de contenido_sitio: ver migración fase5_seed_contenido
--   (20 claves con el texto que estaba en index.html; hero_titulo usa
--    convención *x*->em y \n->br que interpreta assets/contenido.js)
