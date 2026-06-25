var STORE_PREFIX = "cotizacion-";
var LOGO_DEFAULT = "img/icon-color.svg";

function obtenerMoneda() {
  return localStorage.getItem(STORE_PREFIX + "moneda") || "ARS";
}

function formatearMoneda(n) {
  var moneda = obtenerMoneda();
  var signo = n < 0 ? "- " : "";
  var abs = Math.abs(n);
  if (moneda === "USD") {
    return (
      signo +
      "U$D " +
      abs.toLocaleString("en-US", {
        minimumFractionDigits: 2,
        maximumFractionDigits: 2,
      })
    );
  }
  return (
    signo +
    "AR$ " +
    abs.toLocaleString("es-AR", {
      minimumFractionDigits: 2,
      maximumFractionDigits: 2,
    })
  );
}

function obtenerSiguienteNro() {
  var nro = parseInt(localStorage.getItem(STORE_PREFIX + "nro") || "0", 10);
  nro++;
  localStorage.setItem(STORE_PREFIX + "nro", nro.toString());
  return String(nro).padStart(4, "0");
}

function guardarDatos() {
  var inputs = document.querySelectorAll("[data-persist]");
  inputs.forEach(function (el) {
    var key = STORE_PREFIX + el.getAttribute("data-persist");
    localStorage.setItem(key, el.value);
  });
}

function cargarDatos() {
  var inputs = document.querySelectorAll("[data-persist]");
  inputs.forEach(function (el) {
    var key = STORE_PREFIX + el.getAttribute("data-persist");
    var val = localStorage.getItem(key);
    if (val !== null) {
      el.value = val;
    }
  });

  var logoData = localStorage.getItem(STORE_PREFIX + "logo");
  if (logoData) {
    showLogoPreview(logoData);
  } else {
    showLogoPreview(LOGO_DEFAULT);
  }
}

function showLogoPreview(dataUrl) {
  var render = document.getElementById("render-logo");
  render.src = dataUrl;
  render.style.display = "inline";
  var preview = document.getElementById("preview-logo");
  if (preview) preview.src = dataUrl;
}

function actualizarPreviewItem(row) {
  var precio = parseFloat(row.querySelector(".item-precio").value) || 0;
  var preview = row.querySelector(".preview-monto");
  if (preview) {
    preview.textContent = precio !== 0 ? formatearMoneda(precio) : "";
  }
}

function actualizarTodosLosPreviews() {
  document.querySelectorAll(".item-row").forEach(actualizarPreviewItem);
}

function actualizarTotalesItems() {
  var items = obtenerItems();
  var subtotal = 0;
  items.forEach(function (i) {
    subtotal += i.total;
  });
  var iva = subtotal * 0.21;
  var total = subtotal + iva;

  document.getElementById("items-subtotal").textContent =
    formatearMoneda(subtotal);
  document.getElementById("items-iva").textContent = formatearMoneda(iva);
  document.getElementById("items-total").textContent = formatearMoneda(total);
}

function cambiarMoneda(moneda) {
  localStorage.setItem(STORE_PREFIX + "moneda", moneda);
  document.querySelectorAll(".currency-option").forEach(function (btn) {
    btn.classList.toggle(
      "active",
      btn.getAttribute("data-currency") === moneda,
    );
  });
  actualizarTodosLosPreviews();
  actualizarTotalesItems();
}

function actualizarEstadoBoton() {
  var items = obtenerItems();
  document.getElementById("btn-generar").disabled = items.length === 0;

  var rows = document.querySelectorAll(".item-row");
  var ultimoValido = false;
  if (rows.length > 0) {
    var last = rows[rows.length - 1];
    var cant = parseFloat(last.querySelector(".item-cant").value) || 0;
    var desc = last.querySelector(".item-desc").value.trim();
    var precio = parseFloat(last.querySelector(".item-precio").value) || 0;
    ultimoValido = cant > 0 && desc !== "" && precio !== 0;
  }
  document.getElementById("btn-agregar-item").disabled = !ultimoValido;
}

