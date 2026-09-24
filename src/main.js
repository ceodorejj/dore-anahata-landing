// ============================================================
// D'ORÉ ANAHATA — Cinematic Redesign
// Lenis + GSAP + ScrollTrigger + WebGL + Botanical Orbits
// ============================================================

const reduceMotion = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
// "Touch / small" devices: no cursor effects, no tilt, no heavy canvases.
const isMobile = window.innerWidth < 760 || window.matchMedia("(hover: none)").matches;
// "Lite" mode (set early by an inline script in <head>): phones, tablets and
// weaker machines get a CSS sun instead of the WebGL shader.
const isLite = document.documentElement.classList.contains("is-lite");
const isStaticHero = document.documentElement.classList.contains("is-static-hero");
let THREE = null; // loaded on demand, only when it will actually be used

// Rotating a phone switches between the pinned hero and the static one;
// reloading is the simplest way to rebuild every pin/scrub correctly.
window
  .matchMedia("(max-height:520px) and (orientation:landscape)")
  .addEventListener("change", () => location.reload());

// ============================================================
// 1) LENIS — Smooth Scroll Engine
// ============================================================
let lenis;
if (!reduceMotion) {
  lenis = new Lenis({
    duration: 1.6,
    easing: (t) => Math.min(1, 1.001 - Math.pow(2, -10 * t)),
    orientation: "vertical",
    gestureOrientation: "vertical",
    smoothWheel: true,
    wheelMultiplier: 1.0,
    touchMultiplier: 1.2,
    infinite: false,
  });
}

// ============================================================
// 2) GSAP + ScrollTrigger — Animation Orchestration
// ============================================================
gsap.registerPlugin(ScrollTrigger);
// Mobile browsers resize the viewport while the URL bar shows/hides; without
// this every scroll gesture would re-measure all pinned sections.
ScrollTrigger.config({ ignoreMobileResize: true });

if (lenis) {
  lenis.on("scroll", ScrollTrigger.update);
  gsap.ticker.add((time) => {
    lenis.raf(time * 1000);
  });
  gsap.ticker.lagSmoothing(0);
}

// Anchor link navigation via Lenis
document.querySelectorAll('a[href^="#"]').forEach((a) => {
  a.addEventListener("click", (e) => {
    const href = a.getAttribute("href");
    if (href === "#") return;
    const target = document.querySelector(href);
    if (target) {
      e.preventDefault();
      if (lenis) lenis.scrollTo(target, { offset: -80 });
      else target.scrollIntoView({ behavior: "smooth", block: "start" });
    }
  });
});

// ============================================================
// 3) HERO — WebGL: sol radiante + god-rays + polvo dorado
// ============================================================
function initHeroGL() {
  const canvas = document.getElementById("gl-hero");
  if (!THREE || !canvas || reduceMotion) return null;

  const renderer = new THREE.WebGLRenderer({ canvas, alpha: true, antialias: true });
  renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));

  const scene = new THREE.Scene();
  const camera = new THREE.OrthographicCamera(-1, 1, 1, -1, 0, 1);

  const uniforms = {
    uTime: { value: 0 },
    uRes: { value: new THREE.Vector2(1, 1) },
    uSun: { value: new THREE.Vector2(0.55, 0.72) },
    uMouse: { value: new THREE.Vector2(0, 0) },
  };

  const sunMat = new THREE.ShaderMaterial({
    uniforms,
    transparent: true,
    vertexShader: /* glsl */ `
      varying vec2 vUv;
      void main(){ vUv = uv; gl_Position = vec4(position.xy, 0.0, 1.0); }
    `,
    fragmentShader: /* glsl */ `
      precision highp float;
      varying vec2 vUv;
      uniform float uTime; uniform vec2 uRes, uSun, uMouse;

      float hash(vec2 p){ return fract(sin(dot(p, vec2(127.1,311.7)))*43758.5453); }
      float noise(vec2 p){
        vec2 i=floor(p), f=fract(p);
        float a=hash(i), b=hash(i+vec2(1,0)), c=hash(i+vec2(0,1)), d=hash(i+vec2(1,1));
        vec2 u=f*f*(3.0-2.0*f);
        return mix(mix(a,b,u.x),mix(c,d,u.x),u.y);
      }
      float fbm(vec2 p){
        float v=0.0, a=0.5;
        for(int i=0;i<5;i++){ v+=a*noise(p); p*=2.0; a*=0.5; }
        return v;
      }

      void main(){
        vec2 uv = vUv;
        float aspect = uRes.x/uRes.y;
        vec2 sun = uSun + uMouse*0.04;
        vec2 d = uv - sun; d.x *= aspect;
        float dist = length(d);
        float ang = atan(d.y, d.x);

        float rays = fbm(vec2(ang*3.2, dist*2.0 - uTime*0.06));
        rays += fbm(vec2(ang*7.0 + 3.1, dist*3.0 + uTime*0.04))*0.5;
        rays = pow(rays, 2.2);
        float falloff = smoothstep(0.95, 0.0, dist);
        float beams = rays * falloff * 0.9;

        float core = smoothstep(0.34, 0.0, dist);
        float halo = smoothstep(0.85, 0.05, dist) * 0.55;

        vec3 gold = vec3(0.769, 0.635, 0.396);
        vec3 ocre = vec3(0.788, 0.659, 0.486);
        vec3 terr = vec3(0.612, 0.475, 0.373);

        vec3 col = vec3(0.0);
        col += gold * (core*1.3 + halo);
        col += mix(ocre, terr, dist) * beams;
        col += (hash(uv*uRes.xy + uTime)*2.0-1.0)*0.025;

        float alpha = clamp(core*1.2 + halo*0.9 + beams, 0.0, 1.0);
        gl_FragColor = vec4(col, alpha*0.82);
      }
    `,
  });
  scene.add(new THREE.Mesh(new THREE.PlaneGeometry(2, 2), sunMat));

  // Dust particles
  const COUNT = isMobile ? 100 : 240;
  const pos = new Float32Array(COUNT * 3);
  const seed = new Float32Array(COUNT);
  for (let i = 0; i < COUNT; i++) {
    pos[i * 3] = Math.random() * 2 - 1;
    pos[i * 3 + 1] = Math.random() * 2 - 1;
    seed[i] = Math.random();
  }
  const pGeo = new THREE.BufferGeometry();
  pGeo.setAttribute("position", new THREE.BufferAttribute(pos, 3));
  pGeo.setAttribute("aSeed", new THREE.BufferAttribute(seed, 1));

  const pMat = new THREE.ShaderMaterial({
    transparent: true,
    depthWrite: false,
    blending: THREE.AdditiveBlending,
    uniforms: {
      uTime: { value: 0 },
      uMouse: uniforms.uMouse,
      uDpr: { value: renderer.getPixelRatio() },
    },
    vertexShader: /* glsl */ `
      attribute float aSeed;
      uniform float uTime; uniform vec2 uMouse; uniform float uDpr;
      varying float vA;
      void main(){
        vec3 p = position; float s = aSeed;
        p.y = mod(p.y + 1.0 + uTime*(0.012 + s*0.02), 2.0) - 1.0;
        p.x += sin(uTime*(0.3+s) + s*12.0)*0.03;
        p.xy += uMouse * (0.02 + s*0.03);
        vA = 0.25 + 0.75*fract(s*7.0);
        gl_Position = vec4(p, 1.0);
        gl_PointSize = (1.0 + s*2.6) * uDpr;
      }
    `,
    fragmentShader: /* glsl */ `
      precision mediump float; varying float vA;
      void main(){
        float d = length(gl_PointCoord - 0.5);
        float a = smoothstep(0.5, 0.0, d) * vA;
        gl_FragColor = vec4(0.91, 0.82, 0.62, a);
      }
    `,
  });
  scene.add(new THREE.Points(pGeo, pMat));

  function resize() {
    const r = canvas.getBoundingClientRect();
    renderer.setSize(r.width, r.height, false);
    uniforms.uRes.value.set(r.width, r.height);
  }
  resize();
  window.addEventListener("resize", resize);

  return {
    render(t) {
      uniforms.uTime.value = t;
      pMat.uniforms.uTime.value = t;
      renderer.render(scene, camera);
    },
    setMouse(x, y) {
      uniforms.uMouse.value.set(x, y);
    },
  };
}

