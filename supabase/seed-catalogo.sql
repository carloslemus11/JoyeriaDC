-- Fase 2 — seed del catálogo con el contenido que estaba escrito a mano en index.html.
-- Estado: YA APLICADO (migración `fase2_seed_catalogo`) el 2026-08-31.
-- Sin descripciones por pieza: la galería solo tenía el nombre; no se inventan textos.
--
-- pieza_fotos.storage_path arranca apuntando al respaldo del repo
-- (`assets/piezas/*.jpeg`). El botón "Importar fotos iniciales" del panel /admin
-- sube cada archivo al bucket "piezas" y cambia el path a `catalogo/*.jpeg`.
-- Convención que entiende el front (assets/catalogo.js -> fotoUrl):
--   assets/... o /...  -> archivo del sitio;  resto -> objeto de Storage.

insert into public.categorias (nombre, slug, descripcion, cta_label, cta_msg, orden, activa) values
  ('Anillos',            'anillos',          'Solitarios, alianzas y anillos con piedras — clásicos o hechos a tu medida.', 'Cotizar anillo →',    'Hola, quiero cotizar un anillo en oro 18K.',            1, true),
  ('Cadenas',            'cadenas',          'Cubanas, veneciana y barbadas en distintos gramajes, con o sin dije.',        'Cotizar cadena →',    'Hola, quiero cotizar una cadena en oro 18K.',           2, true),
  ('Pulseras',           'pulseras',         'Tejidas, de eslabón fino o con dijes — para regalar o para ti.',              'Cotizar pulsera →',   'Hola, quiero cotizar una pulsera en oro 18K.',          3, true),
  ('Dijes y accesorios', 'dijes-accesorios', 'Iniciales, símbolos y detalles pequeños que hacen la diferencia.',            'Cotizar accesorio →', 'Hola, quiero cotizar un dije o accesorio en oro 18K.',  4, true)
on conflict (slug) do nothing;

with datos(nombre, cat_slug, orden, foto) as (values
  ('Anillo corazón 15',       'anillos',  1, 'assets/piezas/corona-15.jpeg'),
  ('Anillo corona',           'anillos',  2, 'assets/piezas/corona-colores.jpeg'),
  ('Anillo con zafiro',       'anillos',  3, 'assets/piezas/anillo-azul.jpeg'),
  ('Anillo con esmeralda',    'anillos',  4, 'assets/piezas/anillo-verde.jpeg'),
  ('Banda con esmeraldas',    'anillos',  5, 'assets/piezas/banda-verde.jpeg'),
  ('Cadena con cruz',         'cadenas',  6, 'assets/piezas/cadena-cruz.jpeg'),
  ('Pulsera tricolor',        'pulseras', 7, 'assets/piezas/pulsera-colombia.jpeg'),
  ('Pulsera de esferas',      'pulseras', 8, 'assets/piezas/pulsera-esferas.jpeg'),
  ('Argollas de matrimonio',  'anillos',  9, 'assets/piezas/argollas.jpeg')
),
ins_pieza as (
  insert into public.piezas (nombre, categoria_id, descripcion, orden, activa)
  select d.nombre, c.id, null, d.orden, true
  from datos d
  join public.categorias c on c.slug = d.cat_slug
  returning id, nombre
)
insert into public.pieza_fotos (pieza_id, storage_path, alt, orden)
select p.id, d.foto, d.nombre, 0
from ins_pieza p
join datos d on d.nombre = p.nombre;
