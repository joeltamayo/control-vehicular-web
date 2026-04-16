// ============================================================
//  Módulo central de comunicación con la API
//
//  Proporciona funciones para hacer peticiones a la API con manejo de tokens y un loader global.
//  También incluye una función para verificar sesión activa sin mostrar el loader, usada al cargar cada vista.
//
// ============================================================

import { showLoader, hideLoader } from './loader.js'
import { irAlLogin } from './router.js'

const BASE_URL = 'https://supervision-vehicular-api.onrender.com/api' // URL de Render al desplegar

// Función genérica para hacer peticiones a la API con manejo de tokens y loader global. 
// Intercepta errores 401 para renovar token automáticamente.
async function request(endpoint, options = {}, mensajeLoader = 'Procesando...') {
    const url = `${BASE_URL}${endpoint}` // Construir URL completa
    const config = {
        credentials: 'include', // Incluir cookies para autenticación
        headers: { ...options.headers }, // Permitir headers personalizados, como 'Content-Type'
        ...options, // Método, body, etc.
    }

    // Si el body no es FormData, asumir que es JSON y establecer el header correspondiente.
    if (!(config.body instanceof FormData)) {
        config.headers['Content-Type'] = 'application/json'
    }

    showLoader(mensajeLoader) // Mostrar loader global con mensaje personalizado
    try {
        let response = await fetch(url, config) // Hacer la petición a la API

        // Si la respuesta es 401 (no autorizado), intentar renovar el token y repetir la petición una vez.

        const esRutaAuth = endpoint.startsWith('/auth/')

        if (response.status === 401 && !esRutaAuth) {
            const renovado = await renovarToken() // Intentar renovar el token usando el refresh token
            if (renovado) {
                response = await fetch(url, config) // Reintentar la petición original con el nuevo token
            } else {
                irAlLogin() // Si no se pudo renovar el token, redirigir al login
                return null
            }
        }

        return response
    } finally {
        // finally garantiza que el loader se oculta siempre,
        hideLoader()
    }
}

// Función para renovar el access token usando el refresh token. 
// Se llama automáticamente al recibir un 401 en cualquier petición.
async function renovarToken() {
    try {
        const res = await fetch(`${BASE_URL}/auth/refresh`, { // Petición al endpoint de renovación de token
            method: 'POST',
            credentials: 'include',
        })
        return res.ok
    } catch {
        return false
    }
}

// Funciones específicas para cada método HTTP, que llaman a la función genérica 'request' con el método correspondiente.
export const api = {
    get: (endpoint, msg) => request(endpoint, { method: 'GET' }, msg || 'Cargando...'), // El mensaje del loader es opcional, con un valor por defecto para cada método
    post: (endpoint, body, msg) => request(endpoint, { method: 'POST', body: body instanceof FormData ? body : JSON.stringify(body) }, msg || 'Procesando...'), // Si el body es FormData, no convertir a JSON ni establecer Content-Type, para permitir la subida de archivos. Si no es FormData, asumir que es un objeto y convertir a JSON.
    put: (endpoint, body, msg) => request(endpoint, { method: 'PUT', body: body instanceof FormData ? body : JSON.stringify(body) }, msg || 'Guardando...'), // Lo mismo para PUT, que también puede usarse para subir archivos al editar un vehículo.
    delete: (endpoint, msg) => request(endpoint, { method: 'DELETE' }, msg || 'Eliminando...'), // Eliminar no tiene body, solo mensaje opcional para el loader.
}

// Verifica sesión activa — sin loader para no mostrar spinner en cada carga de página
export async function verificarSesion() {
    try {
        const res = await fetch(`${BASE_URL}/auth/me`, { credentials: 'include' }) // Petición al endpoint que verifica el token y devuelve los datos del usuario
        if (!res.ok) return null
        const data = await res.json()
        return data.usuario
    } catch {
        return null
    }
}