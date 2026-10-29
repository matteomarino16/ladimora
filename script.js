/* =========================================================
   La Dimora di Nonna Dora — script.js
   ========================================================= */

const prefersReducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;

const finePointer = window.matchMedia('(hover: hover) and (pointer: fine)').matches;
const clamp = (value, min, max) => Math.min(Math.max(value, min), max);
const easeOutCubic = (t) => 1 - (1 - t) ** 3;
const easeOutBack = (t) => 1 + 2.2 * (t - 1) ** 3 + 1.2 * (t - 1) ** 2;
const easeInOutSine = (t) => -(Math.cos(Math.PI * t) - 1) / 2;

/* ---------- Header durante lo scroll ---------- */
function initHeader() {
    const header = document.getElementById('site-header');
    if (!header) return;

    const update = () => header.classList.toggle('is-scrolled', window.scrollY > 20);
    update();
    window.addEventListener('scroll', update, { passive: true });
}

/* ---------- Hero 3D: arco in pietra che si costruisce e in cui si entra con lo scroll (Three.js) ---------- */
const THREE_URL = 'https://cdn.jsdelivr.net/npm/three@0.160.0/build/three.module.min.js';
const smoothstep = (a, b, x) => {
    const t = clamp((x - a) / (b - a), 0, 1);
    return t * t * (3 - 2 * t);
};
const lerp = (a, b, t) => a + (b - a) * t;

function supportsWebGL() {
    try {
        const testCanvas = document.createElement('canvas');
        return Boolean(window.WebGLRenderingContext && (testCanvas.getContext('webgl2') || testCanvas.getContext('webgl')));
    } catch {
        return false;
    }
}

// Texture morbida e circolare per il pulviscolo
function createDustTexture(THREE) {
    const size = 64;
    const c = document.createElement('canvas');
    c.width = size;
    c.height = size;
    const ctx = c.getContext('2d');
    const gradient = ctx.createRadialGradient(size / 2, size / 2, 0, size / 2, size / 2, size / 2);
    gradient.addColorStop(0, 'rgba(255,255,255,1)');
    gradient.addColorStop(0.4, 'rgba(255,255,255,0.5)');
    gradient.addColorStop(1, 'rgba(255,255,255,0)');
    ctx.fillStyle = gradient;
    ctx.fillRect(0, 0, size, size);
    const texture = new THREE.CanvasTexture(c);
    texture.colorSpace = THREE.SRGBColorSpace;
    return texture;
}

// Texture procedurale di pietra calcarea: tono, granulosità, pori, venature e rilievo
let stoneCanvases = null;

function paintStoneCanvases() {
    if (stoneCanvases) return stoneCanvases;
    const size = 512;
    const makeCanvas = () => {
        const c = document.createElement('canvas');
        c.width = size;
        c.height = size;
        return c;
    };
    const colorCanvas = makeCanvas();
    const bumpCanvas = makeCanvas();
    const ctx = colorCanvas.getContext('2d');
    const bctx = bumpCanvas.getContext('2d');

    ctx.fillStyle = '#f6f2eb';
    ctx.fillRect(0, 0, size, size);
    bctx.fillStyle = '#808080';
    bctx.fillRect(0, 0, size, size);

    // Variazioni tonali morbide
    for (let i = 0; i < 90; i += 1) {
        const x = Math.random() * size;
        const y = Math.random() * size;
        const r = 20 + Math.random() * 90;
        const warm = Math.random() > 0.5;
        const g = ctx.createRadialGradient(x, y, 0, x, y, r);
        g.addColorStop(0, warm ? 'rgba(206,186,156,0.18)' : 'rgba(255,255,255,0.25)');
        g.addColorStop(1, warm ? 'rgba(206,186,156,0)' : 'rgba(255,255,255,0)');
        ctx.fillStyle = g;
        ctx.fillRect(x - r, y - r, r * 2, r * 2);
        const b = bctx.createRadialGradient(x, y, 0, x, y, r);
        b.addColorStop(0, warm ? 'rgba(0,0,0,0.12)' : 'rgba(255,255,255,0.12)');
        b.addColorStop(1, 'rgba(128,128,128,0)');
        bctx.fillStyle = b;
        bctx.fillRect(x - r, y - r, r * 2, r * 2);
    }

    // Venature sottili
    for (let i = 0; i < 7; i += 1) {
        let x = Math.random() * size;
        let y = Math.random() * size;
        ctx.beginPath();
        bctx.beginPath();
        ctx.moveTo(x, y);
        bctx.moveTo(x, y);
        for (let k = 0; k < 40; k += 1) {
            x += (Math.random() - 0.3) * 18;
            y += (Math.random() - 0.5) * 10;
            ctx.lineTo(x, y);
            bctx.lineTo(x, y);
        }
        ctx.strokeStyle = 'rgba(184,164,136,0.22)';
        ctx.lineWidth = 0.8 + Math.random();
        ctx.stroke();
        bctx.strokeStyle = 'rgba(0,0,0,0.35)';
        bctx.lineWidth = 1;
        bctx.stroke();
    }

    // Granulosità
    const color = ctx.getImageData(0, 0, size, size);
    const bump = bctx.getImageData(0, 0, size, size);
    for (let i = 0; i < color.data.length; i += 4) {
        const n = (Math.random() - 0.5) * 12;
        color.data[i] += n;
        color.data[i + 1] += n;
        color.data[i + 2] += n;
        const nb = (Math.random() - 0.5) * 46;
        bump.data[i] += nb;
        bump.data[i + 1] += nb;
        bump.data[i + 2] += nb;
    }
    ctx.putImageData(color, 0, 0);
    bctx.putImageData(bump, 0, 0);

    // Pori
    for (let i = 0; i < 1100; i += 1) {
        const x = Math.random() * size;
        const y = Math.random() * size;
        const r = 0.5 + Math.random() * 1.6;
        ctx.fillStyle = 'rgba(150,128,100,0.3)';
        bctx.fillStyle = 'rgba(0,0,0,0.6)';
        ctx.beginPath();
        ctx.arc(x, y, r, 0, Math.PI * 2);
        ctx.fill();
        bctx.beginPath();
        bctx.arc(x, y, r, 0, Math.PI * 2);
        bctx.fill();
    }

    stoneCanvases = { colorCanvas, bumpCanvas };
    return stoneCanvases;
}

function createStoneTextures(THREE) {
    const { colorCanvas, bumpCanvas } = paintStoneCanvases();
    const map = new THREE.CanvasTexture(colorCanvas);
    map.colorSpace = THREE.SRGBColorSpace;
    const bumpMap = new THREE.CanvasTexture(bumpCanvas);
    [map, bumpMap].forEach((texture) => {
        texture.wrapS = THREE.RepeatWrapping;
        texture.wrapT = THREE.RepeatWrapping;
    });
    return { map, bumpMap };
}

