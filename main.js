/**
 * main.js — WebGL-сцена на базе Three.js r163
 * Кроссбраузерная адаптивная заготовка с скролл-анимацией камеры.
 */

import * as THREE from 'three';
import { GLTFLoader } from 'three/addons/loaders/GLTFLoader.js';
// CubeCamera входит в ядро THREE — отдельный импорт не нужен

// ╔══════════════════════════════════════════════════════════════╗
// ║                      КОНФИГУРАЦИЯ                           ║
// ║  Все «ручки» настройки вынесены сюда. Менять только здесь.  ║
// ╚══════════════════════════════════════════════════════════════╝

const CONFIG = {

  // ── Модель ───────────────────────────────────────────────────
  /** Путь к GLB/GLTF-файлу относительно index.html */
  modelPath: './models/model.glb',

  // ── Туман ────────────────────────────────────────────────────
  fog: {
    color: 0x000000,   // цвет тумана (совпадает с --c-bg в CSS)
    near:  7,          // расстояние начала затухания (ед. сцены)
    far:   40,         // расстояние полного затухания
  },

  // ── Камера ───────────────────────────────────────────────────
  camera: {
    fov:  45,
    near: 0.1,
    far:  100,
  },

  /**
   * Путь камеры — массив ключевых точек.
   * Каждая точка: { t, pos, look }
   *   t    — прогресс скролла [0..1], при котором камера должна быть в этой точке
   *   pos  — позиция камеры (THREE.Vector3)
   *   look — мировая точка взгляда (THREE.Vector3)
   *
   * Точки ДОЛЖНЫ быть отсортированы по t от 0 до 1.
   * Между точками позиция и взгляд интерполируются линейно.
   * Добавляйте любое количество промежуточных точек.
   */
  cameraPath: [
    { t: 0,    pos: new THREE.Vector3(0,   0, 9), look: new THREE.Vector3(0, 0, 0) },
    { t: 0.5,  pos: new THREE.Vector3(0,  -7, 15), look: new THREE.Vector3(0, -5, 0) },
    { t: 0.75,    pos: new THREE.Vector3(0, -15, 7), look: new THREE.Vector3(0, -15, 0) },
    { t: 1,    pos: new THREE.Vector3(0, -23, 12), look: new THREE.Vector3(0, -25, 0) }
  ],

  /**
   * Путь объекта el_central — массив ключевых позиций в мировом пространстве.
   * Структура: { t, pos }  (те же правила, что и у cameraPath).
   * t — прогресс скролла [0..1], pos — THREE.Vector3 в мировых координатах.
   * Если массив пустой, el_central остаётся на своей исходной позиции из модели.
   */
  elCentralPath: [
    { t: 0,   pos: new THREE.Vector3(0,  0,   0) },
    { t: 0.5, pos: new THREE.Vector3(0,  -7,  0) },
    { t: 1,   pos: new THREE.Vector3(0, -25,  0) },
  ],

  /** Коэффициент LERP сглаживания движения камеры.
   *  0.01 = очень плавно, 0.15 = резко. */
  scrollLerp: 0.055,

  // ── Освещение ────────────────────────────────────────────────
  lights: {
    ambient:     { color: 0x8899cc, intensity: 0.55 },
    directional: {
      color:     0xffeedd,
      intensity: 2.95,
      pos: new THREE.Vector3(4, 8, 5),
    },
    /** Контровой источник, даёт холодный циановый ободок */
    rim: {
      color:     0x7dd4c8,
      intensity: 0.75,
      pos: new THREE.Vector3(-6, 1, -4),
    },
  },

  // ── OrbitControls ────────────────────────────────────────────
  /**
   * true  — мышь вращает камеру (скролл-анимация отключается).
   * false — камера управляется скроллом (режим по умолчанию).
   */
  enableOrbitControls: false,

  // ── Примитив-заглушка ────────────────────────────────────────
  fallback: {
    scale:     1.4,
    color:     0x7dd4c8,
    metalness: 0.65,
    roughness: 0.22,
  },

  // ── Вода ─────────────────────────────────────────────────────
  water: {
    color:           0x000000,   // тёмно-синий оттенок воды
    roughness:       0.002,       // почти зеркальная поверхность
    metalness:       0.01,
    opacity:         1,
    envMapIntensity: 0.1,        // интенсивность отражения сцены
    normalScale:     0.025,       // высота рябей нормал-карты
    flowSpeed:       0.03,       // скорость течения UV-анимации
    cubeResolution:  1024,        // разрешение кубической карты отражений
  },
};

