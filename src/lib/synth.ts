/** 경고/피드백용 Web Audio 톤 */
export function playSynth(freq = 150, duration = 0.25, type: OscillatorType = 'sawtooth'): void {
  try {
    const ctx = new AudioContext();
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();
    osc.type = type;
    osc.frequency.value = freq;
    gain.gain.value = 0.08;
    osc.connect(gain);
    gain.connect(ctx.destination);
    osc.start();
    osc.stop(ctx.currentTime + duration);
    osc.onended = () => void ctx.close();
  } catch {
    // 오디오 미지원 환경
  }
}
