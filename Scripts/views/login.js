// ============================================================
//  Vista de inicio de sesión
//
// El login es la única vista pública — no requiere sesión activa para acceder.
// Al hacer login exitoso, se guarda el usuario en memoria (router.js) y se redirige a la vista correspondiente según su rol.
// ============================================================

import { api } from '../api.js'
import { showFeedbackModal } from '../feedback.js'
import { setUsuario } from '../router.js'

// ─── HTML de la vista ─────────────────────────────────────────
export function renderLogin() {
  return `
    <header>
      <img src="./Media/Logo_SV.png" alt="Logo SV" class="logo-left">
      <img src="./Media/Logo_CSJ.png" alt="Logo CSJ" class="logo-right">
    </header>

    <main class="container login">
      <div class="row justify-content-center align-items-center min-vh-75">
        <div class="col-md-6 col-lg-4">
          <div class="login-card card shadow-lg border-0">
            <div class="card-header text-center py-3">
              <h4 class="mb-0"><i class="fas fa-user-lock"></i> Inicio de Sesión</h4>
            </div>
            <div class="card-body p-4">
              <form id="login-form">
                <div class="mb-3">
                  <label for="correo" class="form-label">
                    <i class="fas fa-envelope"></i> Correo electrónico
                  </label>
                  <input type="email" class="form-control" id="correo"
                         name="correo" required autocomplete="email">
                </div>
                <div class="mb-4">
                  <label for="password" class="form-label">
                    <i class="fas fa-key"></i> Contraseña
                  </label>
                  <div class="input-group">
                    <input type="password" class="form-control" id="password"
                           name="password" required autocomplete="current-password">
                    <button class="btn btn-outline-secondary" type="button"
                            id="togglePassword" title="Mostrar u ocultar contraseña">
                      <i class="fas fa-eye"></i>
                    </button>
                  </div>
                </div>
                <button type="submit" class="btn btn-custom w-100 py-2">
                  <i class="fas fa-sign-in-alt"></i> Ingresar
                </button>
              </form>
              <div id="mensaje" class="alert mt-3 d-none"></div>
            </div>
          </div>
        </div>
      </div>
    </main>`
}

// ─── Lógica de la vista ───────────────────────────────────────
export function initLoginView() {
  const form = document.getElementById('login-form')
  const correoEl = document.getElementById('correo')
  const passwordEl = document.getElementById('password');


  // Limpiar validación al escribir 
  [correoEl, passwordEl].forEach(input => {
    input.addEventListener('input', () => {
      input.classList.remove('is-invalid')
      document.getElementById('mensaje').classList.add('d-none')
    })
  })


  // Toggle visibilidad contraseña (agregado para mejorar UX, no afecta la seguridad ya que la contraseña se envía igual al backend)
  document.getElementById('togglePassword').addEventListener('click', function () {
    const pwd = document.getElementById('password')
    const icon = this.querySelector('i')
    if (pwd.type === 'password') {
      pwd.type = 'text'
      icon.classList.replace('fa-eye', 'fa-eye-slash')
    } else {
      pwd.type = 'password'
      icon.classList.replace('fa-eye-slash', 'fa-eye')
    }
  })

  // Submit del formulario de login
  form.addEventListener('submit', async (e) => {
    e.preventDefault()
    limpiarEstados()

    const correo = correoEl.value.trim()
    const password = passwordEl.value

    if (!correo || !password) {
      mostrarError('Por favor, complete todos los campos', [correoEl, passwordEl])
      return
    }

    try {
      const res = await api.post('/auth/login', { correo, password }, 'Iniciando sesión...')
      if (!res) return // Si la respuesta es undefined, ya se mostró un error de conexión en api.js

      const data = await res.json() // Intentamos parsear la respuesta JSON

      if (!res.ok) { // Si el status no es 200-299, mostrar error 
        console.error('Error en login:', data.error || res.statusText)
        mostrarError(data.error || 'Credenciales incorrectas', [correoEl, passwordEl]) // 
        return
      }

      // Guardar usuario en memoria (router.js lo usa para proteger rutas)
      setUsuario(data.usuario)
      mostrarExito(`Bienvenid@ ${data.usuario.nombre}`)

      setTimeout(() => {
        if (data.usuario.rol === 'Administrador') window.location.hash = '#/admin'
        else if (data.usuario.rol === 'Guardia') window.location.hash = '#/guardia'
        else mostrarError('Rol de usuario no válido')
      }, 1000)

    } catch {
      mostrarError('Error de conexión. Verifique su internet.')
    }
  })
}

// ─── Helpers de UI ────────────────────────────────────────────
// Funciones para mostrar mensajes de error o éxito, y para limpiar los estados de validación de los campos del formulario.
function limpiarEstados() {
  document.querySelectorAll('.form-control').forEach(i => i.classList.remove('is-invalid'))
  document.getElementById('mensaje').className = 'alert mt-3 d-none'
}

function mostrarError(mensaje, campos = []) {
  const el = document.getElementById('mensaje')
  el.className = 'alert alert-danger mt-3 show'
  el.innerHTML = `<i class="fas fa-exclamation-circle"></i> ${mensaje}`
  campos.forEach(c => c.classList.add('is-invalid'))
}

function mostrarExito(mensaje) {
  const el = document.getElementById('mensaje')
  el.className = 'alert alert-success mt-3 show'
  el.innerHTML = `<i class="fas fa-check-circle"></i> ${mensaje}`
}