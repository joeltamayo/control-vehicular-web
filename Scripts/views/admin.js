// ============================================================
//  Vista del Administrador
// 
// El Administrador tiene control total sobre los registros de vehículos y alumnos.
// Puede crear, editar y eliminar registros, así como ver los documentos asociados.
// La interfaz incluye paginación, búsqueda por placa y validación de formularios.
// ============================================================

import { api } from '../api.js' // Funciones para hacer peticiones a la API con manejo de tokens y loader
import { showFeedbackModal } from '../feedback.js' // Función para mostrar modales de feedback con mensajes personalizados
import { setUsuario } from '../router.js' // Función para actualizar el usuario actual en memoria, por ejemplo al cerrar sesión, para que el router pueda redirigir al login si no hay sesión activa.

let paginaActual = 1 // Página actual para la paginación de registros.
let limitePagina = 5 // Número de registros por página, controlado por el select en la interfaz.
let totalPaginas = 1 // Total de páginas disponibles.
let modoModal = 'crear' // Modo del modal de vehículo: 'crear' para nuevo registro, 'editar' para modificar un registro existente.
let placaEditar = null // Placa del vehículo que se está editando, usada para cargar sus datos en el formulario y para enviar la petición de actualización a la API.

// Expresiones regulares para validar los campos del formulario de vehículo.
const patterns = {
  nombre: /^[a-zA-Z\s]{2,30}$/, // Solo letras y espacios, entre 2 y 30 caracteres. Se permiten nombres compuestos y con acentos.
  apellido: /^[a-zA-ZÀ-ÿ\u00f1\u00d1\s]{2,60}$/, // Letras (incluyendo acentos y ñ) y espacios, entre 2 y 60 caracteres para permitir apellidos compuestos o con preposiciones.
  telefono: /^\d{3}-\d{3}-\d{4}$/, // Formato de teléfono: 333-123-4567
  correo: /^[^\s@]+@[^\s@]+\.[^\s@]+$/, // Formato básico de correo electrónico
  placa: /^[A-Z0-9]{1,7}$/, // letras mayúsculas y números, entre 1 y 7 caracteres (dependiendo del formato de placas permitido).
  marca: /^[a-zA-ZÀ-ÿ\u00f1\u00d1\s]{1,30}$/, // letras (incluyendo acentos y ñ) y espacios, entre 1 y 30 caracteres.
  modelo: /^[a-zA-Z0-9\s]{1,20}$/, // letras, números y espacios, entre 1 y 20 caracteres.
  color: /^[a-zA-ZÀ-ÿ\u00f1\u00d1\s]{1,30}$/, // letras (incluyendo acentos y ñ) y espacios, entre 1 y 30 caracteres.
}

