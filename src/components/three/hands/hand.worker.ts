/// <reference lib="webworker" />
import { buildHand, type HandPose } from './handSdf';

self.onmessage = (e: MessageEvent<{ id: number; pose: HandPose; h: number }>) => {
  const { id, pose, h } = e.data;
  const m = buildHand(pose, h);
  const transfer = [m.positions.buffer, m.normals.buffer, m.colors.buffer, m.indices.buffer, m.decor.buffer, ...m.vines.map((v) => v.buffer)];
  (self as unknown as DedicatedWorkerGlobalScope).postMessage({ id, mesh: m }, transfer);
};