// ============================================================
// 4) PORTAL — floating embers
// ============================================================
function initPortalGL() {
  const canvas = document.getElementById("gl-portal");
  if (!THREE || !canvas || reduceMotion) return null;

  const renderer = new THREE.WebGLRenderer({ canvas, alpha: true, antialias: true });
  renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
  const scene = new THREE.Scene();
  const camera = new THREE.OrthographicCamera(-1, 1, 1, -1, 0, 1);

  const COUNT = isMobile ? 80 : 180;
  const pos = new Float32Array(COUNT * 3),
    seed = new Float32Array(COUNT);
  for (let i = 0; i < COUNT; i++) {
    pos[i * 3] = Math.random() * 2 - 1;
    pos[i * 3 + 1] = Math.random() * 2 - 1;
    seed[i] = Math.random();
  }
  const g = new THREE.BufferGeometry();
  g.setAttribute("position", new THREE.BufferAttribute(pos, 3));
  g.setAttribute("aSeed", new THREE.BufferAttribute(seed, 1));

  const m = new THREE.ShaderMaterial({
    transparent: true,
    depthWrite: false,
    blending: THREE.AdditiveBlending,
    uniforms: { uTime: { value: 0 }, uDpr: { value: renderer.getPixelRatio() } },
    vertexShader: /* glsl */ `
      attribute float aSeed; uniform float uTime; uniform float uDpr; varying float vA;
      void main(){
        vec3 p=position; float s=aSeed;
        p.y = mod(p.y + 1.0 + uTime*(0.006+s*0.01), 2.0)-1.0;
        p.x += sin(uTime*(0.2+s*0.6)+s*9.0)*0.04;
        vA = 0.3 + 0.7*fract(s*5.0);
        gl_Position=vec4(p,1.0);
        gl_PointSize=(0.8+s*2.2)*uDpr;
      }`,
    fragmentShader: /* glsl */ `
      precision mediump float; varying float vA;
      void main(){
        float d=length(gl_PointCoord-0.5);
        float a=smoothstep(0.5,0.0,d)*vA;
        gl_FragColor=vec4(0.88,0.80,0.64,a*0.65);
      }`,
  });
  scene.add(new THREE.Points(g, m));

  function resize() {
    const r = canvas.getBoundingClientRect();
    renderer.setSize(r.width, r.height, false);
  }
  resize();
  window.addEventListener("resize", resize);

  return {
    render(t) {
      m.uniforms.uTime.value = t;
      renderer.render(scene, camera);
    },
  };
}

let hero = null;
let portal = null;

// ============================================================
// 5) PARALLAX — pointer + gyroscope
// ============================================================
const clamp = (v, a, b) => Math.min(b, Math.max(a, v));
const par = { tx: 0, ty: 0, cx: 0, cy: 0 };
const setTarget = (x, y) => {
  par.tx = clamp(x, -1, 1);
  par.ty = clamp(y, -1, 1);
};

