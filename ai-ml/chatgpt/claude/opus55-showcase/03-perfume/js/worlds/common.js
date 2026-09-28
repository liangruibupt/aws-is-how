// common.js — 各世界共用的场景件：反射环境（PMREM，总带几条隐藏的长条灯）
import * as THREE from 'three';

/**
 * 用一个程序场景生成反射环境。fill(add, B) 往里放发光面：add(w, h, [x, y, z], mat) 放一块朝向中心的面片，B(颜色, 倍数) 是发光材质。
 * 另外总放左右后方两条竖长条灯和顶上一条横长条灯：玻璃棱边靠它们勾出清楚的亮线
 */
export function envMap(renderer, { base = '#1c1d20', strip = '#ffffff', k = 5 } = {}, fill = () => {}) {
  const es = new THREE.Scene();
  const B = (c, s = 1) => new THREE.MeshBasicMaterial({ color: new THREE.Color(c).multiplyScalar(s), side: THREE.DoubleSide });
  const add = (w, h, pos, mat) => { const m = new THREE.Mesh(new THREE.PlaneGeometry(w, h), mat); m.position.set(...pos); m.lookAt(0, 0, 0); es.add(m); return m; };
  const room = new THREE.Mesh(new THREE.SphereGeometry(20, 32, 16), B(base)); room.material.side = THREE.BackSide; es.add(room);
  const S = B(strip, k);
  add(0.9, 16, [-9, 3, -5], S); add(0.9, 16, [9, 3, -5], S); add(16, 0.9, [0, 12, 1], S);
  fill(add, B);
  const pm = new THREE.PMREMGenerator(renderer), tex = pm.fromScene(es, 0.02).texture;
  pm.dispose();
  es.traverse(o => { o.geometry?.dispose(); o.material?.dispose(); });
  return tex;
}
