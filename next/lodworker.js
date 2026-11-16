// perf pass 2 (Nov 16 2026): LOD simplification off the main thread. perf.js posts a mesh's positions / UVs / index,
// this returns the simplified index buffers (meshoptimizer 1.3.0, WASM, MIT; vendor/meshopt). A 100k-tri Meshy rig takes
// 50-200 ms to simplify on a phone; on the main thread that was a visible hitch in the middle of play.
import { MeshoptSimplifier as S } from './vendor/meshopt/meshopt_simplifier.module.js';
const ready = S.ready;
self.onmessage = async (e) => {
  const { id, pos, idx, uv, jobs } = e.data;
  try {
    await ready;
    const out = jobs.map(({ frac, err, minTri, perm }) => {
      const target = Math.max(Math.floor(minTri) * 3, Math.floor(idx.length * frac / 3) * 3), fl = perm ? ['Permissive'] : [];
      const [r] = uv ? S.simplifyWithAttributes(idx, pos, 3, uv, 2, [0.5, 0.5], null, target, err, fl) : S.simplify(idx, pos, 3, target, err, fl);
      return r.length > idx.length * 0.8 ? null : r;
    });
    self.postMessage({ id, out }, out.filter(Boolean).map((a) => a.buffer));
  } catch (err) { self.postMessage({ id, error: String(err) }); }
};
