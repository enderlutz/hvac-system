const API_BASE = 'http://localhost:8000';

// ============================================================
// Shared utilities
// ============================================================

function show(id) { document.getElementById(id)?.classList.remove('hidden'); }
function hide(id) { document.getElementById(id)?.classList.add('hidden'); }
function setText(id, val) { const el = document.getElementById(id); if (el) el.textContent = val; }

// ============================================================
// index.html — Job Intake Form
// ============================================================

let currentMode = 'structured';

function setMode(mode) {
  currentMode = mode;
  document.getElementById('btn-structured')?.classList.toggle('active', mode === 'structured');
  document.getElementById('btn-notes')?.classList.toggle('active', mode === 'notes');

  if (mode === 'notes') {
    show('raw-notes-section');
  } else {
    hide('raw-notes-section');
  }
}

function onRefrigerantChange() {
  const val = document.getElementById('existing_refrigerant')?.value;
  if (val === 'R-22') {
    show('r22-banner');
  } else {
    hide('r22-banner');
  }
}

function onServiceTypeChange() {
  const val = document.getElementById('service_type')?.value;
  // Auto-check permit for replacements (Houston default)
  const permitCheckbox = document.getElementById('permit_required');
  if (permitCheckbox) {
    permitCheckbox.checked = val === 'replacement';
  }
}

function toggleNotes(type) {
  const checked = document.getElementById(`${type}_work_needed`)?.checked ||
                  document.getElementById(`${type}_needed`)?.checked;
  if (checked) {
    show(`${type}-notes-row`);
  } else {
    hide(`${type}-notes-row`);
  }
}

async function parseNotes() {
  const raw = document.getElementById('raw-notes-input')?.value?.trim();
  if (!raw) return;

  const statusEl = document.getElementById('parse-status');
  statusEl.textContent = 'Parsing notes...';
  show('parse-status');

  try {
    const resp = await fetch(`${API_BASE}/proposals/parse-notes`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ raw_notes: raw }),
    });

    if (!resp.ok) throw new Error('Parse failed');
    const parsed = await resp.json();

    let filled = 0;
    let lowConf = [];

    const fieldMap = {
      system_size_tons:    'system_size_tons',
      system_type:         'system_type',
      service_type:        'service_type',
      existing_refrigerant:'existing_refrigerant',
      access_difficulty:   'access_difficulty',
      urgency:             'urgency',
      equipment_make:      'existing_equipment_make',
      equipment_age:       'existing_equipment_age',
      customer_name:       'customer_name',
      technician_name:     'technician_name',
    };

    for (const [key, formId] of Object.entries(fieldMap)) {
      const fieldResult = parsed[key];
      if (fieldResult?.value) {
        const el = document.getElementById(formId);
        if (el) {
          el.value = fieldResult.value;
          filled++;
          if (fieldResult.confidence === 'low') {
            lowConf.push(key.replace(/_/g, ' '));
            el.style.borderColor = '#e6ac00';
          } else {
            el.style.borderColor = '#2e7d32';
          }
        }
      }
    }

    const checkboxMap = {
      permit_required:    'permit_required',
      lineset_replacement:'lineset_replacement',
      electrical_work:    'electrical_work_needed',
      ductwork_needed:    'ductwork_needed',
    };
    for (const [key, formId] of Object.entries(checkboxMap)) {
      if (parsed[key]?.value === 'true') {
        const el = document.getElementById(formId);
        if (el) {
          el.checked = true;
          filled++;
          // Trigger dependent UI (show notes textareas if needed)
          if (formId === 'electrical_work_needed') show('electrical-notes-row');
          if (formId === 'ductwork_needed') show('ductwork-notes-row');
        }
      }
    }
    if (parsed.r22_flag) {
      show('r22-banner');
    }

    if (parsed.service_type?.value === 'replacement') {
      const permitEl = document.getElementById('permit_required');
      if (permitEl) permitEl.checked = true;
    }

    let msg = `Pre-filled ${filled} field(s) from notes.`;
    if (lowConf.length) {
      msg += ` Low-confidence fields (highlighted in yellow): ${lowConf.join(', ')}. Please verify.`;
    }
    statusEl.textContent = msg;

    // Switch to form view so user can review
    setMode('structured');

  } catch (err) {
    statusEl.textContent = `Error parsing notes: ${err.message}`;
    statusEl.style.background = '#fdecea';
  }
}

async function submitForm(event) {
  event.preventDefault();

  hide('form-error');
  show('loading');
  document.getElementById('submit-btn').disabled = true;

  try {
    const formData = buildFormPayload();
    const resp = await fetch(`${API_BASE}/proposals`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(formData),
    });

    if (!resp.ok) {
      const err = await resp.json();
      throw new Error(err.detail || 'Request failed');
    }

    const proposal = await resp.json();
    // Store proposal and navigate to output page
    sessionStorage.setItem('hvac_proposal', JSON.stringify(proposal));
    window.location.href = 'proposal.html';

  } catch (err) {
    const errEl = document.getElementById('form-error');
    errEl.textContent = `Error: ${err.message}`;
    show('form-error');
  } finally {
    hide('loading');
    document.getElementById('submit-btn').disabled = false;
  }
}

