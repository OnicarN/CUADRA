# AGENTS.md

Normas para cualquier IA (Codex, Claude, etc.) que trabaje en este repositorio.

## Proyecto
Cuadra: web sencilla en HTML, CSS y JavaScript, sin frameworks.

## Estructura
- `index.html`: página principal.
- `css/`: estilos.
- `js/`: funcionalidades, un archivo por funcionalidad.
- `no tocar.txt`: no modificar nunca.

## Flujo de trabajo (obligatorio)
1. Antes de empezar: `git checkout master` y `git pull`.
2. Crear una rama por tarea: `issue-N-descripcion` (o `nombre-tarea` si no hay issue).
3. Nunca hacer commit ni push directo a `master`.
4. Hacer commits pequeños con mensajes claros en español.
5. Subir la rama: `git push -u origin <rama>`.
6. Abrir la PR contra `master` con `gh pr create`, y poner `Closes #N` en la descripción si hay issue.
7. No fusionar la PR: la revisa y fusiona una persona.

## Reglas
- Modifica solo los archivos necesarios para la tarea.
- No reformatees ni reorganices código que no tenga que ver con la tarea.
- Si necesitas cambiar algo compartido (`index.html`, CSS global, `js/main.js`), explícalo en la descripción de la PR.
- Sin dependencias ni librerías externas salvo que la tarea lo pida.
