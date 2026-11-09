// Conquista d'Italia — mappa 3D low-poly (Three.js). Sito statico: legge italia.json e data.json (unica fonte: blocchi instagram/tiktok + battaglie del regista)
import * as THREE from "three";
import { MapControls } from "three/addons/controls/MapControls.js";
import { mergeGeometries } from "three/addons/utils/BufferGeometryUtils.js";

// ------------------------------------------------------------------ impostazioni
const PROFILI = { instagram: "https://www.instagram.com/conquistaditalia/" };
const TAG = "@conquistaditalia";
const EMPTY = "Nessuna casa ancora: commenta per essere il primo!";
const C = { sea: 0x8ec9e8, cliff: 0xd9b77a, gold: 0xffc928, wall: 0xffe2bf, roof: 0xd9573b, stone: 0xd8d2c4, red: 0xe5484d };
const LIV = ["casetta", "torre", "castello", "fortezza"];
const ROLE = ["Cittadino", "Re della città", "Fondatore"];
const $ = (s) => document.querySelector(s);
const fmt = (n) => (n ?? 0).toLocaleString("it-IT");
const nm = (s) => (s || "").split("/")[0];
const params = new URLSearchParams(location.search);
const PLAT = "instagram";   // una sola Italia: Instagram (TikTok non si mostra sul sito)

let GEO, ALL, D, REG, HOUSES = [], CITY = {}, COLORS = [];
const LON0 = 12.5, LAT0 = 42.0, KX = 111.32 * Math.cos(LAT0 * Math.PI / 180), KZ = 110.57;
const P = (lat, lon) => [(lon - LON0) * KX, (LAT0 - lat) * KZ];
const LAND_H = 3;

// ------------------------------------------------------------------ scena
const scene = new THREE.Scene();
scene.background = new THREE.Color(C.sea);
scene.fog = new THREE.Fog(0xbfe6f5, 1500, 5000);
const renderer = new THREE.WebGLRenderer({ antialias: true, powerPreference: "high-performance", preserveDrawingBuffer: true });
renderer.setPixelRatio(Math.min(devicePixelRatio, 2));
renderer.setSize(innerWidth, innerHeight);
renderer.shadowMap.enabled = true; renderer.shadowMap.type = THREE.PCFSoftShadowMap;
renderer.outputColorSpace = THREE.SRGBColorSpace;
$("#scene").appendChild(renderer.domElement);
const camera = new THREE.PerspectiveCamera(38, innerWidth / innerHeight, 0.3, 9000);
const controls = new MapControls(camera, renderer.domElement);
controls.enableDamping = true; controls.dampingFactor = 0.08; controls.screenSpacePanning = false;
controls.maxPolarAngle = 1.15; controls.minDistance = 3; controls.maxDistance = 3200;
controls.touches = { ONE: THREE.TOUCH.PAN, TWO: THREE.TOUCH.DOLLY_ROTATE };
scene.add(new THREE.HemisphereLight(0xfff6dc, 0x7aa35a, 1.25));
const sun = new THREE.DirectionalLight(0xfff1d0, 2.1);
sun.castShadow = true; sun.shadow.mapSize.set(2048, 2048); sun.shadow.bias = -0.0004; sun.shadow.normalBias = 0.3;
scene.add(sun, sun.target);
function fitStart() {
  const portrait = innerHeight > innerWidth, d = portrait ? 2700 : 1550;
  controls.target.set(portrait ? 10 : 60, 0, portrait ? 130 : 30);
  camera.position.set(controls.target.x, d * 0.82, controls.target.z + d * 0.55); controls.update();
}
addEventListener("resize", () => { camera.aspect = innerWidth / innerHeight; camera.updateProjectionMatrix(); renderer.setSize(innerWidth, innerHeight); });

// ------------------------------------------------------------------ utilità
function rng(seed) { let s = seed >>> 0 || 1; return () => ((s = (s * 1664525 + 1013904223) >>> 0) / 4294967296); }
function cityColor(i) { const h = (i * 137.508) % 360; return new THREE.Color().setHSL(h / 360, 0.72, (h > 40 && h < 200) ? 0.5 : 0.56); }
function pointInRing(x, z, r) { let inside = false; for (let i = 0, j = r.length - 1; i < r.length; j = i++) { const [xi, zi] = r[i], [xj, zj] = r[j]; if ((zi > z) !== (zj > z) && x < (xj - xi) * (z - zi) / (zj - zi) + xi) inside = !inside; } return inside; }
const LAND_RINGS = [];
const onLand = (x, z) => LAND_RINGS.some((r) => pointInRing(x, z, r));
const CITY_GRID = new Map();
function nearCity(x, z, pad) { const gx = Math.floor(x / 20), gz = Math.floor(z / 20); for (let dx = -1; dx <= 1; dx++) for (let dz = -1; dz <= 1; dz++) { const l = CITY_GRID.get((gx + dx) + "," + (gz + dz)); if (l) for (const c of l) if (Math.hypot(x - c.xz[0], z - c.xz[1]) < c.rad + pad) return true; } return false; }
const ease = (t) => t < .5 ? 4 * t * t * t : 1 - Math.pow(-2 * t + 2, 3) / 2;
const hhmm = (iso) => new Date(iso).toLocaleTimeString("it-IT", { hour: "2-digit", minute: "2-digit", timeZone: "Europe/Rome" });
function paint(g, color) { const c = new THREE.Color(color), a = []; for (let i = 0; i < g.attributes.position.count; i++) a.push(c.r, c.g, c.b); g.setAttribute("color", new THREE.Float32BufferAttribute(a, 3)); return g; }
function part(g, color, x = 0, y = 0, z = 0) { g = g.toNonIndexed(); g.translate(x, y, z); return paint(g, color); }

