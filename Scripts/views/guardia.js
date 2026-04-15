// ============================================================
//  Vista del Guardia
//
//  El guardia solo puede buscar vehículos por placa (lectura).
//  No tiene acceso a crear, editar ni eliminar registros —
//  esas rutas simplemente no existen en este archivo.
//
//  También incluye el escáner QR que usa la cámara del
//  dispositivo para leer el código del vehículo y buscarlo.
//
//  Exporta:
//  - renderGuardia()   → HTML completo de la vista
//  - initGuardiaView() → event listeners y lógica
// ============================================================

import { api } from '../api.js'
import { showFeedbackModal } from '../feedback.js'
import { setUsuario } from '../router.js'

// ─── HTML de la vista ─────────────────────────────────────────
export function renderGuardia() {
  return `
    <header class="d-flex justify-content-between align-items-center">
      <img src="./Media/Logo_SV.png" alt="Logo SV" class="logo-left">
      <nav class="navbar navbar-expand-lg flex-grow-1">
        <div class="container-fluid justify-content-end">
          <a class="nav-link text-dark" href="#" id="logoutBtn">
            <i class="fas fa-sign-out-alt"></i>
            <span class="d-none d-md-inline"> Cerrar sesión</span>
          </a>
        </div>
      </nav>
      <img src="./Media/Logo_CSJ.png" alt="Logo CSJ" class="logo-right">
    </header>

    <main>
      <div class="container mt-4">
        <div class="table-container">
          <h2 class="mb-4 text-center">Búsqueda de Vehículos</h2>

          <div class="d-flex justify-content-between align-items-center w-100 mb-3">
            <div class="d-flex">
              <input type="text" id="searchInput" placeholder="Buscar vehículo..."
                     class="form-control search-input" title="Buscar por placa">
              <button id="searchBtn" class="btn btn-primary ms-2 d-flex align-items-center"
                      data-bs-toggle="tooltip" title="Buscar por placa">
                <i class="fas fa-search me-md-2 d-md-none d-inline"></i>
                <span class="d-none d-md-inline"> Buscar</span>
              </button>
            </div>
            <button id="scannerBtn" class="btn btn-primary ms-2 d-flex align-items-center"
                    data-bs-toggle="tooltip" title="Escanear código QR">
              <i class="fas fa-qrcode me-2 d-md-none d-inline"></i>
              <span class="d-none d-md-inline"> Escanear QR</span>
            </button>
          </div>

          <div class="table-responsive">
            <table class="table table-hover align-middle">
              <thead class="table-light">
                <tr>
                  <th>Placa</th><th>Marca</th><th>Modelo</th><th>Color</th>
                  <th class="col-rs">Fecha</th>
                  <th class="col-rs">Documentos</th>
                  <th>Alumno</th>
                </tr>
              </thead>
              <tbody id="registrosBody"></tbody>
            </table>
          </div>
        </div>
      </div>
    </main>

    <!-- Modal vista previa de documentos -->
    <div class="modal fade" id="documentModal" tabindex="-1" aria-hidden="true">
      <div class="modal-dialog modal-lg modal-dialog-centered">
        <div class="modal-content">
          <div class="modal-header">
            <h5 class="modal-title">Vista previa del documento</h5>
            <button type="button" class="btn-close" data-bs-dismiss="modal"></button>
          </div>
          <div class="modal-body">
            <iframe id="documentViewer" src="" width="100%" height="500px" frameborder="0"></iframe>
          </div>
          <div class="modal-footer">
            <a id="documentDownload" href="" target="_blank" class="btn btn-primary">
              <i class="fas fa-download"></i> Abrir en nueva pestaña
            </a>
            <button type="button" class="btn btn-secondary" data-bs-dismiss="modal">Cerrar</button>
          </div>
        </div>
      </div>
    </div>

    <!-- Modal escáner QR -->
    <div class="modal fade" id="scannerModal" tabindex="-1" aria-hidden="true">
      <div class="modal-dialog modal-lg modal-dialog-centered">
        <div class="modal-content">
          <div class="modal-header">
            <h5 class="modal-title">Escaneo de código QR</h5>
            <button type="button" class="btn-close" data-bs-dismiss="modal" id="closeScannerBtn"></button>
          </div>
          <div class="modal-body text-center">
            <canvas hidden id="qr-canvas" class="img-fluid"></canvas>
          </div>
        </div>
      </div>
    </div>

    <audio id="audioScaner" src="./Media/sonido.mp3"></audio>`
}

