const TWO_PI = Math.PI * 2;

export const GALAXY_STATE_PROFILES = Object.freeze({
  idle: Object.freeze({
    tilt: 0.34, depth: 0.42, turbulence: 0.08, speed: 0.42, bloom: 0.82, pull: 1, streak: 0.04,
  }),
  reflecting: Object.freeze({
    tilt: 1.08, depth: 0.92, turbulence: 0.28, speed: 1.35, bloom: 1.24, pull: 0.78, streak: 0.24,
  }),
  branching: Object.freeze({
    tilt: 1.34, depth: 1.42, turbulence: 0.96, speed: 3.25, bloom: 1.58, pull: 1.08, streak: 0.9,
  }),
  ready: Object.freeze({
    tilt: 1.16, depth: 0.72, turbulence: 0.12, speed: 0.22, bloom: 1.18, pull: 0.94, streak: 0.08,
  }),
});

const PROFILE_KEYS = ['tilt', 'depth', 'turbulence', 'speed', 'bloom', 'pull', 'streak'];

export function getGalaxyStateProfile(state) {
  return { ...(GALAXY_STATE_PROFILES[state] ?? GALAXY_STATE_PROFILES.idle) };
}

export function createParticleField(count = 900, random = Math.random) {
  const safeCount = Math.max(1, Math.floor(Number(count) || 1));
  const field = {
    count: safeCount,
    radius: new Float32Array(safeCount),
    angle: new Float32Array(safeCount),
    height: new Float32Array(safeCount),
    depth: new Float32Array(safeCount),
    size: new Float32Array(safeCount),
    speed: new Float32Array(safeCount),
    hue: new Float32Array(safeCount),
    phase: new Float32Array(safeCount),
    previousX: new Float32Array(safeCount),
    previousY: new Float32Array(safeCount),
  };
  field.previousX.fill(Number.NaN);
  field.previousY.fill(Number.NaN);

  for (let index = 0; index < safeCount; index += 1) {
    const arm = index % 4;
    const radius = Math.pow(random(), 0.58);
    field.radius[index] = radius;
    field.angle[index] = random() * TWO_PI + arm * (TWO_PI / 4) + radius * 5.8;
    field.height[index] = (random() - 0.5) * (0.14 + (1 - radius) * 0.18);
    field.depth[index] = random() - 0.5;
    field.size[index] = 0.44 + random() * (index % 29 === 0 ? 2.45 : 1.15);
    field.speed[index] = 0.58 + random() * 0.86;
    field.hue[index] = index % 19 === 0 ? 42 : (index % 5 === 0 ? 268 : 210 + random() * 22);
    field.phase[index] = random() * TWO_PI;
  }
  return field;
}

function sampleWithProfile(field, index, profile, time, viewport, pointer = { x: 0, y: 0 }, impact = 0) {
  const width = Math.max(1, viewport?.width ?? 1);
  const height = Math.max(1, viewport?.height ?? 1);
  const baseRadius = Math.min(width * 0.43, height * 0.74);
  const radiusSeed = field.radius[index];
  const phase = field.phase[index];
  const theta = field.angle[index]
    + time * 0.11 * profile.speed * field.speed[index]
    + Math.sin(time * 0.36 + phase) * profile.turbulence * 0.08;
  const stormWave = Math.sin(theta * 3.2 - radiusSeed * 12 + time * 2.1 + phase);
  const impactFront = Math.max(0, 1 - Math.abs(radiusSeed - (1 - impact) * 0.82) * 6) * impact;
  const radius = radiusSeed
    * profile.pull
    * (1 + stormWave * profile.turbulence * 0.16 + impactFront * 0.22);

  const localX = Math.cos(theta) * radius * baseRadius;
  const localY = Math.sin(theta) * radius * baseRadius
    + field.height[index] * baseRadius * (0.75 + profile.depth)
    + Math.sin(time * 2.7 + phase) * profile.turbulence * baseRadius * 0.035;
  const localZ = field.depth[index] * baseRadius * 0.23 * profile.depth
    + Math.cos(theta * 2 - time + phase) * profile.turbulence * baseRadius * 0.055;

  const cosTilt = Math.cos(profile.tilt);
  const sinTilt = Math.sin(profile.tilt);
  const tiltedY = localY * cosTilt - localZ * sinTilt;
  const tiltedZ = localY * sinTilt + localZ * cosTilt;
  const perspective = Math.max(0.58, Math.min(1.62, 3.2 / (3.2 + tiltedZ / Math.max(1, baseRadius))));
  const centerX = width * (width < 700 ? 0.64 : 0.68) + pointer.x * width * 0.018;
  const centerY = height * (width < 700 ? 0.34 : 0.39) + pointer.y * height * 0.018;
  const scale = perspective * field.size[index] * (0.72 + profile.bloom * 0.22);
  const alpha = Math.max(0.08, Math.min(0.98,
    (0.24 + (1 - radiusSeed) * 0.56 + perspective * 0.12)
    * (0.72 + profile.bloom * 0.2),
  ));

  return {
    x: centerX + localX * perspective,
    y: centerY + tiltedY * perspective,
    z: tiltedZ,
    scale,
    alpha,
    hue: field.hue[index],
  };
}

