-- Joyería DC — Storage (Fase 1): bucket "piezas" para las fotos del catálogo
--
-- Estado: YA APLICADO (migración `fase1_storage_piezas`) el 2026-08-31.

insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values (
  'piezas', 'piezas', true,
  5242880, -- 5 MB
  array['image/jpeg','image/png','image/webp']
)
on conflict (id) do update
  set public = excluded.public,
      file_size_limit = excluded.file_size_limit,
      allowed_mime_types = excluded.allowed_mime_types;

-- Lectura pública de los objetos del bucket "piezas"
create policy piezas_storage_lectura_publica on storage.objects
  for select using (bucket_id = 'piezas');

-- Escritura / actualización / borrado: solo admin
create policy piezas_storage_admin_insert on storage.objects
  for insert with check (bucket_id = 'piezas' and private.is_admin());
create policy piezas_storage_admin_update on storage.objects
  for update using (bucket_id = 'piezas' and private.is_admin())
  with check (bucket_id = 'piezas' and private.is_admin());
create policy piezas_storage_admin_delete on storage.objects
  for delete using (bucket_id = 'piezas' and private.is_admin());
