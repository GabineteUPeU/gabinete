// ─── MIXIN: SECCIONES / ÁREAS ─────────────────────────────
const seccionesMixin = {

  abrirModalSeccion() {
    this.formSeccion = { nombre: '', icono: '📁', color: 'blue', descripcion: '' };
    this.modal.seccion = true;
  },

  async guardarSeccion() {
    const nombre = this.formSeccion.nombre.trim();
    if (!nombre) { this.showToast('El nombre es requerido', 'error'); return; }
    const secciones = this.data.datos[this.semestreActivo].secciones;
    const id = nombre.toLowerCase().replace(/\s+/g, '-').replace(/[^a-z0-9-]/g, '');
    if (secciones.find(s => s.id === id)) { this.showToast('Ya existe esa sección', 'error'); return; }
    secciones.push({
      id,
      nombre,
      icono:       this.formSeccion.icono,
      color:       this.formSeccion.color,
      descripcion: this.formSeccion.descripcion,
      items:       [],
    });
    this.modal.seccion = false;
    await this.guardar();
    this.showToast(`Sección "${nombre}" creada`, 'success');
    this.$nextTick(() => this.setVista(id));
  },

  async eliminarSeccion(id) {
    const secs = this.data.datos[this.semestreActivo].secciones;
    this.data.datos[this.semestreActivo].secciones = secs.filter(s => s.id !== id);
    if (this.vistaActiva === id) this.vistaActiva = 'inicio';
    await this.guardar();
    this.showToast('Sección eliminada', 'info');
  },
};
