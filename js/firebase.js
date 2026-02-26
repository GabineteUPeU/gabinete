// ─── CONFIGURACIÓN FIREBASE ───────────────────────────────
const FIREBASE_CONFIG = {
  apiKey:            "AIzaSyD8K_i48mk24mGLENh-2jlKVNdpwhFHdSw",
  authDomain:        "gabinete-833ab.firebaseapp.com",
  projectId:         "gabinete-833ab",
  storageBucket:     "gabinete-833ab.firebasestorage.app",
  messagingSenderId: "677147799273",
  appId:             "1:677147799273:web:77cf925c8d227662e20a78",
  databaseURL:       "https://gabinete-833ab-default-rtdb.firebaseio.com"
};

const _configIncompleta = FIREBASE_CONFIG.apiKey === "TU_API_KEY";
let _db = null;

if (!_configIncompleta) {
  firebase.initializeApp(FIREBASE_CONFIG);
  _db = firebase.database();
}
