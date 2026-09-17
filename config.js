// ============================================================
//  Configuration: platforms, field schema, format rules
// ============================================================

const PLATFORM_STORAGE = 'ai_platform';
const API_KEY_STORAGE_PREFIX = 'api_key_';
const GEMINI_MODEL_STORAGE = 'gemini_model';
const PATH_PREFIX_STORAGE = 'source_path_prefix';
const MAX_SIZE_STORAGE = 'max_image_size';
const LOCAL_MODE_STORAGE = 'local_mode_enabled';
const LOCAL_HANDLE_DB = 'ebro_fs_handles';
const RATE_LIMIT_PER_MIN = 15;
// ---- Key parameters that must be present for a form to be considered valid ----
const KEY_PARAMETERS = [
  { path: 'section_1.codigo_conjunto',    label: 'Código Conjunto' },
  { path: 'section_1.codigo_rechaz',      label: 'Código Rechazo' },
  { path: 'section_1.cantidad',           label: 'Cantidad' },
  { path: 'section_1.origen_area_zona',   label: 'Origen Área/Zona' },
  { path: 'section_2.fecha',              label: 'Fecha' },
  { path: 'section_2.operario',           label: 'Operario' },
  { path: 'signatures.encargado_linea',   label: 'Signature Encargado Línea' }
];
// ---- AI Platform configs ----
const PLATFORMS = {
  gemini: {
    name: 'Gemini',
    // defaultModel is now selected at runtime via the model dropdown.
    // This fallback is used only if the selector has no stored value.
    defaultModel: 'gemini-3.6-flash',
    endpoint: (model) => `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent`,
    keyHint: 'Get a free key at aistudio.google.com',
    placeholder: 'Paste your Gemini API Key...',
    badgeClass: 'gemini',
    // Available Gemini models with their known free-tier limits.
    // The list is used to build the dropdown. Add/remove entries as needed.
    models: [
      {
        id: 'gemini-3.6-flash',
        label: 'Gemini 3.6 Flash',
        note: 'Free tier: ~5 RPM, ~20 RPD — best quality, very limited daily quota'
      },
      {
        id: 'gemini-3.5-flash',
        label: 'Gemini 3.5 Flash',
        note: 'Free tier: ~10 RPM, ~250 RPD — good balance of quality and quota'
      },
      {
        id: 'gemini-3.5-flash-lite',
        label: 'Gemini 3.5 Flash-Lite',
        note: 'Free tier: ~30 RPM, ~500 RPD — fastest, recommended for high-volume batches'
      },
      {
        id: 'gemini-3.1-flash-lite',
        label: 'Gemini 3.1 Flash-Lite',
        note: 'Free tier: ~30 RPM, ~500 RPD — stable fallback, good for fixed-template forms'
      },
      {
        id: 'gemini-3.6-pro',
        label: 'Gemini 3.6 Pro',
        note: 'Paid tier only — highest quality, no free daily quota'
      }
    ]
  },
  deepseek: {
    name: 'DeepSeek',
    defaultModel: 'deepseek-chat',
    endpoint: () => `https://api.deepseek.com/chat/completions`,
    keyHint: 'Get a key at platform.deepseek.com',
    placeholder: 'Paste your DeepSeek API Key...',
    badgeClass: 'deepseek',
  }
};

