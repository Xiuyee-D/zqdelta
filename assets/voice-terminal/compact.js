/* Voice terminal R4: compact WebGL2 viewer; no runtime libraries. */
const $ = (selector) => document.querySelector(selector);
const canvas = $("#canvas"),
  stage = $("#stage"),
  root = document.documentElement;
const params = new URLSearchParams(location.search);
let themeCleanup;
if (params.get("capture") === "1") root.dataset.capture = "yes";
const lang = params.get("lang") === "en" ? "en" : "zh-CN";
root.lang = lang;
const copy =
  lang === "en"
    ? {
        title: "Voice terminal assembly",
        hint: "Drag to rotate · Arrow keys to adjust",
        canvas: "3D voice terminal. Drag or use arrow keys to rotate; Home resets the view.",
        loading: "Loading model…",
        error: "Model unavailable. Please use the static preview.",
        assembled: "Assembled",
        exploded: "Exploded",
        reset: "Reset",
        views: "Assembly view",
        front: "Front",
        rear: "Rear",
      }
    : {
        title: "语音终端装配结构",
        hint: "拖动旋转 · 方向键调整视角",
        canvas: "语音终端三维模型；拖动或使用方向键旋转，Home 复位",
        loading: "正在加载模型…",
        error: "模型暂不可用，请使用静态预览。",
        assembled: "整机",
        exploded: "展开",
        reset: "复位",
        views: "装配视图",
        front: "前壳",
        rear: "后壳",
      };
document.title = copy.title;
canvas.setAttribute("aria-label", copy.canvas);
$(".vt-toolbar").setAttribute("aria-label", copy.views);
for (const key of ["hint", "loading", "assembled", "exploded", "reset"]) $("#" + key).textContent = copy[key];
const reduced = matchMedia("(prefers-reduced-motion: reduce)");
const state = { ready: false, visible: true, p: 0, target: 0, transition: null, theme: "light", yaw: 0.52, pitch: 0.25, zoom: 1 };
let gl,
  program,
  loc,
  manifest,
  camera = {},
  lineBuffer,
  frameId = 0;
const geometry = {},
  instances = [];
/* WebGL2 math, shaders and VTM loader retained from R3. */
const clamp = (x, a = 0, b = 1) => Math.max(a, Math.min(b, x));
const add = (a, b) => a.map((v, i) => v + b[i]);
const sub = (a, b) => a.map((v, i) => v - b[i]);
const scale = (a, s) => a.map((v) => v * s);
const dot = (a, b) => a[0] * b[0] + a[1] * b[1] + a[2] * b[2];
const cross = (a, b) => [a[1] * b[2] - a[2] * b[1], a[2] * b[0] - a[0] * b[2], a[0] * b[1] - a[1] * b[0]];
const norm = (a) => scale(a, 1 / Math.max(1e-12, Math.hypot(...a)));
const mulR = (R, p) => R.map((r) => dot(r, p));
const mulRT = (R, p) => [
  R[0][0] * p[0] + R[1][0] * p[1] + R[2][0] * p[2],
  R[0][1] * p[0] + R[1][1] * p[1] + R[2][1] * p[2],
  R[0][2] * p[0] + R[1][2] * p[1] + R[2][2] * p[2],
];
const smooth = (t) => {
  t = clamp(t);
  return t * t * (3 - 2 * t);
};
const I = [
  [1, 0, 0],
  [0, 1, 0],
  [0, 0, 1],
];
const hex = (c) => [1, 3, 5].map((i) => parseInt(c.slice(i, i + 2), 16) / 255);
const modelMatrix = (R, t) => new Float32Array([R[0][0], R[1][0], R[2][0], 0, R[0][1], R[1][1], R[2][1], 0, R[0][2], R[1][2], R[2][2], 0, ...t, 1]);
const corners = (bb) => {
  const a = [];
  for (let i = 0; i < 8; i++) a.push([bb[i & 1 ? 1 : 0][0], bb[i & 2 ? 1 : 0][1], bb[i & 4 ? 1 : 0][2]]);
  return a;
};
const bounding = (pts) => [0, 1].map((k) => [0, 1, 2].map((j) => (k ? Math.max : Math.min)(...pts.map((p) => p[j]))));
const centre = (bb) => scale(add(bb[0], bb[1]), 0.5);

