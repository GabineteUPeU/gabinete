// ─── APP PRINCIPAL ────────────────────────────────────────
// Combina todos los mixins en un único objeto Alpine.js
function app() {
  return Object.assign(
    {
      // ── Estado general ────────────────────────────────
      data:            {},
      semestreActivo:  '2025-2',
      vistaActiva:     'inicio',
      busqueda:        '',
      darkMode:        false,
      sidebarOpen:     false,
      progress:        0,
      toasts:          [],
      firebaseOk:      false,
      configSinLlenar: false,
      _fbUnsub:        null,
      _guardando:      false,

      // ── Modales ───────────────────────────────────────
      modal:           { ciclo: false, seccion: false, recurso: false, confirmar: false },
      confirmData:     { tipo: '', nombre: '', fn: () => {} },
      editingRecurso:  null,
      editingSeccionId: null,
      formCiclo:       { nombre: '' },
      formSeccion:     { nombre: '', icono: '📁', color: 'blue', descripcion: '' },
      formRecurso:     { titulo: '', descripcion: '', link: '', tipo: 'documento', fecha: '' },
      emojis: ['📋','📄','📁','🗂️','📊','📈','📝','🎓','👁️','📅','🏆','🔗','💻','🎯','⚙️','🔔','📌','✅','📢','🗺️','🏫','👥','📞','🔍','💡','🌐','📸','🎬'],
      colores: ['blue','purple','green','orange','red','gray'],

      // ── Inicialización ────────────────────────────────
      async init() {
        this.progress = 20;
        this.darkMode = localStorage.getItem('darkMode') === 'true';
        this.$watch('darkMode', v => localStorage.setItem('darkMode', v));
        document.addEventListener('click', this.addRipple);

        if (_configIncompleta) {
          this.configSinLlenar = true;
          await this._cargarLocal();
          this.progress = 100;
          setTimeout(() => this.progress = 0, 600);
          return;
        }

        this.progress = 50;
        try {
          const ref  = _db.ref('gabinete/datos');
          const snap = await ref.once('value');

          if (snap.exists()) {
            this.data = snap.val();
          } else {
            await this._cargarJSON();
            await ref.set(JSON.parse(JSON.stringify(this.data)));
            this.showToast('¡Datos subidos a Firebase! ✅', 'success');
          }

          this.semestreActivo = this.data.semestreActivo || this.data.semestres?.[0] || '2025-2';
          this.firebaseOk = true;
          this.progress = 100;
          setTimeout(() => this.progress = 0, 600);

          // Escuchar cambios en tiempo real
          this._fbUnsub = ref.on('value', snap => {
            if (!this._guardando && snap.exists()) {
              this.data = snap.val();
            }
          });

        } catch (e) {
          console.error('Firebase error:', e.message);
          this.showToast('Error Firebase: ' + e.message, 'error');
          await this._cargarLocal();
          this.progress = 100;
          setTimeout(() => this.progress = 0, 600);
        }
      },

      async _cargarJSON() {
        try {
          const res  = await fetch('data.json');
          this.data  = await res.json();
        } catch {
          this.data = {
            semestres:      ['2025-2'],
            semestreActivo: '2025-2',
            datos:          { '2025-2': { secciones: [] } },
          };
        }
      },

      async _cargarLocal() {
        const stored = localStorage.getItem('gabinete_data');
        if (stored) {
          try { this.data = JSON.parse(stored); return; } catch {}
        }
        await this._cargarJSON();
        this.semestreActivo = this.data.semestreActivo || this.data.semestres?.[0] || '2025-2';
      },

      // ── Persistencia ──────────────────────────────────
      async guardar() {
        if (this.firebaseOk && _db) {
          try {
            this._guardando = true;
            await _db.ref('gabinete/datos').set(JSON.parse(JSON.stringify(this.data)));
            setTimeout(() => { this._guardando = false; }, 500);
          } catch (e) {
            this._guardando = false;
            this.showToast('Error al guardar en Firebase', 'error');
            localStorage.setItem('gabinete_data', JSON.stringify(this.data));
          }
        } else {
          localStorage.setItem('gabinete_data', JSON.stringify(this.data));
        }
      },
    },
    ciclosMixin,
    seccionesMixin,
    recursosMixin,
    dashboardMixin,
    helpersMixin
  );
}
