/* ═══════════════════════════════════════════════════════════════════════
   script.js — AG-TSP con grafo restringido (Dijkstra + caminos mínimos)
   Región Puno, Perú
═══════════════════════════════════════════════════════════════════════ */


/* ═══════════════════════════════════════════════════════════════════════
   1. CIUDADES
═══════════════════════════════════════════════════════════════════════ */

const CIUDADES = {
    puno:        { nombre: "Puno",        coords: { lat: -15.8402, lng: -70.0219 } },
    juliaca:     { nombre: "Juliaca",     coords: { lat: -15.4997, lng: -70.1333 } },
    ilave:       { nombre: "Ilave",       coords: { lat: -16.0833, lng: -69.6667 } },
    ayaviri:     { nombre: "Ayaviri",     coords: { lat: -14.8864, lng: -70.5889 } },
    azangaro:    { nombre: "Azángaro",    coords: { lat: -14.9084, lng: -70.1962 } },
    lampa:       { nombre: "Lampa",       coords: { lat: -15.3644, lng: -70.3714 } },
    yunguyo:     { nombre: "Yunguyo",     coords: { lat: -16.2389, lng: -69.0908 } },
    desaguadero: { nombre: "Desaguadero", coords: { lat: -16.5636, lng: -69.0425 } },
    moho:        { nombre: "Moho",        coords: { lat: -15.3522, lng: -69.4878 } },
    huancane:    { nombre: "Huancané",    coords: { lat: -15.2022, lng: -69.7558 } },
};

/* ═══════════════════════════════════════════════════════════════════════
   2. GRAFO DE ADYACENCIA — solo carreteras reales (km aproximados)
═══════════════════════════════════════════════════════════════════════ */

const GRAFO = {
    puno:        { juliaca: 44,  ilave: 55,  lampa: 78 },
    juliaca:     { puno: 44,     ayaviri: 89, azangaro: 70, lampa: 31, huancane: 50 },
    ilave:       { puno: 55,     yunguyo: 62, desaguadero: 90 },
    ayaviri:     { juliaca: 89,  azangaro: 38 },
    azangaro:    { juliaca: 70,  ayaviri: 38,  moho: 68,  huancane: 55 },
    lampa:       { juliaca: 31,  puno: 78 },
    yunguyo:     { ilave: 62,    desaguadero: 45 },
    desaguadero: { ilave: 90,    yunguyo: 45 },
    moho:        { azangaro: 68, huancane: 42 },
    huancane:    { juliaca: 50,  azangaro: 55, moho: 42 },
};

const CIUDAD_IDS = Object.keys(CIUDADES);
const N = CIUDAD_IDS.length;

/* ═══════════════════════════════════════════════════════════════════════
   3. DIJKSTRA — precalcular caminos mínimos entre TODOS los pares
═══════════════════════════════════════════════════════════════════════ */

const DIST_MIN = Array.from({ length: N }, () => new Array(N).fill(Infinity));
const CAMINO   = Array.from({ length: N }, () => new Array(N).fill(null));

function dijkstraDesde(origenIdx) {
    const dist = new Array(N).fill(Infinity);
    const pred = new Array(N).fill(-1);
    const vis  = new Array(N).fill(false);
    dist[origenIdx] = 0;

    for (let iter = 0; iter < N; iter++) {
        let u = -1;
        for (let k = 0; k < N; k++) {
            if (!vis[k] && (u === -1 || dist[k] < dist[u])) u = k;
        }
        if (u === -1 || dist[u] === Infinity) break;
        vis[u] = true;

        const vecinos = GRAFO[CIUDAD_IDS[u]] || {};
        Object.entries(vecinos).forEach(([vid, km]) => {
            const v = CIUDAD_IDS.indexOf(vid);
            if (dist[u] + km < dist[v]) {
                dist[v] = dist[u] + km;
                pred[v] = u;
            }
        });
    }

    for (let j = 0; j < N; j++) {
        DIST_MIN[origenIdx][j] = dist[j];
        if (j === origenIdx) { CAMINO[origenIdx][j] = [CIUDAD_IDS[origenIdx]]; continue; }
        if (dist[j] === Infinity) { CAMINO[origenIdx][j] = null; continue; }
        const path = [];
        let cur = j;
        while (cur !== -1) { path.unshift(CIUDAD_IDS[cur]); cur = pred[cur]; }
        CAMINO[origenIdx][j] = path;
    }
}

