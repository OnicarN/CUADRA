# Cuadra — Documento de diseño

29/10/2026 · El equipo de Cuadra

Cómo se ve Cuadra en toda la web: un estilo neutro y sobrio, con blanco y grises, un naranja vivo de acento y las cifras como protagonistas. Este documento fija las reglas generales; las pantallas concretas se construyen a partir de ellas.

## Principios de diseño

- **Las cifras mandan.** El dato importante (gasto, IVA, facturas pendientes) va grande; el texto de apoyo, pequeño y en gris.
- **Mucho aire.** Fondo claro, tarjetas separadas y poca información por bloque, para que se entienda de un vistazo.
- **Un solo color de acento.** El naranja se reserva para la acción principal y lo que hay que mirar; el resto va en blanco y grises.
- **Sobrio pero cercano.** Aspecto de herramienta seria para algo como los impuestos, con formas redondeadas y textos que hablan de tú.
- **El usuario decide.** Lo que propone la IA se ve siempre como sugerencia, nunca como algo ya hecho.
- **Igual de completa en móvil y en ordenador.** Se diseña primero para móvil y se amplía a pantalla grande.

**Referencias que nos inspiran**

| Referencia | Qué cogemos |
| --- | --- |
| App de gastos con escaneo de tickets (blanco, grises y naranja) | Tarjetas blancas, cifras grandes, etiquetas de categoría, banners de la IA y gráficos limpios con un solo color. |
| Panel de gestión de maquinaria (EquipFlow) | La versión de ordenador del mismo estilo: menú arriba, pestañas en píldora, tarjetas en cuadrícula y botón principal naranja. |
| App de finanzas con tarjetas moradas | Jerarquía de la pantalla principal y lista de gastos recientes. No cogemos el morado. |
| App de salud con tonos pastel | Mensajes de la IA cercanos y las barras de progreso. No cogemos los degradados ni la tipografía serif. |

## Logo

El logo de Cuadra son cinco rombos de contorno que encajan entre sí: la idea de que todo cuadre. Se usa la **versión de rombos limpios** en todos los tamaños.

- **Colores:** negro sobre fondo claro y blanco (versión invertida) sobre fondo oscuro o en modo oscuro. El logo no se pinta en naranja ni en otros colores.
- **Icono de app y favicon:** el símbolo dentro de un cuadrado de esquinas redondeadas, con margen alrededor.
- **Menú de arriba en ordenador:** símbolo a la izquierda, a unos 28 px de alto.
- **Tamaño mínimo:** 16 px de alto, para que los rombos no se cierren.
- **Área de respeto:** alrededor del logo se deja libre como mínimo el ancho de uno de los rombos.
- **No se puede:** deformarlo, girarlo, añadirle sombras o efectos, ni ponerlo sobre fotos o fondos con poco contraste.

Pendiente: la versión del logo con el nombre "Cuadra".

## Color

La base es blanca y gris, el naranja vivo marca la acción y lo importante, y verde y rojo indican lo bueno y lo malo. El rojo es más oscuro y frío que el naranja para que un aviso no se confunda con un botón.

| Uso | Modo claro | Modo oscuro |
| --- | --- | --- |
| Fondo de la página | #F6F6F4 | #0F0F10 |
| Tarjetas | #FFFFFF | #1A1A1C |
| Bordes y separadores | #E6E6E3 | #2A2A2D |
| Texto principal y cifras | #141414 | #F2F2F2 |
| Texto secundario | #6B6B6B | #A0A0A5 |
| Naranja de acento (gráficos, iconos activos, cifras destacadas) | #F05A1A | #FF6A2B |
| Naranja de botón (fondo con texto blanco) | #D2440B | #F05A1A |
| Naranja suave (fondo de etiquetas "pendiente" y banners de la IA) | #FFF1EA | #3A2116 |
| Verde (ahorro, confirmada, mejora) | #17803F | #3DD68C |
| Verde suave (fondo de etiquetas) | #E7F6EE | #12301F |
| Rojo (avisos, se pasa, error) | #C62828 | #FF6B6B |
| Rojo suave (fondo de etiquetas) | #FDECEC | #3A1616 |

Hay dos naranjas a propósito: el de acento es más vivo, y el de botón es un punto más oscuro para que el texto blanco encima se lea bien (contraste de 4,5:1, el mínimo recomendado por las pautas de accesibilidad WCAG). Los contrastes del modo claro están calculados a mano; conviene comprobarlos con una herramienta antes de cerrar la paleta, igual que los del modo oscuro.

## Tipografía

Una sola familia sans serif limpia y redondeada para toda la web. Proponemos **Manrope** (gratuita, en Google Fonts), y como alternativa **Inter**. Las cifras tienen que usar números tabulares, de ancho fijo, para que los importes queden alineados en listas y tablas; Inter los tiene seguro y en Manrope hay que comprobarlo antes de elegirla.

| Estilo | Uso | Móvil | Ordenador | Peso |
| --- | --- | --- | --- | --- |
| Cifra principal | El dato grande de una tarjeta (gasto total, IVA) | 36 px | 48 px | Bold |
| Título de página | "Panel", "Facturas" | 26 px | 32 px | Semibold |
| Título de sección | Cabecera de tarjeta o bloque | 18 px | 20 px | Semibold |
| Texto normal | Párrafos, datos de una factura | 16 px | 16 px | Regular |
| Texto secundario | Fechas, aclaraciones, "vs mes pasado" | 14 px | 14 px | Regular |
| Etiqueta | Chips de categoría y estado | 12 px | 12 px | Medium |