export function renderAdmin() {
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
          <h2 class="mb-4 text-center">Registros de Vehículos</h2>

          <div class="d-flex justify-content-between align-items-center w-100 mb-3">
            <div class="d-flex">
              <input type="text" id="searchInput" placeholder="Buscar vehículo..."
                     class="form-control" style="min-width:120px;">
              <button id="searchBtn" class="btn btn-primary ms-2 d-flex align-items-center" data-bs-toggle="tooltip" title="Buscar por placa">
                <i class="fas fa-search me-md-2 d-md-none d-inline"></i>
                <span class="d-none d-md-inline">Buscar</span>
              </button>
            </div>
            <button id="nuevoBtn" class="btn btn-success" data-bs-toggle="tooltip" title="Nuevo registro">
              <i class="fas fa-plus-circle d-md-none d-inline"></i>
              <span class="d-none d-md-inline"> Nuevo Registro</span>
            </button>
          </div>

          <div class="table-responsive">
            <table class="table table-hover align-middle">
              <thead class="table-light">
                <tr>
                  <th>Placa</th><th>Marca</th><th>Modelo</th><th>Color</th>
                  <th class="col-rs">Fecha</th>
                  <th class="col-rs">Documentos</th>
                  <th>Alumno</th><th>Acciones</th>
                </tr>
              </thead>
              <tbody id="registrosBody"></tbody>
            </table>
          </div>

          <div class="d-flex justify-content-between align-items-center mt-3">
            <div class="d-flex align-items-center">
              <span class="me-2 d-none d-sm-inline">Registros por página:</span>
              <select id="limitePage" class="form-select form-select-sm" style="width:auto;">
                <option value="5" selected>5</option>
                <option value="10">10</option>
                <option value="20">20</option>
              </select>
            </div>
            <div class="btn-group">
              <button id="prevPage" class="btn btn-secondary" disabled>
                <i class="fas fa-chevron-left"></i>
                <span class="d-none d-sm-inline"> Anterior</span>
              </button>
              <button id="nextPage" class="btn btn-secondary">
                <span class="d-none d-sm-inline">Siguiente </span>
                <i class="fas fa-chevron-right"></i>
              </button>
            </div>
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

    <!-- Modal crear/editar vehículo -->
    <div class="modal fade" id="vehiculoModal" tabindex="-1" aria-hidden="true">
      <div class="modal-dialog modal-lg">
        <div class="modal-content">
          <div class="modal-header">
            <h5 class="modal-title" id="modalTitle">Agregar Registro</h5>
            <button type="button" class="btn-close" data-bs-dismiss="modal"></button>
          </div>
          <div class="modal-body">
            <div class="container-lg py-4">
              <h2 class="card-title text-center mb-4">
                <i class="fas fa-car"></i> <span id="formHeaderText">Nuevo Registro</span>
              </h2>
              <form id="vehiculo-form">

                <!-- Información del Alumno -->
                <div class="card mb-4">
                  <div class="card-header bg-primary text-white">
                    <h4 class="mb-0"><i class="fas fa-user"></i> Información del Alumno</h4>
                  </div>
                  <div class="card-body">
                    <div class="row g-3">
                      <div class="col-md-6">
                        <label class="form-label">Nombre(s)</label>
                        <input type="text" class="form-control" id="f-nombre" name="nombre" required>
                      </div>
                      <div class="col-md-6">
                        <label class="form-label">Apellidos</label>
                        <input type="text" class="form-control" id="f-apellido" name="apellido" required>
                      </div>
                      <div class="col-md-6">
                        <label class="form-label">Grado</label>
                        <select class="form-select" id="f-grado" name="grado" required>
                          <option value="">Seleccionar</option>
                          <option>1°</option><option>2°</option><option>3°</option>
                        </select>
                      </div>
                      <div class="col-md-6">
                        <label class="form-label">Grupo</label>
                        <select class="form-select" id="f-grupo" name="grupo" required>
                          <option value="">Seleccionar</option>
                          <option>A</option><option>B</option><option>C</option><option>D</option>
                        </select>
                      </div>
                      <div class="col-md-6">
                        <label class="form-label">Teléfono</label>
                        <input type="tel" class="form-control" id="f-telefono" name="telefono"
                               placeholder="333-123-4567" required>
                      </div>
                      <div class="col-md-6">
                        <label class="form-label">Correo electrónico</label>
                        <input type="email" class="form-control" id="f-correo" name="correo" required>
                      </div>
                    </div>
                  </div>
                </div>

                <!-- Información del Vehículo -->
                <div class="card mb-4">
                  <div class="card-header bg-primary text-white">
                    <h4 class="mb-0"><i class="fas fa-car-side"></i> Información del Vehículo</h4>
                  </div>
                  <div class="card-body">
                    <div class="row g-3">
                      <div class="col-md-6">
                        <label class="form-label">Placa</label>
                        <input type="text" class="form-control" id="f-placa" name="placa"
                               placeholder="ASD1234" required>
                      </div>
                      <div class="col-md-6">
                        <label class="form-label">Marca</label>
                        <input type="text" class="form-control" id="f-marca" name="marca" required>
                      </div>
                      <div class="col-md-6">
                        <label class="form-label">Modelo</label>
                        <input type="text" class="form-control" id="f-modelo" name="modelo" required>
                      </div>
                      <div class="col-md-6">
                        <label class="form-label">Color</label>
                        <input type="text" class="form-control" id="f-color" name="color" required>
                      </div>
                    </div>

                    <!-- Documentos -->
                    <div class="row g-3 mt-3">
                      <div class="col-md-6">
                        <label class="form-label"><i class="fas fa-id-card"></i> Licencia</label>
                        <input type="file" class="form-control" id="f-licencia" name="licencia"
                               accept="image/jpeg,image/png" required>
                        <div id="f-licencia-preview" class="mt-1"></div>
                      </div>
                      <div class="col-md-6">
                        <label class="form-label"><i class="fas fa-file-alt"></i> Tarjeta de circulación</label>
                        <input type="file" class="form-control" id="f-tarjeta" name="tarjeta"
                               accept="image/jpeg,image/png" required>
                        <div id="f-tarjeta-preview" class="mt-1"></div>
                      </div>
                      <div class="col-md-6">
                        <label class="form-label"><i class="fas fa-shield-alt"></i> Seguro vehicular</label>
                        <input type="file" class="form-control" id="f-poliza" name="poliza"
                               accept="image/jpeg,image/png" required>
                        <div id="f-poliza-preview" class="mt-1"></div>
                      </div>
                      <div class="col-md-6">
                        <label class="form-label"><i class="fas fa-file-signature"></i> Responsiva</label>
                        <input type="file" class="form-control" id="f-responsiva" name="responsiva"
                               accept="image/jpeg,image/png" required>
                        <div id="f-responsiva-preview" class="mt-1"></div>
                      </div>
                    </div>
                  </div>
                </div>

                <div class="text-center">
                  <button type="submit" class="btn btn-primary btn-lg px-5">
                    <i class="fas fa-save"></i> <span id="formButton">Registrar</span>
                  </button>
                </div>
              </form>
            </div>
          </div>
        </div>
      </div>
    </div>

    <!-- Modal eliminar -->
    <div class="modal fade" id="deleteModal" tabindex="-1" aria-hidden="true">
      <div class="modal-dialog modal-dialog-centered">
        <div class="modal-content">
          <div class="modal-header">
            <h5 class="modal-title">Confirmar Eliminación</h5>
            <button type="button" class="btn-close" data-bs-dismiss="modal"></button>
          </div>
          <div class="modal-body">¿Estás seguro de que deseas eliminar este registro?</div>
          <div class="modal-footer">
            <button class="btn btn-secondary" data-bs-dismiss="modal">Cancelar</button>
            <button class="btn btn-danger" id="confirmDeleteBtn">Eliminar</button>
          </div>
        </div>
      </div>
    </div>`
}

// ─── Tooltips ─────────────────────────────────────────────────
// Inicializa todos los tooltips del DOM con trigger 'hover focus'.
function initTooltips() {
  document.querySelectorAll('[data-bs-toggle="tooltip"]').forEach(el => {
    bootstrap.Tooltip.getInstance(el)?.dispose()
    new bootstrap.Tooltip(el, { trigger: 'hover focus' })
  })
}

// Iniciamos la vista del administrador, cargando los vehículos y configurando los eventos de los botones.
export function initAdminView() {
  // lOGOUT
  document.getElementById('logoutBtn').addEventListener('click', async (e) => {
    e.preventDefault()
    await api.post('/auth/logout')
    setUsuario(null)
    showFeedbackModal({
      title: 'Sesión cerrada', message: 'Sesión cerrada correctamente.',
      type: 'success', redirectTo: '#/login', redirectDelay: 1500, autoClose : true,
    })
  })

  // Eventos de botones
  document.getElementById('nuevoBtn').addEventListener('click', () => abrirModal('crear')) // Abrir modal en modo 'crear' para registrar un nuevo vehículo.

  document.getElementById('nextPage').addEventListener('click', () => { paginaActual++; cargarVehiculos() }) // Ir a la siguiente página de registros.
  document.getElementById('prevPage').addEventListener('click', () => { paginaActual--; cargarVehiculos() }) // Ir a la página anterior de registros.
  document.getElementById('limitePage').addEventListener('change', (e) => {
    limitePagina = parseInt(e.target.value) // Actualizar el límite de registros por página según la selección del usuario.
    paginaActual = 1
    cargarVehiculos() // Recargar los vehículos con el nuevo límite y resetear a la primera página para evitar inconsistencias.
  })

  // Búsqueda por placa
  document.getElementById('searchBtn').addEventListener('click', () => {
    const placa = document.getElementById('searchInput').value.trim()
    if (!placa) { paginaActual = 1; cargarVehiculos(); return }
    buscarPorPlaca(placa)
  })
  // Permitir buscar por placa al presionar Enter en el input de búsqueda
  document.getElementById('searchInput').addEventListener('keyup', (e) => {
    if (e.key === 'Enter') document.getElementById('searchBtn').click()
  })

  document.getElementById('vehiculo-form').addEventListener('submit', submitFormulario)

  initTooltips()

  cargarVehiculos() // Cargar los vehículos al iniciar la vista del administrador.
}

// ─── Carga de datos ───────────────────────────────────────────
async function cargarVehiculos() {
  try {
    // El administrador puede cargar los vehículos con paginación, por lo que la ruta es /admin/vehiculos y acepta los parámetros de página y límite.
    const res = await api.get(`/admin/vehiculos?page=${paginaActual}&limit=${limitePagina}`, 'Cargando registros...')
    if (!res) return
    const data = await res.json()
    if (!res.ok) { mostrarErrorTabla(data.error); return }
    totalPaginas = data.totalPages || 1
    renderTabla(data.data)
    actualizarBotones()
  } catch {
    mostrarErrorTabla('Error de conexión')
  }
}
// Función para buscar vehículos por placa. la ruta es /admin/vehiculos con un query parameter de placa.
async function buscarPorPlaca(placa) {
  try {
    const res = await api.get(`/admin/vehiculos?placa=${encodeURIComponent(placa)}`, 'Buscando vehículo...')
    if (!res) return
    const data = await res.json()
    if (res.status === 404) {
      document.getElementById('registrosBody').innerHTML = `
        <tr><td colspan="8" class="text-center">
          <div class="alert alert-warning mb-0">
            <i class="fas fa-exclamation-triangle"></i>
            No se encontró ningún vehículo con la placa <strong>${placa}</strong>
          </div></td></tr>`
      document.getElementById('nextPage').disabled = true
      document.getElementById('prevPage').disabled = true
      return
    }
    renderTabla(data.data)
    document.getElementById('nextPage').disabled = true
    document.getElementById('prevPage').disabled = true
  } catch {
    mostrarErrorTabla('Error de conexión')
  }
}

// ─── Render de la tabla ───────────────────────────────────────
function docBtn(url, icon, tooltip) {
  if (!url) return ''
  return `<button onclick="verDocumento('${url}')"
            class="btn btn-sm btn-outline-secondary me-1 btn-documents"
            data-bs-toggle="tooltip" title="${tooltip}">
            <i class="fas ${icon}"></i></button>`
}

function formatFecha(iso) {
  if (!iso) return 'N/A'
  return new Date(iso).toLocaleDateString('es-MX', { year: 'numeric', month: 'long', day: 'numeric' })
}

// Renderiza la tabla de vehículos. Si no hay vehículos, muestra un mensaje indicando que no hay registros disponibles.
// Si hay vehículos, los mapea a filas de la tabla con sus datos y botones de acción.
function renderTabla(vehiculos) { 
  const tbody = document.getElementById('registrosBody')
  if (!vehiculos?.length) {
    tbody.innerHTML = '<tr><td colspan="8" class="text-center">No hay registros disponibles</td></tr>'
    return
  }

  tbody.innerHTML = vehiculos.map(v => `
    <tr data-row-id="${v.vehiculo_id}">
      <td>${v.placa}</td>
      <td>${v.marca}</td>
      <td>${v.modelo}</td>
      <td>${v.color}</td>
      <td>${formatFecha(v.fecha_registro)}</td>
      <td>
        ${docBtn(v.licencia_url, 'fa-id-card', 'Licencia')}
        ${docBtn(v.tarjeta_circulacion_url, 'fa-file-alt', 'Tarjeta')}
        ${docBtn(v.poliza_seguro_url, 'fa-shield-alt', 'Seguro')}
        ${docBtn(v.responsiva_url, 'fa-file-signature', 'Responsiva')}
        ${docBtn(v.qr_url, 'fa-qrcode', 'QR')}
      </td>
      <td class="text-center">
        <button class="btn btn-info btn-sm" onclick="toggleAlumno('${v.vehiculo_id}')"
                data-bs-toggle="tooltip" title="Ver alumno">
          <i class="fas fa-user-graduate"></i>
        </button>
      </td>
      <td>
        <div class="d-flex gap-1 justify-content-center">
          <button class="btn btn-outline-warning btn-sm btn-edit" data-bs-toggle="tooltip" title="Editar registro" id="edit-${v.vehiculo_id}">
            <i class="fas fa-edit d-md-none d-inline"></i>
            <span class="d-none d-md-inline">Editar</span>
          </button>
          <button class="btn btn-outline-danger btn-sm btn-delete" data-bs-toggle="tooltip" title="Eliminar registro" onclick="confirmarEliminar('${v.placa}')">
            <i class="fas fa-trash-alt d-md-none d-inline"></i>
            <span class="d-none d-md-inline">Eliminar</span>
          </button>
        </div>
      </td>
    </tr>
    <tr class="info-row" id="info-${v.vehiculo_id}">
      <td colspan="8">
        <div class="student-info">
          <div class="row">
            <div class="col-3"><p><strong><i class="fas fa-user"></i> Nombre:</strong><br>${v.nombre} ${v.apellido}</p></div>
            <div class="col-3"><p><strong><i class="fas fa-graduation-cap"></i> Grado y Grupo:</strong><br>${v.grado} "${v.grupo}"</p></div>
            <div class="col-3"><p><strong><i class="fas fa-phone"></i> Teléfono:</strong><br>${v.telefono}</p></div>
            <div class="col-3"><p style="word-break:break-all"><strong><i class="fas fa-envelope"></i> Email:</strong><br>${v.correo}</p></div>
          </div>
        </div>
      </td>
    </tr>`).join('')

  vehiculos.forEach(v => {
    document.getElementById(`edit-${v.vehiculo_id}`)
      ?.addEventListener('click', () => abrirModal('editar', v))
  })

  initTooltips()
}

// ─── Funciones globales ───────────────────────────────────────

// Función global para mostrar un documento en el modal de vista previa. 
window.verDocumento = (url) => { 
  document.getElementById('documentViewer').src = url
  document.getElementById('documentDownload').href = url
  new bootstrap.Modal(document.getElementById('documentModal')).show()
}

// Función global para mostrar/ocultar la fila de información del alumno asociada a un vehículo.
window.toggleAlumno = (rowId) => {
  const infoRow = document.getElementById(`info-${rowId}`)
  const icon = document.querySelector(`[data-row-id="${rowId}"] .btn-info i`)

  document.querySelectorAll('.info-row.show').forEach(row => {
    if (row.id !== `info-${rowId}`) {
      row.classList.remove('show')
      const otherIcon = document.querySelector(
        `[data-row-id="${row.id.replace('info-', '')}"] .btn-info i`
      )
      if (otherIcon) otherIcon.classList.replace('fa-user-minus', 'fa-user-graduate')
    }
  })

  infoRow.classList.toggle('show')
  icon?.classList.replace(
    infoRow.classList.contains('show') ? 'fa-user-graduate' : 'fa-user-minus',
    infoRow.classList.contains('show') ? 'fa-user-minus' : 'fa-user-graduate'
  )
}

// Función global para confirmar la eliminación de un registro. 
// Al hacer clic en el botón de eliminar, se muestra un modal de confirmación. 
// Si el usuario confirma, se envía una petición DELETE a la API para eliminar el vehículo por su placa.
window.confirmarEliminar = (placa) => {
  document.getElementById('confirmDeleteBtn').onclick = async () => {
    try {
      const res  = await api.delete(`/admin/vehiculos/${encodeURIComponent(placa)}`, 'Eliminando registro...')
      const data = await res.json()
      bootstrap.Modal.getInstance(document.getElementById('deleteModal')).hide()
      if (!res.ok) {
        showFeedbackModal({ title: 'Error', message: data.error, type: 'error' })
        return
      }
      showFeedbackModal({
        title: 'Registro eliminado',
        message: 'El vehículo y sus datos se eliminaron correctamente.',
        type: 'success', autoClose: true,
      })
      paginaActual = 1
      cargarVehiculos()
    } catch {
      showFeedbackModal({ title: 'Error', message: 'No fue posible eliminar el registro.', type: 'error' })
    }
  }
  new bootstrap.Modal(document.getElementById('deleteModal')).show()
}

// ─── Modal crear/editar ───────────────────────────────────────
// Esta función abre el modal de vehículo en modo 'crear' o 'editar'.
// En modo 'crear', el formulario se resetea y se configuran los campos para un nuevo registro.
// En modo 'editar', se cargan los datos del vehículo seleccionado en el formulario, se muestran 
// los enlaces a los documentos actuales y se ajustan las validaciones para permitir actualizar solo los campos deseados.
function abrirModal(tipo, data = null) {
  modoModal = tipo
  placaEditar = null

  const modal = bootstrap.Modal.getOrCreateInstance(document.getElementById('vehiculoModal'))
  const docFields = ['licencia', 'tarjeta', 'poliza', 'responsiva']

  if (tipo === 'crear') { // Configurar el modal para crear un nuevo registro, reseteando el formulario y habilitando todos los campos.
    document.getElementById('modalTitle').innerText = 'Nuevo Registro de Vehículo'
    document.getElementById('formHeaderText').innerText = 'Nuevo Registro de Vehículo'
    document.getElementById('formButton').innerText = 'Registrar'
    document.getElementById('vehiculo-form').reset()
    document.getElementById('f-placa').disabled = false
    document.getElementById('f-correo').disabled = false
    docFields.forEach(d => {
      document.getElementById(`f-${d}`).required = true
      document.getElementById(`f-${d}-preview`).innerHTML = ''
    })

  } else if (tipo === 'editar' && data) { // Configurar el modal para editar un registro existente, cargando los datos del vehículo en el formulario y ajustando las validaciones.
    document.getElementById('modalTitle').innerText = 'Editar Registro de Vehículo'
    document.getElementById('formHeaderText').innerText = 'Editar Registro de Vehículo'
    document.getElementById('formButton').innerText = 'Guardar Cambios'
    placaEditar = data.placa

    // Rellenar campos de texto
    const campos = {
      nombre: data.nombre, apellido: data.apellido, correo: data.correo,
      telefono: data.telefono, grado: data.grado, grupo: data.grupo,
      placa: data.placa, marca: data.marca, modelo: data.modelo, color: data.color,
    }
    Object.entries(campos).forEach(([k, v]) => {
      const el = document.getElementById(`f-${k}`)
      if (el) el.value = v || ''
    })

    // Mostrar enlaces a documentos actuales
    const docs = {
      licencia: data.licencia_url,
      poliza: data.poliza_seguro_url,
      tarjeta: data.tarjeta_circulacion_url,
      responsiva: data.responsiva_url,
    }
    Object.entries(docs).forEach(([campo, url]) => {
      const preview = document.getElementById(`f-${campo}-preview`)
      if (preview && url) {
        preview.innerHTML = `<small class="text-muted">Archivo actual:</small>
          <a href="${url}" target="_blank" class="text-primary ms-1">Ver archivo</a>`
      }
    })

    document.getElementById('f-placa').disabled = true
    document.getElementById('f-correo').disabled = true
    docFields.forEach(d => document.getElementById(`f-${d}`).required = false)
  }

  modal.show()
}

// ─── Submit del formulario ────────────────────────────────────
async function submitFormulario(e) {
  e.preventDefault()
  const formData = new FormData(document.getElementById('vehiculo-form'))

  // Validar campos de texto — saltar los que estén disabled (modo editar)
  const camposTexto = ['nombre', 'apellido', 'telefono', 'correo', 'marca', 'modelo', 'color']
  for (const campo of camposTexto) {
    const el = document.getElementById(`f-${campo}`)
    if (el?.disabled) continue
    const valor = formData.get(campo)?.trim()
    if (!valor) { alert(`El campo ${campo} es obligatorio.`); return }
    if (patterns[campo] && !patterns[campo].test(valor)) {
      alert(`El campo ${campo} no tiene el formato correcto.`)
      return
    }
  }

  // Validar grado y grupo — son <select> y e.preventDefault() cancela
  const grado = formData.get('grado')
  const grupo = formData.get('grupo')
  if (!grado) { alert('El campo grado es obligatorio.'); return }
  if (!grupo) { alert('El campo grupo es obligatorio.'); return }

  try {
    let res, data

    if (modoModal === 'crear') { // En modo 'crear', se envía una petición POST a /admin/vehiculos para registrar un nuevo vehículo con los datos del formulario.
      res  = await api.post('/admin/vehiculos', formData, 'Registrando vehículo...')
      data = await res.json()
      if (!res.ok) { alert(data.errores?.join('\n') || data.error); return }
      showFeedbackModal({ title: 'Registro exitoso', message: 'Alumno y vehículo registrados.', type: 'success', autoClose: true })

    } else if (modoModal === 'editar' && placaEditar) { // En modo 'editar', se envía una petición PUT a /admin/vehiculos/:placa para actualizar el vehículo existente con los datos del formulario. Solo se actualizan los campos que no están disabled, y los archivos son opcionales.
      res  = await api.put(`/admin/vehiculos/${encodeURIComponent(placaEditar)}`, formData, 'Guardando cambios...')
      data = await res.json()
      if (!res.ok) { alert(data.errores?.join('\n') || data.error); return }
      showFeedbackModal({ title: 'Actualización completada', message: 'El registro se actualizó correctamente.', type: 'success', autoClose: true })
    }

    bootstrap.Modal.getInstance(document.getElementById('vehiculoModal')).hide()
    paginaActual = 1
    cargarVehiculos()
  } catch {
    alert('Error al guardar. Inténtalo de nuevo.')
  }
}

// ─── Helpers ─────────────────────────────────────────────────

// Esta función actualiza el estado de los botones de paginación (habilitados o deshabilitados) según la página actual y el total de páginas disponibles.
function actualizarBotones() {
  document.getElementById('prevPage').disabled = paginaActual <= 1
  document.getElementById('nextPage').disabled = paginaActual >= totalPaginas
}

// Esta función muestra un mensaje de error en la tabla, por ejemplo si no se pudieron cargar los registros o si hubo un error de conexión.
function mostrarErrorTabla(msg) {
  document.getElementById('registrosBody').innerHTML =
    `<tr><td colspan="8" class="text-center text-danger">
      <i class="fas fa-exclamation-circle"></i> ${msg}</td></tr>`
}