if (!reduceMotion) {
  window.addEventListener(
    "pointermove",
    (e) => {
      if (e.pointerType === "mouse")
        setTarget(
          (e.clientX / window.innerWidth) * 2 - 1,
          -((e.clientY / window.innerHeight) * 2 - 1)
        );
    },
    { passive: true }
  );

  window.addEventListener(
    "touchmove",
    (e) => {
      const t = e.touches[0];
      if (!t) return;
      setTarget(
        (t.clientX / window.innerWidth) * 2 - 1,
        -((t.clientY / window.innerHeight) * 2 - 1)
      );
    },
    { passive: true }
  );

  // Gyroscope
  const onOrient = (ev) => {
    if (ev.gamma == null && ev.beta == null) return;
    const gx = (ev.gamma || 0) / 32;
    const gy = ((ev.beta || 0) - 45) / 32;
    setTarget(clamp(gx, -1, 1), clamp(-gy, -1, 1));
  };
  const enableGyro = () => {
    if (window.DeviceOrientationEvent)
      window.addEventListener("deviceorientation", onOrient, { passive: true });
  };
  if (
    typeof DeviceOrientationEvent !== "undefined" &&
    typeof DeviceOrientationEvent.requestPermission === "function"
  ) {
    const ask = () =>
      DeviceOrientationEvent.requestPermission()
        .then((s) => {
          if (s === "granted") enableGyro();
        })
        .catch(() => {});
    window.addEventListener("touchend", ask, { once: true });
    window.addEventListener("click", ask, { once: true });
  } else {
    enableGyro();
  }
}

function stepHeroParallax() {
  par.cx += (par.tx - par.cx) * 0.06;
  par.cy += (par.ty - par.cy) * 0.06;
  if (hero) hero.setMouse(par.cx, par.cy);
}

// ============================================================
// 6) RENDER LOOP (WebGL)
// ============================================================
let time = 0;
let glRaf = null;
function startGL() {
  hero = initHeroGL();
  portal = initPortalGL();
  if (!hero && !portal) return;
  const tick = () => {
    time += 0.016;
    if (!reduceMotion) stepHeroParallax();
    if (hero) hero.render(time);
    if (portal) portal.render(time);
    glRaf = requestAnimationFrame(tick);
  };
  document.addEventListener("visibilitychange", () => {
    if (document.hidden) cancelAnimationFrame(glRaf);
    else glRaf = requestAnimationFrame(tick);
  });
  tick();
}

// WebGL is optional: load three.js only on capable devices. If the module
// fails to load (offline, blocked), fall back to the CSS sun instead.
if (!isLite && !reduceMotion) {
  import("three")
    .then((mod) => {
      THREE = mod;
      startGL();
    })
    .catch(() => document.documentElement.classList.add("is-lite"));
}

// ============================================================
// 7) GSAP SCROLL ANIMATIONS
// ============================================================

// --- 7a) Reveal animations (replaces IntersectionObserver) ---
const rvEls = [...document.querySelectorAll(".rv")];
rvEls.forEach((el) => {
  const d = el.dataset.d || "0";
  el.style.setProperty("--rv-d", d + "s");
});

if (!reduceMotion) {
  // All .rv elements: reveal once (no toggle to avoid disappearing content)
  rvEls.forEach((el) => {
    ScrollTrigger.create({
      trigger: el,
      start: "top 92%",
      onEnter: () => el.classList.add("is-in"),
      once: true,
    });
  });
} else {
  rvEls.forEach((el) => el.classList.add("is-in"));
}