// Ombra morbida all'interno del vano: fa sembrare la foto incassata nello spessore del muro
function createRecessTexture(THREE) {
    const w = 256;
    const h = 320;
    const c = document.createElement('canvas');
    c.width = w;
    c.height = h;
    const ctx = c.getContext('2d');
    const shade = (alpha) => `rgba(58,44,30,${alpha})`;
    const fill = (x0, y0, x1, y1, alpha, rect) => {
        const g = ctx.createLinearGradient(x0, y0, x1, y1);
        g.addColorStop(0, shade(alpha));
        g.addColorStop(1, shade(0));
        ctx.fillStyle = g;
        ctx.fillRect(...rect);
    };
    fill(0, 0, w * 0.24, 0, 0.6, [0, 0, w * 0.24, h]);
    fill(w, 0, w * 0.8, 0, 0.4, [w * 0.8, 0, w * 0.2, h]);
    fill(0, 0, 0, h * 0.38, 0.55, [0, 0, w, h * 0.38]);
    fill(0, h, 0, h * 0.85, 0.25, [0, h * 0.85, w, h * 0.15]);
    const texture = new THREE.CanvasTexture(c);
    texture.colorSpace = THREE.SRGBColorSpace;
    return texture;
}

/* ---------- Elementi 3D condivisi tra hero e footer ---------- */
const ARCH = { inner: 1, outer: 1.42, depth: 0.62, base: 0.07, springY: 1.55, gap: 0.024 };
ARCH.openingHeight = ARCH.springY + ARCH.inner;
ARCH.photoZ = -ARCH.depth * 0.2;
const STONE_PALETTE = [0xf5f1ea, 0xefe9df, 0xeae2d6, 0xf7f4ee, 0xece5da];

let threePromise = null;
const loadThree = () => {
    threePromise = threePromise || import(THREE_URL);
    return threePromise;
};
const can3D = () => !prefersReducedMotion && supportsWebGL();
// Aprendo index.html dal disco (file://) il browser non permette di usare le foto come texture WebGL:
// in quel caso si carica images/textures-offline.js, con le stesse foto incorporate come data URI
const isFileProtocol = location.protocol === 'file:';
let offlineTexturesPromise = null;

function loadOfflineTextures() {
    if (!isFileProtocol) return Promise.resolve(true);
    offlineTexturesPromise = offlineTexturesPromise || new Promise((resolve) => {
        const script = document.createElement('script');
        script.src = 'images/textures-offline.js';
        script.onload = () => resolve(Boolean(window.DIMORA_TEXTURES));
        script.onerror = () => resolve(false);
        document.head.append(script);
    });
    return offlineTexturesPromise;
}

const textureUrl = (url) => (isFileProtocol ? window.DIMORA_TEXTURES?.[url] : url);

// Renderer, luci calde (sole + controluce) e, se richiesto, pavimento che riceve le ombre
function createStoneScene(THREE, canvas, shadow) {
    const renderer = new THREE.WebGLRenderer({ canvas, antialias: true, alpha: true, powerPreference: 'high-performance' });
    renderer.setPixelRatio(Math.min(window.devicePixelRatio, 1.75));
    renderer.toneMapping = THREE.ACESFilmicToneMapping;
    renderer.toneMappingExposure = 1.12;
    renderer.shadowMap.enabled = Boolean(shadow);
    renderer.shadowMap.type = THREE.PCFSoftShadowMap;

    const scene = new THREE.Scene();
    scene.add(new THREE.HemisphereLight(0xfffaf2, 0xe2d5c2, 1.3));
    const sun = new THREE.DirectionalLight(0xffefdc, 3.1);
    sun.position.set(-4, 7, 6);
    scene.add(sun, sun.target);
    const rim = new THREE.DirectionalLight(0xffd6a8, 1.1);
    rim.position.set(5, 3.5, -6);
    scene.add(rim);

    if (shadow) {
        sun.castShadow = true;
        sun.shadow.mapSize.set(shadow.size, shadow.size);
        Object.assign(sun.shadow.camera, { near: 1, far: 30, ...shadow.box });
        sun.shadow.radius = 8;
        sun.shadow.normalBias = 0.02;
        const ground = new THREE.Mesh(
            new THREE.PlaneGeometry(60, 60),
            new THREE.ShadowMaterial({ color: 0x4a3828, opacity: 0.12 }),
        );
        ground.rotation.x = -Math.PI / 2;
        ground.receiveShadow = true;
        scene.add(ground);
    }
    return { renderer, scene, sun };
}

// Blocchi dell'arco (soglia, piedritti, conci, chiave di volta) con il ritardo di posa
function createArchBlocks(THREE) {
    const { inner, outer, depth, base, springY, gap } = ARCH;
    const specs = [];
    const add = (geometry, position, delay, isKey = false) => specs.push({ geometry, position, delay, isKey });

    add(new THREE.BoxGeometry(outer * 2 + 0.36, base, depth + 0.3), new THREE.Vector3(0, base / 2, 0), 0);

    const jambW = outer - inner;
    const rows = 4;
    const rowH = springY / rows;
    for (let row = 0; row < rows; row += 1) {
        [-1, 1].forEach((side, s) => {
            add(
                new THREE.BoxGeometry(jambW - gap, rowH - gap, depth),
                new THREE.Vector3(side * (inner + jambW / 2), base + rowH * row + rowH / 2, 0),
                0.25 + row * 0.2 + s * 0.08,
            );
        });
    }

    const segments = 9;
    const keyIndex = Math.floor(segments / 2);
    const step = Math.PI / segments;
    const gapAngle = gap / ((inner + outer) / 2);
    const order = [];
    for (let k = 0; k < keyIndex; k += 1) order.push(k, segments - 1 - k);
    order.push(keyIndex);

    order.forEach((index, sequence) => {
        const isKey = index === keyIndex;
        const a0 = index * step + gapAngle / 2;
        const a1 = (index + 1) * step - gapAngle / 2;
        const rOut = isKey ? outer + 0.12 : outer;
        const blockDepth = isKey ? depth + 0.06 : depth;
        const shape = new THREE.Shape();
        shape.moveTo(inner * Math.cos(a0), inner * Math.sin(a0));
        shape.lineTo(rOut * Math.cos(a0), rOut * Math.sin(a0));
        shape.absarc(0, 0, rOut, a0, a1, false);
        shape.lineTo(inner * Math.cos(a1), inner * Math.sin(a1));
        shape.absarc(0, 0, inner, a1, a0, true);

        const geometry = new THREE.ExtrudeGeometry(shape, {
            depth: blockDepth,
            bevelEnabled: true,
            bevelThickness: 0.012,
            bevelSize: 0.012,
            bevelSegments: 2,
            curveSegments: 10,
        });
        const mid = (a0 + a1) / 2;
        const rMid = (inner + rOut) / 2;
        const cx = rMid * Math.cos(mid);
        const cy = rMid * Math.sin(mid);
        geometry.translate(-cx, -cy, -blockDepth / 2);

        add(geometry, new THREE.Vector3(cx, base + springY + cy, 0), 1.15 + Math.floor(sequence / 2) * 0.22 + (isKey ? 0.25 : 0), isKey);
    });
    return specs;
}

