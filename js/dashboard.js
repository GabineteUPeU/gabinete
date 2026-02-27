// ─── MIXIN: DASHBOARD & GRÁFICOS ──────────────────────────
const dashboardMixin = {

  _charts: {},
  monitoreoData:      null,
  _monitoreoLoading:  false,
  semanaSeleccionada: '',

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

  // ── Helpers de fecha ───────────────────────────────────
  _parseDate(str) {
    if (!str) return null;
    str = str.trim();
    // YYYY-MM-DD
    if (/^\d{4}-\d{2}-\d{2}/.test(str)) {
      const d = new Date(str + 'T00:00:00'); return isNaN(d) ? null : d;
    }
    // DD/MM/YYYY o D/M/YYYY
    const dmy = str.match(/^(\d{1,2})\/(\d{1,2})\/(\d{4})$/);
    if (dmy) {
      const d = new Date(+dmy[3], +dmy[2] - 1, +dmy[1]); return isNaN(d) ? null : d;
    }
    // Intento genérico
    const d = new Date(str); return isNaN(d) ? null : d;
  },

  _getWeekStart(date) {
    const d = new Date(date);
    const day = d.getDay(); // 0=Dom
    const diff = day === 0 ? -6 : 1 - day; // lunes como inicio
    d.setDate(d.getDate() + diff);
    d.setHours(0, 0, 0, 0);
    return d;
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

      const row0 = rows[0] || [];
      const row1 = rows[1] || [];

      // A1 = título KPI · A2 = número KPI
      const kpiTitle = (row0[0] || '').trim();
      const kpiValue = (row1[0] || '').trim();

      // Leer todas las columnas B en adelante (índice 1+)
      // Cada columna: nombre en fila 1, número en fila 2
      const allCols = [];
      for (let col = 1; col < Math.max(row0.length, row1.length); col++) {
        const name = (row0[col] || '').trim();
        const val  = Number((row1[col] || '0').trim()) || 0;
        if (name) allCols.push({ name, val });
      }

      // B–E (cols 1–4) → gráfico de barras "Monitoreo por encargados"
      const monitorCols = allCols.slice(0, 4);
      // F–H (cols 5–7) → gráfico circular "Tipo de monitoreo"
      const tipoCols    = allCols.slice(4, 7);

      // ── Columna I (índice 8): I1=título, I2:I1000=fechas ──
      const semanaTitle = (row0[8] || '').trim();
      const MES = ['Ene','Feb','Mar','Abr','May','Jun','Jul','Ago','Sep','Oct','Nov','Dic'];
      const weekMap = {};
      rows.slice(1, 1000).forEach(r => {
        const val = (r[8] || '').trim();
        if (!val) return;
        const date = this._parseDate(val);
        if (!date) return;
        const ws  = this._getWeekStart(date);
        const key = ws.toISOString().slice(0, 10);
        weekMap[key] = (weekMap[key] || 0) + 1;
      });

      const semanaWeeks = Object.keys(weekMap).sort().map(k => {
        const start = new Date(k + 'T00:00:00');
        const end   = new Date(start); end.setDate(end.getDate() + 6);
        return {
          key:   k,
          label: `${start.getDate()} ${MES[start.getMonth()]} – ${end.getDate()} ${MES[end.getMonth()]} ${end.getFullYear()}`,
          count: weekMap[k],
        };
      });

      this.monitoreoData = {
        kpiTitle,
        kpiValue,
        monitors:   monitorCols.map(c => c.name),
        counts:     monitorCols.map(c => c.val),
        tipoLabels: tipoCols.map(c => c.name),
        tipoCounts: tipoCols.map(c => c.val),
        semanaTitle,
        semanaWeeks,
      };

      // Auto-seleccionar la semana más reciente
      if (semanaWeeks.length > 0) {
        this.semanaSeleccionada = semanaWeeks[semanaWeeks.length - 1].key;
      }

      console.log('[Monitoreo] KPI:', kpiTitle, kpiValue,
        '| monitores:', this.monitoreoData.monitors,
        '| tipo:', this.monitoreoData.tipoLabels,
        '| semanas:', semanaWeeks.length);

      setTimeout(() => { this.initMonitoreoCharts(); this.initTipoChart(); }, 60);
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

  initTipoChart() {
    if (!this.monitoreoData || this.monitoreoData.error || !this.monitoreoData.tipoLabels?.length) return;
    const isDark    = this.darkMode;
    const textColor = isDark ? '#94a3b8' : '#64748b';
    const PALETTE   = ['#3b82f6','#10b981','#8b5cf6','#f59e0b','#ef4444','#06b6d4','#ec4899'];

    if (this._charts.tipo) { this._charts.tipo.destroy(); this._charts.tipo = null; }
    const el = document.getElementById('chartTipoMonitoreo');
    if (!el) return;
    this._charts.tipo = new Chart(el, {
      type: 'doughnut',
      plugins: [ChartDataLabels],
      data: {
        labels: this.monitoreoData.tipoLabels,
        datasets: [{
          data:            this.monitoreoData.tipoCounts,
          backgroundColor: this.monitoreoData.tipoLabels.map((_, i) => PALETTE[i % PALETTE.length] + 'cc'),
          borderColor:     this.monitoreoData.tipoLabels.map((_, i) => PALETTE[i % PALETTE.length]),
          borderWidth: 2,
          hoverOffset: 8,
        }],
      },
      options: {
        responsive: true,
        maintainAspectRatio: false,
        plugins: {
          legend: {
            position: 'bottom',
            labels: { color: textColor, padding: 14, font: { size: 11 } },
          },
          tooltip: { enabled: true },
          datalabels: {
            color: '#fff',
            font:  { weight: 'bold', size: 13 },
            formatter: v => v > 0 ? v : '',
          },
        },
      },
    });
  },

  initCharts() {

    // Destruir instancias anteriores
    Object.values(this._charts).forEach(c => c && c.destroy());
    this._charts = {};

    // Monitoreo: si ya hay datos, redibujar
    this.initMonitoreoCharts();
    this.initTipoChart();
  },
};
