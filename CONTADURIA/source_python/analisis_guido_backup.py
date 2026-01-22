import pandas as pd
import plotly.express as px
import plotly.graph_objects as go
import numpy as np

# ==========================================
# 1. CONFIGURACIÓN DEL COMMAND CENTER (INPUTS)
# ==========================================

FX_RATE = 1465.23  # Valor del Dólar

# --- PRECIOS DE VENTA (Retail ARS) ---
PRICES = {
    'Jean Indigo': 240000,
    'Jean Negro': 240000,
    'Bermuda Patch': 160000,
    'Bermuda DK': 175000,
    'Remera Afligida': 50000,
    'Musculosa': 45000,
    'Remera Logo': 55000,
    'Remera Doble': 65000,
    'Remera Mujer': 45000
}

# --- CANTIDADES DE PRODUCCIÓN ---
QTY = {
    'Jean Indigo': 34,
    'Jean Negro': 10,
    'Bermuda Patch': 10,
    'Bermuda DK': 36,
    'Remera Afligida': 90,
    'Musculosa': 30,
    'Remera Logo': 90,
    'Remera Doble': 30,
    'Remera Mujer': 90
}

# --- COSTOS FIJOS Y ESTRUCTURALES (ARS & USD) ---
COSTS_FIXED = {
    'Logistica_Denim_USD': 3850.00,
    'CMT_Denim_Total_ARS': 2800000,
    'CMT_Remeras_Total_ARS': 3000000,
    'Badanas_Total_ARS': 211750,  # Compra total realizada
    'Botones_Total_USD': 1121.56, # Compra total (Material + Logistica)
    'Etiquetas_Total_USD': 579.68 + (0.098 * 14100), # Aprox logistica + base
    'Bolsas_Total_USD': 897.34
}

# --- MATERIA PRIMA VARIABLE (Costos calculados previamente) ---
# Costo de tela por unidad (sin logística, solo material)
FABRIC_COST_USD = {
    'Jean Indigo': 44.00,  # 3.2m * 13.75
    'Jean Negro': 37.60,   # 3.2m * 11.75
    'Bermuda Patch': 13.88,
    'Bermuda DK': 7.13,
}

# Consumo de Algodón (Kg) y Precio
COTTON_PRICE_ARS_KG = 15000
COTTON_CONSUMPTION = {
    'Remera Afligida': 0.25,
    'Musculosa': 0.18,
    'Remera Logo': 0.40,
    'Remera Doble': 0.50,
    'Remera Mujer': 0.18
}

# Cuero Extra (Estimado USD)
LEATHER_EXTRA_USD = {
    'Bermuda Patch': 5.0,
    'Bermuda DK': 15.0
}

# ==========================================
# 2. MOTOR DE CÁLCULO
# ==========================================

# A. Calcular Costo Algodón Total
total_cotton_kg = sum(QTY[k] * v for k, v in COTTON_CONSUMPTION.items())
total_cotton_ars = total_cotton_kg * COTTON_PRICE_ARS_KG * 1.05 # 5% desperdicio seguridad

# B. Calcular Costo Tela Denim Total (USD -> ARS)
total_denim_material_usd = sum(QTY[k] * FABRIC_COST_USD[k] for k in FABRIC_COST_USD)
total_leather_extra_usd = (QTY['Bermuda Patch'] * LEATHER_EXTRA_USD['Bermuda Patch']) + \
                          (QTY['Bermuda DK'] * LEATHER_EXTRA_USD['Bermuda DK'])

# C. Calcular Proporción de Avíos usados en esta tanda (vs Stock total)
# (Simplificación: Asignamos un % del gasto total de avios a esta tanda para el costo)
# Usamos los costos unitarios calculados en el chat
avios_unit_denim_usd = 3.00 # Promedio ponderado
avios_unit_remera_usd = 1.12
total_avios_used_usd = (90 * avios_unit_denim_usd) + (330 * avios_unit_remera_usd)

# D. Construir Dataframe de Inversión Real
investment_data = {
    'Rubro': [
        'Tela Denim (Importación + Material)',
        'Algodón (Remeras)',
        'Confección (CMT) Denim',
        'Confección (CMT) Remeras',
        'Avíos & Packaging (Proporcional)',
        'Cuero (Badanas + Apliques)'
    ],
    'Costo_ARS': [
        (total_denim_material_usd + COSTS_FIXED['Logistica_Denim_USD']) * FX_RATE,
        total_cotton_ars,
        COSTS_FIXED['CMT_Denim_Total_ARS'],
        COSTS_FIXED['CMT_Remeras_Total_ARS'],
        total_avios_used_usd * FX_RATE,
        (COSTS_FIXED['Badanas_Total_ARS'] * (90/500)) + (total_leather_extra_usd * FX_RATE) # Prorrateo badanas + cuero extra
    ]
}
df_cost = pd.DataFrame(investment_data)

# E. Construir Dataframe de Ventas (Ingresos)
sales_data = []
for product, quantity in QTY.items():
    sales_data.append({
        'Producto': product,
        'Categoria': 'Denim' if 'Jean' in product or 'Bermuda' in product else 'Remeras',
        'Unidades': quantity,
        'Precio_Unit': PRICES[product],
        'Ingreso_Total': quantity * PRICES[product]
    })