for (let i = 0; i < N; i++) dijkstraDesde(i);

/* ═══════════════════════════════════════════════════════════════════════
   4. HELPER: expandir tour en lista de IDs con nodos intermedios
═══════════════════════════════════════════════════════════════════════ */

/**
 * Dado un tour de índices numéricos, devuelve un array de city IDs
 * con todos los nodos intermedios reales (usando CAMINO[a][b]).
 * Cierra el ciclo al final.
 */
function expandirTourEnIds(tour) {
    const ids = [];
    for (let i = 0; i < tour.length; i++) {
        const a   = tour[i];
        const b   = tour[(i + 1) % tour.length];
        const seg = CAMINO[a][b];
        if (!seg) continue;
        // Añadir todos menos el último (evitar duplicar nodos)
        for (let k = 0; k < seg.length - 1; k++) {
            ids.push(seg[k]);
        }
    }
    // Cerrar ciclo con la ciudad inicial
    ids.push(CIUDAD_IDS[tour[0]]);
    return ids;
}

/* ═══════════════════════════════════════════════════════════════════════
   5. FUNCIONES DE DISTANCIA PARA EL AG
═══════════════════════════════════════════════════════════════════════ */

function distanciaTour(tour) {
    let total = 0;
    for (let i = 0; i < tour.length; i++) {
        const a = tour[i];
        const b = tour[(i + 1) % tour.length];
        total += DIST_MIN[a][b];
    }
    return total;
}

function fitness(tour) {
    const d = distanciaTour(tour);
    return d > 0 ? 1 / d : 0;
}

/* ═══════════════════════════════════════════════════════════════════════
   6. ALGORITMO GENÉTICO
═══════════════════════════════════════════════════════════════════════ */

function tourAleatorio(origenIdx) {
    const otros = [];
    for (let i = 0; i < N; i++) { if (i !== origenIdx) otros.push(i); }
    for (let i = otros.length - 1; i > 0; i--) {
        const j = Math.floor(Math.random() * (i + 1));
        [otros[i], otros[j]] = [otros[j], otros[i]];
    }
    return [origenIdx, ...otros];
}

function seleccionTorneo(poblacion, fits, k = 3) {
    let mejor = null, mf = -1;
    for (let i = 0; i < k; i++) {
        const idx = Math.floor(Math.random() * poblacion.length);
        if (fits[idx] > mf) { mf = fits[idx]; mejor = poblacion[idx]; }
    }
    return mejor;
}

function cruceOX(p1, p2) {
    const origen = p1[0];
    const a1 = p1.slice(1), a2 = p2.slice(1);
    const n  = a1.length;
    let i = Math.floor(Math.random() * n);
    let j = Math.floor(Math.random() * n);
    if (i > j) [i, j] = [j, i];
    if (i === j) j = Math.min(j + 1, n - 1);

    function ox(base, otro) {
        const seg  = base.slice(i, j + 1);
        const rest = otro.filter(x => !seg.includes(x));
        return [origen, ...rest.slice(0, i), ...seg, ...rest.slice(i)];
    }
    return [ox(a1, a2), ox(a2, a1)];
}

function mutacionSwap(tour, tasa) {
    if (Math.random() > tasa) return tour;
    const t = [...tour];
    const i = 1 + Math.floor(Math.random() * (N - 1));
    const j = 1 + Math.floor(Math.random() * (N - 1));
    [t[i], t[j]] = [t[j], t[i]];
    return t;
}

function mutacion2opt(tour, tasa) {
    if (Math.random() > tasa) return tour;
    const t = [...tour];
    let i = 1 + Math.floor(Math.random() * (N - 2));
    let j = i + 1 + Math.floor(Math.random() * (N - 1 - i));
    if (j >= N) j = N - 1;
    while (i < j) { [t[i], t[j]] = [t[j], t[i]]; i++; j--; }
    return t;
}