// ------------------------------------------------------------------ terra, mare, natura
function shapeOf(ring) { const s = new THREE.Shape(); ring.forEach(([x, z], i) => i ? s.lineTo(x, -z) : s.moveTo(x, -z)); return s; }
function buildLand() {
  const topMat = new THREE.MeshLambertMaterial({ vertexColors: true, flatShading: true });
  const sideMat = new THREE.MeshLambertMaterial({ color: C.cliff, flatShading: true });
  const shades = [0x9bd46a, 0x93cf62, 0xa6da74, 0x8fca5c, 0xa0d66d];
  GEO.regioni.forEach((reg, k) => reg.r.forEach((ring) => {
    LAND_RINGS.push(ring);
    const g = new THREE.ExtrudeGeometry(shapeOf(ring), { depth: LAND_H, bevelEnabled: false, curveSegments: 1 });
    g.rotateX(-Math.PI / 2); paint(g, shades[k % shades.length]);
    const m = new THREE.Mesh(g, [topMat, sideMat]); m.receiveShadow = true; scene.add(m);
    const pts = ring.map(([x, z]) => new THREE.Vector3(x, LAND_H + 0.08, z)); pts.push(pts[0]);
    scene.add(new THREE.Line(new THREE.BufferGeometry().setFromPoints(pts), new THREE.LineBasicMaterial({ color: 0x5e9a45 })));
  }));
  const near = new THREE.MeshLambertMaterial({ color: 0xc9dfb0, flatShading: true });
  GEO.vicini.forEach((ring) => {
    const g = new THREE.ExtrudeGeometry(shapeOf(ring), { depth: 1.5, bevelEnabled: false, curveSegments: 1 }); g.rotateX(-Math.PI / 2);
    const m = new THREE.Mesh(g, [near, new THREE.MeshLambertMaterial({ color: 0xd8c79c })]); m.receiveShadow = true; scene.add(m);
  });
  const sg = new THREE.PlaneGeometry(9000, 9000, 90, 90); sg.rotateX(-Math.PI / 2);
  const sea = new THREE.Mesh(sg, new THREE.MeshLambertMaterial({ color: C.sea, flatShading: true }));
  sea.position.y = -0.6; sea.receiveShadow = true; scene.add(sea);
}
function buildNature() {
  const r = rng(42), minX = -750, maxX = 750, minZ = -600, maxZ = 700;
  const m = new THREE.Matrix4(), q = new THREE.Quaternion(), s = new THREE.Vector3(), p = new THREE.Vector3(), col = new THREE.Color();
  const hills = new THREE.InstancedMesh(new THREE.IcosahedronGeometry(1, 0), new THREE.MeshLambertMaterial({ flatShading: true }), 1400);
  for (let n = 0; n < 1400;) {
    const x = minX + r() * (maxX - minX), z = minZ + r() * (maxZ - minZ);
    if (!onLand(x, z) || nearCity(x, z, 9)) continue;
    const alps = LAT0 - z / KZ > 45.85, R = 4 + r() * 9, Hh = alps ? 5 + r() * 10 : 0.8 + r() * 2.2;
    hills.setMatrixAt(n, m.compose(p.set(x, LAND_H - 0.5, z), q.setFromEuler(new THREE.Euler(0, r() * 6, 0)), s.set(R, Hh, R * (0.7 + r() * .5))));
    hills.setColorAt(n, col.set(alps && r() < .6 ? 0xe9eef2 : [0x86c056, 0x7db650, 0x92cc60][n % 3])); n++;
  }
  hills.castShadow = hills.receiveShadow = true; scene.add(hills);
  const crown = new THREE.ConeGeometry(1, 2.2, 6); crown.translate(0, 2.0, 0);
  const ball = new THREE.IcosahedronGeometry(1.05, 0); ball.translate(0, 1.9, 0);
  const trunk = new THREE.CylinderGeometry(0.22, 0.28, 1, 5); trunk.translate(0, 0.5, 0);
  const N = 5200;
  const tC = new THREE.InstancedMesh(crown, new THREE.MeshLambertMaterial({ flatShading: true }), N / 2);
  const tB = new THREE.InstancedMesh(ball, new THREE.MeshLambertMaterial({ flatShading: true }), N / 2);
  const tT = new THREE.InstancedMesh(trunk, new THREE.MeshLambertMaterial({ color: 0x8a5a33 }), N);
  let a = 0, b = 0, t = 0;
  while (t < N) {
    const x = minX + r() * (maxX - minX), z = minZ + r() * (maxZ - minZ);
    if (!onLand(x, z) || nearCity(x, z, 1.2)) continue;
    const sc = 0.55 + r() * 0.55; m.compose(p.set(x, LAND_H, z), q.identity(), s.set(sc, sc, sc)); tT.setMatrixAt(t++, m);
    if (t % 2) { tC.setMatrixAt(a, m); tC.setColorAt(a++, col.set([0x3f9a4a, 0x4fae52, 0x358a44][a % 3])); }
    else { tB.setMatrixAt(b, m); tB.setColorAt(b++, col.set([0x5cb85a, 0x6cc463, 0x4ca64e][b % 3])); }
  }
  [tC, tB, tT].forEach((o) => { o.castShadow = true; scene.add(o); });
}

