// ==========================================
// 2. MOTOR DE CÁLCULO & LÓGICA (MAIN.JS - V2.5)
// ==========================================

// --- ESTADO MUTABLE ---
let state = {
    currency: 'ARS',
    fxRate: FX_RATE,
    prices: { ...PRICES },
    qty: { ...QTY },

    rates: {
        denim_multiplier: 1,
        cotton_ars_per_kg: 0,
        cmt_denim_ars_per_unit: 0,
        cmt_remera_ars_per_unit: 0,
        hardware_multiplier: 1,
        badana: 0,
        labels_multiplier: 1,
        bags_unit_cost: 0
    },

    extraCosts: [],
    lastInventoryState: {}
};

const GU_COLORS = {
    red: '#AD1C1C', brown: '#442517', black: '#202020',
    white: '#FAFAFA', gray: '#333333', palette: ['#AD1C1C', '#442517', '#666666', '#999999', '#CCCCCC', '#FFFFFF']
};

const PLOTLY_CONFIG = { responsive: true, displayModeBar: false };

// --- LAYOUT OPTIMIZADO (V2.5) ---
// Remove fixed height to allow CSS expansion
const PLOTLY_LAYOUT_BASE = {
    paper_bgcolor: GU_COLORS.black, plot_bgcolor: GU_COLORS.black,
    font: { family: 'Univers, sans-serif', color: GU_COLORS.white },
    title: { font: { family: 'Univers Condensed, sans-serif', size: 24, color: GU_COLORS.white } },
    xaxis: { gridcolor: '#333', zerolinecolor: '#333' },
    yaxis: { gridcolor: '#333', zerolinecolor: '#333' },
    hoverlabel: { bgcolor: GU_COLORS.red, font: { color: 'white' } },
    margin: { t: 60, b: 40, l: 60, r: 40 },
};

document.addEventListener('DOMContentLoaded', () => {
    initCurrencyToggle();
    initFxEditable();
    calibrateRates();
    initCarousels();
    generateInputDecks();
    calculateAndRender();
});

function calibrateRates() {
    // ... Logic Unchanged ...
    const q = state.qty;
    let weighted_denim = 0; for (const [prod, count] of Object.entries(q)) if (FABRIC_COST_USD[prod]) weighted_denim += count * FABRIC_COST_USD[prod];
    const total_denim_usd = COSTS_INIT.total_denim_ars / state.fxRate;
    state.rates.denim_multiplier = (weighted_denim > 0) ? total_denim_usd / weighted_denim : 1;
    let total_cotton_kg = 0; for (const [prod, k] of Object.entries(COTTON_CONSUMPTION)) if (q[prod]) total_cotton_kg += q[prod] * k;
    state.rates.cotton_ars_per_kg = (total_cotton_kg > 0) ? COSTS_INIT.total_cotton_ars / total_cotton_kg : COTTON_PRICE_ARS_KG;
    let denim_units = 0, remera_units = 0; for (const [prod, c] of Object.entries(q)) { if (prod.includes('Jean') || prod.includes('Bermuda')) denim_units += c; else remera_units += c; }
    state.rates.cmt_denim_ars_per_unit = (denim_units > 0) ? COSTS_INIT.total_cmt_jeans_ars / denim_units : 0;
    state.rates.cmt_remera_ars_per_unit = (remera_units > 0) ? COSTS_INIT.total_cmt_remeras_ars / remera_units : 0;
    state.rates.badana = (denim_units > 0) ? (COSTS_INIT.total_badana_ars / state.fxRate) / denim_units : 0.29;
    let base_label_cost_usd = 0; for (const [prod, c] of Object.entries(q)) { const rules = CONSUMPTION_RULES[prod]; if (rules) { ['Main_Label', 'Size_Tab', 'Jean_Care', 'Top_Care', 'Flag_Label', 'Hangtag'].forEach(tag => { if (rules[tag]) base_label_cost_usd += c * rules[tag] * UNIT_COSTS_USD[tag]; }); } }
    state.rates.labels_multiplier = (base_label_cost_usd > 0) ? (COSTS_INIT.total_labels_ars / state.fxRate) / base_label_cost_usd : 1;
    let base_hard_cost = 0; for (const [prod, c] of Object.entries(q)) { const rules = CONSUMPTION_RULES[prod]; if (rules) { ['Button_17mm', 'Button_15mm', 'Rivet'].forEach(hw => { if (rules[hw]) base_hard_cost += c * rules[hw] * UNIT_COSTS_USD[hw]; }); } }
    state.rates.hardware_multiplier = (base_hard_cost > 0) ? (COSTS_INIT.total_sales_hardware_ars / state.fxRate) / base_hard_cost : 1;
    state.rates.bags_unit_cost = (denim_units + remera_units > 0) ? (COSTS_INIT.total_bags_ars / state.fxRate) / (denim_units + remera_units) : 0.89;
}