/* ═══════════════════════════════════════════════════════════════════════
   VARIABLES GLOBALES DE GOOGLE MAPS
═══════════════════════════════════════════════════════════════════════ */

let mapa;
let marcadores      = {};
let polylineRuta    = null;
let polylinesBG     = [];
let ultimoMejorTour = null;
let ejecutandoAG    = false;

/* ═══════════════════════════════════════════════════════════════════════
   initMap() — callback de Google Maps
═══════════════════════════════════════════════════════════════════════ */

async function initMap() {
    const { Map } = await google.maps.importLibrary("maps");
    mapa = new Map(document.getElementById("map"), {
        center: CIUDADES.puno.coords,
        zoom: 9,
        styles: [
            { elementType: "geometry",               stylers: [{ color: "#1a1f2e" }] },
            { elementType: "labels.text.stroke",     stylers: [{ color: "#1a1f2e" }] },
            { elementType: "labels.text.fill",       stylers: [{ color: "#8a90a8" }] },
            { featureType: "road", elementType: "geometry",         stylers: [{ color: "#2a3050" }] },
            { featureType: "road", elementType: "labels.text.fill", stylers: [{ color: "#6b7491" }] },
            { featureType: "water", elementType: "geometry",        stylers: [{ color: "#0d1530" }] },
            { featureType: "water", elementType: "labels.text.fill",stylers: [{ color: "#3a4a6b" }] },
            { featureType: "administrative", elementType: "geometry.stroke", stylers: [{ color: "#2a3050" }] },
            { featureType: "landscape",      elementType: "geometry",        stylers: [{ color: "#151c2e" }] },
            { featureType: "poi",     stylers: [{ visibility: "off" }] },
            { featureType: "transit", stylers: [{ visibility: "off" }] },
        ],
        disableDefaultUI: false,
        zoomControl: true,
        mapTypeControl: false,
        streetViewControl: false,
        fullscreenControl: true,
    });

    dibujarAristasGrafo();
    Object.entries(CIUDADES).forEach(([id, c]) => crearMarcador(id, c));
    poblarSelectores();
    renderizarTablaGrafo();
}

/* ═══════════════════════════════════════════════════════════════════════
   7. ejecutarAG() — ORQUESTADOR PRINCIPAL
═══════════════════════════════════════════════════════════════════════ */

