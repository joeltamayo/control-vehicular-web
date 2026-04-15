// ============================================================
//  Scripts/feedback.js — Modal de notificaciones
//
//  Muestra un modal Bootstrap con ícono, título y mensaje.
//  Soporta auto-cierre y redirección automática.
// ============================================================

const MODAL_ID = 'feedbackModal'
// Íconos de FontAwesome para cada tipo de mensaje
const ICONOS = {
    success: 'fas fa-check-circle text-success', // Ícono verde para éxito
    error: 'fas fa-times-circle text-danger', // Ícono rojo para error
    warning: 'fas fa-exclamation-triangle text-warning', // Ícono amarillo para advertencia
    info: 'fas fa-info-circle text-primary', // Ícono azul para información
}

let timerCierre = null // Timer para auto-cierre del modal
let timerRedireccion = null // Timer para redirección automática después de mostrar el modal

// Función para limpiar timers activos antes de mostrar un nuevo mensaje, para evitar cierres o redirecciones inesperadas si se muestran varios mensajes seguidos.
function limpiarTimers() {
    if (timerCierre) { clearTimeout(timerCierre); timerCierre = null }
    if (timerRedireccion) { clearTimeout(timerRedireccion); timerRedireccion = null }
}
// Función principal para mostrar el modal de feedback. Acepta un objeto de opciones para personalizar el mensaje.
export function showFeedbackModal({
    title = 'Aviso',
    message = '',
    type = 'info',
    autoClose = false,
    autoCloseDelay = 1800,
    redirectTo = null,
    redirectDelay = 1800,
} = {}) {
    const modalEl = document.getElementById(MODAL_ID)
    if (!modalEl || !window.bootstrap?.Modal) return false

    modalEl.querySelector('.feedback-modal-title').textContent = title
    modalEl.querySelector('.feedback-modal-message').textContent = message
    modalEl.querySelector('.feedback-modal-icon').className =
        `feedback-modal-icon fa-3x mb-3 ${ICONOS[type] || ICONOS.info}`

    limpiarTimers()

    // Usar la API de Bootstrap para mostrar el modal
    const instance = window.bootstrap.Modal.getOrCreateInstance(modalEl, { backdrop: 'static' })
    instance.show()

    if (autoClose) {
        timerCierre = setTimeout(() => { instance.hide(); timerCierre = null }, autoCloseDelay)
    }

    if (redirectTo) {
        timerRedireccion = setTimeout(() => {
            // Si redirectTo es una ruta hash, usar window.location.hash para evitar recargar la página. Si es una URL completa, usar window.location.href para redirigir normalmente.
            if (redirectTo.startsWith('#')) {
                window.location.hash = redirectTo
            } else {
                window.location.href = redirectTo
            }
        }, redirectDelay)
    }

    return true
}

// Función para ocultar el modal manualmente, por ejemplo al hacer clic en un botón de cerrar. 
// También limpia los timers para evitar cierres o redirecciones inesperadas si se muestra otro mensaje después.
export function hideFeedbackModal() {
    const modalEl = document.getElementById(MODAL_ID)
    if (!modalEl || !window.bootstrap?.Modal) return
    limpiarTimers()
    const instance = window.bootstrap.Modal.getInstance(modalEl)
    if (instance) instance.hide()
}