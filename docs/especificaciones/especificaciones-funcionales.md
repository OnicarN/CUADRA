# Cuadra — Especificaciones funcionales

28/10/2026 · El equipo de Cuadra

Qué tiene que hacer la web de Cuadra, sin entrar en diseño. Cada requisito lleva un código (RF-xx) para poder referenciarlo en el prototipo y en las pruebas.

## Principios generales

- **Cuadra sugiere, el usuario decide.** Ninguna categoría, asociación o dato leído cuenta hasta que el usuario lo confirma, y en todo lo posible es el usuario quien elige y configura.
- **Un único tipo de usuario:** el autónomo o profesional independiente, que solo ve y gestiona lo suyo.
- **Español e inglés** en toda la web.
- **Todo en todos los dispositivos:** cualquier función se puede usar igual desde el móvil que desde el ordenador.

## Web pública

| Código | Requisito |
| --- | --- |
| RF-01 | Página de inicio de presentación de Cuadra, visible sin registrarse. |
| RF-02 | Página de precios con todos los planes, su precio, las funciones incluidas, los extras (paquetes de lecturas y funciones sueltas), el plan gratis y la prueba gratuita. |
| RF-03 | Desde la página de inicio y la de precios se puede crear una cuenta o iniciar sesión. |
| RF-04 | Selector de idioma español / inglés. |

## Registro, acceso y perfil

| Código | Requisito |
| --- | --- |
| RF-05 | Registro con nombre, email y contraseña. |
| RF-06 | Registro e inicio de sesión con cuenta de Google. |
| RF-07 | Verificación del email: al registrarse llega un correo para confirmar la cuenta. |
| RF-08 | Recuperación de contraseña por email. |
| RF-09 | Cada usuario solo puede ver y gestionar sus propios datos y facturas. |
| RF-10 | Perfil fiscal obligatorio antes de subir la primera factura: NIF, dirección fiscal y actividad. La web comprueba que el NIF tiene un formato válido. |
| RF-11 | Según la actividad indicada, la web propone un régimen de IVA y el usuario lo confirma o lo cambia. |
| RF-12 | Campo opcional con el email de la gestoría. Si está vacío, el Excel y el informe solo se pueden descargar, no enviar. |

## Subida de facturas

| Código | Requisito |
| --- | --- |
| RF-13 | Un único botón de subida. En ordenador abre el explorador de archivos y permite arrastrar archivos; en móvil permite hacer la foto, elegir de la galería o de archivos. |
| RF-14 | La web pide permiso para usar la cámara y permite hacer la foto desde la propia web. |
| RF-15 | Con la cámara, el usuario elige si hace una sola foto o varias seguidas. |
| RF-16 | Subida múltiple: se pueden seleccionar varios archivos a la vez y cada uno se trata como una factura separada. |
| RF-17 | Formatos admitidos: PDF e imagen (JPG, PNG y HEIC, el formato por defecto del iPhone). |
| RF-18 | Cada usuario tiene una dirección de correo propia de Cuadra. Al reenviarle una factura, entra sola en su cuenta. |
| RF-19 | Esa dirección solo acepta correos del email del usuario y de los emails de confianza que él añada. Los demás se descartan y se avisa al usuario. |
| RF-20 | Si el correo trae varios adjuntos, cada uno se lee como una factura separada. |
| RF-21 | Si el correo no trae adjunto, se lee el texto del correo, se guarda como PDF original y se marca como "procedente del texto del correo, no de un adjunto". |
| RF-22 | La web se puede instalar en la pantalla de inicio del móvil y, una vez instalada, se pueden compartir PDF o imágenes directamente a Cuadra. |
| RF-23 | Al llegar al límite de facturas del plan, la subida no se bloquea: las facturas se guardan como "sin leer" hasta que el usuario amplíe o se renueve el mes, y se le avisa. |

## Lectura automática

