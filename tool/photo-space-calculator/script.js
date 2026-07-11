(() => {
  "use strict";

  const CONFIG = {
    canvas: { width: 1212, height: 1090.5, bitmapHeight: 1091 },
    layers: {
      frame: { x: 391.9, y: 0, width: 821.8, height: 1031.9 },
      photoInput: { x: 432.7, y: 102.1, width: 670.5, height: 874.7, sourceWidth: 672, sourceHeight: 875 },
      formal: { x: 0, y: 318.8, width: 617.4, height: 771.8 }
    },
    photoInputCorners: [
      { x: 55, y: 0 },
      { x: 671, y: 40 },
      { x: 616, y: 874 },
      { x: 0, y: 834 }
    ],
    frameOpeningBounds: { x: 111, y: 104, width: 668, height: 873, sourceWidth: 889, sourceHeight: 1085 },
    fillBleed: 1.08,
    dpi: 300,
    pngPixelsPerMeter: Math.round(300 / 0.0254)
  };

  CONFIG.clip = CONFIG.photoInputCorners.map(toCanvasPoint);
  CONFIG.frame = buildFramePlane(CONFIG.clip);
  CONFIG.opening = buildOpeningPlane();

  const els = {
    photoInput: document.getElementById("photoInput"),
    canvas: document.getElementById("previewCanvas"),
    stage: document.getElementById("stage"),
    fileStatus: document.getElementById("fileStatus"),
    imageMeta: document.getElementById("imageMeta"),
    guideToggle: document.getElementById("guideToggle"),
    resetButton: document.getElementById("resetButton"),
    nudgeUp: document.getElementById("nudgeUp"),
    nudgeDown: document.getElementById("nudgeDown"),
    nudgeLeft: document.getElementById("nudgeLeft"),
    nudgeRight: document.getElementById("nudgeRight"),
    pickCenterButton: document.getElementById("pickCenterButton"),
    nudgeStep: document.getElementById("nudgeStep"),
    zoomRange: document.getElementById("zoomRange"),
    zoomReadout: document.getElementById("zoomReadout"),
    topPx: document.getElementById("topPx"),
    bottomPx: document.getElementById("bottomPx"),
    leftPx: document.getElementById("leftPx"),
    rightPx: document.getElementById("rightPx"),
    addedSize: document.getElementById("addedSize"),
    exportSize: document.getElementById("exportSize"),
    unitRows: document.getElementById("unitRows"),
    copyButton: document.getElementById("copyButton"),
    exportButton: document.getElementById("exportButton"),
    exportStatus: document.getElementById("exportStatus")
  };

  const ctx = els.canvas.getContext("2d", { alpha: true });
  const maskCanvas = document.createElement("canvas");
  maskCanvas.width = CONFIG.canvas.width;
  maskCanvas.height = CONFIG.canvas.bitmapHeight;
  const maskCtx = maskCanvas.getContext("2d", { alpha: true });
  const assets = {
    frame: loadAsset("./assets/frame.png"),
    frameOpeningMask: loadAsset("./assets/frame-opening-mask.png"),
    photoInput: loadAsset("./assets/photo-input-2.png"),
    formal: loadAsset("./assets/formal.png")
  };

  const state = {
    file: null,
    filename: "",
    image: null,
    imageUrl: "",
    imageWidth: 0,
    imageHeight: 0,
    baseScale: 1,
    zoom: 1,
    x: 0,
    y: 0,
    pickingCenter: false,
    dragging: false,
    dragStart: null,
    offsets: { top: 0, bottom: 0, left: 0, right: 0 }
  };

  init();

  function init() {
    els.photoInput.addEventListener("change", handleFileSelect);
    els.guideToggle.addEventListener("change", render);
    els.resetButton.addEventListener("click", resetPlacement);
    els.zoomRange.addEventListener("input", handleZoom);
    els.pickCenterButton.addEventListener("click", togglePickCenter);
    els.copyButton.addEventListener("click", copyOffsets);
    els.exportButton.addEventListener("click", exportTransparentPng);
    els.stage.addEventListener("pointerdown", startDrag);
    window.addEventListener("pointermove", moveDrag);
    window.addEventListener("pointerup", stopDrag);
    window.addEventListener("pointercancel", stopDrag);
    [[els.nudgeUp, 0, -1], [els.nudgeDown, 0, 1], [els.nudgeLeft, -1, 0], [els.nudgeRight, 1, 0]].forEach(([button, dx, dy]) => {
      button.addEventListener("click", () => nudge(dx, dy));
    });
    updateOffsets();
    render();
  }

  function handleFileSelect(event) {
    const [file] = event.target.files || [];
    if (!file) return;
    const image = new Image();
    const url = URL.createObjectURL(file);
    image.onload = () => {
      if (state.imageUrl) URL.revokeObjectURL(state.imageUrl);
      state.file = file;
      state.filename = file.name;
      state.image = image;
      state.imageUrl = url;
      state.imageWidth = image.naturalWidth;
      state.imageHeight = image.naturalHeight;
      state.zoom = 1;
      state.baseScale = getCoverScale(state.imageWidth, state.imageHeight);
      els.stage.classList.add("has-photo");
      els.fileStatus.textContent = file.name;
      els.imageMeta.textContent = `${state.imageWidth} x ${state.imageHeight}px - ${CONFIG.dpi} DPI`;
      els.exportStatus.textContent = "";
      setEnabled(true);
      resetPlacement();
    };
    image.onerror = () => {
      URL.revokeObjectURL(url);
      els.exportStatus.textContent = "The selected file could not be loaded.";
    };
    image.src = url;
  }

  function setEnabled(enabled) {
    [els.resetButton, els.nudgeUp, els.nudgeDown, els.nudgeLeft, els.nudgeRight, els.pickCenterButton, els.zoomRange, els.copyButton, els.exportButton].forEach((element) => {
      element.disabled = !enabled;
    });
  }

  function resetPlacement() {
    if (!state.image) return;
    setPickingCenter(false);
    state.zoom = 1;
    els.zoomRange.value = "1";
    const scale = getScale();
    state.x = (CONFIG.opening.x - CONFIG.frame.x) + (CONFIG.opening.width - state.imageWidth * scale) / 2;
    state.y = (CONFIG.opening.y - CONFIG.frame.y) + (CONFIG.opening.height - state.imageHeight * scale) / 2;
    render();
  }

  function handleZoom() {
    if (!state.image) return;
    const previousScale = getScale();
    const centerX = CONFIG.frame.width / 2;
    const centerY = CONFIG.frame.height / 2;
    const imageCenterX = (centerX - state.x) / previousScale;
    const imageCenterY = (centerY - state.y) / previousScale;
    state.zoom = Number(els.zoomRange.value);
    const nextScale = getScale();
    state.x = centerX - imageCenterX * nextScale;
    state.y = centerY - imageCenterY * nextScale;
    render();
  }

  function nudge(dx, dy) {
    if (!state.image) return;
    setPickingCenter(false);
    const step = Number(els.nudgeStep.value) || 1;
    state.x += dx * step;
    state.y += dy * step;
    render();
  }

  function getScale() {
    return state.baseScale * state.zoom;
  }

  function getCoverScale(imageWidth, imageHeight) {
    return Math.max(CONFIG.opening.width / imageWidth, CONFIG.opening.height / imageHeight) * CONFIG.fillBleed;
  }

  function render() {
    ctx.clearRect(0, 0, CONFIG.canvas.width, CONFIG.canvas.bitmapHeight);
    drawPhotoOrPlaceholder();
    if (els.guideToggle.checked) drawGuide();
    drawTemplateLayers();
    els.zoomReadout.textContent = `${(state.zoom * 100).toFixed(1)}%`;
    updateOffsets();
  }

  function drawPhotoOrPlaceholder() {
    if (state.image) {
      const scale = getScale();
      if (assets.frameOpeningMask.complete && assets.frameOpeningMask.naturalWidth) {
        const layer = CONFIG.layers.frame;
        maskCtx.clearRect(0, 0, CONFIG.canvas.width, CONFIG.canvas.bitmapHeight);
        maskCtx.save();
        maskCtx.translate(CONFIG.frame.x, CONFIG.frame.y);
        maskCtx.rotate((CONFIG.frame.rotation * Math.PI) / 180);
        maskCtx.drawImage(state.image, state.x, state.y, state.imageWidth * scale, state.imageHeight * scale);
        maskCtx.restore();
        maskCtx.save();
        maskCtx.globalCompositeOperation = "destination-in";
        maskCtx.drawImage(assets.frameOpeningMask, layer.x, layer.y, layer.width, layer.height);
        maskCtx.restore();
        ctx.drawImage(maskCanvas, 0, 0);
        return;
      }
      ctx.save();
      clipPhotoInput();
      ctx.translate(CONFIG.frame.x, CONFIG.frame.y);
      ctx.rotate((CONFIG.frame.rotation * Math.PI) / 180);
      ctx.drawImage(state.image, state.x, state.y, state.imageWidth * scale, state.imageHeight * scale);
      ctx.restore();
    } else if (assets.frameOpeningMask.complete && assets.frameOpeningMask.naturalWidth) {
      drawOpeningPlaceholder();
      return;
    } else {
      ctx.save();
      clipPhotoInput();
      ctx.fillStyle = "#deddde";
      ctx.fillRect(0, 0, CONFIG.canvas.width, CONFIG.canvas.bitmapHeight);
      ctx.restore();
    }
  }

  function drawOpeningPlaceholder() {
    const layer = CONFIG.layers.frame;
    maskCtx.clearRect(0, 0, CONFIG.canvas.width, CONFIG.canvas.bitmapHeight);
    maskCtx.fillStyle = "#deddde";
    maskCtx.fillRect(0, 0, CONFIG.canvas.width, CONFIG.canvas.bitmapHeight);
    maskCtx.save();
    maskCtx.globalCompositeOperation = "destination-in";
    maskCtx.drawImage(assets.frameOpeningMask, layer.x, layer.y, layer.width, layer.height);
    maskCtx.restore();
    ctx.drawImage(maskCanvas, 0, 0);
  }

  function drawTemplateLayers() {
    const frameLayer = CONFIG.layers.frame;
    const formalLayer = CONFIG.layers.formal;
    if (assets.frame.complete && assets.frame.naturalWidth) {
      ctx.drawImage(assets.frame, frameLayer.x, frameLayer.y, frameLayer.width, frameLayer.height);
    }
    if (assets.formal.complete && assets.formal.naturalWidth) {
      ctx.drawImage(assets.formal, formalLayer.x, formalLayer.y, formalLayer.width, formalLayer.height);
    }
  }

  function drawGuide() {
    ctx.save();
    clipPhotoInput();
    ctx.translate(CONFIG.frame.x, CONFIG.frame.y);
    ctx.rotate((CONFIG.frame.rotation * Math.PI) / 180);
    ctx.strokeStyle = "rgba(18, 99, 255, 0.82)";
    ctx.lineWidth = 1;
    ctx.beginPath();
    ctx.moveTo(CONFIG.frame.width / 2, 0);
    ctx.lineTo(CONFIG.frame.width / 2, CONFIG.frame.height);
    ctx.moveTo(0, CONFIG.frame.height / 2);
    ctx.lineTo(CONFIG.frame.width, CONFIG.frame.height / 2);
    ctx.stroke();
    ctx.restore();
  }

  function clipPhotoInput() {
    ctx.beginPath();
    CONFIG.clip.forEach((point, index) => {
      if (index === 0) ctx.moveTo(point.x, point.y);
      else ctx.lineTo(point.x, point.y);
    });
    ctx.closePath();
    ctx.clip();
  }

  function toCanvasPoint(point) {
    const layer = CONFIG.layers.photoInput;
    return {
      x: layer.x + point.x * (layer.width / layer.sourceWidth),
      y: layer.y + point.y * (layer.height / layer.sourceHeight)
    };
  }

  function buildFramePlane(corners) {
    const [topLeft, topRight, bottomRight, bottomLeft] = corners;
    const width = distance(topLeft, topRight);
    const height = (distance(topLeft, bottomLeft) + distance(topRight, bottomRight)) / 2;
    const rotation = Math.atan2(topRight.y - topLeft.y, topRight.x - topLeft.x) * (180 / Math.PI);
    return { x: topLeft.x, y: topLeft.y, width, height, rotation, corners: [topLeft, topRight, bottomRight, bottomLeft] };
  }

  function buildOpeningPlane() {
    const layer = CONFIG.layers.frame;
    const bounds = CONFIG.frameOpeningBounds;
    return {
      x: layer.x + bounds.x * (layer.width / bounds.sourceWidth),
      y: layer.y + bounds.y * (layer.height / bounds.sourceHeight),
      width: bounds.width * (layer.width / bounds.sourceWidth),
      height: bounds.height * (layer.height / bounds.sourceHeight)
    };
  }

  function distance(a, b) {
    return Math.hypot(b.x - a.x, b.y - a.y);
  }

  function loadAsset(src) {
    const image = new Image();
    image.onload = render;
    image.src = src;
    return image;
  }

  function updateOffsets() {
    if (!state.image) {
      state.offsets = { top: 0, bottom: 0, left: 0, right: 0 };
    } else {
      const scale = getScale();
      const renderedWidth = state.imageWidth * scale;
      const renderedHeight = state.imageHeight * scale;
      const target = getOpeningTarget();
      state.offsets = {
        top: Math.max(0, (state.y - target.y) / scale),
        bottom: Math.max(0, (target.y + target.height - (state.y + renderedHeight)) / scale),
        left: Math.max(0, (state.x - target.x) / scale),
        right: Math.max(0, (target.x + target.width - (state.x + renderedWidth)) / scale)
      };
    }
    els.topPx.textContent = `${formatPx(state.offsets.top)} px`;
    els.bottomPx.textContent = `${formatPx(state.offsets.bottom)} px`;
    els.leftPx.textContent = `${formatPx(state.offsets.left)} px`;
    els.rightPx.textContent = `${formatPx(state.offsets.right)} px`;
    renderOutputSize();
    renderUnitRows();
  }

  function getOpeningTarget() {
    return {
      x: CONFIG.opening.x - CONFIG.frame.x,
      y: CONFIG.opening.y - CONFIG.frame.y,
      width: CONFIG.opening.width,
      height: CONFIG.opening.height
    };
  }

  function renderOutputSize() {
    const padding = getRoundedPadding();
    const addedWidth = padding.left + padding.right;
    const addedHeight = padding.top + padding.bottom;
    const exportWidth = state.image ? state.imageWidth + addedWidth : 0;
    const exportHeight = state.image ? state.imageHeight + addedHeight : 0;
    els.addedSize.textContent = `${addedWidth} x ${addedHeight} px`;
    els.exportSize.textContent = `${exportWidth} x ${exportHeight} px`;
  }

  function renderUnitRows() {
    const rows = [["px", 1, 1], ["in", 1 / CONFIG.dpi, 3], ["cm", 2.54 / CONFIG.dpi, 3], ["mm", 25.4 / CONFIG.dpi, 2], ["m", 0.0254 / CONFIG.dpi, 5]];
    els.unitRows.innerHTML = rows.map(([unit, factor, decimals]) => `<tr><td>${unit}</td><td>${formatUnit(state.offsets.top * factor, decimals)}</td><td>${formatUnit(state.offsets.bottom * factor, decimals)}</td><td>${formatUnit(state.offsets.left * factor, decimals)}</td><td>${formatUnit(state.offsets.right * factor, decimals)}</td></tr>`).join("");
  }

  function startDrag(event) {
    if (!state.image) return;
    event.preventDefault();
    if (state.pickingCenter) {
      pickSubjectCenter(event);
      return;
    }
    els.stage.setPointerCapture(event.pointerId);
    state.dragging = true;
    state.dragStart = { pointer: getFramePoint(event), x: state.x, y: state.y };
  }

  function moveDrag(event) {
    if (!state.dragging || !state.dragStart) return;
    const point = getFramePoint(event);
    state.x = state.dragStart.x + point.x - state.dragStart.pointer.x;
    state.y = state.dragStart.y + point.y - state.dragStart.pointer.y;
    render();
  }

  function stopDrag() {
    state.dragging = false;
    state.dragStart = null;
  }

  function togglePickCenter() {
    if (!state.image) return;
    setPickingCenter(!state.pickingCenter);
  }

  function setPickingCenter(enabled) {
    state.pickingCenter = Boolean(enabled);
    els.stage.classList.toggle("is-picking", state.pickingCenter);
    els.pickCenterButton.classList.toggle("is-active", state.pickingCenter);
    els.pickCenterButton.textContent = state.pickingCenter ? "Click subject center" : "Pick subject center";
  }

  function pickSubjectCenter(event) {
    const point = getFramePoint(event);
    state.x += CONFIG.frame.width / 2 - point.x;
    state.y += CONFIG.frame.height / 2 - point.y;
    setPickingCenter(false);
    render();
  }

  function getCanvasPoint(event) {
    const rect = els.stage.getBoundingClientRect();
    return { x: (event.clientX - rect.left) * (CONFIG.canvas.width / rect.width), y: (event.clientY - rect.top) * (CONFIG.canvas.height / rect.height) };
  }

  function getFramePoint(event) {
    const point = getCanvasPoint(event);
    const rotation = (-CONFIG.frame.rotation * Math.PI) / 180;
    const dx = point.x - CONFIG.frame.x;
    const dy = point.y - CONFIG.frame.y;
    return { x: dx * Math.cos(rotation) - dy * Math.sin(rotation), y: dx * Math.sin(rotation) + dy * Math.cos(rotation) };
  }

  async function copyOffsets() {
    const padding = getRoundedPadding();
    const addedWidth = padding.left + padding.right;
    const addedHeight = padding.top + padding.bottom;
    const exportWidth = state.image ? state.imageWidth + addedWidth : 0;
    const exportHeight = state.image ? state.imageHeight + addedHeight : 0;
    const text = [
      `top space: ${padding.top} px`,
      `bottom space: ${padding.bottom} px`,
      `left space: ${padding.left} px`,
      `right space: ${padding.right} px`,
      `added space: ${addedWidth} x ${addedHeight} px`,
      `export size: ${exportWidth} x ${exportHeight} px`
    ].join("\n");
    try {
      await navigator.clipboard.writeText(text);
      els.exportStatus.textContent = "Offsets copied.";
    } catch {
      els.exportStatus.textContent = text;
    }
  }

  async function exportTransparentPng() {
    if (!state.image) return;
    const padding = getRoundedPadding();
    const width = Math.max(1, state.imageWidth + padding.left + padding.right);
    const height = Math.max(1, state.imageHeight + padding.top + padding.bottom);
    const canvas = document.createElement("canvas");
    canvas.width = width;
    canvas.height = height;
    const exportCtx = canvas.getContext("2d", { alpha: true });
    exportCtx.clearRect(0, 0, width, height);
    exportCtx.drawImage(state.image, padding.left, padding.top, state.imageWidth, state.imageHeight);
    const blob = await canvasToPngWithDpi(canvas, CONFIG.pngPixelsPerMeter);
    const filename = `${stripExtension(state.filename) || "photo"}.png`;
    downloadBlob(blob, filename);
    els.exportStatus.textContent = `Exported ${filename}`;
  }

  function getRoundedPadding() {
    return {
      top: Math.ceil(state.offsets.top),
      bottom: Math.ceil(state.offsets.bottom),
      left: Math.ceil(state.offsets.left),
      right: Math.ceil(state.offsets.right)
    };
  }

  function canvasToPngWithDpi(canvas, pixelsPerMeter) {
    return new Promise((resolve) => {
      canvas.toBlob(async (blob) => {
        const bytes = new Uint8Array(await blob.arrayBuffer());
        resolve(new Blob([injectPhysChunk(bytes, pixelsPerMeter)], { type: "image/png" }));
      }, "image/png");
    });
  }

  function injectPhysChunk(pngBytes, pixelsPerMeter) {
    const signatureLength = 8;
    let offset = signatureLength;
    while (offset < pngBytes.length) {
      const length = readUint32(pngBytes, offset);
      const type = readAscii(pngBytes, offset + 4, 4);
      if (type === "pHYs") return concatBytes(pngBytes.slice(0, offset), makePhysChunk(pixelsPerMeter), pngBytes.slice(offset + 12 + length));
      offset += 12 + length;
      if (type === "IHDR") break;
    }
    const ihdrLength = readUint32(pngBytes, signatureLength);
    const insertAt = signatureLength + 12 + ihdrLength;
    return concatBytes(pngBytes.slice(0, insertAt), makePhysChunk(pixelsPerMeter), pngBytes.slice(insertAt));
  }

  function makePhysChunk(pixelsPerMeter) {
    const data = new Uint8Array(9);
    writeUint32(data, 0, pixelsPerMeter);
    writeUint32(data, 4, pixelsPerMeter);
    data[8] = 1;
    return makeChunk("pHYs", data);
  }

  function makeChunk(type, data) {
    const typeBytes = asciiBytes(type);
    const chunk = new Uint8Array(12 + data.length);
    writeUint32(chunk, 0, data.length);
    chunk.set(typeBytes, 4);
    chunk.set(data, 8);
    writeUint32(chunk, 8 + data.length, crc32(concatBytes(typeBytes, data)));
    return chunk;
  }

  function crc32(bytes) {
    let crc = 0xffffffff;
    for (let i = 0; i < bytes.length; i += 1) {
      crc ^= bytes[i];
      for (let bit = 0; bit < 8; bit += 1) crc = (crc >>> 1) ^ (0xedb88320 & -(crc & 1));
    }
    return (crc ^ 0xffffffff) >>> 0;
  }

  function downloadBlob(blob, filename) {
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.download = filename;
    document.body.appendChild(link);
    link.click();
    link.remove();
    setTimeout(() => URL.revokeObjectURL(url), 1000);
  }

  function stripExtension(filename) { return String(filename || "").replace(/\.[^.\\/]+$/, ""); }
  function formatPx(value) { return (Math.round(value * 10) / 10).toFixed(1); }
  function formatUnit(value, decimals) { return Number(value).toFixed(decimals); }
  function readUint32(bytes, offset) { return ((bytes[offset] << 24) | (bytes[offset + 1] << 16) | (bytes[offset + 2] << 8) | bytes[offset + 3]) >>> 0; }
  function writeUint32(bytes, offset, value) { bytes[offset] = (value >>> 24) & 0xff; bytes[offset + 1] = (value >>> 16) & 0xff; bytes[offset + 2] = (value >>> 8) & 0xff; bytes[offset + 3] = value & 0xff; }
  function readAscii(bytes, offset, length) { return Array.from(bytes.slice(offset, offset + length), (value) => String.fromCharCode(value)).join(""); }
  function asciiBytes(value) { return new Uint8Array(Array.from(value, (character) => character.charCodeAt(0))); }
  function concatBytes(...parts) { const total = parts.reduce((sum, part) => sum + part.length, 0); const output = new Uint8Array(total); let offset = 0; parts.forEach((part) => { output.set(part, offset); offset += part.length; }); return output; }
})();