// ------------------------------------------------------------------ città: torri e territori
let towerMesh, capMesh, discMesh;
const tM = new THREE.Matrix4(), tQ = new THREE.Quaternion(), tS = new THREE.Vector3(), tP = new THREE.Vector3();
const towerHeight = (h) => 2 + 1.25 * Math.sqrt(h);
const towerR = (h) => 0.45 + Math.min(0.9, h / 200);
function buildCities() {
  const N = D.citta.length;
  COLORS = D.citta.map((_, i) => cityColor(i));
  D.citta.forEach((c, i) => { c.i = i; c.xz = P(c.lat, c.lon); CITY[c.n] = c; });
  D.citta.forEach((c) => {
    c.oi = CITY[c.o] ? CITY[c.o].i : c.i; c.rad = 0.55 * Math.sqrt(c.h + 1) + 1.2;
    const k = Math.floor(c.xz[0] / 20) + "," + Math.floor(c.xz[1] / 20); if (!CITY_GRID.has(k)) CITY_GRID.set(k, []); CITY_GRID.get(k).push(c);
  });
  const tg = new THREE.CylinderGeometry(1, 1.15, 1, 8); tg.translate(0, 0.5, 0);
  towerMesh = new THREE.InstancedMesh(tg, new THREE.MeshLambertMaterial({ flatShading: true }), N);
  const cg = new THREE.CylinderGeometry(1.45, 1.45, 0.6, 8); cg.translate(0, 0.3, 0);
  capMesh = new THREE.InstancedMesh(cg, new THREE.MeshLambertMaterial({ flatShading: true }), N);
  discMesh = new THREE.InstancedMesh(new THREE.CylinderGeometry(1, 1, 0.25, 24), new THREE.MeshLambertMaterial({ transparent: true, opacity: 0.7 }), N);
  const col = new THREE.Color();
  D.citta.forEach((c, i) => {
    const [x, z] = c.xz, H = towerHeight(c.h), R = towerR(c.h);
    towerMesh.setMatrixAt(i, tM.compose(tP.set(x, LAND_H, z), tQ.identity(), tS.set(R, H, R)));
    capMesh.setMatrixAt(i, tM.compose(tP.set(x, LAND_H + H, z), tQ.identity(), tS.set(R, R, R)));
    discMesh.setMatrixAt(i, tM.compose(tP.set(x, LAND_H + 0.05, z), tQ.identity(), tS.set(c.rad, 1, c.rad)));
    towerMesh.setColorAt(i, i === 0 ? col.set(C.gold) : col.set(0xf4ead6));
    capMesh.setColorAt(i, i === 0 ? col.set(0xffdf5e) : COLORS[c.oi]);
    discMesh.setColorAt(i, COLORS[c.oi]);
  });
  [towerMesh, capMesh].forEach((o) => { o.castShadow = o.receiveShadow = true; scene.add(o); });
  discMesh.receiveShadow = true; scene.add(discMesh);
  const big = D.citta[0]; if (!big) return;
  const crownGroup = new THREE.Group();
  const gold = new THREE.MeshLambertMaterial({ color: C.gold, flatShading: true, emissive: 0x6b4a00 });
  const ring = new THREE.Mesh(new THREE.CylinderGeometry(2.4, 2.1, 1.4, 10, 1, true), gold); ring.position.y = 0.7; crownGroup.add(ring);
  for (let k = 0; k < 5; k++) {
    const a = k / 5 * Math.PI * 2;
    const sp = new THREE.Mesh(new THREE.ConeGeometry(0.55, 1.8, 5), gold); sp.position.set(Math.cos(a) * 2.2, 2.1, Math.sin(a) * 2.2); crownGroup.add(sp);
    const gem = new THREE.Mesh(new THREE.IcosahedronGeometry(0.42, 0), new THREE.MeshLambertMaterial({ color: [C.red, 0x4c8dff, 0x3ddc97][k % 3], flatShading: true }));
    gem.position.set(Math.cos(a) * 2.35, 0.75, Math.sin(a) * 2.35); crownGroup.add(gem);
  }
  const R = towerR(big.h); crownGroup.scale.setScalar(R * 0.9);
  crownGroup.position.set(big.xz[0], LAND_H + towerHeight(big.h) + R * 0.6, big.xz[1]);
  crownGroup.traverse((o) => (o.castShadow = true)); scene.add(crownGroup);
}
function setCityOwnerColor(ci, ownerIdx) {
  const col = COLORS[ownerIdx]; discMesh.setColorAt(ci, col); discMesh.instanceColor.needsUpdate = true;
  if (ci !== 0) { capMesh.setColorAt(ci, col); capMesh.instanceColor.needsUpdate = true; }
}

// ------------------------------------------------------------------ case: 4 livelli (casetta, torre, castello, fortezza)
function levelGeometry(l) {
  const W = C.wall, R = C.roof, S = C.stone, door = 0x8a5a33;
  if (l === 0) return mergeGeometries([part(new THREE.BoxGeometry(1, .8, .9), W, 0, .4), part(new THREE.BoxGeometry(.22, .38, .02), door, 0, .19, .46),
    part(new THREE.ConeGeometry(.82, .62, 4).rotateY(Math.PI / 4), R, 0, 1.11)]);
  if (l === 1) return mergeGeometries([part(new THREE.BoxGeometry(.8, 1.9, .8), W, 0, .95), part(new THREE.BoxGeometry(1, .25, 1), S, 0, 1.95),
    part(new THREE.ConeGeometry(.7, .9, 4).rotateY(Math.PI / 4), R, 0, 2.5), part(new THREE.BoxGeometry(.2, .4, .02), door, 0, .2, .41)]);
  const parts = [part(new THREE.BoxGeometry(1.5, 1, 1.3), S, 0, .5), part(new THREE.BoxGeometry(.7, 1.8, .7), W, 0, .9), part(new THREE.ConeGeometry(.6, .8, 4).rotateY(Math.PI / 4), R, 0, 2.2)];
  for (const [x, z] of [[-.75, -.65], [.75, -.65], [-.75, .65], [.75, .65]]) parts.push(part(new THREE.CylinderGeometry(.25, .28, 1.4, 6), S, x, .7, z), part(new THREE.ConeGeometry(.33, .5, 6), R, x, 1.65, z));
  if (l === 3) parts.push(part(new THREE.BoxGeometry(2.6, .55, .25), S, 0, .28, 1.2), part(new THREE.BoxGeometry(2.6, .55, .25), S, 0, .28, -1.2),
    part(new THREE.BoxGeometry(.25, .55, 2.6), S, 1.2, .28, 0), part(new THREE.BoxGeometry(.25, .55, 2.6), S, -1.2, .28, 0),
    part(new THREE.CylinderGeometry(.03, .03, 1, 4), 0xffffff, 0, 3.1, 0), part(new THREE.BoxGeometry(.5, .3, .02), C.red, .25, 3.45, 0));
  return mergeGeometries(parts);
}
const houseMeshes = [];
function buildHouses() {
  const by = [[], [], [], []]; HOUSES.forEach((h, i) => by[h.l].push(i));
  const r = rng(9), col = new THREE.Color();
  by.forEach((ids, l) => {
    if (!ids.length) return;
    const mesh = new THREE.InstancedMesh(levelGeometry(l), new THREE.MeshLambertMaterial({ vertexColors: true, flatShading: true }), ids.length);
    ids.forEach((i, k) => {
      const h = HOUSES[i]; const [x, z] = P(h.lat, h.lon); h.x = x; h.z = z;
      const sc = [0.72, 0.62, 0.55, 0.52][l] * (h.role ? 1.15 : 1);
      mesh.setMatrixAt(k, tM.compose(tP.set(x, LAND_H, z), tQ.setFromEuler(new THREE.Euler(0, r() * Math.PI * 2, 0)), tS.set(sc, sc, sc)));
      mesh.setColorAt(k, h.role === 2 ? col.set(0xffe066) : col.set(0xffffff));
    });
    mesh.castShadow = mesh.receiveShadow = true; mesh.userData.ids = ids; scene.add(mesh); houseMeshes.push(mesh);
  });
}