function initCurrencyToggle() { document.getElementById('label-ars').onclick = () => setCurrency('ARS'); document.getElementById('label-usd').onclick = () => setCurrency('USD'); }
function setCurrency(curr) { state.currency = curr; document.getElementById('label-ars').className = curr === 'ARS' ? 'currency-opt active' : 'currency-opt'; document.getElementById('label-usd').className = curr === 'USD' ? 'currency-opt active' : 'currency-opt'; generateInputDecks(); calculateAndRender(); }

// --- CÁLCULO REAL DE CONSUMO DE ALGODÓN (V3) ---
function calcularCostoRealAlgodon() {
    const q = state.qty;
    let costoReal = 0;
    for (const [prod, kg] of Object.entries(COTTON_CONSUMPTION)) {
        if (q[prod] && COTTON_TYPE[prod]) {
            const precioKg = PRECIO_KG_ALGODON[COTTON_TYPE[prod]];
            costoReal += q[prod] * kg * precioKg;
        }
    }
    return costoReal;
}

function calculateMetrics() {
    const q = state.qty; const r = state.rates;
    let total_denim_usd = 0; for (const [prod, cost] of Object.entries(FABRIC_COST_USD)) { if (q[prod]) total_denim_usd += q[prod] * cost * r.denim_multiplier; }
    const total_denim_ars = total_denim_usd * state.fxRate;

    // ALGODÓN: Modelo de presupuesto pre-pagado (V3)
    const costoRealAlgodon = calcularCostoRealAlgodon();
    const total_cotton_ars = Math.max(PRESUPUESTO_ALGODON_ARS, costoRealAlgodon);

    let denim_units = 0;
    let remera_units = 0;
    for (const [prod, c] of Object.entries(q)) {
        if (prod.includes('Jean') || prod.includes('Bermuda')) {
            denim_units += c;
        } else if (CMT_REMERA_ARS[prod]) {
            remera_units += c;
        }
    }
    const total_cmt_denim_ars = denim_units * r.cmt_denim_ars_per_unit;
    const total_cmt_remera_ars = remera_units * r.cmt_remera_ars_per_unit;
    let granular_costs = {}; let granular_qtys = {};
    const AVIOS_KEYS = ['Button_17mm', 'Button_15mm', 'Rivet', 'Badana', 'Main_Label', 'Size_Tab', 'Jean_Care', 'Top_Care', 'Flag_Label', 'Hangtag', 'Bag'];
    AVIOS_KEYS.forEach(k => { granular_costs[k] = 0; granular_qtys[k] = 0; });
    for (const [prod, count] of Object.entries(q)) { const rules = CONSUMPTION_RULES[prod]; if (rules) { AVIOS_KEYS.forEach(item => { if (rules[item]) { let unitCost = UNIT_COSTS_USD[item]; if (['Main_Label', 'Size_Tab', 'Jean_Care', 'Top_Care', 'Flag_Label', 'Hangtag'].includes(item)) unitCost *= r.labels_multiplier; if (['Button_17mm', 'Button_15mm', 'Rivet'].includes(item)) unitCost *= r.hardware_multiplier; if (item === 'Badana') unitCost = r.badana; if (item === 'Bag') unitCost = r.bags_unit_cost; granular_costs[item] += count * rules[item] * unitCost; granular_qtys[item] += count * rules[item]; } }); } }
    const investmentData = [
        { id: 'denim', label: 'Tela Denim', value: total_denim_ars },
        { id: 'cotton', label: 'Algodón', value: total_cotton_ars },
        { id: 'cmt_remera', label: 'Confección Remeras', value: total_cmt_remera_ars },
        { id: 'cmt_denim', label: 'Confección Denim', value: total_cmt_denim_ars },

        { id: 'badanas', label: 'Badanas de cuero', value: granular_costs['Badana'] * state.fxRate },
        { id: 'labels', label: 'Etiquetas de algodón', value: (granular_costs['Main_Label'] + granular_costs['Size_Tab'] + granular_costs['Jean_Care'] + granular_costs['Top_Care'] + granular_costs['Flag_Label'] + granular_costs['Hangtag']) * state.fxRate },
        { id: 'hardware', label: 'Botones/Remaches', value: (granular_costs['Button_17mm'] + granular_costs['Button_15mm'] + granular_costs['Rivet']) * state.fxRate },
        { id: 'bags', label: 'Bolsas', value: granular_costs['Bag'] * state.fxRate }
    ];
    // FIX: Always use c.value because input deck ensures it's stored as ARS.
    state.extraCosts.forEach(c => investmentData.push({ id: 'extra', label: c.name, value: c.value }));
    let total_sales_ars = 0; const salesData = []; for (const [prod, count] of Object.entries(q)) { const income = count * state.prices[prod]; salesData.push({ product: prod, category: (prod.includes('Jean') || prod.includes('Bermuda')) ? 'Denim' : 'Remeras', income }); total_sales_ars += income; }
    const total_inv_ars = investmentData.reduce((s, i) => s + i.value, 0); const gross_profit_ars = total_sales_ars - total_inv_ars; const margin = total_sales_ars > 0 ? (gross_profit_ars / total_sales_ars) * 100 : 0;
    return { investmentData, salesData, total_inv_ars, total_sales_ars, gross_profit_ars, margin, aviosBreakdown: granular_costs, aviosQty: granular_qtys };
}

