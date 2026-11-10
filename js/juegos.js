// Juegos del portfolio: Stack, Snake y Cascada
// Se dibujan dentro de <div id="juegos-app"></div>.
// El récord se guarda solo en el navegador de cada persona (sessionStorage):
// se borra al cerrar la pestaña y nunca se manda a ningún servidor ni a GitHub.
(function () {
  const app = document.getElementById('juegos-app');
  if (!app) return;

  const AZUL = [79, 195, 255], FUCSIA = [214, 59, 176], VIOLETA = [139, 92, 246];
  const FONDO = '#071222', TEXTO = '#e6f4ff', GRIS = '#8fa9c4';
  const FUENTE = getComputedStyle(document.body).fontFamily || 'system-ui, sans-serif';

  // ---------- Estilos ----------
  const css = document.createElement('style');
  css.textContent = `
    #juegos-app{max-width:460px;margin:0 auto}
    .vj.ancha #juegos-app{max-width:none}
    #ventana-juegos .vj.ancha{width:min(1000px,100%)}
    .j-tabs{display:flex;gap:8px;margin-bottom:14px}
    .j-tabs button{flex:1;min-width:0;padding:11px 0;border-radius:12px;border:1px solid rgba(79,195,255,.3);background:rgba(79,195,255,.08);color:${TEXTO};font:inherit;font-weight:700;cursor:pointer;transition:background .2s}
    .j-tabs button.on{background:linear-gradient(135deg,#4fc3ff,#d63bb0);border-color:transparent;color:#fff}
    .j-caja{background:#050b14;border:1px solid rgba(79,195,255,.25);border-radius:18px;padding:14px;user-select:none;-webkit-user-select:none;-webkit-tap-highlight-color:transparent}
    .j-caja[hidden]{display:none}
    .j-caja canvas{display:block;width:100%;touch-action:none;border-radius:10px;cursor:pointer}
    .j-pad{display:flex;gap:8px;justify-content:center;margin-top:12px}
    .j-pad.cruz{display:grid;grid-template-columns:repeat(3,56px);justify-content:center}
    .j-pad button{width:56px;height:46px;border-radius:10px;background:rgba(79,195,255,.12);border:1px solid rgba(79,195,255,.3);color:#4fc3ff;font-size:18px;cursor:pointer;touch-action:manipulation;padding:0}
    .j-pad button:active{background:rgba(79,195,255,.3)}
    .j-ayuda{text-align:center;color:${GRIS};font-size:13px;margin-top:10px}
    .j-hud{display:flex;justify-content:space-between;color:${TEXTO};font-weight:700;margin:0 4px 10px}
    .j-hud span{color:${GRIS};font-weight:500}
    .j-fila{display:flex;gap:12px;align-items:flex-start}
    .j-tablero{flex:1;max-width:260px;margin:0 auto}
    .j-lado{width:104px;display:flex;flex-direction:column;gap:8px}
    .j-dato{background:${FONDO};border:1px solid rgba(79,195,255,.25);border-radius:10px;padding:7px 10px}
    .j-dato small{display:block;color:${GRIS};font-size:11px}
    .j-dato b{font-size:18px;color:${TEXTO}}
    .j-dato canvas{cursor:default}
  `;
  document.head.appendChild(css);

  // ---------- Ayudas ----------
  function leerRecord(k) { try { return +sessionStorage.getItem('juego-' + k) || 0; } catch (e) { return 0; } }
  function guardarRecord(k, v) { try { sessionStorage.setItem('juego-' + k, v); } catch (e) {} }
  function rgb(c, f = 1, a = 1) { return `rgba(${Math.round(c[0] * f)},${Math.round(c[1] * f)},${Math.round(c[2] * f)},${a})`; }
  function mezclar(a, b, t) { return [a[0] + (b[0] - a[0]) * t, a[1] + (b[1] - a[1]) * t, a[2] + (b[2] - a[2]) * t]; }
  function prepararCanvas(cv, w, h) {
    const r = Math.min(window.devicePixelRatio || 1, 2);
    cv.width = Math.round(w * r); cv.height = Math.round(h * r);
    cv.style.height = h + 'px';
    const x = cv.getContext('2d'); x.setTransform(r, 0, 0, r, 0, 0); return x;
  }
  function cuadradito(x, px, py, s, radio) {
    x.beginPath();
    if (x.roundRect) x.roundRect(px, py, s, s, radio);
    else { x.moveTo(px + radio, py); x.arcTo(px + s, py, px + s, py + s, radio); x.arcTo(px + s, py + s, px, py + s, radio); x.arcTo(px, py + s, px, py, radio); x.arcTo(px, py, px + s, py, radio); x.closePath(); }
  }
  function cartel(x, W, H, titulo, lineas) {
    x.fillStyle = 'rgba(2,7,18,.72)'; x.fillRect(0, 0, W, H);
    x.textAlign = 'center'; x.textBaseline = 'middle';
    x.fillStyle = TEXTO; x.shadowColor = rgb(FUCSIA); x.shadowBlur = 16;
    x.font = `800 ${Math.round(W * 0.1)}px ${FUENTE}`; x.fillText(titulo, W / 2, H * 0.42);
    x.shadowBlur = 0; x.fillStyle = GRIS; x.font = `500 ${Math.max(13, Math.round(W * 0.042))}px ${FUENTE}`;
    lineas.forEach((l, i) => x.fillText(l, W / 2, H * 0.42 + W * 0.1 + i * W * 0.06));
  }
  // Mantiene apretado un botón para que repita (mover piezas, bajar)
  function botonRepetible(btn, accion) {
    let t1, t2;
    const parar = () => { clearTimeout(t1); clearInterval(t2); };
    btn.addEventListener('pointerdown', e => { e.preventDefault(); accion(); parar(); t1 = setTimeout(() => { t2 = setInterval(accion, 70); }, 220); });
    ['pointerup', 'pointerleave', 'pointercancel'].forEach(ev => btn.addEventListener(ev, parar));
  }

  // =====================================================================
  // STACK: apilar bloques
  // =====================================================================
  function crearStack(caja) {
    caja.innerHTML = '<canvas></canvas><div class="j-ayuda">Tocá, hacé clic o apretá espacio para soltar el bloque</div>';
    const cv = caja.querySelector('canvas');
    const HB = 1.3, LADO = 10, RANGO = 13, C = Math.cos(Math.PI / 6), S = 0.5;
    let x, W = 320, H = 460, esc = 10;
    let bloques, mov, eje, dir, restos, camY, estado = 'inicio', puntos = 0, record = leerRecord('stack'), perfecto = 0, racha = 0;

    function medir() { W = cv.clientWidth || 320; H = Math.round(W * 1.4); x = prepararCanvas(cv, W, H); esc = (W * 0.5) / (2 * LADO * C); }
    function colorNivel(i) {
      const t = (i % 30) / 10, paradas = [AZUL, FUCSIA, VIOLETA, AZUL];
      const k = Math.floor(t); return mezclar(paradas[k], paradas[k + 1], t - k);
    }
    function nuevo() {
      const arriba = bloques[bloques.length - 1];
      eje = eje === 'x' ? 'z' : 'x'; dir = 1;
      mov = { x0: arriba.x0, x1: arriba.x1, z0: arriba.z0, z1: arriba.z1, y0: arriba.y1, y1: arriba.y1 + HB, n: bloques.length };
      mov[eje + '0'] -= RANGO; mov[eje + '1'] -= RANGO;
    }
    function reiniciar() {
      bloques = [{ x0: -LADO / 2, x1: LADO / 2, z0: -LADO / 2, z1: LADO / 2, y0: -5, y1: HB, n: 0 }];
      restos = []; camY = HB; puntos = 0; racha = 0; perfecto = 0; eje = 'z'; nuevo();
    }
    function terminar() {
      restos.push({ b: mov, vy: 0 }); mov = null; estado = 'fin';
      if (puntos > record) { record = puntos; guardarRecord('stack', record); }
    }
    function soltar() {
      const prev = bloques[bloques.length - 1], a0 = eje + '0', a1 = eje + '1';
      const delta = mov[a0] - prev[a0];
      if (Math.abs(delta) < 0.35) {
        mov[a0] = prev[a0]; mov[a1] = prev[a1]; perfecto = 1; racha++;
      } else {
        const o0 = Math.max(mov[a0], prev[a0]), o1 = Math.min(mov[a1], prev[a1]);
        if (o1 <= o0) { terminar(); return; }
        const resto = Object.assign({}, mov);
        if (mov[a0] < prev[a0]) { resto[a1] = o0; } else { resto[a0] = o1; }
        restos.push({ b: resto, vy: 0 });
        mov[a0] = o0; mov[a1] = o1; racha = 0;
      }
      bloques.push(mov); puntos++; nuevo();
    }
    function accion() {
      if (estado !== 'jugando') { reiniciar(); estado = 'jugando'; return; }
      soltar();
    }
    cv.addEventListener('pointerdown', e => { e.preventDefault(); accion(); });

    function update(dt) {
      if (!bloques) reiniciar();
      if (estado === 'jugando' && mov) {
        const vel = Math.min(8 + puntos * 0.35, 22), a0 = eje + '0', a1 = eje + '1';
        mov[a0] += dir * vel * dt; mov[a1] += dir * vel * dt;
        const prev = bloques[bloques.length - 1];
        const off = (mov[a0] + mov[a1]) / 2 - (prev[a0] + prev[a1]) / 2;
        if (off > RANGO) dir = -1; if (off < -RANGO) dir = 1;
      }
      const arriba = bloques[bloques.length - 1];
      camY += (arriba.y1 - camY) * Math.min(1, dt * 5);
      restos.forEach(r => { r.vy += 40 * dt; r.b.y0 -= r.vy * dt; r.b.y1 -= r.vy * dt; });
      restos = restos.filter(r => r.b.y1 > camY - 40);
      perfecto = Math.max(0, perfecto - dt * 1.2);
    }
    function P(px, pz, py) { return [W / 2 + (px - pz) * C * esc, H * 0.52 + (px + pz) * S * esc - (py - camY) * esc]; }
    function poli(pts, color) { x.beginPath(); pts.forEach((p, i) => i ? x.lineTo(p[0], p[1]) : x.moveTo(p[0], p[1])); x.closePath(); x.fillStyle = color; x.fill(); }
    function caja3d(b, alfa = 1) {
      const c = colorNivel(b.n);
      poli([P(b.x1, b.z0, b.y1), P(b.x1, b.z1, b.y1), P(b.x1, b.z1, b.y0), P(b.x1, b.z0, b.y0)], rgb(c, 0.8, alfa));
      poli([P(b.x0, b.z1, b.y1), P(b.x1, b.z1, b.y1), P(b.x1, b.z1, b.y0), P(b.x0, b.z1, b.y0)], rgb(c, 0.62, alfa));
      poli([P(b.x0, b.z0, b.y1), P(b.x1, b.z0, b.y1), P(b.x1, b.z1, b.y1), P(b.x0, b.z1, b.y1)], rgb(c, 1, alfa));
    }
    function dibujar() {
      if (!x) medir();
      const g = x.createRadialGradient(W / 2, H * 0.2, 10, W / 2, H * 0.2, H * 0.8);
      g.addColorStop(0, '#0f2238'); g.addColorStop(1, '#050b14');
      x.fillStyle = g; x.fillRect(0, 0, W, H);
      bloques.forEach(b => { if (b.y1 > camY - 30) caja3d(b); });
      if (mov) caja3d(mov);
      restos.forEach(r => caja3d(r.b, 0.75));
      x.textAlign = 'center'; x.textBaseline = 'middle';
      if (estado !== 'inicio') {
        x.fillStyle = TEXTO; x.shadowColor = rgb(AZUL); x.shadowBlur = 18;
        x.font = `800 ${Math.round(W * 0.15)}px ${FUENTE}`; x.fillText(puntos, W / 2, H * 0.09);
        x.shadowBlur = 0;
      }
      x.fillStyle = GRIS; x.font = `500 ${Math.max(13, Math.round(W * 0.04))}px ${FUENTE}`;
      x.fillText('Récord: ' + record, W / 2, H * 0.165);
      if (perfecto > 0) {
        x.fillStyle = rgb(FUCSIA, 1, Math.min(1, perfecto * 1.5)); x.shadowColor = rgb(FUCSIA); x.shadowBlur = 12;
        x.font = `800 ${Math.round(W * 0.055)}px ${FUENTE}`;
        x.fillText(racha > 1 ? `¡PERFECTO! x${racha}` : '¡PERFECTO!', W / 2, H * 0.215); x.shadowBlur = 0;
      }
      if (estado === 'inicio') cartel(x, W, H, 'STACK', ['Tocá para empezar']);
      if (estado === 'fin') cartel(x, W, H, '¡Se cayó!', ['Puntos: ' + puntos + '  ·  Récord: ' + record, 'Tocá para jugar de nuevo']);
    }
    function tecla(code) {
      if (code === 'Space' || code === 'Enter') { accion(); return true; }
      return false;
    }
    return { medir, update, dibujar, tecla };
  }

  // =====================================================================
  // SNAKE: la viborita
  // =====================================================================
  function crearSnake(caja) {
    caja.innerHTML =
      '<div class="j-hud"><div>Puntos: <b class="j-p">0</b></div><div><span>Récord:</span> <b class="j-r">0</b></div></div>' +
      '<canvas></canvas>' +
      '<div class="j-pad cruz"><i></i><button data-d="0,-1" aria-label="Arriba">▲</button><i></i>' +
      '<button data-d="-1,0" aria-label="Izquierda">◀</button><button data-d="0,1" aria-label="Abajo">▼</button><button data-d="1,0" aria-label="Derecha">▶</button></div>' +
      '<div class="j-ayuda">Flechas o WASD · en el celular deslizá el dedo</div>';
    const cv = caja.querySelector('canvas'), elP = caja.querySelector('.j-p'), elR = caja.querySelector('.j-r');
    const N = 20;
    let x, W = 320, cel = 16;
    let cuerpo, dir, cola, comida, acc = 0, paso, estado = 'inicio', puntos = 0, record = leerRecord('snake'), tiempo = 0;
    elR.textContent = record;

    function medir() { W = cv.clientWidth || 320; x = prepararCanvas(cv, W, W); cel = W / N; }
    function libre(px, py) { return !cuerpo.some(c => c.x === px && c.y === py); }
    function nuevaComida() {
      let px, py; do { px = Math.floor(Math.random() * N); py = Math.floor(Math.random() * N); } while (!libre(px, py));
      comida = { x: px, y: py };
    }
    function reiniciar() {
      cuerpo = [{ x: 8, y: 10 }, { x: 7, y: 10 }, { x: 6, y: 10 }]; dir = { x: 1, y: 0 }; cola = [];
      puntos = 0; paso = 140; acc = 0; elP.textContent = 0; nuevaComida();
    }
    reiniciar();
    function empezar() { if (estado !== 'jugando') { reiniciar(); estado = 'jugando'; } }
    function girar(dx, dy) {
      empezar();
      const ult = cola.length ? cola[cola.length - 1] : dir;
      if ((dx === -ult.x && dy === -ult.y) || (dx === ult.x && dy === ult.y)) return;
      if (cola.length < 3) cola.push({ x: dx, y: dy });
    }
    function mover() {
      if (cola.length) dir = cola.shift();
      const cab = { x: cuerpo[0].x + dir.x, y: cuerpo[0].y + dir.y };
      const come = cab.x === comida.x && cab.y === comida.y;
      const choca = cab.x < 0 || cab.y < 0 || cab.x >= N || cab.y >= N ||
        cuerpo.some((c, i) => (come || i < cuerpo.length - 1) && c.x === cab.x && c.y === cab.y);
      if (choca) {
        estado = 'fin';
        if (puntos > record) { record = puntos; guardarRecord('snake', record); elR.textContent = record; }
        return;
      }
      cuerpo.unshift(cab);
      if (come) { puntos++; elP.textContent = puntos; paso = Math.max(65, paso - 3); nuevaComida(); }
      else cuerpo.pop();
    }
    // Deslizar el dedo (o arrastrar el mouse) sobre el tablero
    let ini = null;
    cv.addEventListener('pointerdown', e => { e.preventDefault(); ini = { x: e.clientX, y: e.clientY, movio: false }; });
    cv.addEventListener('pointermove', e => {
      if (!ini) return;
      const dx = e.clientX - ini.x, dy = e.clientY - ini.y;
      if (Math.max(Math.abs(dx), Math.abs(dy)) < 22) return;
      if (Math.abs(dx) > Math.abs(dy)) girar(Math.sign(dx), 0); else girar(0, Math.sign(dy));
      ini = { x: e.clientX, y: e.clientY, movio: true };
    });
    cv.addEventListener('pointerup', () => { if (ini && !ini.movio) empezar(); ini = null; });
    cv.addEventListener('pointercancel', () => { ini = null; });
    caja.querySelectorAll('.j-pad button').forEach(b => b.addEventListener('pointerdown', e => {
      e.preventDefault(); const [dx, dy] = b.dataset.d.split(',').map(Number); girar(dx, dy);
    }));

    function update(dt) {
      tiempo += dt;
      if (estado !== 'jugando') return;
      acc += dt * 1000;
      while (acc >= paso && estado === 'jugando') { acc -= paso; mover(); }
    }
    function dibujar() {
      if (!x) medir();
      x.fillStyle = FONDO; x.fillRect(0, 0, W, W);
      x.strokeStyle = 'rgba(79,195,255,.06)'; x.lineWidth = 1;
      for (let i = 0; i <= N; i++) {
        x.beginPath(); x.moveTo(i * cel, 0); x.lineTo(i * cel, W); x.stroke();
        x.beginPath(); x.moveTo(0, i * cel); x.lineTo(W, i * cel); x.stroke();
      }
      // comida
      const lat = 1 + Math.sin(tiempo * 6) * 0.12;
      x.shadowColor = rgb(FUCSIA); x.shadowBlur = 18; x.fillStyle = rgb(FUCSIA);
      x.beginPath(); x.arc((comida.x + 0.5) * cel, (comida.y + 0.5) * cel, (cel / 2 - 3) * lat, 0, Math.PI * 2); x.fill();
      // cuerpo
      x.shadowColor = rgb(AZUL); x.shadowBlur = 10;
      for (let i = cuerpo.length - 1; i >= 0; i--) {
        const c = cuerpo[i], t = 1 - i / cuerpo.length;
        x.fillStyle = rgb(AZUL, 1, 0.35 + 0.65 * t);
        cuadradito(x, c.x * cel + 2, c.y * cel + 2, cel - 4, cel * 0.28); x.fill();
      }
      x.shadowBlur = 0;
      // ojitos
      const cab = cuerpo[0], cx = (cab.x + 0.5) * cel, cy = (cab.y + 0.5) * cel, o = cel * 0.2;
      x.fillStyle = '#050b14';
      [[1, -1], [1, 1]].forEach(([a, b]) => {
        const ex = dir.x ? a * dir.x * o : b * o, ey = dir.y ? a * dir.y * o : b * o;
        x.beginPath(); x.arc(cx + ex, cy + ey, Math.max(1.5, cel * 0.1), 0, Math.PI * 2); x.fill();
      });
      if (estado === 'inicio') cartel(x, W, W, 'SNAKE', ['Tocá o apretá una flecha', 'para empezar']);
      if (estado === 'fin') cartel(x, W, W, '¡Chocaste!', ['Puntos: ' + puntos + '  ·  Récord: ' + record, 'Tocá o apretá una flecha']);
    }
    const teclas = { ArrowUp: [0, -1], KeyW: [0, -1], ArrowDown: [0, 1], KeyS: [0, 1], ArrowLeft: [-1, 0], KeyA: [-1, 0], ArrowRight: [1, 0], KeyD: [1, 0] };
    function tecla(code) {
      if (teclas[code]) { girar(...teclas[code]); return true; }
      if (code === 'Space' || code === 'Enter') { empezar(); return true; }
      return false;
    }
    return { medir, update, dibujar, tecla };
  }

  // =====================================================================
  // CASCADA: piezas que caen
  // =====================================================================
  function crearCascada(caja) {
    caja.innerHTML =
      '<div class="j-fila"><div class="j-tablero"><canvas></canvas></div><div class="j-lado">' +
      '<div class="j-dato"><small>Puntos</small><b class="j-p">0</b></div>' +
      '<div class="j-dato"><small>Líneas</small><b class="j-l">0</b></div>' +
      '<div class="j-dato"><small>Nivel</small><b class="j-n">1</b></div>' +
      '<div class="j-dato"><small>Récord</small><b class="j-r">0</b></div>' +
      '<div class="j-dato"><small>Sigue</small><canvas class="j-sig" style="height:56px"></canvas></div></div></div>' +
      '<div class="j-pad"><button class="j-izq" aria-label="Izquierda">◀</button><button class="j-gira" aria-label="Girar">⟳</button>' +
      '<button class="j-der" aria-label="Derecha">▶</button><button class="j-baja" aria-label="Bajar">▼</button><button class="j-cae" aria-label="Bajar de una">⤓</button></div>' +
      '<div class="j-ayuda">Flechas para mover · ↑ gira · espacio baja de una<br>En el celular: tocá para girar, arrastrá para mover, deslizá abajo para soltar</div>';
    const cv = caja.querySelector('.j-tablero canvas'), sig = caja.querySelector('.j-sig');
    const el = { p: caja.querySelector('.j-p'), l: caja.querySelector('.j-l'), n: caja.querySelector('.j-n'), r: caja.querySelector('.j-r') };
    const COLS = 10, FILAS = 20;
    const FORMAS = {
      I: [[0, 0, 0, 0], [1, 1, 1, 1], [0, 0, 0, 0], [0, 0, 0, 0]], O: [[1, 1], [1, 1]],
      T: [[0, 1, 0], [1, 1, 1], [0, 0, 0]], S: [[0, 1, 1], [1, 1, 0], [0, 0, 0]], Z: [[1, 1, 0], [0, 1, 1], [0, 0, 0]],
      J: [[1, 0, 0], [1, 1, 1], [0, 0, 0]], L: [[0, 0, 1], [1, 1, 1], [0, 0, 0]]
    };
    const COLORES = { I: '#4fc3ff', O: '#e05cc4', T: '#d63bb0', S: '#8b5cf6', Z: '#a855f7', J: '#2fa8e8', L: '#6d7ff0' };
    let x, xs, W = 200, H = 400, cel = 20;
    let grilla, pieza, proxima, bolsa = [], acc = 0, estado = 'inicio', puntos = 0, lineas = 0, nivel = 1, record = leerRecord('cascada');
    let borrando = null; // filas que titilan antes de borrarse
    el.r.textContent = record;

    function medir() {
      W = Math.min(cv.parentElement.clientWidth || 200, 260); cel = W / COLS; H = cel * FILAS;
      cv.style.width = W + 'px'; x = prepararCanvas(cv, W, H);
      xs = prepararCanvas(sig, sig.clientWidth || 84, 56);
    }
    function sacarDeBolsa() {
      if (!bolsa.length) { bolsa = Object.keys(FORMAS); for (let i = bolsa.length - 1; i > 0; i--) { const j = Math.floor(Math.random() * (i + 1)); [bolsa[i], bolsa[j]] = [bolsa[j], bolsa[i]]; } }
      return bolsa.pop();
    }
    function crearPieza(t) { const m = FORMAS[t].map(f => f.slice()); return { t, m, x: Math.floor((COLS - m[0].length) / 2), y: t === 'I' ? -1 : 0 }; }
    function valida(m, px, py) {
      for (let j = 0; j < m.length; j++) for (let i = 0; i < m[j].length; i++) {
        if (!m[j][i]) continue;
        const gx = px + i, gy = py + j;
        if (gx < 0 || gx >= COLS || gy >= FILAS) return false;
        if (gy >= 0 && grilla[gy][gx]) return false;
      }
      return true;
    }
    function reiniciar() {
      grilla = Array.from({ length: FILAS }, () => Array(COLS).fill(null));
      bolsa = []; puntos = 0; lineas = 0; nivel = 1; acc = 0; borrando = null;
      pieza = crearPieza(sacarDeBolsa()); proxima = sacarDeBolsa(); actualizarDatos();
    }
    reiniciar();
    function actualizarDatos() { el.p.textContent = puntos.toLocaleString('es-AR'); el.l.textContent = lineas; el.n.textContent = nivel; el.r.textContent = record.toLocaleString('es-AR'); }
    function caida() { return Math.max(0.08, 0.8 - (nivel - 1) * 0.07); }
    function terminar() {
      estado = 'fin';
      if (puntos > record) { record = puntos; guardarRecord('cascada', record); }
      actualizarDatos();
    }
    function fijar() {
      let afuera = false;
      pieza.m.forEach((f, j) => f.forEach((v, i) => { if (v) { if (pieza.y + j < 0) afuera = true; else grilla[pieza.y + j][pieza.x + i] = COLORES[pieza.t]; } }));
      if (afuera) { terminar(); return; }
      const llenas = []; grilla.forEach((f, j) => { if (f.every(Boolean)) llenas.push(j); });
      if (llenas.length) { borrando = { filas: llenas, t: 0.18 }; pieza = null; return; }
      siguiente();
    }
    function siguiente() {
      pieza = crearPieza(proxima); proxima = sacarDeBolsa();
      if (!valida(pieza.m, pieza.x, pieza.y)) terminar();
    }
    function borrarFilas() {
      const n = borrando.filas.length;
      grilla = grilla.filter((f, j) => !borrando.filas.includes(j));
      while (grilla.length < FILAS) grilla.unshift(Array(COLS).fill(null));
      lineas += n; puntos += [0, 100, 300, 500, 800][n] * nivel; nivel = 1 + Math.floor(lineas / 10);
      borrando = null; actualizarDatos(); siguiente();
    }
    function empezar() { if (estado !== 'jugando') { reiniciar(); estado = 'jugando'; return true; } return false; }
    function mover(dx) { if (estado !== 'jugando' || !pieza) return; if (valida(pieza.m, pieza.x + dx, pieza.y)) pieza.x += dx; }
    function girar() {
      if (empezar() || !pieza) return;
      const r = pieza.m[0].map((_, i) => pieza.m.map(f => f[i]).reverse());
      for (const k of [0, -1, 1, -2, 2]) if (valida(r, pieza.x + k, pieza.y)) { pieza.m = r; pieza.x += k; return; }
    }
    function bajar(manual) {
      if (estado !== 'jugando' || !pieza) return;
      if (valida(pieza.m, pieza.x, pieza.y + 1)) { pieza.y++; if (manual) { puntos += 1; actualizarDatos(); } }
      else fijar();
      acc = 0;
    }
    function caerDeUna() {
      if (empezar() || !pieza) return;
      let n = 0; while (valida(pieza.m, pieza.x, pieza.y + 1)) { pieza.y++; n++; }
      puntos += n * 2; actualizarDatos(); fijar(); acc = 0;
    }

    // Toques sobre el tablero: tocar gira, arrastrar mueve, deslizar rápido hacia abajo la suelta
    let ini = null;
    cv.addEventListener('pointerdown', e => { e.preventDefault(); ini = { x: e.clientX, y: e.clientY, x0: e.clientX, y0: e.clientY, t: performance.now(), movio: false }; });
    cv.addEventListener('pointermove', e => {
      if (!ini || estado !== 'jugando') return;
      const dx = e.clientX - ini.x, dy = e.clientY - ini.y;
      if (Math.abs(dx) >= cel) { mover(Math.sign(dx)); ini.x += Math.sign(dx) * cel; ini.movio = true; }
      if (dy >= cel * 1.2 && Math.abs(e.clientX - ini.x0) < cel) { bajar(true); ini.y += cel; ini.movio = true; }
    });
    cv.addEventListener('pointerup', e => {
      if (!ini) return;
      const dy = e.clientY - ini.y0, dt = performance.now() - ini.t;
      if (estado !== 'jugando') empezar();
      else if (dy > cel * 3 && dt < 300) caerDeUna();
      else if (!ini.movio) girar();
      ini = null;
    });
    cv.addEventListener('pointercancel', () => { ini = null; });
    botonRepetible(caja.querySelector('.j-izq'), () => { empezar(); mover(-1); });
    botonRepetible(caja.querySelector('.j-der'), () => { empezar(); mover(1); });
    botonRepetible(caja.querySelector('.j-baja'), () => { if (!empezar()) bajar(true); });
    caja.querySelector('.j-gira').addEventListener('pointerdown', e => { e.preventDefault(); girar(); });
    caja.querySelector('.j-cae').addEventListener('pointerdown', e => { e.preventDefault(); caerDeUna(); });

    function update(dt) {
      if (estado !== 'jugando') return;
      if (borrando) { borrando.t -= dt; if (borrando.t <= 0) borrarFilas(); return; }
      acc += dt; if (acc >= caida()) bajar(false);
    }
    function bloque(ctx, color, px, py, s, fantasma) {
      if (fantasma) { ctx.strokeStyle = color; ctx.globalAlpha = 0.4; ctx.lineWidth = 1.5; ctx.strokeRect(px + 2.5, py + 2.5, s - 5, s - 5); ctx.globalAlpha = 1; return; }
      ctx.shadowColor = color; ctx.shadowBlur = 8; ctx.fillStyle = color;
      cuadradito(ctx, px + 1.5, py + 1.5, s - 3, s * 0.18); ctx.fill(); ctx.shadowBlur = 0;
      ctx.fillStyle = 'rgba(255,255,255,.22)'; ctx.fillRect(px + 4, py + 3.5, s - 8, Math.max(2, s * 0.14));
    }
    function dibujar() {
      if (!x) medir();
      x.fillStyle = FONDO; x.fillRect(0, 0, W, H);
      x.strokeStyle = 'rgba(79,195,255,.06)'; x.lineWidth = 1;
      for (let i = 0; i <= COLS; i++) { x.beginPath(); x.moveTo(i * cel, 0); x.lineTo(i * cel, H); x.stroke(); }
      for (let j = 0; j <= FILAS; j++) { x.beginPath(); x.moveTo(0, j * cel); x.lineTo(W, j * cel); x.stroke(); }
      grilla.forEach((f, j) => f.forEach((c, i) => {
        if (!c) return;
        if (borrando && borrando.filas.includes(j)) { x.fillStyle = 'rgba(255,255,255,.85)'; x.fillRect(i * cel + 1, j * cel + 1, cel - 2, cel - 2); }
        else bloque(x, c, i * cel, j * cel, cel);
      }));
      if (pieza && estado === 'jugando') {
        let gy = pieza.y; while (valida(pieza.m, pieza.x, gy + 1)) gy++;
        const col = COLORES[pieza.t];
        pieza.m.forEach((f, j) => f.forEach((v, i) => { if (v && gy + j >= 0) bloque(x, col, (pieza.x + i) * cel, (gy + j) * cel, cel, true); }));
        pieza.m.forEach((f, j) => f.forEach((v, i) => { if (v && pieza.y + j >= 0) bloque(x, col, (pieza.x + i) * cel, (pieza.y + j) * cel, cel); }));
      }
      // próxima pieza
      const sw = sig.clientWidth || 84, m = FORMAS[proxima].filter(f => f.some(Boolean)), s = Math.min(18, (sw - 8) / 4);
      xs.clearRect(0, 0, sw, 56);
      const ox = (sw - m[0].length * s) / 2, oy = (56 - m.length * s) / 2;
      m.forEach((f, j) => f.forEach((v, i) => { if (v) bloque(xs, COLORES[proxima], ox + i * s, oy + j * s, s); }));
      if (estado === 'inicio') cartel(x, W, H, 'CASCADA', ['Tocá para empezar']);
      if (estado === 'fin') cartel(x, W, H, '¡Se llenó!', ['Puntos: ' + puntos.toLocaleString('es-AR'), 'Tocá para jugar de nuevo']);
    }
    function tecla(code) {
      if (code === 'ArrowLeft' || code === 'KeyA') { empezar(); mover(-1); return true; }
      if (code === 'ArrowRight' || code === 'KeyD') { empezar(); mover(1); return true; }
      if (code === 'ArrowDown' || code === 'KeyS') { if (!empezar()) bajar(true); return true; }
      if (code === 'ArrowUp' || code === 'KeyW' || code === 'KeyX') { girar(); return true; }
      if (code === 'Space') { caerDeUna(); return true; }
      if (code === 'Enter') { empezar(); return true; }
      return false;
    }
    return { medir, update, dibujar, tecla };
  }

  // =====================================================================
  // ARENA HELADA: shooter 3D. Three.js y el juego se cargan recién cuando se abre la pestaña
  // =====================================================================
  function cargarScript(src) {
    return new Promise((ok, mal) => { const s = document.createElement('script'); s.src = src; s.onload = ok; s.onerror = mal; document.head.appendChild(s); });
  }
  function crearArena(caja) {
    caja.innerHTML = '<div style="height:320px;display:grid;place-content:center;text-align:center;color:' + GRIS + '"><b style="color:' + TEXTO + ';font-size:22px">Arena Helada</b><span class="j-estado">Cargando el juego 3D…</span></div>';
    let juego = null, cargando = false;
    function cargar() {
      if (cargando) return; cargando = true;
      const base = (document.querySelector('script[src*="juegos.js"]') || {}).src || '';
      const arenaSrc = base ? base.replace(/juegos\.js.*$/, 'arena.js') : 'js/arena.js';
      (window.THREE ? Promise.resolve() : cargarScript('https://cdn.jsdelivr.net/npm/three@0.160.0/build/three.min.js'))
        .then(() => window.ArenaHelada ? null : cargarScript(arenaSrc))
        .then(() => {
          juego = window.ArenaHelada(caja, { activo: () => visible && actual === 'arena' });
          juego.medir();
        })
        .catch(() => { cargando = false; const e = caja.querySelector('.j-estado'); if (e) e.textContent = 'No se pudo cargar. Revisá tu conexión y volvé a abrir la pestaña.'; });
    }
    return {
      medir() { if (juego) juego.medir(); else cargar(); },
      update(dt) { if (juego) juego.update(dt); },
      dibujar() { if (juego) juego.dibujar(); },
      salir() { if (juego) juego.salir(); },
      tecla(code) { return juego ? juego.tecla(code) : false; }
    };
  }

  // =====================================================================
  // Pestañas y bucle principal
  // =====================================================================
  app.innerHTML =
    '<div class="j-tabs"><button data-j="stack" class="on">Stack</button><button data-j="snake">Snake</button><button data-j="cascada">Cascada</button><button data-j="arena">Arena</button></div>' +
    '<div class="j-caja" data-j="stack"></div><div class="j-caja" data-j="snake" hidden></div><div class="j-caja" data-j="cascada" hidden></div><div class="j-caja" data-j="arena" hidden></div>';
  const cajas = {}; app.querySelectorAll('.j-caja').forEach(c => cajas[c.dataset.j] = c);
  const juegos = { stack: crearStack(cajas.stack), snake: crearSnake(cajas.snake), cascada: crearCascada(cajas.cascada), arena: crearArena(cajas.arena) };
  let actual = 'stack';
  juegos.stack.medir();

  app.querySelectorAll('.j-tabs button').forEach(b => b.addEventListener('click', () => {
    app.querySelectorAll('.j-tabs button').forEach(o => o.classList.toggle('on', o === b));
    Object.keys(cajas).forEach(k => cajas[k].hidden = k !== b.dataset.j);
    if (actual === 'arena' && b.dataset.j !== 'arena') juegos.arena.salir();
    actual = b.dataset.j;
    const vj = app.closest('.vj'); if (vj) vj.classList.toggle('ancha', actual === 'arena');
    juegos[actual].medir();
  }));

  // Las teclas del juego solo se usan si la persona tocó el juego (así no se traba el scroll de la página)
  let activo = false;
  document.addEventListener('pointerdown', e => { activo = app.contains(e.target); }, true);
  document.addEventListener('keydown', e => {
    if (!activo || e.ctrlKey || e.metaKey || e.altKey) return;
    if (juegos[actual].tecla(e.code)) e.preventDefault();
  });

  // Si el juego no está en pantalla, se congela
  let visible = true, antes = performance.now();
  const ventana = document.getElementById('ventana-juegos');
  if (ventana) {
    // Los juegos viven en una ventana encima de la página: solo corren mientras está abierta
    visible = false;
    function elegir(nombre) {
      const b = app.querySelector(`.j-tabs button[data-j="${nombre}"]`);
      if (b) b.click();
    }
    function abrir(nombre) {
      ventana.hidden = false; document.body.classList.add('juego-abierto');
      visible = true; activo = true; antes = performance.now();
      elegir(juegos[nombre] ? nombre : actual);
      juegos[actual].medir();
      const menu = document.querySelector('.nav-links'); if (menu) menu.classList.remove('open');
    }
    function cerrar() {
      juegos.arena.salir();
      ventana.hidden = true; document.body.classList.remove('juego-abierto');
      visible = false; activo = false;
    }
    document.querySelectorAll('[data-jugar]').forEach(el => el.addEventListener('click', e => { e.preventDefault(); abrir(el.dataset.jugar); }));
    ventana.querySelector('.vj-x').addEventListener('click', cerrar);
    ventana.addEventListener('pointerdown', e => { if (e.target === ventana) cerrar(); });
    document.addEventListener('keydown', e => {
      // Con la Arena, el primer Esc solo suelta el mouse (pausa); no cierra la ventana
      if (e.key !== 'Escape' || ventana.hidden) return;
      if (actual === 'arena' && (document.pointerLockElement || performance.now() - (+cajas.arena.dataset.unlock || 0) < 600)) return;
      cerrar();
    });
  } else if ('IntersectionObserver' in window) {
    new IntersectionObserver(es => { visible = es[0].isIntersecting; }).observe(app);
  }
  window.addEventListener('resize', () => juegos[actual].medir());

  function bucle(t) {
    const dt = Math.min(0.05, (t - antes) / 1000); antes = t;
    if (visible) { try { juegos[actual].update(dt); juegos[actual].dibujar(); } catch (e) { console.error(e); } }
    requestAnimationFrame(bucle);
  }
  requestAnimationFrame(bucle);
})();