// ╔══════════════════════════════════════════════════════════════╗
// ║                  ИНИЦИАЛИЗАЦИЯ THREE.JS                     ║
// ╚══════════════════════════════════════════════════════════════╝

const canvas = document.getElementById('webgl');

// Рендерер: alpha:true делает фон канваса прозрачным,
// что позволяет видеть html { background-color } сквозь пустые пиксели.
const renderer = new THREE.WebGLRenderer({
  canvas,
  alpha:     true,
  antialias: true,
  powerPreference: 'high-performance',
});
renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
renderer.setSize(window.innerWidth, window.innerHeight);
renderer.outputColorSpace    = THREE.SRGBColorSpace;
renderer.shadowMap.enabled   = true;
renderer.shadowMap.type      = THREE.PCFSoftShadowMap;
renderer.toneMapping         = THREE.ACESFilmicToneMapping;
renderer.toneMappingExposure = 1.1;

const scene = new THREE.Scene();

// ── Туман ─────────────────────────────────────────────────────
scene.fog = new THREE.Fog(CONFIG.fog.color, CONFIG.fog.near, CONFIG.fog.far);

// ── Перспективная камера ──────────────────────────────────────
const camera = new THREE.PerspectiveCamera(
  CONFIG.camera.fov,
  window.innerWidth / window.innerHeight,
  CONFIG.camera.near,
  CONFIG.camera.far,
);
camera.position.copy(CONFIG.cameraPath[0].pos);
camera.lookAt(CONFIG.cameraPath[0].look);

// ╔══════════════════════════════════════════════════════════════╗
// ║                      ОСВЕЩЕНИЕ                              ║
// ╚══════════════════════════════════════════════════════════════╝

const ambientLight = new THREE.AmbientLight(
  CONFIG.lights.ambient.color,
  CONFIG.lights.ambient.intensity,
);
scene.add(ambientLight);

const dirLight = new THREE.DirectionalLight(
  CONFIG.lights.directional.color,
  CONFIG.lights.directional.intensity,
);
dirLight.position.copy(CONFIG.lights.directional.pos);
dirLight.castShadow          = true;
dirLight.shadow.mapSize.set(1024, 1024);
dirLight.shadow.camera.near  = 0.5;
dirLight.shadow.camera.far   = 20;
scene.add(dirLight);

const rimLight = new THREE.DirectionalLight(
  CONFIG.lights.rim.color,
  CONFIG.lights.rim.intensity,
);
rimLight.position.copy(CONFIG.lights.rim.pos);
scene.add(rimLight);

// ── Декоративная сетка пола ───────────────────────────────────
// const grid = new THREE.GridHelper(30, 30, 0x0d1428, 0x080e1c);
// grid.position.y = -2.5;
// scene.add(grid);

// Плоскость-«пол» для приёма теней (визуально невидима)
const shadowFloor = new THREE.Mesh(
  new THREE.PlaneGeometry(20, 20),
  new THREE.ShadowMaterial({ opacity: 0.3 }),
);
shadowFloor.rotation.x   = -Math.PI / 2;
shadowFloor.position.y   = -2.5;
shadowFloor.receiveShadow = true;
//scene.add(shadowFloor);

// ╔══════════════════════════════════════════════════════════════╗
// ║             ПРИМИТИВ-ЗАГЛУШКА (если нет модели)             ║
// ╚══════════════════════════════════════════════════════════════╝

/**
 * Создаёт октаэдр с орбитальными кольцами.
 * Вызывается при ошибке загрузки модели.
 */