function resetSeccion(seccion) {
  var sectionEl = document.querySelector('[data-section="' + seccion + '"]');
  if (!sectionEl) return;

  if (seccion === "items") {
    var container = document.getElementById("items-container");
    container.innerHTML = "";
    agregarItem(1, "", "");
    actualizarEstadoBoton();
    actualizarTotalesItems();
    return;
  }

  var inputs = sectionEl.querySelectorAll("[data-persist]");
  inputs.forEach(function (el) {
    var key = STORE_PREFIX + el.getAttribute("data-persist");
    localStorage.removeItem(key);
    el.value = "";
  });

  if (seccion === "emisor") {
    localStorage.removeItem(STORE_PREFIX + "logo");
    document.getElementById("input-logo").value = "";
    showLogoPreview(LOGO_DEFAULT);
  }

  if (seccion === "metadatos") {
    document.getElementById("input-fecha").value = new Date()
      .toISOString()
      .split("T")[0];
  }
}

function agregarItem(cant, desc, precio) {
  var container = document.getElementById("items-container");
  var div = document.createElement("div");
  div.className = "item-row";

  div.innerHTML =
    '<div class="item-option">' +
    '<label for="item_cant">' +
    "<p>Cant.</p>" +
    '<input type="number" id="item_cant" class="item-cant" value="' +
    (cant ?? 1) +
    '" min="1" step="1">' +
    "</label>" +
    // '<span class="item-multiply">x</span>' +
    '<div class="precio-group">' +
    "<label>Monto</label>" +
    '<input type="number" class="item-precio" value="' +
    (precio ?? "") +
    '" step="0.01" placeholder="0,00">' +
    '<span class="preview-monto"></span>' +
    "</div>" +
    "</div>" +
    '<div class="item-footer">' +
    '<textarea class="item-desc" placeholder="Descripción">' +
    (desc ?? "") +
    "</textarea>" +
    '<button class="btn-danger btn-remove-item" title="Eliminar">✕</button>' +
    "</div>";

  div.querySelector(".btn-remove-item").addEventListener("click", function () {
    div.remove();
    actualizarEstadoBoton();
    actualizarTotalesItems();
  });

  div.querySelectorAll("input, textarea").forEach(function (el) {
    el.addEventListener("input", function () {
      actualizarEstadoBoton();
      actualizarPreviewItem(div);
      actualizarTotalesItems();
    });
  });

  container.appendChild(div);
  actualizarEstadoBoton();
  actualizarPreviewItem(div);
  actualizarTotalesItems();
}

function obtenerItems() {
  var items = [];
  document.querySelectorAll(".item-row").forEach(function (row) {
    var cant = parseFloat(row.querySelector(".item-cant").value) || 0;
    var desc = row.querySelector(".item-desc").value.trim();
    var precio = parseFloat(row.querySelector(".item-precio").value) || 0;
    if (cant > 0 && desc && precio !== 0) {
      items.push({
        cant: cant,
        desc: desc,
        precio: precio,
        total: cant * precio,
      });
    }
  });
  return items;
}

