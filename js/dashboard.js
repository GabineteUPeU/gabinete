// ─── MIXIN: DASHBOARD & GRÁFICOS ──────────────────────────
const dashboardMixin = {

  _charts: {},
  monitoreoData: null,
  _monitoreoLoading: false,

  dashboardData() {
    const secs     = this.seccionesActivas();
    const allItems = secs.flatMap(s => s.items || []);
    const tipos    = ['documento', 'formulario', 'evento', 'sistema', 'recurso'];
    const porTipo  = tipos.map(t => allItems.filter(i => i.tipo === t).length);
    const maxTipo  = Math.max(...porTipo);
    const tipoMasComun = maxTipo > 0 ? tipos[porTipo.indexOf(maxTipo)] : '—';

    const semestres   = this.data?.semestres || [];
    const porSemestre = semestres.map(sem => {
      const s = this.data?.datos?.[sem]?.secciones || [];
      return s.reduce((a, sec) => a + (sec.items || []).length, 0);
    });

    const porFechaMap = {};
    allItems.filter(i => i.fecha).forEach(i => {
      const mes = i.fecha.slice(0, 7);
      porFechaMap[mes] = (porFechaMap[mes] || 0) + 1;
    });
    const fechas = Object.keys(porFechaMap).sort();

    return {
      totalRecursos:  allItems.length,
      totalSecciones: secs.length,
      totalSemestres: semestres.length,
      tipoMasComun,
      porTipo,
      labelsSecs:  secs.map(s => s.nombre),
      countsSecs:  secs.map(s => (s.items || []).length),
      semestres,
      porSemestre,
      fechas,
      porFecha: fechas.map(f => porFechaMap[f]),
    };
  },

  // ── Monitoreo CSV ──────────────────────────────────────
  async fetchMonitoreoCSV() {
    if (this._monitoreoLoading || (this.monitoreoData && !this.monitoreoData.error)) return;
    this._monitoreoLoading = true;
    const CSV_URL = 'https://docs.google.com/spreadsheets/d/e/2PACX-1vQXprl2gZqXA7mUviGIyWkVYmHgx7XGjKTjdGzUIkRsNUU-8zZj7CcnhK9InDd9KXB4RvSwHHhEvpI4/pub?gid=1705715546&single=true&output=csv';
    try {
      const res = await fetch(CSV_URL);
      if (!res.ok) throw new Error('HTTP ' + res.status);
      const text = await res.text();

      // PapaParse: maneja comillas, encoding, saltos de línea, campos vacíos
      const { data: rows } = Papa.parse(text, {
        skipEmptyLines: false,
        dynamicTyping:  false, // todo como string, evita que fechas/números se conviertan
      });

      // Detectar la fila que tiene los nombres de monitores:
      // buscamos la primera fila (entre las 5 primeras) donde columnas B,C,D+
      // tienen texto con espacios (nombre completo) y no son fechas/números
      let nameRowIdx = 1;
      for (let i = 0; i < Math.min(rows.length, 5); i++) {
        const r = rows[i];
        let matches = 0;
        for (let col = 1; col < r.length; col++) {
          const v = (r[col] || '').trim();
          if (v.length > 3 && v.includes(' ') && isNaN(v) && !/^\d{1,2}[\/\-]\d/.test(v)) matches++;
        }
        if (matches >= 2) { nameRowIdx = i; break; }
      }

      // Extraer nombres desde la fila detectada, columnas B en adelante (índice 1+)
      const nameRow = rows[nameRowIdx] || [];
      const monitors = [];
      for (let col = 1; col < nameRow.length; col++) {
        const name = (nameRow[col] || '').trim();
        if (name && name.includes(' ') && isNaN(name)) {
          monitors.push({ name, col });
        }
      }

      // Contar celdas no vacías por columna desde la fila posterior a los nombres
      const dataRows = rows.slice(nameRowIdx + 1);
      const result = monitors.map(m => ({
        name:  m.name,
        count: dataRows.filter(r => (r[m.col] || '').trim() !== '').length,
      }));

      const total = result.reduce((s, m) => s + m.count, 0);

      this.monitoreoData = {
        total,
        monitors: result.map(m => m.name),
        counts:   result.map(m => m.count),
      };

      console.log('[Monitoreo] filaIdx:', nameRowIdx,
        '| monitores:', this.monitoreoData.monitors,
        '| conteos:', this.monitoreoData.counts,
        '| total:', total);

      setTimeout(() => this.initMonitoreoCharts(), 60);
    } catch (e) {
      console.error('[Monitoreo] Error:', e);
      this.monitoreoData = { error: true, msg: e.message };
    } finally {
      this._monitoreoLoading = false;
    }
  },

  initMonitoreoCharts() {
    if (!this.monitoreoData || this.monitoreoData.error || !this.monitoreoData.monitors?.length) return;
    const isDark    = this.darkMode;
    const textColor = isDark ? '#94a3b8' : '#64748b';
    const gridColor = isDark ? '#374151' : '#f1f5f9';
    const PALETTE   = ['#10b981','#3b82f6','#8b5cf6','#f59e0b','#ef4444','#06b6d4','#ec4899','#f97316'];

    if (this._charts.monitores) { this._charts.monitores.destroy(); this._charts.monitores = null; }
    const el = document.getElementById('chartMonitores');
    if (!el) return;
    this._charts.monitores = new Chart(el, {
      type: 'bar',
      plugins: [ChartDataLabels],
      data: {
        labels: this.monitoreoData.monitors,
        datasets: [{
          label:           'Docentes monitoreados',
          data:            this.monitoreoData.counts,
          backgroundColor: this.monitoreoData.monitors.map((_, i) => PALETTE[i % PALETTE.length] + '50'),
          borderColor:     this.monitoreoData.monitors.map((_, i) => PALETTE[i % PALETTE.length]),
          borderWidth: 2,
          borderRadius: 8,
        }],
      },
      options: {
        responsive: true,
        maintainAspectRatio: false,
        plugins: {
          legend: { display: false },
          tooltip: { enabled: false },
          datalabels: {
            anchor: 'end',
            align:  'end',
            color:  this.monitoreoData.monitors.map((_, i) => PALETTE[i % PALETTE.length]),
            font:   { weight: 'bold', size: 14 },
            formatter: v => v,
          },
        },
        scales: {
          x: {
            grid: { display: false },
            ticks: {
              color: textColor,
              font:  { size: 11 },
              maxRotation: 30,
              minRotation: 0,
            },
          },
          y: {
            grid:  { color: gridColor },
            ticks: { color: textColor, stepSize: 1, precision: 0 },
            beginAtZero: true,
          },
        },
        layout: { padding: { top: 24 } },
      },
    });
  },

  initCharts() {

    // Destruir instancias anteriores
    Object.values(this._charts).forEach(c => c && c.destroy());
    this._charts = {};

    // Monitoreo: si ya hay datos, redibujar
    this.initMonitoreoCharts();
  },
};