function createFallback() {
  const group = new THREE.Group();
  const { scale, color, metalness, roughness } = CONFIG.fallback;

  const geo = new THREE.OctahedronGeometry(scale, 0);

  // Основной объём
  const solidMesh = new THREE.Mesh(
    geo,
    new THREE.MeshStandardMaterial({ color, metalness, roughness }),
  );
  solidMesh.castShadow = true;
  group.add(solidMesh);

  // Проволочный каркас поверх (создаёт ощущение объёма)
  const wireMesh = new THREE.Mesh(
    geo.clone(),
    new THREE.MeshBasicMaterial({
      color: 0x4af0e0, wireframe: true, transparent: true, opacity: 0.2,
    }),
  );
  wireMesh.scale.setScalar(1.05);
  group.add(wireMesh);

  // Три орбитальных кольца под разными углами
  const ringMat = new THREE.MeshBasicMaterial({
    color: 0x7dd4c8, transparent: true, opacity: 0.15, side: THREE.DoubleSide,
  });
  [0, Math.PI / 3, -Math.PI / 3].forEach((angle, i) => {
    const ring = new THREE.Mesh(
      new THREE.TorusGeometry(scale * 1.65 + i * 0.28, 0.011, 8, 80),
      ringMat.clone(),
    );
    ring.rotation.x = Math.PI / 2 + angle;
    ring.rotation.y = angle * 0.7;
    group.add(ring);
  });

  scene.add(group);
  console.info('[WebGL] Модель не найдена — используется примитивная заглушка.');
  return group;
}

// ╔══════════════════════════════════════════════════════════════╗
// ║                    ЗАГРУЗКА GLTF/GLB                        ║
// ╚══════════════════════════════════════════════════════════════╝

let sceneObject = null;  // объект сцены: загруженная модель или заглушка
let mixer       = null;  // AnimationMixer для встроенных анимаций модели

/**
 * meshMap — словарь всех мешей модели по их имени из редактора.
 * Заполняется после загрузки. Используйте для назначения текстур:
 *
 *   const tex = new THREE.TextureLoader().load('./textures/body.jpg');
 *   meshMap['body'].material.map = tex;
 *   meshMap['body'].material.needsUpdate = true;
 */
const meshMap     = {};
const materialMap = {}; // { materialName: THREE.Material } — все материалы модели по имени

// ── Вода ─────────────────────────────────────────────────────
let waterMesh       = null;
let waterObj        = null;
let waterCubeCamera = null;
let waterNormalTex  = null;

// el_central: меш/объект с именем 'el_central' в модели.
// Его позиция смещается вместе с камерой при скролле.
let elCentral         = null;
const elCentralOrigin = new THREE.Vector3();
// Клоны материалов для эксклюзивного управления opacity (не затрагивают другие меши)
let elCentralMat1     = null;  // клон mat_sphere_1
let elCentralMatWhite = null;  // клон mat_white

// ╔══════════════════════════════════════════════════════════════╗
// ║                    ТЕКСТУРА ВОДЫ                            ║
// ╚══════════════════════════════════════════════════════════════╝