async function ejecutarAG() {
    if (ejecutandoAG) return;

    const origenId = document.getElementById("ciudadOrigen").value;
    if (!origenId) { mostrarChip("⚠ Selecciona ciudad de inicio"); return; }

    const origenIdx       = CIUDAD_IDS.indexOf(origenId);
    const tamPoblacion    = Math.max(10,  parseInt(document.getElementById("tamPoblacion").value)    || 80);
    const numGeneraciones = Math.max(10,  parseInt(document.getElementById("numGeneraciones").value) || 200);
    const tasaMutacion    = Math.min(0.6, (parseInt(document.getElementById("tasaMutacion").value)   || 15) / 100);
    const tasaCruce       = Math.min(1.0, (parseInt(document.getElementById("tasaCruce").value)      || 85) / 100);

    ejecutandoAG = true;
    const btn = document.getElementById("btnEjecutar");
    btn.disabled  = true;
    btn.innerHTML = `<span class="spinner"></span> Evolucionando...`;

    resetearVisualizacion();

    const progPanel = document.getElementById("progressPanel");
    const progLabel = document.getElementById("progressLabel");
    const progFill  = document.getElementById("progressBarFill");
    const progBest  = document.getElementById("progressBest");
    progPanel.style.display = "block";
    progFill.style.width    = "0%";

    marcadores[origenId].setIcon(iconoCiudad("origen"));
    marcadores[origenId].setZIndex(20);

    // ── Población inicial ─────────────────────────────────────────────
    let poblacion = Array.from({ length: tamPoblacion }, () => tourAleatorio(origenIdx));
    let fits      = poblacion.map(fitness);

    let mejorIdx  = fits.indexOf(Math.max(...fits));
    let mejorTour = [...poblacion[mejorIdx]];
    let mejorDist = distanciaTour(mejorTour);

    ultimoMejorTour = mejorTour;

    const historial = [mejorDist];
    const pasos     = [];

    // ── Paso inicial ─────────────────────────────────────────────────
    pasos.push(
        `<strong>Inicialización:</strong> ${tamPoblacion} permutaciones generadas. ` +
        `Distancias usan caminos mínimos reales (Dijkstra). ` +
        `Mejor inicial: <strong style="color:var(--accent)">${mejorDist.toFixed(1)} km</strong>`
    );

    const INTERVALO_VISUAL = Math.max(1, Math.floor(numGeneraciones / 40));

    // ── Bucle generacional asíncrono ─────────────────────────────────
    await new Promise(resolve => {
        let gen = 0;

        function paso() {
            if (gen >= numGeneraciones) { resolve(); return; }
            gen++;

            // Nueva generación
            const nuevaPob = [[...mejorTour]]; // elitismo

            while (nuevaPob.length < tamPoblacion) {
                const p1 = seleccionTorneo(poblacion, fits, 3);
                const p2 = seleccionTorneo(poblacion, fits, 3);

                let hijos = Math.random() < tasaCruce
                    ? cruceOX(p1, p2)
                    : [[...p1], [...p2]];

                hijos = hijos.map(h => mutacionSwap(h, tasaMutacion));
                hijos = hijos.map(h => mutacion2opt(h, tasaMutacion * 0.6));

                hijos.forEach(h => {
                    if (nuevaPob.length < tamPoblacion) nuevaPob.push(h);
                });
            }

            poblacion = nuevaPob;
            fits      = poblacion.map(fitness);

            const mIdx  = fits.indexOf(Math.max(...fits));
            const mDist = distanciaTour(poblacion[mIdx]);

            if (mDist < mejorDist) {
                mejorDist = mDist;
                mejorTour = [...poblacion[mIdx]];
                ultimoMejorTour = mejorTour;

                // Expandir el tour para el log intermedio también
                const rutaExpandidaLog = expandirTourEnIds(mejorTour);
                pasos.push(
                    `<strong>Gen ${gen}:</strong> ¡Nueva mejor ruta! ` +
                    `<strong style="color:var(--green)">${mejorDist.toFixed(1)} km</strong> — ` +
                    rutaExpandidaLog.map(id => CIUDADES[id].nombre).join(" → ")
                );
            } else if (gen % Math.max(1, Math.floor(numGeneraciones / 8)) === 0) {
                const avg = poblacion.reduce((s, t) => s + distanciaTour(t), 0) / tamPoblacion;
                pasos.push(
                    `<strong>Gen ${gen}:</strong> Mejor = ${mejorDist.toFixed(1)} km | ` +
                    `Promedio = ${avg.toFixed(1)} km`
                );
            }

            historial.push(mejorDist);

            // Actualizar UI cada INTERVALO_VISUAL generaciones
            if (gen % INTERVALO_VISUAL === 0 || gen === numGeneraciones) {
                progLabel.textContent = `Generación ${gen} / ${numGeneraciones}`;
                progFill.style.width  = Math.round(gen / numGeneraciones * 100) + "%";
                progBest.textContent  = `Mejor: ${mejorDist.toFixed(1)} km`;

                actualizarResultadoLive(mejorTour, mejorDist, gen);
                dibujarRutaTSP(mejorTour, "live");
                renderizarEvolucion(historial);

                requestAnimationFrame(paso);
            } else {
                paso();
            }
        }

        requestAnimationFrame(paso);
    });

    // ── Resultado final ──────────────────────────────────────────────
    // Expandir el tour final con todos los nodos intermedios reales
    const rutaFinalExpandida = expandirTourEnIds(ultimoMejorTour);

    pasos.push(
        `<strong style="color:var(--accent)">✓ Resultado final:</strong> ` +
        `${numGeneraciones} generaciones | ` +
        `<strong>${mejorDist.toFixed(1)} km</strong> totales | ` +
        `Ruta completa: ${rutaFinalExpandida.map(id => CIUDADES[id].nombre).join(" → ")}`
    );

    dibujarRutaTSP(ultimoMejorTour, "final");
    actualizarMarcadoresTSP(origenId, ultimoMejorTour);
    mostrarResultadoFinal(mejorDist, historial, pasos);
    ajustarBounds(ultimoMejorTour);

    progPanel.style.display = "none";
    mostrarChip(`✓ TSP: ${mejorDist.toFixed(1)} km — ${N} ciudades`);

    ejecutandoAG = false;
    btn.disabled = false;
    btn.innerHTML = `
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" width="18" height="18">
            <polygon points="5 3 19 12 5 21 5 3"/>
        </svg>
        Ejecutar Algoritmo Genético`;
}

