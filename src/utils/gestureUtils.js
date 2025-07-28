// gestureUtils.js
export function isFist(landmarks, threshold = 0.1) {
  const fingerTips = [8, 12, 16, 20];
  const fingerBases = [5, 9, 13, 17];

  for (let i = 0; i < fingerTips.length; i++) {
    const tip = landmarks[fingerTips[i]];
    const base = landmarks[fingerBases[i]];
    const dx = tip.x - base.x;
    const dy = tip.y - base.y;
    const dz = (tip.z || 0) - (base.z || 0);
    const dist = Math.sqrt(dx * dx + dy * dy + dz * dz);
    if (dist > threshold) return false;
  }
  return true;
}