function generateWaterNormal() {
  const size = 512;
  const TILE = 4;  // целочисленный период → все октавы тайлятся ровно

  // ── Perlin noise с seeded permutation ───────────────────────────
  const perm = new Uint8Array(512);
  const gx   = new Float32Array(256);
  const gy   = new Float32Array(256);

  let s = 0xdeadbeef | 0;
  const rng = () => { s = Math.imul(s, 1664525) + 1013904223 | 0; return (s >>> 0) / 0x100000000; };

  for (let i = 0; i < 256; i++) {
    const a = rng() * Math.PI * 2;
    gx[i] = Math.cos(a);
    gy[i] = Math.sin(a);
    perm[i] = i;
  }
  for (let i = 255; i > 0; i--) {
    const j = (rng() * (i + 1)) | 0;
    const t = perm[i]; perm[i] = perm[j]; perm[j] = t;
  }
  for (let i = 0; i < 256; i++) perm[i + 256] = perm[i];

  const fade = t => t * t * t * (t * (t * 6 - 15) + 10);

  // Тайлящийся Perlin: целочисленные координаты берём по модулю периода tx/ty
  // → шум периодичен с этим периодом → текстура бесшовна при RepeatWrapping
  const perlinT = (x, y, tx, ty) => {
    const xi0 = Math.floor(x), yi0 = Math.floor(y);
    const xf = x - xi0,       yf = y - yi0;
    const ux = fade(xf), uy = fade(yf);

    const xi  = ((xi0 % tx) + tx) % tx & 255;
    const yi  = ((yi0 % ty) + ty) % ty & 255;
    const xi1 = (xi + 1) % tx & 255;
    const yi1 = (yi + 1) % ty & 255;

    const aa = perm[perm[xi]  + yi],  ba = perm[perm[xi1] + yi];
    const ab = perm[perm[xi]  + yi1], bb = perm[perm[xi1] + yi1];

    const n00 = gx[aa] * xf       + gy[aa] * yf;
    const n10 = gx[ba] * (xf - 1) + gy[ba] * yf;
    const n01 = gx[ab] * xf       + gy[ab] * (yf - 1);
    const n11 = gx[bb] * (xf - 1) + gy[bb] * (yf - 1);

    return (n00 * (1 - ux) + n10 * ux) * (1 - uy) +
           (n01 * (1 - ux) + n11 * ux) * uy;
  };

  // ── FBM: поле высот (5 октав, все с целыми периодами) ──────────
  // Каждая октава k имеет период TILE*2^k и кратна 256 → тайлинг гарантирован.
  const heights = new Float32Array(size * size);
  for (let y = 0; y < size; y++) {
    for (let x = 0; x < size; x++) {
      const u = x * TILE / size, v = y * TILE / size;
      heights[y * size + x] = (
        perlinT(u,      v,      TILE,      TILE)      * 0.5000 +
        perlinT(u * 2,  v * 2,  TILE * 2,  TILE * 2)  * 0.2500 +
        perlinT(u * 4,  v * 4,  TILE * 4,  TILE * 4)  * 0.1250 +
        perlinT(u * 8,  v * 8,  TILE * 8,  TILE * 8)  * 0.0625 +
        perlinT(u * 16, v * 16, TILE * 16, TILE * 16) * 0.03125
      );
    }
  }

  // ── Нормал-карта через центральные разности (с оборачиванием) ───
  const canvas = document.createElement('canvas');
  canvas.width = canvas.height = size;
  const ctx = canvas.getContext('2d');
  const img = ctx.createImageData(size, size);
  const d   = img.data;
  const str = 4.0;

  for (let y = 0; y < size; y++) {
    for (let x = 0; x < size; x++) {
      const i  = (y * size + x) * 4;
      const hL = heights[y * size + (x - 1 + size) % size];
      const hR = heights[y * size + (x + 1) % size];
      const hU = heights[((y - 1 + size) % size) * size + x];
      const hD = heights[((y + 1) % size) * size + x];
      const nx = (hL - hR) * str;
      const ny = (hU - hD) * str;
      d[i]     = Math.round(Math.max(0, Math.min(1, nx * 0.5 + 0.5)) * 255);
      d[i + 1] = Math.round(Math.max(0, Math.min(1, ny * 0.5 + 0.5)) * 255);
      d[i + 2] = 255;
      d[i + 3] = 255;
    }
  }
  ctx.putImageData(img, 0, 0);

  const tex = new THREE.CanvasTexture(canvas);
  tex.wrapS = tex.wrapT = THREE.RepeatWrapping;
  return tex;
}