// --- 7b) Hero Cinematic Slider — 3 Phases ---
if (!reduceMotion && !isStaticHero) {
  const heroSection = document.getElementById("hero");
  const heroProduct = document.getElementById("heroProduct");
  const heroPhase1 = document.getElementById("heroPhase1");
  const heroPhase2 = document.getElementById("heroPhase2");
  const heroAmbient = document.getElementById("heroAmbient");
  if (heroSection && heroProduct) {
    // GSAP owns the transform once it starts tweening scale/rotation on this
    // element: it rewrites the whole inline `transform`, which silently drops
    // the CSS `translate(-50%,-50%)` that keeps it centered on its left/top
    // anchor. Bake that offset in as xPercent/yPercent so every subsequent
    // left/top/scale/rotation tween keeps the element truly centered instead
    // of drifting toward the bottom-right by half its own size.
    gsap.set(heroProduct, { xPercent: -50, yPercent: -50, rotation: 15, scale: 1 });

    // Master timeline pinned to hero
    const heroTl = gsap.timeline({
      scrollTrigger: {
        trigger: ".hero",
        start: "top top",
        end: "+=280%",
        scrub: 1,
        pin: true,
      },
    });

    // PHASE 1 → 2: Cinematic transition
    // Fade out brand UI and move up
    heroTl.to(heroPhase1, {
      opacity: 0, y: -40, duration: 1, ease: "power2.in"
    }, 0);

    // Release the legibility scrim once the copy is gone (mobile only in CSS)
    // On mobile it stays: phase 2 renders its grid over the same glare
    const heroScrim = document.getElementById("heroScrim");
    if (heroScrim && !isMobile) {
      heroTl.to(heroScrim, {
        opacity: 0, duration: 1, ease: "power2.in"
      }, 0);
    }

    // Reduce ambient blur from 12px to 5px + parallax scale
    heroTl.to(".hero__ambient img", {
      filter: "blur(5px)", scale: 1.0, duration: 1.5, ease: "none"
    }, 0);

    // Transform product: scale down, center on the ecosystem axis, rotate to 0
    heroTl.to(heroProduct, {
      scale: 0.62, left: "50%", top: "50%", rotation: 0,
      xPercent: -50, yPercent: -50,
      duration: 1.5, ease: "power2.inOut"
    }, 0);

    // The scroll hint belongs to phase 1 only
    heroTl.to(".hero__scroll", {
      opacity: 0, duration: 0.5, ease: "power2.in"
    }, 0);

    // PHASE 2 → 3: Blueprint reveal
    // Show volumetric glow
    heroTl.to(".hero__glow", {
      opacity: 1, duration: 0.8
    }, 1);

    // Show particles canvas
    heroTl.to(".hero__particles", {
      opacity: 1, duration: 0.8
    }, 1);

    // Reveal Phase 2 features
    heroTl.to(heroPhase2, {
      opacity: 1, duration: 0.6, onStart: () => {
        heroPhase2.style.pointerEvents = "auto";
      }
    }, 1.2);

    // Stagger feature cards
    heroTl.fromTo(".hero__feature", {
      opacity: 0, y: 30
    }, {
      opacity: 1, y: 0, duration: 0.8, stagger: 0.15, ease: "power3.out"
    }, 1.3);

    // Ecosystem header and closing block
    heroTl.fromTo(".eco__head, .eco__foot", {
      opacity: 0, y: 18
    }, {
      opacity: 1, y: 0, duration: 0.7, stagger: 0.12, ease: "power3.out"
    }, 1.25);
  }

  // Hero product mouse parallax (damping 0.1)
  if (heroProduct && !isMobile) {
    let prodTx = 0, prodTy = 0, prodCx = 0, prodCy = 0;
    window.addEventListener("pointermove", (e) => {
      if (e.pointerType !== "mouse") return;
      prodTx = ((e.clientX / window.innerWidth) - 0.5) * 12;
      prodTy = ((e.clientY / window.innerHeight) - 0.5) * 8;
    }, { passive: true });

    function tickProductParallax() {
      prodCx += (prodTx - prodCx) * 0.1;
      prodCy += (prodTy - prodCy) * 0.1;
      // Only apply mouse offset, GSAP handles the main transform
      heroProduct.style.setProperty("--mouse-x", prodCx + "px");
      heroProduct.style.setProperty("--mouse-y", prodCy + "px");
      requestAnimationFrame(tickProductParallax);
    }
    tickProductParallax();
  }
}

// --- 7b-2) Hero particles canvas (Phase 3 golden dust) ---
(function initHeroParticles() {
  const canvas = document.getElementById("heroParticles");
  if (!canvas || reduceMotion || isMobile) return;

  const ctx = canvas.getContext("2d");
  const particles = [];
  const COUNT = 80;

  function resize() {
    canvas.width = window.innerWidth * window.devicePixelRatio;
    canvas.height = window.innerHeight * window.devicePixelRatio;
    ctx.scale(window.devicePixelRatio, window.devicePixelRatio);
  }

  for (let i = 0; i < COUNT; i++) {
    particles.push({
      x: Math.random(), y: Math.random(),
      r: 0.8 + Math.random() * 2,
      speed: 0.0002 + Math.random() * 0.0006,
      drift: Math.random() * Math.PI * 2,
      alpha: 0.15 + Math.random() * 0.4,
    });
  }
  resize();
  window.addEventListener("resize", resize);

  function draw() {
    const w = window.innerWidth, h = window.innerHeight;
    ctx.clearRect(0, 0, w, h);
    for (const p of particles) {
      p.y -= p.speed;
      p.x += Math.sin(p.drift + performance.now() * 0.0008) * 0.0002;
      if (p.y < -0.02) { p.y = 1.02; p.x = Math.random(); }
      ctx.beginPath();
      ctx.arc(p.x * w, p.y * h, p.r, 0, Math.PI * 2);
      ctx.fillStyle = `rgba(212,188,138,${p.alpha * 0.7})`;
      ctx.fill();
    }
    requestAnimationFrame(draw);
  }
  draw();
})();

// --- 7c) Transform Before/After (Prompt 04) ---
if (!reduceMotion) {
  const transformSection = document.querySelector(".transform");
  if (transformSection) {
    gsap.to(".transform__side--after", {
      clipPath: "inset(0 0% 0 0)",
      ease: "none",
      scrollTrigger: {
        trigger: ".transform",
        start: "top top",
        end: "bottom bottom",
        scrub: true,
      },
    });

    // Labels fade
    gsap.to(".transform__label--before", {
      opacity: 0,
      scrollTrigger: {
        trigger: ".transform",
        start: "30% top",
        end: "50% top",
        scrub: true,
      },
    });
    gsap.fromTo(
      ".transform__label--after",
      { opacity: 0 },
      {
        opacity: 1,
        scrollTrigger: {
          trigger: ".transform",
          start: "50% top",
          end: "70% top",
          scrub: true,
        },
      }
    );
  }
}