| Código | Requisito |
| --- | --- |
| RF-24 | De cada factura se leen: fecha, emisor, NIF del emisor, NIF del receptor, número de factura, base imponible, tipo de IVA y cuota (varios por factura si los hay), total, moneda y categoría del gasto. |
| RF-25 | Si la factura no viene en euros, se convierte con el tipo de cambio de la fecha de la factura. Se muestran el importe original y el importe en euros, y el usuario puede corregir el tipo de cambio. |
| RF-26 | Categorías: lista base adaptada a la actividad del usuario, más las categorías propias que él cree. La IA propone una y el usuario la puede cambiar. |
| RF-27 | La web comprueba que la base imponible más las cuotas de IVA coinciden con el total. |
| RF-28 | La web comprueba que el NIF del receptor es el del usuario. |
| RF-29 | La lectura tiene que funcionar con los casos de la prueba del enunciado: ticket de gasolinera arrugado, ticket de supermercado con varios tipos de IVA, factura PDF de suscripción en inglés y foto torcida y con poca luz. |

## Revisión y corrección

Cada factura pasa por tres estados:

1. **Sin leer:** subida pero todavía no leída (solo cuando se ha superado el límite del plan).
2. **Pendiente de revisar:** leída por la IA, esperando a que el usuario la confirme.
3. **Confirmada:** revisada por el usuario. Solo las confirmadas cuentan en el panel, la exportación y los informes.

| Código | Requisito |
| --- | --- |
| RF-30 | Toda factura leída queda pendiente de revisar hasta que el usuario la confirma. |
| RF-31 | Pantalla de revisión con el original (foto o PDF) al lado de los datos leídos. Cada campo se edita directamente; corregir un dato no puede llevar más de dos clics. |
| RF-32 | Las facturas confirmadas no se pueden editar. |
| RF-33 | El usuario puede reabrir una factura confirmada: vuelve a pendiente de revisar y queda registrado qué se cambió y en qué fecha. |
| RF-34 | Las facturas pendientes de revisar se pueden borrar (por ejemplo, una foto equivocada). Las confirmadas no se pueden borrar nunca. |

## Duplicados e histórico

| Código | Requisito |
| --- | --- |
| RF-35 | Se considera posible duplicado si coinciden NIF del emisor, número de factura y total. En tickets sin número, si coinciden emisor, fecha, hora y total. |
| RF-36 | Ante un posible duplicado, la web avisa y muestra las dos facturas juntas. El usuario decide si la descarta o la guarda igualmente. |
| RF-37 | Histórico con todas las facturas subidas y su estado. |
| RF-38 | Búsqueda libre y filtros por cualquier dato: fecha, emisor, NIF, número, categoría, importe, estado o avisos. |
| RF-39 | El original (foto o PDF) se guarda siempre enlazado a sus datos y se puede ver y descargar desde cada factura. |

## Avisos

| Código | Requisito |
| --- | --- |
| RF-40 | Los avisos aparecen siempre dentro de la web, en un apartado propio con contador de avisos abiertos. |
| RF-41 | Los avisos también llegan por email. El usuario puede desactivar el email para cada tipo de aviso. |
| RF-42 | El usuario elige los días tras los que salta el aviso de "pendiente de revisar" (7 días por defecto). |

| Aviso | Cuándo salta |
| --- | --- |
| Ticket sin NIF | La factura no trae el NIF del emisor o del receptor y puede que no sea deducible. |
| Factura a otro NIF | El NIF del receptor no es el del usuario. |
| Total que no cuadra | La base más las cuotas de IVA no coinciden con el total. |
| Posible duplicado | Se cumple el criterio de RF-35. |
| Pendiente de revisar | Una factura lleva más días de los elegidos sin confirmar. |
| Trimestre a punto de cerrar | Quedan pocos días para el cierre del trimestre. |
| Evento sin ticket | Un viaje o reunión del calendario no tiene ningún gasto asociado. |
| Factura desde texto del correo | La factura se ha leído del texto del correo y no de un adjunto. |
| Facturas sin leer | Se ha superado el límite del plan y hay facturas esperando. |
| Correo no autorizado | Ha llegado una factura desde un email que no es de confianza. |