function setupWater() {
  waterMesh = meshMap['water'];
  if (!waterMesh) { console.warn('[WebGL] "water" не найден в модели.'); return; }

  // Центр меша для CubeCamera
  const bbox   = new THREE.Box3().setFromObject(waterMesh);
  const center = new THREE.Vector3();
  bbox.getCenter(center);

  // CubeRenderTarget — HDR, чтобы яркие источники не клипились
  const cubeRT = new THREE.WebGLCubeRenderTarget(CONFIG.water.cubeResolution, {
    type:            THREE.HalfFloatType,
    generateMipmaps: true,
    minFilter:       THREE.LinearMipmapLinearFilter,
  });
  // near=0.01 — иначе объекты вплотную к воде режутся near-plane'ом в cube render
  waterCubeCamera = new THREE.CubeCamera(0.01, 500, cubeRT);
  waterCubeCamera.position.copy(center);
  scene.add(waterCubeCamera);

  // Нормал-карта бесшовной ряби (Perlin FBM)
  waterNormalTex = generateWaterNormal();

  // MeshPhysicalMaterial: тёмное зеркало
  // metalness=0 → диэлектрик, Fresnel ~4% на нормали
  // envMapIntensity=15 → компенсирует малый Fresnel → отражения видны
  // roughness=0.04 → чуть рассеяный lobe — мягкое отражение вместо точечного блика
  const mat = new THREE.MeshPhysicalMaterial({
    color:           new THREE.Color(CONFIG.water.color),
    roughness:       0.04,
    metalness:       0.0,
    envMap:          cubeRT.texture,
    envMapIntensity: 15.0,
    normalMap:       waterNormalTex,
    normalScale:     new THREE.Vector2(
      CONFIG.water.normalScale * 15,
      CONFIG.water.normalScale * 15,
    ),
  });

  // Заменяем материал оригинального меша
  const prev = waterMesh.material;
  if (Array.isArray(prev)) prev.forEach(m => m.dispose && m.dispose());
  else if (prev && prev.dispose) prev.dispose();
  waterMesh.material = mat;
  waterMesh.visible  = true;

  waterObj = waterMesh;

  console.info('[WebGL] CubeCamera вода применена к "water", center.y =', center.y.toFixed(2));
}

const gltfLoader = new GLTFLoader();

gltfLoader.load(
  CONFIG.modelPath,

  // ── Успешная загрузка ──────────────────────────────────────
  (gltf) => {
    try {
      scene.add(gltf.scene);
      sceneObject = gltf.scene;

      // Обходим все узлы модели: строим meshMap, materialMap и настраиваем тени
      gltf.scene.traverse((child) => {
        if (!child.isMesh) return;

        child.castShadow    = true;
        child.receiveShadow = true;

        if (child.name) meshMap[child.name] = child;

        // Собираем материалы (mesh.material может быть массивом при multi-material)
        const mats = Array.isArray(child.material) ? child.material : [child.material];
        mats.forEach((mat) => {
          if (mat && mat.name) materialMap[mat.name] = mat;
        });
      });

      console.info('[WebGL] Объекты модели:',   Object.keys(meshMap));
      console.info('[WebGL] Материалы модели:', Object.keys(materialMap));

      // Привязываем el_central к скроллу (если объект присутствует в модели)
      if (meshMap['el_central']) {
        elCentral = meshMap['el_central'];
        elCentralOrigin.copy(elCentral.position);

        // Клонируем материалы — opacity будем менять только на клонах,
        // чтобы не затронуть другие меши, использующие те же материалы
        if (materialMap['mat_sphere_1']) {
          elCentralMat1             = materialMap['mat_sphere_1'].clone();
          elCentralMat1.transparent = true;
          elCentralMat1.opacity     = 1;
        }
        if (materialMap['mat_white']) {
          elCentralMatWhite             = materialMap['mat_white'].clone();
          elCentralMatWhite.transparent = true;
          elCentralMatWhite.opacity     = 0;
        }
        // Назначаем стартовый материал
        if (elCentralMat1) elCentral.material = elCentralMat1;

        console.info('[WebGL] el_central найден, материалы клонированы.');
      } else {
        console.warn('[WebGL] Объект el_central не найден в модели.');
      }

      if (gltf.animations.length > 0) {
        mixer = new THREE.AnimationMixer(gltf.scene);
        gltf.animations.forEach((clip) => mixer.clipAction(clip).play());
        console.info(`[WebGL] Запущено анимаций: ${gltf.animations.length}`);
      }

      console.info('[WebGL] Модель загружена:', CONFIG.modelPath);
    } catch (err) {
      console.error('[WebGL] Ошибка при обработке модели:', err);
      sceneObject = createFallback();
    } finally {
      hideLoader();
    }

    // setupWater вызывается за пределами try/catch модели:
    // её ошибки не должны ронять загрузку всей сцены.
    try { setupWater(); } catch (err) { console.error('[WebGL] setupWater:', err); }
  },

  // ── Прогресс ──────────────────────────────────────────────
  (xhr) => {
    if (xhr.total > 0) {
      console.debug(`[WebGL] Загрузка модели: ${Math.round((xhr.loaded / xhr.total) * 100)}%`);
    }
  },

  // ── Ошибка (файл не найден или повреждён) ─────────────────
  (err) => {
    console.warn('[WebGL] Модель не загружена, используется заглушка. Причина:', err.message ?? err);
    sceneObject = createFallback();
    hideLoader();
  },
);