function calculateAndRender() {
    const m = calculateMetrics();
    const isArs = state.currency === 'ARS';
    const conv = (v) => isArs ? v : v / state.fxRate;
    const sym = isArs ? '$' : 'US$';

    updateText('kpi-investment', formatNum(conv(m.total_inv_ars), sym));
    updateText('kpi-sales', formatNum(conv(m.total_sales_ars), sym));
    updateText('kpi-margin', m.margin.toFixed(1) + '%');
    updateFX(state.fxRate);

    // CHARTS V2.6 - Pie Chart
    const invData = {
        type: 'pie',
        labels: m.investmentData.map(d => d.id === 'denim' ? 'Costo total tela Selvedge' : d.label),
        values: m.investmentData.map(d => conv(d.value)),
        hole: 0.5,
        marker: { colors: GU_COLORS.palette },
        textposition: 'none',
        hovertemplate: isArs ? '<b>%{label}</b><br>Costo: $%{value:,.0f}<br>(%{percent})<extra></extra>' : '<b>%{label}</b><br>Costo: US$%{value:,.2f}<br>(%{percent})<extra></extra>'
    };

    // Bar Chart
    const salesY = m.salesData.map(d => conv(d.income));
    const salesData = {
        type: 'bar', x: m.salesData.map(d => d.product), y: salesY,
        marker: { color: m.salesData.map(d => d.category === 'Denim' ? GU_COLORS.gray : GU_COLORS.red) },
        text: salesY.map(v => formatCompact(v, sym)),
        textposition: 'auto',
        hovertemplate: isArs ? '<b>%{x}</b><br>Ingresos: $%{y:,.0f}<extra></extra>' : '<b>%{x}</b><br>Ingresos: US$%{y:,.2f}<extra></extra>'
    };

    // Waterfall
    const waterY = [conv(m.total_sales_ars), -conv(m.total_inv_ars), conv(m.gross_profit_ars)];
    const waterData = {
        type: 'waterfall', measure: ["absolute", "relative", "total"],
        x: ["Ventas", "Costo", "Ganancia"],
        y: waterY,
        connector: { line: { color: "white" } },
        decreasing: { marker: { color: GU_COLORS.gray } },
        increasing: { marker: { color: GU_COLORS.red } },
        totals: { marker: { color: "white", line: { color: GU_COLORS.red, width: 3 } } },
        textposition: "outside", text: waterY.map(v => formatCompact(v, sym)),
        hoverinfo: 'x+y+text'
    };

    // Layout clones
    const pieLayout = { ...LAYOUT('Estructura Costos') };
    const barLayout = { ...LAYOUT('Ingresos'), margin: { ...PLOTLY_LAYOUT_BASE.margin, b: 80, l: 60, r: 40 } };

    Plotly.react('chart-investment', [invData], pieLayout, PLOTLY_CONFIG);
    Plotly.react('chart-sales', [salesData], barLayout, PLOTLY_CONFIG);
    Plotly.react('chart-waterfall', [waterData], { ...LAYOUT('BALANCE'), height: 500 }, PLOTLY_CONFIG);

    // Avíos V2.5
    const aviosKeys = Object.keys(m.aviosBreakdown).filter(k => m.aviosBreakdown[k] > 0);
    const aviosTrace = {
        type: 'bar',
        x: aviosKeys,
        y: aviosKeys.map(k => conv(m.aviosBreakdown[k] * state.fxRate)),
        marker: { color: GU_COLORS.brown },
        customdata: aviosKeys.map(k => m.aviosQty[k]),
        hovertemplate: isArs ? '<b>%{x}</b><br>Costo: $%{y:,.0f}<br>Consumo: %{customdata} u.<extra></extra>' : '<b>%{x}</b><br>Costo: US$%{y:,.2f}<br>Consumo: %{customdata} u.<extra></extra>'
    };
    // No fixed height for Avios, minimal margins
    Plotly.react('chart-avios', [aviosTrace], LAYOUT('Desglose Avíos Detallado'), PLOTLY_CONFIG);

    renderInventory(calculateInventoryUsage());
}