// ─── Tooltips ────────────────────────────────────────────────
// Inicializa los tooltips de Bootstrap en los elementos que los tengan. 
// Se llama al cargar la vista y cada vez que se renderiza un nuevo resultado de búsqueda, 
// para asegurar que los tooltips funcionen en los nuevos botones.
function initTooltips() {
  document.querySelectorAll('[data-bs-toggle="tooltip"]').forEach(el => {
    bootstrap.Tooltip.getInstance(el)?.dispose()
    new bootstrap.Tooltip(el, { trigger: 'hover focus' })
  })
}

// ─── Inicializar vista ────────────────────────────────────────
// Agrega los event listeners para el botón de logout, el formulario de búsqueda y el escáner QR.
export function initGuardiaView() {
  // Logout
  document.getElementById('logoutBtn').addEventListener('click', async (e) => {
    e.preventDefault()
    await api.post('/auth/logout', {}, 'Cerrando sesión...')
    setUsuario(null)
    showFeedbackModal({
      title: 'Sesión cerrada', message: 'Sesión cerrada correctamente.',
      type: 'success', redirectTo: '#/login', redirectDelay: 1500, autoClose: true,
    })
  })

  // Búsqueda por placa
  document.getElementById('searchBtn').addEventListener('click', () => {
    const placa = document.getElementById('searchInput').value.trim()
    if (!placa) {
      document.getElementById('registrosBody').innerHTML = `
        <tr><td colspan="7" class="text-center">
          <div class="alert alert-warning mb-0">
            <i class="fas fa-exclamation-triangle"></i> Por favor ingrese una placa
          </div></td></tr>`
      return
    }
    buscarVehiculo(placa)
  })

  document.getElementById('searchInput').addEventListener('keyup', (e) => {
    if (e.key === 'Enter') document.getElementById('searchBtn').click()
  })

  // Escáner QR
  document.getElementById('scannerBtn').addEventListener('click', encenderCamara)
  document.getElementById('closeScannerBtn').addEventListener('click', cerrarCamara)

  // Callback del plugin qrCode.min.js — se llama cuando detecta un QR.
  // El QR contiene la placa del vehículo
  if (window.qrcode) {
    qrcode.callback = (resultado) => {
      if (resultado) {
        document.getElementById('audioScaner')?.play() // Sonido de escaneo exitoso
        cerrarCamara()
        buscarVehiculo(resultado)
        document.getElementById('searchInput').value = resultado // Mostrar la placa escaneada en el input de búsqueda
      }
    }
  }

  initTooltips()
}

// ─── Búsqueda de vehículo ─────────────────────────────────────
async function buscarVehiculo(placa) {
  const tbody = document.getElementById('registrosBody')
  try {
    const res = await api.get( // El guardia solo puede buscar por placa, así que la ruta es fija y no acepta otros parámetros de búsqueda.
      `/guardia/vehiculos/${encodeURIComponent(placa.toUpperCase())}`,
      'Buscando vehículo...'
    )
    if (!res) return

    if (res.status === 404) {
      tbody.innerHTML = `<tr><td colspan="7" class="text-center">
        <div class="alert alert-warning mb-0">
          <i class="fas fa-exclamation-triangle"></i>
          No se encontró ningún vehículo con la placa <strong>${placa}</strong>
        </div></td></tr>`
      return
    }

    const v = await res.json()
    renderResultado(v)
  } catch {
    tbody.innerHTML = `<tr><td colspan="7" class="text-center text-danger">
      <i class="fas fa-exclamation-circle"></i> Error al buscar vehículo</td></tr>`
  }
}

// ─── Helpers de renderizado ───────────────────────────────────
// Crea un botón para ver un documento. Si url está vacía, no muestra nada.
function docBtn(url, icon, tooltip) {
  if (!url) return ''
  return `<button onclick="verDocumento('${url}')"
            class="btn btn-sm btn-outline-secondary me-1"
            data-bs-toggle="tooltip" title="${tooltip}">
            <i class="fas ${icon}"></i></button>`
}

// Formatea una fecha ISO a formato legible en español. Si la fecha es null o inválida, muestra 'N/A'.
function formatFecha(iso) {
  if (!iso) return 'N/A'
  return new Date(iso).toLocaleDateString('es-MX', {
    year: 'numeric', month: 'long', day: 'numeric',
  })
}

