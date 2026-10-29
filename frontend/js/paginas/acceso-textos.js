// Textos compartidos por entrar, registro, recuperar, restablecer y verificar. Responsable: Ana
import { t } from '../core/i18n.js';
import { html, seguro } from '../core/ui.js';
import { icono } from '../core/iconos.js';

export const textosAcceso = {
  es: {
    'acceso.entrar.titulo': 'Entra en Cuadra',
    'acceso.entrar.subtitulo': 'Tus facturas te están esperando.',
    'acceso.entrar.boton': 'Entrar',
    'acceso.entrar.sinCuenta': '¿Aún no tienes cuenta?',
    'acceso.registro.titulo': 'Crea tu cuenta',
    'acceso.registro.subtitulo': '14 días con todo incluido. Después, gratis para siempre o el plan que elijas.',
    'acceso.registro.boton': 'Crear cuenta',
    'acceso.registro.conCuenta': '¿Ya tienes cuenta?',
    'acceso.google': 'Continuar con Google',
    'acceso.googlePendiente': 'El acceso con Google aún no está activado en este servidor.',
    'acceso.googleError': 'No hemos podido entrar con Google. Inténtalo de nuevo.',
    'acceso.googleEmail': 'Ya hay una cuenta con ese email. Entra con tu contraseña.',
    'acceso.o': 'o con tu email',
    'acceso.nombre': 'Nombre',
    'acceso.email': 'Email',
    'acceso.password': 'Contraseña',
    'acceso.passwordNueva': 'Contraseña nueva',
    'acceso.passwordAyuda': 'Mínimo 8 caracteres.',
    'acceso.passwordCorta': 'La contraseña tiene que tener al menos 8 caracteres.',
    'acceso.emailNoValido': 'El email no es válido.',
    'acceso.olvido': '¿Has olvidado la contraseña?',
    'acceso.demasiados': 'Demasiados intentos. Espera unos minutos y vuelve a probar.',
    'acceso.enlaceNoValido': 'Este enlace no es válido o ha caducado.',
    'acceso.irAlPanel': 'Ir a mi panel',
    'acceso.volverEntrar': 'Volver a entrar',
  },
  en: {
    'acceso.entrar.titulo': 'Log in to Cuadra',
    'acceso.entrar.subtitulo': 'Your invoices are waiting for you.',
    'acceso.entrar.boton': 'Log in',
    'acceso.entrar.sinCuenta': "Don't have an account yet?",
    'acceso.registro.titulo': 'Create your account',
    'acceso.registro.subtitulo': '14 days with everything included. Then free forever or the plan you choose.',
    'acceso.registro.boton': 'Create account',
    'acceso.registro.conCuenta': 'Already have an account?',
    'acceso.google': 'Continue with Google',
    'acceso.googlePendiente': 'Google sign-in is not enabled on this server yet.',
    'acceso.googleError': "We couldn't sign you in with Google. Please try again.",
    'acceso.googleEmail': 'There is already an account with that email. Log in with your password.',
    'acceso.o': 'or with your email',
    'acceso.nombre': 'Name',
    'acceso.email': 'Email',
    'acceso.password': 'Password',
    'acceso.passwordNueva': 'New password',
    'acceso.passwordAyuda': 'At least 8 characters.',
    'acceso.passwordCorta': 'The password must be at least 8 characters long.',
    'acceso.emailNoValido': 'The email is not valid.',
    'acceso.olvido': 'Forgot your password?',
    'acceso.demasiados': 'Too many attempts. Wait a few minutes and try again.',
    'acceso.enlaceNoValido': 'This link is not valid or has expired.',
    'acceso.irAlPanel': 'Go to my dashboard',
    'acceso.volverEntrar': 'Back to log in',
  },
};

// Botón "Continuar con Google" (RF-06). Si el servidor no tiene Google configurado, avisa.
export function activarBotonGoogle(boton, avisar, volver) {
  boton.addEventListener('click', async () => {
    const url = `/api/auth/google${volver ? `?volver=${encodeURIComponent(volver)}` : ''}`;
    const respuesta = await fetch(url, { redirect: 'manual' }).catch(() => null);
    if (respuesta && respuesta.type !== 'opaqueredirect' && !respuesta.ok) return avisar();
    location.href = url;
  });
}

// Mensaje traducido para un error de la API; si no lo conocemos, el del servidor.
export function mensajeError(error) {
  if (error.estado === 429) return t('acceso.demasiados');
  if (error.detalles?.codigo === 'enlace_no_valido') return t('acceso.enlaceNoValido');
  return error.message || t('comun.error');
}

// Pantalla de resultado: icono, título, texto y acciones (verificar, recuperar, restablecer).
export function estado({ icono: nombre, tipo = '', titulo, texto, acciones = '' }) {
  return html`
    <div class="acceso-estado ${tipo}">${seguro(icono(nombre))}</div>
    <h1 class="titulo-pagina">${titulo}</h1>
    ${texto ? seguro(html`<p class="texto-2">${texto}</p>`) : ''}
    ${seguro(acciones)}`;
}
