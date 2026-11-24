// bearwall.js — Scott's paintings on Bear's '90s living-room walls (?room=living90), in gilded antique frames.
// Light geometry: one bevelled ExtrudeGeometry moulding per frame (~100 tris) + 4 corner rosettes; the carving
// (bead-and-reel lip, acanthus scroll band, corner flourishes) lives in a procedural height map -> colour + normal map.
// Burnished warm gold with dark recesses; low metalness / mid roughness so it reads as gilded clay, not chrome.
// Images: media/bear_wall/*.jpg (<=1024 px long side). Each picture keeps its own aspect ratio (no crop, no stretch).
import * as THREE from 'three';

export const BEAR_WALL = {
  lady: { src: 'media/bear_wall/lady_reading.jpg', aspect: 835 / 1024 },
  cowboy: { src: 'media/bear_wall/cowboy_steps.jpg', aspect: 1 },
  suit: { src: 'media/bear_wall/brown_suit.jpg', aspect: 1024 / 842 },
  guitar: { src: 'media/bear_wall/guitarist.jpg', aspect: 771 / 1024 },
  painter: { src: 'media/bear_wall/painter_bird.jpg', aspect: 1024 / 855 },
  sunflower: { src: 'media/bear_wall/sunflower_bowler.jpg', aspect: 1 },   // run 9c: the big square statement piece
};

// carving height map for a frame of outer size W x H (m), moulding width B: returns { map, normalMap } canvases' textures
function carve(W, H, B, px) {
  const s = px / Math.max(W, H), cw = Math.round(W * s), ch = Math.round(H * s), b = B * s;
  const c = document.createElement('canvas'); c.width = cw; c.height = ch; const g = c.getContext('2d');
  g.fillStyle = '#5a5a5a'; g.fillRect(0, 0, cw, ch);
  // moulding cross-section: raised outer roll, sunk cove, raised scroll band, bead lip at the sight edge
  const band = (t0, t1, v) => { g.fillStyle = `rgb(${v},${v},${v})`; g.beginPath(); g.rect(t0 * b, t0 * b, cw - 2 * t0 * b, ch - 2 * t0 * b); g.rect(t1 * b, t1 * b, cw - 2 * t1 * b, ch - 2 * t1 * b); g.fill('evenodd'); };
  band(0, 0.12, 150); band(0.12, 0.2, 235); band(0.2, 0.3, 120); band(0.3, 0.78, 190); band(0.78, 0.86, 90); band(0.86, 1.0, 170);
  // acanthus scroll along the band (C-scrolls alternating), drawn on each side
  g.lineCap = 'round';
  const side = (x0, y0, x1, y1, nx, ny) => { const L = Math.hypot(x1 - x0, y1 - y0), n = Math.max(2, Math.round(L / (b * 0.62))), mid = b * 0.54;
    for (let i = 0; i < n; i++) { const u = (i + 0.5) / n, x = x0 + (x1 - x0) * u + nx * mid, y = y0 + (y1 - y0) * u + ny * mid, r = b * 0.17, a = Math.atan2(y1 - y0, x1 - x0) + (i % 2 ? Math.PI : 0);
      g.strokeStyle = 'rgb(255,255,255)'; g.lineWidth = b * 0.07; g.beginPath(); g.arc(x, y, r, a + 0.6, a + 4.6); g.stroke();
      g.strokeStyle = 'rgb(70,70,70)'; g.lineWidth = b * 0.035; g.beginPath(); g.arc(x, y, r * 0.45, a + 1.2, a + 5.2); g.stroke();
      g.fillStyle = 'rgb(250,250,250)'; g.beginPath(); g.ellipse(x + Math.cos(a) * r * 1.6, y + Math.sin(a) * r * 1.6, r * 0.55, r * 0.22, a + 0.5, 0, 7); g.fill(); }
    // bead-and-reel on the sight-edge lip
    const nb = Math.round(L / (b * 0.11)); for (let i = 0; i < nb; i++) { const u = (i + 0.5) / nb, x = x0 + (x1 - x0) * u + nx * b * 0.93, y = y0 + (y1 - y0) * u + ny * b * 0.93;
      g.fillStyle = i % 2 ? 'rgb(140,140,140)' : 'rgb(245,245,245)'; g.beginPath(); g.arc(x, y, b * (i % 2 ? 0.025 : 0.04), 0, 7); g.fill(); } };
  side(b, 0, cw - b, 0, 0, 1); side(b, ch, cw - b, ch, 0, -1); side(0, b, 0, ch - b, 1, 0); side(cw, b, cw, ch - b, -1, 0);
  // corner flourishes: shell cartouche + two leaf sprays
  for (const [cx, cy, sx, sy] of [[0, 0, 1, 1], [cw, 0, -1, 1], [0, ch, 1, -1], [cw, ch, -1, -1]]) {
    const x = cx + sx * b * 0.5, y = cy + sy * b * 0.5; g.fillStyle = 'rgb(255,255,255)'; g.beginPath(); g.arc(x, y, b * 0.42, 0, 7); g.fill();
    g.strokeStyle = 'rgb(90,90,90)'; g.lineWidth = b * 0.04; for (let k = 0; k < 7; k++) { const a = Math.atan2(sy, sx) + (k - 3) * 0.32; g.beginPath(); g.moveTo(x, y); g.lineTo(x + Math.cos(a) * b * 0.4, y + Math.sin(a) * b * 0.4); g.stroke(); }
    g.fillStyle = 'rgb(60,60,60)'; g.beginPath(); g.arc(x, y, b * 0.09, 0, 7); g.fill();
    g.fillStyle = 'rgb(240,240,240)'; for (const [ax, ay] of [[sx, 0], [0, sy]]) { g.beginPath(); g.ellipse(x + ax * b * 0.75, y + ay * b * 0.75, ax ? b * 0.32 : b * 0.12, ay ? b * 0.32 : b * 0.12, 0, 0, 7); g.fill(); } }
  g.fillStyle = 'rgb(120,120,120)'; g.fillRect(b, b, cw - 2 * b, ch - 2 * b);   // sight opening (only seen on the inner bevel)
  // height -> burnished gold colour (dark recesses) + tangent-space normal map
  const H0 = g.getImageData(0, 0, cw, ch).data, col = g.createImageData(cw, ch), nor = g.createImageData(cw, ch), C = col.data, N = nor.data;
  const hgt = (x, y) => H0[((Math.min(ch - 1, Math.max(0, y)) * cw) + Math.min(cw - 1, Math.max(0, x))) * 4] / 255;
  const dark = [70, 44, 14], mid = [168, 122, 48], hi = [236, 196, 112];
  for (let y = 0; y < ch; y++) for (let x = 0; x < cw; x++) { const i = (y * cw + x) * 4, h = hgt(x, y), n = (Math.sin(x * 12.9898 + y * 78.233) * 43758.5453) % 1;
    const k = Math.min(1, Math.max(0, h * 1.15 - 0.05 + n * 0.05)), a = k < 0.6 ? k / 0.6 : (k - 0.6) / 0.4, lo = k < 0.6 ? dark : mid, up = k < 0.6 ? mid : hi;
    for (let j = 0; j < 3; j++) C[i + j] = lo[j] + (up[j] - lo[j]) * a; C[i + 3] = 255;
    const dx = (hgt(x + 1, y) - hgt(x - 1, y)) * 2.2, dy = (hgt(x, y + 1) - hgt(x, y - 1)) * 2.2, l = Math.hypot(dx, dy, 1);
    N[i] = (-dx / l * 0.5 + 0.5) * 255; N[i + 1] = (dy / l * 0.5 + 0.5) * 255; N[i + 2] = (1 / l * 0.5 + 0.5) * 255; N[i + 3] = 255; }
  const mk = (img, srgb) => { const k = document.createElement('canvas'); k.width = cw; k.height = ch; k.getContext('2d').putImageData(img, 0, 0); const t = new THREE.CanvasTexture(k);
    if (srgb) t.colorSpace = THREE.SRGBColorSpace; t.repeat.set(1 / W, 1 / H); t.offset.set(0.5, 0.5); t.anisotropy = 4; return t; };
  return { map: mk(col, true), normalMap: mk(nor, false) };
}