function poblarPlantilla() {
  var logoFile = document.getElementById("input-logo").files[0];
  if (logoFile) {
    var reader = new FileReader();
    reader.onload = function (e) {
      var dataUrl = e.target.result;
      document.getElementById("render-logo").src = dataUrl;
      localStorage.setItem(STORE_PREFIX + "logo", dataUrl);
    };
    reader.readAsDataURL(logoFile);
  } else {
    var savedLogo = localStorage.getItem(STORE_PREFIX + "logo");
    document.getElementById("render-logo").src = savedLogo || LOGO_DEFAULT;
  }

  document.getElementById("render-empresa").textContent =
    document.getElementById("input-empresa").value || "Empresa Emisora";
  document.getElementById("render-cuit").textContent =
    "CUIT: " + (document.getElementById("input-cuit").value || "00-00000000-0");
  document.getElementById("render-email").textContent =
    document.getElementById("input-email").value || "info@empresa.com.ar";

  document.getElementById("render-cliente").textContent =
    document.getElementById("input-cliente").value || "---";
  document.getElementById("render-direccion").textContent =
    document.getElementById("input-direccion").value || "---";

  var fecha = document.getElementById("input-fecha").value;
  if (fecha) {
    var partes = fecha.split("-");
    document.getElementById("render-fecha").textContent =
      partes[2] + "/" + partes[1] + "/" + partes[0];
  }

  document.getElementById("render-validez").textContent =
    document.getElementById("input-validez").value || "---";

  var items = obtenerItems();
  var tbody = document.getElementById("render-items-body");
  tbody.innerHTML = "";

  var subtotal = 0;
  items.forEach(function (item) {
    var tr = document.createElement("tr");
    tr.innerHTML =
      "<td>" +
      item.cant +
      "</td>" +
      "<td>" +
      item.desc +
      "</td>" +
      '<td class="money">' +
      formatearMoneda(item.precio) +
      "</td>" +
      '<td class="money">' +
      formatearMoneda(item.total) +
      "</td>";
    tbody.appendChild(tr);
    subtotal += item.total;
  });

  var iva = subtotal * 0.21;
  var total = subtotal + iva;

  document.getElementById("render-subtotal").textContent =
    formatearMoneda(subtotal);
  document.getElementById("render-iva").textContent = formatearMoneda(iva);
  document.getElementById("render-total").textContent = formatearMoneda(total);
}

// function generarPDF() {
//     var nro = obtenerSiguienteNro();
//     var sugerencia = 'Cotizacion_' + nro + '.pdf';
//     var nombre = window.prompt('Nombre del archivo:', sugerencia);
//     if (nombre === null) nombre = sugerencia;

//     poblarPlantilla();
//     guardarDatos();
//     document.getElementById('render-nro').textContent = nro;

//     var wrapper = document.getElementById('pdf-wrapper');
//     var elemento = document.getElementById('plantilla-a4');
//     var bodyEl = document.body;
//     var savedBodyPadding = bodyEl.style.padding;

//     bodyEl.style.padding = '0';

//     wrapper.style.position = 'fixed';
//     wrapper.style.left = '0';
//     wrapper.style.top = '0';
//     wrapper.style.width = '210mm';
//     wrapper.style.zIndex = '-1';
//     wrapper.style.opacity = '0';
//     wrapper.style.pointerEvents = 'none';

//     void elemento.offsetHeight;

//     var opt = {
//         margin: 0,
//         filename: nombre,
//         image: { type: 'jpeg', quality: 0.98 },
//         html2canvas: {
//             scale: 2,
//             useCORS: true,
//             windowWidth: elemento.scrollWidth,
//             windowHeight: elemento.scrollHeight,
//             scrollY: 0,
//             scrollX: 0,
//         },
//         jsPDF: { unit: 'mm', format: 'a4', orientation: 'portrait' }
//     };

//     html2pdf().set(opt).from(elemento).save().then(function () {
//         bodyEl.style.padding = savedBodyPadding;
//         wrapper.style.position = 'absolute';
//         wrapper.style.left = '-9999px';
//         wrapper.style.top = '0';
//         wrapper.style.width = '210mm';
//         wrapper.style.zIndex = '';
//         wrapper.style.opacity = '';
//         wrapper.style.pointerEvents = '';
//     });

//     resetSeccion('items');
// }

// function generarPDF() {
//   var nro = obtenerSiguienteNro();
//   var sugerencia = "Cotizacion_" + nro + ".pdf";
//   var nombre = window.prompt("Nombre del archivo:", sugerencia);
//   if (nombre === null) nombre = sugerencia;

//   poblarPlantilla();
//   guardarDatos();
//   document.getElementById("render-nro").textContent = nro;

//   var wrapper = document.getElementById("pdf-wrapper");
//   var elemento = document.getElementById("plantilla-a4");

//   // Guardamos estado original del body
//   var bodyEl = document.body;
//   var savedBodyPadding = bodyEl.style.padding;
//   var savedBodyMargin = bodyEl.style.margin; // También guardamos el margen

