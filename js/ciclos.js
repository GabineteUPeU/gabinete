// ─── MIXIN: CICLOS ACADÉMICOS ──────────────────────────────
const ciclosMixin = {

  abrirModalCiclo() {
    this.formCiclo = { nombre: '' };
    this.modal.ciclo = true;
    this.$nextTick(() => document.querySelector('[x-model="formCiclo.nombre"]')?.focus());
  },

  async guardarCiclo() {
    const nombre = this.formCiclo.nombre.trim();
    if (!nombre) { this.showToast('El nombre del ciclo es requerido', 'error'); return; }
    if (this.data.semestres.includes(nombre)) { this.showToast('Ese ciclo ya existe', 'error'); return; }
    this.data.semestres.unshift(nombre);
    if (!this.data.datos) this.data.datos = {};
    this.data.datos[nombre] = { secciones: [] };
    this.modal.ciclo = false;
    await this.guardar();
    this.setSemestre(nombre);
    this.showToast(`Ciclo ${nombre} creado`, 'success');
  },

  async eliminarCiclo(nombre) {
    this.data.semestres = this.data.semestres.filter(s => s !== nombre);
    delete this.data.datos[nombre];
    if (this.semestreActivo === nombre) {
      this.semestreActivo = this.data.semestres[0];
      this.vistaActiva = 'inicio';
    }
    await this.guardar();
    this.showToast(`Ciclo ${nombre} eliminado`, 'info');
  },
};