// ------------------------------------------------------------------ etichette delle città (toccabili)
const labelEls = [];
function buildLabels() {
  const box = $("#labels");
  D.citta.slice(0, 60).forEach((c, k) => {
    const el = document.createElement("div"); el.className = "lbl " + (k < 6 ? "big" : k < 20 ? "mid" : "sm");
    el.innerHTML = `${nm(c.n)}<small>${fmt(c.h)} case${c.o !== c.n ? " · di " + nm(c.o) : ""}</small>`;
    el.addEventListener("click", () => focusCity(c));
    box.appendChild(el); labelEls.push({ el, c, k });
  });
}
const v3 = new THREE.Vector3();
function updateLabels() {
  const dist = camera.position.distanceTo(controls.target);
  const maxRank = dist > 1800 ? 6 : dist > 900 ? 12 : dist > 400 ? 25 : 60;
  for (const { c, k, el } of labelEls) {
    if (k >= maxRank) { el.style.display = "none"; continue; }
    v3.set(c.xz[0], LAND_H + towerHeight(c.h) + 3, c.xz[1]).project(camera);
    if (v3.z > 1 || Math.abs(v3.x) > 1.1 || Math.abs(v3.y) > 1.1) { el.style.display = "none"; continue; }
    el.style.display = "block"; el.style.left = ((v3.x + 1) / 2 * innerWidth) + "px"; el.style.top = ((1 - v3.y) / 2 * innerHeight) + "px";
  }
}

// ------------------------------------------------------------------ fumetto, faro, volo della camera
let bubbleAt = null, beacon, focused = null;
function showBubble(html, pos) { const b = $("#bubble"); b.innerHTML = html; b.hidden = false; b.style.display = "block"; bubbleAt = pos; }
function hideBubble() { const b = $("#bubble"); b.hidden = true; b.style.display = "none"; bubbleAt = null; if (beacon) beacon.visible = false; focused = null; $("#btnStory").hidden = true; }
function updateBubble() {
  if (!bubbleAt) return; v3.copy(bubbleAt).project(camera); const b = $("#bubble");
  if (v3.z > 1) { b.style.display = "none"; return; }
  b.style.display = "block"; b.style.left = ((v3.x + 1) / 2 * innerWidth) + "px"; b.style.top = ((1 - v3.y) / 2 * innerHeight) + "px";
}
function makeBeacon() {
  beacon = new THREE.Group();
  const beam = new THREE.Mesh(new THREE.CylinderGeometry(0.35, 0.35, 60, 12, 1, true), new THREE.MeshBasicMaterial({ color: C.gold, transparent: true, opacity: 0.45, depthWrite: false }));
  beam.position.y = 30; beacon.add(beam);
  const ring = new THREE.Mesh(new THREE.TorusGeometry(1.2, 0.18, 6, 24), new THREE.MeshBasicMaterial({ color: C.gold }));
  ring.rotation.x = Math.PI / 2; ring.position.y = 0.3; beacon.add(ring); beacon.userData = { ring, beam };
  beacon.visible = false; scene.add(beacon);
}
let fly = null;
function flyTo(x, z, dist, ms = 1700, ty = 0) {
  const dir = new THREE.Vector3(0, 0.78, 0.62).normalize();
  const t1 = new THREE.Vector3(x, LAND_H + ty, z), p1 = t1.clone().add(dir.multiplyScalar(dist));
  fly = { t0: controls.target.clone(), p0: camera.position.clone(), t1, p1, hop: camera.position.distanceTo(p1) * 0.25, start: performance.now(), ms };
}
function stepFly(now) {
  if (!fly) return; const k = Math.min(1, (now - fly.start) / fly.ms), e = ease(k);
  controls.target.lerpVectors(fly.t0, fly.t1, e); camera.position.lerpVectors(fly.p0, fly.p1, e); camera.position.y += Math.sin(Math.PI * k) * fly.hop;
  if (k >= 1) fly = null;
}
const lvHtml = (l) => `<span class="lv l${l}">${LIV[l]}</span>`;
function setUrl(q) { try { history.replaceState(null, "", `?p=${PLAT}${q ? "&cerca=" + encodeURIComponent(q) : ""}`); } catch (_) {} }
function focusHouse(i) {
  const h = HOUSES[i], c = D.citta[h.ci]; focused = i;
  flyTo(h.x, h.z, 15, 1700, 0.6);
  beacon.position.set(h.x, LAND_H, h.z); beacon.visible = true; beacon.userData.beam.visible = true;
  showBubble(`@${h.u} · ${nm(c.n)}<br><small>${lvHtml(h.l)} ${fmt(h.p)} punti${h.role ? ` · <b>${ROLE[h.role]}</b>` : ""}</small>`, new THREE.Vector3(h.x, LAND_H + 2.4, h.z));
  $("#btnStory").hidden = false; setSheet("peek"); setUrl("@" + h.u);
}
function focusCity(c, openCard = true) {
  focused = null; $("#btnStory").hidden = true;
  const dist = 16 + c.rad * 3.2 + towerHeight(c.h) * 1.5;
  flyTo(c.xz[0], c.xz[1] + (openCard && innerWidth < 900 ? dist * 0.12 : 0), dist, 1700, towerHeight(c.h) * 0.75);
  beacon.position.set(c.xz[0], LAND_H, c.xz[1]); beacon.visible = true; beacon.userData.beam.visible = false;
  showBubble(`${nm(c.n)} · ${fmt(c.h)} case`, new THREE.Vector3(c.xz[0], LAND_H + towerHeight(c.h) + 2, c.xz[1]));
  if (openCard) { cityCard = c; renderPanel(); setSheet("half"); $("#panel").scrollTop = 0; }
  setUrl(nm(c.n));
}

