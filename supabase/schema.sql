-- Joyería DC — esquema base. Fuente de verdad del esquema actual.
--
-- Estado: aplicado al proyecto Supabase (ardfyksmwwwignoejaft) vía migraciones.
-- Si se recrea el proyecto, correr en orden: schema.sql, policies.sql,
-- storage.sql, funciones.sql (SQL Editor de Supabase).
--
-- Historial relevante:
--   * Fase 3 (calificaciones) y Fase 6 (cuentas de cliente / favoritos) fueron
--     RETIRADAS el 2026-08-31 (migraciones `retirar_resenas`, `visitas_v2` y
--     `quitar_favoritos_agregar_visitas`). Ya no existen las tablas
--     `calificaciones` ni `favoritos`.
--   * `visitas` (manejo de tráfico) se agregó el 2026-08-31 (migración `visitas_v2`).
--   * `piezas.disponibilidad` se agregó el 2026-09-01 (migración `piezas_disponibilidad`):
--     'disponible' | 'encargo' | 'agotada', default 'disponible'. Editable en /admin.

create extension if not exists pgcrypto;

-- Categorías del catálogo
create table public.categorias (
  id          uuid primary key default gen_random_uuid(),
  nombre      text not null,
  slug        text not null unique,
  descripcion text,
  cta_label   text,           -- texto del botón "Cotizar ... →" (fase2_categorias_cta)
  cta_msg     text,           -- mensaje de WhatsApp del botón; si null, el front genera uno genérico
  orden       int  not null default 0,
  activa      boolean not null default true,
  created_at  timestamptz not null default now()
);

-- Piezas del catálogo
create table public.piezas (
  id             uuid primary key default gen_random_uuid(),
  nombre         text not null,
  categoria_id   uuid references public.categorias(id) on delete set null,
  descripcion    text,
  disponibilidad text not null default 'disponible'
                 check (disponibilidad in ('disponible','encargo','agotada')), -- migración piezas_disponibilidad (2026-09-01)
  orden          int  not null default 0,
  activa         boolean not null default true,
  created_at     timestamptz not null default now(),
  updated_at     timestamptz not null default now()
);

-- Fotos de cada pieza (los archivos viven en Storage, bucket "piezas")
create table public.pieza_fotos (
  id           uuid primary key default gen_random_uuid(),
  pieza_id     uuid not null references public.piezas(id) on delete cascade,
  storage_path text not null,
  alt          text,
  orden        int  not null default 0
);

-- Sugerencias de visitantes (moderación previa antes de mostrarse)
create table public.sugerencias (
  id         uuid primary key default gen_random_uuid(),
  nombre     text,
  texto      text not null,
  estado     text not null default 'pendiente' check (estado in ('pendiente','aprobada','oculta')),
  created_at timestamptz not null default now()
);

-- Registro de clics de "Cotizar" (interés por pieza)
create table public.cotizaciones (
  id         uuid primary key default gen_random_uuid(),
  pieza_id   uuid references public.piezas(id) on delete set null,
  etiqueta   text,
  origen     text,
  created_at timestamptz not null default now()
);

-- Textos editables del sitio (clave -> valor)
create table public.contenido_sitio (
  clave          text primary key,
  valor          text,
  actualizado_at timestamptz not null default now()
);

-- Manejo de visitas (migración visitas_v2). Un registro por carga de página del
-- sitio público. Anónimo: sin IP, sin identificador persistente, sin user-agent.
create table public.visitas (
  id               uuid primary key default gen_random_uuid(),
  path             text,
  seccion          text,
  fuente           text check (fuente in ('instagram','google','facebook','whatsapp','directo','otro')),
  referrer_dominio text,
  dispositivo      text check (dispositivo in ('movil','tablet','escritorio')),
  pais             text,               -- código ISO-2 aproximado (Netlify Edge Function)
  created_at       timestamptz not null default now()
);
create index visitas_created_idx on public.visitas (created_at desc);

-- Perfiles de administradores (enlazados a auth.users)
create table public.perfiles (
  id         uuid primary key references auth.users(id) on delete cascade,
  rol        text not null default 'admin',
  created_at timestamptz not null default now()
);

create index piezas_categoria_idx   on public.piezas(categoria_id);
create index pieza_fotos_pieza_idx  on public.pieza_fotos(pieza_id);
create index sugerencias_estado_idx on public.sugerencias(estado);
create index cotizaciones_pieza_idx on public.cotizaciones(pieza_id);

-- piezas.updated_at se mantiene solo (migración fase2_piezas_updated_at)
create or replace function public.touch_updated_at()
returns trigger language plpgsql set search_path = '' as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

create trigger piezas_touch_updated_at
  before update on public.piezas
  for each row execute function public.touch_updated_at();
