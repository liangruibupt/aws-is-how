// members.js — 六名挖地虎：资料、入场路线、停车位、合体对接位
import * as THREE from 'three';
import { makeMaterials } from './kit.js';
import { buildScrapper } from './m/scrapper.js';
import { buildMixmaster } from './m/mixmaster.js';
import { buildLonghaul } from './m/longhaul.js';
import { buildHook } from './m/hook.js';
import { buildScavenger } from './m/scavenger.js';
import { buildBonecrusher } from './m/bonecrusher.js';

/** 入场：从后墙大门驶入，沿样条到停车位（车头朝向装配区中心）。park = [x, z]，path 为途经点 */
export const INFO = [
  { id: 'scrapper', cn: '铲土机', en: 'SCRAPPER', role: '右腿', roleEn: 'RIGHT LEG', veh: '轮式装载机', hue: '#ffc531', build: buildScrapper,
    path: [[-3, -36], [-3.5, -22], [-12.5, -9], [-13, 3], [-9, 8.5]], park: [-6.4, 7.2] },
  { id: 'mixmaster', cn: '搅拌机', en: 'MIXMASTER', role: '左腿', roleEn: 'LEFT LEG', veh: '混凝土搅拌车', hue: '#35d7ff', build: buildMixmaster,
    path: [[3, -36], [3.5, -22], [12.5, -9], [13, 3], [9, 8.5]], park: [6.4, 7.2] },
  { id: 'longhaul', cn: '拖斗', en: 'LONG HAUL', role: '腰部', roleEn: 'WAIST', veh: '自卸卡车', hue: '#ff8a3d', build: buildLonghaul,
    path: [[-2, -38], [-2, -24], [-5, -15], [-8.5, -10.5]], park: [-7.2, -7.8] },
  { id: 'hook', cn: '吊钩', en: 'HOOK', role: '胸部 · 头部', roleEn: 'TORSO · HEAD', veh: '汽车起重机', hue: '#ff5ad2', build: buildHook,
    path: [[2, -38], [2, -24], [5, -15], [8.5, -10.5]], park: [7.2, -7.8] },
  { id: 'scavenger', cn: '清扫机', en: 'SCAVENGER', role: '右臂', roleEn: 'RIGHT ARM', veh: '履带挖掘机', hue: '#7dff5a', build: buildScavenger,
    path: [[-3, -36], [-4, -22], [-13, -8], [-13.5, -2], [-11.5, 0.5]], park: [-10.4, 0.6] },
  { id: 'bonecrusher', cn: '推土机', en: 'BONECRUSHER', role: '左臂', roleEn: 'LEFT ARM', veh: '履带推土机', hue: '#9b86ff', build: buildBonecrusher,
    path: [[3, -36], [4, -22], [13, -8], [13.5, -2], [11.5, 0.5]], park: [10.4, 0.6] },
];

export function buildMembers(T) {
  const out = [];
  for (const info of INFO) {
    if (!info.build) continue;
    const M = makeMaterials(T);
    const built = info.build(M);
    const m = { ...info, M, ...built, idx: out.length };
    m.dockQ = built.dock.q; m.dockP = new THREE.Vector3(...built.dock.p); m.preP = new THREE.Vector3(...built.pre);
    out.push(m);
  }
  return out;
}
