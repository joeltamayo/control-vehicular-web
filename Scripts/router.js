// ============================================================
//  Enrutador del SPA
//
//  Escucha cambios en el hash de la URL y renderiza la vista
//  correspondiente en <div id="app">.
//
//  También intercambia el CSS de la vista activa dinámicamente:
//  - #/login   → login.css
//  - #/admin   → vehiculos.css
//  - #/guardia → vehiculos.css
//
//  Esto evita que los estilos de login afecten a la tabla y
//  viceversa — cada CSS solo existe en el DOM cuando su vista
//  está activa.
// ============================================================

import { verificarSesion } from './api.js' // Función para verificar sesión activa al cargar cada vista
import { renderLogin } from './views/login.js' // Importar renderLogin para mostrar la vista de login en la ruta #/login
import { renderAdmin } from './views/admin.js' // Importar renderAdmin para mostrar la vista de admin en la ruta #/admin
import { renderGuardia } from './views/guardia.js' // Importar renderGuardia para mostrar la vista de guardia en la ruta #/guardia

const app = document.getElementById('app')

// Estado global del usuario en memoria
let usuarioActual = null

// Función para obtener el usuario actual en memoria, usada por otras vistas para mostrar su nombre o verificar su rol 
// sin hacer otra petición a la API. Se actualiza al iniciar sesión o al verificar sesión activa al cargar cada vista.
export function getUsuario() { return usuarioActual }
// Función para actualizar el usuario actual en memoria, por ejemplo al iniciar sesión o al renovar el token.
export function setUsuario(usuario) { usuarioActual = usuario }

// ─── Intercambio de CSS por vista ────────────────────────────
function setCss(hoja) {
    const id = 'vista-css'
    const actual = document.getElementById(id)

    // Si ya está cargado el mismo CSS, no hacer nada
    if (actual?.getAttribute('href') === `./Styles/${hoja}`) return

    actual?.remove()

    const link = document.createElement('link')
    link.rel = 'stylesheet'
    link.href = `./Styles/${hoja}`
    link.id = id
    document.head.appendChild(link)
}

// ─── Enrutador principal ──────────────────────────────────────
async function navegar() {
    const hash = window.location.hash || '#/login'

    // ── Login (ruta pública) ──────────────────────────────────
    if (hash === '#/login') {
        if (!usuarioActual) {
            usuarioActual = await verificarSesion()
        }
        // Si ya hay sesión activa redirigir a la vista correcta
        if (usuarioActual) {
            redirigirPorRol(usuarioActual.rol)
            return
        }
        setCss('login.css')
        app.innerHTML = renderLogin()
        const { initLoginView } = await import('./views/login.js')
        initLoginView()
        return
    }

    // ── Rutas protegidas — verificar sesión ───────────────────
    if (!usuarioActual) {
        usuarioActual = await verificarSesion()
    }

    if (!usuarioActual) { // Si no hay sesión activa, redirigir al login
        window.location.hash = '#/login'
        return
    }

    // ── Admin ─────────────────────────────────────────────────
    if (hash === '#/admin') { // Solo permitir acceso a administradores
        if (usuarioActual.rol !== 'Administrador') {
            redirigirPorRol(usuarioActual.rol)
            return
        }
        setCss('vehiculos.css')
        app.innerHTML = renderAdmin()
        const { initAdminView } = await import('./views/admin.js')
        initAdminView()
        return
    }

    // ── Guardia ───────────────────────────────────────────────
    if (hash === '#/guardia') { // Solo permitir acceso a guardias
        if (usuarioActual.rol !== 'Guardia') {
            redirigirPorRol(usuarioActual.rol)
            return
        }
        setCss('vehiculos.css')
        app.innerHTML = renderGuardia()
        const { initGuardiaView } = await import('./views/guardia.js')
        initGuardiaView()
        return
    }

    // Hash desconocido → login
    window.location.hash = '#/login'
}

// Función para redirigir al usuario a la vista correspondiente según su rol. 
// Se usa al cargar el login si ya hay sesión activa, o si un usuario intenta acceder a una ruta sin permiso.
function redirigirPorRol(rol) {
    if (rol === 'Administrador') window.location.hash = '#/admin'
    else if (rol === 'Guardia') window.location.hash = '#/guardia'
    else window.location.hash = '#/login'
}

// ─── Escuchar cambios de hash ─────────────────────────────────
window.addEventListener('hashchange', navegar)

// Carga inicial
navegar()