//   // 1. Limpiamos cualquier espacio que pueda desplazar el canvas
//   bodyEl.style.padding = "0";
//   bodyEl.style.margin = "0";

//   // 2. CLAVE: Usamos 'absolute' en vez de 'fixed'
//   wrapper.style.position = "absolute";
//   wrapper.style.left = "0px";
//   wrapper.style.top = "0px";
//   wrapper.style.width = "210mm";
//   wrapper.style.zIndex = "9999"; // Lo traemos al frente
//   wrapper.style.opacity = "1";
//   wrapper.style.pointerEvents = "none";

//   // 3. CLAVE: Llevamos la pantalla artificialmente a la coordenada 0,0
//   // Si hiciste scroll para tocar el botón, esto evita que el PDF salga cortado
//   window.scrollTo(0, 0);

//   // Forzamos el reflow
//   void elemento.offsetHeight;

//   var opt = {
//     margin: 0,
//     filename: nombre,
//     image: { type: "jpeg", quality: 0.98 },
//     html2canvas: {
//       scale: 2,
//       useCORS: true,
//       // 4. CLAVE: Anclamos el inicio del canvas a la esquina superior izquierda
//       x: 0,
//       y: 0,
//       scrollX: 0,
//       scrollY: 0,
//       // Hemos eliminado windowWidth y windowHeight para evitar que la
//       // librería intente simular redimensiones de pantalla.
//     },
//     jsPDF: { unit: "mm", format: "a4", orientation: "portrait" },
//   };

//   html2pdf()
//     .set(opt)
//     .from(elemento)
//     .save()
//     .then(function () {
//       // Restauramos todo a la normalidad
//       bodyEl.style.padding = savedBodyPadding;
//       bodyEl.style.margin = savedBodyMargin;
//       wrapper.style.position = "absolute";
//       wrapper.style.left = "-9999px";
//       wrapper.style.top = "0";
//       wrapper.style.zIndex = "";
//       wrapper.style.opacity = "";
//       wrapper.style.pointerEvents = "";
//     });

//   resetSeccion("items");
// }

// function generarPDF() {
//   var nro = obtenerSiguienteNro();
//   var sugerencia = "Cotizacion_" + nro + ".pdf";
//   var nombre = window.prompt("Nombre del archivo:", sugerencia);
//   if (nombre === null) nombre = sugerencia;

//   poblarPlantilla();
//   guardarDatos();
//   document.getElementById("render-nro").textContent = nro;

//   var wrapper = document.getElementById("pdf-wrapper");
//   var elemento = document.getElementById("plantilla-a4");

//   // 1. CLAVE: Usamos 'absolute' en lugar de 'fixed'
//   // Esto lo ancla al inicio del documento, no a la pantalla del monitor.
//   wrapper.style.position = "absolute";
//   wrapper.style.left = "0px";
//   wrapper.style.top = "0px";
//   wrapper.style.zIndex = "9999";
//   wrapper.style.opacity = "1";

//   // 2. Nos aseguramos de estar en la parte superior del documento
//   // para evitar desfases por scroll al momento del clic.
//   window.scrollTo(0, 0);

//   // Forzamos al navegador a recalcular el DOM
//   void elemento.offsetHeight;

//   var opt = {
//     margin: 0,
//     filename: nombre,
//     image: { type: "jpeg", quality: 0.98 },
//     html2canvas: {
//       scale: 2,
//       useCORS: true,
//       // Congelamos la captura estrictamente al ancho de tu plantilla A4
//       windowWidth: elemento.scrollWidth,
//       scrollX: 0,
//       scrollY: 0,
//       // Nota: Eliminamos explicitamente x:0 e y:0 aquí para que
//       // la librería use el bounding box natural del elemento absolute.
//     },
//     jsPDF: { unit: "mm", format: "a4", orientation: "portrait" },
//   };

//   html2pdf()
//     .set(opt)
//     .from(elemento)
//     .save()
//     .then(function () {
//       // Restauramos el wrapper a su estado oculto
//       wrapper.style.position = "absolute";
//       wrapper.style.left = "-9999px";
//       wrapper.style.top = "0";
//       wrapper.style.zIndex = "";
//       wrapper.style.opacity = "";
//     });

