-- Joyería DC — RLS y políticas (Fase 1)
--
-- Estado: YA APLICADO (migraciones `fase1_rls_politicas` y
-- `fase1_is_admin_a_schema_privado`) el 2026-08-31.
--
-- Regla general:
--   * Público (anon): puede LEER catálogo/textos activos; puede INSERTAR
--     calificaciones, sugerencias y cotizaciones. Nada más.
--   * Admin (usuario con fila en public.perfiles, rol='admin'): acceso total.

-- Helper: ¿el usuario actual es admin?
-- Vive en el schema `private` (no expuesto por PostgREST) para que no quede
-- como endpoint RPC. Las políticas la resuelven por OID; anon/authenticated
-- tienen USAGE sobre `private` para poder evaluarla dentro de las políticas.
create schema if not exists private;
grant usage on schema private to anon, authenticated;

create or replace function private.is_admin()
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists (
    select 1 from public.perfiles
    where id = auth.uid() and rol = 'admin'
  );
$$;

alter table public.categorias      enable row level security;
alter table public.piezas          enable row level security;
alter table public.pieza_fotos     enable row level security;
alter table public.calificaciones  enable row level security;
alter table public.sugerencias     enable row level security;
alter table public.cotizaciones    enable row level security;
alter table public.contenido_sitio enable row level security;
alter table public.perfiles        enable row level security;

-- ---------- Catálogo ----------
create policy categorias_select_publico on public.categorias
  for select using (activa or private.is_admin());
create policy categorias_admin_todo on public.categorias
  for all using (private.is_admin()) with check (private.is_admin());

create policy piezas_select_publico on public.piezas
  for select using (activa or private.is_admin());
create policy piezas_admin_todo on public.piezas
  for all using (private.is_admin()) with check (private.is_admin());

create policy pieza_fotos_select_publico on public.pieza_fotos
  for select using (
    private.is_admin() or exists (
      select 1 from public.piezas p where p.id = pieza_id and p.activa
    )
  );
create policy pieza_fotos_admin_todo on public.pieza_fotos
  for all using (private.is_admin()) with check (private.is_admin());

-- ---------- Textos del sitio ----------
create policy contenido_select_publico on public.contenido_sitio
  for select using (true);
create policy contenido_admin_todo on public.contenido_sitio
  for all using (private.is_admin()) with check (private.is_admin());

-- ---------- Calificaciones ----------
create policy calificaciones_insert_publico on public.calificaciones
  for insert with check (estrellas between 1 and 5);
create policy calificaciones_select_publico on public.calificaciones
  for select using (true);

-- ---------- Sugerencias ----------
create policy sugerencias_insert_publico on public.sugerencias
  for insert with check (
    char_length(coalesce(texto,'')) between 1 and 2000
    and estado = 'pendiente'
  );
create policy sugerencias_select_aprobadas on public.sugerencias
  for select using (estado = 'aprobada' or private.is_admin());
create policy sugerencias_admin_todo on public.sugerencias
  for all using (private.is_admin()) with check (private.is_admin());

-- ---------- Cotizaciones ----------
create policy cotizaciones_insert_publico on public.cotizaciones
  for insert with check (true);
create policy cotizaciones_admin_select on public.cotizaciones
  for select using (private.is_admin());

-- ---------- Perfiles ----------
create policy perfiles_admin_todo on public.perfiles
  for all using (private.is_admin()) with check (private.is_admin());