// ------------------------------------------------------------------ ricerca "Trova la tua casa"
function norm(s) { return (s || "").normalize("NFD").replace(/[̀-ͯ]/g, "").toLowerCase().replace(/[^a-z0-9_.@ ]/g, "").trim(); }
let suggItems = [], suggAct = -1;
function search(qs) {
  const raw = norm(qs), q = raw.replace(/^@/, ""); if (!q) return [];
  const out = [];
  for (let i = 0; i < HOUSES.length && out.length < 40; i++) { const u = HOUSES[i].un; if (u.startsWith(q)) out.push({ t: "h", i, s: u === q ? 0 : 2 }); }
  if (!raw.startsWith("@")) for (const c of D.citta) { const n = norm(c.n); if (n.startsWith(q) || (q.length > 3 && n.includes(q))) out.push({ t: "c", c, s: n === q ? 0 : 1 }); if (out.length > 60) break; }
  return out.sort((a, b) => a.s - b.s).slice(0, 7);
}
function renderSugg() {
  $("#sugg").innerHTML = suggItems.map((it, k) => it.t === "c"
    ? `<li data-k="${k}" class="${k === suggAct ? "act" : ""}">🏙️ ${nm(it.c.n)}<small>${fmt(it.c.h)} case</small></li>`
    : `<li data-k="${k}" class="${k === suggAct ? "act" : ""}">🏠 @${HOUSES[it.i].u}<small>${nm(D.citta[HOUSES[it.i].ci].n)} · ${fmt(HOUSES[it.i].p)} pt</small></li>`).join("");
  $("#sugg").classList.toggle("on", suggItems.length > 0);
}
function pick(it) { $("#sugg").classList.remove("on"); $("#q").blur(); it.t === "c" ? focusCity(it.c) : focusHouse(it.i); }
$("#q").addEventListener("input", (e) => { suggItems = search(e.target.value); suggAct = -1; renderSugg(); });
$("#q").addEventListener("keydown", (e) => {
  if (e.key === "ArrowDown") { suggAct = Math.min(suggItems.length - 1, suggAct + 1); renderSugg(); e.preventDefault(); }
  if (e.key === "ArrowUp") { suggAct = Math.max(0, suggAct - 1); renderSugg(); e.preventDefault(); }
});
$("#search").addEventListener("submit", (e) => { e.preventDefault(); const it = suggItems[Math.max(0, suggAct)]; if (it) pick(it); else toast(`Non trovo <b>${$("#q").value}</b><br>Commenta l'ultimo video con la tua città per prendere casa`); });
$("#sugg").addEventListener("pointerdown", (e) => { const li = e.target.closest("li"); if (li) { e.preventDefault(); pick(suggItems[+li.dataset.k]); } });
function toast(html, ms = 2800) { const t = $("#toast"); t.innerHTML = html; t.hidden = false; clearTimeout(toast.h); toast.h = setTimeout(() => (t.hidden = true), ms); }

// ------------------------------------------------------------------ tocco: tap su casa/città, doppio tap per avvicinarsi
const ray = new THREE.Raycaster(), ndc = new THREE.Vector2();
let downAt = null, lastTap = 0;
renderer.domElement.addEventListener("pointerdown", (e) => { downAt = [e.clientX, e.clientY, performance.now()]; });
renderer.domElement.addEventListener("pointerup", (e) => {
  if (!downAt || Math.hypot(e.clientX - downAt[0], e.clientY - downAt[1]) > 8 || performance.now() - downAt[2] > 400) return;
  ndc.set(e.clientX / innerWidth * 2 - 1, -e.clientY / innerHeight * 2 + 1); ray.setFromCamera(ndc, camera);
  const now = performance.now();
  if (now - lastTap < 320) {
    const hit = ray.intersectObjects(scene.children, false).find((h) => h.point.y > -0.2);
    if (hit) flyTo(hit.point.x, hit.point.z, Math.max(8, camera.position.distanceTo(controls.target) * 0.4), 900);
    lastTap = 0; return;
  }
  lastTap = now;
  const hit = ray.intersectObjects([...houseMeshes, towerMesh, capMesh, discMesh].filter(Boolean), false)[0];
  if (!hit) { hideBubble(); return; }
  if (houseMeshes.includes(hit.object)) focusHouse(hit.object.userData.ids[hit.instanceId]);
  else focusCity(D.citta[hit.instanceId]);
});