//   resetSeccion("items");
// }

function generarPDF() {
  var nro = obtenerSiguienteNro();
  var sugerencia = "Cotizacion_" + nro + ".pdf";
  var nombre = window.prompt("Nombre del archivo:", sugerencia);
  if (nombre === null) nombre = sugerencia;

  // 1. Poblamos los datos en tu plantilla original (que sigue oculta)
  poblarPlantilla();
  guardarDatos();
  document.getElementById("render-nro").textContent = nro;

  var elementoOriginal = document.getElementById("plantilla-a4");

  // 2. EL TRUCO DEFINITIVO: Crear un Clon Inmaculado
  // Clonamos todo el HTML de la plantilla con sus datos ya cargados
  var clon = elementoOriginal.cloneNode(true);
  clon.id = "plantilla-clon"; // Cambiamos el ID para evitar conflictos en el DOM

  // Creamos un contenedor temporal estrictamente limpio
  var contenedorTemporal = document.createElement("div");
  contenedorTemporal.style.position = "absolute";
  contenedorTemporal.style.top = "0px";
  contenedorTemporal.style.left = "0px";
  contenedorTemporal.style.width = "210mm";
  contenedorTemporal.style.background = "white";
  contenedorTemporal.style.zIndex = "9999";
  contenedorTemporal.style.margin = "0";
  contenedorTemporal.style.padding = "0";

  // Insertamos el clon en este contenedor, y luego lo metemos al <body>
  contenedorTemporal.appendChild(clon);
  document.body.appendChild(contenedorTemporal);

  // Llevamos la vista a la cima por seguridad
  window.scrollTo(0, 0);

  // 3. Configuramos la exportación, pero ahora APUNTANDO AL CLON
  var opt = {
    margin: 0,
    filename: nombre,
    image: { type: "jpeg", quality: 0.98 },
    html2canvas: {
      scale: 2,
      useCORS: true,
      scrollX: 0,
      scrollY: 0,
      // Ya no necesitamos x:0 o windowWidth porque el clon
      // nace perfecto en la esquina 0,0 sin historial CSS.
    },
    jsPDF: { unit: "mm", format: "a4", orientation: "portrait" },
  };

  // 4. Exportamos y luego "limpiamos la escena del crimen"
  html2pdf()
    .set(opt)
    .from(clon)
    .save()
    .then(function () {
      // Una vez generado el PDF, eliminamos el contenedor temporal del DOM
      document.body.removeChild(contenedorTemporal);
    });

  resetSeccion("items");
}

function init() {
  document.getElementById("input-fecha").value = new Date()
    .toISOString()
    .split("T")[0];

  cargarDatos();
  cambiarMoneda(obtenerMoneda());

  agregarItem(1, "", "");

  document
    .getElementById("btn-agregar-item")
    .addEventListener("click", function () {
      agregarItem(1, "", "");
    });

  document.getElementById("btn-generar").addEventListener("click", generarPDF);

  document.querySelectorAll("[data-persist]").forEach(function (el) {
    el.addEventListener("input", guardarDatos);
  });

  document.querySelectorAll(".currency-option").forEach(function (btn) {
    btn.addEventListener("click", function () {
      cambiarMoneda(btn.getAttribute("data-currency"));
    });
  });

  document.querySelectorAll("[data-reset]").forEach(function (btn) {
    btn.addEventListener("click", function () {
      resetSeccion(btn.getAttribute("data-reset"));
    });
  });

  document.getElementById("input-logo").addEventListener("change", function () {
    var file = this.files[0];
    if (file) {
      var reader = new FileReader();
      reader.onload = function (e) {
        var dataUrl = e.target.result;
        localStorage.setItem(STORE_PREFIX + "logo", dataUrl);
        showLogoPreview(dataUrl);
      };
      reader.readAsDataURL(file);
    }
  });
}

document.addEventListener("DOMContentLoaded", init);