// ╔══════════════════════════════════════════════════════════════╗
// ║                   ORBIT CONTROLS (опция)                    ║
// ╚══════════════════════════════════════════════════════════════╝

let controls = null;

if (CONFIG.enableOrbitControls) {
  // Динамический импорт — не попадает в бандл при отключённом флаге
  import('three/addons/controls/OrbitControls.js')
    .then(({ OrbitControls }) => {
      controls = new OrbitControls(camera, renderer.domElement);
      controls.enableDamping  = true;
      controls.dampingFactor  = 0.06;
      controls.enablePan      = false;
      controls.minDistance    = 3;
      controls.maxDistance    = 18;
      controls.target.copy(CONFIG.camera.lookStart);
      controls.update();
      console.info('[WebGL] OrbitControls активен.');
    })
    .catch((err) => console.warn('[WebGL] OrbitControls не загружен:', err));
}

// ╔══════════════════════════════════════════════════════════════╗
// ║              СКРОЛЛ И ДВИЖЕНИЕ КАМЕРЫ                       ║
// ╚══════════════════════════════════════════════════════════════╝

let scrollTarget  = 0;  // целевой прогресс  [0, 1]
let scrollCurrent = 0;  // сглаженный прогресс [0, 1]

/** Нормализованный прогресс скролла: 0 = верх, 1 = низ */
function getScrollProgress() {
  const scrolled   = window.scrollY || document.documentElement.scrollTop;
  const maxScroll  = document.documentElement.scrollHeight - window.innerHeight;
  return maxScroll > 0 ? Math.min(Math.max(scrolled / maxScroll, 0), 1) : 0;
}

// Подключение GSAP ScrollTrigger (если библиотека загружена)
if (typeof gsap !== 'undefined' && typeof ScrollTrigger !== 'undefined') {
  gsap.registerPlugin(ScrollTrigger);

  ScrollTrigger.create({
    start: 'top top',
    end:   'bottom bottom',
    onUpdate: (self) => { scrollTarget = self.progress; },
  });

  console.info('[WebGL] GSAP ScrollTrigger подключён.');
} else {
  // Запасной вариант: нативный listener (работает везде, в т.ч. без CDN)
  window.addEventListener('scroll', () => {
    scrollTarget = getScrollProgress();
  }, { passive: true });

  // Поддержка свайпа на сенсорных устройствах
  let touchStartY = 0;
  window.addEventListener('touchstart', (e) => {
    touchStartY = e.touches[0].clientY;
  }, { passive: true });
  window.addEventListener('touchmove', (e) => {
    const delta = touchStartY - e.touches[0].clientY;
    window.scrollBy(0, delta * 0.5);
    touchStartY = e.touches[0].clientY;
  }, { passive: true });

  console.info('[WebGL] Нативный scroll-listener активен (GSAP не найден).');
}

// Переиспользуемые векторы — не создаём объекты в горячем пути рендера
const _camPos  = new THREE.Vector3();
const _lookAt  = new THREE.Vector3();

/**
 * Универсальная интерполяция по массиву ключевых точек [{t, pos}].
 * Находит сегмент для заданного progress и записывает lerp-результат в out.
 */