// ------------------------------------------------------------------ pannelli: scheda città, classifiche, notizie, regole
function setSheet(s) { $("#sheet").className = s; }
$("#handle").addEventListener("click", () => setSheet($("#sheet").classList.contains("peek") ? "half" : "peek"));
let tab = "citta", cityCard = null;
function selectTab(t) { tab = t; cityCard = null; [...$("#tabs").children].forEach((x) => x.classList.toggle("on", x.dataset.t === t)); renderPanel(); }
$("#tabs").addEventListener("click", (e) => { const b = e.target.closest("button"); if (!b) return; selectTab(b.dataset.t); if ($("#sheet").classList.contains("peek")) setSheet("half"); });
const sw = (i) => `<span class="sw" style="background:#${COLORS[i].getHexString()}"></span>`;
const ICON = { attacco: "⚔️", fondatore: "👑", casa: "🏠", rinforzi: "👥", livello: "⬆️", storia: "📸" };
function cityHtml(c) {
  const owner = c.o !== c.n ? `<div class="meta">⚔️ conquistata da <b>${nm(c.o)}</b></div>` : `<div class="meta">${c.r} · ${c.t} ${c.t === 1 ? "territorio" : "territori"}</div>`;
  const atk = (c.next || []).map((n) => `<button class="atk" data-city="${n}">⚔️ ${nm(n)}</button>`).join("") || `<span class="mute">${c.o !== c.n ? "Una città conquistata non attacca" : "Nessuna città più piccola confinante"}</span>`;
  return `<div class="card"><button class="back" data-back>← classifica</button><h3>${nm(c.n)}</h3>${owner}
    <div class="kv"><div><b>${fmt(c.h)}</b><small>case</small></div><div><b>${fmt(c.p)}</b><small>punti</small></div><div><b>${c.t}</b><small>territori</small></div></div>
    <div class="who">${c.f ? `<span data-user="${c.f}">👑 Fondatore @${c.f}</span>` : ""}${c.re ? `<span data-user="${c.re}">🤴 Re @${c.re}</span>` : ""}</div>
    <b>Prossime città da attaccare</b><div class="chips">${atk}</div>
    <b>Chi abita qui</b><div class="chips">${(c.u || []).map((u) => `<button data-user="${u}">@${u}</button>`).join("")}${c.h > (c.u || []).length ? `<span class="mute">e altri ${c.h - c.u.length}</span>` : ""}</div></div>`;
}
function renderPanel() {
  const el = $("#panel");
  const demo = D.demo ? `<span class="demo">DATI DI PROVA: la mappa vera parte con i primi commenti</span>` : "";
  const vuoto = `<p class="empty">🏠 ${EMPTY}<br><button class="btn primary" onclick="document.querySelector('#dlgAdd').showModal()">Come prendo casa</button></p>`;
  if (cityCard) el.innerHTML = cityHtml(cityCard);
  else if (["citta", "giocatori", "notizie"].includes(tab) && !(tab === "notizie" ? D.notizie : tab === "giocatori" ? D.giocatori : D.citta).length) el.innerHTML = vuoto;
  else if (tab === "citta") el.innerHTML = demo + `<ol class="list">` + D.citta.slice(0, 100).map((c, i) => `<li data-c="${i}"><span class="n">${i + 1}</span>${sw(c.oi)}<span>${nm(c.n)}<span class="sub">${c.o !== c.n ? "conquistata da " + nm(c.o) : c.r}</span></span><span class="r">${fmt(c.h)} case<small>${c.t} territori</small></span></li>`).join("") + `</ol>`;
  else if (tab === "giocatori") el.innerHTML = demo + `<ol class="list">` + D.giocatori.slice(0, 100).map((g, i) => `<li data-user="${g.u}"><span class="n">${i + 1}</span>${sw(CITY[g.c] ? CITY[g.c].oi : 0)}<span>@${g.u}<span class="sub">${nm(g.c)} · ${LIV[g.l]}</span></span><span class="r">${fmt(g.p)}<small>punti</small></span></li>`).join("") + `</ol>`;
  else if (tab === "notizie") el.innerHTML = demo + `<ol class="list news">` + D.notizie.map((n) => { const a = n.t.split(" attacca ")[0]; return `<li ${CITY[a] ? `data-city="${a}"` : ""}><span class="n">${ICON[n.k] || "•"}</span><span>${n.t}</span><span class="r"><small>${hhmm(n.ts)}</small></span></li>`; }).join("") + `</ol>`;
  else if (tab === "regole") {
    const p = REG.punti, L = REG.livelli;
    el.innerHTML = `<div class="rules"><p>🏠 <b>Commenta un nostro video con la tua città</b> (“Bari” oppure “Santeramo in Colle, Puglia”): prendi casa lì.</p>
      <table class="ptable"><tr><td>💬 Commento con la città (uno per video)</td><td>+${p.commento}</td></tr><tr><td>👥 Ogni amico taggato</td><td>+${p.amico}</td></tr>
      <tr><td>🏠 Un amico che hai taggato prende casa</td><td>+${p.amico_casa}</td></tr><tr><td>📸 Storia con la tua casa e il tag ${TAG}</td><td>+${p.storia}</td></tr></table>
      <p>⬆️ La casa cresce: ${L.map((l) => `${l.nome} (${l.da})`).join(" → ")} punti.</p>
      <p>👑 Il primo del comune è il <b>Fondatore</b>. Chi ha più punti è il <b>Re della città</b>.</p>
      <p>⚔️ <b>Ogni sera alle 21 le città più grandi invadono le vicine</b>: ogni città prende il territorio confinante più debole di una città più piccola.</p>
      <p class="mute">Gioco per divertimento, nessun premio in denaro. Aggiornato alle ${hhmm(D.aggiornato)}.</p></div>`;
  } else {
    el.innerHTML = `<div class="rules"><p>🏪 <b>Il tuo negozio sulla mappa</b>: la tua attività compare come edificio speciale nella tua città.</p>
      <form class="shop" id="shop"><input name="attivita" placeholder="Nome dell'attività" required><input name="citta" placeholder="Città" required><input name="contatto" placeholder="Telefono, email o @profilo" required>
      <button class="btn primary">Voglio comparire sulla mappa</button></form><p class="mute" id="shopMsg"></p></div>`;
    $("#shop").addEventListener("submit", submitShop);
  }
}
$("#panel").addEventListener("click", (e) => {
  const t = e.target.closest("[data-back],[data-c],[data-user],[data-city]"); if (!t) return;
  if (t.dataset.back !== undefined) { cityCard = null; renderPanel(); return; }
  if (t.dataset.c) return focusCity(D.citta[+t.dataset.c]);
  if (t.dataset.city && CITY[t.dataset.city]) return focusCity(CITY[t.dataset.city]);
  if (t.dataset.user) { const i = HOUSES.findIndex((h) => h.u === t.dataset.user); if (i >= 0) focusHouse(i); }
});
async function submitShop(e) {
  e.preventDefault(); const fd = new FormData(e.target); fd.append("form-name", "negozio"); let ok = false;
  try { const r = await fetch("/", { method: "POST", headers: { "Content-Type": "application/x-www-form-urlencoded" }, body: new URLSearchParams(fd).toString() }); ok = r.ok && location.hostname.endsWith("netlify.app"); } catch (_) {}
  const testo = `Ciao! Vorrei il mio negozio sulla mappa: ${fd.get("attivita")} a ${fd.get("citta")}. Contatto: ${fd.get("contatto")}`;
  e.target.reset();
  $("#shopMsg").innerHTML = ok ? "Grazie! Ti ricontattiamo noi." : `Grazie! Ultimo passo: <a href="${PROFILI[PLAT]}" target="_blank" rel="noopener">mandaci un messaggio</a> con questo testo:<br><code>${testo.replace(/</g, "&lt;")}</code>`;
}
$("#btnAdd").addEventListener("click", () => $("#dlgAdd").showModal());
document.querySelectorAll("[data-close]").forEach((b) => b.addEventListener("click", () => b.closest("dialog").close()));

// ------------------------------------------------------------------ conto alla rovescia, notizie in diretta
function tick() {
  const it = new Date(new Date().toLocaleString("en-US", { timeZone: "Europe/Rome" }));
  const tgt = new Date(it); tgt.setHours(21, 0, 0, 0); if (it >= tgt) tgt.setDate(tgt.getDate() + 1);
  let s = Math.floor((tgt - it) / 1000); const h = Math.floor(s / 3600); s -= h * 3600; const m = Math.floor(s / 60); s -= m * 60;
  $("#cd").textContent = [h, m, s].map((x) => String(x).padStart(2, "0")).join(":");
}
setInterval(tick, 1000); tick();
let tickI = 0;
function rotateNews() { if (!D || !D.notizie.length) return; const n = D.notizie[tickI++ % Math.min(20, D.notizie.length)]; $("#tickText").textContent = `${ICON[n.k] || ""} ${n.t}`; }
$("#ticker").addEventListener("click", () => { selectTab("notizie"); setSheet("half"); });