/* ═══════════════════════════════════════════════════════════════════════
   8. HELPERS DE UI Y MAPA
═══════════════════════════════════════════════════════════════════════ */

function poblarSelectores() {
    const sel = document.getElementById("ciudadOrigen");
    CIUDAD_IDS.forEach(id => sel.appendChild(new Option(CIUDADES[id].nombre, id)));
}

function dibujarAristasGrafo() {
    const vistas = new Set();
    Object.entries(GRAFO).forEach(([origen, vecinos]) => {
        Object.entries(vecinos).forEach(([destino, km]) => {
            const clave = [origen, destino].sort().join("-");
            if (vistas.has(clave)) return;
            vistas.add(clave);

            const linea = new google.maps.Polyline({
                path: [CIUDADES[origen].coords, CIUDADES[destino].coords],
                geodesic: true,
                strokeColor: "#2a3560",
                strokeOpacity: 0.85,
                strokeWeight: 2,
                map: mapa,
            });

            const medio = {
                lat: (CIUDADES[origen].coords.lat + CIUDADES[destino].coords.lat) / 2,
                lng: (CIUDADES[origen].coords.lng + CIUDADES[destino].coords.lng) / 2,
            };
            const infoW = new google.maps.InfoWindow({
                content: `<div style="font-family:'DM Sans',sans-serif;font-size:12px;
                           color:#e8eaf0;background:#1e2230;padding:6px 10px;
                           border-radius:6px;border:1px solid #2a2f3e;">
                           ${CIUDADES[origen].nombre} ↔ ${CIUDADES[destino].nombre}<br>
                           <strong style="color:#f5a623">${km} km</strong></div>`,
            });
            linea.addListener("click", () => { infoW.setPosition(medio); infoW.open(mapa); });
            polylinesBG.push(linea);
        });
    });
}

function crearMarcador(id, ciudad) {
    const marker = new google.maps.Marker({
        position: ciudad.coords,
        map: mapa,
        title: ciudad.nombre,
        icon: iconoCiudad("ciudad"),
        label: {
            text: ciudad.nombre,
            color: "#e8eaf0",
            fontFamily: "'DM Sans', sans-serif",
            fontSize: "11px",
            fontWeight: "600",
        },
        labelOrigin: new google.maps.Point(12, 38),
    });

    const vecinosInfo = Object.entries(GRAFO[id] || {})
        .sort((a, b) => a[1] - b[1])
        .map(([vid, km]) => `${CIUDADES[vid].nombre}: ${km} km`)
        .join("<br>");

    const info = new google.maps.InfoWindow({
        content: `
          <div style="font-family:'DM Sans',sans-serif;font-size:13px;
               color:#e8eaf0;background:#1e2230;padding:10px 14px;
               border-radius:8px;border:1px solid #2a2f3e;min-width:160px">
            <strong style="font-size:14px">${ciudad.nombre}</strong><br>
            <span style="color:#7a8099;font-size:11px">
              ${ciudad.coords.lat.toFixed(4)}, ${ciudad.coords.lng.toFixed(4)}
            </span><br><br>
            <span style="color:#f5a623;font-size:11px;font-weight:600">CONEXIONES DIRECTAS</span><br>
            <span style="color:#7a8099;font-size:11px">${vecinosInfo || "—"}</span>
          </div>`,
    });

    marker.addListener("click", () => info.open(mapa, marker));
    marcadores[id] = marker;
}