function generateInputDecks() {
    // ... Same Calibration ...
    const isArs = state.currency === 'ARS';
    const conv = (v) => isArs ? v : v / state.fxRate;
    const m = calculateMetrics();
    const map = new Map(m.investmentData.map(i => [i.id, i.value]));

    const prCont = document.getElementById('deck-prices'); prCont.innerHTML = '';
    for (const [p, val] of Object.entries(state.prices)) createInputRow(prCont, p, conv(val), (v) => { state.prices[p] = isArs ? v : v * state.fxRate; calculateAndRender(); });
    const qtCont = document.getElementById('deck-qty'); qtCont.innerHTML = '';
    for (const [p, val] of Object.entries(state.qty)) createInputRow(qtCont, p, val, (v) => { state.qty[p] = v; generateInputDecks(); calculateAndRender(); });

    const coCont = document.getElementById('deck-costs-granular'); coCont.innerHTML = '';
    const add = (label, valArs, updater) => createInputRow(coCont, label, conv(valArs), (newDisp) => { const newArs = isArs ? newDisp : newDisp * state.fxRate; updater(newArs); calculateAndRender(); });
    // ... Adds Unchanged ...
    add('Costo total tela Selvedge', map.get('denim'), (n) => { let w = 0; for (const [p, c] of Object.entries(state.qty)) if (FABRIC_COST_USD[p]) w += c * FABRIC_COST_USD[p]; state.rates.denim_multiplier = (w > 0) ? (n / state.fxRate) / w : 1; });
    add('Algodón', map.get('cotton'), (n) => { let k = 0; for (const [p, v] of Object.entries(COTTON_CONSUMPTION)) if (state.qty[p]) k += state.qty[p] * v; state.rates.cotton_ars_per_kg = (k > 0) ? n / k : 0; });
    add('Confección Remeras', map.get('cmt_remera'), (n) => { let u = 0; for (const [p, c] of Object.entries(state.qty)) if (!p.includes('Jean') && !p.includes('Bermuda')) u += c; state.rates.cmt_remera_ars_per_unit = (u > 0) ? n / u : 0; });
    add('Confección Denim', map.get('cmt_denim'), (n) => { let u = 0; for (const [p, c] of Object.entries(state.qty)) if (p.includes('Jean') || p.includes('Bermuda')) u += c; state.rates.cmt_denim_ars_per_unit = (u > 0) ? n / u : 0; });
    add('Badanas de cuero', map.get('badanas'), (n) => { let u = 0; for (const [p, c] of Object.entries(state.qty)) if (p.includes('Jean') || p.includes('Bermuda')) u += c; state.rates.badana = (u > 0) ? (n / state.fxRate) / u : 0; });
    add('Etiquetas de algodón', map.get('labels'), (n) => { let base = 0; for (const [p, c] of Object.entries(state.qty)) { if (CONSUMPTION_RULES[p]) ['Main_Label', 'Size_Tab', 'Jean_Care', 'Top_Care', 'Flag_Label', 'Hangtag'].forEach(t => { if (CONSUMPTION_RULES[p][t]) base += c * CONSUMPTION_RULES[p][t] * UNIT_COSTS_USD[t]; }); } state.rates.labels_multiplier = (base > 0) ? (n / state.fxRate) / base : 1; });
    add('Botones/Remaches', map.get('hardware'), (n) => { let base = 0; for (const [p, c] of Object.entries(state.qty)) { if (CONSUMPTION_RULES[p]) ['Button_17mm', 'Button_15mm', 'Rivet'].forEach(t => { if (CONSUMPTION_RULES[p][t]) base += c * CONSUMPTION_RULES[p][t] * UNIT_COSTS_USD[t]; }); } state.rates.hardware_multiplier = (base > 0) ? (n / state.fxRate) / base : 1; });
    add('Bolsas', map.get('bags'), (n) => { let u = 0; for (const c of Object.values(state.qty)) u += c; state.rates.bags_unit_cost = (u > 0) ? (n / state.fxRate) / u : 0; });

    const exCont = document.getElementById('deck-costs-extra'); exCont.innerHTML = '';
    state.extraCosts.forEach((c, idx) => {
        const row = document.createElement('div'); row.className = 'control-input-wrapper';

        // V2.5.1: Editable Name Input (Left)
        const nameInp = document.createElement('input');
        nameInp.type = 'text';
        nameInp.className = 'control-input-clean';
        nameInp.style.width = '115px'; // Reduced width to avoid overlap
        nameInp.style.background = 'transparent';
        nameInp.style.border = 'none';
        nameInp.style.color = 'white';
        nameInp.style.fontFamily = 'Univers, sans-serif';
        // Font style removed here, handled by CSS placeholder
        nameInp.placeholder = 'Ingresar costo...';
        nameInp.style.padding = '0'; // Ensure no padding pushes it out
        nameInp.style.margin = '0';
        nameInp.value = c.name;

        nameInp.onchange = (e) => { state.extraCosts[idx].name = e.target.value; };

        const rightWrap = document.createElement('div');
        rightWrap.style.display = 'flex';
        rightWrap.style.alignItems = 'center';
        rightWrap.style.position = 'relative'; // Anchor for absolute X

        const btn = document.createElement('button'); btn.className = 'btn-delete'; btn.textContent = 'X';
        // Absolute position to LEFT of input, ensuring alignment matches fixed costs
        btn.style.position = 'absolute';
        btn.style.right = '100%';
        btn.style.marginRight = '8px';
        btn.style.top = '50%';
        btn.style.transform = 'translateY(-50%)';

        btn.onclick = () => { state.extraCosts.splice(idx, 1); generateInputDecks(); calculateAndRender(); };

        const inp = document.createElement('input'); inp.type = 'number'; inp.className = 'control-input';
        inp.value = conv(c.value).toFixed(0);
        inp.onchange = (e) => { state.extraCosts[idx].value = isArs ? parseFloat(e.target.value) : parseFloat(e.target.value) * state.fxRate; calculateAndRender(); };

        rightWrap.appendChild(btn);
        rightWrap.appendChild(inp);

        row.appendChild(nameInp);
        row.appendChild(rightWrap);
        exCont.appendChild(row);
    });
}
function createInputRow(container, label, val, onChange) {
    const div = document.createElement('div'); div.className = 'control-input-wrapper';
    div.innerHTML = `<span class="control-label">${label}</span>`;
    const inp = document.createElement('input'); inp.type = 'number'; inp.className = 'control-input';
    inp.value = val % 1 !== 0 ? val.toFixed(2) : val;
    inp.addEventListener('change', (e) => onChange(parseFloat(e.target.value) || 0));
    div.appendChild(inp); container.appendChild(div);
}
// UTILS UNCHANGED
function renderInventory(st) {
    const el = document.getElementById('inventory-list');
    if (!el) return;
    el.innerHTML = '';

    // Stock de avíos normal
    for (const [k, s] of Object.entries(st)) {
        const r = document.createElement('div');
        r.className = 'inv-row';
        const c = s.percent <= 10 ? GU_COLORS.red : s.percent <= 30 ? 'orange' : GU_COLORS.white;
        r.innerHTML = `<div class="inv-label" style="color:${c}"><span>${k}</span><span>${s.remaining.toLocaleString()}</span></div><div class="inv-bar-bg"><div class="inv-bar-fill" style="width:${Math.max(0, Math.min(100, s.percent))}%;background:${c}"></div></div>`;
        el.appendChild(r);
    }
}
// NEW: FX EDITOR LOGIC
function initFxEditable() {
    const el = document.getElementById('kpi-fx');
    el.style.cursor = 'pointer';
    el.title = 'Click to edit FX Rate';

    el.onclick = () => {
        const currentVal = state.fxRate;
        el.onclick = null; // Disable click while editing
        el.innerHTML = '';

        const inp = document.createElement('input');
        inp.type = 'number';
        inp.value = currentVal;
        inp.className = 'control-input';
        inp.style.width = '120px';
        inp.style.fontSize = '1.5rem';
        inp.style.textAlign = 'left';

        inp.onkeydown = (e) => {
            if (e.key.length === 1 && !/[0-9.]/.test(e.key) && !e.ctrlKey && !e.metaKey) {
                e.preventDefault();
            }
            if (e.key === 'Enter') inp.blur();
        };

        inp.onblur = () => {
            const newVal = parseFloat(inp.value);
            if (!isNaN(newVal) && newVal > 0) {
                state.fxRate = newVal;
                // Recalculate everything
                calibrateRates();
                generateInputDecks();
                calculateAndRender();
            } else {
                calculateAndRender(); // Revert
            }
            // Re-apply listener handled by DOM reload or persistent element
            initFxEditable();
        };

        el.appendChild(inp);
        inp.focus();
    };
}
function updateFX(val) {
    const el = document.getElementById('kpi-fx');
    if (el) el.textContent = '$' + val.toLocaleString('es-AR', { minimumFractionDigits: 2 });
}
function initCarousels() { setupCarousel('controls-carousel', 'prev-ctrl', 'next-ctrl', (i) => { const t = ['[ PRECIOS ]', '[ PRODUCCIÓN ]', '[ COSTOS ]']; const e = document.getElementById('ctrl-deck-title'); if (e) e.textContent = t[i]; }); setupCarousel('charts-carousel', 'prev-chart', 'next-chart'); document.getElementById('btn-add-cost').onclick = () => { state.extraCosts.push({ name: '', value: 0 }); generateInputDecks(); }; }
function setupCarousel(id, p, n, cb) { const w = document.getElementById(id); if (!w) return; const s = w.querySelectorAll('.carousel-slide'); let idx = 0; const go = (i) => { s.forEach((x, k) => x.classList.toggle('active', k === i)); if (cb) cb(i); }; document.getElementById(p).onclick = () => { idx = idx > 0 ? idx - 1 : s.length - 1; go(idx); }; document.getElementById(n).onclick = () => { idx = idx < s.length - 1 ? idx + 1 : 0; go(idx); }; }
function calculateInventoryUsage() { let demand = {}; Object.keys(INVENTORY_STOCK).forEach(k => demand[k] = 0); for (const [p, c] of Object.entries(state.qty)) { const r = CONSUMPTION_RULES[p]; if (r) for (const [i, q] of Object.entries(r)) if (demand[i] !== undefined) demand[i] += q * c; } let st = {}; for (const [k, v] of Object.entries(INVENTORY_STOCK)) { const u = demand[k]; st[k] = { initial: v, used: u, remaining: v - u, percent: ((v - u) / v) * 100 }; } return st; }
function LAYOUT(t) { return { ...PLOTLY_LAYOUT_BASE, title: { ...PLOTLY_LAYOUT_BASE.title, text: t } }; }
function updateText(id, v) { const e = document.getElementById(id); if (e) e.textContent = v; }
function formatNum(v, s) { return s + v.toLocaleString('es-AR', { maximumFractionDigits: 0 }); }
function formatCompact(v, s) { if (Math.abs(v) >= 1e6) return s + (v / 1e6).toFixed(2) + 'M'; if (Math.abs(v) >= 1e3) return s + (v / 1e3).toFixed(1) + 'k'; return s + v.toFixed(0); }