// ---- Field schema (descriptions sent to the AI) ----
// Loaded from data.json at startup; this is the fallback if fetching fails.
let FIELD_SCHEMA = {
  header: {
    part_category: {
      type: 'string',
      description: 'The category of the part, determined by the color of the TOP HEADER BAND of the form. Look at the broad colored strip across the top of the form, just below the EBRO logo area. If that header band is GREEN, return exactly "Process Scrap Parts". If that header band is ORANGE, return exactly "Supplier Claim Parts". Return exactly one of those two strings.'
    },
    company: { type: 'string', description: 'Top-left header inside a white box labeled "EBRO", usually reads "EBRO FACTORY". Located at the very top-left of the form.' },
    document_type: { type: 'string', description: 'The large title printed in the colored band near the top, usually "CONTROL CALIDAD". Located below the EBRO logo.' },
    red_number: { type: 'string', description: 'The large red printed number in the white box on the right side of the colored band, e.g. "173432". Located top-right, below the EBRO header.' }
  },
  section_1: {
    codigo_conjunto: { type: 'string', description: 'The handwritten value inside the box labeled "CÓDIGO CONJUNTO". Usually a long alphanumeric code starting with "4", e.g. "40301YS92 AAAG4".' },
    codigo_componente: { type: 'string', description: 'The handwritten value inside the box labeled "CÓDIGO COMPONENTE". Usually contains "/" separators, e.g. "Pilar B/Sup/Der".' },
    codigo_rechaz: { type: 'string', description: 'The handwritten value inside the small box labeled "CÓDIGO RECHAZ". Usually a short numeric code, e.g. "2216".' },
    cantidad: { type: 'string', description: 'The handwritten value in the box labeled "CANTIDAD". Usually a single small number, e.g. "2".' },
    origen_area_zona: { type: 'string', description: 'The handwritten value in the "ORIGEN" box. Usually a short code like "n 1 5 2".' }
  },
  section_2: {
    motivo_rechace: { type: 'string', description: 'The rejecting code in the box labeled "MOTIVO RECHACE". Normally 4 digits, may contain letters (e.g. "2216", "2216D"). It is NOT a date and NOT an operator ID.' },
    fecha: { type: 'string', description: 'The date when the record is registered, in the box labeled "FECHA". Format "DD/MM/YY", e.g. "22/4/26". Must look like a date.' },
    observaciones: { type: 'string', description: 'The comments describing the issue, in the box labeled "OBSERVACIONES". A short text string, e.g. "Rápido", "Rayado". NOT a number, NOT a date.' },
    operario: { type: 'string', description: 'The operator ID in the box labeled "OPERARIO". Normally 3 or 4 digits (e.g. "897"). Located directly below "FECHA".' }
  },
  signatures: {
    inspector: { type: 'string', description: 'Whether the "INSPECTOR" box has a handwritten signature. Return exactly "Signed" or "Not Signed".' },
    visto_bueno_calidad: { type: 'string', description: 'Whether the "Vº Bº C. CALIDAD" box has a handwritten signature. Return exactly "Signed" or "Not Signed".' },
    encargado_linea: { type: 'string', description: 'Whether the "ENCARGADO LÍNEA" box has a handwritten signature. Return exactly "Signed" or "Not Signed".' }
  }
};

// ---- Format validation rules ----
const FORMAT_RULES = {
  'header.part_category': {
    test: v => /^(Process Scrap Parts|Supplier Claim Parts)$/i.test(v.trim()),
    hint: 'Expected "Process Scrap Parts" or "Supplier Claim Parts"'
  },
  'section_1.codigo_conjunto': { test: v => /^4[0-9A-Z\s\/\-]{6,}$/i.test(v.trim()), hint: 'Expected a long code starting with "4"' },
  'section_1.codigo_componente': { test: v => /[A-Za-z]/.test(v) && v.trim().length >= 4, hint: 'Expected a text description like "Pilar B/Sup/Der"' },
  'section_1.codigo_rechaz': { test: v => /^[0-9]{3,5}[A-Z]?$/i.test(v.trim()), hint: 'Expected a short numeric code like "2216"' },
  'section_1.cantidad': { test: v => /^[0-9]{1,3}$/.test(v.trim()), hint: 'Expected a small number like "2"' },
  'section_2.motivo_rechace': { test: v => /^[0-9A-Z]{3,5}$/i.test(v.replace(/\s+/g, '')), hint: 'Expected a 3-5 character rejecting code' },
  'section_2.fecha': { test: v => /^\d{1,2}[\/\-\.]\d{1,2}[\/\-\.]\d{2,4}$/.test(v.trim()), hint: 'Expected a date like "22/4/26"' },
  'section_2.operario': { test: v => /^[0-9]{3,4}$/.test(v.trim()), hint: 'Expected a 3 or 4 digit operator ID' },
  'section_2.observaciones': { test: v => /[A-Za-zÀ-ÿ]/.test(v) && !/^\d+$/.test(v.trim()), hint: 'Expected a text comment, not a number' },
  'signatures.inspector': { test: v => /^(Signed|Not Signed)$/i.test(v.trim()), hint: 'Expected "Signed" or "Not Signed"' },
  'signatures.visto_bueno_calidad': { test: v => /^(Signed|Not Signed)$/i.test(v.trim()), hint: 'Expected "Signed" or "Not Signed"' },
  'signatures.encargado_linea': { test: v => /^(Signed|Not Signed)$/i.test(v.trim()), hint: 'Expected "Signed" or "Not Signed"' }
};

