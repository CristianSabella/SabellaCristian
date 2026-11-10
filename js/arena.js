// Arena Helada: shooter en primera persona, vos contra 6 bots en una arena de hielo bajo un cielo estrellado.
// Diseño original (mapa, robots y arma propios). Usa Three.js, que se carga solo cuando se abre la pestaña.
// Las bajas y muertes se guardan solo en el navegador de quien juega (sessionStorage) y se borran al cerrar la pestaña.
window.ArenaHelada = function (caja, opciones) {
  const T = window.THREE;
  const activo = opciones.activo;
  const N_BOTS = 6, VIDA = 100, DANO_JUGADOR = 20, DANO_BOT = 10, TIEMPO_RONDA = 120;
  const NOMBRES = ['Escarcha', 'Glaciar', 'Ventisca', 'Témpano', 'Granizo', 'Aurora'];
  const tactil = window.matchMedia('(pointer: coarse)').matches;
  const sonar = (n, a) => { if (window.SonidoJuegos) window.SonidoJuegos.sonar('arena', n, a); };

  // ---------- Estilos ----------
  if (!document.getElementById('ah-estilos')) {
    const st = document.createElement('style'); st.id = 'ah-estilos';
    st.textContent = `
      .ah-vista{position:relative;width:100%;border-radius:12px;overflow:hidden;background:#040814;touch-action:none;user-select:none;-webkit-user-select:none}
      .ah-vista>canvas{display:block;width:100%!important;cursor:crosshair}
      .ah-hud{position:absolute;inset:0;pointer-events:none;color:#e6f4ff;font-weight:700;font-size:13px}
      .ah-pill{background:rgba(5,11,20,.72);border:1px solid rgba(79,195,255,.35);border-radius:10px;padding:4px 10px;white-space:nowrap}
      .ah-pill small{color:#8fa9c4;font-weight:600;margin-right:5px;font-size:11px}
      .ah-arriba{position:absolute;top:8px;left:50%;transform:translateX(-50%);display:flex;gap:6px}
      .ah-reloj{font-size:15px}
      .ah-hud canvas.ah-radar{position:absolute;top:8px;left:8px;width:84px!important;height:84px!important;border-radius:50%;background:rgba(5,11,20,.72);border:1px solid rgba(79,195,255,.35)}
      .ah-feed{position:absolute;top:8px;right:8px;display:grid;gap:4px;justify-items:end;font-size:12px}
      .ah-feed div{background:rgba(5,11,20,.72);border:1px solid rgba(214,59,176,.4);border-radius:8px;padding:3px 8px;transition:opacity .5s}
      .ah-feed .tu{color:#4fc3ff}.ah-feed .bot{color:#d63bb0}
      .ah-abajo{position:absolute;left:8px;bottom:8px;display:flex;gap:6px;align-items:flex-end}
      .ah-grande{font-size:20px;font-weight:800}
      .ah-barra{width:110px;height:6px;border-radius:3px;background:rgba(255,255,255,.14);margin-top:4px;overflow:hidden}
      .ah-barra i{display:block;height:100%;background:linear-gradient(90deg,#4fc3ff,#d63bb0);transition:width .15s}
      .ah-energia{position:absolute;right:8px;bottom:8px}
      .ah-mira{position:absolute;left:50%;top:50%;width:20px;height:20px;transform:translate(-50%,-50%)}
      .ah-mira:before,.ah-mira:after{content:'';position:absolute;background:#4fc3ff;box-shadow:0 0 5px #4fc3ff}
      .ah-mira:before{left:9px;top:0;width:2px;height:20px}.ah-mira:after{top:9px;left:0;height:2px;width:20px}
      .ah-acierto{position:absolute;left:50%;top:50%;width:30px;height:30px;transform:translate(-50%,-50%) rotate(45deg);opacity:0;transition:opacity .12s}
      .ah-acierto:before,.ah-acierto:after{content:'';position:absolute;background:#d63bb0}
      .ah-acierto:before{left:14px;top:0;width:2px;height:30px}.ah-acierto:after{top:14px;left:0;height:2px;width:30px}
      .ah-dano{position:absolute;inset:0;box-shadow:inset 0 0 90px rgba(255,40,80,.85);opacity:0;transition:opacity .25s}
      .ah-joy{position:absolute;width:96px;height:96px;margin:-48px 0 0 -48px;border-radius:50%;border:2px solid rgba(79,195,255,.45);background:rgba(79,195,255,.08);display:none;pointer-events:none}
      .ah-joy i{position:absolute;left:28px;top:28px;width:40px;height:40px;border-radius:50%;background:rgba(79,195,255,.55)}
      .ah-fuego{position:absolute;right:14px;bottom:52px;width:72px;height:72px;border-radius:50%;border:0;background:radial-gradient(circle,#ff6fd8,#d63bb0);color:#fff;font-weight:800;font-size:13px;box-shadow:0 0 18px rgba(214,59,176,.7);touch-action:none}
      .ah-pista{position:absolute;left:12px;bottom:52px;color:#8fa9c4;font-size:11px;font-weight:600;pointer-events:none}
      .ah-cartel{position:absolute;inset:0;display:grid;place-content:center;text-align:center;gap:8px;background:rgba(2,7,18,.72);cursor:pointer;padding:16px}
      .ah-cartel[hidden]{display:none}
      .ah-cartel h3{margin:0;font-size:clamp(24px,5vw,38px);font-weight:800;color:#e6f4ff;text-shadow:0 0 18px rgba(214,59,176,.8)}
      .ah-cartel p{margin:0;color:#8fa9c4;font-size:14px}
      .ah-cartel b.btn{justify-self:center;margin-top:6px;padding:10px 18px;border-radius:12px;background:linear-gradient(135deg,#4fc3ff,#d63bb0);color:#fff}
      .ah-carga{position:absolute;inset:0;display:grid;place-content:center;color:#8fa9c4}
      /* Pantallas angostas (celular): todo más compacto para que nada se encime */
      .ah-vista.chico .ah-hud canvas.ah-radar{width:64px!important;height:64px!important}
      .ah-vista.chico .ah-arriba{left:auto;right:8px;transform:none}
      .ah-vista.chico .ah-feed{top:44px}
      .ah-vista.chico .ah-abajo{flex-direction:column;align-items:flex-start;gap:4px}
      .ah-vista.chico .ah-grande{font-size:16px}
      .ah-vista.chico .ah-barra{width:80px}
      .ah-vista.chico .ah-energia{right:auto;left:8px;bottom:auto;top:80px}
      .ah-vista.chico .ah-fuego{bottom:14px}
      .ah-vista.chico .ah-pista{display:none}
    `;
    document.head.appendChild(st);
  }

  caja.innerHTML = `
    <div class="ah-vista">
      <div class="ah-hud">
        <canvas class="ah-radar" width="168" height="168"></canvas>
        <div class="ah-arriba"><div class="ah-pill"><small>Ronda</small><span class="r-ronda">1</span></div><div class="ah-pill ah-reloj r-reloj">2:00</div><div class="ah-pill"><small>Bots</small><span class="r-bots">6 / 6</span></div></div>
        <div class="ah-feed"></div>
        <div class="ah-mira"></div><div class="ah-acierto"></div><div class="ah-dano"></div>
        <div class="ah-abajo">
          <div class="ah-pill"><small>Vida</small><span class="ah-grande r-vida">100</span><div class="ah-barra"><i class="r-barra" style="width:100%"></i></div></div>
          <div class="ah-pill"><small>Bajas</small><span class="ah-grande r-bajas">0</span> <small style="margin-left:6px">Muertes</small><span class="ah-grande r-muertes">0</span></div>
        </div>
        <div class="ah-pill ah-energia"><small>Energía</small><span class="ah-grande r-energia">30</span> / 30</div>
      </div>
      <div class="ah-joy"><i></i></div>
      ${tactil ? '<div class="ah-pista">Izquierda: moverte · Derecha: apuntar</div><button class="ah-fuego" aria-label="Disparar">FUEGO</button>' : ''}
      <div class="ah-cartel"><h3>ARENA HELADA</h3><p>Vos contra 6 bots. Cada disparo tuyo les saca 20 % de vida.</p>
        <p>${tactil ? 'Joystick a la izquierda, arrastrá a la derecha para apuntar, botón FUEGO para disparar.' : 'WASD para moverte · mouse para apuntar · clic para disparar · Esc para pausar'}</p>
        <b class="btn">${tactil ? 'Tocá para empezar' : 'Hacé clic para empezar'}</b></div>
    </div>`;
  const vista = caja.querySelector('.ah-vista'), cartel = caja.querySelector('.ah-cartel');
  const el = s => caja.querySelector(s);
  const ui = { ronda: el('.r-ronda'), reloj: el('.r-reloj'), bots: el('.r-bots'), vida: el('.r-vida'), barra: el('.r-barra'), bajas: el('.r-bajas'), muertes: el('.r-muertes'), energia: el('.r-energia'), feed: el('.ah-feed'), acierto: el('.ah-acierto'), dano: el('.ah-dano'), joy: el('.ah-joy'), radar: el('.ah-radar') };
  const rx = ui.radar.getContext('2d');

  // ---------- Escena ----------
  const render = new T.WebGLRenderer({ antialias: !tactil, powerPreference: 'high-performance' });
  render.setPixelRatio(Math.min(window.devicePixelRatio || 1, tactil ? 1 : 1.25));
  vista.prepend(render.domElement);
  const escena = new T.Scene();
  escena.background = new T.Color('#040814');
  escena.fog = new T.Fog('#0a1424', 24, 80);
  const cam = new T.PerspectiveCamera(72, 16 / 9, 0.05, 260);
  escena.add(cam);
  escena.add(new T.HemisphereLight('#bfe6ff', '#1a2a44', 0.95));
  const sol = new T.DirectionalLight('#ffffff', 0.85); sol.position.set(8, 20, 6); escena.add(sol);

  const M = {
    hielo: new T.MeshStandardMaterial({ color: '#bfe9ff', roughness: 0.25, metalness: 0.1, transparent: true, opacity: 0.9 }),
    nieve: new T.MeshStandardMaterial({ color: '#e9f5ff', roughness: 0.9 }),
    oscuro: new T.MeshStandardMaterial({ color: '#16263d', roughness: 0.6 }),
    azul: new T.MeshBasicMaterial({ color: '#4fc3ff' }), fucsia: new T.MeshBasicMaterial({ color: '#d63bb0' }),
    linea: new T.MeshBasicMaterial({ color: '#4fc3ff', transparent: true, opacity: 0.16 })
  };
  const solidos = []; // cajas que chocan y frenan disparos: {x0,x1,z0,z1,y0,y1}
  function caja3(w, h, d, mat, x, y, z, solido = true) {
    const m = new T.Mesh(new T.BoxGeometry(w, h, d), mat); m.position.set(x, y, z); escena.add(m);
    if (solido) solidos.push({ x0: x - w / 2, x1: x + w / 2, z0: z - d / 2, z1: z + d / 2, y0: y - h / 2, y1: y + h / 2 });
    return m;
  }
  // Piso y grilla
  caja3(60, 0.2, 60, M.nieve, 0, -0.1, 0, false);
  { // grilla en un solo dibujo (antes eran 42 piezas sueltas)
    const pg = [];
    for (let i = -30; i <= 30; i += 3) pg.push(i, 0.01, -30, i, 0.01, 30, -30, 0.011, i, 30, 0.011, i);
    const gg = new T.BufferGeometry(); gg.setAttribute('position', new T.Float32BufferAttribute(pg, 3));
    escena.add(new T.LineSegments(gg, new T.LineBasicMaterial({ color: '#4fc3ff', transparent: true, opacity: 0.16 })));
  }
  // Muros de la arena
  caja3(42, 6, 1, M.hielo, 0, 3, -20.5); caja3(42, 6, 1, M.hielo, 0, 3, 20.5);
  caja3(1, 6, 42, M.hielo, -20.5, 3, 0); caja3(1, 6, 42, M.hielo, 20.5, 3, 0);
  // Columnas con luces
  [[-7, -6], [7, -6], [-7, 6], [7, 6]].forEach(([x, z], i) => { caja3(1.6, 4.5, 1.6, M.hielo, x, 2.25, z); caja3(1.7, 0.15, 1.7, i % 2 ? M.fucsia : M.azul, x, 4.55, z, false); });
  // Muros bajos para cubrirse
  caja3(6, 1.4, 0.8, M.hielo, 0, 0.7, -10); caja3(6, 1.4, 0.8, M.hielo, 0, 0.7, 10);
  caja3(0.8, 1.4, 6, M.hielo, -12, 0.7, 0); caja3(0.8, 1.4, 6, M.hielo, 12, 0.7, 0);
  // Bloques altos cerca de las bases
  [[-14, -15], [14, -15], [-14, 15], [14, 15]].forEach(([x, z]) => caja3(2, 3, 2, M.hielo, x, 1.5, z));
  // Cajas oscuras con borde de luz
  [[3, -3], [-3, 3], [-10, -13], [10, 13], [10, -13], [-10, 13]].forEach(([x, z], i) => {
    caja3(1.2, 1.2, 1.2, M.oscuro, x, 0.6, z); caja3(1.22, 0.06, 1.22, i % 2 ? M.fucsia : M.azul, x, 1.2, z, false);
  });
  caja3(1.2, 1.2, 1.2, M.oscuro, 3, 1.8, -3); caja3(1.2, 1.2, 1.2, M.oscuro, -3, 1.8, 3);
  // Plataforma central (decorativa, se camina por encima)
  caja3(6, 0.12, 6, M.oscuro, 0, 0.06, 0, false); caja3(6.05, 0.03, 6.05, M.fucsia, 0, 0.13, 0, false);

  // ---------- Cielo estrellado ----------
  const capasEstrellas = [];
  function estrellas(n, tam, col, banda, op) {
    const g = new T.BufferGeometry(), p = [];
    for (let i = 0; i < n; i++) {
      const th = Math.random() * Math.PI * 2;
      const ph = banda ? 0.55 + Math.sin(th * 1.3) * 0.35 + (Math.random() - 0.5) * 0.3 : Math.acos(Math.random() * 0.97);
      p.push(200 * Math.sin(ph) * Math.cos(th), 200 * Math.cos(ph), 200 * Math.sin(ph) * Math.sin(th));
    }
    g.setAttribute('position', new T.Float32BufferAttribute(p, 3));
    const mat = new T.PointsMaterial({ color: col, size: tam, sizeAttenuation: false, fog: false, transparent: true, opacity: op || 1, depthWrite: false });
    escena.add(new T.Points(g, mat)); capasEstrellas.push({ mat, base: op || 1, fase: Math.random() * 6, vel: 0.6 + Math.random() * 1.6 });
  }
  estrellas(2600, 2, '#cfe6ff', false, 0.8); estrellas(800, 3, '#ffffff'); estrellas(140, 5, '#ffffff');
  estrellas(80, 4, '#ffb8ec'); estrellas(80, 4, '#9fe0ff'); estrellas(5000, 1.6, '#a9c8ff', true, 0.55);
  function brillo(r, g, b, a) {
    const c = document.createElement('canvas'); c.width = c.height = 128; const x = c.getContext('2d');
    const gr = x.createRadialGradient(64, 64, 0, 64, 64, 64); gr.addColorStop(0, `rgba(${r},${g},${b},${a})`); gr.addColorStop(1, 'rgba(0,0,0,0)');
    x.fillStyle = gr; x.fillRect(0, 0, 128, 128);
    return new T.Sprite(new T.SpriteMaterial({ map: new T.CanvasTexture(c), fog: false, transparent: true, depthWrite: false }));
  }
  const n1 = brillo(140, 110, 255, 0.45); n1.position.set(-40, 95, -160); n1.scale.set(260, 90, 1); escena.add(n1);
  const n2 = brillo(214, 59, 176, 0.4); n2.position.set(30, 75, -165); n2.scale.set(200, 65, 1); escena.add(n2);
  const luna = new T.Mesh(new T.SphereGeometry(6, 32, 24), new T.MeshBasicMaterial({ color: '#eef6ff', fog: false }));
  luna.position.set(60, 64, -145); escena.add(luna);
  const halo = brillo(170, 215, 255, 0.45); halo.position.copy(luna.position); halo.scale.set(55, 55, 1); escena.add(halo);
  // Nieve que cae
  const NIEVE = 450, pn = new Float32Array(NIEVE * 3);
  for (let i = 0; i < NIEVE; i++) { pn[i * 3] = (Math.random() - 0.5) * 44; pn[i * 3 + 1] = Math.random() * 14; pn[i * 3 + 2] = (Math.random() - 0.5) * 44; }
  const gNieve = new T.BufferGeometry(); gNieve.setAttribute('position', new T.BufferAttribute(pn, 3));
  escena.add(new T.Points(gNieve, new T.PointsMaterial({ color: '#ffffff', size: 0.07, transparent: true, opacity: 0.85 })));

  // ---------- Arma (bláster de energía) ----------
  const arma = new T.Group();
  const mArma = new T.MeshStandardMaterial({ color: '#1b2d47', roughness: 0.35, metalness: 0.6 });
  const pz1 = new T.Mesh(new T.BoxGeometry(0.07, 0.08, 0.42), mArma); arma.add(pz1);
  const cano = new T.Mesh(new T.CylinderGeometry(0.022, 0.022, 0.2, 12), mArma); cano.rotation.x = Math.PI / 2; cano.position.set(0, 0.01, -0.3); arma.add(cano);
  const franja = new T.Mesh(new T.BoxGeometry(0.075, 0.012, 0.3), M.azul); franja.position.set(0, 0.046, -0.02); arma.add(franja);
  const mango = new T.Mesh(new T.BoxGeometry(0.05, 0.12, 0.06), mArma); mango.position.set(0, -0.09, 0.1); mango.rotation.x = 0.3; arma.add(mango);
  const punta = new T.Mesh(new T.SphereGeometry(0.026, 12, 8), M.fucsia); punta.position.set(0, 0.01, -0.41); arma.add(punta);
  const fogonazo = brillo(255, 140, 230, 0.95); fogonazo.scale.set(0.22, 0.22, 1); fogonazo.position.set(0, 0.01, -0.45); fogonazo.visible = false; arma.add(fogonazo);
  const ARMA_POS = new T.Vector3(0.17, -0.15, -0.34);
  arma.position.copy(ARMA_POS); cam.add(arma);
  arma.traverse(o => { if (o.material) { o.material = o.material.clone(); o.material.depthTest = false; o.material.fog = false; } o.renderOrder = 10; });

  // ---------- Disparos visibles (trazos) ----------
  const trazos = [];
  function trazo(desde, hasta, color) {
    const g = new T.BufferGeometry().setFromPoints([desde, hasta]);
    const m = new T.LineBasicMaterial({ color, transparent: true, opacity: 0.95, fog: false });
    const l = new T.Line(g, m); escena.add(l); trazos.push({ l, t: 0.12 });
  }

  // ---------- Robots ----------
  function crearRobot() {
    const g = new T.Group();
    const cuerpoM = new T.MeshStandardMaterial({ color: '#dfe7ef', roughness: 0.4, metalness: 0.3, emissive: '#000000' });
    const cuerpo = new T.Mesh(new T.CapsuleGeometry(0.42, 0.9, 6, 14), cuerpoM); cuerpo.position.y = 1.05; g.add(cuerpo);
    const cabeza = new T.Mesh(new T.SphereGeometry(0.36, 20, 14), cuerpoM); cabeza.position.y = 2.0; g.add(cabeza);
    const visor = new T.Mesh(new T.BoxGeometry(0.5, 0.13, 0.2), M.fucsia); visor.position.set(0, 2.03, 0.28); g.add(visor);
    const canon = new T.Mesh(new T.BoxGeometry(0.12, 0.14, 0.7), M.oscuro); canon.position.set(0.38, 1.25, 0.4); g.add(canon);
    const luz = new T.Mesh(new T.BoxGeometry(0.13, 0.04, 0.2), M.fucsia); luz.position.set(0.38, 1.33, 0.72); g.add(luz);
    escena.add(g);
    return { g, cuerpoM };
  }
  const PUNTOS = [[-15, -6], [15, -6], [-15, 6], [15, 6], [0, -15], [0, 15], [-6, -16], [6, -16], [-6, 16], [6, 16], [-9, 0], [9, 0], [0, -6], [0, 6], [-16, -16], [16, 16], [-16, 16], [16, -16]];
  const bots = NOMBRES.map(nombre => Object.assign(crearRobot(), { nombre, x: 0, z: 0, yaw: 0, vida: VIDA, vivo: true }));

  // ---------- Estado del juego ----------
  let W = 640, H = 400;
  const jugador = { x: 0, z: 15, yaw: 0, pitch: 0, vida: VIDA, velAct: 0 };
  let estado = 'inicio', ronda = 0, tiempo = TIEMPO_RONDA, energia = 30, sinDisparar = 0, cadencia = 0, disparando = false, retroceso = 0, paso = 0, tiempoTotal = 0;
  let totales = { bajas: 0, muertes: 0 };
  try { const g = JSON.parse(sessionStorage.getItem('juego-arena') || 'null'); if (g) totales = g; } catch (e) {}
  const teclas = {};
  const mov = { x: 0, y: 0 }; // joystick
  function guardarTotales() { try { sessionStorage.setItem('juego-arena', JSON.stringify(totales)); } catch (e) {} }

  function libre(x, z, r) {
    if (Math.abs(x) > 19.5 - r || Math.abs(z) > 19.5 - r) return false;
    for (const b of solidos) if (b.y0 < 1.5 && x > b.x0 - r && x < b.x1 + r && z > b.z0 - r && z < b.z1 + r) return false;
    return true;
  }
  function moverCon(o, dx, dz, r) {
    if (libre(o.x + dx, o.z, r)) o.x += dx;
    if (libre(o.x, o.z + dz, r)) o.z += dz;
  }
  const rangoT = [0, 0];
  function eje(oo, dd, lo, hi) {
    if (Math.abs(dd) < 1e-9) return oo >= lo && oo <= hi;
    let a = (lo - oo) / dd, c = (hi - oo) / dd; if (a > c) { const x = a; a = c; c = x; }
    if (a > rangoT[0]) rangoT[0] = a; if (c < rangoT[1]) rangoT[1] = c;
    return rangoT[0] <= rangoT[1];
  }
  // Rayo contra cajas: devuelve la distancia al primer choque
  function rayoCajas(o, d, max) {
    let mejor = max;
    for (const b of solidos) {
      // Sin crear arrays nuevos en cada rayo: así el navegador no frena para limpiar memoria (eso daba tirones)
      rangoT[0] = 0; rangoT[1] = mejor;
      if (eje(o.x, d.x, b.x0, b.x1) && eje(o.y, d.y, b.y0, b.y1) && eje(o.z, d.z, b.z0, b.z1) && rangoT[0] < mejor) mejor = rangoT[0];
    }
    if (d.y < 0) { const tp = -o.y / d.y; if (tp < mejor) mejor = tp; }
    return mejor;
  }
  // Rayo contra un robot (cilindro aproximado)
  function rayoBot(o, d, b) {
    const r = 0.48, ox = o.x - b.x, oz = o.z - b.z;
    const a = d.x * d.x + d.z * d.z, bb = 2 * (ox * d.x + oz * d.z), c = ox * ox + oz * oz - r * r;
    const disc = bb * bb - 4 * a * c; if (disc < 0 || a < 1e-9) return Infinity;
    const t = (-bb - Math.sqrt(disc)) / (2 * a); if (t < 0) return Infinity;
    const y = o.y + d.y * t; return (y > 0.1 && y < 2.4) ? t : Infinity;
  }
  function ojoJugador() { return new T.Vector3(jugador.x, 1.65, jugador.z); }

  function aparecer() {
    jugador.x = (Math.random() - 0.5) * 10; jugador.z = 16; jugador.yaw = 0; jugador.pitch = 0; jugador.vida = VIDA;
    const lugares = PUNTOS.filter(([, z]) => z < -2).sort(() => Math.random() - 0.5);
    bots.forEach((b, i) => {
      const [x, z] = lugares[i % lugares.length];
      Object.assign(b, { x: x + (Math.random() - 0.5), z: z + (Math.random() - 0.5), yaw: Math.PI, vida: VIDA, vivo: true, estado: 'patrulla', meta: null, reaccion: 0, recarga: 1 + Math.random(), lado: Math.random() < 0.5 ? 1 : -1, cambio: 1, visto: null, perdido: 0, flash: 0, muerte: 0, trabado: 0 });
      b.g.visible = true; b.g.rotation.set(0, 0, 0); b.g.position.y = 0;
    });
  }
  function iniciarRonda() {
    ronda++; tiempo = TIEMPO_RONDA; energia = 30; aparecer(); estado = 'jugando'; sonar('empezar'); cartel.hidden = true; ui.feed.innerHTML = '';
    actualizarHud();
  }
  function terminarRonda(titulo, linea) {
    estado = 'fin'; disparando = false; soltarMouse(); sonar(titulo.startsWith('¡Ronda ganada') ? 'ganar' : 'perder');
    cartel.innerHTML = `<h3>${titulo}</h3><p>${linea}</p><p>Total: ${totales.bajas} bajas · ${totales.muertes} muertes</p><b class="btn">${tactil ? 'Tocá' : 'Hacé clic'} para la ronda ${ronda + 1}</b>`;
    cartel.hidden = false;
  }
  function anunciar(quien, aQuien, tuSosVictima) {
    const d = document.createElement('div');
    d.innerHTML = tuSosVictima ? `<span class="bot">${quien}</span> ➜ <span class="tu">${aQuien}</span>` : `<span class="tu">${quien}</span> ➜ <span class="bot">${aQuien}</span>`;
    ui.feed.prepend(d); while (ui.feed.children.length > 4) ui.feed.lastChild.remove();
    setTimeout(() => { d.style.opacity = 0; setTimeout(() => d.remove(), 600); }, 4000);
  }
  const hudPrevio = {};
  function poner(k, v, fn) { if (hudPrevio[k] !== v) { hudPrevio[k] = v; fn(v); } } // solo toca la página si el valor cambió
  function actualizarHud() {
    let vivos = 0; for (const b of bots) if (b.vivo) vivos++;
    poner('ronda', Math.max(1, ronda), v => ui.ronda.textContent = v);
    poner('reloj', Math.floor(tiempo / 60) + ':' + String(Math.floor(tiempo % 60)).padStart(2, '0'), v => ui.reloj.textContent = v);
    poner('bots', vivos, v => ui.bots.textContent = v + ' / ' + N_BOTS);
    poner('vida', Math.max(0, Math.round(jugador.vida)), v => { ui.vida.textContent = v; ui.barra.style.width = v + '%'; });
    poner('bajas', totales.bajas, v => ui.bajas.textContent = v);
    poner('muertes', totales.muertes, v => ui.muertes.textContent = v);
    poner('energia', Math.floor(energia), v => ui.energia.textContent = v);
  }

  // ---------- Disparo del jugador ----------
  function disparar() {
    if (estado !== 'jugando') return;
    if (energia < 1) { if (cadencia <= 0) { sonar('sinEnergia'); cadencia = 0.25; } return; }
    sonar('disparo');
    energia -= 1; sinDisparar = 0; cadencia = 0.16; retroceso = 1; fogonazo.visible = true; setTimeout(() => fogonazo.visible = false, 50);
    const o = ojoJugador();
    const disp = jugador.velAct > 0.5 ? 0.025 : 0.008;
    const d = new T.Vector3(0, 0, -1).applyEuler(new T.Euler(jugador.pitch + (Math.random() - 0.5) * disp, jugador.yaw + (Math.random() - 0.5) * disp, 0, 'YXZ'));
    let dist = rayoCajas(o, d, 80), blanco = null;
    for (const b of bots) { if (!b.vivo) continue; const t = rayoBot(o, d, b); if (t < dist) { dist = t; blanco = b; } }
    const fin = o.clone().addScaledVector(d, dist);
    const boca = new T.Vector3(0, 0.01, -0.45).applyMatrix4(arma.matrixWorld);
    trazo(boca, fin, '#4fc3ff');
    if (blanco) {
      blanco.vida -= DANO_JUGADOR; blanco.flash = 0.12; sonar(blanco.vida <= 0 ? 'baja' : 'acierto'); ui.acierto.style.opacity = 1; setTimeout(() => ui.acierto.style.opacity = 0, 120);
      // Si le pegás, sabe dónde estás
      blanco.estado = 'combate'; blanco.visto = { x: jugador.x, z: jugador.z }; if (blanco.reaccion > 0.25) blanco.reaccion = 0.25;
      if (blanco.vida <= 0) {
        blanco.vivo = false; totales.bajas++; guardarTotales(); anunciar('Vos', 'Bot ' + blanco.nombre, false);
        if (!bots.some(b => b.vivo)) terminarRonda('¡Ronda ganada!', 'Eliminaste a los 6 bots.');
      }
    }
    actualizarHud();
  }

  // ---------- Inteligencia de los bots ----------
  function puedeVer(b) {
    const dx = jugador.x - b.x, dz = jugador.z - b.z, dist = Math.hypot(dx, dz);
    if (dist > 38) return false;
    if (b.estado !== 'combate' && dist > 7) {
      const ang = Math.atan2(dx, dz), dif = Math.atan2(Math.sin(ang - b.yaw), Math.cos(ang - b.yaw));
      if (Math.abs(dif) > 1.2) return false;
    }
    const o = new T.Vector3(b.x, 1.9, b.z), dest = new T.Vector3(jugador.x, 1.5, jugador.z);
    const d = dest.clone().sub(o); const L = d.length(); d.normalize();
    return rayoCajas(o, d, L) >= L - 0.05;
  }
  function botDispara(b, dist) {
    if (estado !== 'jugando') return;
    const o = new T.Vector3(b.x, 1.3, b.z).add(new T.Vector3(0.38, 0, 0.75).applyAxisAngle(new T.Vector3(0, 1, 0), b.yaw));
    const pecho = new T.Vector3(jugador.x, 1.25, jugador.z);
    const prob = Math.min(0.58, Math.max(0.14, 0.6 - dist * 0.012 - (jugador.velAct > 1 ? 0.16 : 0)));
    const acierta = Math.random() < prob;
    const objetivo = acierta ? pecho : pecho.clone().add(new T.Vector3((Math.random() - 0.5) * 3, Math.random() * 1.6 - 0.4, (Math.random() - 0.5) * 3));
    const d = objetivo.clone().sub(o); const L = d.length(); d.normalize();
    const choque = rayoCajas(o, d, L + 20);
    trazo(o, o.clone().addScaledVector(d, Math.min(choque, L + (acierta ? 0 : 8))), '#ff5fd2'); sonar('botDispara', dist);
    if (acierta && choque >= L - 0.1) {
      jugador.vida -= DANO_BOT; sonar('dano'); ui.dano.style.opacity = 1; setTimeout(() => ui.dano.style.opacity = 0, 160);
      if (jugador.vida <= 0) {
        totales.muertes++; guardarTotales(); anunciar('Bot ' + b.nombre, 'Vos', true);
        terminarRonda('Te eliminaron', `Te ganó Bot ${b.nombre}. Quedaban ${bots.filter(x => x.vivo).length} bots.`);
      }
      actualizarHud();
    }
  }
  function nuevaMeta(b) { const [x, z] = PUNTOS[Math.floor(Math.random() * PUNTOS.length)]; b.meta = { x: x + (Math.random() - 0.5) * 2, z: z + (Math.random() - 0.5) * 2 }; }
  function irHacia(b, x, z, vel, dt) {
    const dx = x - b.x, dz = z - b.z, L = Math.hypot(dx, dz); if (L < 0.3) return true;
    const ax = b.x, az = b.z; moverCon(b, dx / L * vel * dt, dz / L * vel * dt, 0.5);
    if (Math.hypot(b.x - ax, b.z - az) < vel * dt * 0.3) { b.trabado += dt; if (b.trabado > 0.6) { b.trabado = 0; return true; } } else b.trabado = 0;
    return false;
  }
  function girarA(b, ang, dt, vel) { const dif = Math.atan2(Math.sin(ang - b.yaw), Math.cos(ang - b.yaw)); b.yaw += Math.max(-vel * dt, Math.min(vel * dt, dif)); }
  function actualizarBot(b, dt) {
    if (!b.vivo) {
      if (b.muerte < 1) { b.muerte += dt * 1.6; b.g.rotation.x = -Math.min(1, b.muerte) * 1.45; b.g.position.y = -Math.min(1, b.muerte) * 0.3; }
      else b.g.visible = false;
      return;
    }
    const ve = puedeVer(b), dx = jugador.x - b.x, dz = jugador.z - b.z, dist = Math.hypot(dx, dz);
    if (ve) {
      if (b.estado !== 'combate') { b.estado = 'combate'; b.reaccion = 0.45 + Math.random() * 0.4; }
      b.visto = { x: jugador.x, z: jugador.z }; b.perdido = 0;
    }
    if (b.estado === 'combate') {
      if (ve) {
        girarA(b, Math.atan2(dx, dz), dt, 5);
        b.cambio -= dt; if (b.cambio <= 0) { b.lado *= -1; b.cambio = 0.7 + Math.random() * 1.1; }
        const px = dz / dist, pz = -dx / dist; let vx = px * b.lado * 2.6, vz = pz * b.lado * 2.6;
        if (dist > 15) { vx += dx / dist * 2.6; vz += dz / dist * 2.6; } else if (dist < 6) { vx -= dx / dist * 2.6; vz -= dz / dist * 2.6; }
        const ax = b.x, az = b.z; moverCon(b, vx * dt, vz * dt, 0.5);
        if (Math.hypot(b.x - ax, b.z - az) < 0.001) b.lado *= -1;
        b.reaccion -= dt;
        if (b.reaccion <= 0) { b.recarga -= dt; if (b.recarga <= 0) { b.recarga = 0.7 + Math.random() * 0.55; botDispara(b, dist); } }
      } else {
        b.perdido += dt;
        if (b.visto) { girarA(b, Math.atan2(b.visto.x - b.x, b.visto.z - b.z), dt, 4); if (irHacia(b, b.visto.x, b.visto.z, 3, dt)) b.visto = null; }
        if (b.perdido > 4) { b.estado = 'patrulla'; b.meta = null; }
      }
    } else {
      if (!b.meta) nuevaMeta(b);
      girarA(b, Math.atan2(b.meta.x - b.x, b.meta.z - b.z), dt, 3);
      if (irHacia(b, b.meta.x, b.meta.z, 2.4, dt)) b.meta = null;
    }
    // Separación entre bots
    for (const o of bots) if (o !== b && o.vivo) { const sx = b.x - o.x, sz = b.z - o.z, d = Math.hypot(sx, sz); if (d < 1.1 && d > 0.001) moverCon(b, sx / d * (1.1 - d) * 0.5, sz / d * (1.1 - d) * 0.5, 0.5); }
    b.flash = Math.max(0, b.flash - dt);
    b.cuerpoM.emissive.set(b.flash > 0 ? '#ff3fb5' : '#000000');
    b.g.position.set(b.x, Math.abs(Math.sin(tiempoTotal * 7 + b.x)) * 0.04, b.z); b.g.rotation.y = b.yaw;
  }

  // ---------- Controles ----------
  function bloquearMouse() { if (!tactil && render.domElement.requestPointerLock) { try { const p = render.domElement.requestPointerLock(); if (p && p.catch) p.catch(() => {}); } catch (e) {} } }
  function soltarMouse() { if (document.pointerLockElement === render.domElement) document.exitPointerLock(); }
  const bloqueado = () => document.pointerLockElement === render.domElement;
  document.addEventListener('pointerlockchange', () => {
    if (!bloqueado()) { caja.dataset.unlock = performance.now(); disparando = false; if (estado === 'jugando') { estado = 'pausa'; cartel.innerHTML = '<h3>Pausa</h3><p>Hacé clic para seguir jugando.</p><b class="btn">Seguir</b>'; cartel.hidden = false; } }
  });
  cartel.addEventListener('pointerdown', e => {
    e.preventDefault(); e.stopPropagation();
    if (estado === 'pausa') { estado = 'jugando'; cartel.hidden = true; bloquearMouse(); return; }
    iniciarRonda(); bloquearMouse();
  });
  // Mouse (compu)
  let arrastre = null;
  render.domElement.addEventListener('pointerdown', e => {
    if (e.pointerType === 'touch' || estado !== 'jugando') return;
    if (!bloqueado()) { bloquearMouse(); arrastre = { x: e.clientX, y: e.clientY }; }
    if (e.button === 0) disparando = true;
  });
  window.addEventListener('pointerup', e => { if (e.pointerType !== 'touch') { disparando = false; arrastre = null; } });
  document.addEventListener('mousemove', e => {
    if (estado !== 'jugando' || !activo()) return;
    // Se limita cada movimiento: al bloquear el mouse algunos navegadores mandan un salto enorme
    if (bloqueado()) mirar(Math.max(-120, Math.min(120, e.movementX)), Math.max(-120, Math.min(120, e.movementY)), 0.0022);
    else if (arrastre) { mirar(e.clientX - arrastre.x, e.clientY - arrastre.y, 0.005); arrastre = { x: e.clientX, y: e.clientY }; }
  });
  function mirar(dx, dy, s) { jugador.yaw -= dx * s; jugador.pitch = Math.max(-1.35, Math.min(1.35, jugador.pitch - dy * s)); }
  // Táctil (celular): joystick a la izquierda, apuntar a la derecha, botón FUEGO
  const toques = {};
  vista.addEventListener('pointerdown', e => {
    if (e.pointerType !== 'touch' || estado !== 'jugando') return;
    if (e.target.classList.contains('ah-fuego')) { disparando = true; toques[e.pointerId] = { tipo: 'fuego' }; return; }
    const r = vista.getBoundingClientRect(), x = e.clientX - r.left, y = e.clientY - r.top;
    if (x < r.width * 0.45) { toques[e.pointerId] = { tipo: 'joy', ox: x, oy: y }; ui.joy.style.display = 'block'; ui.joy.style.left = x + 'px'; ui.joy.style.top = y + 'px'; }
    else toques[e.pointerId] = { tipo: 'mira', x: e.clientX, y: e.clientY };
    e.preventDefault();
  });
  vista.addEventListener('pointermove', e => {
    const t = toques[e.pointerId]; if (!t) return;
    if (t.tipo === 'joy') {
      const r = vista.getBoundingClientRect(); let dx = e.clientX - r.left - t.ox, dy = e.clientY - r.top - t.oy; const L = Math.hypot(dx, dy);
      if (L > 40) { dx *= 40 / L; dy *= 40 / L; }
      mov.x = dx / 40; mov.y = dy / 40; ui.joy.firstChild.style.transform = `translate(${dx}px,${dy}px)`;
    } else if (t.tipo === 'mira') { mirar(e.clientX - t.x, e.clientY - t.y, 0.006); t.x = e.clientX; t.y = e.clientY; }
  });
  function finToque(e) {
    const t = toques[e.pointerId]; if (!t) return;
    if (t.tipo === 'joy') { mov.x = mov.y = 0; ui.joy.style.display = 'none'; ui.joy.firstChild.style.transform = ''; }
    if (t.tipo === 'fuego') disparando = false;
    delete toques[e.pointerId];
  }
  vista.addEventListener('pointerup', finToque); vista.addEventListener('pointercancel', finToque);
  // Teclado
  const MOVS = ['KeyW', 'KeyA', 'KeyS', 'KeyD', 'ArrowUp', 'ArrowDown', 'ArrowLeft', 'ArrowRight'];
  document.addEventListener('keydown', e => { if (activo() && MOVS.includes(e.code)) teclas[e.code] = true; });
  document.addEventListener('keyup', e => { teclas[e.code] = false; });
  window.addEventListener('blur', () => { for (const k in teclas) teclas[k] = false; disparando = false; });

  // ---------- Bucle ----------
  const dirAdelante = new T.Vector3(), dirCostado = new T.Vector3();
  function update(dt) {
    tiempoTotal += dt;
    capasEstrellas.forEach(c => { c.mat.opacity = c.base * (0.75 + 0.25 * Math.sin(tiempoTotal * c.vel + c.fase)); });
    for (let i = 0; i < NIEVE; i++) { pn[i * 3 + 1] -= dt * 1.2; pn[i * 3] += Math.sin(tiempoTotal + i) * dt * 0.2; if (pn[i * 3 + 1] < 0) pn[i * 3 + 1] = 14; }
    gNieve.attributes.position.needsUpdate = true;
    for (let i = trazos.length - 1; i >= 0; i--) { const t = trazos[i]; t.t -= dt; t.l.material.opacity = Math.max(0, t.t / 0.12); if (t.t <= 0) { escena.remove(t.l); t.l.geometry.dispose(); t.l.material.dispose(); trazos.splice(i, 1); } }
    if (estado !== 'jugando') { jugador.velAct = 0; bots.forEach(b => { if (b.vivo) { b.g.position.set(b.x, 0, b.z); b.g.rotation.y = b.yaw; } }); return; }
    // Moverse
    let fx = 0, fz = 0;
    if (teclas.KeyW || teclas.ArrowUp) fz += 1; if (teclas.KeyS || teclas.ArrowDown) fz -= 1;
    if (teclas.KeyD || teclas.ArrowRight) fx += 1; if (teclas.KeyA || teclas.ArrowLeft) fx -= 1;
    fx += mov.x; fz -= mov.y;
    const L = Math.hypot(fx, fz); if (L > 1) { fx /= L; fz /= L; }
    dirAdelante.set(-Math.sin(jugador.yaw), 0, -Math.cos(jugador.yaw)); dirCostado.set(Math.cos(jugador.yaw), 0, -Math.sin(jugador.yaw));
    const V = 5.2, ax = jugador.x, az = jugador.z;
    moverCon(jugador, (dirAdelante.x * fz + dirCostado.x * fx) * V * dt, (dirAdelante.z * fz + dirCostado.z * fx) * V * dt, 0.4);
    jugador.velAct = Math.hypot(jugador.x - ax, jugador.z - az) / Math.max(dt, 1e-4);
    // Arma
    cadencia -= dt; sinDisparar += dt;
    if (disparando && cadencia <= 0) disparar();
    if (sinDisparar > 0.6) energia = Math.min(30, energia + dt * 14);
    retroceso = Math.max(0, retroceso - dt * 9); paso += jugador.velAct * dt * 1.6;
    arma.position.set(ARMA_POS.x + Math.sin(paso) * 0.008, ARMA_POS.y + Math.abs(Math.cos(paso)) * 0.008 - retroceso * 0.01, ARMA_POS.z + retroceso * 0.05);
    // Bots
    bots.forEach(b => { if (estado === 'jugando' || !b.vivo) actualizarBot(b, dt); });
    // Reloj
    if (estado === 'jugando') {
      tiempo -= dt;
      if (tiempo <= 0) { tiempo = 0; terminarRonda('Se acabó el tiempo', `Quedaron ${bots.filter(b => b.vivo).length} bots en pie.`); }
    }
    actualizarHud();
  }
  let radarT = 0;
  function dibujarRadar() {
    const ahora = performance.now(); if (ahora - radarT < 50) return; radarT = ahora; // el radar se dibuja 20 veces por segundo, alcanza
    const s = 168, c = s / 2, esc = c / 26; rx.clearRect(0, 0, s, s);
    rx.strokeStyle = 'rgba(79,195,255,.18)'; rx.beginPath(); rx.arc(c, c, c * 0.5, 0, 7); rx.stroke();
    bots.forEach(b => {
      if (!b.vivo) return;
      const dx = b.x - jugador.x, dz = b.z - jugador.z;
      const rxp = dx * Math.cos(jugador.yaw) - dz * Math.sin(jugador.yaw), rzp = dx * Math.sin(jugador.yaw) + dz * Math.cos(jugador.yaw);
      const px = c + rxp * esc, py = c + rzp * esc; if (Math.hypot(px - c, py - c) > c - 6) return;
      rx.fillStyle = 'rgba(214,59,176,.35)'; rx.beginPath(); rx.arc(px, py, 9, 0, 7); rx.fill(); rx.fillStyle = '#d63bb0'; rx.beginPath(); rx.arc(px, py, 6, 0, 7); rx.fill();
    });
    rx.fillStyle = '#4fc3ff'; rx.beginPath(); rx.moveTo(c, c - 9); rx.lineTo(c + 6, c + 6); rx.lineTo(c - 6, c + 6); rx.closePath(); rx.fill();
  }
  function dibujar() {
    cam.position.set(jugador.x, 1.65 + Math.abs(Math.sin(paso)) * 0.03, jugador.z);
    cam.rotation.set(jugador.pitch, jugador.yaw, 0, 'YXZ');
    render.render(escena, cam); dibujarRadar();
  }
  function medir() {
    W = vista.clientWidth || 640;
    H = Math.round(tactil ? Math.min(window.innerHeight * 0.62, W * 1.25) : Math.min(window.innerHeight * 0.7, W * 0.6));
    vista.classList.toggle('chico', W < 560);
    render.setSize(W, H, false); render.domElement.style.height = H + 'px'; vista.style.height = H + 'px';
    cam.aspect = W / H; cam.fov = W / H < 1 ? 82 : 72; cam.updateProjectionMatrix();
  }
  function salir() { soltarMouse(); disparando = false; for (const k in teclas) teclas[k] = false; if (estado === 'jugando') { estado = 'pausa'; cartel.innerHTML = `<h3>Pausa</h3><p>${tactil ? 'Tocá' : 'Hacé clic'} para seguir jugando.</p><b class="btn">Seguir</b>`; cartel.hidden = false; } }
  aparecer(); actualizarHud(); medir();
  return { medir, update, dibujar, salir, tecla: code => MOVS.includes(code) || code === 'Space' };
};