// one framed painting, facing local +z, back on z=0. h = picture height (m); B = moulding width
export function framedPainting(key, h, opts = {}) {
  const P = BEAR_WALL[key], w = h * P.aspect, B = opts.B ?? Math.max(0.075, Math.min(0.12, h * 0.12)), W = w + 2 * B, H = h + 2 * B, D = 0.028, bev = 0.016;
  const grp = new THREE.Group(); grp.name = 'painting_' + key;
  const sh = new THREE.Shape(); sh.moveTo(-W / 2 + bev, -H / 2 + bev); sh.lineTo(W / 2 - bev, -H / 2 + bev); sh.lineTo(W / 2 - bev, H / 2 - bev); sh.lineTo(-W / 2 + bev, H / 2 - bev); sh.closePath();
  const hole = new THREE.Path(); const ix = w / 2 + bev, iy = h / 2 + bev; hole.moveTo(-ix, -iy); hole.lineTo(-ix, iy); hole.lineTo(ix, iy); hole.lineTo(ix, -iy); hole.closePath(); sh.holes.push(hole);   // the bevel narrows the hole by bev -> the sight edge lands exactly on the picture edge (no crop)
  const geo = new THREE.ExtrudeGeometry(sh, { depth: D, bevelEnabled: true, bevelThickness: bev, bevelSize: bev, bevelSegments: 2, curveSegments: 1 }); geo.translate(0, 0, bev);
  const { map, normalMap } = carve(W, H, B, opts.px || 512);
  const gold = new THREE.MeshStandardMaterial({ map, normalMap, normalScale: new THREE.Vector2(1.1, 1.1), roughness: 0.5, metalness: 0.28, color: '#ffffff' });
  const fr = new THREE.Mesh(geo, gold); fr.castShadow = false; grp.add(fr);
  // corner rosettes (carved bosses) - a little real relief
  const rg = new THREE.SphereGeometry(B * 0.3, 8, 5, 0, Math.PI * 2, 0, Math.PI / 2); rg.rotateX(Math.PI / 2); rg.scale(1, 1, 0.45);
  for (const [sx, sy] of [[-1, -1], [1, -1], [-1, 1], [1, 1]]) { const r = new THREE.Mesh(rg, gold); r.position.set(sx * (W / 2 - B * 0.5), sy * (H / 2 - B * 0.5), D + 2 * bev - 0.004); grp.add(r); }
  // dark liner inside the sight edge + the canvas (recessed behind the lip)
  const liner = new THREE.Mesh(new THREE.PlaneGeometry(w + 0.03, h + 0.03), new THREE.MeshStandardMaterial({ color: '#2a1c10', roughness: 1 })); liner.position.z = 0.012; grp.add(liner);
  const pic = new THREE.Mesh(new THREE.PlaneGeometry(w, h), new THREE.MeshStandardMaterial({ color: '#ffffff', roughness: 0.82, metalness: 0 })); pic.position.z = 0.016; grp.add(pic);
  const ready = new Promise((res) => new THREE.TextureLoader().load(P.src, (t) => { t.colorSpace = THREE.SRGBColorSpace; t.anisotropy = 4; pic.material.map = t; pic.material.needsUpdate = true; res(); }, undefined, () => res()));
  grp.userData = { W, H, w, h, ready }; return grp;
}
