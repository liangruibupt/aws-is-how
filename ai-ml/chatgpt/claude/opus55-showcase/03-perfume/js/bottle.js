// bottle.js — 瓶子（Task 8 的替身：方块瓶身 + 颈圈 + 瓶盖；尺寸和基本接口与 Task 11 的正式瓶子一致）
import * as THREE from 'three';
import { DIMS, EXPLODE } from '../meta.js';

const CAP = { silver: ['#c9ccd0', 0.35], gold: ['#d4a64a', 0.2], frost: ['#eef2f3', 0.55], lacquer: ['#141214', 0.15] };

export function buildBottle(ctx, sku) {
  const { w, d, body, collar, cap } = DIMS, root = new THREE.Group();
  const M = (o) => new THREE.MeshPhysicalMaterial(o);
  const glass = new THREE.Mesh(new THREE.BoxGeometry(w, body, d), M({ color: '#e8eef0', roughness: 0.05, transparent: true, opacity: 0.35 }));
  glass.position.y = body / 2;
  const liquid = new THREE.Mesh(new THREE.BoxGeometry(w * 0.84, body * 0.62, d * 0.76), M({ color: sku.liquid.color, roughness: 0.1 }));
  liquid.position.y = body * 0.08 + body * 0.31;
  const coll = new THREE.Mesh(new THREE.CylinderGeometry(0.011, 0.012, collar, 32), M({ color: '#d4a64a', metalness: 1, roughness: 0.25 }));
  const pump = new THREE.Mesh(new THREE.CylinderGeometry(0.004, 0.004, collar * 1.4, 16), M({ color: '#cccccc', metalness: 1, roughness: 0.3 }));
  const [cc, cr] = CAP[sku.cap];
  const capM = new THREE.Mesh(new THREE.BoxGeometry(0.036, cap, 0.036), M({ color: cc, metalness: sku.cap === 'lacquer' ? 0 : 1, roughness: cr, clearcoat: sku.cap === 'lacquer' ? 1 : 0 }));
  for (const m of [glass, liquid, coll, pump, capM]) { m.castShadow = true; root.add(m); }
  const parts = { glass, liquid, collar: coll, pump, cap: capM }, _v = new THREE.Vector3();
  const bottle = {
    root, parts,
    /** explode 0..1 分解程度；capLift 瓶盖额外上抬（米）；press 喷头按下 0..1 */
    pose({ explode = 0, capLift = 0, press = 0 } = {}) {
      coll.position.y = body + collar / 2 + EXPLODE.collar * explode;
      pump.position.y = body + collar * 0.7 + EXPLODE.pump * explode - 0.002 * press;
      capM.position.y = body + collar + cap / 2 + EXPLODE.cap * explode + capLift;
      root.updateMatrixWorld(true);
    },
    /** 引线端点（世界坐标）：'cap' | 'collar' | 'liquid' */
    anchor(name) { return parts[name].getWorldPosition(_v).toArray(); },
    liquidTop: () => liquid.position.y + body * 0.31,
  };
  bottle.pose();
  return bottle;
}
