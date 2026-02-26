// ─── MIXIN: HELPERS & UTILIDADES ──────────────────────────
const helpersMixin = {

  setSemestre(sem) {
    this.semestreActivo = sem;
    this.data.semestreActivo = sem;
    this.vistaActiva = 'inicio';
    this.busqueda = '';
  },

  setVista(id) {
    this.vistaActiva = id;
    this.busqueda = '';
  },

  seccionesActivas() {
    return this.data?.datos?.[this.semestreActivo]?.secciones || [];
  },

  tituloVista() {
    if (this.vistaActiva === 'inicio') return 'Inicio';
    if (this.vistaActiva === 'dashboard') return 'Dashboard';
    return this.seccionesActivas().find(s => s.id === this.vistaActiva)?.nombre || '';
  },

  itemsFiltrados(seccion) {
    const items = seccion.items || [];
    if (!this.busqueda || this.busqueda.length < 2) return items;
    const q = this.busqueda.toLowerCase();
    return items.filter(i =>
      i.titulo.toLowerCase().includes(q) || (i.descripcion || '').toLowerCase().includes(q)
    );
  },

  statsActivos() {
    const secs  = this.seccionesActivas();
    const total = secs.reduce((a, s) => a + (s.items || []).length, 0);
    const docs  = secs.reduce((a, s) => a + (s.items || []).filter(i => i.tipo === 'documento').length, 0);
    const forms = secs.reduce((a, s) => a + (s.items || []).filter(i => i.tipo === 'formulario').length, 0);
    return [
      { icono: '📁', valor: secs.length, label: 'Secciones'   },
      { icono: '🔗', valor: total,        label: 'Recursos'    },
      { icono: '📄', valor: docs,         label: 'Documentos'  },
      { icono: '📝', valor: forms,        label: 'Formularios' },
    ];
  },

  tipoLabel(tipo) {
    return {
      documento:  '📄 Documento',
      formulario: '📝 Formulario',
      evento:     '🎓 Evento',
      sistema:    '💻 Sistema',
      recurso:    '🗂️ Recurso',
    }[tipo] || tipo;
  },

  formatFecha(fecha) {
    if (!fecha) return '';
    const [y, m, d] = fecha.split('-');
    const meses = ['','Ene','Feb','Mar','Abr','May','Jun','Jul','Ago','Sep','Oct','Nov','Dic'];
    return `${d} ${meses[+m]} ${y}`;
  },

  colorGradient(color) {
    return {
      blue:   'from-blue-400 to-blue-600',
      purple: 'from-purple-400 to-purple-600',
      green:  'from-emerald-400 to-emerald-600',
      orange: 'from-amber-400 to-amber-600',
      red:    'from-red-400 to-red-600',
      gray:   'from-slate-400 to-slate-600',
    }[color] || 'from-gray-400 to-gray-600';
  },

  showToast(msg, tipo = 'info') {
    const id = Date.now();
    this.toasts.push({ id, msg, tipo });
    setTimeout(() => { this.toasts = this.toasts.filter(t => t.id !== id); }, 3200);
  },

  addRipple(e) {
    const el = e.target.closest('.ripple-container');
    if (!el) return;
    const r = document.createElement('span');
    const rect = el.getBoundingClientRect();
    const size = Math.max(rect.width, rect.height) * 1.5;
    r.className = 'ripple';
    r.style.cssText = `width:${size}px;height:${size}px;left:${e.clientX - rect.left - size / 2}px;top:${e.clientY - rect.top - size / 2}px`;
    el.appendChild(r);
    setTimeout(() => r.remove(), 600);
  },

  exportarJSON() {
    const blob = new Blob([JSON.stringify(this.data, null, 2)], { type: 'application/json' });
    const a = document.createElement('a');
    a.href = URL.createObjectURL(blob);
    a.download = 'data.json';
    a.click();
    this.showToast('data.json descargado', 'success');
  },

  importarJSON(event) {
    const file = event.target.files[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = async (e) => {
      try {
        this.data = JSON.parse(e.target.result);
        this.semestreActivo = this.data.semestreActivo || this.data.semestres?.[0];
        this.vistaActiva = 'inicio';
        await this.guardar();
        this.showToast('Datos importados y guardados en Firebase', 'success');
      } catch {
        this.showToast('Archivo JSON inválido', 'error');
      }
    };
    reader.readAsText(file);
    event.target.value = '';
  },
};