// ------------------------------------------------------------------ selettore Instagram / TikTok (due Italie)
document.querySelectorAll("#platform button").forEach((b) => {
  b.classList.toggle("on", b.dataset.p === PLAT);
  b.addEventListener("click", () => { if (b.dataset.p === PLAT) return; try { localStorage.setItem("piattaforma", b.dataset.p); } catch (_) {} location.search = `?p=${b.dataset.p}`; });
});

// ------------------------------------------------------------------ "Metti la tua casa nella storia": immagine 9:16
function roundRect(g, x, y, w, h, r) { g.beginPath(); g.moveTo(x + r, y); g.arcTo(x + w, y, x + w, y + h, r); g.arcTo(x + w, y + h, x, y + h, r); g.arcTo(x, y + h, x, y, r); g.arcTo(x, y, x + w, y, r); g.closePath(); }
function strokeText(g, txt, x, y, size, fill, stroke = "#1a1a1a", lw) {
  g.font = `800 ${size}px "Baloo 2", system-ui`; g.textAlign = "center"; g.lineJoin = "round";
  g.lineWidth = lw || size * 0.2; g.strokeStyle = stroke; g.strokeText(txt, x, y); g.fillStyle = fill; g.fillText(txt, x, y);
}
function fitSize(g, txt, max, size) { g.font = `800 ${size}px "Baloo 2"`; while (g.measureText(txt).width > max && size > 40) { size -= 4; g.font = `800 ${size}px "Baloo 2"`; } return size; }
async function makeStory() {
  if (focused == null) return;
  const h = HOUSES[focused], c = D.citta[h.ci], W = 1080, H = 1920;
  const saveT = controls.target.clone(), saveP = camera.position.clone(), aspect = camera.aspect, ratio = renderer.getPixelRatio();
  // inquadratura dedicata alla casa, senza fumetto, e scatto del 3D
  renderer.setPixelRatio(1); renderer.setSize(W, H, false); camera.aspect = W / H; camera.updateProjectionMatrix();
  controls.target.set(h.x, LAND_H + 0.9, h.z); camera.position.set(h.x + 3.6, LAND_H + 6.5, h.z + 10.5); camera.lookAt(controls.target);
  beacon.userData.beam.visible = false;
  const sc = sun.shadow.camera; sc.left = -25; sc.right = 25; sc.top = 25; sc.bottom = -25; sc.far = 150; sc.updateProjectionMatrix();
  sun.target.position.copy(controls.target); sun.position.copy(controls.target).add(new THREE.Vector3(-0.45, 1, 0.35).multiplyScalar(55));
  renderer.render(scene, camera);
  const cv = document.createElement("canvas"); cv.width = W; cv.height = H; const g = cv.getContext("2d");
  g.drawImage(renderer.domElement, 0, 0, W, H);
  renderer.setPixelRatio(ratio); renderer.setSize(innerWidth, innerHeight); camera.aspect = aspect; camera.updateProjectionMatrix();
  controls.target.copy(saveT); camera.position.copy(saveP); beacon.userData.beam.visible = true; sc.right = 0;
  await document.fonts.load('800 80px "Baloo 2"');
  let grd = g.createLinearGradient(0, 0, 0, 600); grd.addColorStop(0, "rgba(142,201,232,.95)"); grd.addColorStop(1, "rgba(142,201,232,0)"); g.fillStyle = grd; g.fillRect(0, 0, W, 600);
  grd = g.createLinearGradient(0, H - 780, 0, H); grd.addColorStop(0, "rgba(255,253,246,0)"); grd.addColorStop(.35, "rgba(255,253,246,.92)"); grd.addColorStop(1, "rgba(255,253,246,1)"); g.fillStyle = grd; g.fillRect(0, H - 780, W, 780);
  strokeText(g, "CONQUISTA D'ITALIA", W / 2, 190, 92, "#FFC928");
  strokeText(g, "ho preso casa a", W / 2, 292, 58, "#ffffff");
  const city = nm(c.n).toUpperCase(); strokeText(g, city, W / 2, 410, fitSize(g, city, 980, 124), "#FFC928");
  const handle = "@" + h.u; strokeText(g, handle, W / 2, H - 470, fitSize(g, handle, 960, 110), "#ffffff");
  g.font = '800 52px "Baloo 2"'; const badge = `${LIV[h.l].toUpperCase()} · ${fmt(h.p)} PUNTI${h.role ? " · " + ROLE[h.role].toUpperCase() : ""}`;
  const bw = Math.min(1020, g.measureText(badge).width + 70); roundRect(g, (W - bw) / 2, H - 420, bw, 92, 30); g.fillStyle = "#FFC928"; g.fill(); g.lineWidth = 7; g.strokeStyle = "#1a1a1a"; g.stroke();
  g.fillStyle = "#1a1a1a"; g.textAlign = "center"; g.fillText(badge, W / 2, H - 357);
  strokeText(g, `tagga ${TAG}`, W / 2, H - 228, 66, "#e5484d", "#ffffff", 14);
  g.font = '700 44px "Baloo 2"'; g.fillStyle = "#1d2a17"; g.fillText("trova la tua casa sulla mappa: link in bio", W / 2, H - 148);
  const blob = await new Promise((r) => cv.toBlob(r, "image/png")), url = URL.createObjectURL(blob);
  $("#storyImg").src = url; $("#storyDl").href = url; $("#storyDl").download = `casa-${h.u}.png`;
  $("#storyShare").onclick = async () => {
    const file = new File([blob], `casa-${h.u}.png`, { type: "image/png" });
    if (navigator.canShare && navigator.canShare({ files: [file] })) { try { await navigator.share({ files: [file], text: `La mia casa a ${nm(c.n)} su Conquista d'Italia ${TAG}` }); } catch (_) {} }
    else $("#storyDl").click();
  };
  $("#dlgStory").showModal();
}
$("#btnStory").addEventListener("click", makeStory);