// Materiale di pietra: ogni blocco usa una porzione diversa della texture, come pietre dello stesso banco
function createStoneMaterial(THREE, stone, index, anisotropy, fadeIn = false) {
    const map = stone.map.clone();
    const bumpMap = stone.bumpMap.clone();
    const offset = [Math.random(), Math.random()];
    [map, bumpMap].forEach((texture) => {
        texture.offset.set(...offset);
        texture.anisotropy = anisotropy;
        texture.needsUpdate = true;
    });
    return new THREE.MeshStandardMaterial({
        color: STONE_PALETTE[index % STONE_PALETTE.length],
        map,
        bumpMap,
        bumpScale: 1.6,
        roughness: 0.92,
        metalness: 0,
        transparent: fadeIn,
        opacity: fadeIn ? 0 : 1,
    });
}

// Vano dell'arco; con photoAspect le UV ritagliano la foto "a copertura", senza deformarla
function createOpeningGeometry(THREE, photoAspect) {
    const { inner, springY, openingHeight } = ARCH;
    const shape = new THREE.Shape();
    shape.moveTo(-inner, 0);
    shape.lineTo(inner, 0);
    shape.lineTo(inner, springY);
    shape.absarc(0, springY, inner, 0, Math.PI, false);
    shape.lineTo(-inner, 0);

    const geometry = new THREE.ShapeGeometry(shape, 32);
    const openingAspect = (inner * 2) / openingHeight;
    const scaleX = photoAspect ? Math.min(1, openingAspect / photoAspect) : 1;
    const scaleY = photoAspect ? Math.min(1, photoAspect / openingAspect) : 1;
    const uv = geometry.attributes.uv;
    const pos = geometry.attributes.position;
    for (let i = 0; i < uv.count; i += 1) {
        const u = (pos.getX(i) + inner) / (inner * 2);
        const v = pos.getY(i) / openingHeight;
        uv.setXY(i, 0.5 + (u - 0.5) * scaleX, 0.5 + (v - 0.5) * scaleY);
    }
    return geometry;
}

function loadPhotoTexture(THREE, renderer, url, material) {
    const source = textureUrl(url);
    if (!source) return;
    new THREE.TextureLoader().load(source, (texture) => {
        texture.colorSpace = THREE.SRGBColorSpace;
        texture.anisotropy = renderer.capabilities.getMaxAnisotropy();
        material.map = texture;
        material.color.set(0xffffff);
        material.needsUpdate = true;
    });
}

// Arco che si costruisce blocco per blocco (hero e footer): update(t) con t in secondi dall'inizio
function createBuildingArch(THREE, renderer) {
    const group = new THREE.Group();
    const stone = createStoneTextures(THREE);
    const anisotropy = renderer.capabilities.getMaxAnisotropy();
    const blocks = createArchBlocks(THREE).map((spec, index) => {
        const mesh = new THREE.Mesh(spec.geometry, createStoneMaterial(THREE, stone, index, anisotropy, true));
        mesh.castShadow = true;
        mesh.receiveShadow = true;
        mesh.position.copy(spec.position);
        group.add(mesh);
        return {
            mesh,
            to: spec.position.clone(),
            fromY: spec.position.y + 1.6 + Math.random() * 0.6,
            spin: (Math.random() - 0.5) * 0.9,
            delay: spec.delay,
            duration: 0.95,
            isKey: spec.isKey,
        };
    });

    const update = (t) => {
        blocks.forEach((block) => {
            const local = clamp((t - block.delay) / block.duration, 0, 1);
            const eased = block.isKey ? easeOutBack(local) : easeOutCubic(local);
            block.mesh.position.y = lerp(block.fromY, block.to.y, eased);
            block.mesh.rotation.z = block.spin * (1 - eased);
            block.mesh.material.opacity = clamp(local * 2.2, 0, 1);
            if (local === 1 && block.mesh.material.transparent) {
                block.mesh.material.transparent = false;
                block.mesh.material.needsUpdate = true;
            }
        });
    };
    return { group, update };
}

// Sagoma del vano proiettata sullo schermo (anche con l'arco ruotato): punti e rettangolo in pixel
function createOpeningProjector(THREE) {
    const { inner, base, springY, photoZ } = ARCH;
    const outline = [new THREE.Vector3(-inner, base, photoZ), new THREE.Vector3(-inner, base + springY, photoZ)];
    for (let k = 1; k < 24; k += 1) {
        const angle = Math.PI - (Math.PI * k) / 24;
        outline.push(new THREE.Vector3(Math.cos(angle) * inner, base + springY + Math.sin(angle) * inner, photoZ));
    }
    outline.push(new THREE.Vector3(inner, base + springY, photoZ), new THREE.Vector3(inner, base, photoZ));
    const point = new THREE.Vector3();

    return (group, camera, w, h) => {
        group.updateMatrixWorld();
        const points = outline.map((vertex) => {
            point.copy(vertex).applyMatrix4(group.matrixWorld).project(camera);
            return [((point.x + 1) / 2) * w, ((1 - point.y) / 2) * h];
        });
        const xs = points.map((pt) => pt[0]);
        const ys = points.map((pt) => pt[1]);
        const left = Math.min(...xs);
        const top = Math.min(...ys);
        const right = Math.max(...xs);
        const bottom = Math.max(...ys);
        return { points, left, top, right, bottom, width: right - left, height: bottom - top };
    };
}

// Pulviscolo dorato sospeso nella luce
function createDust(THREE, count, box) {
    const positions = new Float32Array(count * 3);
    const seeds = [];
    for (let i = 0; i < count; i += 1) {
        const seed = {
            x: lerp(box.x[0], box.x[1], Math.random()),
            y: lerp(box.y[0], box.y[1], Math.random()),
            z: lerp(box.z[0], box.z[1], Math.random()),
            speed: 0.03 + Math.random() * 0.07,
            phase: Math.random() * Math.PI * 2,
        };
        seeds.push(seed);
        positions.set([seed.x, seed.y, seed.z], i * 3);
    }
    const geometry = new THREE.BufferGeometry();
    geometry.setAttribute('position', new THREE.BufferAttribute(positions, 3));
    const material = new THREE.PointsMaterial({
        size: 0.032,
        map: createDustTexture(THREE),
        color: 0xc9a06a,
        transparent: true,
        opacity: 0.55,
        depthWrite: false,
        sizeAttenuation: true,
    });

    const update = (t, dt) => {
        seeds.forEach((seed, i) => {
            seed.y += seed.speed * dt;
            if (seed.y > box.y[1] + 0.2) seed.y = box.y[0] - 0.1;
            positions[i * 3] = seed.x + Math.sin(t * 0.3 + seed.phase) * 0.15;
            positions[i * 3 + 1] = seed.y;
        });
        geometry.attributes.position.needsUpdate = true;
    };
    return { points: new THREE.Points(geometry, material), material, update };
}