// --- 7d) Transform particles canvas ---
(function initTransformParticles() {
  const canvas = document.getElementById("transformParticles");
  if (!canvas || reduceMotion || isMobile) return;

  const ctx = canvas.getContext("2d");
  const particles = [];
  const COUNT = 60;

  function resize() {
    const rect = canvas.parentElement.getBoundingClientRect();
    canvas.width = rect.width * window.devicePixelRatio;
    canvas.height = rect.height * window.devicePixelRatio;
    canvas.style.width = rect.width + "px";
    canvas.style.height = rect.height + "px";
    ctx.scale(window.devicePixelRatio, window.devicePixelRatio);
  }

  for (let i = 0; i < COUNT; i++) {
    particles.push({
      x: Math.random(),
      y: Math.random(),
      r: 1 + Math.random() * 2,
      speed: 0.0003 + Math.random() * 0.0008,
      drift: Math.random() * Math.PI * 2,
      alpha: 0.2 + Math.random() * 0.5,
    });
  }

  resize();
  window.addEventListener("resize", resize);

  function draw() {
    const w = canvas.width / window.devicePixelRatio;
    const h = canvas.height / window.devicePixelRatio;
    ctx.clearRect(0, 0, w, h);

    for (const p of particles) {
      p.y -= p.speed;
      p.x += Math.sin(p.drift + performance.now() * 0.001) * 0.0003;
      if (p.y < -0.02) {
        p.y = 1.02;
        p.x = Math.random();
      }

      ctx.beginPath();
      ctx.arc(p.x * w, p.y * h, p.r, 0, Math.PI * 2);
      ctx.fillStyle = `rgba(212,188,138,${p.alpha * 0.7})`;
      ctx.fill();
    }

    requestAnimationFrame(draw);
  }
  draw();
})();

// --- 7e) Manifesto editorial blur reveals (Prompt 05) ---
if (!reduceMotion) {
  const manifestoLines = document.querySelectorAll(".manifesto__line");
  manifestoLines.forEach((line) => {
    gsap.fromTo(
      line,
      { opacity: 0, filter: "blur(8px)" },
      {
        opacity: 1,
        filter: "blur(0px)",
        duration: 1,
        scrollTrigger: {
          trigger: line,
          start: "top 85%",
          end: "top 55%",
          scrub: true,
        },
      }
    );
  });

  // Manifesto cite
  gsap.fromTo(
    ".manifesto__cite",
    { opacity: 0, y: 20 },
    {
      opacity: 1,
      y: 0,
      scrollTrigger: {
        trigger: ".manifesto__cite",
        start: "top 90%",
        end: "top 70%",
        scrub: true,
      },
    }
  );
}

// --- 7f) Ritual cinematic dissolve (Prompt 06) ---
if (!reduceMotion) {
  const ritualCinema = document.querySelector(".ritual__cinema");
  if (ritualCinema) {
    const slides = document.querySelectorAll(".ritual__slide");
    const numSlides = slides.length;

    // Timeline for dissolve transitions
    const ritualTl = gsap.timeline({
      scrollTrigger: {
        trigger: ".ritual__cinema",
        start: "top top",
        end: `+=${numSlides * 100}%`,
        scrub: true,
        pin: true,
      },
    });

    // Build dissolve chain: slide 0 → 1 → 2 → 3
    for (let i = 0; i < numSlides - 1; i++) {
      ritualTl
        .to(slides[i], { opacity: 0, filter: "blur(10px)", duration: 1 }, `+=${0.3}`)
        .fromTo(
          slides[i + 1],
          { opacity: 0, filter: "blur(10px)" },
          { opacity: 1, filter: "blur(0px)", duration: 1 },
          "-=0.7"
        );
    }
  }
}

// --- 7g) Botanical orbital animation (Prompt 07) ---
(function botanicalOrbit() {
  if (reduceMotion || isMobile) return;
  const container = document.getElementById("botanical");
  if (!container) return;

  const items = container.querySelectorAll(".botanical__item");
  const parent = container.closest(".services__visual");
  if (!parent || !items.length) return;

  // Orbit parameters for each item
  const orbits = [
    { rx: 0.42, ry: 0.38, speed: 0.4, phase: 0 },
    { rx: 0.35, ry: 0.45, speed: 0.3, phase: Math.PI * 0.5 },
    { rx: 0.48, ry: 0.32, speed: 0.35, phase: Math.PI },
    { rx: 0.3, ry: 0.42, speed: 0.45, phase: Math.PI * 1.5 },
    { rx: 0.44, ry: 0.36, speed: 0.28, phase: Math.PI * 0.8 },
  ];

  let isVisible = false;

  ScrollTrigger.create({
    trigger: container,
    start: "top 80%",
    end: "bottom 20%",
    onEnter: () => {
      isVisible = true;
      items.forEach((el) => el.classList.add("is-orbiting"));
    },
    onLeave: () => {
      isVisible = false;
      items.forEach((el) => el.classList.remove("is-orbiting"));
    },
    onEnterBack: () => {
      isVisible = true;
      items.forEach((el) => el.classList.add("is-orbiting"));
    },
    onLeaveBack: () => {
      isVisible = false;
      items.forEach((el) => el.classList.remove("is-orbiting"));
    },
  });

  function animate() {
    if (!isVisible) {
      requestAnimationFrame(animate);
      return;
    }

    const t = performance.now() * 0.001;
    const rect = parent.getBoundingClientRect();
    const cx = rect.width * 0.5;
    const cy = rect.height * 0.4;

    items.forEach((el, i) => {
      const o = orbits[i % orbits.length];
      const x = cx + o.rx * rect.width * Math.cos(o.speed * t + o.phase);
      const y = cy + o.ry * rect.height * Math.sin(o.speed * t + o.phase);
      el.style.transform = `translate(${x}px, ${y}px) translate(-50%, -50%)`;
    });

    requestAnimationFrame(animate);
  }
  animate();
})();

