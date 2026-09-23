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
const INPUT_METHOD_STORAGE = 'input_method';
const RATE_LIMITS_OVERRIDE_KEY = 'rate_limits_override';

// ---- Key parameters that must be present for a form to be considered valid ----
const KEY_PARAMETERS = [
  { path: 'section_1.codigo_conjunto',    label: 'Código Conjunto' },
  { path: 'section_1.codigo_rechaz',      label: 'Código Rechazo' },
  { path: 'section_1.cantidad',           label: 'Cantidad' },
  { path: 'section_1.codigo_componente',  label: 'Código Componente' },
  { path: 'section_1.origen_area_zona',   label: 'Origen Área/Zona' },
  { path: 'section_2.fecha',              label: 'Fecha' },
  { path: 'section_2.operario',           label: 'Operario' },
  { path: 'section_2.motivo_rechace',     label: 'Motivo Rechace' },
  { path: 'signatures.encargado_linea',   label: 'Signature Encargado Línea' }
];

// Fields that should NEVER be classified as "missing" even when empty.
const OPTIONAL_FIELDS = [
  'section_2.observaciones'
];

// Fields to hide from the result table and KPI summary.
const HIDDEN_FIELDS = [
  'header.company',
  'header.document_type'
];

// ---- AI Platform configs ----
const PLATFORMS = {
  gemini: {
    name: 'Gemini',
    defaultModel: 'gemini-3.6-flash',
    endpoint: (model) => `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent`,
    keyHint: 'Get a free key at <a href="https://aistudio.google.com" target="_blank" rel="noopener noreferrer">aistudio.google.com</a>',
    placeholder: 'Paste your Gemini API Key...',
    badgeClass: 'gemini',
    models: [
      {
        id: 'gemini-3.6-flash',
        label: 'Gemini 3.6 Flash',
        note: 'Free tier: ~5 RPM, ~20 RPD — best quality, very limited daily quota',
        limits: { rpm: 5, tpm: 250000, rpd: 20 }
      },
      {
        id: 'gemini-3.5-flash',
        label: 'Gemini 3.5 Flash',
        note: 'Free tier: ~10 RPM, ~250 RPD — good balance of quality and quota',
        limits: { rpm: 10, tpm: 250000, rpd: 250 }
      },
      {
        id: 'gemini-3.5-flash-lite',
        label: 'Gemini 3.5 Flash-Lite',
        note: 'Free tier: ~30 RPM, ~500 RPD — fastest, recommended for high-volume batches',
        limits: { rpm: 30, tpm: 1000000, rpd: 500 }
      },
      {
        id: 'gemini-3.1-flash-lite',
        label: 'Gemini 3.1 Flash-Lite',
        note: 'Free tier: ~30 RPM, ~500 RPD — stable fallback, good for fixed-template forms',
        limits: { rpm: 30, tpm: 1000000, rpd: 500 }
      },
      {
        id: 'gemini-3.6-pro',
        label: 'Gemini 3.6 Pro',
        note: 'Paid tier only — highest quality, no free daily quota',
        limits: { rpm: 60, tpm: 2000000, rpd: 10000 }
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
const FIELD_SCHEMA = {
  header: {
    _validity: {
      type: 'string',
      description: 'Determine whether this image is a valid EBRO "Control Calidad" form. Return EXACTLY one of these two strings: "valid" or "invalid". Return "valid" if the image contains the EBRO form (even partially, damaged, torn, crumpled, folded, or obscured). The form is recognizable by the EBRO logo, the "CONTROL CALIDAD" title, or any of the field labels such as "CÓDIGO CONJUNTO", "CÓDIGO COMPONENTE", "FECHA", "OPERARIO", "MOTIVO RECHACE", etc. Return "invalid" ONLY if the image is completely unrelated to the form — for example: a photo of equipment, a person, a landscape, a screenshot, a white page, or any image with no visible form elements. IMPORTANT: A torn, damaged, partially visible, or badly photographed form is STILL "valid" and must be processed normally.'
    },
    ticket_category: {
      type: 'string',
      description: 'The category of the ticket, determined by the color of the TOP HEADER BAND of the form. Look at the broad colored strip across the top of the form, just below the EBRO logo area. If that header band is GREEN, return exactly "Process Scrap Parts". If that header band is ORANGE, return exactly "Supplier Claim Parts". Return exactly one of those two strings.'
    },
    ticket_id: {
      type: 'string',
      description: 'The large red printed number in the white box on the right side of the colored band, e.g. "173432". This is the unique ticket identifier printed at the top-right of the form.'
    }
  },
  section_1: {
    codigo_conjunto: { type: 'string', description: 'The handwritten value inside the box labeled "CÓDIGO CONJUNTO", in the first row of the form body directly under the colored header band. It is usually a LONG alphanumeric code (typically 8-20 characters) that may start with any letter or digit. It may contain spaces and the characters / - . but should NOT contain special symbols like ? ! @ # $ % & * ( ) + = [ ] { } < >. Example: "40301YS92 AAAG4", "C4071823B", "601234X/2".'
    },
    codigo_componente: { type: 'string', description: 'The handwritten value inside the box labeled "CÓDIGO COMPONENTE". Usually contains "/" separators, e.g. "Pilar B/Sup/Der".' },
    codigo_rechaz: { type: 'string', description: 'The handwritten value inside the small box labeled "CÓDIGO RECHAZ", on the LEFT side below "CÓDIGO COMPONENTE". This is a SHORT alphanumeric code of 3-5 characters. It commonly contains BOTH digits AND letters, e.g. "221M", "2216", "22M4", "A104", "2214". IMPORTANT: handwritten letters are easily confused with digits — for example "M" can look like "04", and "O" can look like "0". Read the STROKE SHAPE carefully: the letter "M" has two vertical strokes connected by diagonal strokes; it is NOT two separate digits. If the value looks like "22104" but the last two characters are clearly a handwritten "M", return "221M". Return the exact alphanumeric string as written (letters + digits), preserving the original order.'
    },
    cantidad: { type: 'string', description: 'A number handwritten INSIDE the box labeled "CANTIDAD". It is often followed by a horizontal PRINTED LINE (a guard line that prevents someone from adding extra digits later, e.g. converting "1" into "10" or "100"). Do NOT include this line or any trailing dashes in the value — only the digits. Examples: if you see "1" followed by a long line, return "1". If you see "2" followed by a line, return "2". The value is normally 1 to 3 digits.' },
    origen_area_zona: { type: 'string', description: 'A location code written in the LEFT-MIDDLE of the form. This field is composed of TWO adjacent sub-boxes under the header "ORIGEN": the LEFT sub-box is labeled "AREA" and the RIGHT sub-box is labeled "ZONA". Both sub-boxes usually contain a short code, e.g. AREA="M1" and ZONA="M3". Concatenate them into a single value WITHOUT a space or separator: "M1"+"M3" → "M1M3". If only one sub-box is filled, return only that value (e.g. "M1" or "M3"). If both are empty, also check the "ZONA O LÍNEA" box elsewhere on the form and use that value. Return null only if all three boxes are empty.' }
  },
  section_2: {
    motivo_rechace: { type: 'string', description: 'A rejection reason handwritten INSIDE the box labeled "MOTIVO RECHACE", in the LOWER-LEFT of the form. It is typically a short phrase describing the defect, e.g. "DESCASCARADA CON GOLPE DE CAJAS", "RAYADO", "GOLPE". It is NEVER a date, NEVER an operator ID, NEVER a 4-digit code. The text must be physically written INSIDE the MOTIVO RECHACE box — do NOT spread it to other fields.' },
    fecha: { type: 'string', description: 'A DATE handwritten INSIDE the small box labeled "FECHA" at the BOTTOM-LEFT of the form. The box is small and bordered by printed lines. A valid value MUST look like a date: "DD/MM/YY", "D/M/YY", "D-M-YY", "DD-MM-YYYY" (e.g. "22/4/26", "15-9-26"). If the box contains anything that is NOT a date — for example a word, a defect description, or an operator ID — return null. Do NOT invent a value. Do NOT copy the date into the OPERARIO box below.' },
    observaciones: { type: 'string', description: 'Free-text comments handwritten INSIDE the wide box labeled "OBSERVACIONES" at the BOTTOM-CENTER of the form. This box is OFTEN EMPTY. If empty, return null. The value must be physically written INSIDE the OBSERVACIONES box — do NOT copy text from MOTIVO RECHACE, FECHA, or OPERARIO.' },
    operario: { type: 'string', description: 'A short OPERATOR ID handwritten INSIDE the small box labeled "OPERARIO". This box sits DIRECTLY BELOW the "FECHA" box at the BOTTOM-LEFT of the form. Valid values are 3 or 4 digits (e.g. "897", "1234"). IMPORTANT: This box is VERY OFTEN EMPTY. If empty, return null. If the only handwriting in that area is the date (in the FECHA box above), do NOT copy it down — operario must stay null. It is NEVER a date, NEVER a defect description, NEVER a word.' }
  },
  signatures: {
    inspector: {
      type: 'string',
      description: 'Look INSIDE the box labeled "Inspector" at the BOTTOM-LEFT of the form. Return "Signed" ONLY if the box contains one of the following: (a) a handwritten CURSIVE signature (continuous flowing strokes forming a name or initials), or (b) a RUBBER STAMP mark consisting of approximately 5 characters (e.g. "JE673" = 2 letters + 3 digits, or a similar stamped identifier). Return "Not Signed" if the box contains: only a printed red line/underline, only a single isolated letter (e.g. "A"), only a short numeric code, only the printed label, or nothing at all. A single letter like "A" is NOT a signature. A decorative line is NOT a signature.'
    },
    visto_bueno_calidad: {
      type: 'string',
      description: 'Look INSIDE the box labeled "Calidad" or "Vº Bº C. CALIDAD" at the BOTTOM-CENTER of the form. Return "Signed" ONLY if the box contains one of the following: (a) a handwritten CURSIVE signature (continuous flowing strokes forming a name or initials), or (b) a RUBBER STAMP mark consisting of approximately 5 characters (e.g. "JE673" = 2 letters + 3 digits, or a similar stamped identifier). Return "Not Signed" if the box contains: only a printed red line/underline, only a single isolated letter (e.g. "A"), only a short numeric code, only the printed label, or nothing at all.'
    },
    encargado_linea: {
      type: 'string',
      description: 'Look INSIDE the box labeled "Encargado" or "ENCARGADO LÍNEA" at the BOTTOM-RIGHT of the form. Return "Signed" ONLY if the box contains one of the following: (a) a handwritten CURSIVE signature (continuous flowing strokes forming a name or initials), or (b) a RUBBER STAMP mark consisting of approximately 5 characters (e.g. "JE673" = 2 letters + 3 digits). Return "Not Signed" if the box contains: only a printed red line/underline, only a single isolated letter (e.g. "A"), only a short numeric code, only the printed label, or nothing at all. Each of the three signature boxes is INDEPENDENT — a signature in one box does NOT imply the others are signed.'
    }
  }
};

// ---- Format validation rules ----
const FORMAT_RULES = {
  'header._validity': {
    test: v => /^(valid|invalid)$/i.test(v.trim()),
    hint: 'Expected "valid" or "invalid"'
  },
  'header.ticket_category': {
    test: v => /^(Process Scrap Parts|Supplier Claim Parts)$/i.test(v.trim()),
    hint: 'Expected "Process Scrap Parts" or "Supplier Claim Parts"'
  },
  'section_1.codigo_conjunto': {
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
  'section_1.codigo_rechaz': {
    test: v => /^[A-Z0-9]{3,5}$/i.test(v.trim().replace(/\s+/g, '')),
    hint: 'Expected a 3-5 character alphanumeric code (digits and/or letters), e.g. "2216", "221M", "A104".'
  },
  'section_1.cantidad': { test: v => /^[0-9]{1,3}$/.test(v.trim()), hint: 'Expected a small number like "2"' },
  'section_1.origen_area_zona': { test: v => /^[A-Z0-9][A-Z0-9\s\-]{1,11}$/i.test(v.trim()), hint: 'Expected a short alphanumeric code like "M1M3" or "M1" or "15A".' },
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
  lines.push('1. VALIDITY CHECK (DO THIS FIRST, BEFORE ANYTHING ELSE):');
  lines.push('   Determine whether this image shows an EBRO "Control Calidad" form.');
  lines.push('   Return the result in the "header._validity" field:');
  lines.push('     - Return "valid" if the image contains ANY part of the form:');
  lines.push('         · the EBRO logo,');
  lines.push('         · the "CONTROL CALIDAD" title,');
  lines.push('         · the colored header band,');
  lines.push('         · any field label such as "CÓDIGO CONJUNTO", "CÓDIGO COMPONENTE", "FECHA", "OPERARIO", "MOTIVO RECHACE", "OBSERVACIONES", "INSPECTOR", "CALIDAD", "ENCARGADO LÍNEA",');
  lines.push('         · or any handwritten value inside a box.');
  lines.push('     - A torn, damaged, crumpled, folded, partially visible, badly lit, or blurred form is STILL "valid" — you must extract whatever is visible and use null for what is missing.');
  lines.push('     - Return "invalid" ONLY when the image has NO form at all. Examples:');
  lines.push('         · a photo of equipment, a machine, a vehicle, a person, a building, a landscape;');
  lines.push('         · a screenshot of a computer screen with no form;');
  lines.push('         · a blank white or black page;');
  lines.push('         · a photo of a document that is NOT the EBRO Control Calidad form.');
  lines.push('   If you return "invalid", still return the full JSON structure but set every other field to null.');
  lines.push('');
  lines.push('2. ORIENTATION: The image may be rotated. Before reading any field, mentally rotate so that the "EBRO" logo is TOP-LEFT and the colored header band runs horizontally across the top.');
  lines.push('');
  lines.push('3. TICKET CATEGORY (from the header band color):');
  lines.push('   - GREEN header band  → ticket_category = "Process Scrap Parts"');
  lines.push('   - ORANGE header band → ticket_category = "Supplier Claim Parts"');
  lines.push('   Return that exact string in header.ticket_category.');
  lines.push('');
  lines.push('4. ANTI-DUPLICATION RULE (MANDATORY):');
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
  lines.push('');
  lines.push('5. STRICT FIELD-BOX READING:');
  lines.push('   Each value is written INSIDE a specific printed box on the form.');
  lines.push('   Use the box BORDERS (the printed lines) to decide which field a value belongs to.');
  lines.push('   Do NOT guess or "spread" a value to fill empty fields.');
  lines.push('   If a box is EMPTY, return null for that field. An empty box is a valid answer.');
  lines.push('');
  lines.push('5b. TWO-BOX FIELDS (exception to rule 4):');
  lines.push('   The field "origen_area_zona" is built from TWO adjacent sub-boxes: "AREA" (left) and "ZONA" (right). This is the ONE allowed case where a single output field reads from two printed boxes. Concatenate both values into one string with NO separator.');
  lines.push('   Example: AREA="M1", ZONA="M3" → origen_area_zona = "M1M3".');
  lines.push('');
  lines.push('6. POSITIONAL ANCHORS (use these to locate each field):');
  lines.push('   - motivo_rechace:   LOWER-LEFT area, under the label "MOTIVO RECHACE"');
  lines.push('   - fecha:            BOTTOM-LEFT, small box with label "FECHA"');
  lines.push('   - operario:         BOTTOM-LEFT, small box with label "OPERARIO" (DIRECTLY BELOW fecha)');
  lines.push('   - observaciones:    BOTTOM-CENTER, wide box with label "OBSERVACIONES"');
  lines.push('   - cantidad:         MIDDLE-RIGHT, box labeled "CANTIDAD" (may have a guard line after the number)');
  lines.push('   - codigo_rechaz:    MIDDLE-LEFT, small box labeled "CÓDIGO RECHAZ"');
  lines.push('   - origen_area_zona: LEFT-MIDDLE, composed of TWO sub-boxes under "ORIGEN": the LEFT one is "AREA" and the RIGHT one is "ZONA". Concatenate them (AREA + ZONA, no separator). Example: AREA="M1", ZONA="M3" → "M1M3". If empty, check the "ZONA O LÍNEA" box elsewhere.');
  lines.push('   These boxes are in DIFFERENT physical locations. A value written in one box cannot appear in another.');
  lines.push('');
  lines.push('7. Each field description below tells you exactly where its label is and what its value should look like.');
  lines.push('8. For handwritten values, transcribe exactly what you see.');
  lines.push('9. SIGNATURE FIELDS — READ CAREFULLY:');
  lines.push('   The form has THREE independent signature boxes near the bottom:');
  lines.push('     - "Inspector"       (bottom-left)');
  lines.push('     - "Calidad" / "Vº Bº C. CALIDAD"  (bottom-center)');
  lines.push('     - "Encargado" / "ENCARGADO LÍNEA" (bottom-right)');
  lines.push('   Return "Signed" ONLY IF the box contains one of:');
  lines.push('     (a) a handwritten CURSIVE signature — continuous flowing strokes forming a name or initials,');
  lines.push('     (b) a RUBBER STAMP — a stamped mark of about 5 characters, typically 2 letters + 3 digits (e.g. "JE673"), printed in a uniform font.');
  lines.push('   Return "Not Signed" for ALL OTHER cases, including:');
  lines.push('     - the box is empty (only the printed label)');
  lines.push('     - the box contains only a printed red line or underline');
  lines.push('     - the box contains only a single isolated letter (e.g. "A")');
  lines.push('     - the box contains only a short numeric code');
  lines.push('     - the box contains a defect word or description');
  lines.push('   A single letter is NOT a signature. A red line is NOT a signature. Only cursive writing or a 5-character stamp counts.');
  lines.push('   The three boxes are INDEPENDENT — a signature or stamp in one box does NOT imply the others are signed.');
  lines.push('10. If a non-signature field is empty or illegible, use null. NEVER copy a neighbor value to fill it.');
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