// Il rendering gira solo quando la scena è visibile e la scheda è attiva
function runWhenVisible(renderer, target, render) {
    render(performance.now()); // primo fotogramma subito: scena e testi già in posizione
    let running = false;
    let inView = false;
    const sync = () => {
        const value = inView && !document.hidden;
        if (value === running) return;
        running = value;
        renderer.setAnimationLoop(value ? render : null);
    };
    new IntersectionObserver(([entry]) => {
        inView = entry.isIntersecting;
        sync();
    }).observe(target);
    document.addEventListener('visibilitychange', sync);
}

// Foto nitida della pagina sovrapposta al vano: stessa posizione e scala della texture,
// mai ingrandita oltre la misura "cover"; poi la sagoma ad arco si allarga a tutto schermo
function applyArchReveal(reveal, rect, view, photoAspect, visibility) {
    const coverW = Math.max(view.w, view.h * photoAspect);
    const coverH = coverW / photoAspect;
    const matched = rect.height / coverH;
    const radius = rect.width / 2;
    const springPx = rect.top + radius;
    const points = [`${rect.left.toFixed(1)}px ${rect.bottom.toFixed(1)}px`, `${rect.left.toFixed(1)}px ${springPx.toFixed(1)}px`];
    for (let k = 1; k < 24; k += 1) {
        const angle = Math.PI - (Math.PI * k) / 24;
        points.push(`${(rect.left + radius + Math.cos(angle) * radius).toFixed(1)}px ${(springPx - Math.sin(angle) * radius).toFixed(1)}px`);
    }
    points.push(`${rect.right.toFixed(1)}px ${springPx.toFixed(1)}px`, `${rect.right.toFixed(1)}px ${rect.bottom.toFixed(1)}px`);

    reveal.style.setProperty('--img-w', `${coverW.toFixed(1)}px`);
    reveal.style.setProperty('--img-h', `${coverH.toFixed(1)}px`);
    reveal.style.setProperty('--img-x', `${(rect.left + rect.width / 2 - view.w / 2).toFixed(1)}px`);
    reveal.style.setProperty('--img-y', `${(rect.top + rect.height / 2 - view.h / 2).toFixed(1)}px`);
    reveal.style.setProperty('--img-s', Math.min(matched, 1).toFixed(4));
    reveal.style.setProperty('--reveal-clip', `polygon(${points.join(', ')})`);
    reveal.style.setProperty('--reveal', (smoothstep(0.62, 0.85, matched) * visibility).toFixed(3));
}

// Progresso (0–1) dello scroll attraverso un elemento più alto dello schermo
function pinProgress(element) {
    const scrollable = element.offsetHeight - window.innerHeight;
    return scrollable > 0 ? clamp(-element.getBoundingClientRect().top / scrollable, 0, 1) : 0;
}

