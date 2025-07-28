// AudioController.js
export function initAudioContext(audioUrl = "/sample.mp3") {
  const ctx = new (window.AudioContext || window.webkitAudioContext)();
  const audio = new Audio(audioUrl);
  audio.loop = true;
  audio.crossOrigin = "anonymous";

  const track = ctx.createMediaElementSource(audio);
  const gain = ctx.createGain();
  const bass = ctx.createBiquadFilter();
  bass.type = "lowshelf";
  bass.frequency.value = 200;
  bass.gain.value = 0;

  // Graph: track → bass → gain → output
  track.connect(bass).connect(gain).connect(ctx.destination);

  return {
    ctx,
    audio,
    track,
    gain,
    bass,
  };
}
