// ─── MIXIN: DASHBOARD & GRÁFICOS ──────────────────────────
const dashboardMixin = {

  _charts: {},

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
  },
};