## Panel con cifras

| Código | Requisito |
| --- | --- |
| RF-43 | El usuario elige el periodo que ve en el panel: mes, trimestre o año. |
| RF-44 | El panel muestra: número de facturas, gasto total, gasto por categoría y comparación con el periodo anterior. |
| RF-45 | El panel muestra el IVA soportado del trimestre (lo que podrá deducir en el modelo 303). |
| RF-46 | El panel muestra las facturas pendientes de revisar, los avisos abiertos y los días que quedan para el cierre del trimestre. |
| RF-47 | El panel muestra el gasto por cliente o proyecto, a partir de los gastos asociados a eventos del calendario. |
| RF-48 | Todas las cifras del panel se calculan solo con facturas confirmadas. |

## Exportación e informes

| Código | Requisito |
| --- | --- |
| RF-49 | Exportación a Excel con una fila por factura y todos sus datos leídos. |
| RF-50 | El usuario elige el periodo a medida (fecha de inicio y de fin) y puede filtrar por categorías. |
| RF-51 | El Excel solo incluye facturas confirmadas y no lleva los originales. |
| RF-52 | Informe trimestral en PDF. Primera página ejecutiva: gasto total, IVA deducible, principales categorías, comparación con el trimestre anterior y avisos pendientes. Después, un anexo con el detalle de todas las facturas del trimestre. |
| RF-53 | El Excel y el informe se pueden descargar o enviar por email a la gestoría desde Cuadra (si el email de la gestoría está en el perfil). |

## Conexión con Google Calendar

| Código | Requisito |
| --- | --- |
| RF-54 | Conexión opcional, solo con Google Calendar. El usuario la puede desconectar cuando quiera. |
| RF-55 | Cuando un gasto coincide en fecha con un evento (viaje, reunión con cliente), Cuadra sugiere asociarlo y el usuario acepta o rechaza. |
| RF-56 | El usuario elige qué fechas de trimestres y modelos de Hacienda (303, 130…) se añaden a su calendario y con cuántos días de antelación le avisa. |

## Suscripción y baja

| Código | Requisito |
| --- | --- |
| RF-57 | El usuario ve su plan, cuántas facturas lleva del límite del mes y cuándo se renueva. |
| RF-58 | Puede cambiar de plan, comprar paquetes de lecturas extra y añadir funciones sueltas sin cambiar de plan. |
| RF-59 | Pago con tarjeta dentro de la web y descarga de las facturas que le emite Cuadra. |
| RF-60 | Plan gratis para siempre con límite de facturas y prueba gratuita de unos días con todo incluido. |
| RF-61 | Puede cancelar la suscripción cuando quiera. Al terminar el periodo pagado pasa al plan gratis y sigue viendo todo su histórico. |
| RF-62 | Puede eliminar su cuenta. Antes se le ofrece descargar un Excel con todas sus facturas y un ZIP con todos los originales, y se le pide confirmación. |

## Requisitos generales y pendientes

| Código | Requisito |
| --- | --- |
| RF-63 | Toda la web disponible en español e inglés. |
| RF-64 | Todas las funciones disponibles en móvil y en ordenador. |
| RF-65 | Conexión cifrada y almacenamiento seguro de datos y originales. El detalle va en el documento legal. |

Queda para otros documentos:

- [ ] Precios y límites de cada plan, del plan gratis y duración de la prueba.
- [ ] Normativa aplicable. En especial, cómo encajar que las confirmadas no se borren (Hacienda puede pedir justificantes durante años) con el derecho del usuario a que se borren sus datos al eliminar la cuenta.
- [ ] Diseño e identidad visual.