async function initHero3D() {
    const hero = document.getElementById('home');
    const sticky = document.getElementById('hero-sticky');
    const visual = document.getElementById('hero-visual');
    const canvas = document.getElementById('hero-canvas');
    const heroText = document.getElementById('hero-text');
    const reveal = document.getElementById('hero-reveal');
    const scrollCue = document.getElementById('scroll-cue');
    if (!hero || !sticky || !visual || !canvas || prefersReducedMotion || !supportsWebGL()) return;

    let THREE;
    try {
        THREE = await loadThree();
    } catch {
        return; // senza rete o CDN resta la foto ad arco
    }
    await loadOfflineTextures();
    // Senza texture disponibili la foto del vano è un'immagine della pagina, ritagliata sulla sagoma dell'arco
    const domPhoto = !textureUrl('images/hero-interno.jpg');

    const { renderer, scene, sun } = createStoneScene(THREE, canvas, { size: 1024, box: { left: -4, right: 4, top: 5, bottom: -2 } });
    const camera = new THREE.PerspectiveCamera(26, 1, 0.05, 100);

    // Il sole si alza durante la costruzione e le ombre ruotano
    const sunFrom = new THREE.Vector3(-7.5, 2.2, 2.5);
    const sunTo = new THREE.Vector3(-4, 7, 6);

    // Arco che si costruisce blocco per blocco
    const built = createBuildingArch(THREE, renderer);
    const arch = built.group;
    scene.add(arch);
    const { inner, base, openingHeight, photoZ } = ARCH;

    // Vano con la foto della Dimora e ombra interna
    const photoAspect = 1280 / 851;
    const photoMaterial = new THREE.MeshBasicMaterial({ color: 0xf1e9dd, transparent: true, opacity: 0, toneMapped: false });
    const photo = new THREE.Mesh(createOpeningGeometry(THREE, photoAspect), photoMaterial);
    photo.position.set(0, base, photoZ);
    arch.add(photo);

    const recessMaterial = new THREE.MeshBasicMaterial({
        map: createRecessTexture(THREE),
        transparent: true,
        opacity: 0,
        depthWrite: false,
        toneMapped: false,
    });
    const recess = new THREE.Mesh(createOpeningGeometry(THREE, null), recessMaterial);
    recess.position.set(0, base, photoZ + 0.003);
    recess.renderOrder = 1;
    arch.add(recess);
    loadPhotoTexture(THREE, renderer, 'images/hero-interno.jpg', photoMaterial);

    const dust = createDust(THREE, 260, { x: [-3.5, 3.5], y: [0, 4.2], z: [-2.5, 0.5] });
    dust.material.opacity = 0;
    scene.add(dust.points);

    // Inquadratura: l'arco occupa il segnaposto .hero-visual dentro una tela a tutta larghezza
    const view = { w: 1, h: 1, dx: 0, dy: 0, dist: 10, fill: 1.4 };
    const halfFov = THREE.MathUtils.degToRad(camera.fov / 2);
    const tanHalf = Math.tan(halfFov);

    const measure = () => {
        const w = sticky.clientWidth;
        const h = sticky.clientHeight;
        if (!w || !h) return;
        const stickyRect = sticky.getBoundingClientRect();
        const visualRect = visual.getBoundingClientRect();
        view.w = w;
        view.h = h;
        sticky.style.setProperty('--glow-x', `${(50 + ((visualRect.left + visualRect.width / 2 - stickyRect.left) / w - 0.5) * 100).toFixed(1)}%`);
        sticky.style.setProperty('--glow-y', `${(((visualRect.top + visualRect.height / 2 - stickyRect.top) / h) * 100).toFixed(1)}%`);
        view.dx = visualRect.left + visualRect.width / 2 - (stickyRect.left + w / 2);
        view.dy = visualRect.top + visualRect.height / 2 - (stickyRect.top + h / 2);
        const aspect = w / h;
        const fitH = (3.6 / 2 / tanHalf) * (h / visualRect.height);
        const fitW = (3.6 / 2 / (tanHalf * aspect)) * (w / visualRect.width);
        view.dist = Math.max(fitH, fitW) * 1.02;
        // Distanza alla quale il vano copre tutto lo schermo
        view.fill = Math.min(inner / (tanHalf * aspect), (openingHeight / 2) / tanHalf) * 0.82;
        renderer.setSize(w, h, false);
        camera.aspect = aspect;
    };

    // Modalità volo: su mobile l'area dell'arco si adatta allo spazio, su desktop la hero deve stare nello schermo
    const enableFly = () => {
        const fits = window.innerWidth <= 900 || sticky.scrollHeight <= window.innerHeight + 2;
        if (fits && window.scrollY < 150) hero.classList.add('is-fly');
    };
    enableFly();
    measure();
    new ResizeObserver(measure).observe(sticky);

    // Foto nitida (immagine della pagina): caricata solo quando la scena 3D è pronta
    const revealImg = reveal.querySelector('img');
    if (revealImg?.dataset.src) revealImg.src = revealImg.dataset.src;
    if (domPhoto) hero.classList.add('is-dom-photo');

    const projectOpening = createOpeningProjector(THREE);

    const pointer = { x: 0, y: 0 };
    const tilt = { x: 0, y: 0 };
    const BASE_ROTATION = -0.42;
    const BUILD_END = 3.1;
    const start = performance.now();
    const lookTarget = new THREE.Vector3();
    let lastTime = start;
    let revealed = false;

    if (finePointer) {
        window.addEventListener('pointermove', (event) => {
            pointer.x = event.clientX / window.innerWidth - 0.5;
            pointer.y = event.clientY / window.innerHeight - 0.5;
        }, { passive: true });
    }

    const scrollProgress = () => (hero.classList.contains('is-fly') ? pinProgress(hero) : 0);

    const render = (now) => {
        const t = (now - start) / 1000;
        const dt = Math.min((now - lastTime) / 1000, 0.05);
        lastTime = now;
        const p = scrollProgress();

        built.update(t);
        photoMaterial.opacity = clamp((t - 2.5) / 1, 0, 1);

        const intro = easeInOutSine(clamp(t / BUILD_END, 0, 1));
        sun.position.lerpVectors(sunFrom, sunTo, intro);

        // Pulviscolo
        dust.material.opacity = 0.55 * smoothstep(1.5, 3.5, t);
        dust.update(t, dt);

        // Fasi dello scroll: centratura, volo dentro l'arco, foto a tutto schermo
        const center = smoothstep(0, 0.3, p);
        const fly = easeInOutSine(clamp((p - 0.08) / 0.8, 0, 1));

        recessMaterial.opacity = photoMaterial.opacity * (1 - smoothstep(0.1, 0.6, fly));
        sticky.style.setProperty('--glow', (smoothstep(0.5, 2.5, t) * (1 - smoothstep(0, 0.25, p))).toFixed(3));

        tilt.x += (pointer.x - tilt.x) * 0.05;
        tilt.y += (pointer.y - tilt.y) * 0.05;
        const idleRotation = lerp(-0.95, BASE_ROTATION, intro) + Math.sin(t * 0.35) * 0.05 + tilt.x * 0.35;
        arch.rotation.y = idleRotation * (1 - center);
        arch.rotation.x = tilt.y * 0.06 * (1 - center);

        // Camera: piccola carrellata all'avvio, poi il volo verso il vano
        const introDist = view.dist * lerp(0.8, 1, intro);
        const introY = lerp(3.0, 2.1, intro);
        const photoCenterY = base + openingHeight / 2;
        camera.position.set(0, lerp(introY, photoCenterY, fly), lerp(introDist, photoZ + view.fill, fly));
        lookTarget.set(0, lerp(1.45, photoCenterY, fly), lerp(0, photoZ, fly));
        camera.lookAt(lookTarget);
        camera.setViewOffset(view.w, view.h, -view.dx * (1 - center), -view.dy * (1 - center), view.w, view.h);
        camera.updateProjectionMatrix();

        // Testi che escono di scena
        if (hero.classList.contains('is-fly')) {
            const textOut = smoothstep(0, 0.2, p);
            heroText.style.opacity = String(1 - textOut);
            heroText.style.transform = `translateY(${(-40 * textOut).toFixed(1)}px)`;
            heroText.style.visibility = textOut > 0.98 ? 'hidden' : '';
            scrollCue.style.opacity = String(1 - smoothstep(0, 0.08, p));
        }

        renderer.render(scene, camera);

        if (domPhoto) {
            // Foto della pagina ritagliata nel vano: copre la sagoma proiettata dell'apertura
            const { points, left, top, width, height } = projectOpening(arch, camera, view.w, view.h);
            const coverW = Math.max(width, height * photoAspect);
            reveal.style.setProperty('--img-w', `${coverW.toFixed(1)}px`);
            reveal.style.setProperty('--img-h', `${(coverW / photoAspect).toFixed(1)}px`);
            reveal.style.setProperty('--img-x', `${(left + width / 2 - view.w / 2).toFixed(1)}px`);
            reveal.style.setProperty('--img-y', `${(top + height / 2 - view.h / 2).toFixed(1)}px`);
            reveal.style.setProperty('--img-s', '1');
            reveal.style.setProperty('--reveal-clip', `polygon(${points.map(([x, y]) => `${x.toFixed(1)}px ${y.toFixed(1)}px`).join(', ')})`);
            reveal.style.setProperty('--reveal', photoMaterial.opacity.toFixed(3));
        } else if (hero.classList.contains('is-fly')) {
            applyArchReveal(reveal, projectOpening(arch, camera, view.w, view.h), view, photoAspect, smoothstep(0.22, 0.3, p));
        }

        if (!revealed) {
            revealed = true;
            hero.classList.add('is-3d');
        }
    };

    runWhenVisible(renderer, hero, render);
}

/* ---------- Parallasse leggera col mouse (footer) ---------- */
// Leggera parallasse che segue il mouse
function createPointerTilt(target) {
    const pointer = { x: 0, y: 0 };
    const tilt = {
        x: 0,
        y: 0,
        update() {
            tilt.x += (pointer.x - tilt.x) * 0.05;
            tilt.y += (pointer.y - tilt.y) * 0.05;
        },
    };
    if (finePointer) {
        target.addEventListener('pointermove', (event) => {
            pointer.x = event.clientX / window.innerWidth - 0.5;
            pointer.y = event.clientY / window.innerHeight - 0.5;
        });
    }
    return tilt;
}