function evalPath(path, progress, out) {
  const first = path[0];
  const last  = path[path.length - 1];

  if (progress <= first.t) { out.copy(first.pos); return; }
  if (progress >= last.t)  { out.copy(last.pos);  return; }

  for (let i = 0; i < path.length - 1; i++) {
    const a = path[i];
    const b = path[i + 1];
    if (progress >= a.t && progress <= b.t) {
      out.lerpVectors(a.pos, b.pos, (progress - a.t) / (b.t - a.t));
      return;
    }
  }
}

/**
 * Вычисляет позицию камеры и точку взгляда по CONFIG.cameraPath.
 * Каждая точка имеет отдельные поля pos и look, поэтому вызываем evalPath дважды.
 */
function evalCameraPath(progress, outPos, outLook) {
  // Временно переиспользуем cameraPath, извлекая нужные поля на лету
  const path = CONFIG.cameraPath;
  const first = path[0];
  const last  = path[path.length - 1];

  if (progress <= first.t) { outPos.copy(first.pos); outLook.copy(first.look); return; }
  if (progress >= last.t)  { outPos.copy(last.pos);  outLook.copy(last.look);  return; }

  for (let i = 0; i < path.length - 1; i++) {
    const a = path[i];
    const b = path[i + 1];
    if (progress >= a.t && progress <= b.t) {
      const localT = (progress - a.t) / (b.t - a.t);
      outPos.lerpVectors(a.pos,  b.pos,  localT);
      outLook.lerpVectors(a.look, b.look, localT);
      return;
    }
  }
}

// Переиспользуемый вектор для позиции el_central
const _elCentralPos = new THREE.Vector3();

// ╔══════════════════════════════════════════════════════════════╗
// ║                     АДАПТИВНОСТЬ                            ║
// ╚══════════════════════════════════════════════════════════════╝

function onResize() {
  const w = window.innerWidth;
  const h = window.innerHeight;

  camera.aspect = w / h;
  camera.updateProjectionMatrix();

  renderer.setSize(w, h);
  renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
}

window.addEventListener('resize', onResize, { passive: true });

// ╔══════════════════════════════════════════════════════════════╗
// ║        ПОЯВЛЕНИЕ КАРТОЧЕК (IntersectionObserver)            ║
// ╚══════════════════════════════════════════════════════════════╝

const cardObserver = new IntersectionObserver(
  (entries) => {
    entries.forEach((entry) => {
      if (entry.isIntersecting) entry.target.classList.add('visible');
    });
  },
  { threshold: 0.12 },
);

document.querySelectorAll('.section__card').forEach((el) => cardObserver.observe(el));

// ╔══════════════════════════════════════════════════════════════╗
// ║                  ЗАГРУЗОЧНЫЙ ЭКРАН                          ║
// ╚══════════════════════════════════════════════════════════════╝

function hideLoader() {
  const el = document.getElementById('loader');
  if (el) el.classList.add('hidden');
}

// Резервный таймаут: скроем загрузчик в любом случае через 6 с
setTimeout(hideLoader, 6000);

// ╔══════════════════════════════════════════════════════════════╗
// ║                   АНИМАЦИОННЫЙ ЦИКЛ                         ║
// ╚══════════════════════════════════════════════════════════════╝

const clock = new THREE.Clock();

// Счётчик кадров для throttle вывода в консоль (каждые 30 кадров ≈ 0.5 с при 60fps)
let _debugFrame = 0;
const DEBUG_INTERVAL = 30;