df_sales = pd.DataFrame(sales_data)

# Totales Generales
TOTAL_INVERSION = df_cost['Costo_ARS'].sum()
TOTAL_FACTURACION = df_sales['Ingreso_Total'].sum()
GANANCIA_BRUTA = TOTAL_FACTURACION - TOTAL_INVERSION
MARGEN_GLOBAL = (GANANCIA_BRUTA / TOTAL_FACTURACION) * 100

# ==========================================
# 3. VISUALIZACIÓN (DASHBOARD)
# ==========================================

# Estilos GÜIDO
GU_RED = '#CC0000'
GU_BLACK = '#111111'
GU_WHITE = '#F5F5F5'
GU_PALETTE = [GU_RED, '#333333', '#666666', '#999999', '#CCCCCC', '#FFFFFF']

# --- FIG 1: Distribución de Inversión (Donut) ---
fig_inv = px.pie(df_cost, values='Costo_ARS', names='Rubro', hole=0.5,
                 title='Estructura de Costos GÜIDO (Tanda 1)',
                 color_discrete_sequence=GU_PALETTE)
fig_inv.update_layout(paper_bgcolor=GU_BLACK, plot_bgcolor=GU_BLACK,
                      font_color=GU_WHITE, title_font_size=24)
fig_inv.update_traces(textinfo='percent+label', textposition='outside')

# --- FIG 2: Ingresos por Producto (Barras) ---
fig_sales = px.bar(df_sales, x='Producto', y='Ingreso_Total', color='Categoria',
                   title='Proyección de Ingresos (Sell-Out)',
                   text_auto='.2s', color_discrete_map={'Denim': '#333333', 'Remeras': GU_RED})
fig_sales.update_layout(paper_bgcolor=GU_BLACK, plot_bgcolor=GU_BLACK,
                        font_color=GU_WHITE, xaxis_tickangle=-45)

# --- FIG 3: Waterfall Financiero ---
fig_waterfall = go.Figure(go.Waterfall(
    name = "Flujo 2026", orientation = "v",
    measure = ["absolute", "relative", "total"],
    x = ["Ventas Totales", "Costo de Venta", "Ganancia Bruta"],
    textposition = "outside",
    text = [f"${TOTAL_FACTURACION/1e6:.1f}M", f"-${TOTAL_INVERSION/1e6:.1f}M", f"${GANANCIA_BRUTA/1e6:.1f}M"],
    y = [TOTAL_FACTURACION, -TOTAL_INVERSION, GANANCIA_BRUTA],
    connector = {"line":{"color":"white"}},
    decreasing = {"marker":{"color": "#333333"}},
    increasing = {"marker":{"color": GU_RED}},
    totals = {"marker":{"color": "white", "line":{"color":"red", "width":3}}}
))
fig_waterfall.update_layout(title="Resultado Económico Estimado", paper_bgcolor=GU_BLACK,
                            plot_bgcolor=GU_BLACK, font_color=GU_WHITE)

# ==========================================
# 4. EXPORTACIÓN HTML
# ==========================================

# Crear un solo archivo HTML con todos los gráficos
with open('reporte_guido.html', 'w') as f:
    f.write(f'''
    <html>
    <head>
        <title>GÜIDO COMMAND CENTER</title>
        <style>
            body {{ background-color: {GU_BLACK}; color: {GU_WHITE}; font-family: 'Courier New', monospace; padding: 20px; }}
            h1 {{ color: {GU_RED}; text-transform: uppercase; border-bottom: 2px solid {GU_RED}; }}
            .metric-box {{ border: 1px solid white; padding: 20px; display: inline-block; margin-right: 20px; width: 200px; }}
            .value {{ font-size: 24px; font-weight: bold; }}
            .label {{ font-size: 12px; opacity: 0.7; }}
        </style>
    </head>
    <body>
        <h1>GÜIDO CAPUZZI // PROD_01 ANALYTICS</h1>
        <div style="margin-bottom: 40px;">
            <div class="metric-box">
                <div class="value">${TOTAL_INVERSION:,.0f}</div>
                <div class="label">INVERSIÓN TOTAL (ARS)</div>
            </div>
            <div class="metric-box">
                <div class="value">${TOTAL_FACTURACION:,.0f}</div>
                <div class="label">VENTAS POTENCIALES</div>
            </div>
            <div class="metric-box">
                <div class="value" style="color: {GU_RED}">{MARGEN_GLOBAL:.1f}%</div>
                <div class="label">MARGEN GLOBAL</div>
            </div>
            <div class="metric-box">
                <div class="value">${FX_RATE:,.2f}</div>
                <div class="label">TIPO DE CAMBIO</div>
            </div>
        </div>
    ''')
    f.write(fig_inv.to_html(full_html=False, include_plotlyjs='cdn'))
    f.write(fig_sales.to_html(full_html=False, include_plotlyjs='cdn'))
    f.write(fig_waterfall.to_html(full_html=False, include_plotlyjs='cdn'))
    f.write('</body></html>')

print("✅ REPORTE GENERADO: 'reporte_guido.html'")
print(f"💰 Inversión Total: ${TOTAL_INVERSION:,.0f} ARS")
print(f"🚀 Ventas Totales: ${TOTAL_FACTURACION:,.0f} ARS")