function iconoCiudad(tipo) {
    const colores = { origen: "#4ade80", ruta: "#f5a623", ciudad: "#60a5fa" };
    const color   = colores[tipo] || colores.ciudad;
    return {
        path: google.maps.SymbolPath.CIRCLE,
        fillColor: color,
        fillOpacity: 1,
        strokeColor: "#ffffff",
        strokeWeight: 2.5,
        scale: tipo === "ciudad" ? 8 : 12,
    };
}

/**
 * Expande un tour de índices en coordenadas reales usando CAMINO[i][j].
 */
function expandirTourEnCoordenadas(tour) {
    const coords = [];
    for (let i = 0; i < tour.length; i++) {
        const a   = tour[i];
        const b   = tour[(i + 1) % tour.length];
        const seg = CAMINO[a][b];
        if (!seg) continue;
        for (let k = 0; k < seg.length - 1; k++) {
            coords.push(CIUDADES[seg[k]].coords);
        }
    }
    coords.push(CIUDADES[CIUDAD_IDS[tour[0]]].coords);
    return coords;
}

function dibujarRutaTSP(tour, modo = "final") {
    if (polylineRuta) { polylineRuta.setMap(null); polylineRuta = null; }

    const coords = expandirTourEnCoordenadas(tour);
    const esLive  = modo === "live";

    polylineRuta = new google.maps.Polyline({
        path: coords,
        geodesic: true,
        strokeColor:   esLive ? "#a78bfa" : "#f5a623",
        strokeOpacity: esLive ? 0.65 : 0.95,
        strokeWeight:  esLive ? 3 : 5,
        icons: esLive ? [] : [{
            icon: {
                path: google.maps.SymbolPath.FORWARD_CLOSED_ARROW,
                scale: 3.5,
                strokeColor: "#ffffff",
                strokeWeight: 1.5,
                fillColor: "#f5a623",
                fillOpacity: 1,
            },
            offset: "25%",
            repeat: "25%",
        }],
        map: mapa,
        zIndex: esLive ? 10 : 20,
    });
}

function actualizarMarcadoresTSP(origenId, tour) {
    CIUDAD_IDS.forEach(id => {
        const tipo = id === origenId ? "origen" : "ruta";
        marcadores[id].setIcon(iconoCiudad(tipo));
        marcadores[id].setZIndex(tipo === "origen" ? 20 : 10);
    });
}

function actualizarResultadoLive(tour, dist, gen) {
    document.getElementById("resultPanel").style.display = "block";
    document.getElementById("distanciaTotal").textContent   = dist.toFixed(1);
    document.getElementById("generacionMejora").textContent = gen;
    document.getElementById("fitnessValor").textContent     = (1 / dist).toExponential(3);

    // Expandir tour con nodos intermedios reales
    const rutaExpandida = expandirTourEnIds(tour);

    const rutaEl = document.getElementById("rutaTexto");
    rutaEl.innerHTML = rutaExpandida
        .map((cityId, i) => {
            const chip  = `<span class="city-chip">${CIUDADES[cityId].nombre}</span>`;
            const arrow = i < rutaExpandida.length - 1 ? `<span class="arrow">→</span>` : "";
            return chip + arrow;
        }).join("");
}

function mostrarResultadoFinal(dist, historial, pasos) {
    document.getElementById("distanciaTotal").textContent = dist.toFixed(1);
    document.getElementById("evolucionPanel").style.display = "block";
    renderizarEvolucion(historial);
    mostrarPasos(pasos);
}

