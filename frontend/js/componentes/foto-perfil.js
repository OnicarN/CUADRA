// Foto de perfil: elegirla, cambiarla o quitarla desde la pantalla de Perfil. Responsable: Dani.
//
// La pantalla de Perfil (js/paginas/perfil.js) la llama con su círculo de la inicial:
//   pintarFotoPerfil(document.getElementById('perfil-avatar'));
// La foto se recorta en cuadrado y se reduce a 256×256 en el navegador antes de subirla.
import { api } from '../core/api.js';
import { t, agregarTextos } from '../core/i18n.js';
import { icono } from '../core/iconos.js';
import { html, seguro, mostrarToast } from '../core/ui.js';
import { ponerFotoPerfil } from '../core/layout.js';

agregarTextos({
  es: {
    'foto.cambiar': 'Cambiar foto de perfil',
    'foto.elegir': 'Elegir foto',
    'foto.quitar': 'Quitar foto',
    'foto.guardada': 'Foto de perfil guardada',
    'foto.quitada': 'Foto de perfil quitada',
    'foto.noValida': 'No hemos podido abrir esa imagen. Prueba con una foto JPG o PNG.',
  },
  en: {
    'foto.cambiar': 'Change profile photo',
    'foto.elegir': 'Choose photo',
    'foto.quitar': 'Remove photo',
    'foto.guardada': 'Profile photo saved',
    'foto.quitada': 'Profile photo removed',
    'foto.noValida': "We couldn't open that image. Try a JPG or PNG photo.",
  },
});

const LADO = 256;

// Recorta el centro en cuadrado y lo reduce a 256×256 en JPG.
async function prepararFoto(archivo) {
  const imagen = await createImageBitmap(archivo, { imageOrientation: 'from-image' });
  const lado = Math.min(imagen.width, imagen.height);
  const lienzo = document.createElement('canvas');
  lienzo.width = LADO;
  lienzo.height = LADO;
  const ctx = lienzo.getContext('2d');
  ctx.fillStyle = '#fff'; // los PNG transparentes, sobre blanco
  ctx.fillRect(0, 0, LADO, LADO);
  ctx.drawImage(imagen, (imagen.width - lado) / 2, (imagen.height - lado) / 2, lado, lado, 0, 0, LADO, LADO);
  imagen.close?.();
  return new Promise((resolve, reject) => lienzo.toBlob((b) => (b ? resolve(b) : reject(new Error('foto'))), 'image/jpeg', 0.85));
}

export async function pintarFotoPerfil(avatar) {
  if (!avatar) return;
  avatar.setAttribute('data-foto-perfil', '');
  const envoltorio = document.createElement('div');
  envoltorio.className = 'foto-perfil';
  avatar.replaceWith(envoltorio);
  envoltorio.innerHTML = html`
    <button type="button" class="foto-perfil-boton" aria-label="${t('foto.cambiar')}" title="${t('foto.cambiar')}" aria-haspopup="true" aria-expanded="false"></button>
    <div class="foto-perfil-menu" role="menu" hidden>
      <button type="button" role="menuitem" class="foto-perfil-opcion" data-accion="elegir">${seguro(icono('camara'))}${t('foto.elegir')}</button>
      <button type="button" role="menuitem" class="foto-perfil-opcion" data-accion="quitar" hidden>${seguro(icono('papelera'))}${t('foto.quitar')}</button>
    </div>
    <input type="file" accept="image/jpeg,image/png,image/webp,image/*" hidden>`;
  const boton = envoltorio.querySelector('.foto-perfil-boton');
  const menu = envoltorio.querySelector('.foto-perfil-menu');
  const quitar = envoltorio.querySelector('[data-accion="quitar"]');
  const entrada = envoltorio.querySelector('input');
  boton.append(avatar);
  boton.insertAdjacentHTML('beforeend', `<span class="foto-perfil-lapiz" aria-hidden="true">${icono('editar')}</span>`);

  let tiene = false;
  const pintar = (version) => {
    tiene = Boolean(version);
    quitar.hidden = !tiene;
    ponerFotoPerfil(version);
  };
  api('/foto/estado').then((f) => pintar(f.version)).catch(() => {});

  const abrirMenu = (abierto) => {
    menu.hidden = !abierto;
    boton.setAttribute('aria-expanded', String(abierto));
  };
  // Sin foto, directamente a elegir; con foto, el menú para cambiarla o quitarla.
  boton.addEventListener('click', () => (tiene ? abrirMenu(menu.hidden) : entrada.click()));
  document.addEventListener('click', (e) => { if (!envoltorio.contains(e.target)) abrirMenu(false); });
  envoltorio.addEventListener('keydown', (e) => { if (e.key === 'Escape') { abrirMenu(false); boton.focus(); } });

  menu.addEventListener('click', async (e) => {
    const opcion = e.target.closest('[data-accion]');
    if (!opcion) return;
    abrirMenu(false);
    if (opcion.dataset.accion === 'elegir') return entrada.click();
    try {
      await api('/foto', { metodo: 'DELETE' });
      pintar(null);
      mostrarToast(t('foto.quitada'));
    } catch (error) {
      mostrarToast(error.message || t('comun.error'));
    }
  });

  entrada.addEventListener('change', async () => {
    const [archivo] = entrada.files;
    entrada.value = '';
    if (!archivo) return;
    let foto;
    try {
      foto = await prepararFoto(archivo);
    } catch {
      return mostrarToast(t('foto.noValida'));
    }
    boton.disabled = true;
    try {
      const formulario = new FormData();
      formulario.append('foto', foto, 'foto.jpg');
      const { version } = await api('/foto', { metodo: 'PUT', formulario });
      pintar(version);
      mostrarToast(t('foto.guardada'));
    } catch (error) {
      mostrarToast(error.message || t('comun.error'));
    } finally {
      boton.disabled = false;
    }
  });
}
