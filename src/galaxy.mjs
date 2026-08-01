export function createGalaxy(canvas, shell, statusText) {
  const context = canvas?.getContext?.('2d');
  if (!context) {
    canvas?.setAttribute('hidden', '');
    return { setState() {}, setReducedMotion() {}, destroy() {} };
  }

  let width = 0;
  let height = 0;
  let ratio = 1;
  let frame = 0;
  let tick = 0;
  let state = 'idle';
  let reducedMotion = false;
  let particles = [];
  const labels = {
    idle: '星河待命 · 数据只保存在这台设备',
    reflecting: '正在理解你的意图 · 没有联网发送',
    branching: '正在展开问题路径 · 由你选择方向',
    ready: '路径已经点亮 · 可以形成阶段性成果',
  };

  function seedParticles() {
    const compact = width < 700;
    const count = compact ? 260 : Math.min(900, Math.round(width * .62));
    particles = Array.from({ length: count }, (_, index) => {
      const arm = index % 3;
      const distance = Math.pow(Math.random(), .66);
      const angle = Math.random() * Math.PI * 2 + arm * (Math.PI * 2 / 3) + distance * 4.4;
      return {
        distance,
        angle,
        size: .35 + Math.random() * (index % 17 === 0 ? 2.2 : 1.15),
        speed: .0008 + Math.random() * .002,
        alpha: .18 + Math.random() * .72,
        hue: index % 11 === 0 ? 42 : (index % 4 === 0 ? 222 : 205),
        offset: (Math.random() - .5) * .24,
      };
    });
  }

  function resize() {
    const rect = canvas.getBoundingClientRect();
    ratio = Math.min(window.devicePixelRatio || 1, 2);
    width = Math.max(1, rect.width);
    height = Math.max(1, rect.height);
    canvas.width = Math.round(width * ratio);
    canvas.height = Math.round(height * ratio);
    context.setTransform(ratio, 0, 0, ratio, 0, 0);
    seedParticles();
    if (reducedMotion) draw();
  }

  function drawBackground() {
    context.clearRect(0, 0, width, height);
    const glow = context.createRadialGradient(width * .67, height * .42, 0, width * .67, height * .42, Math.max(width, height) * .48);
    glow.addColorStop(0, 'rgba(176,190,255,.15)');
    glow.addColorStop(.14, 'rgba(87,103,190,.12)');
    glow.addColorStop(.42, 'rgba(29,57,100,.08)');
    glow.addColorStop(1, 'rgba(2,7,14,0)');
    context.fillStyle = glow;
    context.fillRect(0, 0, width, height);
  }

  function draw() {
    drawBackground();
    const cx = width * (width < 700 ? .67 : .7);
    const cy = height * .41;
    const baseX = Math.min(width * .42, 520);
    const baseY = state === 'idle' ? baseX * .42 : state === 'reflecting' ? baseX * .2 : baseX * .11;
    const storm = state === 'branching' ? 1 : 0;
    const rotation = state === 'idle' ? -.18 : -.07;
    const cos = Math.cos(rotation);
    const sin = Math.sin(rotation);

    context.save();
    context.globalCompositeOperation = 'lighter';
    for (const particle of particles) {
      if (!reducedMotion) particle.angle += particle.speed * (state === 'branching' ? 4.2 : 1);
      const spiral = particle.angle + (storm ? Math.sin(tick * .012 + particle.distance * 8) * .16 : 0);
      const radial = particle.distance * baseX;
      const rawX = Math.cos(spiral) * radial;
      const rawY = Math.sin(spiral) * particle.distance * baseY + particle.offset * baseY;
      const x = cx + rawX * cos - rawY * sin;
      const y = cy + rawX * sin + rawY * cos;
      const flicker = reducedMotion ? 1 : .82 + Math.sin(tick * .018 + particle.angle * 4) * .18;
      const alpha = particle.alpha * flicker * (1 - particle.distance * .34);
      context.beginPath();
      context.fillStyle = `hsla(${particle.hue}, 84%, ${particle.hue === 42 ? 72 : 78}%, ${alpha})`;
      context.arc(x, y, particle.size * (storm ? 1.12 : 1), 0, Math.PI * 2);
      context.fill();
    }
    context.restore();

    const core = context.createRadialGradient(cx, cy, 0, cx, cy, baseX * .22);
    core.addColorStop(0, 'rgba(255,238,191,.72)');
    core.addColorStop(.08, 'rgba(175,190,255,.28)');
    core.addColorStop(1, 'rgba(80,100,190,0)');
    context.fillStyle = core;
    context.beginPath();
    context.ellipse(cx, cy, baseX * .25, Math.max(7, baseY * .3), rotation, 0, Math.PI * 2);
    context.fill();

    if (state === 'ready') {
      context.strokeStyle = 'rgba(243,196,107,.2)';
      context.lineWidth = 1;
      const points = particles.filter((_, index) => index % 97 === 0).slice(0, 7);
      context.beginPath();
      points.forEach((particle, index) => {
        const radial = particle.distance * baseX;
        const x = cx + Math.cos(particle.angle) * radial;
        const y = cy + Math.sin(particle.angle) * particle.distance * baseY;
        if (index === 0) context.moveTo(x, y); else context.lineTo(x, y);
      });
      context.stroke();
    }

    tick += 1;
    if (!reducedMotion) frame = requestAnimationFrame(draw);
  }

  function restart() {
    cancelAnimationFrame(frame);
    draw();
  }

  function setState(next) {
    state = labels[next] ? next : 'idle';
    shell.dataset.state = state;
    if (statusText) statusText.textContent = labels[state];
    restart();
  }

  function setReducedMotion(value) {
    reducedMotion = Boolean(value);
    restart();
  }

  const observer = typeof ResizeObserver === 'function' ? new ResizeObserver(resize) : null;
  observer?.observe(canvas);
  window.addEventListener('resize', resize, { passive: true });
  resize();
  restart();

  return {
    setState,
    setReducedMotion,
    destroy() {
      cancelAnimationFrame(frame);
      observer?.disconnect();
      window.removeEventListener('resize', resize);
    },
  };
}
