// ─── MIXIN: RECURSOS ──────────────────────────────────────
const recursosMixin = {

  abrirModalRecurso(seccionId) {
    this.editingRecurso   = null;
    this.editingSeccionId = seccionId;
    this.formRecurso = {
      titulo:      '',
      descripcion: '',
      link:        '',
      tipo:        'documento',
      fecha:       new Date().toISOString().split('T')[0],
    };
    this.modal.recurso = true;
    this.$nextTick(() => document.querySelector('[x-model="formRecurso.titulo"]')?.focus());
  },

  abrirEditarRecurso(seccionId, item) {
    this.editingRecurso   = item.titulo;
    this.editingSeccionId = seccionId;
    this.formRecurso      = { ...item };
    this.modal.recurso    = true;
  },

  async guardarRecurso() {
    const titulo = this.formRecurso.titulo.trim();
    const link   = this.formRecurso.link.trim();
    if (!titulo) { this.showToast('El título es requerido', 'error'); return; }
    if (!link)   { this.showToast('El link/URL es requerido', 'error'); return; }
    const sec = this.data.datos[this.semestreActivo].secciones.find(s => s.id === this.editingSeccionId);
    if (!sec) return;
    if (!sec.items) sec.items = [];
    if (this.editingRecurso) {
      const idx = sec.items.findIndex(i => i.titulo === this.editingRecurso);
      if (idx !== -1) sec.items[idx] = { ...this.formRecurso, titulo };
      this.showToast('Recurso actualizado', 'success');
    } else {
      sec.items.push({
        titulo,
        descripcion: this.formRecurso.descripcion,
        link,
        tipo:        this.formRecurso.tipo,
        fecha:       this.formRecurso.fecha,
      });
      this.showToast(`"${titulo}" agregado`, 'success');
    }
    this.modal.recurso = false;
    await this.guardar();
  },

  async eliminarRecurso(seccionId, titulo) {
    const sec = this.data.datos[this.semestreActivo].secciones.find(s => s.id === seccionId);
    if (sec) sec.items = (sec.items || []).filter(i => i.titulo !== titulo);
    await this.guardar();
    this.showToast('Recurso eliminado', 'info');
  },

  confirmarEliminar(tipo, nombre, fn) {
    this.confirmData = { tipo, nombre, fn };
    this.modal.confirmar = true;
  },
};