// =========================================
// SISTEMA DE GUARDADO
// =========================================

// Función Definitiva de Guardado
async function saveCommandCenter() {
    const saveIcon = document.querySelector('.save-icon');
    const WEBHOOK_URL = 'http://localhost:5678/webhook/save-command-center'; // URL de producción (sin -test)

    // Efecto visual de "cargando"
    saveIcon.style.opacity = '0.5';
    saveIcon.style.filter = 'grayscale(1)';

    try {
        const response = await fetch(WEBHOOK_URL, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(state) // Enviamos el objeto state completo
        });

        if (response.ok) {
            console.log('Datos sincronizados con Google Sheets');
            saveIcon.style.filter = 'drop-shadow(0 0 5px #AD1C1C)'; // Brillo rojo de éxito
        }
    } catch (error) {
        console.error('Error en la persistencia:', error);
        alert('Error al conectar con n8n local.');
    } finally {
        setTimeout(() => {
            saveIcon.style.opacity = '1';
            saveIcon.style.filter = 'none';
        }, 1000);
    }
}

// Escuchar el click en el icono
document.querySelector('.save-icon').addEventListener('click', saveCommandCenter);



// =========================================
// SISTEMA DE CARGA + CINEMÁTICA
// =========================================

async function loadCommandCenter() {
    console.log("🎬 Iniciando secuencia de carga GÜIDO...");

    const loader = document.getElementById('guido-loader');
    const LOAD_URL = 'http://localhost:5678/webhook/load-command-center'; // Tu URL de n8n

    const dataFetch = fetch(LOAD_URL)
        .then(res => res.json())
        .catch(err => {
            console.warn("⚠️ Offline / Error n8n", err);
            return null;
        });

    // Mínimo 2 segundos de logo girando (Estética)
    const minimumWait = new Promise(resolve => setTimeout(resolve, 2000));

    try {
        const [cloudData, _] = await Promise.all([dataFetch, minimumWait]);

        if (cloudData) {
            // Ajuste por si n8n devuelve array
            const data = Array.isArray(cloudData) ? cloudData[0] : cloudData;

            // 1. Cargar Precios y Cantidades (Tu lógica actual)
            if (data.prices) {
                state.prices = { ...state.prices, ...data.prices };
                state.qty = { ...state.qty, ...data.qty };
            }

            // 2. Cargar Costos Extra (LA NUEVA PARTE)
            if (data.extraCosts && Array.isArray(data.extraCosts)) {
                // Mapeamos los datos de n8n al formato que usa tu frontend
                state.extraCosts = data.extraCosts.map(costo => ({
                    id: costo.id,       // Importante para identificarlo
                    name: costo.name,   // Tu código usa .name
                    value: Number(costo.value) // Tu código usa .value
                }));

                console.log(`✅ ${state.extraCosts.length} costos extra recuperados.`);
            }

            // 3. Refrescar la Interfaz
            // Aquí es donde TU código (el que me pasaste) se ejecuta y dibuja todo
            if (typeof generateInputDecks === 'function') generateInputDecks();
            if (typeof updateAllCharts === 'function') updateAllCharts(); // Si usas gráficos
            if (typeof calculateAndRender === 'function') calculateAndRender(); // Para actualizar los totales
        }

    } catch (error) {
        console.error("Error crítico en carga:", error);
    } finally {
        // Retirar telón de carga
        if (loader) {
            loader.classList.add('loader-hidden');
            setTimeout(() => { loader.style.display = 'none'; }, 850);
        }
    }
}

window.addEventListener('load', loadCommandCenter);