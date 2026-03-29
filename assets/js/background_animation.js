(function () {
    function readCssVar(name, fallback) {
        var value = getComputedStyle(document.body).getPropertyValue(name).trim();
        if (!value) value = getComputedStyle(document.documentElement).getPropertyValue(name).trim();
        return value || fallback;
    }

    function toNumber(value, fallback) {
        var parsed = Number(value);
        return Number.isFinite(parsed) ? parsed : fallback;
    }

    var reduceMotionQuery = window.matchMedia ? window.matchMedia("(prefers-reduced-motion: reduce)") : null;

    function getSettings() {
        var reduced = reduceMotionQuery && reduceMotionQuery.matches;
        var count = Math.max(18, Math.round(toNumber(readCssVar("--background-animation-count", 92), 92)));
        return {
            zIndex: 0,
            opacity: reduced
                ? Math.min(toNumber(readCssVar("--background-animation-opacity", 0.56), 0.56), 0.22)
                : toNumber(readCssVar("--background-animation-opacity", 0.56), 0.56),
            color: readCssVar("--background-animation-color", "86, 108, 255"),
            count: reduced ? Math.max(18, Math.round(count * 0.35)) : count,
            speed: reduced ? 0.12 : toNumber(readCssVar("--background-animation-speed", 0.26), 0.26),
            maxDistance: reduced ? 5200 : toNumber(readCssVar("--background-animation-distance", 7200), 7200),
            mouseDistance: reduced ? 9000 : toNumber(readCssVar("--background-animation-mouse-distance", 18000), 18000)
        };
    }

    var width;
    var height;
    var particles = [];
    var allPoints = [];
    var canvas = document.createElement("canvas");
    var settings = getSettings();
    var context = canvas.getContext("2d");
    var requestFrame = window.requestAnimationFrame || window.webkitRequestAnimationFrame || window.mozRequestAnimationFrame || function (cb) {
        window.setTimeout(cb, 1000 / 45);
    };
    var mouse = { x: null, y: null, max: settings.mouseDistance };

    function resize() {
        width = canvas.width = window.innerWidth;
        height = canvas.height = window.innerHeight;
        canvas.style.opacity = settings.opacity;
        mouse.max = settings.mouseDistance;
        buildParticles();
    }

    function buildParticles() {
        particles = [];
        for (var i = 0; i < settings.count; i++) {
            particles.push({
                x: Math.random() * width,
                y: Math.random() * height,
                xa: (2 * Math.random() - 1) * settings.speed,
                ya: (2 * Math.random() - 1) * settings.speed,
                max: settings.maxDistance
            });
        }
        allPoints = particles.concat([mouse]);
    }

    function draw() {
        context.clearRect(0, 0, width, height);
        context.fillStyle = "rgba(" + settings.color + ",0.82)";

        particles.forEach(function (particle, index) {
            particle.x += particle.xa;
            particle.y += particle.ya;
            particle.xa *= particle.x > width || particle.x < 0 ? -1 : 1;
            particle.ya *= particle.y > height || particle.y < 0 ? -1 : 1;
            context.fillRect(particle.x - 0.7, particle.y - 0.7, 1.4, 1.4);

            for (var next = index + 1; next < allPoints.length; next++) {
                var other = allPoints[next];
                if (other.x === null || other.y === null) continue;

                var deltaX = particle.x - other.x;
                var deltaY = particle.y - other.y;
                var distance = deltaX * deltaX + deltaY * deltaY;

                if (distance < other.max) {
                    if (other === mouse && distance >= other.max / 2) {
                        particle.x -= 0.028 * deltaX;
                        particle.y -= 0.028 * deltaY;
                    }

                    var intensity = (other.max - distance) / other.max;
                    context.beginPath();
                    context.lineWidth = intensity * 1.1 + 0.16;
                    context.strokeStyle = "rgba(" + settings.color + "," + (intensity * 0.52 + 0.08) + ")";
                    context.moveTo(particle.x, particle.y);
                    context.lineTo(other.x, other.y);
                    context.stroke();
                }
            }
        });

        requestFrame(draw);
    }

    function refreshSettings() {
        settings = getSettings();
        canvas.style.opacity = settings.opacity;
        mouse.max = settings.mouseDistance;
        buildParticles();
    }

    canvas.id = "background-animation";
    canvas.setAttribute("aria-hidden", "true");
    canvas.style.cssText = "position:fixed;inset:0;z-index:" + settings.zIndex + ";pointer-events:none;width:100%;height:100%;";
    document.body.appendChild(canvas);

    resize();
    window.addEventListener("resize", resize, { passive: true });
    window.addEventListener("mousemove", function (event) {
        mouse.x = event.clientX;
        mouse.y = event.clientY;
    }, { passive: true });
    window.addEventListener("mouseout", function () {
        mouse.x = null;
        mouse.y = null;
    }, { passive: true });
    window.addEventListener("load", refreshSettings, { passive: true });

    if (reduceMotionQuery && typeof reduceMotionQuery.addEventListener === "function") {
        reduceMotionQuery.addEventListener("change", refreshSettings);
    }

    requestFrame(draw);
})();