export function sampleParticle(field, index, state, time, viewport) {
  const safeIndex = Math.max(0, Math.min(field.count - 1, Math.floor(index)));
  return sampleWithProfile(
    field,
    safeIndex,
    getGalaxyStateProfile(state),
    Number(time) || 0,
    viewport,
  );
}

function blendProfile(current, target, amount) {
  for (const key of PROFILE_KEYS) current[key] += (target[key] - current[key]) * amount;
}

export function createGalaxy(canvas, shell, statusText) {
  const context = canvas?.getContext?.('2d', { alpha: true });
  if (!context) {
    canvas?.setAttribute('hidden', '');
    return {
      setState() {},
      setReducedMotion() {},
      launchImpact() {},
      destroy() {},
    };
  }

  let width = 1;
  let height = 1;
  let ratio = 1;
  let frame = 0;
  let lastTime = 0;
  let state = 'idle';
  let reducedMotion = false;
  let visible = true;
  let impact = 0;
  let field = createParticleField(720);
  let currentProfile = getGalaxyStateProfile('idle');
  let targetProfile = getGalaxyStateProfile('idle');
  const pointer = { x: 0, y: 0 };
  const labels = {
    idle: '星河待命 · 数据只保存在这台设备',
    reflecting: '问题已进入星河 · 正在翻转与收束',
    branching: '量子风暴展开 · 四条问题路径正在形成',
    ready: '星带已经稳定 · 可以形成阶段性成果',
  };

  canvas.dataset.engine = 'projected-particle-field';

  function seedParticles() {
    const compact = width < 700;
    const count = reducedMotion ? (compact ? 320 : 620) : (compact ? 620 : Math.min(1400, Math.round(width * 0.96)));
    field = createParticleField(count);
    shell.dataset.particles = String(count);
  }

  function resize() {
    const rect = canvas.getBoundingClientRect();
    ratio = Math.min(window.devicePixelRatio || 1, 1.75);
    width = Math.max(1, rect.width);
    height = Math.max(1, rect.height);
    canvas.width = Math.round(width * ratio);
    canvas.height = Math.round(height * ratio);
    context.setTransform(ratio, 0, 0, ratio, 0, 0);
    seedParticles();
    if (reducedMotion) draw(performance.now());
  }

  function drawNebula(time) {
    context.clearRect(0, 0, width, height);
    const centerX = width * (width < 700 ? 0.64 : 0.68);
    const centerY = height * (width < 700 ? 0.34 : 0.39);
    const glow = context.createRadialGradient(centerX, centerY, 0, centerX, centerY, Math.max(width, height) * 0.48);
    glow.addColorStop(0, `rgba(214,224,255,${0.12 + currentProfile.bloom * 0.035})`);
    glow.addColorStop(0.15, `rgba(111,91,220,${0.08 + currentProfile.turbulence * 0.055})`);
    glow.addColorStop(0.42, 'rgba(34,91,153,.075)');
    glow.addColorStop(1, 'rgba(2,7,14,0)');
    context.fillStyle = glow;
    context.fillRect(0, 0, width, height);

    context.save();
    context.translate(centerX, centerY);
    context.rotate(-0.12 + Math.sin(time * 0.08) * 0.025);
    context.globalCompositeOperation = 'lighter';
    const ribbonAlpha = 0.03 + currentProfile.bloom * 0.018;
    for (let arm = 0; arm < 4; arm += 1) {
      context.beginPath();
      for (let step = 0; step <= 80; step += 1) {
        const progress = step / 80;
        const angle = arm * TWO_PI / 4 + progress * 5.7 + time * currentProfile.speed * 0.025;
        const radius = progress * Math.min(width * 0.39, height * 0.68) * currentProfile.pull;
        const x = Math.cos(angle) * radius;
        const y = Math.sin(angle) * radius * Math.cos(currentProfile.tilt);
        if (step === 0) context.moveTo(x, y); else context.lineTo(x, y);
      }
      context.strokeStyle = `rgba(100,144,255,${ribbonAlpha})`;
      context.lineWidth = 10 + currentProfile.turbulence * 8;
      context.stroke();
    }
    context.restore();
  }

  function drawImpactRing() {
    if (impact <= 0.01 || reducedMotion) return;
    const centerX = width * (width < 700 ? 0.64 : 0.68);
    const centerY = height * (width < 700 ? 0.34 : 0.39);
    const progress = 1 - impact;
    const radius = (18 + progress * Math.min(width, height) * 0.36);
    context.save();
    context.globalCompositeOperation = 'lighter';
    context.beginPath();
    context.arc(centerX, centerY, radius, 0, TWO_PI);
    context.strokeStyle = `rgba(169,203,255,${impact * 0.5})`;
    context.lineWidth = 1 + impact * 4;
    context.stroke();
    context.beginPath();
    context.arc(centerX, centerY, radius * 0.72, 0, TWO_PI);
    context.strokeStyle = `rgba(247,202,107,${impact * 0.26})`;
    context.lineWidth = 1;
    context.stroke();
    context.restore();
  }

  function drawConstellation(time) {
    if (state !== 'ready') return;
    context.save();
    context.globalCompositeOperation = 'lighter';
    context.beginPath();
    const step = Math.max(1, Math.floor(field.count / 8));
    for (let index = 0, pointIndex = 0; index < field.count && pointIndex < 8; index += step, pointIndex += 1) {
      const point = sampleWithProfile(field, index, currentProfile, time, { width, height }, pointer, 0);
      if (pointIndex === 0) context.moveTo(point.x, point.y); else context.lineTo(point.x, point.y);
    }
    context.strokeStyle = 'rgba(244,205,119,.28)';
    context.lineWidth = 1;
    context.stroke();
    context.restore();
  }

  function drawParticles(time) {
    context.save();
    context.globalCompositeOperation = 'lighter';
    const storming = state === 'branching' || currentProfile.streak > 0.35;

    for (let index = 0; index < field.count; index += 1) {
      const point = sampleWithProfile(field, index, currentProfile, time, { width, height }, pointer, impact);
      const previousX = field.previousX[index];
      const previousY = field.previousY[index];

      if (storming && index % 3 === 0 && Number.isFinite(previousX)) {
        context.beginPath();
        context.moveTo(previousX, previousY);
        context.lineTo(point.x, point.y);
        context.strokeStyle = `hsla(${point.hue},90%,72%,${point.alpha * currentProfile.streak * 0.22})`;
        context.lineWidth = Math.max(0.35, point.scale * 0.42);
        context.stroke();
      }

      field.previousX[index] = point.x;
      field.previousY[index] = point.y;
      const twinkle = reducedMotion ? 1 : 0.76 + Math.sin(time * 3.2 + field.phase[index]) * 0.24;
      const lightness = point.hue === 42 ? 78 : 76 + Math.min(10, currentProfile.bloom * 4);
      context.beginPath();
      context.fillStyle = `hsla(${point.hue},92%,${lightness}%,${point.alpha * twinkle})`;
      context.arc(point.x, point.y, Math.max(0.32, point.scale), 0, TWO_PI);
      context.fill();
    }
    context.restore();
  }

  function drawCore(time) {
    const centerX = width * (width < 700 ? 0.64 : 0.68);
    const centerY = height * (width < 700 ? 0.34 : 0.39);
    const radius = Math.min(width, height) * (0.11 + currentProfile.bloom * 0.018);
    const core = context.createRadialGradient(centerX, centerY, 0, centerX, centerY, radius);
    core.addColorStop(0, `rgba(255,244,207,${0.62 + currentProfile.bloom * 0.12})`);
    core.addColorStop(0.08, 'rgba(183,203,255,.33)');
    core.addColorStop(0.36, 'rgba(105,92,226,.12)');
    core.addColorStop(1, 'rgba(66,91,180,0)');
    context.fillStyle = core;
    context.beginPath();
    const pulse = reducedMotion ? 1 : 1 + Math.sin(time * 2.1) * 0.06;
    context.ellipse(
      centerX,
      centerY,
      radius * pulse,
      Math.max(5, radius * Math.cos(currentProfile.tilt) * 0.64),
      -0.08,
      0,
      TWO_PI,
    );
    context.fill();
  }

  function draw(now = performance.now()) {
    cancelAnimationFrame(frame);
    const seconds = now / 1000;
    const delta = lastTime ? Math.min(0.05, Math.max(0.001, (now - lastTime) / 1000)) : 1 / 60;
    lastTime = now;
    const blend = reducedMotion ? 1 : 1 - Math.exp(-delta * 3.8);
    blendProfile(currentProfile, targetProfile, blend);
    if (!reducedMotion) impact = Math.max(0, impact - delta * 0.78);

    drawNebula(seconds);
    drawParticles(seconds);
    drawCore(seconds);
    drawImpactRing();
    drawConstellation(seconds);

    if (!reducedMotion && visible) frame = requestAnimationFrame(draw);
  }

  function restart() {
    cancelAnimationFrame(frame);
    lastTime = 0;
    draw(performance.now());
  }

  function setState(next) {
    state = GALAXY_STATE_PROFILES[next] ? next : 'idle';
    targetProfile = getGalaxyStateProfile(state);
    if (reducedMotion) currentProfile = { ...targetProfile };
    shell.dataset.state = state;
    if (statusText) statusText.textContent = labels[state];
    restart();
  }

  function setReducedMotion(value) {
    reducedMotion = Boolean(value);
    targetProfile = getGalaxyStateProfile(state);
    if (reducedMotion) {
      currentProfile = { ...targetProfile };
      impact = 0;
    }
    seedParticles();
    restart();
  }

  function launchImpact(strength = 1) {
    if (!reducedMotion) impact = Math.max(impact, Math.max(0, Math.min(1, Number(strength) || 0)));
    shell.classList.remove('is-impacting');
    void shell.offsetWidth;
    shell.classList.add('is-impacting');
    window.setTimeout(() => shell.classList.remove('is-impacting'), reducedMotion ? 0 : 900);
    restart();
  }

  function onPointerMove(event) {
    if (reducedMotion) return;
    const rect = shell.getBoundingClientRect();
    pointer.x = ((event.clientX - rect.left) / Math.max(1, rect.width) - 0.5) * 2;
    pointer.y = ((event.clientY - rect.top) / Math.max(1, rect.height) - 0.5) * 2;
  }

  function onPointerLeave() {
    pointer.x = 0;
    pointer.y = 0;
  }

  function onVisibilityChange() {
    visible = !document.hidden;
    if (visible) restart(); else cancelAnimationFrame(frame);
  }

  const observer = typeof ResizeObserver === 'function' ? new ResizeObserver(resize) : null;
  observer?.observe(canvas);
  window.addEventListener('resize', resize, { passive: true });
  shell.addEventListener('pointermove', onPointerMove, { passive: true });
  shell.addEventListener('pointerleave', onPointerLeave, { passive: true });
  document.addEventListener('visibilitychange', onVisibilityChange);
  resize();
  restart();

  return {
    setState,
    setReducedMotion,
    launchImpact,
    destroy() {
      cancelAnimationFrame(frame);
      observer?.disconnect();
      window.removeEventListener('resize', resize);
      shell.removeEventListener('pointermove', onPointerMove);
      shell.removeEventListener('pointerleave', onPointerLeave);
      document.removeEventListener('visibilitychange', onVisibilityChange);
    },
  };
}
