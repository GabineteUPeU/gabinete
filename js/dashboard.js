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

  // ── CSV Helpers ────────────────────────────────────────
  _parseCSV(text) {
    const rows = [];
    for (const line of text.trim().split('\n')) {
      const row = []; let cur = '', inQ = false;
      for (const ch of line) {
        if (ch === '"') { inQ = !inQ; }
        else if (ch === ',' && !inQ) { row.push(cur.trim()); cur = ''; }
        else { cur += ch; }
      }
      row.push(cur.trim()); rows.push(row);
    }
    return rows;
  },

  async fetchMonitoreoCSV() {
    if (this._monitoreoLoading || (this.monitoreoData && !this.monitoreoData.error)) return;
    this._monitoreoLoading = true;
    const CSV_URL = 'https://docs.google.com/spreadsheets/d/e/2PACX-1vQXprl2gZqXA7mUviGIyWkVYmHgx7XGjKTjdGzUIkRsNUU-8zZj7CcnhK9InDd9KXB4RvSwHHhEvpI4/pub?gid=1705715546&single=true&output=csv';
    try {
      const res = await fetch(CSV_URL);
      if (!res.ok) throw new Error('HTTP ' + res.status);
      const rows = this._parseCSV(await res.text());
      const data = rows.slice(1).filter(r => r.some(c => c)); // skip header row 1

      const counts = {};
      data.forEach(r => {
        const name = (r[1] || '').trim(); // columna B = índice 1
        if (name) counts[name] = (counts[name] || 0) + 1;
      });

      const sorted = Object.entries(counts).sort((a, b) => b[1] - a[1]);
      this.monitoreoData = {
        total:    data.length,
        monitors: sorted.map(([n]) => n),
        counts:   sorted.map(([, c]) => c),
      };
      setTimeout(() => this.initMonitoreoCharts(), 60);
    } catch (e) {
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
      data: {
        labels: this.monitoreoData.monitors,
        datasets: [{
          label:           'Docentes monitoreados',
          data:            this.monitoreoData.counts,
          backgroundColor: this.monitoreoData.monitors.map((_, i) => PALETTE[i % PALETTE.length] + '40'),
          borderColor:     this.monitoreoData.monitors.map((_, i) => PALETTE[i % PALETTE.length]),
          borderWidth: 2,
          borderRadius: 6,
        }],
      },
      options: {
        indexAxis: 'y',
        responsive: true,
        maintainAspectRatio: false,
        plugins: {
          legend: { display: false },
          tooltip: {
            callbacks: {
              label: ctx => ` ${ctx.parsed.x} monitoreado${ctx.parsed.x !== 1 ? 's' : ''}`,
            },
          },
        },
        scales: {
          x: { grid: { color: gridColor }, ticks: { color: textColor, stepSize: 1, precision: 0 } },
          y: { grid: { display: false },   ticks: { color: textColor, font: { size: 11 } } },
        },
      },
    });
  },

  initCharts() {
    const dd        = this.dashboardData();
    const isDark    = this.darkMode;
    const textColor = isDark ? '#94a3b8' : '#64748b';
    const gridColor = isDark ? '#374151' : '#f1f5f9';
    const COLORES   = ['#3b82f6', '#8b5cf6', '#10b981', '#f59e0b', '#6366f1'];

    // Destruir instancias anteriores
    Object.values(this._charts).forEach(c => c && c.destroy());
    this._charts = {};

    // Dona: recursos por tipo
    const mkTipos = document.getElementById('chartTipos');
    if (mkTipos) {
      this._charts.tipos = new Chart(mkTipos, {
        type: 'doughnut',
        data: {
          labels: ['Documento', 'Formulario', 'Evento', 'Sistema', 'Recurso'],
          datasets: [{
            data: dd.porTipo,
            backgroundColor: COLORES,
            borderWidth: 0,
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
          },
        },
      });
    }

    // Barras horizontales: recursos por sección
    const mkSecs = document.getElementById('chartSecciones');
    if (mkSecs) {
      this._charts.secs = new Chart(mkSecs, {
        type: 'bar',
        data: {
          labels:   dd.labelsSecs.length ? dd.labelsSecs : ['Sin secciones'],
          datasets: [{
            label: 'Recursos',
            data:  dd.countsSecs.length ? dd.countsSecs : [0],
            backgroundColor: '#3b82f650',
            borderColor:     '#3b82f6',
            borderWidth: 2,
            borderRadius: 6,
          }],
        },
        options: {
          indexAxis: 'y',
          responsive: true,
          maintainAspectRatio: false,
          plugins: { legend: { display: false } },
          scales: {
            x: { grid: { color: gridColor }, ticks: { color: textColor, stepSize: 1 } },
            y: { grid: { display: false },   ticks: { color: textColor, font: { size: 11 } } },
          },
        },
      });
    }

    // Barras: comparativo por ciclo
    const mkSem = document.getElementById('chartSemestres');
    if (mkSem) {
      const bgColors = dd.semestres.map(s => s === this.semestreActivo ? '#c8a94a'   : '#3b82f650');
      const bdColors = dd.semestres.map(s => s === this.semestreActivo ? '#c8a94a'   : '#3b82f6');
      this._charts.sem = new Chart(mkSem, {
        type: 'bar',
        data: {
          labels:   dd.semestres.length ? dd.semestres : ['Sin ciclos'],
          datasets: [{
            label: 'Recursos',
            data:  dd.porSemestre.length ? dd.porSemestre : [0],
            backgroundColor: bgColors,
            borderColor:     bdColors,
            borderWidth: 2,
            borderRadius: 6,
          }],
        },
        options: {
          responsive: true,
          maintainAspectRatio: false,
          plugins: { legend: { display: false } },
          scales: {
            x: { grid: { display: false }, ticks: { color: textColor } },
            y: { grid: { color: gridColor }, ticks: { color: textColor, stepSize: 1 } },
          },
        },
      });
    }

    // Línea: evolución temporal
    const mkFecha = document.getElementById('chartFechas');
    if (mkFecha && dd.fechas.length > 0) {
      const meses = ['','Ene','Feb','Mar','Abr','May','Jun','Jul','Ago','Sep','Oct','Nov','Dic'];
      this._charts.fecha = new Chart(mkFecha, {
        type: 'line',
        data: {
          labels: dd.fechas.map(f => {
            const [y, m] = f.split('-');
            return meses[+m] + ' ' + y;
          }),
          datasets: [{
            label: 'Recursos',
            data:  dd.porFecha,
            fill:  true,
            backgroundColor: '#3b82f615',
            borderColor:     '#3b82f6',
            borderWidth: 2,
            tension: 0.4,
            pointBackgroundColor: '#3b82f6',
            pointRadius: 4,
          }],
        },
        options: {
          responsive: true,
          maintainAspectRatio: false,
          plugins: { legend: { display: false } },
          scales: {
            x: { grid: { display: false }, ticks: { color: textColor, font: { size: 11 } } },
            y: { grid: { color: gridColor }, ticks: { color: textColor, stepSize: 1 } },
          },
        },
      });
    }

    // Monitoreo: si ya hay datos, redibujar
    this.initMonitoreoCharts();
  },
};
