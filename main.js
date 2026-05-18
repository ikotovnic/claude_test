/**
 * main.js — WebGL-сцена на базе Three.js r163
 * Кроссбраузерная адаптивная заготовка с скролл-анимацией камеры.
 */

import * as THREE from 'three';
import { GLTFLoader } from 'three/addons/loaders/GLTFLoader.js';

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
    color: 0x060810,   // цвет тумана (совпадает с --c-bg в CSS)
    near:  7,          // расстояние начала затухания (ед. сцены)
    far:   26,         // расстояние полного затухания
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
    { t: 1,    pos: new THREE.Vector3(0, -15, 7), look: new THREE.Vector3(0, -15, 0) },
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
    { t: 1,   pos: new THREE.Vector3(0, -15,  0) },
  ],

  /** Коэффициент LERP сглаживания движения камеры.
   *  0.01 = очень плавно, 0.15 = резко. */
  scrollLerp: 0.055,

  // ── Освещение ────────────────────────────────────────────────
  lights: {
    ambient:     { color: 0x8899cc, intensity: 0.55 },
    directional: {
      color:     0xffeedd,
      intensity: 1.35,
      pos: new THREE.Vector3(4, 8, 5),
    },
    /** Контровой источник, даёт холодный циановый ободок */
    rim: {
      color:     0x7dd4c8,
      intensity: 0.45,
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
scene.add(shadowFloor);

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

// el_central: меш/объект с именем 'el_central' в модели.
// Его позиция смещается вместе с камерой при скролле.
let elCentral         = null;
const elCentralOrigin = new THREE.Vector3();
// Клоны материалов для эксклюзивного управления opacity (не затрагивают другие меши)
let elCentralMat1     = null;  // клон mat_sphere_1
let elCentralMatWhite = null;  // клон mat_white

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

  // ── Рендеринг кадра ──────────────────────────────────────────
  renderer.render(scene, camera);
}

tick();
