var STORE_PREFIX = "cotizacion-";
var LOGO_DEFAULT = "img/icon-color.svg";
var ALLOWED_EMAILS = ["correo@email.com", "mi-correo@correo.com"];
var pendingReset = null;
var pendingDeleteIndex = null;
var pendingPreviewIndex = null;

function obtenerMoneda() {
  return localStorage.getItem(STORE_PREFIX + "moneda") || "ARS";
}

function formatearMoneda(n, moneda) {
  moneda = moneda || obtenerMoneda();
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
  div.className = "card mb-2 item-row border";

  div.innerHTML =
    '<div class="card-body py-2">' +
    '<div class="row g-2 mb-2">' +
    '<div class="col-4">' +
    '<label class="form-label small text-muted mb-0">Cant.</label>' +
    '<input type="number" class="form-control form-control-sm item-cant" value="' +
    (cant ?? 1) +
    '" min="1" step="1">' +
    "</div>" +
    '<div class="col-8">' +
    '<label class="form-label small text-muted mb-0">P. Unitario</label>' +
    '<input type="number" class="form-control form-control-sm item-precio" value="' +
    (precio ?? "") +
    '" step="0.01" placeholder="0,00">' +
    "</div>" +
    "</div>" +
    '<div class="row g-2">' +
    '<div class="col-10">' +
    '<label class="form-label small text-muted mb-0">Descripción</label>' +
    '<textarea class="form-control form-control-sm item-desc" placeholder="Descripción" rows="2">' +
    (desc ?? "") +
    "</textarea>" +
    "</div>" +
    '<div class="col-2 d-flex align-items-end pb-1">' +
    '<button class="btn btn-outline-danger btn-sm btn-remove-item" title="Eliminar">✕</button>' +
    "</div>" +
    "</div>" +
    '<div class="preview-monto text-end text-muted small mt-1"></div>' +
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

function generarPDF() {
  desencriptarUsuario().then(function(usuario) {
    if (!usuario || !emailAutorizado(usuario.email)) {
      var modal = new bootstrap.Modal(document.getElementById("modalEmailDenied"));
      modal.show();
      return;
    }

    var nro = obtenerSiguienteNro();
    var sugerencia = "Cotizacion_" + nro + ".pdf";
    var nombreArchivo = window.prompt("Nombre del archivo:", sugerencia);
    if (nombreArchivo === null) nombreArchivo = sugerencia;

    var data = capturarDatosCotizacion(nro);

    poblarPlantilla();
    guardarDatos();
    document.getElementById("render-nro").textContent = nro;

    var elementoOriginal = document.getElementById("plantilla-a4");

    var clon = elementoOriginal.cloneNode(true);
    clon.id = "plantilla-clon";

    var contenedorTemporal = document.createElement("div");
    contenedorTemporal.style.position = "absolute";
    contenedorTemporal.style.top = "0px";
    contenedorTemporal.style.left = "0px";
    contenedorTemporal.style.width = "210mm";
    contenedorTemporal.style.background = "white";
    contenedorTemporal.style.zIndex = "9999";
    contenedorTemporal.style.margin = "0";
    contenedorTemporal.style.padding = "0";

    contenedorTemporal.appendChild(clon);
    document.body.appendChild(contenedorTemporal);

    window.scrollTo(0, 0);

    var opt = {
      margin: 0,
      filename: nombreArchivo,
      image: { type: "jpeg", quality: 0.98 },
      html2canvas: {
        scale: 2,
        useCORS: true,
        scrollX: 0,
        scrollY: 0,
      },
      jsPDF: { unit: "mm", format: "a4", orientation: "portrait" },
    };

    html2pdf()
      .set(opt)
      .from(clon)
      .save()
      .then(function () {
        document.body.removeChild(contenedorTemporal);
        guardarHistorial(data);
        document.getElementById("modal-pdf-nro").textContent = nro;

        var offcanvasEl = document.getElementById("offcanvasForm");
        var offcanvas = bootstrap.Offcanvas.getInstance(offcanvasEl);
        if (offcanvas) offcanvas.hide();

        var modal = new bootstrap.Modal(document.getElementById("modalPDF"));
        modal.show();
      });

    resetSeccion("items");
  });
}

function escapeHtml(str) {
  var d = document.createElement("div");
  d.appendChild(document.createTextNode(str));
  return d.innerHTML;
}

function capturarDatosCotizacion(nro) {
  var items = obtenerItems();
  var subtotal = 0;
  items.forEach(function (i) { subtotal += i.total; });
  var iva = subtotal * 0.21;
  var total = subtotal + iva;

  return {
    nro: nro,
    fecha: document.getElementById("input-fecha").value,
    validez: document.getElementById("input-validez").value,
    moneda: obtenerMoneda(),
    emisor: {
      empresa: document.getElementById("input-empresa").value,
      cuit: document.getElementById("input-cuit").value,
      email: document.getElementById("input-email").value,
      logo: localStorage.getItem(STORE_PREFIX + "logo") || LOGO_DEFAULT
    },
    cliente: {
      nombre: document.getElementById("input-cliente").value,
      direccion: document.getElementById("input-direccion").value
    },
    items: items,
    subtotal: subtotal,
    iva: iva,
    total: total
  };
}

function mostrarAlmacenamientoLleno() {
  var modal = new bootstrap.Modal(document.getElementById("modalStorageFull"));
  modal.show();
}

function eliminarDelHistorial(index) {
  var historial = obtenerHistorial();
  if (index >= 0 && index < historial.length) {
    historial.splice(index, 1);
    localStorage.setItem(STORE_PREFIX + "historial", JSON.stringify(historial));
    renderHistorial();
  }
}

function guardarHistorial(data) {
  try {
    var historial = JSON.parse(localStorage.getItem(STORE_PREFIX + "historial") || "[]");
    historial.unshift(data);
    localStorage.setItem(STORE_PREFIX + "historial", JSON.stringify(historial));
  } catch (e) {
    if (e.name === "QuotaExceededError" || e.name === "NS_ERROR_DOM_QUOTA_REACHED") {
      mostrarAlmacenamientoLleno();
    }
  }
}

function obtenerHistorial() {
  return JSON.parse(localStorage.getItem(STORE_PREFIX + "historial") || "[]");
}

function renderHistorial() {
  var body = document.querySelector("#offcanvasHistorial .offcanvas-body");
  var historial = obtenerHistorial();

  if (historial.length === 0) {
    body.innerHTML =
      '<div class="text-center py-5">' +
      '<i class="bi bi-inbox text-muted" style="font-size: 3rem;"></i>' +
      '<p class="text-muted mt-3 mb-0">No hay cotizaciones guardadas a\u00fan.</p>' +
      "</div>";
    return;
  }

  var html = '<div class="list-group">';
  historial.forEach(function (item, index) {
    var fecha = item.fecha;
    if (fecha) {
      var partes = fecha.split("-");
      if (partes.length === 3) fecha = partes[2] + "/" + partes[1] + "/" + partes[0];
    }
    html +=
      '<div class="list-group-item historial-item">' +
      '<div class="d-flex justify-content-between align-items-start">' +
      "<div>" +
      "<h6 class=\"mb-0\">N\u00ba " + item.nro + "</h6>" +
      '<small class="text-muted">' + escapeHtml(item.cliente.nombre || "\u2014") + "</small>" +
      "</div>" +
      '<div class="text-end">' +
      '<div class="fw-bold">' + formatearMoneda(item.total, item.moneda) + "</div>" +
      '<small class="text-muted">' + fecha + "</small>" +
      "</div>" +
      "</div>" +
      '<div class="d-flex gap-2 mt-2">' +
      '<button class="btn btn-sm btn-outline-primary btn-ver-historial" data-index="' + index + '">Ver</button>' +
      '<button class="btn btn-sm btn-outline-danger btn-eliminar-historial" data-index="' + index + '" title="Eliminar"><i class="bi bi-trash"></i></button>' +
      "</div>" +
      "</div>";
  });
  html += "</div>";
  body.innerHTML = html;
}

function renderPreview(index) {
  var historial = obtenerHistorial();
  var data = historial[index];
  if (!data) return;
  pendingPreviewIndex = index;

  document.getElementById("preview-nro").textContent = data.nro;

  var template = document.getElementById("plantilla-a4");
  var clone = template.cloneNode(true);
  clone.id = "preview-clon";

  clone.querySelector("#render-logo").src = data.emisor.logo || LOGO_DEFAULT;
  clone.querySelector("#render-logo").style.display = "inline";

  clone.querySelector("#render-empresa").textContent = data.emisor.empresa || "Empresa Emisora";
  clone.querySelector("#render-cuit").textContent = "CUIT: " + (data.emisor.cuit || "00-00000000-0");
  clone.querySelector("#render-email").textContent = data.emisor.email || "info@empresa.com.ar";

  clone.querySelector("#render-cliente").textContent = data.cliente.nombre || "\u2014";
  clone.querySelector("#render-direccion").textContent = data.cliente.direccion || "\u2014";
  clone.querySelector("#render-nro").textContent = data.nro;

  var fecha = data.fecha;
  if (fecha) {
    var partes = fecha.split("-");
    if (partes.length === 3) fecha = partes[2] + "/" + partes[1] + "/" + partes[0];
  }
  clone.querySelector("#render-fecha").textContent = fecha || "--/--/----";
  clone.querySelector("#render-validez").textContent = data.validez || "\u2014";

  var tbody = clone.querySelector("#render-items-body");
  tbody.innerHTML = "";
  data.items.forEach(function (item) {
    var tr = document.createElement("tr");
    tr.innerHTML =
      "<td>" + item.cant + "</td>" +
      "<td>" + escapeHtml(item.desc) + "</td>" +
      '<td class="money">' + formatearMoneda(item.precio, data.moneda) + "</td>" +
      '<td class="money">' + formatearMoneda(item.total, data.moneda) + "</td>";
    tbody.appendChild(tr);
  });

  clone.querySelector("#render-subtotal").textContent = formatearMoneda(data.subtotal, data.moneda);
  clone.querySelector("#render-iva").textContent = formatearMoneda(data.iva, data.moneda);
  clone.querySelector("#render-total").textContent = formatearMoneda(data.total, data.moneda);

  var container = document.getElementById("preview-container");
  container.innerHTML = "";
  container.appendChild(clone);

  var modal = new bootstrap.Modal(document.getElementById("modalPreview"));
  modal.show();
}

function reenviarCotizacion(index) {
  var historial = obtenerHistorial();
  var data = historial[index];
  if (!data) return;

  document.getElementById("input-empresa").value = data.emisor.empresa || "";
  document.getElementById("input-cuit").value = data.emisor.cuit || "";
  document.getElementById("input-email").value = data.emisor.email || "";

  document.getElementById("input-cliente").value = data.cliente.nombre || "";
  document.getElementById("input-direccion").value = data.cliente.direccion || "";
  document.getElementById("input-validez").value = data.validez || "";

  var logo = data.emisor.logo;
  if (logo && logo !== LOGO_DEFAULT) {
    localStorage.setItem(STORE_PREFIX + "logo", logo);
    showLogoPreview(logo);
  }

  cambiarMoneda(data.moneda);

  var container = document.getElementById("items-container");
  container.innerHTML = "";
  data.items.forEach(function (item) {
    agregarItem(item.cant, item.desc, item.precio);
  });

  bootstrap.Modal.getInstance(document.getElementById("modalPreview")).hide();
  pendingPreviewIndex = null;
  abrirOffcanvas("offcanvasForm");
}

function abrirOffcanvas(id) {
  if (typeof bootstrap === "undefined") {
    alert("Error: Bootstrap no se pudo cargar. Verifica tu conexión a internet y recarga la página.");
    return;
  }
  var el = document.getElementById(id);
  if (!el) return;
  var inst = bootstrap.Offcanvas.getInstance(el);
  if (!inst) inst = new bootstrap.Offcanvas(el);
  inst.show();
}

function base64ToBuf(b64) {
  var bin = atob(b64), buf = new Uint8Array(bin.length);
  for (var i = 0; i < bin.length; i++) buf[i] = bin.charCodeAt(i);
  return buf.buffer;
}

function bufToBase64(buf) {
  var bytes = new Uint8Array(buf), bin = "";
  for (var i = 0; i < bytes.length; i++) bin += String.fromCharCode(bytes[i]);
  return btoa(bin);
}

function obtenerClaveCrypto() {
  var enc = new TextEncoder();
  return crypto.subtle.importKey("raw", enc.encode("cotizatronix-seed-2024"), { name: "PBKDF2" }, false, ["deriveKey"]).then(function(baseKey) {
    return crypto.subtle.deriveKey({ name: "PBKDF2", salt: enc.encode("cotizatronix-salt"), iterations: 100000, hash: "SHA-256" }, baseKey, { name: "AES-GCM", length: 256 }, false, ["encrypt", "decrypt"]);
  });
}

function encriptarUsuario(nombre, email) {
  var data = JSON.stringify({ nombre: nombre, email: email });
  var enc = new TextEncoder();
  var iv = crypto.getRandomValues(new Uint8Array(12));
  return obtenerClaveCrypto().then(function(key) {
    return crypto.subtle.encrypt({ name: "AES-GCM", iv: iv }, key, enc.encode(data));
  }).then(function(ct) {
    localStorage.setItem(STORE_PREFIX + "email", JSON.stringify({ iv: bufToBase64(iv), data: bufToBase64(ct) }));
  });
}

function desencriptarUsuario() {
  var stored = localStorage.getItem(STORE_PREFIX + "email");
  if (!stored) return Promise.resolve(null);
  try {
    var obj = JSON.parse(stored);
    return obtenerClaveCrypto().then(function(key) {
      return crypto.subtle.decrypt({ name: "AES-GCM", iv: base64ToBuf(obj.iv) }, key, base64ToBuf(obj.data));
    }).then(function(dec) {
      return JSON.parse(new TextDecoder().decode(dec));
    }).catch(function() { return null; });
  } catch (e) { return Promise.resolve(null); }
}

function emailAutorizado(email) {
  return ALLOWED_EMAILS.indexOf(email) !== -1;
}

function actualizarNavbar(nombre, email) {
  var el = document.getElementById("navbar-email");
  el.textContent = nombre + " <" + email + ">";
  el.style.display = "inline";
  document.getElementById("btn-logout").style.display = "inline-block";
}

function cerrarSesion() {
  localStorage.removeItem(STORE_PREFIX + "email");
  document.getElementById("navbar-email").style.display = "none";
  document.getElementById("btn-logout").style.display = "none";
  var modal = new bootstrap.Modal(document.getElementById("modalLogin"));
  modal.show();
}

function init() {
  if (typeof bootstrap === "undefined") {
    document.getElementById("view-home").innerHTML =
      '<div class="alert alert-danger mx-3" role="alert">' +
      "<strong>Error de conexión:</strong> No se pudo cargar Bootstrap. " +
      "Verifica tu conexión a internet y recarga la página.</div>";
    return;
  }

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

  document.querySelectorAll("[data-bs-target]").forEach(function (btn) {
    btn.addEventListener("click", function (e) {
      var target = btn.getAttribute("data-bs-target");
      if (target && target.startsWith("#offcanvas")) {
        e.preventDefault();
        abrirOffcanvas(target.replace("#", ""));
      }
    });
  });

  document.getElementById("offcanvasHistorial").addEventListener("show.bs.offcanvas", renderHistorial);

  document.getElementById("offcanvasHistorial").addEventListener("click", function (e) {
    var btn = e.target.closest(".btn-ver-historial");
    if (btn) {
      var index = parseInt(btn.getAttribute("data-index"), 10);
      renderPreview(index);
      return;
    }
    var delBtn = e.target.closest(".btn-eliminar-historial");
    if (delBtn) {
      var historial = obtenerHistorial();
      pendingDeleteIndex = parseInt(delBtn.getAttribute("data-index"), 10);
      document.getElementById("modal-eliminar-nro").textContent = "N\u00ba " + (historial[pendingDeleteIndex] ? historial[pendingDeleteIndex].nro : "—");
      var modal = new bootstrap.Modal(document.getElementById("modalEliminarHistorial"));
      modal.show();
    }
  });

  document.querySelectorAll("[data-reset]").forEach(function (btn) {
    btn.addEventListener("click", function (e) {
      e.preventDefault();
      pendingReset = btn.getAttribute("data-reset");
      var labels = {
        emisor: "Emisor",
        cliente: "Cliente",
        metadatos: "Metadatos",
        items: "Items",
      };
      document.getElementById("modal-reset-seccion").textContent =
        labels[pendingReset] || pendingReset;
      var modal = new bootstrap.Modal(document.getElementById("modalReset"));
      modal.show();
    });
  });

  document.getElementById("btn-confirmar-reset").addEventListener("click", function () {
    if (pendingReset) {
      resetSeccion(pendingReset);
      pendingReset = null;
    }
    bootstrap.Modal.getInstance(document.getElementById("modalReset")).hide();
  });

  document.getElementById("modalReset").addEventListener("hidden.bs.modal", function () {
    pendingReset = null;
  });

  document.getElementById("modalPDF").addEventListener("hidden.bs.modal", function () {
    var offcanvasEl = document.getElementById("offcanvasForm");
    var offcanvas = bootstrap.Offcanvas.getInstance(offcanvasEl);
    if (offcanvas) {
      offcanvas.hide();
    }
  });

  document.getElementById("btn-ir-historial").addEventListener("click", function () {
    bootstrap.Modal.getInstance(document.getElementById("modalStorageFull")).hide();
    abrirOffcanvas("offcanvasHistorial");
  });

  document.getElementById("btn-confirmar-eliminar").addEventListener("click", function () {
    if (pendingDeleteIndex !== null) {
      eliminarDelHistorial(pendingDeleteIndex);
      pendingDeleteIndex = null;
    }
    bootstrap.Modal.getInstance(document.getElementById("modalEliminarHistorial")).hide();
    var previewModal = bootstrap.Modal.getInstance(document.getElementById("modalPreview"));
    if (previewModal) previewModal.hide();
  });

  document.getElementById("modalEliminarHistorial").addEventListener("hidden.bs.modal", function () {
    pendingDeleteIndex = null;
  });

  document.getElementById("btn-preview-eliminar").addEventListener("click", function () {
    if (pendingPreviewIndex !== null) {
      pendingDeleteIndex = pendingPreviewIndex;
      var historial = obtenerHistorial();
      document.getElementById("modal-eliminar-nro").textContent = "N\u00ba " + (historial[pendingDeleteIndex] ? historial[pendingDeleteIndex].nro : "—");
      var modal = new bootstrap.Modal(document.getElementById("modalEliminarHistorial"));
      modal.show();
    }
  });

  document.getElementById("btn-preview-reenviar").addEventListener("click", function () {
    if (pendingPreviewIndex !== null) {
      reenviarCotizacion(pendingPreviewIndex);
    }
  });

  document.getElementById("modalPreview").addEventListener("hidden.bs.modal", function () {
    pendingPreviewIndex = null;
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

  document.getElementById("btn-login").addEventListener("click", function () {
    var nombre = document.getElementById("input-login-nombre").value.trim();
    var email = document.getElementById("input-login-email").value.trim();
    var feedback = document.getElementById("login-feedback");
    var inputEmail = document.getElementById("input-login-email");

    if (!nombre) {
      document.getElementById("input-login-nombre").focus();
      return;
    }

    if (!emailAutorizado(email)) {
      inputEmail.classList.add("is-invalid");
      feedback.textContent = "Email no autorizado.";
      return;
    }

    inputEmail.classList.remove("is-invalid");
    encriptarUsuario(nombre, email).then(function () {
      actualizarNavbar(nombre, email);
      bootstrap.Modal.getInstance(document.getElementById("modalLogin")).hide();
    });
  });

  document.getElementById("btn-logout").addEventListener("click", cerrarSesion);

  document.getElementById("modalLogin").addEventListener("shown.bs.modal", function () {
    document.getElementById("input-login-nombre").focus();
  });

  document.getElementById("input-login-nombre").addEventListener("keydown", function (e) {
    if (e.key === "Enter") document.getElementById("input-login-email").focus();
  });

  document.getElementById("input-login-email").addEventListener("keydown", function (e) {
    if (e.key === "Enter") document.getElementById("btn-login").click();
  });

  document.getElementById("input-login-email").addEventListener("input", function () {
    this.classList.remove("is-invalid");
  });

  desencriptarUsuario().then(function (usuario) {
    if (usuario && usuario.email && emailAutorizado(usuario.email)) {
      actualizarNavbar(usuario.nombre, usuario.email);
    } else {
      localStorage.removeItem(STORE_PREFIX + "email");
      var modal = new bootstrap.Modal(document.getElementById("modalLogin"));
      modal.show();
    }
  });
}

document.addEventListener("DOMContentLoaded", init);
