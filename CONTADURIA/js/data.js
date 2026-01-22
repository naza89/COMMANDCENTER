// ==========================================
// 1. CONFIGURACIÓN DEL COMMAND CENTER (V2.3 DATA)
// ==========================================

const FX_RATE = 1465.00;

// --- PRECIOS DE VENTA (Retail ARS) ---
const PRICES = {
    'Jean Indigo': 240000,
    'Jean Negro': 240000,
    'Bermuda Patch': 160000,
    'Bermuda DK': 175000,
    'Remera Afligida': 50000,
    'Musculosa': 45000,
    'Remera Logo': 55000,
    'Remera Doble': 65000,
    'Remera Mujer': 45000
};

// --- CANTIDADES DE PRODUCCIÓN (Iniciales) ---
const QTY = {
    'Jean Indigo': 34,
    'Jean Negro': 10,
    'Bermuda Patch': 10,
    'Bermuda DK': 36,
    'Remera Afligida': 90,
    'Musculosa': 30,
    'Remera Logo': 90,
    'Remera Doble': 30,
    'Remera Mujer': 90
};

// --- COSTOS INICIALES (CALIBRATED V2.3) ---
// Exact match to user provided table
const COSTS_INIT = {
    total_denim_ars: 9014155,       // 'Costo total tela Selvedge'
    total_cotton_ars: 2760000,      // 'Algodón'
    total_cmt_remeras_ars: 3000000, // 'Confección Remeras'
    total_cmt_jeans_ars: 2600000,   // 'Confección Denim'
    total_badana_ars: 43350,        // 'Badanas de cuero'
    total_labels_ars: 200752,       // 'Etiquetas de algodón'
    total_sales_hardware_ars: 189134, // 'Botones/Remaches'
    total_bags_ars: 620016          // 'Bolsas'
};

// --- UNIT COSTS (Legacy / Fallback) ---
const UNIT_COSTS_USD = {
    'Button_17mm': 0.093,
    'Button_15mm': 0.088,
    'Rivet': 0.075,
    'Badana': 0.29,
    'Main_Label': 0.069,
    'Size_Tab': 0.057,
    'Jean_Care': 0.101,
    'Top_Care': 0.095,
    'Flag_Label': 0.136,
    'Hangtag': 0.101,
    'Bag': 0.897
};

// --- STOCK INICIAL (ARSENAL) ---
const INVENTORY_STOCK = {
    'Button_17mm': 2000,
    'Button_15mm': 4000,
    'Rivet': 5000,
    'Badana': 500,
    'Main_Label': 5000,
    'Size_Tab': 4000,
    'Jean_Care': 1000,
    'Top_Care': 1500,
    'Flag_Label': 600,
    'Hangtag': 2000,
    'Bag': 1000
};

// --- CONSUMPTION RULES ---
const CONSUMPTION_RULES = {
    'Jean Indigo': {
        'Button_17mm': 1, 'Button_15mm': 4, 'Badana': 1, 'Rivet': 6,
        'Main_Label': 1, 'Size_Tab': 1, 'Jean_Care': 1, 'Flag_Label': 1, 'Hangtag': 1, 'Bag': 1
    },
    'Jean Negro': {
        'Button_17mm': 1, 'Button_15mm': 4, 'Badana': 1, 'Rivet': 6,
        'Main_Label': 1, 'Size_Tab': 1, 'Jean_Care': 1, 'Flag_Label': 1, 'Hangtag': 1, 'Bag': 1
    },
    'Bermuda Patch': {
        'Button_17mm': 1, 'Button_15mm': 4, 'Badana': 1, 'Rivet': 12,
        'Main_Label': 1, 'Size_Tab': 1, 'Jean_Care': 1, 'Flag_Label': 1, 'Hangtag': 1, 'Bag': 1
    },
    'Bermuda DK': {
        'Button_17mm': 1, 'Button_15mm': 4, 'Badana': 1, 'Rivet': 12,
        'Main_Label': 1, 'Size_Tab': 1, 'Jean_Care': 1, 'Flag_Label': 1, 'Hangtag': 1, 'Bag': 1
    },
    // Tops
    'Remera Afligida': { 'Main_Label': 1, 'Size_Tab': 1, 'Top_Care': 1, 'Bag': 1 },
    'Musculosa': { 'Main_Label': 1, 'Size_Tab': 1, 'Top_Care': 1, 'Bag': 1 },
    'Remera Logo': { 'Main_Label': 1, 'Size_Tab': 1, 'Top_Care': 1, 'Bag': 1 },
    'Remera Doble': { 'Main_Label': 1, 'Size_Tab': 1, 'Top_Care': 1, 'Bag': 1 },
    'Remera Mujer': { 'Main_Label': 1, 'Size_Tab': 1, 'Top_Care': 1, 'Bag': 1 }
};

const COSTS_FIXED = COSTS_INIT;
const COTTON_CONSUMPTION = { 'Remera Afligida': 0.25, 'Musculosa': 0.18, 'Remera Logo': 0.40, 'Remera Doble': 0.50, 'Remera Mujer': 0.18 };
const FABRIC_COST_USD = { 'Jean Indigo': 44.00, 'Jean Negro': 37.60, 'Bermuda Patch': 13.88, 'Bermuda DK': 7.13 };
const LEATHER_EXTRA_USD = { 'Bermuda Patch': 5.0, 'Bermuda DK': 15.0 };

// --- ALGODÓN: MODELO DE PRESUPUESTO PRE-PAGADO ---
const PRESUPUESTO_ALGODON_ARS = 2760000;
const PRECIO_KG_ALGODON = {
    '24/1': 11500,  // Remera Afligida, Remera Logo, Remera Doble
    '20/1': 11500,  // Musculosa, Remera Mujer
    '14/1': 11000   // Reservado para futuro
};
const COTTON_TYPE = {
    'Remera Afligida': '24/1',
    'Musculosa': '20/1',
    'Remera Logo': '24/1',
    'Remera Doble': '24/1',
    'Remera Mujer': '20/1'
};

// --- CONFECCIÓN REMERAS: Costos por unidad específicos ---
const CMT_REMERA_ARS = {
    'Remera Afligida': 13000,
    'Remera Logo': 13000,
    'Remera Doble': 13000,
    'Remera Mujer': 13000,
    'Musculosa': 10000
};