// ------------------------------------------------------------------ battaglia di ieri: frecce e bandiere
let replay = null;
const replayGroup = new THREE.Group(); scene.add(replayGroup);
function flagMesh(color) {
  const g = new THREE.Group();
  const pole = new THREE.Mesh(new THREE.CylinderGeometry(0.12, 0.12, 6, 5), new THREE.MeshLambertMaterial({ color: 0xffffff })); pole.position.y = 3; g.add(pole);
  const cloth = new THREE.Mesh(new THREE.PlaneGeometry(3, 1.9, 4, 1), new THREE.MeshLambertMaterial({ color, side: THREE.DoubleSide, flatShading: true }));
  cloth.position.set(1.5, 5, 0); g.add(cloth); g.userData.cloth = cloth; return g;
}
function startReplay() {
  const bt = ((ALL.battaglie || {})[PLAT] || []).slice(-1)[0];
  const src = bt && bt.conquiste && bt.conquiste.length ? bt.conquiste.map((m) => ({ ...m, da: m.da || (D.conquiste.find((x) => x.territorio === m.territorio) || {}).da || m.territorio })) : (D.conquiste || []);
  const list = src.filter((m) => CITY[m.a] && CITY[m.territorio]).slice(0, 18);
  if (!list.length) { toast("Nessuna battaglia ancora: <b>la prima è alle 21</b>"); return; }
  setSheet("peek"); hideBubble(); replayGroup.clear();
  list.forEach((m) => { const c = CITY[m.territorio]; setCityOwnerColor(c.i, CITY[m.da] ? CITY[m.da].i : c.i); });
  flyTo(20, 120, 2300, 1200);
  replay = { list, start: performance.now() + 1300, done: new Set(), arrows: [] };
  toast(`Battaglia ${bt ? bt.turno : D.turno}: <b>${src.length} invasioni</b>`);
}
$("#btnReplay").addEventListener("click", startReplay);
function stepReplay(now) {
  if (!replay) return; const per = 650;
  replay.list.forEach((m, k) => {
    const t = (now - replay.start - k * per) / 900; if (t < 0) return;
    const A = CITY[m.a], B = CITY[m.territorio];
    if (!replay.arrows[k]) {
      const a = new THREE.Vector3(A.xz[0], LAND_H + towerHeight(A.h), A.xz[1]), b = new THREE.Vector3(B.xz[0], LAND_H + 2, B.xz[1]);
      const mid = a.clone().lerp(b, .5); mid.y += 25 + a.distanceTo(b) * 0.8;
      const curve = new THREE.QuadraticBezierCurve3(a, mid, b), mat = new THREE.MeshLambertMaterial({ color: C.red, emissive: 0x551010 });
      const tube = new THREE.Mesh(new THREE.TubeGeometry(curve, 40, 3.2, 6), mat), head = new THREE.Mesh(new THREE.ConeGeometry(7, 15, 6), mat);
      replayGroup.add(tube, head); replay.arrows[k] = { tube, head, curve };
    }
    const ar = replay.arrows[k], p = Math.min(1, t);
    ar.tube.geometry.setDrawRange(0, Math.floor(p * 40) * 36);
    ar.head.position.copy(ar.curve.getPoint(p)); ar.head.quaternion.setFromUnitVectors(new THREE.Vector3(0, 1, 0), ar.curve.getTangent(p));
    if (t >= 1 && !replay.done.has(k)) {
      replay.done.add(k); setCityOwnerColor(B.i, A.i);
      const fl = flagMesh(COLORS[A.i]); fl.position.set(B.xz[0], LAND_H, B.xz[1]); fl.scale.setScalar(5); replayGroup.add(fl); ar.head.visible = false;
      $("#tickText").textContent = `⚔️ ${nm(m.a)} attacca ${nm(m.territorio)}`;
    }
  });
  if (replay.done.size === replay.list.length && now - replay.start > replay.list.length * per + 3500) replay = null;
}

// ------------------------------------------------------------------ ciclo
function loop(now) {
  requestAnimationFrame(loop);
  stepFly(now); stepReplay(now); controls.update();
  const dist = camera.position.distanceTo(controls.target);
  scene.fog.near = dist * 1.4; scene.fog.far = dist * 4.5;
  const sz = Math.min(900, Math.max(25, dist * 0.9)), sc = sun.shadow.camera;
  if (Math.abs(sc.right - sz) > 1) { sc.left = -sz; sc.right = sz; sc.top = sz; sc.bottom = -sz; sc.near = 1; sc.far = sz * 6; sc.updateProjectionMatrix(); }
  sun.target.position.copy(controls.target); sun.position.copy(controls.target).add(new THREE.Vector3(-0.45, 1, 0.35).multiplyScalar(sz * 2.2));
  if (beacon && beacon.visible) { const s = 1 + 0.25 * Math.sin(now / 200); beacon.userData.ring.scale.set(s, s, s); }
  replayGroup.children.forEach((o) => { if (o.userData.cloth) o.userData.cloth.rotation.y = Math.sin(now / 300 + o.position.x) * 0.25; });
  renderer.render(scene, camera); updateLabels(); updateBubble();
}

// ------------------------------------------------------------------ avvio: prima la mappa, poi le case
(async function init() {
  $("#igLink").href = PROFILI[PLAT]; $("#igLink").textContent = PLAT === "tiktok" ? "Apri TikTok" : "Apri Instagram";
  const v = "?v=" + Math.floor(Date.now() / 300000);
  [GEO, ALL] = await Promise.all([fetch("italia.json").then((r) => r.json()), fetch(`data.json${v}`).then((r) => r.json())]);
  D = ALL[PLAT] || { citta: [], case: [], giocatori: [], notizie: [], conquiste: [], aggiornato: ALL.aggiornato }; REG = ALL.regole;
  buildLand(); buildCities(); buildNature(); buildLabels(); makeBeacon(); fitStart(); renderPanel();
  $("#upd").textContent = "Aggiornato alle " + hhmm(D.aggiornato || ALL.aggiornato); rotateNews(); setInterval(rotateNews, 4500);
  if (!D.citta.length) { $("#tickText").textContent = EMPTY; toast(`🏠 <b>${EMPTY}</b>`, 6000); }
  requestAnimationFrame(loop);
  $("#loading").classList.add("off"); setTimeout(() => $("#loading").remove(), 700);
  await new Promise((r) => setTimeout(r, 30));
  HOUSES = (D.case || []).map(([u, ci, p, l, role, lat, lon]) => ({ u, un: norm(u), ci, p, l, role, lat, lon }));
  buildHouses();
  const q = params.get("cerca"); if (q) { $("#q").value = q; suggItems = search(q); if (suggItems[0]) pick(suggItems[0]); }
})().catch((e) => { console.error(e); const p = $("#loading p"); if (p) p.textContent = "Errore nel caricare la mappa: ricarica la pagina"; });
