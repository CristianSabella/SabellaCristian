"use strict";

// clase simple para describir una obra
class Obra {
  constructor(titulo, artista, tecnica) {
    this.titulo = titulo;
    this.artista = artista;
    this.tecnica = tecnica;
  }
  describir() {
    return this.titulo + " · " + this.artista + " · " + this.tecnica;
  }
}

// ---------- estado del atelier (solo en index) ----------
const estado = document.getElementById("estado-atelier");

if (estado) {
  const dia = new Date().getDay(); // 0 = domingo, 1 = lunes...

  if (dia === 0 || dia === 1) {
    estado.textContent = "Hoy estamos cerrados";
    estado.style.color = "var(--cerrado)";
  } else {
    estado.textContent = "Hoy estamos abiertos · 14 a 20 h";
    estado.style.color = "var(--acento)";
  }
}

console.log("Atelier Norte listo");

// ---------- cookie del visitante ----------
function leerCookie(nombre) {
  const partes = document.cookie.split("; ");
  for (const parte of partes) {
    const igual = parte.indexOf("=");
    const clave = parte.substring(0, igual);
    if (clave === nombre) {
      return decodeURIComponent(parte.substring(igual + 1));
    }
  }
  return "";
}

const saludo = document.getElementById("saludo-cookie");

if (saludo) {
  const guardado = leerCookie("visitante");
  if (guardado !== "") {
    saludo.textContent = "Hola de nuevo, " + guardado;
  } else {
    saludo.textContent = "Completá el formulario y te esperamos en la galería.";
  }
}

// pasa la fecha de 2025-04-10 a 10/04/2025
function formatearFecha(fecha) {
  if (fecha === "") {
    return "fecha a coordinar";
  }
  const partes = fecha.split("-");
  return partes[2] + "/" + partes[1] + "/" + partes[0];
}

// ---------- mini base de datos con localStorage ----------
// las solicitudes se guardan como texto JSON en el navegador
const CLAVE_BD = "atelier-solicitudes";

function leerRegistros() {
  const texto = localStorage.getItem(CLAVE_BD);
  if (texto === null) {
    return [];
  }
  return JSON.parse(texto);
}

function guardarRegistros(lista) {
  localStorage.setItem(CLAVE_BD, JSON.stringify(lista));
}

// agrega una solicitud nueva con su numero y la fecha en que se registro
function registrar(solicitud) {
  const lista = leerRegistros();
  let ultimo = 0;
  if (lista.length > 0) {
    ultimo = lista[lista.length - 1].id;
  }
  solicitud.id = ultimo + 1;
  solicitud.registrada = new Date().toLocaleString("es-AR");
  lista.push(solicitud);
  guardarRegistros(lista);
}

function borrarRegistro(id) {
  const lista = leerRegistros().filter(function (registro) {
    return registro.id !== id;
  });
  guardarRegistros(lista);
  mostrarRegistros();
}

// arma una celda de la tabla con un texto
function crearCelda(texto) {
  const celda = document.createElement("td");
  celda.textContent = texto;
  return celda;
}

function mostrarRegistros() {
  const tabla = document.getElementById("tabla-registros");
  const total = document.getElementById("total-registros");
  if (!tabla) {
    return;
  }

  const lista = leerRegistros();
  tabla.textContent = "";

  if (lista.length === 0) {
    total.textContent = "Todavía no hay solicitudes guardadas.";
    return;
  }
  total.textContent = "Hay " + lista.length + " solicitud(es) guardada(s).";

  lista.forEach(function (registro) {
    const fila = document.createElement("tr");
    fila.appendChild(crearCelda(registro.id));
    fila.appendChild(crearCelda(registro.nombre));
    fila.appendChild(crearCelda(registro.correo || "-"));
    fila.appendChild(crearCelda(formatearFecha(registro.fecha)));
    fila.appendChild(crearCelda(registro.personas));
    fila.appendChild(crearCelda(registro.registrada));

    const celdaBoton = document.createElement("td");
    const boton = document.createElement("button");
    boton.type = "button";
    boton.className = "boton boton-chico";
    boton.textContent = "Eliminar";
    boton.addEventListener("click", function () {
      if (window.confirm("¿Eliminar la solicitud de " + registro.nombre + "?")) {
        borrarRegistro(registro.id);
      }
    });
    celdaBoton.appendChild(boton);
    fila.appendChild(celdaBoton);

    tabla.appendChild(fila);
  });
}

const botonBorrarTodo = document.getElementById("borrar-todo");

if (botonBorrarTodo) {
  botonBorrarTodo.addEventListener("click", function () {
    if (window.confirm("¿Borrar todas las solicitudes guardadas?")) {
      localStorage.removeItem(CLAVE_BD);
      mostrarRegistros();
    }
  });
}

mostrarRegistros();

// ---------- formulario de visita (solo en visita.html) ----------
const formulario = document.getElementById("form-visita");

if (formulario) {
  const confirmacion = document.getElementById("confirmacion");
  const pedidoJson = document.getElementById("pedido-json");

  formulario.addEventListener("submit", function (evento) {
    evento.preventDefault();

    const nombre = document.getElementById("nombre").value.trim();
    const correo = document.getElementById("correo").value.trim();
    const fecha = document.getElementById("fecha").value;
    const personas = Number(document.getElementById("personas").value);
    const acepta = document.getElementById("horarios").checked;

    // validaciones
    if (nombre === "") {
      window.alert("Completá tu nombre");
      return;
    }
    if (personas < 1 || personas > 15) {
      window.alert("Los grupos son de 1 a 15 personas");
      return;
    }
    if (!acepta) {
      window.alert("Tenés que aceptar los horarios");
      return;
    }

    const ok = window.confirm("¿Confirmás la visita de " + nombre + "?");

    if (!ok) {
      confirmacion.textContent = "Solicitud cancelada";
      return;
    }

    // mensaje de confirmacion
    confirmacion.textContent = "";
    const mensaje = document.createElement("p");
    mensaje.textContent = "¡Listo, " + nombre + "! Reservamos tu visita para el " +
      formatearFecha(fecha) + " para " + personas + " persona(s).";
    confirmacion.appendChild(mensaje);

    // objeto con la solicitud
    const destacada = new Obra("Cielo en espiral", "Renata Salas", "Óleo sobre tela");
    const solicitud = {
      nombre: nombre,
      correo: correo,
      fecha: fecha,
      personas: personas,
      obraDestacada: destacada.describir()
    };
    pedidoJson.textContent = JSON.stringify(solicitud, null, 2);

    // la guardo en la mini base de datos y actualizo la tabla
    registrar(solicitud);
    mostrarRegistros();

    // guardo la cookie y actualizo el saludo
    document.cookie = "visitante=" + encodeURIComponent(nombre) + "; path=/";
    saludo.textContent = "Hola de nuevo, " + nombre;

    // aviso a los 2 segundos
    setTimeout(function () {
      const aviso = document.createElement("p");
      aviso.textContent = "Te vamos a escribir por correo";
      confirmacion.appendChild(aviso);
    }, 2000);
  });
}
