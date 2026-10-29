// Textos compartidos por entrar, registro, recuperar, restablecer y verificar. Responsable: Ana
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
    'acceso.googlePendiente': 'El acceso con Google llegará pronto.',
    'acceso.o': 'o con tu email',
    'acceso.nombre': 'Nombre',
    'acceso.email': 'Email',
    'acceso.password': 'Contraseña',
    'acceso.passwordAyuda': 'Mínimo 8 caracteres.',
    'acceso.olvido': '¿Has olvidado la contraseña?',
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
    'acceso.googlePendiente': 'Google sign-in is coming soon.',
    'acceso.o': 'or with your email',
    'acceso.nombre': 'Name',
    'acceso.email': 'Email',
    'acceso.password': 'Password',
    'acceso.passwordAyuda': 'At least 8 characters.',
    'acceso.olvido': 'Forgot your password?',
  },
};

// Botón de Google: mientras /api/auth/google no esté hecho (#23) muestra un aviso.
export function activarBotonGoogle(boton, avisar) {
  boton.addEventListener('click', async () => {
    const respuesta = await fetch('/api/auth/google', { redirect: 'manual' }).catch(() => null);
    if (respuesta && respuesta.status === 501) return avisar();
    location.href = '/api/auth/google';
  });
}
