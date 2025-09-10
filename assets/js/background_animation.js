(function () {
    function n(n, e, t) { return n.getAttribute(e) || t; }
    function e(n) { return document.getElementsByTagName(n); }
    function t() {
        var t = e("script"), o = t.length, i = t[o - 1];
        return {
            l: o,
            z: n(i, "zIndex", -1),
            o: n(i, "opacity", 0.5),
            c: getNightModeColor(),
            n: n(i, "count", 99)
        };
    }

    function isNightMode() {
        return document.body.classList.contains("dark-mode");
    }

    function getNightModeColor() {
        return isNightMode() ? "255, 255, 255" : "0, 0, 0";
    }

    function o() {
        a = m.width = window.innerWidth;
        c = m.height = window.innerHeight;
    }

    function i() {
        r.clearRect(0, 0, a, c);
        s.forEach(function(particle, x) {
            particle.x += particle.xa;
            particle.y += particle.ya;
            particle.xa *= particle.x > a || particle.x < 0 ? -1 : 1;
            particle.ya *= particle.y > c || particle.y < 0 ? -1 : 1;
            r.fillRect(particle.x - 0.5, particle.y - 0.5, 1, 1);

            for (var e = x + 1; e < u.length; e++) {
                var other = u[e], o, m, l;
                if (other.x !== null && other.y !== null) {
                    o = particle.x - other.x;
                    m = particle.y - other.y;
                    l = o * o + m * m;

                    if (l < other.max) {
                        if (other === y && l >= other.max / 2) {
                            particle.x -= 0.03 * o;
                            particle.y -= 0.03 * m;
                        }

                        var t = (other.max - l) / other.max;
                        r.beginPath();
                        r.lineWidth = t / 1.5;
                        r.strokeStyle = "rgba(" + d.c + "," + (t + 0.2) + ")";
                        r.moveTo(particle.x, particle.y);
                        r.lineTo(other.x, other.y);
                        r.stroke();
                    }
                }
            }
        });
        requestAnimationFrame(i);
    }

    var a, c, u,
        m = document.createElement("canvas"),
        d = t(),
        r = m.getContext("2d"),
        x = window.requestAnimationFrame || window.webkitRequestAnimationFrame || window.mozRequestAnimationFrame ||
            function(n) { window.setTimeout(n, 1e3 / 45); },
        w = Math.random,
        y = { x: null, y: null, max: 20000 },
        s = [];

    m.id = "background-animation";
    m.style.cssText = "position:fixed;top:0;left:0;z-index:" + d.z + ";opacity:" + d.o;
    document.body.appendChild(m);
    o();
    window.onresize = o;
    window.onmousemove = function(n) { y.x = n.clientX; y.y = n.clientY; };
    window.onmouseout = function() { y.x = null; y.y = null; };

    const SPEED_FACTOR = 0.3;
    function createParticles() {
        s = [];
        for (var f = 0; f < d.n; f++) {
            var h = w() * a,
                g = w() * c,
                v = (2 * w() - 1) * SPEED_FACTOR,
                p = (2 * w() - 1) * SPEED_FACTOR;
            s.push({ x: h, y: g, xa: v, ya: p, max: isNightMode() ? 10000 : 6000 });
        }
        u = s.concat([y]);
    }

    createParticles();
    setTimeout(i, 100);
    window.requestAnimationFrame(i);

    function updateBackgroundAnimation() {
        d.c = getNightModeColor();
        r.clearRect(0, 0, a, c);
        createParticles(); // Reset particles with the new color
    }

    function attachToggle() {
        updateBackgroundAnimation(); // Apply the correct color when the page loads

        var toggleButton = document.getElementById("dark-mode-toggle");
        if (toggleButton) {
            toggleButton.addEventListener("click", function () {
                document.body.classList.toggle("dark-mode");
                localStorage.setItem("dark-mode", isNightMode() ? "enabled" : "disabled");

                d.c = getNightModeColor();
                updateBackgroundAnimation();
            });
        }
    }

    // Start the animation
    function startAnimation() {
        if (!m || !r) return;
        requestAnimationFrame(i); // Ensures animation loop runs
    }

    // Ensure the animation starts on page load
    document.addEventListener("DOMContentLoaded", function() {
        startAnimation();
    });


    // Ensure dark mode toggle updates animation
    //if (document.readyState === "complete" || document.readyState === "interactive") {
    //    attachToggle();
    //} else {
    //    document.addEventListener("DOMContentLoaded", attachToggle);
    //}

    // Update animation color when dark mode is toggled
    document.addEventListener("DOMContentLoaded", function () {
        if (document.getElementById("dark-mode-toggle")) {
            document.getElementById("dark-mode-toggle").addEventListener("click", function () {
                setTimeout(updateBackgroundAnimation, 100);
            });
        }
    });


})();
