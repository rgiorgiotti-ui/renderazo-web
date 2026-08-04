/* =====================================================================
   PROXY AIRTABLE -> SITIO
   ---------------------------------------------------------------------
   Esta función corre en el servidor de Netlify, NUNCA en el navegador
   del visitante. Por eso el AIRTABLE_TOKEN puede vivir acá de forma
   segura: se lee desde una variable de entorno configurada en el panel
   de Netlify (Site settings > Environment variables), nunca escrita en
   este archivo ni en el HTML público.

   El sitio le pide los datos a esta función llamando a:
   /.netlify/functions/get-data

   Y esta función responde con un único JSON, ya ordenado y filtrado,
   listo para que el frontend lo pinte sin tener que entender nada de
   la estructura de Airtable.
===================================================================== */

const BASE_URL = 'https://api.airtable.com/v0';

async function fetchTable(baseId, token, tableName) {
  const url = `${BASE_URL}/${baseId}/${encodeURIComponent(tableName)}`;
  const res = await fetch(url, {
    headers: { Authorization: `Bearer ${token}` },
  });
  if (!res.ok) {
    const detail = await res.text().catch(() => '');
    throw new Error(`No se pudo leer la tabla "${tableName}" (HTTP ${res.status}): ${detail}`);
  }
  const json = await res.json();
  return json.records.map((r) => r.fields);
}

const byOrden = (a, b) => (a.Orden || 0) - (b.Orden || 0);
const firstAttachmentUrl = (field) => (Array.isArray(field) && field[0] ? field[0].url : null);

/* Busca una columna por palabra clave dentro de su nombre, sin importar
   mayúsculas, tildes ni el resto del nombre exacto. Así "Desc_interiores"
   o "Descripcion_Interiores" matchean igual buscando ['interior']. */
function findKey(record, keywords) {
  const normalize = (s) => s.toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '');
  return Object.keys(record).find((k) => {
    const nk = normalize(k);
    return keywords.every((kw) => nk.includes(normalize(kw)));
  });
}
function findValue(record, keywords) {
  const key = findKey(record, keywords);
  return key ? record[key] : '';
}
function findAttachmentUrl(record, keywords) {
  const key = findKey(record, keywords);
  return key ? firstAttachmentUrl(record[key]) : null;
}
function normalizeLoose(s) {
  return String(s || '').toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '');
}

exports.handler = async function () {
  const token = process.env.AIRTABLE_TOKEN;
  const baseId = process.env.AIRTABLE_BASE_ID;

  if (!token || !baseId) {
    return {
      statusCode: 500,
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        error: 'Faltan las variables de entorno AIRTABLE_TOKEN y/o AIRTABLE_BASE_ID en la configuración de Netlify.',
      }),
    };
  }

  try {
    const [servicios, trabajos, antesDespues, videos, precios, generalRows] = await Promise.all([
      fetchTable(baseId, token, 'Servicios'),
      fetchTable(baseId, token, 'Nuestros Trabajos'),
      fetchTable(baseId, token, 'Antes_Después'),
      fetchTable(baseId, token, 'Videos'),
      fetchTable(baseId, token, 'Precios'),
      fetchTable(baseId, token, 'Contenido_General'),
    ]);

    const general = generalRows[0] || {};

    const data = {
      studio: {
        name: findValue(general, ['nombre']) || findValue(general, ['estudio']) || '',
        logo: findAttachmentUrl(general, ['logo']),
      },
      heroImage: findAttachmentUrl(general, ['hero']),
      stats: [1, 2, 3, 4].map((n) => ({
        num: general[`Stat${n}_Numero`] || '',
        label: general[`Stat${n}_Label`] || '',
      })).filter((s) => s.num || s.label),

      services: servicios
        .filter((s) => s.Activo)
        .sort(byOrden)
        .map((s) => ({ title: s.Nombre || '', text: s['Descripción'] || '' })),

      gallery: trabajos
        .sort(byOrden)
        .map((t) => ({
          title: t['Título'] || '',
          cat: t['Categorías'] || '',
          image: firstAttachmentUrl(t.Imagen),
          destacado: !!t.Destacado,
        })),

      compareProceso: (() => {
        const row = antesDespues.find((r) => normalizeLoose(r.Tipo).includes('proceso'));
        if (!row) return null;
        return {
          title: row['Título del proyecto'] || '',
          before: findAttachmentUrl(row, ['antes']),
          after: findAttachmentUrl(row, ['despues']),
        };
      })(),

      remodelaciones: antesDespues
        .filter((r) => normalizeLoose(r.Tipo).includes('remodel'))
        .sort(byOrden)
        .map((r) => ({
          title: r['Título del proyecto'] || '',
          before: findAttachmentUrl(r, ['antes']),
          after: findAttachmentUrl(r, ['despues']),
        })),

      videos: videos
        .sort(byOrden)
        .map((v) => ({
          title: v['Título'] || '',
          url: v['Link de YouTube'] || '',
          cat: v['Categoría'] || '',
        })),

      pricing: precios
        .sort(byOrden)
        .map((p) => ({
          tag: p.Etiqueta || '',
          title: p.Servicio || '',
          price: p.Precio || 0,
          unit: p.Unidad || '',
          items: (p.Incluye || '').split('\n').map((s) => s.trim()).filter(Boolean),
          featured: !!p.Destacado,
        })),

      about: {
        text: findValue(general, ['texto']) || findValue(general, ['nosotros']) || '',
        descInteriores: findValue(general, ['interior']) || '',
        descExteriores: findValue(general, ['exterior']) || '',
        descRemodelaciones: findValue(general, ['remodel']) || '',
      },

      contact: {
        whatsapp: general.Whatsapp || '',
        email: general.Email || '',
        instagram: general.Instagram || '',
      },
    };

    return {
      statusCode: 200,
      headers: {
        'Content-Type': 'application/json',
        'Cache-Control': 'public, max-age=60',
        'Access-Control-Allow-Origin': '*',
      },
      body: JSON.stringify({
        ...data,
        _debug: {
          columnasContenidoGeneral: Object.keys(general),
          filasAntesDespues: antesDespues.map((r) => ({ tipo: r.Tipo, columnas: Object.keys(r) })),
        },
      }),
    };
  } catch (err) {
    return {
      statusCode: 500,
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ error: err.message }),
    };
  }
};
