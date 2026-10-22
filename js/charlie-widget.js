// BURBUJA DE CHAT DE CHARLIE
// Se pega en cualquier web con una sola línea:
//   <script src="https://TU-SERVIDOR/widget.js"></script>
//
// Opciones (atributos del <script>, todos opcionales):
//   data-servidor="https://charlie-bot.TU-USUARIO.workers.dev"  -> si el widget.js está alojado en otro lado
//   data-abajo="96"     -> distancia al borde de abajo, en px (default 20)
//   data-derecha="24"   -> distancia al borde derecho, en px (default 20)
//
// La burbuja aparece al instante y después toma nombre, colores y avatar
// del servidor (config/bot.json).

(function () {
  if (window.__charlieCargado) return;
  window.__charlieCargado = true;

  var script = document.currentScript;
  var SERVIDOR = (script.getAttribute("data-servidor") || new URL(script.src).origin).replace(/\/$/, "");
  var ABAJO = parseInt(script.getAttribute("data-abajo") || "20", 10);
  var DERECHA = parseInt(script.getAttribute("data-derecha") || "20", 10);

  // Dibujo propio del robot: se ve igual en Windows, Mac, Android e iPhone
  // (los emojis cambian según el sistema). Si en config/bot.json ponés
  // "avatarImagen": "https://.../logo.png", se usa esa imagen.
  var ICONO_ROBOT =
    '<svg viewBox="0 0 64 64" width="70%" height="70%" aria-hidden="true">' +
      '<line x1="32" y1="6" x2="32" y2="14" stroke="#cfd8e3" stroke-width="3" stroke-linecap="round"/>' +
      '<circle cx="32" cy="6" r="4" fill="#ff5a5f"/>' +
      '<rect x="6" y="26" width="6" height="14" rx="3" fill="#9aa8b8"/>' +
      '<rect x="52" y="26" width="6" height="14" rx="3" fill="#9aa8b8"/>' +
      '<rect x="10" y="14" width="44" height="38" rx="12" fill="#eef2f7"/>' +
      '<rect x="16" y="21" width="32" height="20" rx="8" fill="#1d2735"/>' +
      '<circle cx="25" cy="31" r="4.2" fill="#5ee1ff"/>' +
      '<circle cx="39" cy="31" r="4.2" fill="#5ee1ff"/>' +
      '<rect x="24" y="44" width="16" height="3.5" rx="1.75" fill="#9aa8b8"/>' +
    "</svg>";

  // Valores por defecto mientras llega la configuración del servidor
  var bot = {
    nombre: "Charlie",
    avatar: "🤖",
    colorPrincipal: "#1e6fd9",
    colorFondo: "#1f1f1f",
    placeholder: "Escribí acá...",
  };

  // En qué paso va la charla. Se guarda en el navegador del visitante (no en el
  // servidor), ocupa menos de 1 KB y se descarta solo después de 24 horas.
  var CLAVE = "charlie_estado";
  var VENCE_MS = 24 * 60 * 60 * 1000;
  var estadoEnMemoria = null; // por si el navegador no deja guardar

  function leerEstado() {
    try {
      var guardado = JSON.parse(localStorage.getItem(CLAVE) || "null");
      if (guardado && Date.now() - guardado.t < VENCE_MS) return guardado.estado;
      localStorage.removeItem(CLAVE);
      return null;
    } catch (e) {
      return estadoEnMemoria;
    }
  }

  function guardarEstado(estado) {
    estadoEnMemoria = estado;
    try { localStorage.setItem(CLAVE, JSON.stringify({ t: Date.now(), estado: estado })); } catch (e) {}
  }

  var css = `
    #charlie-burbuja{position:fixed;right:${DERECHA}px;bottom:${ABAJO}px;width:60px;height:60px;border-radius:50%;
      background:var(--charlie-color);color:#fff;border:none;cursor:pointer;font-size:28px;line-height:1;display:flex;align-items:center;justify-content:center;
      box-shadow:0 4px 14px rgba(0,0,0,.35);z-index:99999;transition:transform .2s;padding:0}
    #charlie-burbuja:hover{transform:scale(1.08)}
    #charlie-ventana{position:fixed;right:${DERECHA}px;bottom:${ABAJO + 72}px;width:360px;max-width:calc(100vw - 32px);
      height:520px;max-height:calc(100vh - ${ABAJO + 100}px);background:var(--charlie-fondo);border-radius:14px;
      box-shadow:0 8px 30px rgba(0,0,0,.45);display:none;flex-direction:column;overflow:hidden;z-index:99999;
      font-family:system-ui,-apple-system,Segoe UI,Roboto,sans-serif;text-align:left;box-sizing:border-box;line-height:1.45}
    #charlie-ventana *{box-sizing:border-box}
    #charlie-ventana.abierta{display:flex}
    #charlie-cabecera{display:flex;align-items:center;gap:10px;padding:12px 14px;background:#2a2a2a;color:#fff}
    #charlie-cabecera .avatar{width:38px;height:38px;border-radius:50%;background:var(--charlie-color);
      display:flex;align-items:center;justify-content:center;font-size:20px}
    #charlie-cabecera .nombre{font-weight:600;font-size:15px}
    #charlie-cabecera .estado{font-size:12px;color:#7ddc7d}
    #charlie-cabecera .cerrar{margin-left:auto;background:none;border:none;color:#aaa;font-size:24px;cursor:pointer;line-height:1}
    #charlie-mensajes{flex:1;overflow-y:auto;padding:14px;display:flex;flex-direction:column;gap:8px}
    .charlie-msg{max-width:82%;padding:9px 12px;border-radius:12px;font-size:14px;white-space:pre-line;word-wrap:break-word;margin:0}
    .charlie-msg.bot{background:#2e2e2e;color:#eee;align-self:flex-start;border-bottom-left-radius:4px}
    .charlie-msg.yo{background:var(--charlie-color);color:#fff;align-self:flex-end;border-bottom-right-radius:4px}
    .charlie-opciones{display:flex;flex-wrap:wrap;gap:6px;align-self:flex-start}
    .charlie-opciones button{background:transparent;color:#fff;border:1px solid var(--charlie-color);
      border-radius:18px;padding:7px 13px;font-size:13px;cursor:pointer;font-family:inherit}
    .charlie-opciones button:hover{background:var(--charlie-color)}
    .charlie-opciones button.charlie-enlace{background:#25D366;border-color:#25D366;color:#fff;font-weight:600}
    .charlie-opciones button.charlie-enlace:hover{background:#1fb457;border-color:#1fb457}
    .charlie-escribiendo{color:#999;font-size:13px;align-self:flex-start}
    #charlie-form{display:flex;border-top:1px solid #333;margin:0}
    #charlie-input{flex:1;background:transparent;border:none;color:#fff;padding:14px;font-size:14px;outline:none;font-family:inherit}
    #charlie-enviar{background:none;border:none;color:var(--charlie-color);font-size:20px;padding:0 16px;cursor:pointer}
  `;
  var estilo = document.createElement("style");
  estilo.textContent = css;
  document.head.appendChild(estilo);

  // ---- Interfaz ----
  var burbuja = document.createElement("button");
  burbuja.id = "charlie-burbuja";

  var ventana = document.createElement("div");
  ventana.id = "charlie-ventana";
  ventana.innerHTML =
    '<div id="charlie-cabecera">' +
      '<div class="avatar"></div>' +
      '<div><div class="nombre"></div><div class="estado">En línea</div></div>' +
      '<button class="cerrar" aria-label="Cerrar chat">×</button>' +
    "</div>" +
    '<div id="charlie-mensajes"></div>' +
    '<form id="charlie-form">' +
      '<input id="charlie-input" autocomplete="off">' +
      '<button id="charlie-enviar" type="submit" aria-label="Enviar">➤</button>' +
    "</form>";

  document.body.appendChild(ventana);
  document.body.appendChild(burbuja);

  var zonaMensajes = ventana.querySelector("#charlie-mensajes");
  var input = ventana.querySelector("#charlie-input");

  function aplicarConfig() {
    [burbuja, ventana].forEach(function (el) {
      el.style.setProperty("--charlie-color", bot.colorPrincipal);
      el.style.setProperty("--charlie-fondo", bot.colorFondo);
    });
    var icono = bot.avatarImagen
      ? '<img src="' + encodeURI(bot.avatarImagen) + '" alt="" style="width:100%;height:100%;object-fit:cover;border-radius:50%">'
      : ICONO_ROBOT;
    burbuja.innerHTML = icono;
    burbuja.setAttribute("aria-label", "Abrir chat con " + bot.nombre);
    ventana.querySelector(".avatar").innerHTML = icono;
    ventana.querySelector(".nombre").textContent = bot.nombre;
    input.placeholder = bot.placeholder;
  }
  aplicarConfig();

  // Pide la configuración real (y de paso despierta al servidor si estaba dormido)
  fetch(SERVIDOR + "/api/config")
    .then(function (r) { return r.json(); })
    .then(function (cfg) { for (var k in cfg) bot[k] = cfg[k]; aplicarConfig(); })
    .catch(function () {});

  // ---- Mensajes ----
  function bajar() { zonaMensajes.scrollTop = zonaMensajes.scrollHeight; }

  function agregarMensaje(texto, quien) {
    var div = document.createElement("div");
    div.className = "charlie-msg " + quien;
    div.textContent = texto;
    zonaMensajes.appendChild(div);
    bajar();
  }

  function quitarOpciones() {
    zonaMensajes.querySelectorAll(".charlie-opciones").forEach(function (o) { o.remove(); });
  }

  function mostrarOpciones(opciones) {
    quitarOpciones();
    if (!opciones || !opciones.length) return;
    var cont = document.createElement("div");
    cont.className = "charlie-opciones";
    opciones.forEach(function (op) {
      var b = document.createElement("button");
      b.type = "button";
      b.textContent = op.texto;
      if (op.url) {
        // Botón que abre algo externo (ej: WhatsApp con el mensaje ya escrito)
        b.className = "charlie-enlace";
        b.onclick = function () { window.open(op.url, "_blank", "noopener"); };
      } else {
        b.onclick = function () { enviar(op.texto, op.id); };
      }
      cont.appendChild(b);
    });
    zonaMensajes.appendChild(cont);
    bajar();
  }

  function enviar(textoVisible, valorReal) {
    if (textoVisible) agregarMensaje(textoVisible, "yo");
    quitarOpciones();

    var escribiendo = document.createElement("div");
    escribiendo.className = "charlie-escribiendo";
    escribiendo.textContent = bot.nombre + " está escribiendo...";
    zonaMensajes.appendChild(escribiendo);
    bajar();

    // Si la conexión está lenta, avisamos
    var avisoLento = setTimeout(function () {
      escribiendo.textContent = "⏳ Un segundito...";
    }, 4000);

    var control = new AbortController();
    var corte = setTimeout(function () { control.abort(); }, 30000);

    fetch(SERVIDOR + "/api/mensaje", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ estado: leerEstado(), texto: valorReal || textoVisible || "hola" }),
      signal: control.signal,
    })
      .then(function (r) { if (!r.ok) throw new Error(r.status); return r.json(); })
      .then(function (resp) {
        clearTimeout(avisoLento); clearTimeout(corte);
        guardarEstado(resp.estado);
        escribiendo.remove();
        var i = 0;
        (function siguiente() {
          if (i < resp.mensajes.length) {
            agregarMensaje(resp.mensajes[i++], "bot");
            setTimeout(siguiente, 450);
          } else {
            mostrarOpciones(resp.opciones);
          }
        })();
      })
      .catch(function () {
        clearTimeout(avisoLento); clearTimeout(corte);
        escribiendo.remove();
        agregarMensaje("Uy, no me pude conectar 😕. Probá de nuevo en un ratito.", "bot");
        mostrarOpciones([{ id: "menu", texto: "Reintentar" }]);
      });
  }

  // ---- Eventos ----
  var yaSaludo = false;
  burbuja.onclick = function () {
    ventana.classList.toggle("abierta");
    if (ventana.classList.contains("abierta")) {
      input.focus();
      if (!yaSaludo) { yaSaludo = true; enviar(null, "menu"); }
    }
  };
  ventana.querySelector(".cerrar").onclick = function () { ventana.classList.remove("abierta"); };
  ventana.querySelector("#charlie-form").onsubmit = function (e) {
    e.preventDefault();
    var texto = input.value.trim();
    if (!texto) return;
    input.value = "";
    enviar(texto);
  };
})();
