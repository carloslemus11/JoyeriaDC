-- Joyería DC — tabla de "latido" + límites de tamaño en tablas de escritura pública.
--
-- Estado: PENDIENTE DE APLICAR (2026-10-28) — el proyecto estaba pausado. Se aplica como
-- migración `keepalive_y_limites` apenas el proyecto vuelva; después se integra a schema.sql
-- y policies.sql y se borra esta nota.
--
-- 1) public.keepalive: una sola fila (id = 1) que la función programada de Netlify
--    (netlify/functions/keepalive-supabase.mjs) actualiza cada 3 horas con la clave pública.
--    Es una ESCRITURA real a la base: la señal más clara de "actividad de usuario" para que el
--    plan Free no pause el proyecto. No guarda nada sensible; las políticas solo dejan tocar
--    la fila 1.
-- 2) Límites de tamaño: visitas, cotizaciones y sugerencias aceptan INSERT público sin
--    autenticar; sin tope, alguien podría meter filas gigantes y llenar los 500 MB del plan.
--    Los topes están muy por encima de lo que el sitio escribe de verdad.

create table if not exists public.keepalive (
  id     int primary key check (id = 1),
  ultimo timestamptz not null default now()
);

alter table public.keepalive enable row level security;

drop policy if exists keepalive_select on public.keepalive;
drop policy if exists keepalive_insert on public.keepalive;
drop policy if exists keepalive_update on public.keepalive;
create policy keepalive_select on public.keepalive for select using (id = 1);
create policy keepalive_insert on public.keepalive for insert with check (id = 1);
create policy keepalive_update on public.keepalive for update using (id = 1) with check (id = 1);

alter table public.visitas drop constraint if exists visitas_largos_chk;
alter table public.visitas add constraint visitas_largos_chk check (
  char_length(coalesce(path, ''))             <= 300
  and char_length(coalesce(seccion, ''))          <= 100
  and char_length(coalesce(referrer_dominio, '')) <= 253
  and char_length(coalesce(pais, ''))             <= 8
);

alter table public.cotizaciones drop constraint if exists cotizaciones_largos_chk;
alter table public.cotizaciones add constraint cotizaciones_largos_chk check (
  char_length(coalesce(etiqueta, '')) <= 200
  and char_length(coalesce(origen, ''))   <= 60
);

alter table public.sugerencias drop constraint if exists sugerencias_nombre_chk;
alter table public.sugerencias add constraint sugerencias_nombre_chk check (
  char_length(coalesce(nombre, '')) <= 80
);