function renderizarEvolucion(historial) {
    const canvas = document.getElementById("evolucionCanvas");
    const ctx    = canvas.getContext("2d");
    const w = canvas.width, h = canvas.height;
    ctx.clearRect(0, 0, w, h);
    if (historial.length < 2) return;

    const minD = Math.min(...historial);
    const maxD = Math.max(...historial);
    const rng  = maxD - minD || 1;
    const pad  = 12;

    ctx.fillStyle = "#161921"; ctx.fillRect(0, 0, w, h);
    ctx.strokeStyle = "#2a2f3e"; ctx.lineWidth = 1;
    ctx.beginPath();
    ctx.moveTo(pad, pad); ctx.lineTo(pad, h - pad); ctx.lineTo(w - pad, h - pad);
    ctx.stroke();

    // Área
    ctx.beginPath();
    historial.forEach((d, i) => {
        const x = pad + (i / (historial.length - 1)) * (w - 2*pad);
        const y = (h - pad) - ((d - minD) / rng) * (h - 2*pad);
        i === 0 ? ctx.moveTo(x, y) : ctx.lineTo(x, y);
    });
    ctx.lineTo(w - pad, h - pad); ctx.lineTo(pad, h - pad); ctx.closePath();
    ctx.fillStyle = "rgba(245,166,35,0.12)"; ctx.fill();

    // Línea
    ctx.beginPath(); ctx.strokeStyle = "#f5a623"; ctx.lineWidth = 2;
    historial.forEach((d, i) => {
        const x = pad + (i / (historial.length - 1)) * (w - 2*pad);
        const y = (h - pad) - ((d - minD) / rng) * (h - 2*pad);
        i === 0 ? ctx.moveTo(x, y) : ctx.lineTo(x, y);
    });
    ctx.stroke();

    ctx.fillStyle = "#7a8099"; ctx.font = "10px 'DM Sans', sans-serif";
    ctx.fillText(`${maxD.toFixed(0)} km`, pad + 2, pad + 10);
    ctx.fillText(`${minD.toFixed(0)} km`, pad + 2, h - pad - 2);
    ctx.fillText("Gen 0", pad, h - 2);
    ctx.fillText(`Gen ${historial.length - 1}`, w - 52, h - 2);
}

function mostrarPasos(pasos) {
    const panel = document.getElementById("stepsPanel");
    const lista = document.getElementById("stepsList");
    lista.innerHTML = "";
    pasos.forEach(p => {
        const li = document.createElement("li");
        li.innerHTML = p;
        lista.appendChild(li);
    });
    panel.style.display = "block";
    panel.scrollIntoView({ behavior: "smooth", block: "nearest" });
}

function mostrarChip(msg) {
    const chip = document.getElementById("mapChip");
    chip.textContent   = msg;
    chip.style.display = "block";
    clearTimeout(chip._t);
    chip._t = setTimeout(() => { chip.style.display = "none"; }, 5000);
}

function ajustarBounds(tour) {
    const bounds = new google.maps.LatLngBounds();
    tour.forEach(i => bounds.extend(CIUDADES[CIUDAD_IDS[i]].coords));
    mapa.fitBounds(bounds, { top: 60, right: 60, bottom: 60, left: 60 });
}

function resetearVisualizacion() {
    if (polylineRuta) { polylineRuta.setMap(null); polylineRuta = null; }
    Object.keys(marcadores).forEach(id => {
        marcadores[id].setIcon(iconoCiudad("ciudad"));
        marcadores[id].setZIndex(1);
    });
    document.getElementById("resultPanel").style.display    = "none";
    document.getElementById("stepsPanel").style.display     = "none";
    document.getElementById("evolucionPanel").style.display = "none";
}

function renderizarTablaGrafo() {
    const tabla   = document.getElementById("graphTable");
    const nombres = CIUDAD_IDS.map(id => CIUDADES[id].nombre);

    let html = "<tr><th></th>";
    nombres.forEach(n => { html += `<th>${n.substring(0, 4)}.</th>`; });
    html += "</tr>";

    CIUDAD_IDS.forEach((id, i) => {
        html += `<tr><th>${nombres[i].substring(0, 4)}.</th>`;
        CIUDAD_IDS.forEach((id2, j) => {
            if (i === j) {
                html += `<td class="no-edge">·</td>`;
            } else if (GRAFO[id]?.[id2] !== undefined) {
                html += `<td class="active-edge">${GRAFO[id][id2]}</td>`;
            } else {
                html += `<td class="no-edge">—</td>`;
            }
        });
        html += "</tr>";
    });

    tabla.innerHTML = html;
}