/* ---------- Footer 3D: si esce dalla Dimora attraverso un arco che si costruisce ---------- */
async function initFooter3D() {
    const footer = document.getElementById('site-footer');
    const stage = document.getElementById('footer-stage');
    const canvas = document.getElementById('footer-canvas');
    const content = document.getElementById('footer-content');
    if (!footer || !stage || !canvas || !content || !can3D()) return;

    let THREE;
    try {
        THREE = await loadThree();
    } catch {
        return;
    }
    footer.classList.add('is-3d');

    const { renderer, scene } = createStoneScene(THREE, canvas, { size: 1024, box: { left: -4, right: 4, top: 5, bottom: -2 } });
    const camera = new THREE.PerspectiveCamera(26, 1, 0.1, 100);
    const built = createBuildingArch(THREE, renderer);
    scene.add(built.group);
    const dust = createDust(THREE, 200, { x: [-3.5, 3.5], y: [0, 4.2], z: [-2.5, 1] });
    scene.add(dust.points);
    const projectOpening = createOpeningProjector(THREE);

    const view = { w: 1, h: 1, dist: 12 };
    const resize = () => {
        const w = canvas.clientWidth;
        const h = canvas.clientHeight;
        if (!w || !h) return;
        const tanHalf = Math.tan(THREE.MathUtils.degToRad(camera.fov / 2));
        const aspect = w / h;
        // Schermi stretti: il vano occupa quasi tutta la larghezza (i piedritti escono dai bordi) per contenere tutti i dati
        const dist = w < 700
            ? ARCH.inner / (tanHalf * aspect * 0.92)
            : Math.max(3.5 / 2 / tanHalf / 0.76, 3.4 / 2 / (tanHalf * aspect) / 0.86);
        Object.assign(view, { w, h, dist });
        renderer.setSize(w, h, false);
        camera.aspect = aspect;
        camera.updateProjectionMatrix();
    };
    new ResizeObserver(resize).observe(stage);
    resize();

    const tilt = createPointerTilt(stage);
    const lookTarget = new THREE.Vector3(0, 1.85, 0);
    let buildStart = null;
    let lastTime = performance.now();

    const render = (now) => {
        const dt = Math.min((now - lastTime) / 1000, 0.05);
        lastTime = now;
        // La costruzione parte la prima volta che il footer entra davvero nello schermo
        if (buildStart === null && stage.getBoundingClientRect().top < window.innerHeight * 0.8) buildStart = now;
        const t = buildStart === null ? 0 : (now - buildStart) / 1000;
        built.update(t);

        tilt.update();
        built.group.rotation.y = Math.sin(t * 0.3) * 0.04 + tilt.x * 0.25;
        camera.position.set(0, 1.75 - tilt.y * 0.2, view.dist);
        camera.lookAt(lookTarget);
        dust.update(t, dt);
        renderer.render(scene, camera);

        // I dati del footer si dispongono nel vano dell'arco
        const rect = projectOpening(built.group, camera, view.w, view.h);
        content.style.setProperty('--fx', `${rect.left.toFixed(1)}px`);
        content.style.setProperty('--fy', `${rect.top.toFixed(1)}px`);
        content.style.setProperty('--fw', `${rect.width.toFixed(1)}px`);
        content.style.setProperty('--fh', `${rect.height.toFixed(1)}px`);
        content.style.setProperty('--fo', smoothstep(2.2, 3.2, t).toFixed(3));
    };

    runWhenVisible(renderer, stage, render);
}

/* ---------- Superficie in pietra (stessa texture del 3D della hero) per le lastre dei servizi ---------- */
function initStoneSurface() {
    try {
        const { colorCanvas } = paintStoneCanvases();
        document.documentElement.style.setProperty('--stone-url', `url(${colorCanvas.toDataURL('image/jpeg', 0.82)})`);
    } catch {
        /* senza canvas restano le lastre color sabbia */
    }
}

/* ---------- Titolo della hero rivelato lettera per lettera ---------- */
function initTitleReveal() {
    const title = document.getElementById('hero-title');
    if (!title || prefersReducedMotion) return;

    title.setAttribute('aria-label', title.textContent.replace(/\s+/g, ' ').trim());
    let index = 0;

    const split = (node) => {
        [...node.childNodes].forEach((child) => {
            if (child.nodeType === Node.ELEMENT_NODE) {
                split(child);
                return;
            }
            if (child.nodeType !== Node.TEXT_NODE) return;

            const fragment = document.createDocumentFragment();
            child.textContent.split(/(\s+)/).forEach((part) => {
                if (!part) return;
                if (/^\s+$/.test(part)) {
                    fragment.append(document.createTextNode(' '));
                    return;
                }
                const word = document.createElement('span');
                word.className = 'word';
                word.setAttribute('aria-hidden', 'true');
                [...part].forEach((letter) => {
                    const char = document.createElement('span');
                    char.className = 'char';
                    char.textContent = letter;
                    char.style.setProperty('--i', index);
                    index += 1;
                    word.append(char);
                });
                fragment.append(word);
            });
            child.replaceWith(fragment);
        });
    };

    split(title);
    title.classList.remove('hero-anim');
    title.classList.add('is-split');
}

/* ---------- Menu mobile ---------- */
function initMobileMenu() {
    const header = document.getElementById('site-header');
    const toggle = document.getElementById('nav-toggle');
    const nav = document.getElementById('main-nav');
    if (!header || !toggle || !nav) return;

    const mobileQuery = window.matchMedia('(max-width: 900px)');
    const focusables = () => [toggle, ...nav.querySelectorAll('a')];

    const setOpen = (open) => {
        header.classList.toggle('is-open', open);
        toggle.setAttribute('aria-expanded', String(open));
        toggle.setAttribute('aria-label', open ? 'Chiudi il menu' : 'Apri il menu');
        document.body.classList.toggle('is-locked', open);
    };

    const close = () => setOpen(false);

    toggle.addEventListener('click', () => {
        const open = toggle.getAttribute('aria-expanded') !== 'true';
        setOpen(open);
        if (open) nav.querySelector('a')?.focus();
    });

    // Chiusura dopo il click su una voce
    nav.addEventListener('click', (event) => {
        if (event.target.closest('a')) close();
    });

    document.addEventListener('keydown', (event) => {
        if (!header.classList.contains('is-open')) return;

        if (event.key === 'Escape') {
            close();
            toggle.focus();
            return;
        }

        // Mantiene il focus all'interno del menu aperto
        if (event.key === 'Tab') {
            const items = focusables();
            const first = items[0];
            const last = items[items.length - 1];
            if (event.shiftKey && document.activeElement === first) {
                event.preventDefault();
                last.focus();
            } else if (!event.shiftKey && document.activeElement === last) {
                event.preventDefault();
                first.focus();
            }
        }
    });

    mobileQuery.addEventListener('change', (event) => {
        if (!event.matches) close();
    });
}