const VS = `#version 300 es
precision highp float;
layout(location=0) in vec3 aPosition;
layout(location=1) in vec3 aNormal;
layout(location=2) in vec4 aColor;
uniform mat4 uModel,uView,uProjection;
out vec3 vPosition,vNormal;
out vec4 vColor;
void main(){vec4 p=uModel*vec4(aPosition,1.0);vPosition=p.xyz;vNormal=mat3(uModel)*aNormal;vColor=aColor;gl_Position=uProjection*uView*p;}`;
const FS = `#version 300 es
precision highp float;
in vec3 vPosition,vNormal;
in vec4 vColor;
uniform vec3 uEye,uColor;
uniform float uOverride,uAlpha,uSelected,uUnlit;
out vec4 outColor;
void main(){
 vec3 base=mix(vColor.rgb,uColor,uOverride);
 if(uUnlit>0.5){outColor=vec4(base,uAlpha);return;}
 vec3 n=normalize(vNormal);if(!gl_FrontFacing)n=-n;
 vec3 viewDir=normalize(uEye-vPosition);
 vec3 key=normalize(vec3(0.45,0.8,1.2));
 vec3 fill=normalize(vec3(-0.9,0.3,0.55));
 vec3 rim=normalize(vec3(-0.3,0.5,-0.7));
 float lit=0.58+0.35*max(dot(n,key),0.0)+0.22*max(dot(n,fill),0.0)+0.12*max(dot(n,rim),0.0);
 float spec=pow(max(dot(n,normalize(viewDir+key)),0.0),44.0)*0.13;
 vec3 c=base*lit+vec3(spec);
 c=mix(c,vec3(0.72,0.56,0.31)*0.72+c*0.30,uSelected*0.65);
 c=pow(clamp(c,0.0,1.0),vec3(0.88));
 outColor=vec4(c,uAlpha);
}`;
function compile(type, source) {
  const shader = gl.createShader(type);
  gl.shaderSource(shader, source);
  gl.compileShader(shader);
  if (!gl.getShaderParameter(shader, gl.COMPILE_STATUS)) throw Error(gl.getShaderInfoLog(shader));
  return shader;
}
function initGL() {
  gl = canvas.getContext("webgl2", { alpha: false, antialias: true, powerPreference: "low-power", preserveDrawingBuffer: true });
  if (!gl) throw Error("此浏览器未提供 WebGL2");
  const vs = compile(gl.VERTEX_SHADER, VS),
    fs = compile(gl.FRAGMENT_SHADER, FS);
  program = gl.createProgram();
  gl.attachShader(program, vs);
  gl.attachShader(program, fs);
  gl.linkProgram(program);
  if (!gl.getProgramParameter(program, gl.LINK_STATUS)) throw Error(gl.getProgramInfoLog(program));
  gl.deleteShader(vs);
  gl.deleteShader(fs);
  gl.useProgram(program);
  loc = Object.fromEntries(
    ["Model", "View", "Projection", "Eye", "Color", "Override", "Alpha", "Selected", "Unlit"].map((k) => [k, gl.getUniformLocation(program, "u" + k)])
  );
  gl.enable(gl.DEPTH_TEST);
  gl.enable(gl.BLEND);
  gl.blendFunc(gl.SRC_ALPHA, gl.ONE_MINUS_SRC_ALPHA);
  gl.disable(gl.CULL_FACE);
  gl.clearColor(0, 0, 0, 0);
  lineBuffer = gl.createBuffer();
}
function loadArchive(buffer) {
  const bytes = new Uint8Array(buffer),
    dv = new DataView(buffer);
  if (new TextDecoder().decode(bytes.subarray(0, 4)) !== "VTM3") throw Error("无效的几何文件");
  const n = dv.getUint32(4, true);
  if (n > buffer.byteLength - 8) throw Error("几何文件头损坏");
  const header = JSON.parse(new TextDecoder().decode(bytes.subarray(8, 8 + n))),
    start = 8 + n;
  if (header.vertex_stride !== 28) throw Error("不支持的顶点格式");
  for (const [key, meta] of Object.entries(header.parts)) {
    const vo = start + meta.vertex_offset,
      io = start + meta.index_offset;
    if (vo < start || io < start || vo + meta.vertex_count * 28 > buffer.byteLength || io + meta.index_count * 4 > buffer.byteLength)
      throw Error("几何文件长度不匹配");
    const vb = gl.createBuffer(),
      ib = gl.createBuffer();
    gl.bindBuffer(gl.ARRAY_BUFFER, vb);
    gl.bufferData(gl.ARRAY_BUFFER, new Uint8Array(buffer, vo, meta.vertex_count * 28), gl.STATIC_DRAW);
    gl.bindBuffer(gl.ELEMENT_ARRAY_BUFFER, ib);
    gl.bufferData(gl.ELEMENT_ARRAY_BUFFER, new Uint8Array(buffer, io, meta.index_count * 4), gl.STATIC_DRAW);
    geometry[key] = {
      ...meta,
      vb,
      ib,
      vertices: new DataView(buffer, vo, meta.vertex_count * 28),
      indices: new Uint32Array(buffer, io, meta.index_count),
    };
  }
}
function bindGeometry(g) {
  gl.bindBuffer(gl.ARRAY_BUFFER, g.vb);
  gl.bindBuffer(gl.ELEMENT_ARRAY_BUFFER, g.ib);
  gl.enableVertexAttribArray(0);
  gl.vertexAttribPointer(0, 3, gl.FLOAT, false, 28, 0);
  gl.enableVertexAttribArray(1);
  gl.vertexAttribPointer(1, 3, gl.FLOAT, false, 28, 12);
  gl.enableVertexAttribArray(2);
  gl.vertexAttribPointer(2, 4, gl.UNSIGNED_BYTE, true, 28, 24);
}
function drawPart(p) {
  bindGeometry(geometry[p.mesh]);
  gl.uniformMatrix4fv(loc.Model, false, modelMatrix(p.rotation_matrix, p.t));
  gl.uniform3fv(loc.Color, p.display_color ? hex(p.display_color) : [0, 0, 0]);
  gl.uniform1f(loc.Override, p.display_color ? 1 : 0);
  gl.uniform1f(loc.Alpha, p.alpha);
  gl.uniform1f(loc.Selected, 0);
  gl.uniform1f(loc.Unlit, 0);
  gl.depthMask(p.alpha === 1);
  gl.drawElements(gl.TRIANGLES, geometry[p.mesh].index_count, gl.UNSIGNED_INT, 0);
}
function resolvePlacement(part) {
  const stop = part.closed_stop;
  if (!stop) return { rotation: part.rotation_matrix, translation: part.translation_mm };
  const angle = (clamp(stop.angle_deg, stop.minimum_angle_deg, stop.maximum_angle_deg) * Math.PI) / 180;
  const c = Math.cos(angle),
    s = Math.sin(angle);
  const rotation = [
    [1, 0, 0],
    [0, c, -s],
    [0, s, c],
  ];
  const pivot = stop.pivot_assembly_mm;
  const base = stop.base_translation_mm;
  return { rotation, translation: add(pivot, mulR(rotation, sub(base, pivot))) };
}
function offsetFor(part) {
  if (part.motion_group) return offsetFor(instances.find((p) => p.id === part.motion_group));
  if (["power", "wake"].includes(part.id)) {
    const front = instances.find((p) => p.id === "front");
    return [
      20 * smooth((state.p - 0.42) / 0.58),
      0,
      40 * smooth((state.p - front.explode_stage[0]) / (front.explode_stage[1] - front.explode_stage[0])),
    ];
  }
  return scale(part.explode_offset_mm, smooth((state.p - part.explode_stage[0]) / (part.explode_stage[1] - part.explode_stage[0])));
}
function updateParts() {
  for (const p of instances) {
    p.offset = offsetFor(p);
    p.t = add(sub(p.translation_mm, manifest.view_origin_mm), p.offset);
    p.alpha = 1;
    p.worldCorners = p.localCorners.map((v) => add(mulR(p.rotation_matrix, v), p.t));
    p.worldCenter = centre(bounding(p.worldCorners));
  }
}
function fitCamera() {
  const points = instances.flatMap((p) => p.worldCorners),
    target = centre(bounding(points));
  const aspect = Math.max(0.2, stage.clientWidth / Math.max(1, stage.clientHeight));
  const yaw = state.yaw + 0.38 * smooth(state.p);
  const dir = [Math.cos(state.pitch) * Math.sin(yaw), Math.sin(state.pitch), Math.cos(state.pitch) * Math.cos(yaw)];
  const forward = scale(dir, -1),
    right = norm(cross(forward, [0, 1, 0])),
    up = cross(right, forward);
  const ty = Math.tan((34 * Math.PI) / 360),
    tx = ty * aspect;
  let distance = 0;
  for (const v0 of points) {
    const v = sub(v0, target),
      depth = dot(v, forward);
    distance = Math.max(distance, Math.abs(dot(v, right)) / tx - depth, Math.abs(dot(v, up)) / ty - depth);
  }
  distance = Math.max(35, distance * 1.18 * state.zoom);
  camera = { target, eye: add(target, scale(dir, distance)), right, up, forward, tx, ty, aspect, distance };
  const e = camera.eye,
    r = right,
    u = up,
    f = forward;
  camera.view = new Float32Array([r[0], u[0], -f[0], 0, r[1], u[1], -f[1], 0, r[2], u[2], -f[2], 0, -dot(r, e), -dot(u, e), dot(f, e), 1]);
  const near = 0.2,
    far = 4000,
    q = 1 / ty;
  camera.projection = new Float32Array([
    q / aspect,
    0,
    0,
    0,
    0,
    q,
    0,
    0,
    0,
    0,
    (far + near) / (near - far),
    -1,
    0,
    0,
    (2 * far * near) / (near - far),
    0,
  ]);
}
function updateLabels() {
  for (const p of instances.filter((p) => p.tag)) {
    p.tag.hidden = state.p < 0.98;
    if (p.tag.hidden) continue;
    const v = sub(p.worldCenter, camera.eye),
      z = dot(v, camera.forward);
    const x = ((dot(v, camera.right) / (z * camera.tx) + 1) * stage.clientWidth) / 2;
    const y = ((1 - dot(v, camera.up) / (z * camera.ty)) * stage.clientHeight) / 2;
    p.tag.style.left = clamp(x, 40, stage.clientWidth - 40) + "px";
    p.tag.style.top = clamp(y + 30, 44, stage.clientHeight - 16) + "px";
  }
}
function render() {
  if (!state.ready) return;
  fitCamera();
  const dpr = Math.min(devicePixelRatio || 1, 2),
    w = Math.round(stage.clientWidth * dpr),
    h = Math.round(stage.clientHeight * dpr);
  if (canvas.width !== w || canvas.height !== h) {
    canvas.width = w;
    canvas.height = h;
  }
  gl.viewport(0, 0, w, h);
  gl.clearColor(...hex(state.theme === "dark" ? "#2e3440" : "#f6f8fb"), 1);
  gl.depthMask(true);
  gl.clear(gl.COLOR_BUFFER_BIT | gl.DEPTH_BUFFER_BIT);
  gl.useProgram(program);
  gl.uniformMatrix4fv(loc.View, false, camera.view);
  gl.uniformMatrix4fv(loc.Projection, false, camera.projection);
  gl.uniform3fv(loc.Eye, camera.eye);
  instances.forEach(drawPart);
  updateLabels();
}
function requestDraw() {
  if (!frameId) frameId = requestAnimationFrame(drawFrame);
}
function drawFrame(now) {
  frameId = 0;
  if (!state.ready || !state.visible || document.hidden) return;
  if (state.transition) {
    const t = clamp((now - state.transition.start) / 420);
    state.p = state.transition.from + (state.transition.to - state.transition.from) * smooth(t);
    updateParts();
    if (t === 1) state.transition = null;
  }
  render();
  if (state.transition) requestDraw();
}
function setExplosion(value, animate = false) {
  const target = clamp(value);
  state.target = target;
  $("#assembled").setAttribute("aria-pressed", String(target === 0));
  $("#exploded").setAttribute("aria-pressed", String(target === 1));
  if (animate && !reduced.matches && state.visible && !document.hidden) state.transition = { from: state.p, to: target, start: performance.now() };
  else {
    state.transition = null;
    state.p = target;
    updateParts();
  }
  requestDraw();
}
function reset() {
  state.yaw = 0.52;
  state.pitch = 0.25;
  state.zoom = 1;
  setExplosion(0);
}
function setTheme(theme) {
  cancelAnimationFrame(themeCleanup);
  root.classList.add("theme-changing");
  state.theme = theme === "dark" ? "dark" : "light";
  root.dataset.theme = state.theme;
  themeCleanup = requestAnimationFrame(() => {
    themeCleanup = requestAnimationFrame(() => root.classList.remove("theme-changing"));
  });
  requestDraw();
}
function finishTransition() {
  if (state.transition) setExplosion(state.target);
}
function notify(type, extra = {}) {
  if (parent !== window) parent.postMessage({ channel: "voice-terminal", type, ...extra }, location.origin);
}
function fail(error) {
  state.ready = false;
  state.transition = null;
  cancelAnimationFrame(frameId);
  frameId = 0;
  $("#loading").hidden = false;
  $("#loading").textContent = copy.error;
  for (const button of document.querySelectorAll("button")) button.disabled = true;
  notify("error");
  console.warn("Voice terminal:", error.message);
}
function wireControls() {
  $("#assembled").onclick = () => setExplosion(0, true);
  $("#exploded").onclick = () => setExplosion(1, true);
  $("#reset").onclick = reset;
  let pointer = null;
  canvas.addEventListener("pointerdown", (e) => {
    if (!state.ready || pointer) return;
    canvas.focus({ preventScroll: true });
    canvas.setPointerCapture(e.pointerId);
    pointer = { id: e.pointerId, x: e.clientX, y: e.clientY };
  });
  canvas.addEventListener("pointermove", (e) => {
    if (!pointer || pointer.id !== e.pointerId) return;
    state.yaw -= (e.clientX - pointer.x) * 0.008;
    state.pitch = clamp(state.pitch + (e.clientY - pointer.y) * 0.007, -1.4, 1.4);
    pointer = { id: e.pointerId, x: e.clientX, y: e.clientY };
    requestDraw();
  });
  const release = () => {
    pointer = null;
  };
  canvas.addEventListener("pointerup", release);
  canvas.addEventListener("pointercancel", release);
  canvas.addEventListener("lostpointercapture", release);
  // Leave wheel gestures to the parent document's normal reading scroll.
  canvas.addEventListener("keydown", (e) => {
    if (!["ArrowLeft", "ArrowRight", "ArrowUp", "ArrowDown", "Home"].includes(e.key)) return;
    e.preventDefault();
    if (e.key === "Home") {
      reset();
      return;
    }
    if (e.key === "ArrowLeft") state.yaw -= 0.1;
    if (e.key === "ArrowRight") state.yaw += 0.1;
    if (e.key === "ArrowUp") state.pitch = clamp(state.pitch + 0.1, -1.4, 1.4);
    if (e.key === "ArrowDown") state.pitch = clamp(state.pitch - 0.1, -1.4, 1.4);
    requestDraw();
  });
  new ResizeObserver(requestDraw).observe(stage);
  new IntersectionObserver((entries) => {
    state.visible = entries[0].isIntersecting;
    if (!state.visible) finishTransition();
    else requestDraw();
  }).observe(stage);
  document.addEventListener("visibilitychange", () => {
    finishTransition();
    if (!document.hidden) requestDraw();
  });
  reduced.addEventListener("change", () => {
    if (reduced.matches) finishTransition();
  });
  window.addEventListener("message", (e) => {
    if (e.source === parent && e.origin === location.origin && e.data?.channel === "voice-terminal" && e.data.type === "theme")
      setTheme(e.data.theme);
  });
  canvas.addEventListener("webglcontextlost", (e) => {
    e.preventDefault();
    fail(Error("WebGL context lost"));
  });
  window.addEventListener("pageshow", requestDraw);
}
async function start() {
  try {
    setTheme(params.get("theme"));
    initGL();
    const response = await fetch(new URL("assembly.json", import.meta.url));
    if (!response.ok) throw Error("Assembly HTTP " + response.status);
    manifest = await response.json();
    const mesh = await fetch(new URL(manifest.geometry_archive, import.meta.url));
    if (!mesh.ok) throw Error("Geometry HTTP " + mesh.status);
    loadArchive(await mesh.arrayBuffer());
    for (const part of manifest.parts) {
      if (!geometry[part.mesh]) throw Error("Missing mesh");
      const placement = resolvePlacement(part);
      const p = {
        ...part,
        rotation_matrix: placement.rotation,
        translation_mm: placement.translation,
        localCorners: corners(geometry[part.mesh].bounds_mm),
      };
      instances.push(p);
      if (["pcb", "front", "rear"].includes(p.id)) {
        p.tag = document.createElement("span");
        p.tag.className = "vt-label";
        p.tag.textContent = p.id === "pcb" ? "PCB" : p.id === "front" ? copy.front : copy.rear;
        p.tag.hidden = true;
        $("#labels").append(p.tag);
      }
    }
    state.ready = true;
    updateParts();
    wireControls();
    $("#loading").hidden = true;
    for (const button of document.querySelectorAll("button")) button.disabled = false;
    window.voiceTerminal = {
      setExplosion(value) {
        setExplosion(value);
        render();
      },
      reset,
      snapshot() {
        return {
          ready: state.ready,
          progress: state.p,
          target: state.target,
          animating: Boolean(state.transition),
          theme: state.theme,
          partCount: instances.length,
          uniqueMeshCount: Object.keys(geometry).length,
          yaw: state.yaw,
          pitch: state.pitch,
          parts: instances.map((p) => ({ id: p.id, mesh: p.mesh, translation: p.translation_mm, rotation: p.rotation_matrix, offset: p.offset })),
        };
      },
      capture() {
        render();
        return canvas.toDataURL("image/png");
      },
    };
    render();
    notify("ready");
  } catch (error) {
    fail(error);
  }
}
window.addEventListener("pagehide", (e) => {
  cancelAnimationFrame(frameId);
  frameId = 0;
  finishTransition();
  if (!e.persisted && gl) {
    for (const g of Object.values(geometry)) {
      gl.deleteBuffer(g.vb);
      gl.deleteBuffer(g.ib);
    }
    gl.deleteBuffer(lineBuffer);
    gl.deleteProgram(program);
  }
});
start();
