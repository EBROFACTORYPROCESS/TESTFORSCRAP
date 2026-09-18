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
const FIELD_SCHEMA = {
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
    motivo_rechace: { type: 'string', description:  'A rejection reason handwritten INSIDE the box labeled "MOTIVO RECHACE", in the LOWER-LEFT of the form. It is typically a short phrase describing the defect, e.g. "DESCASCARADA CON GOLPE DE CAJAS", "RAYADO", "GOLPE". It is NEVER a date, NEVER an operator ID, NEVER a 4-digit code. The text must be physically written INSIDE the MOTIVO RECHACE box — do NOT spread it to other fields.' },
    fecha: { type: 'string', description: 'A DATE handwritten INSIDE the small box labeled "FECHA" at the BOTTOM-LEFT of the form. The box is small and bordered by printed lines. A valid value MUST look like a date: "DD/MM/YY", "D/M/YY", "D-M-YY", "DD-MM-YYYY" (e.g. "22/4/26", "15-9-26"). If the box contains anything that is NOT a date — for example a word, a defect description, or an operator ID — return null. Do NOT invent a value. Do NOT copy the date into the OPERARIO box below.'},
    observaciones: { type: 'string', description: 'Free-text comments handwritten INSIDE the wide box labeled "OBSERVACIONES" at the BOTTOM-CENTER of the form. This box is OFTEN EMPTY. If empty, return null. The value must be physically written INSIDE the OBSERVACIONES box — do NOT copy text from MOTIVO RECHACE, FECHA, or OPERARIO.'},
    operario: { type: 'string', description: 'A short OPERATOR ID handwritten INSIDE the small box labeled "OPERARIO". This box sits DIRECTLY BELOW the "FECHA" box at the BOTTOM-LEFT of the form. Valid values are 3 or 4 digits (e.g. "897", "1234"). IMPORTANT: This box is VERY OFTEN EMPTY. If empty, return null. If the only handwriting in that area is the date (in the FECHA box above), do NOT copy it down — operario must stay null. It is NEVER a date, NEVER a defect description, NEVER a word.' }
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

// ---- Prompt builders ----
function buildPromptText() {
  const lines = [];
  lines.push('You are a data extraction assistant. Extract all information from this EBRO Factory "Control Calidad" form image.');
  lines.push('');
  lines.push('CRITICAL RULES:');
  lines.push('');
  lines.push('1. ORIENTATION: The image may be rotated. Before reading any field, mentally rotate so that the "EBRO" logo is TOP-LEFT and the colored header band runs horizontally across the top.');
  lines.push('');
  lines.push('2. HEADER BAND COLOR:');
  lines.push('   - GREEN → part_category = "Process Scrap Parts"');
  lines.push('   - ORANGE → part_category = "Supplier Claim Parts"');
  lines.push('');
   lines.push('3. ANTI-DUPLICATION RULE (MANDATORY):');
  lines.push('   A single piece of handwritten text can only belong to ONE field. It can NEVER appear in two or more fields.');
  lines.push('   Before returning the JSON, perform this verification step:');
  lines.push('     a) Build a list of all non-null values.');
  lines.push('     b) For each pair of fields, check whether their values are identical (case-insensitive, ignoring extra spaces).');
  lines.push('     c) If two fields have the same value, KEEP it only in the field whose printed box physically contains that handwriting, and set the other to null.');
  lines.push('   ');
  lines.push('   Concrete example — this is WRONG:');
  lines.push('     fecha:          "15-9-26"');
  lines.push('     operario:       "15-9-26"    ← WRONG, duplicated');
  lines.push('   ');
  lines.push('   Correct output:');
  lines.push('     fecha:          "15-9-26"');
  lines.push('     operario:       null         ← the OPERARIO box is empty');
  lines.push('   ');
  lines.push('   Another example — this is WRONG:');
  lines.push('     motivo_rechace: "DESCASCARADA CON GOLPE DE CAJAS"');
  lines.push('     observaciones:  "DESCASCARADA CON GOLPE DE CAJAS"   ← WRONG');
  lines.push('     operario:       "DESCASCARADA CON GOLPE DE CAJAS"   ← WRONG');
  lines.push('   ');
  lines.push('   Correct output:');
  lines.push('     motivo_rechace: "DESCASCARADA CON GOLPE DE CAJAS"');
  lines.push('     observaciones:  null');
  lines.push('     operario:       null');
  lines.push('');
  lines.push('4. STRICT FIELD-BOX READING:');
  lines.push('   Each value is written INSIDE a specific printed box on the form.');
  lines.push('   Use the box BORDERS (the printed lines) to decide which field a value belongs to.');
  lines.push('   Do NOT guess or "spread" a value to fill empty fields.');
  lines.push('   If a box is EMPTY, return null for that field. An empty box is a valid answer.');
  lines.push('');
  lines.push('5. POSITIONAL ANCHORS (use these to locate each field):');
  lines.push('   - motivo_rechace:  LOWER-LEFT area, under the label "MOTIVO RECHACE"');
  lines.push('   - fecha:           BOTTOM-LEFT, small box with label "FECHA"');
  lines.push('   - operario:        BOTTOM-LEFT, small box with label "OPERARIO" (DIRECTLY BELOW fecha)');
  lines.push('   - observaciones:   BOTTOM-CENTER, wide box with label "OBSERVACIONES"');
  lines.push('   - cantidad:        MIDDLE-RIGHT, box labeled "CANTIDAD"');
  lines.push('   - codigo_rechaz:   MIDDLE-LEFT, small box labeled "CÓDIGO RECHAZ"');
  lines.push('   These boxes are in DIFFERENT physical locations. A value written in one box cannot appear in another.');
  lines.push('');
  lines.push('6. Each field description below tells you exactly where its label is and what its value should look like.');
  lines.push('7. For handwritten values, transcribe exactly what you see.');
  lines.push('8. For signature fields, return exactly "Signed" or "Not Signed".');
  lines.push('9. If a non-signature field is empty or illegible, use null. NEVER copy a neighbor value to fill it.');
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