function tick() {
  requestAnimationFrame(tick);

  const delta   = clock.getDelta();
  const elapsed = clock.elapsedTime;
  _debugFrame++;

  // ── Обновление анимаций GLTF-модели ─────────────────────────
  if (mixer) mixer.update(delta);

  // ── Движение камеры по скроллу ───────────────────────────────
  if (!CONFIG.enableOrbitControls) {
    // LERP: плавно тянем текущий прогресс к целевому
    scrollCurrent += (scrollTarget - scrollCurrent) * CONFIG.scrollLerp;

    evalCameraPath(scrollCurrent, _camPos, _lookAt);
    camera.position.copy(_camPos);
    camera.lookAt(_lookAt);
  }

  // ── el_central: позиция по elCentralPath ─────────────────────
  if (elCentral) {
    if (CONFIG.elCentralPath.length > 0) {
      evalPath(CONFIG.elCentralPath, scrollCurrent, _elCentralPos);
      elCentral.position.copy(_elCentralPos);
    }

    // ── Плавная смена материала через прозрачность ───────────
    // Y = -10  → t = 0 → полностью mat_sphere_1
    // Y = -11  → t = 1 → полностью mat_white
    // Диапазон разбит пополам: первая половина — fade-out mat_sphere_1,
    // вторая — fade-in mat_white (краткий момент полной прозрачности в середине)
    if (elCentralMat1 && elCentralMatWhite) {
      const t = Math.max(0, Math.min(1, (-elCentral.position.y - 10) / 1));

      if (t <= 0) {
        elCentral.material        = elCentralMat1;
        elCentralMat1.opacity     = 1;
        elCentralMat1.transparent = false;
      } else if (t >= 1) {
        elCentral.material            = elCentralMatWhite;
        elCentralMatWhite.opacity     = 1;
        elCentralMatWhite.transparent = false;
      } else if (t < 0.5) {
        elCentral.material        = elCentralMat1;
        elCentralMat1.transparent = true;
        elCentralMat1.opacity     = 1 - t * 2;          // 1 → 0
      } else {
        elCentral.material            = elCentralMatWhite;
        elCentralMatWhite.transparent = true;
        elCentralMatWhite.opacity     = (t - 0.5) * 2;  // 0 → 1
      }
    }
  }

  // ── Debug-вывод каждые DEBUG_INTERVAL кадров ─────────────────
  if (_debugFrame % DEBUG_INTERVAL === 0) {
    const p = camera.position;
    const l = _lookAt;
    console.log(
      `[cam pos]    x:${p.x.toFixed(3)}  y:${p.y.toFixed(3)}  z:${p.z.toFixed(3)}\n` +
      `[cam lookAt] x:${l.x.toFixed(3)}  y:${l.y.toFixed(3)}  z:${l.z.toFixed(3)}\n` +
      (elCentral
        ? `[el_central] x:${elCentral.position.x.toFixed(3)}  y:${elCentral.position.y.toFixed(3)}  z:${elCentral.position.z.toFixed(3)}`
        : '[el_central] не найден в сцене'),
    );
  }

  // ── Автоанимация заглушки (только при отсутствии GLTF-анимаций) ──
  if (sceneObject && !mixer) {
    //sceneObject.rotation.y += delta * 0.22;
    //sceneObject.rotation.x  = Math.sin(elapsed * 0.38) * 0.13;
  }

  // ── Обновление OrbitControls ─────────────────────────────────
  if (controls) controls.update();

  // ── Вода: анимация нормал-карты + обновление CubeCamera ────────
  if (waterObj && waterCubeCamera) {
    // Смещение UV нормал-карты в двух направлениях → органичная рябь без паттерна
    waterNormalTex.offset.x += delta * CONFIG.water.flowSpeed * 0.28;
    waterNormalTex.offset.y += delta * CONFIG.water.flowSpeed * 0.17;

    // Cube render target должен содержать линейный HDR — иначе IBL считается неверно.
    // Отключаем tonemapping + gamma до рендера, восстанавливаем после.
    waterObj.visible = false;
    const savedFog   = scene.fog;
    const savedTone  = renderer.toneMapping;
    const savedCS    = renderer.outputColorSpace;
    scene.fog                  = null;
    renderer.toneMapping       = THREE.NoToneMapping;
    renderer.outputColorSpace  = THREE.LinearSRGBColorSpace;
    waterCubeCamera.update(renderer, scene);
    scene.fog                  = savedFog;
    renderer.toneMapping       = savedTone;
    renderer.outputColorSpace  = savedCS;
    waterObj.visible = true;
  }

  // ── Рендеринг кадра ──────────────────────────────────────────
  renderer.render(scene, camera);
}

tick();