Interlineado de 1,5 en el texto normal y de 1,2 en cifras y títulos. Nunca menos de 12 px.

## Espaciado, retícula y adaptación

- **Espaciado:** todo se mide en múltiplos de 4 px (4, 8, 12, 16, 24, 32, 48). Dentro de una tarjeta, 16 px en móvil y 24 px en ordenador; entre tarjetas, 12 px en móvil y 16 px en ordenador.
- **Esquinas:** tarjetas a 20 px, campos de formulario a 12 px, y botones, pestañas y etiquetas en forma de píldora (totalmente redondeados).
- **Profundidad:** las tarjetas se separan del fondo por el color y, como mucho, una sombra muy suave. Nada de sombras fuertes ni degradados.

| Tamaño | Ancho de pantalla | Retícula | Margen lateral |
| --- | --- | --- | --- |
| Móvil | Hasta 767 px | 4 columnas, tarjetas a ancho completo o de dos en dos | 16 px |
| Tablet | 768 – 1023 px | 8 columnas, tarjetas de dos en dos | 24 px |
| Ordenador | Desde 1024 px | 12 columnas, tarjetas de tres en tres como en EquipFlow, contenido hasta 1200 px de ancho | 32 px |

En ordenador se aprovecha el ancho poniendo cosas una al lado de otra, por ejemplo el original de la factura a la izquierda y sus datos a la derecha. En móvil esas mismas piezas se apilan una debajo de otra.

## Componentes generales

| Componente | Cómo es |
| --- | --- |
| Tarjeta | Fondo blanco, esquinas de 20 px, título pequeño arriba, cifra grande y una línea de apoyo en gris (por ejemplo, "↓ 12 % vs mes pasado" en verde o rojo). |
| Botón principal | Píldora naranja de botón con texto blanco. Uno solo por pantalla, para la acción más importante (subir factura, confirmar). |
| Botón secundario | Píldora con borde gris y texto oscuro. |
| Botón de texto | Solo texto naranja, para acciones menores como "Ver todo". |
| Pestañas | Grupo de píldoras sobre fondo gris claro; la activa en blanco. Para cambiar entre mes, trimestre y año, o entre vistas. |
| Etiquetas | Píldoras pequeñas. Categorías en gris; estados con color: pendiente en naranja suave, confirmada en verde suave, sin leer en gris, aviso en rojo suave. Siempre con texto, no solo color. |
| Banner de la IA o aviso | Tarjeta con un icono de destello a la izquierda, una frase corta y una flecha para ir al detalle. Fondo naranja suave para sugerencias y rojo suave para avisos importantes. |
| Campos de formulario | Fondo blanco, borde gris, esquinas de 12 px y etiqueta encima. En la revisión de facturas los datos se ven como texto y al pulsar se vuelven editables. |
| Gráficos | Líneas o barras finas, sin rejilla o con rejilla muy suave, un solo color de acento y un tooltip oscuro al pasar por encima. |
| Listas | Filas con icono a la izquierda, nombre y categoría en el centro, e importe y fecha a la derecha con números tabulares. |
| Iconos | De línea fina y sencillos, trazo de 1,5 px y 24 px de tamaño base. Sin ilustraciones ni iconos 3D, tampoco en pantallas vacías. |
| Pantallas vacías | Un icono de línea, una frase y un botón para la siguiente acción ("Aún no hay facturas. Sube la primera"). |

## Navegación

**Móvil:** barra fija abajo con cinco iconos de línea y su nombre debajo: Inicio, Facturas, Subir, Avisos y Perfil. El botón de Subir va en el centro, en círculo naranja y algo más grande que los demás, porque es la acción más usada. Avisos lleva un contador rojo cuando hay alguno abierto.

**Ordenador:** menú fijo arriba, al estilo de EquipFlow:

- A la izquierda, el logo.
- En el centro, las secciones como pestañas en píldora (Panel, Facturas, Informes).
- A la derecha, el buscador de facturas, el botón naranja de Subir factura, la campana de avisos con contador y la foto o inicial del usuario, que abre Perfil y Configuración.

**Modo claro y oscuro:** por defecto sigue el ajuste del móvil u ordenador del usuario, y se puede cambiar a mano en Configuración.

## Textos, accesibilidad y pendientes

**Tono de los textos:** de tú, frases cortas y sin jerga contable. Cuando algo cuesta dinero, se dice claro y con la solución: "Este ticket no tiene NIF y puede que no lo puedas deducir. Pide la factura completa". Lo que propone la IA se escribe como sugerencia: "¿Este gasto es de la reunión con Alba?".

**Accesibilidad:**

- Contraste mínimo de 4,5:1 entre texto y fondo, en modo claro y oscuro.
- Zonas para pulsar de al menos 44 × 44 px en móvil.
- Los estados nunca se indican solo con color: siempre van con texto o icono.
- Todo se puede usar con teclado en ordenador.

**Pendiente:**

- [ ] Versión del logo con el nombre "Cuadra".
- [ ] Confirmar la tipografía (Manrope o Inter) y que tenga números tabulares.
- [ ] Comprobar los contrastes de la paleta con una herramienta.
