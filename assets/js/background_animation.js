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
  var mouse = { x: null, y: null, targetX: null, targetY: null, max: 16000, presence: 0 };
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
    var baseCount = Math.max(14, Math.round(numberValue(readCssVar("--background-animation-count", "24"), 24)));
    var areaRatio = Math.min(1.25, Math.max(0.62, (window.innerWidth * window.innerHeight) / (1440 * 900)));

    return {
      reduced: reduced,
      color: readCssVar("--background-animation-color", "47, 87, 200"),
      accent: readCssVar("--background-animation-accent", "1, 206, 205"),
      opacity: reduced
        ? Math.min(numberValue(readCssVar("--background-animation-opacity", "0.42"), 0.42), 0.18)
        : numberValue(readCssVar("--background-animation-opacity", "0.42"), 0.42),
      count: reduced ? Math.max(10, Math.round(baseCount * 0.34)) : Math.min(40, Math.round(baseCount * areaRatio)),
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
        size: 0.75 + Math.random() * 0.95,
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

  function drawFrame(advance) {
    context.clearRect(0, 0, width, height);

    if (advance) {
      if (mouse.targetX !== null && mouse.targetY !== null) {
        if (mouse.x === null || mouse.y === null) {
          mouse.x = mouse.targetX;
          mouse.y = mouse.targetY;
        }
        mouse.x += (mouse.targetX - mouse.x) * 0.12;
        mouse.y += (mouse.targetY - mouse.y) * 0.12;
        mouse.presence += (1 - mouse.presence) * 0.08;
      } else {
        mouse.presence *= 0.9;
        if (mouse.presence < 0.01) {
          mouse.x = null;
          mouse.y = null;
          mouse.presence = 0;
        }
      }
    }

    if (mouse.x !== null && mouse.y !== null && mouse.presence > 0) {
      var haloRadius = Math.sqrt(mouse.max) * 1.05;
      var halo = context.createRadialGradient(mouse.x, mouse.y, 0, mouse.x, mouse.y, haloRadius);
      halo.addColorStop(0, "rgba(" + settings.accent + "," + (0.12 * mouse.presence) + ")");
      halo.addColorStop(1, "rgba(" + settings.accent + ",0)");
      context.fillStyle = halo;
      context.beginPath();
      context.arc(mouse.x, mouse.y, haloRadius, 0, Math.PI * 2);
      context.fill();
    }

    for (var index = 0; index < particles.length; index += 1) {
      var particle = particles[index];

      if (advance) {
        particle.x += particle.xa;
        particle.y += particle.ya;
        if (particle.x > width || particle.x < 0) particle.xa *= -1;
        if (particle.y > height || particle.y < 0) particle.ya *= -1;
      }

      context.fillStyle = "rgba(" + (particle.accent ? settings.accent : settings.color) + "," + (particle.accent ? "0.92" : "0.82") + ")";
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
          if (advance && mouseDistance > 1) {
            var mouseLength = Math.sqrt(mouseDistance);
            var repulsion = mouseIntensity * 0.28 * mouse.presence;
            particle.x += (mouseX / mouseLength) * repulsion;
            particle.y += (mouseY / mouseLength) * repulsion;
          }
          context.beginPath();
          context.lineWidth = 0.22 + mouseIntensity;
          context.strokeStyle = "rgba(" + settings.accent + "," + ((0.08 + mouseIntensity * 0.56) * mouse.presence) + ")";
          context.moveTo(particle.x, particle.y);
          context.lineTo(mouse.x, mouse.y);
          context.stroke();
        }
      }
    }

    if (mouse.x !== null && mouse.y !== null && mouse.presence > 0) {
      context.fillStyle = "rgba(" + settings.accent + "," + (0.5 * mouse.presence) + ")";
      context.beginPath();
      context.arc(mouse.x, mouse.y, 1.8, 0, Math.PI * 2);
      context.fill();
    }
  }

  function animate() {
    if (!running) return;
    drawFrame(true);
    frameId = window.requestAnimationFrame(animate);
  }

  function stop() {
    running = false;
    if (frameId) window.cancelAnimationFrame(frameId);
    frameId = 0;
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
    if (finePointer && !finePointer.matches) return;
    mouse.targetX = event.clientX;
    mouse.targetY = event.clientY;
  }, { passive: true });

  document.addEventListener("pointerleave", function () {
    mouse.targetX = null;
    mouse.targetY = null;
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