// --- 7h) CTA animations (Prompt 10) ---
if (!reduceMotion) {
  // Finale product float in
  gsap.fromTo(
    ".cta__finale img",
    { y: 60, opacity: 0, scale: 0.8 },
    {
      y: 0,
      opacity: 1,
      scale: 1,
      scrollTrigger: {
        trigger: ".cta__finale",
        start: "top 85%",
        end: "top 50%",
        scrub: true,
      },
    }
  );
}

// ============================================================
// 8) NAV — stuck state
// ============================================================
const nav = document.getElementById("nav");
const heroEl = document.getElementById("hero");
if (heroEl) {
  // Nav becomes stuck after hero pin ends
  ScrollTrigger.create({
    trigger: heroEl,
    start: "top top",
    // Match the pin end distance
    endTrigger: heroEl,
    end: "bottom top",
    onLeave: () => nav.classList.add("is-stuck"),
    onEnterBack: () => nav.classList.remove("is-stuck"),
  });
}

// ============================================================
// 9) RETO 21 DIAS — grid + sequential glow
// ============================================================
(function reto() {
  const grid = document.getElementById("retoGrid");
  if (!grid) return;
  for (let i = 1; i <= 21; i++) {
    const cell = document.createElement("div");
    cell.className = "reto__cell";
    cell.textContent = i;
    grid.appendChild(cell);
  }
  const cells = [...grid.children];

  ScrollTrigger.create({
    trigger: grid,
    start: "top 70%",
    onEnter: () => {
      if (reduceMotion) {
        cells.forEach((c) => c.classList.add("is-on"));
        return;
      }
      cells.forEach((c, i) => setTimeout(() => c.classList.add("is-on"), i * 80));
    },
    once: true,
  });
})();

// ============================================================
// 10) SCROLL PROGRESS BAR
// ============================================================
(function scrollProgress() {
  const bar = document.getElementById("navProgress");
  if (!bar) return;

  if (lenis) {
    lenis.on("scroll", ({ progress }) => {
      bar.style.width = (progress * 100).toFixed(1) + "%";
    });
  } else {
    function update() {
      const h = document.documentElement.scrollHeight - window.innerHeight;
      const p = h > 0 ? (window.scrollY / h) * 100 : 0;
      bar.style.width = p + "%";
    }
    window.addEventListener("scroll", update, { passive: true });
    update();
  }
})();

// ============================================================
// 11) CUSTOM CURSOR (desktop only)
// ============================================================
(function cursor() {
  if (reduceMotion || window.matchMedia("(pointer:coarse)").matches) return;
  const el = document.getElementById("cursor");
  if (!el) return;

  let cx = 0,
    cy = 0,
    tx = 0,
    ty = 0;
  const interactives =
    "a, button, input, [data-magnetic], .pill, .bento__item, .svc-item, .portal__card, .ritual__slide";

  document.addEventListener("mousemove", (e) => { tx = e.clientX; ty = e.clientY; }, { passive: true });

  document.addEventListener("mouseover", (e) => {
    if (e.target.closest(interactives)) el.classList.add("is-hover");
  });
  document.addEventListener("mouseout", (e) => {
    if (e.target.closest(interactives)) el.classList.remove("is-hover");
  });

  function tick() {
    cx += (tx - cx) * 0.12;
    cy += (ty - cy) * 0.12;
    el.style.transform = `translate3d(${cx}px, ${cy}px, 0)`;
    requestAnimationFrame(tick);
  }
  tick();
})();

// ============================================================
// 12) MAGNETIC BUTTONS
// ============================================================
(function magnetic() {
  if (reduceMotion || isMobile) return;
  const els = document.querySelectorAll("[data-magnetic]");

  els.forEach((el) => {
    el.addEventListener("mousemove", (e) => {
      const rect = el.getBoundingClientRect();
      const x = e.clientX - rect.left - rect.width / 2;
      const y = e.clientY - rect.top - rect.height / 2;
      el.style.transform = `translate(${x * 0.15}px, ${y * 0.15}px)`;
    });
    el.addEventListener("mouseleave", () => {
      el.style.transform = "";
      el.style.transition = "transform .5s cubic-bezier(.16,1,.3,1)";
      setTimeout(() => {
        el.style.transition = "";
      }, 500);
    });
  });
})();

// ============================================================
// 13) HAMBURGER + MOBILE MENU
// ============================================================
(function mobileMenu() {
  const burger = document.getElementById("burger");
  const menu = document.getElementById("mobileMenu");
  if (!burger || !menu) return;

  const links = menu.querySelectorAll(".mobile-menu__nav a");
  links.forEach((a, i) => a.style.setProperty("--i", i));

  function toggle() {
    const open = burger.classList.toggle("is-open");
    menu.classList.toggle("is-open", open);
    burger.setAttribute("aria-expanded", open);
    menu.setAttribute("aria-hidden", !open);
    document.body.style.overflow = open ? "hidden" : "";
    if (lenis) {
      if (open) lenis.stop();
      else lenis.start();
    }
  }

  burger.addEventListener("click", toggle);
  links.forEach((a) =>
    a.addEventListener("click", () => {
      if (burger.classList.contains("is-open")) toggle();
    })
  );
})();

// ============================================================
// 14) ANIMATED COUNTERS
// ============================================================
(function counters() {
  const els = document.querySelectorAll("[data-counter]");
  if (!els.length) return;

  els.forEach((el) => {
    ScrollTrigger.create({
      trigger: el,
      start: "top 80%",
      onEnter: () => {
        const target = parseInt(el.dataset.counter, 10);
        const isPrice = el.dataset.format === "price";
        const duration = 1800;
        const start = performance.now();

        function step(now) {
          const t = Math.min((now - start) / duration, 1);
          const ease = 1 - Math.pow(1 - t, 4);
          const val = Math.round(ease * target);
          el.textContent = val.toLocaleString("es-CO");
          if (t < 1) requestAnimationFrame(step);
        }
        requestAnimationFrame(step);
      },
      once: true,
    });
  });
})();