/* ---------- Smooth scrolling per i link interni ---------- */
function initSmoothScroll() {
    document.addEventListener('click', (event) => {
        const link = event.target.closest('a[href^="#"]');
        if (!link) return;

        const id = link.getAttribute('href');
        const target = id.length > 1 ? document.querySelector(id) : null;
        if (!target) return;

        event.preventDefault();
        target.scrollIntoView({ behavior: prefersReducedMotion ? 'auto' : 'smooth', block: 'start' });
        history.pushState(null, '', id);

        // Sposta il focus sulla sezione per gli utenti da tastiera e screen reader
        if (!target.hasAttribute('tabindex')) target.setAttribute('tabindex', '-1');
        target.focus({ preventScroll: true });
    });
}

/* ---------- Voce di menu attiva durante lo scroll ---------- */
function initActiveNav() {
    const links = [...document.querySelectorAll('.nav-link')];
    const sections = links
        .map((link) => document.querySelector(link.getAttribute('href')))
        .filter(Boolean);
    if (!sections.length || !('IntersectionObserver' in window)) return;

    const setActive = (id) => {
        links.forEach((link) => {
            const active = link.getAttribute('href') === `#${id}`;
            link.classList.toggle('is-active', active);
            if (active) link.setAttribute('aria-current', 'location');
            else link.removeAttribute('aria-current');
        });
    };

    const observer = new IntersectionObserver((entries) => {
        entries.forEach((entry) => {
            if (entry.isIntersecting) setActive(entry.target.id);
        });
    }, { rootMargin: '-45% 0px -50% 0px' });

    sections.forEach((section) => observer.observe(section));
}

/* ---------- Galleria + Lightbox ---------- */
function initGallery() {
    const grid = document.getElementById('gallery-grid');
    const moreBtn = document.getElementById('gallery-more');
    const lightbox = document.getElementById('lightbox');
    if (!grid || !lightbox) return;

    const buttons = [...grid.querySelectorAll('.g-btn')];
    const items = buttons.map((btn) => {
        const img = btn.querySelector('img');
        btn.setAttribute('aria-label', `Apri foto: ${img.alt}`);
        return { src: btn.dataset.full, alt: img.alt };
    });

    const img = document.getElementById('lb-img');
    const caption = document.getElementById('lb-caption');
    const counter = document.getElementById('lb-counter');
    const controls = [...lightbox.querySelectorAll('button')];
    let current = 0;
    let lastFocus = null;

    const preload = (index) => {
        const preloadImg = new Image();
        preloadImg.src = items[(index + items.length) % items.length].src;
    };

    const show = (index) => {
        current = (index + items.length) % items.length;
        const { src, alt } = items[current];
        img.classList.add('is-loading');
        img.onload = () => img.classList.remove('is-loading');
        img.src = src;
        img.alt = alt;
        caption.textContent = alt;
        counter.textContent = `${current + 1} / ${items.length}`;
        preload(current + 1);
        preload(current - 1);
    };

    const open = (index, returnFocusTo) => {
        lastFocus = returnFocusTo;
        show(index);
        lightbox.hidden = false;
        document.body.classList.add('is-locked');
        lightbox.querySelector('.lb-close').focus();
    };

    const close = () => {
        lightbox.hidden = true;
        document.body.classList.remove('is-locked');
        img.removeAttribute('src');
        lastFocus?.focus({ preventScroll: true });
    };

    buttons.forEach((btn, index) => btn.addEventListener('click', () => open(index, btn)));

    // Mostra solo le prime foto; le altre con "Mostra tutte le foto"
    const INITIAL_VISIBLE = 14;
    const extra = [...grid.children].slice(INITIAL_VISIBLE);
    if (moreBtn) {
        if (!extra.length) {
            moreBtn.parentElement.hidden = true;
        } else {
            extra.forEach((li) => li.classList.add('is-hidden'));
            moreBtn.querySelector('span').textContent = `Mostra tutte le foto (${items.length})`;
            moreBtn.addEventListener('click', () => {
                extra.forEach((li) => li.classList.remove('is-hidden'));
                moreBtn.setAttribute('aria-expanded', 'true');
                moreBtn.parentElement.hidden = true;
                extra[0].querySelector('.g-btn').focus();
            });
        }
    }

    lightbox.addEventListener('click', (event) => {
        const action = event.target.closest('[data-lb]')?.dataset.lb;
        if (action === 'close') close();
        else if (action === 'prev') show(current - 1);
        else if (action === 'next') show(current + 1);
        else if (event.target === lightbox) close();
    });

    document.addEventListener('keydown', (event) => {
        if (lightbox.hidden) return;

        switch (event.key) {
            case 'Escape':
                close();
                break;
            case 'ArrowLeft':
                show(current - 1);
                break;
            case 'ArrowRight':
                show(current + 1);
                break;
            case 'Tab': {
                // Focus trap tra i pulsanti del lightbox
                const first = controls[0];
                const last = controls[controls.length - 1];
                if (event.shiftKey && document.activeElement === first) {
                    event.preventDefault();
                    last.focus();
                } else if (!event.shiftKey && document.activeElement === last) {
                    event.preventDefault();
                    first.focus();
                }
                break;
            }
            default:
                break;
        }
    });

    // Swipe su dispositivi touch
    let touchStartX = 0;
    let touchStartY = 0;

    lightbox.addEventListener('touchstart', (event) => {
        touchStartX = event.changedTouches[0].clientX;
        touchStartY = event.changedTouches[0].clientY;
    }, { passive: true });

    lightbox.addEventListener('touchend', (event) => {
        const dx = event.changedTouches[0].clientX - touchStartX;
        const dy = event.changedTouches[0].clientY - touchStartY;
        if (Math.abs(dx) > 50 && Math.abs(dx) > Math.abs(dy)) {
            show(dx < 0 ? current + 1 : current - 1);
        }
    }, { passive: true });
}

