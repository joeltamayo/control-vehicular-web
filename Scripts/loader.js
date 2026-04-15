// ============================================================
//  Indicador de carga global
//
//  Muestra un overlay con spinner mientras hay peticiones
//  activas a la API. Usa un contador para soportar múltiples
//  peticiones simultáneas — el overlay solo desaparece cuando
//  todas terminan.
// ============================================================

let peticionesActivas = 0

// Crear el overlay una sola vez al cargar el módulo
const overlay = document.createElement('div')
overlay.id = 'loader-overlay'
overlay.innerHTML = `
  <div class="loader-box">
    <div class="spinner-border text-light" role="status" style="width:3rem;height:3rem;">
      <span class="visually-hidden">Cargando...</span>
    </div>
    <p class="loader-text">Procesando...</p>
  </div>`
document.body.appendChild(overlay)

// Función para mostrar el loader. Acepta un mensaje personalizado opcional.
export function showLoader(mensaje = 'Procesando...') {
    peticionesActivas++
    overlay.querySelector('.loader-text').textContent = mensaje
    overlay.classList.add('active')
}

// Función para ocultar el loader. Solo lo oculta cuando el contador de peticiones activas llega a cero, para soportar múltiples peticiones simultáneas.
export function hideLoader() {
    peticionesActivas = Math.max(0, peticionesActivas - 1)
    if (peticionesActivas === 0) {
        overlay.classList.remove('active')
    }
}