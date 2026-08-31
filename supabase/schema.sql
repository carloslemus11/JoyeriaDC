-- Joyería DC — esquema base (Fase 1). Tablas para las fases 1-5.
--
-- Estado: YA APLICADO al proyecto Supabase (ardfyksmwwwignoejaft) el 2026-08-31
-- como migración `fase1_schema_inicial`. Este archivo es la fuente de verdad
-- del esquema; si se recrea el proyecto, correr en orden: schema.sql,
-- policies.sql, storage.sql (SQL Editor de Supabase).

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
  id           uuid primary key default gen_random_uuid(),
  nombre       text not null,
  categoria_id uuid references public.categorias(id) on delete set null,
  descripcion  text,
  orden        int  not null default 0,
  activa       boolean not null default true,
  created_at   timestamptz not null default now(),
  updated_at   timestamptz not null default now()
);

-- Fotos de cada pieza (los archivos viven en Storage, bucket "piezas")
create table public.pieza_fotos (
  id           uuid primary key default gen_random_uuid(),
  pieza_id     uuid not null references public.piezas(id) on delete cascade,
  storage_path text not null,
  alt          text,
  orden        int  not null default 0
);

-- Calificaciones de servicio (1-5, anónimas)
create table public.calificaciones (
  id          uuid primary key default gen_random_uuid(),
  estrellas   int  not null check (estrellas between 1 and 5),
  device_hash text,
  created_at  timestamptz not null default now()
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

-- favoritos (Fase 6) se creará solo si se aprueba esa fase.
