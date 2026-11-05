"use strict";

// ---------- filtro de obras ----------
const botones = document.querySelectorAll(".filtro");
const figuras = document.querySelectorAll(".galeria figure");
const resultado = document.getElementById("resultado-filtro");

function filtrar(tecnica) {
  let visibles = 0;

  figuras.forEach(function (figura) {
    if (tecnica === "todas" || figura.dataset.tecnica === tecnica) {
      figura.style.display = "";
      visibles = visibles + 1;
    } else {
      figura.style.display = "none";
    }
  });

  resultado.textContent = "Se muestran " + visibles + " de " + figuras.length + " obras";
}

botones.forEach(function (boton) {
  boton.addEventListener("click", function () {
    // saco la clase activa a todos y se la pongo al que toque
    botones.forEach(function (b) {
      b.classList.remove("filtro-activo");
    });
    boton.classList.add("filtro-activo");
    filtrar(boton.dataset.filtro);
  });
});

filtrar("todas");

// ---------- catalogo desde XML ----------
const catalogo = document.getElementById("catalogo-xml");

// copia de data/obras.xml para cuando la pagina se abre sin servidor
const XML_RESPALDO = `<?xml version="1.0" encoding="UTF-8"?>
<catalogo galeria="Atelier Norte" muestra="Materias visibles">
  <obra anio="2024"><titulo>Cielo en espiral</titulo><artista>Renata Salas</artista><tecnica>Óleo sobre tela</tecnica></obra>
  <obra anio="2023"><titulo>Campos de color</titulo><artista>Renata Salas</artista><tecnica>Acrílico sobre tela</tecnica></obra>
  <obra anio="2023"><titulo>Vasija del barrio</titulo><artista>Tomás Vega</artista><tecnica>Cerámica esmaltada</tecnica></obra>
  <obra anio="2024"><titulo>Taller de la calle Norte</titulo><artista>Ingrid Moreau</artista><tecnica>Fotografía analógica</tecnica></obra>
  <obra anio="2022"><titulo>Recortes</titulo><artista>Julián Ferreyra</artista><tecnica>Collage</tecnica></obra>
  <obra anio="2024"><titulo>Objeto recuperado</titulo><artista>Julián Ferreyra</artista><tecnica>Técnica mixta</tecnica></obra>
</catalogo>`;

// devuelve el documento XML o null si esta mal formado
function leerXML(texto) {
  const documento = new DOMParser().parseFromString(texto, "application/xml");
  if (documento.getElementsByTagName("parsererror").length > 0) {
    return null;
  }
  return documento;
}

// toma el texto de una etiqueta hija de la obra
function datoDe(obra, etiqueta) {
  return obra.getElementsByTagName(etiqueta)[0].textContent;
}

function mostrarCatalogo(texto) {
  catalogo.textContent = "";

  const documento = leerXML(texto);
  if (documento === null) {
    catalogo.textContent = "XML inválido";
    return;
  }

  const raiz = documento.documentElement;

  const contexto = document.createElement("p");
  contexto.textContent = "Catálogo: " + raiz.getAttribute("galeria") +
    " · Muestra: " + raiz.getAttribute("muestra");
  catalogo.appendChild(contexto);

  const lista = document.createElement("ul");
  const obras = raiz.getElementsByTagName("obra");

  for (let i = 0; i < obras.length; i++) {
    const obra = obras[i];
    const item = document.createElement("li");
    item.textContent = datoDe(obra, "titulo") + " · " + datoDe(obra, "artista") + " · " +
      obra.getAttribute("anio") + " · " + datoDe(obra, "tecnica");
    lista.appendChild(item);
  }

  catalogo.appendChild(lista);
}

fetch("data/obras.xml")
  .then(function (respuesta) {
    if (!respuesta.ok) {
      throw new Error("No se encontró el archivo");
    }
    return respuesta.text();
  })
  .then(mostrarCatalogo)
  .catch(function () {
    // si se abre con doble clic (file://) el navegador bloquea fetch,
    // entonces uso una copia del mismo XML y lo leo igual con DOMParser
    mostrarCatalogo(XML_RESPALDO);
  });

// ---------- opcional: probar un XML mal formado ----------
const botonRevisar = document.getElementById("revisar-xml");
const pruebaXml = document.getElementById("prueba-xml");

botonRevisar.addEventListener("click", function () {
  // falta cerrar la etiqueta titulo a proposito
  const roto = "<catalogo><obra><titulo>Sin cerrar</obra></catalogo>";
  if (leerXML(roto) === null) {
    pruebaXml.textContent = "XML inválido";
  } else {
    pruebaXml.textContent = "El XML está bien formado";
  }
});
