(function () {
  "use strict";

  if (window.__backgroundAnimationLoaded) return;
  window.__backgroundAnimationLoaded = true;

  var canvas = document.createElement("canvas");
  var context = canvas.getContext("2d");
  if (!context) return;

  var reducedMotion = window.matchMedia ? window.matchMedia("(prefers-reduced-motion: reduce)") : null;
  var finePointer = window.matchMedia ? window.matchMedia("(hover: hover) and (pointer: fine)") : null;
  var width = 0;
  var height = 0;
  var pixelRatio = 1;
  var particles = [];
  var frameId = 0;
  var resizeFrame = 0;
  var running = false;
  var lastFrameTime = 0;
  var mouse = {
    x: null,
    y: null,
    targetX: null,
    targetY: null,
    previousX: null,
    previousY: null,
    velocityX: 0,
    velocityY: 0,
    speed: 0,
    lastMoveTime: 0,
    max: 57600,
    presence: 0,
    burst: 0,
    swirl: 0,
    swirlDirection: 1
  };
  var settings = {};

  function readCssVar(name, fallback) {
    var bodyStyle = getComputedStyle(document.body);
    var rootStyle = getComputedStyle(document.documentElement);
    return bodyStyle.getPropertyValue(name).trim() || rootStyle.getPropertyValue(name).trim() || fallback;
  }

  function numberValue(value, fallback) {
    var parsed = Number(value);
    return Number.isFinite(parsed) ? parsed : fallback;
  }

  function getSettings() {
    var reduced = Boolean(reducedMotion && reducedMotion.matches);
    var baseCount = Math.max(14, Math.round(numberValue(readCssVar("--background-animation-count", "46"), 46)));
    var areaRatio = Math.sqrt((window.innerWidth * window.innerHeight) / (1440 * 900));
    var responsiveCount = window.innerWidth < 768
      ? Math.min(30, Math.max(22, Math.round(baseCount * 0.65)))
      : Math.min(54, Math.max(36, Math.round(baseCount * areaRatio)));

    return {
      reduced: reduced,
      color: readCssVar("--background-animation-color", "47, 87, 200"),
      accent: readCssVar("--background-animation-accent", "1, 206, 205"),
      opacity: reduced
        ? Math.min(numberValue(readCssVar("--background-animation-opacity", "0.42"), 0.42), 0.18)
        : numberValue(readCssVar("--background-animation-opacity", "0.42"), 0.42),
      count: reduced ? Math.min(16, Math.max(10, Math.round(responsiveCount * 0.34))) : responsiveCount,
      speed: reduced ? 0 : numberValue(readCssVar("--background-animation-speed", "0.20"), 0.20),
      maxDistance: numberValue(readCssVar("--background-animation-distance", "6800"), 6800),
      mouseDistance: numberValue(readCssVar("--background-animation-mouse-distance", "16000"), 16000)
    };
  }

  function buildParticles() {
    particles = [];
    for (var index = 0; index < settings.count; index += 1) {
      particles.push({
        x: Math.random() * width,
        y: Math.random() * height,
        xa: (Math.random() * 2 - 1) * settings.speed,
        ya: (Math.random() * 2 - 1) * settings.speed,
        vx: 0,
        vy: 0,
        size: 0.82 + Math.random() * 1.02,
        accent: Math.random() < 0.28
      });
    }
  }

  function resize() {
    pixelRatio = Math.min(window.devicePixelRatio || 1, 2);
    width = window.innerWidth;
    height = window.innerHeight;
    canvas.width = Math.round(width * pixelRatio);
    canvas.height = Math.round(height * pixelRatio);
    canvas.style.width = width + "px";
    canvas.style.height = height + "px";
    context.setTransform(pixelRatio, 0, 0, pixelRatio, 0, 0);
    settings = getSettings();
    mouse.max = settings.mouseDistance;
    canvas.style.opacity = String(settings.opacity);
    buildParticles();
    drawFrame(false);
  }

  function updateMouse(delta, now) {
    var frameScale = delta / (1000 / 60);

    if (mouse.targetX !== null && mouse.targetY !== null) {
      if (mouse.x === null || mouse.y === null) {
        mouse.x = mouse.targetX;
        mouse.y = mouse.targetY;
      }
      var follow = 1 - Math.pow(0.88, frameScale);
      var appear = 1 - Math.pow(0.92, frameScale);
      mouse.x += (mouse.targetX - mouse.x) * follow;
      mouse.y += (mouse.targetY - mouse.y) * follow;
      mouse.presence += (1 - mouse.presence) * appear;
    } else {
      mouse.presence *= Math.pow(0.9, frameScale);
      if (mouse.presence < 0.01) {
        mouse.x = null;
        mouse.y = null;
        mouse.presence = 0;
      }
    }

    if (now - mouse.lastMoveTime > 72) {
      var velocityDecay = Math.pow(0.78, frameScale);
      mouse.velocityX *= velocityDecay;
      mouse.velocityY *= velocityDecay;
      mouse.speed = Math.hypot(mouse.velocityX, mouse.velocityY);
    }

    mouse.burst *= Math.exp(-delta / 86);
    mouse.swirl *= Math.exp(-delta / 360);
    if (mouse.burst < 0.002) mouse.burst = 0;
    if (mouse.swirl < 0.002) mouse.swirl = 0;
  }

  function drawFrame(advance, timestamp) {
    context.clearRect(0, 0, width, height);

    var delta = 1000 / 60;
    if (advance) {
      delta = lastFrameTime ? Math.min(32, Math.max(4, timestamp - lastFrameTime)) : delta;
      lastFrameTime = timestamp;
      updateMouse(delta, timestamp);
    }
    var frameScale = delta / (1000 / 60);

    if (mouse.x !== null && mouse.y !== null && mouse.presence > 0) {
      var haloRadius = Math.sqrt(mouse.max) * 1.05;
      var halo = context.createRadialGradient(mouse.x, mouse.y, 0, mouse.x, mouse.y, haloRadius);
      halo.addColorStop(0, "rgba(" + settings.accent + "," + ((0.14 + mouse.swirl * 0.08) * mouse.presence) + ")");
      halo.addColorStop(1, "rgba(" + settings.accent + ",0)");
      context.fillStyle = halo;
      context.beginPath();
      context.arc(mouse.x, mouse.y, haloRadius, 0, Math.PI * 2);
      context.fill();
    }

    for (var index = 0; index < particles.length; index += 1) {
      var particle = particles[index];

      if (advance) {
        if (mouse.x !== null && mouse.y !== null && mouse.presence > 0) {
          var forceX = particle.x - mouse.x;
          var forceY = particle.y - mouse.y;
          var forceDistanceSquared = forceX * forceX + forceY * forceY;
          var forceRadius = Math.sqrt(mouse.max) * (1 + Math.max(mouse.burst * 0.24, mouse.swirl * 0.18));

          if (forceDistanceSquared < forceRadius * forceRadius && forceDistanceSquared > 0.01) {
            var forceDistance = Math.sqrt(forceDistanceSquared);
            var normalX = forceX / forceDistance;
            var normalY = forceY / forceDistance;
            var proximity = 1 - forceDistance / forceRadius;
            var innerRadius = 30;
            var attractionGate = 1 - Math.min(1, mouse.burst * 1.35);

            if (forceDistance > innerRadius) {
              var attraction = Math.pow(proximity, 1.35) * 0.038 * mouse.presence * attractionGate * frameScale;
              particle.vx -= normalX * attraction;
              particle.vy -= normalY * attraction;
            } else {
              var innerPressure = (1 - forceDistance / innerRadius) * 0.052 * mouse.presence * frameScale;
              particle.vx += normalX * innerPressure;
              particle.vy += normalY * innerPressure;
            }

            if (mouse.burst > 0) {
              var burstForce = mouse.burst * (0.12 + proximity * 0.34) * frameScale;
              particle.vx += normalX * burstForce + mouse.velocityX * mouse.burst * 0.018 * frameScale;
              particle.vy += normalY * burstForce + mouse.velocityY * mouse.burst * 0.018 * frameScale;
            }

            if (mouse.swirl > 0) {
              var swirlForce = mouse.swirl * proximity * 0.075 * mouse.presence * frameScale;
              particle.vx += -normalY * mouse.swirlDirection * swirlForce;
              particle.vy += normalX * mouse.swirlDirection * swirlForce;
            }
          }
        }

        var drag = Math.pow(mouse.swirl > 0.05 ? 0.976 : 0.952, frameScale);
        particle.vx *= drag;
        particle.vy *= drag;
        var dynamicSpeed = Math.hypot(particle.vx, particle.vy);
        if (dynamicSpeed > 3.4) {
          particle.vx = particle.vx / dynamicSpeed * 3.4;
          particle.vy = particle.vy / dynamicSpeed * 3.4;
        }

        particle.x += (particle.xa + particle.vx) * frameScale;
        particle.y += (particle.ya + particle.vy) * frameScale;
        if (particle.x > width) {
          particle.x = width;
          particle.xa = -Math.abs(particle.xa);
          particle.vx *= -0.55;
        } else if (particle.x < 0) {
          particle.x = 0;
          particle.xa = Math.abs(particle.xa);
          particle.vx *= -0.55;
        }
        if (particle.y > height) {
          particle.y = height;
          particle.ya = -Math.abs(particle.ya);
          particle.vy *= -0.55;
        } else if (particle.y < 0) {
          particle.y = 0;
          particle.ya = Math.abs(particle.ya);
          particle.vy *= -0.55;
        }
      }

      context.fillStyle = "rgba(" + (particle.accent ? settings.accent : settings.color) + "," + (particle.accent ? "0.96" : "0.86") + ")";
      context.beginPath();
      context.arc(particle.x, particle.y, particle.size, 0, Math.PI * 2);
      context.fill();

      for (var next = index + 1; next < particles.length; next += 1) {
        var other = particles[next];
        var deltaX = particle.x - other.x;
        var deltaY = particle.y - other.y;
        var distance = deltaX * deltaX + deltaY * deltaY;

        if (distance < settings.maxDistance) {
          var intensity = (settings.maxDistance - distance) / settings.maxDistance;
          context.beginPath();
          context.lineWidth = 0.18 + intensity * 0.85;
          var lineColor = particle.accent || other.accent ? settings.accent : settings.color;
          context.strokeStyle = "rgba(" + lineColor + "," + (0.07 + intensity * 0.42) + ")";
          context.moveTo(particle.x, particle.y);
          context.lineTo(other.x, other.y);
          context.stroke();
        }
      }

      if (mouse.x !== null && mouse.y !== null && mouse.presence > 0) {
        var mouseX = particle.x - mouse.x;
        var mouseY = particle.y - mouse.y;
        var mouseDistance = mouseX * mouseX + mouseY * mouseY;
        if (mouseDistance < mouse.max) {
          var mouseIntensity = (mouse.max - mouseDistance) / mouse.max;
          context.beginPath();
          context.lineWidth = 0.45 + mouseIntensity;
          context.strokeStyle = "rgba(" + settings.accent + "," + ((0.2 + mouseIntensity * 0.58) * mouse.presence) + ")";
          context.moveTo(particle.x, particle.y);
          context.lineTo(mouse.x, mouse.y);
          context.stroke();
        }
      }
    }

    if (mouse.x !== null && mouse.y !== null && mouse.presence > 0) {
      context.fillStyle = "rgba(" + settings.accent + "," + ((0.62 + mouse.swirl * 0.2) * mouse.presence) + ")";
      context.beginPath();
      context.arc(mouse.x, mouse.y, 1.8, 0, Math.PI * 2);
      context.fill();
    }
  }

  function animate(timestamp) {
    if (!running) return;
    drawFrame(true, timestamp);
    frameId = window.requestAnimationFrame(animate);
  }

  function stop() {
    running = false;
    if (frameId) window.cancelAnimationFrame(frameId);
    frameId = 0;
    lastFrameTime = 0;
  }

  function start() {
    stop();
    if (settings.reduced || document.hidden) {
      drawFrame(false);
      return;
    }
    running = true;
    frameId = window.requestAnimationFrame(animate);
  }

  function refresh() {
    settings = getSettings();
    mouse.max = settings.mouseDistance;
    canvas.style.opacity = String(settings.opacity);
    if (settings.reduced) {
      mouse.targetX = null;
      mouse.targetY = null;
      mouse.previousX = null;
      mouse.previousY = null;
      mouse.velocityX = 0;
      mouse.velocityY = 0;
      mouse.speed = 0;
      mouse.burst = 0;
      mouse.swirl = 0;
      mouse.presence = 0;
    }
    buildParticles();
    start();
  }

  canvas.id = "background-animation";
  canvas.setAttribute("aria-hidden", "true");
  canvas.style.cssText = "position:fixed;inset:0;z-index:0;pointer-events:none;display:block;";
  document.body.appendChild(canvas);

  resize();
  start();

  window.addEventListener("resize", function () {
    if (resizeFrame) window.cancelAnimationFrame(resizeFrame);
    resizeFrame = window.requestAnimationFrame(function () {
      resizeFrame = 0;
      resize();
      start();
    });
  }, { passive: true });

  window.addEventListener("pointermove", function (event) {
    if (settings.reduced || (finePointer && !finePointer.matches)) return;
    var now = event.timeStamp || performance.now();
    if (mouse.previousX !== null && mouse.previousY !== null && mouse.lastMoveTime) {
      var elapsed = Math.min(64, Math.max(4, now - mouse.lastMoveTime));
      var rawVelocityX = (event.clientX - mouse.previousX) / elapsed;
      var rawVelocityY = (event.clientY - mouse.previousY) / elapsed;
      mouse.velocityX = mouse.velocityX * 0.28 + rawVelocityX * 0.72;
      mouse.velocityY = mouse.velocityY * 0.28 + rawVelocityY * 0.72;
      mouse.speed = Math.hypot(mouse.velocityX, mouse.velocityY);

      if (mouse.speed > 0.75) {
        var scatter = Math.min(1, (mouse.speed - 0.75) / 1.05);
        mouse.burst = Math.min(1, Math.max(mouse.burst, scatter));
        mouse.swirl = Math.min(1, Math.max(mouse.swirl, scatter * 0.92));
        mouse.swirlDirection = Math.abs(mouse.velocityX) >= Math.abs(mouse.velocityY)
          ? (mouse.velocityX >= 0 ? 1 : -1)
          : (mouse.velocityY >= 0 ? 1 : -1);
      }
    }
    mouse.targetX = event.clientX;
    mouse.targetY = event.clientY;
    mouse.previousX = event.clientX;
    mouse.previousY = event.clientY;
    mouse.lastMoveTime = now;
  }, { passive: true });

  document.addEventListener("pointerleave", function () {
    mouse.targetX = null;
    mouse.targetY = null;
    mouse.previousX = null;
    mouse.previousY = null;
    mouse.lastMoveTime = performance.now();
  }, { passive: true });

  window.addEventListener("blur", function () {
    mouse.targetX = null;
    mouse.targetY = null;
    mouse.previousX = null;
    mouse.previousY = null;
    mouse.lastMoveTime = performance.now();
  }, { passive: true });

  document.addEventListener("visibilitychange", function () {
    if (document.hidden) stop();
    else start();
  });

  if (reducedMotion) {
    var motionHandler = function () { refresh(); };
    if (typeof reducedMotion.addEventListener === "function") reducedMotion.addEventListener("change", motionHandler);
    else if (typeof reducedMotion.addListener === "function") reducedMotion.addListener(motionHandler);
  }
})();