// ---- Load schema from data.json (async) ----
async function loadFieldSchemaFromJson() {
  try {
    const res = await fetch('data.json', { cache: 'no-cache' });
    if (!res.ok) throw new Error(`HTTP ${res.status}`);
    const data = await res.json();
    if (data && typeof data === 'object' && data.header) {
      FIELD_SCHEMA = data;
      console.log('✅ Loaded FIELD_SCHEMA from data.json');
    }
  } catch (err) {
    console.warn('⚠️ Could not load data.json, using built-in fallback.', err);
  }
}

// ---- Prompt builders ----
function buildPromptText() {
  const lines = [];
  lines.push('You are a data extraction assistant. Extract all information from this EBRO Factory "Control Calidad" form image.');
  lines.push('');
  lines.push('CRITICAL RULES:');
  lines.push('1. The very FIRST thing you must determine is the color of the TOP HEADER BAND of the form:');
  lines.push('   - If the top header band is GREEN → part_category = "Process Scrap Parts"');
  lines.push('   - If the top header band is ORANGE → part_category = "Supplier Claim Parts"');
  lines.push('   Return that exact string in header.part_category.');
  lines.push('2. Each field description tells you EXACTLY where the label is on the form.');
  lines.push('3. Match the value based on SPATIAL PROXIMITY.');
  lines.push('4. Do NOT confuse similar fields (fecha vs operario vs motivo_rechace).');
  lines.push('5. For handwritten values, transcribe exactly what you see.');
  lines.push('6. For signature fields, return exactly "Signed" or "Not Signed".');
  lines.push('7. If a non-signature field is empty or illegible, use null.');
  lines.push('');
  lines.push('Return a valid JSON object with the structure below:');
  lines.push('');

  const obj = {};
  const sections = Object.keys(FIELD_SCHEMA);
  sections.forEach(section => {
    obj[section] = {};
    Object.keys(FIELD_SCHEMA[section]).forEach(field => {
      obj[section][field] = FIELD_SCHEMA[section][field].description;
    });
  });
  lines.push(JSON.stringify(obj, null, 2));
  lines.push('');
  lines.push('Return ONLY the JSON object. No markdown fences, no explanations.');
  return lines.join('\n');
}

function buildJsonSchema() {
  const properties = {};
  const sections = Object.keys(FIELD_SCHEMA);
  sections.forEach(section => {
    properties[section] = {
      type: 'object',
      properties: {},
      required: Object.keys(FIELD_SCHEMA[section])
    };
    Object.keys(FIELD_SCHEMA[section]).forEach(field => {
      properties[section].properties[field] = {
        type: FIELD_SCHEMA[section][field].type,
        description: FIELD_SCHEMA[section][field].description
      };
    });
  });
  return { type: 'object', properties, required: sections };
}

function checkFormat(path, value) {
  const rule = FORMAT_RULES[path];
  if (!rule) return 'ok';
  if (value === null || value === undefined || String(value).trim() === '') return 'missing';
  const s = String(value).trim();
  try { return rule.test(s) ? 'ok' : 'format-mismatch'; } catch (e) { return 'ok'; }
}