function buildFormPayload() {
  const get = (id) => {
    const el = document.getElementById(id);
    return el ? el.value || null : null;
  };
  const getChecked = (id) => document.getElementById(id)?.checked || false;

  return {
    customer_name: get('customer_name'),
    customer_address: get('customer_address'),
    technician_name: get('technician_name'),
    visit_date: get('visit_date'),
    system_type: get('system_type'),
    service_type: get('service_type'),
    system_size_tons: parseFloat(get('system_size_tons')),
    existing_equipment_make: get('existing_equipment_make') || undefined,
    existing_equipment_model: get('existing_equipment_model') || undefined,
    existing_equipment_age: get('existing_equipment_age') ? parseInt(get('existing_equipment_age')) : undefined,
    existing_refrigerant: get('existing_refrigerant') || undefined,
    access_difficulty: get('access_difficulty') || 'standard',
    urgency: get('urgency') || 'routine',
    lineset_replacement: getChecked('lineset_replacement'),
    permit_required: getChecked('permit_required'),
    electrical_work_needed: getChecked('electrical_work_needed'),
    electrical_notes: get('electrical_notes') || undefined,
    ductwork_needed: getChecked('ductwork_needed'),
    ductwork_notes: get('ductwork_notes') || undefined,
    additional_notes: get('additional_notes') || undefined,
  };
}

// ============================================================
// proposal.html — Proposal Output Page
// ============================================================

function loadProposal() {
  const raw = sessionStorage.getItem('hvac_proposal');
  if (!raw) {
    hide('loading');
    show('proposal-error');
    return;
  }

  const p = JSON.parse(raw);
  renderProposal(p);
}

function renderProposal(p) {
  hide('loading');

  // Banners
  if (p.r22_warning) show('r22-banner');
  if (p.seer2_compliance_note) show('seer2-note');
  if (p.permit_required) show('permit-note');

  // Header
  setText('disp-customer-name', p.customer_name);
  setText('disp-customer-address', p.customer_address);
  setText('disp-system-info', `${p.system_size_tons}-ton ${formatEnum(p.system_type)} — ${formatEnum(p.service_type)}`);
  setText('disp-tech-name', p.technician_name);
  setText('disp-visit-date', p.visit_date);
  setText('disp-proposal-id', p.proposal_id);
  show('proposal-header');
  show('proposal-actions');

  // Tiers
  renderTier('good', p.good);
  renderTier('better', p.better);
  renderTier('best', p.best);
  show('proposal-tiers');
}

function renderTier(name, tier) {
  setText(`${name}-brand`, tier.brand);
  setText(`${name}-desc`, tier.system_description);
  setText(`${name}-seer`, tier.seer_rating);
  setText(`${name}-warranty`, tier.warranty);
  setText(`${name}-install-time`, tier.install_time);
  setText(`${name}-equipment-cost`, tier.equipment_cost);
  setText(`${name}-labor-cost`, tier.labor_cost);
  setText(`${name}-adders-cost`, tier.adders_cost);
  setText(`${name}-total`, tier.total_price);

  const benefitsList = document.getElementById(`${name}-benefits`);
  if (benefitsList) {
    benefitsList.innerHTML = tier.key_benefits.map(b => `<li>${b}</li>`).join('');
  }

  if (tier.is_placeholder) {
    show(`${name}-placeholder`);
  }

  if (!tier.adders_cost || tier.adders_cost === '$0') {
    hide(`${name}-adders-row`);
  }
}

function formatEnum(val) {
  return val.replace(/_/g, ' ').replace(/\b\w/g, c => c.toUpperCase());
}

function toggleEditMode() {
  const enabled = document.getElementById('edit-mode-toggle')?.checked;
  document.querySelectorAll('.editable-field').forEach(el => {
    el.contentEditable = enabled ? 'true' : 'false';
  });
}

async function exportPDF() {
  const raw = sessionStorage.getItem('hvac_proposal');
  if (!raw) return;

  const btn = document.querySelector('button[onclick="exportPDF()"]');
  const original = btn?.textContent;
  if (btn) btn.textContent = 'Generating PDF...';

  try {
    const proposal = JSON.parse(raw);
    const resp = await fetch(`${API_BASE}/proposals/export-pdf`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(proposal),
    });

    if (!resp.ok) throw new Error('PDF generation failed');

    const blob = await resp.blob();
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    const filename = `HVAC_Proposal_${proposal.customer_name.replace(/\s+/g, '_')}_${proposal.visit_date}.pdf`;
    a.href = url;
    a.download = filename;
    a.click();
    URL.revokeObjectURL(url);
  } catch (err) {
    alert(`Export failed: ${err.message}`);
  } finally {
    if (btn) btn.textContent = original;
  }
}

// ============================================================
// Page init
// ============================================================

document.addEventListener('DOMContentLoaded', () => {
  if (document.getElementById('proposal-tiers')) {
    loadProposal();
  }
});