/* ---------- Form di contatto ---------- */
function initContactForm() {
    const form = document.getElementById('contact-form');
    if (!form) return;

    const fields = {
        nome: form.elements.nome,
        email: form.elements.email,
        telefono: form.elements.telefono,
        arrivo: form.elements.arrivo,
        partenza: form.elements.partenza,
        ospiti: form.elements.ospiti,
        messaggio: form.elements.messaggio,
    };
    const submitBtn = document.getElementById('form-submit');
    const status = document.getElementById('form-status');

    const toISODate = (date) => {
        const offset = date.getTimezoneOffset() * 60000;
        return new Date(date.getTime() - offset).toISOString().slice(0, 10);
    };

    const addDays = (isoDate, days) => {
        const date = new Date(`${isoDate}T12:00:00`);
        date.setDate(date.getDate() + days);
        return toISODate(date);
    };

    const today = toISODate(new Date());
    fields.arrivo.min = today;
    fields.partenza.min = addDays(today, 1);

    fields.arrivo.addEventListener('change', () => {
        if (!fields.arrivo.value) return;
        fields.partenza.min = addDays(fields.arrivo.value, 1);
        if (fields.partenza.value && fields.partenza.value <= fields.arrivo.value) {
            fields.partenza.value = '';
        }
    });

    // Restituisce il messaggio di errore del campo, oppure una stringa vuota
    const validators = {
        nome: (el) => {
            if (el.validity.valueMissing) return 'Inserisci nome e cognome.';
            if (el.value.trim().length < 2) return 'Il nome deve contenere almeno 2 caratteri.';
            return '';
        },
        email: (el) => {
            if (el.validity.valueMissing) return "Inserisci il tuo indirizzo email.";
            if (el.validity.typeMismatch || !/^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/.test(el.value.trim())) {
                return "Inserisci un indirizzo email valido (es. nome@esempio.it).";
            }
            return '';
        },
        telefono: (el) => {
            const value = el.value.trim();
            if (value && (el.validity.patternMismatch || !/^\+?[0-9][0-9 -]{5,19}$/.test(value))) {
                return 'Inserisci un numero di telefono valido (es. +39 333 1234567).';
            }
            return '';
        },
        arrivo: (el) => {
            if (el.validity.valueMissing) return 'Seleziona la data di arrivo.';
            if (el.value < today) return 'La data di arrivo non può essere nel passato.';
            return '';
        },
        partenza: (el) => {
            if (el.validity.valueMissing) return 'Seleziona la data di partenza.';
            if (fields.arrivo.value && el.value <= fields.arrivo.value) {
                return 'La data di partenza deve essere successiva a quella di arrivo.';
            }
            return '';
        },
    };

    const validateField = (name) => {
        const el = fields[name];
        const message = validators[name](el);
        const field = el.closest('.field');
        const errorEl = document.getElementById(`${name}-error`);
        field.classList.toggle('has-error', Boolean(message));
        el.setAttribute('aria-invalid', String(Boolean(message)));
        errorEl.textContent = message;
        return !message;
    };

    Object.keys(validators).forEach((name) => {
        const el = fields[name];
        el.addEventListener('blur', () => {
            if (el.value || el.closest('.field').classList.contains('has-error')) validateField(name);
        });
        el.addEventListener('input', () => {
            if (el.closest('.field').classList.contains('has-error')) validateField(name);
        });
    });

    const showStatus = (type, message) => {
        const icon = type === 'success' ? 'i-check' : 'i-alert';
        status.className = `form-status is-${type}`;
        status.innerHTML = `<svg class="icon" aria-hidden="true"><use href="#${icon}"/></svg><span></span>`;
        status.querySelector('span').textContent = message;
        status.focus();
    };

    const setLoading = (loading) => {
        submitBtn.classList.toggle('is-loading', loading);
        submitBtn.disabled = loading;
        submitBtn.querySelector('.btn-label').textContent = loading ? 'Invio in corso…' : 'Invia Richiesta';
    };

    const formatDate = (iso) => (iso ? iso.split('-').reverse().join('/') : '');

    // Invio tramite il programma di posta (usato finché non è configurato un endpoint)
    const sendViaMail = () => {
        const recipient = form.dataset.recipient;
        const nome = fields.nome.value.trim();
        const subject = `Nuova richiesta da ${nome} - La Dimora di Nonna Dora`;
        const body = [
            `Nome: ${nome}`,
            `Email: ${fields.email.value.trim()}`,
            `Telefono: ${fields.telefono.value.trim()}`,
            `Arrivo: ${formatDate(fields.arrivo.value)}`,
            `Partenza: ${formatDate(fields.partenza.value)}`,
            `Ospiti: ${fields.ospiti.value}`,
            '',
            'Messaggio:',
            fields.messaggio.value.trim(),
        ].join('\n');

        window.location.href = `mailto:${recipient}?subject=${encodeURIComponent(subject)}&body=${encodeURIComponent(body)}`;
    };

    // Invio a un endpoint esterno (Formspree, PHP, API…) tramite POST
    const sendViaEndpoint = async (endpoint) => {
        const response = await fetch(endpoint, {
            method: 'POST',
            body: new FormData(form),
            headers: { Accept: 'application/json' },
        });
        if (!response.ok) throw new Error(`HTTP ${response.status}`);
    };

    form.addEventListener('submit', async (event) => {
        event.preventDefault();
        status.textContent = '';
        status.className = 'form-status';

        // Campo anti-spam compilato: richiesta ignorata
        if (form.elements._gotcha.value) return;

        const invalid = Object.keys(validators).filter((name) => !validateField(name));
        if (invalid.length) {
            fields[invalid[0]].focus();
            return;
        }

        const endpoint = form.dataset.endpoint.trim();

        if (!endpoint) {
            sendViaMail();
            showStatus('success', 'Abbiamo preparato la tua richiesta nel tuo programma di posta: premi "Invia" per inoltrarla. In alternativa scrivici a ladimoradinonnadora@gmail.com o chiamaci al +39 377 0850432.');
            return;
        }

        setLoading(true);
        try {
            await sendViaEndpoint(endpoint);
            form.reset();
            showStatus('success', 'Grazie! La tua richiesta è stata inviata. Ti risponderemo al più presto.');
        } catch (error) {
            showStatus('error', "Non è stato possibile inviare la richiesta. Riprova oppure contattaci al +39 377 0850432.");
        } finally {
            setLoading(false);
        }
    });
}

/* ---------- Cookie banner e Cookie Policy ---------- */
function initCookies() {
    const banner = document.getElementById('cookie-banner');
    const accept = document.getElementById('cookie-accept');
    const policy = document.getElementById('cookie-policy');
    const STORAGE_KEY = 'cookiesAccepted';

    const readConsent = () => {
        try {
            return localStorage.getItem(STORAGE_KEY) === 'true';
        } catch {
            return false;
        }
    };

    if (banner && accept && !readConsent()) {
        setTimeout(() => { banner.hidden = false; }, 1000);
        accept.addEventListener('click', () => {
            try {
                localStorage.setItem(STORAGE_KEY, 'true');
            } catch {
                /* archiviazione non disponibile: il banner si chiude solo per questa visita */
            }
            banner.hidden = true;
        });
    }

    if (!policy) return;

    document.querySelectorAll('[data-open-cookies]').forEach((btn) => {
        btn.addEventListener('click', () => policy.showModal());
    });
    policy.querySelector('[data-close-cookies]').addEventListener('click', () => policy.close());

    // Chiusura cliccando sullo sfondo
    policy.addEventListener('click', (event) => {
        if (event.target === policy) policy.close();
    });
}

document.addEventListener('DOMContentLoaded', () => {
    initHeader();
    initStoneSurface();
    initTitleReveal();
    initHero3D();
    initFooter3D();
    initMobileMenu();
    initSmoothScroll();
    initActiveNav();
    initGallery();
    initContactForm();
    initCookies();
});