// ============================================================
// 15) 3D TILT ON CARDS
// ============================================================
(function tilt() {
  if (reduceMotion || isMobile) return;
  const els = document.querySelectorAll("[data-tilt]");

  els.forEach((el) => {
    el.addEventListener("mousemove", (e) => {
      const rect = el.getBoundingClientRect();
      const x = (e.clientX - rect.left) / rect.width - 0.5;
      const y = (e.clientY - rect.top) / rect.height - 0.5;
      el.style.transform = `perspective(600px) rotateX(${(-y * 8).toFixed(
        1
      )}deg) rotateY(${(x * 8).toFixed(1)}deg) translateY(-4px)`;
    });
    el.addEventListener("mouseleave", () => {
      el.style.transform = "";
    });
  });
})();

// ============================================================
// 16) FORMS — POST /api/lead
//
// Every message below is shown only after the server confirms the write.
// A previous version resolved these forms optimistically in the browser and
// told visitors "Reserva confirmada" while nothing was ever stored.
//
// STANDALONE NOTE: esta réplica no incluye backend. Para conectar los
// formularios, define LEAD_ENDPOINT (p. ej. "/api/lead" o un webhook de
// Formspree/Make/Zapier). Mientras sea null, los formularios funcionan en
// modo demostración y lo dicen con honestidad.
// ============================================================
const LEAD_ENDPOINT = null;

/** Send one lead. Resolves true only when the row was actually persisted. */
async function postLead(payload) {
  if (!LEAD_ENDPOINT) return "demo";
  try {
    const res = await fetch(LEAD_ENDPOINT, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload),
    });
    return res.ok;
  } catch {
    return false; // offline or blocked — still a failure, never a false success
  }
}

/**
 * Wire a form to the leads endpoint, keeping the button in a truthful state:
 * disabled while in flight, permanently done on success, restored on failure
 * so the visitor can retry instead of losing what they typed.
 */
function wireLeadForm(form, { kind, okMessage, sendingLabel, doneLabel, statusEl }) {
  if (!form) return;

  const btn = form.querySelector("button");
  const original = btn ? btn.textContent : "";

  const say = (message, isError) => {
    if (!statusEl) return;
    statusEl.textContent = message;
    statusEl.classList.toggle("cta__ok--error", Boolean(isError));
    statusEl.hidden = false;
  };

  form.addEventListener("submit", async (e) => {
    e.preventDefault();
    if (btn?.disabled) return;

    const data = new FormData(form);
    if (btn) {
      btn.disabled = true;
      btn.textContent = sendingLabel;
    }

    const sent = await postLead({
      kind,
      email: data.get("email"),
      place: data.get("lugar") || undefined,
      website: data.get("website") || undefined,
      consent: true,
    });

    if (sent === "demo") {
      if (btn) {
        btn.disabled = false;
        btn.textContent = original;
      }
      say(
        "Modo demostración: este formulario aún no está conectado a un servidor, no se guardó ningún dato.",
        true
      );
      return;
    }

    if (sent) {
      form.reset();
      if (btn) btn.textContent = doneLabel;
      say(okMessage, false);
      return;
    }

    if (btn) {
      btn.disabled = false;
      btn.textContent = original;
    }
    say(
      "No pudimos guardar tus datos. Intenta de nuevo o escribenos a hola@doreanahata.co.",
      true
    );
  });
}

wireLeadForm(document.getElementById("b2bForm"), {
  kind: "b2b",
  sendingLabel: "Enviando...",
  doneLabel: "Solicitud recibida",
  okMessage: "Gracias. Te contactamos para coordinar la formacion del ritual.",
  statusEl: document.getElementById("b2bOk"),
});

// The reservation form is built on demand: the button becomes the form.
const buyBtn = document.getElementById("buyBtn");
if (buyBtn) {
  buyBtn.addEventListener("click", (e) => {
    e.preventDefault();

    const wrapper = document.createElement("div");
    wrapper.innerHTML = `
      <form class="form" id="reservaForm">
        <input type="email" name="email" placeholder="tu@correo.com" required maxlength="254" />
        <div class="form__hp" aria-hidden="true">
          <label>No llenar<input type="text" name="website" tabindex="-1" autocomplete="off" /></label>
        </div>
        <button type="submit" class="btn btn--gold btn--sm" data-magnetic>Reservar</button>
        <p class="form__consent">Sin cobro: reservas tu lugar en la lista de espera. Al enviar autorizas el tratamiento de tus datos para avisarte cuando abramos la venta.</p>
      </form>
      <p class="cta__ok" id="reservaOk" hidden></p>
    `;

    buyBtn.replaceWith(wrapper);

    wireLeadForm(wrapper.querySelector("#reservaForm"), {
      kind: "reserva",
      sendingLabel: "Reservando...",
      doneLabel: "Lugar reservado",
      okMessage: "Reserva confirmada. Te avisamos apenas abramos la venta.",
      statusEl: wrapper.querySelector("#reservaOk"),
    });

    wrapper.querySelector("input")?.focus();
  });
}

// ============================================================
// 17) REFRESH — recalculate all ScrollTrigger positions
//     after hero pin spacer modifies document flow
// ============================================================
requestAnimationFrame(() => {
  ScrollTrigger.sort();
  ScrollTrigger.refresh();
});