// Renderiza la fila del vehículo encontrado y la fila de info del alumno
function renderResultado(v) {
  const rowId = v.vehiculo_id
  document.getElementById('registrosBody').innerHTML = `
    <tr data-row-id="${rowId}">
      <td>${v.placa}</td><td>${v.marca}</td><td>${v.modelo}</td><td>${v.color}</td>
      <td>${formatFecha(v.fecha_registro)}</td>
      <td>
        ${docBtn(v.licencia_url, 'fa-id-card', 'Licencia')}
        ${docBtn(v.tarjeta_circulacion_url, 'fa-file-alt', 'Tarjeta')}
        ${docBtn(v.poliza_seguro_url, 'fa-shield-alt', 'Seguro')}
        ${docBtn(v.responsiva_url, 'fa-file-signature', 'Responsiva')}
        ${docBtn(v.qr_url, 'fa-qrcode', 'QR')}
      </td>
      <td class="text-center">
        <button class="btn btn-info btn-sm" onclick="toggleAlumnoG('${rowId}')"
                data-bs-toggle="tooltip" title="Ver alumno">
          <i class="fas fa-user-graduate"></i>
        </button>
      </td>
    </tr>
    <tr class="info-row" id="info-${rowId}">
      <td colspan="7">
        <div class="student-info">
          <div class="row">
            <div class="col-3"><p><strong><i class="fas fa-user"></i> Nombre:</strong><br>${v.nombre} ${v.apellido}</p></div>
            <div class="col-3"><p><strong><i class="fas fa-graduation-cap"></i> Grado y Grupo:</strong><br>${v.grado} "${v.grupo}"</p></div>
            <div class="col-3"><p><strong><i class="fas fa-phone"></i> Teléfono:</strong><br>${v.telefono}</p></div>
            <div class="col-3"><p style="word-break:break-all"><strong><i class="fas fa-envelope"></i> Email:</strong><br>${v.correo}</p></div>
          </div>
        </div>
      </td>
    </tr>`

  initTooltips()
}

// ─── Funciones globales ───────────────────────────────────────
// Se definen en window para poder llamarlas desde el HTML inline
window.verDocumento = (url) => { // Abre el modal con la vista previa del documento. El iframe se usa para mostrar PDFs directamente en el modal, y el enlace de descarga permite abrirlo en una nueva pestaña si el usuario prefiere esa opción.
  document.getElementById('documentViewer').src = url
  document.getElementById('documentDownload').href = url
  new bootstrap.Modal(document.getElementById('documentModal')).show()
}

// Alterna la visibilidad de la fila de info del alumno y cambia el ícono del botón. 
// Se llama al hacer clic en el botón de alumno en la tabla.
window.toggleAlumnoG = (rowId) => {
  const infoRow = document.getElementById(`info-${rowId}`)
  const icon = document.querySelector(`[data-row-id="${rowId}"] .btn-info i`)
  infoRow.classList.toggle('show')
  icon?.classList.replace(
    infoRow.classList.contains('show') ? 'fa-user-graduate' : 'fa-user-minus',
    infoRow.classList.contains('show') ? 'fa-user-minus' : 'fa-user-graduate'
  )
}

// ─── Escáner QR ───────────────────────────────────────────────
// Usa la cámara del dispositivo para leer el QR del vehículo.
// El plugin qrCode.min.js decodifica cada frame del video.
const video = document.createElement('video')
let scanning = false

function encenderCamara() {
  // facingMode: 'environment' → cámara trasera en móviles
  navigator.mediaDevices.getUserMedia({ video: { facingMode: 'environment' } })
    .then(stream => {
      scanning = true
      new bootstrap.Modal(document.getElementById('scannerModal')).show()
      const canvas = document.getElementById('qr-canvas')
      canvas.hidden = false
      video.setAttribute('playsinline', true) // Necesario en iOS
      video.srcObject = stream
      video.play()
      dibujarFrame(canvas)
      escanear()
    })
    .catch(() => alert('No se pudo acceder a la cámara.'))
}

// Dibuja cada frame del video en el canvas para que qrcode.decode() lo procese
function dibujarFrame(canvas) {
  const ctx = canvas.getContext('2d') // Obtener el contexto de dibujo del canvas
  canvas.height = video.videoHeight // Ajustar el tamaño del canvas al video
  canvas.width = video.videoWidth // Ajustar el tamaño del canvas al video
  ctx.drawImage(video, 0, 0, canvas.width, canvas.height) // Dibujar el frame actual del video en el canvas
  if (scanning) requestAnimationFrame(() => dibujarFrame(canvas)) // Continuar dibujando mientras se escanea
}

// Intenta decodificar el QR. Si falla (no hay QR visible), reintenta en 300ms
function escanear() {
  try { qrcode.decode() }
  catch { if (scanning) setTimeout(escanear, 300) }
}

// 
function cerrarCamara() {
  video.srcObject?.getTracks().forEach(t => t.stop()) // Apagar la cámara
  document.getElementById('qr-canvas').hidden = true
  scanning = false
  bootstrap.Modal.getInstance(document.getElementById('scannerModal'))?.hide()
}