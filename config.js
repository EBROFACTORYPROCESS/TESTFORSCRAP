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
const INPUT_METHOD_STORAGE = 'input_method'; // 'folder' | 'upload'
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
    codigo_conjunto: { type: 'string', description: 'The handwritten value inside the box labeled "CÓDIGO CONJUNTO", in the first row of the form body directly under the colored header band. It is usually a LONG alphanumeric code (typically 8-20 characters) that may start with any letter or digit. It may contain spaces and the characters / - . but should NOT contain special symbols like ? ! @ # $ % & * ( ) + = [ ] { } < >. Example: "40301YS92 AAAG4", "C4071823B", "601234X/2".'
    },    
    codigo_componente: { type: 'string', description: 'The handwritten value inside the box labeled "CÓDIGO COMPONENTE". Usually contains "/" separators, e.g. "Pilar B/Sup/Der".' },
    codigo_rechaz: { type: 'string', description: 'The handwritten value inside the small box labeled "CÓDIGO RECHAZ". Usually a short numeric code, e.g. "2216".' },
    cantidad: { type: 'string', description: 'The handwritten value in the box labeled "CANTIDAD". Usually a single small number, e.g. "2".' },
    origen_area_zona: { type: 'string', description: 'The handwritten value in the "ORIGEN" box. Usually a short code like "n 1 5 2".' }
  },
  section_2: {
    motivo_rechace: { type: 'string', description: 'The rejecting code in the box labeled "MOTIVO RECHACE". Normally 4 digits, may contain letters (e.g. "2216", "2216D"). It is NOT a date and NOT an operator ID.' },
    fecha: { type: 'string', description: 'The date when the record was registered, written INSIDE the box labeled "FECHA" at the BOTTOM-LEFT of the form. Format is usually "DD/MM/YY", "D-M-YY", or "DD-MM-YYYY" (e.g. "22/4/26", "15-9-26"). This value belongs ONLY to the FECHA field — do NOT repeat it in the OPERARIO field below.'},
    observaciones: { type: 'string', description: 'The comments describing the issue, in the box labeled "OBSERVACIONES". A short text string, e.g. "Rápido", "Rayado". NOT a number, NOT a date.' },
    operario: { type: 'string', description: 'The operator ID handwritten INSIDE the box labeled "OPERARIO", located at the BOTTOM-LEFT of the form, directly below the "FECHA" box. IMPORTANT: This box often appears EMPTY. If it is empty, return null — do NOT copy the date from the FECHA box above. A valid value is normally 3 or 4 digits (e.g. "897", "1234"). It is NEVER a date like "15-9-26".' }
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
  'section_1.codigo_conjunto': {
    // Long alphanumeric code. May start with any character (letter or digit).
    // Must NOT contain special symbols like ? ! @ # $ % & * ( ) = + [ ] { } etc.
    // Allowed: letters A-Z, digits 0-9, space, and the separators / - .
    test: v => {
      const s = v.trim();
      if (s.length < 8) return false;
      if (/[?!@#$%&*()=+\[\]{}<>"';:`~^|\\]/.test(s)) return false;
      if (!/\d/.test(s)) return false;
      return true;
    },
    hint: 'Expected a long alphanumeric code (letters, digits, spaces, / - .). Must not contain special symbols.'
  },
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
  lines.push('1. ORIENTATION FIRST: The image may be rotated (0°, 90°, 180°, or 270°). Before reading any field, mentally rotate the image so that:');
  lines.push('   - The "EBRO" logo and "FACTORY" text are at the TOP-LEFT and readable left-to-right.');
  lines.push('   - The colored header band runs horizontally across the top.');
  lines.push('   - All form labels (CÓDIGO CONJUNTO, FECHA, etc.) are upright and readable.');
  lines.push('   If the form appears sideways or upside-down, correct it internally before extraction. Do NOT report the rotation; just extract values as if the form were upright.');
  lines.push('');
  lines.push('2. HEADER BAND COLOR: Determine the color of the TOP HEADER BAND:');
  lines.push('   - GREEN → part_category = "Process Scrap Parts"');
  lines.push('   - ORANGE → part_category = "Supplier Claim Parts"');
  lines.push('   Return that exact string in header.part_category.');
  lines.push('');
  lines.push('3. STRICT FIELD-BOX READING (MOST IMPORTANT RULE):');
  lines.push('   Each value MUST be read from INSIDE its own labeled box only. Do NOT read the same content into two different fields, even if they are adjacent.');
  lines.push('   - Every field has its OWN dedicated rectangular box on the form.');
  lines.push('   - A value written in the FECHA box belongs ONLY to section_2.fecha.');
  lines.push('   - A value written in the OPERARIO box belongs ONLY to section_2.operario.');
  lines.push('   - A value written in the CANTIDAD box belongs ONLY to section_1.cantidad.');
  lines.push('   - NEVER duplicate the same string across two fields.');
  lines.push('   - If a box is EMPTY, return null for that field — do NOT copy a value from an adjacent box.');
  lines.push('   - Use the box BORDERS (the printed lines around each field) to decide where a value belongs.');
  lines.push('   - Example mistake to AVOID: If the date "15-9-26" is written only in the FECHA box, and the OPERARIO box is empty, then fecha="15-9-26" and operario=null. Do NOT set operario="15-9-26".');
  lines.push('');
  lines.push('4. Each field description below tells you EXACTLY where its label is and what its value should look like.');
  lines.push('5. Match the value based on SPATIAL PROXIMITY, but only within the correct field box.');
  lines.push('6. Do NOT confuse similar fields (fecha vs operario vs motivo_rechace). They live in different boxes.');
  lines.push('7. For handwritten values, transcribe exactly what you see. Preserve spaces and separators.');
  lines.push('8. For signature fields, return exactly "Signed" or "Not Signed".');
  lines.push('9. If a non-signature field is empty or illegible, use null. NEVER fill an empty field by copying a neighbor.');
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