// ============================================================
// 18) ACTIVITY TOAST — bottom-left social proof
//     Driven by /api/social-proof, which reports waiting-list
//     reservations only. Nothing here invents activity: if the
//     endpoint says there is too little, the toast never runs.
//     (Sin backend, el endpoint no existe y el aviso nunca aparece.)
// ============================================================
(() => {
  const root = document.getElementById("proof");
  if (!root) return;

  const DISMISSED = "dore_proof_dismissed";
  try {
    if (sessionStorage.getItem(DISMISSED)) return;
  } catch {
    // Private mode or blocked storage: fall through and just show the toast.
  }

  const reduced = matchMedia("(prefers-reduced-motion: reduce)").matches;
  const FIRST_DELAY = 14000; // let the hero land before anything pops
  const GAP = reduced ? 60000 : 42000;
  const JITTER = 9000; // so the rhythm never feels mechanical
  const VISIBLE = 6500;
  const MAX_SHOWS = 6; // then it stops for good — a toast that nags is a banner

  const SUN = `<svg viewBox="0 0 24 24" fill="none" aria-hidden="true">
    <circle cx="12" cy="12" r="4.2" stroke="currentColor" stroke-width="1.3"/>
    <g stroke="currentColor" stroke-width="1.3" stroke-linecap="round">
      <path d="M12 2.4v2.6M12 19v2.6M2.4 12h2.6M19 12h2.6"/>
      <path d="M5.2 5.2l1.9 1.9M16.9 16.9l1.9 1.9M18.8 5.2l-1.9 1.9M7.1 16.9l-1.9 1.9"/>
    </g>
  </svg>`;
  const MARK = `<svg viewBox="0 0 24 24" fill="none" aria-hidden="true">
    <path d="M12 3l2.2 5.9L20 11l-5.8 2.1L12 19l-2.2-5.9L4 11l5.8-2.1z"
          stroke="currentColor" stroke-width="1.2" stroke-linejoin="round"/>
  </svg>`;

  /** "hace 4 minutos" / "hace 2 horas" — the endpoint only ever sends minutes. */
  const ago = (minutes) => {
    if (minutes < 60) return `hace ${minutes} ${minutes === 1 ? "minuto" : "minutos"}`;
    const h = Math.round(minutes / 60);
    if (h < 24) return `hace ${h} ${h === 1 ? "hora" : "horas"}`;
    const d = Math.round(h / 24);
    return `hace ${d} ${d === 1 ? "dia" : "dias"}`;
  };

  /**
   * Interleaves the two truthful message shapes: one per recent reservation,
   * plus the running total every third slot so the number keeps reappearing.
   */
  function buildQueue({ total, recent }) {
    const events = recent.map((minutes) => ({
      icon: SUN,
      line: "Alguien acaba de reservar su lugar",
      meta: `${ago(minutes)} &middot; lista de espera`,
    }));
    const totalCard = {
      icon: MARK,
      line: `<strong>${total} personas</strong> ya reservaron su lugar`,
      meta: "Lista de espera D'OR&Eacute; Anahata",
    };

    const queue = [];
    events.forEach((event, i) => {
      queue.push(event);
      if (i % 3 === 2) queue.push(totalCard);
    });
    if (!queue.includes(totalCard)) queue.push(totalCard);
    return queue.slice(0, MAX_SHOWS);
  }

  function render(item, design) {
    root.innerHTML = `
      <div class="proof__card proof__card--${design}">
        <span class="proof__icon">${item.icon}</span>
        <div class="proof__body">
          <p class="proof__line">${item.line}</p>
          <p class="proof__meta">${item.meta}</p>
        </div>
        <button type="button" class="proof__close" aria-label="Cerrar aviso">&times;</button>
      </div>`;

    root.querySelector(".proof__close").addEventListener("click", stop);
    return root.querySelector(".proof__card");
  }

  let timer = null;
  let stopped = false;

  function stop() {
    stopped = true;
    clearTimeout(timer);
    root.hidden = true;
    root.innerHTML = "";
    try {
      sessionStorage.setItem(DISMISSED, "1");
    } catch {
      /* nothing to persist to — the toast simply reappears next visit */
    }
  }

  function run(queue) {
    let i = 0;

    const showNext = () => {
      if (stopped || i >= queue.length) return;

      // A toast that animates in a background tab is a toast nobody saw:
      // wait for the visitor to come back instead of burning a slot.
      if (document.hidden) {
        timer = setTimeout(showNext, 5000);
        return;
      }

      // Unhide before writing: a live region mutated while hidden is not
      // reliably announced by screen readers.
      root.hidden = false;

      // Alternate the two designs.
      const card = render(queue[i], i % 2 === 0 ? "glass" : "arena");
      i += 1;

      requestAnimationFrame(() => card.classList.add("proof__card--in"));

      timer = setTimeout(() => {
        card.classList.remove("proof__card--in");
        timer = setTimeout(() => {
          if (stopped) return;
          root.hidden = true;
          timer = setTimeout(showNext, GAP + Math.random() * JITTER);
        }, 500);
      }, VISIBLE);
    };

    timer = setTimeout(showNext, FIRST_DELAY);
  }

  fetch("/api/social-proof")
    .then((res) => (res.ok ? res.json() : null))
    .then((data) => {
      if (!data?.enabled || !data.total) return;
      const queue = buildQueue(data);
      if (queue.length) run(queue);
    })
    .catch(() => {
      /* offline or endpoint down: no toast, and no invented activity */
    });
})();
