/* =========================================================
   TERASYAQUB PHOTOBOOTH
   script.js
   ========================================================= */

(() => {
  "use strict";

  /* =======================================================
     CONFIG
     ======================================================= */

  const CONFIG = window.TERASYAQUB_CONFIG || {};

  const SUPABASE_URL = CONFIG.SUPABASE_URL || "";
  const SUPABASE_ANON_KEY = CONFIG.SUPABASE_ANON_KEY || "";
  const STORAGE_BUCKET = CONFIG.STORAGE_BUCKET || "photobooth";
  const PRINT_MODE = CONFIG.PRINT_MODE || "browser";
  const PRINT_BRIDGE_URL =
    CONFIG.PRINT_BRIDGE_URL || "http://127.0.0.1:8787";
  const PRINTER_NAME = CONFIG.PRINTER_NAME || "";
  const APP_NAME = CONFIG.APP_NAME || "TERASYAQUB PHOTOBOOTH";
  const BRAND = CONFIG.BRAND || "PHOTOBOOTH TERASYAQUB";

  let supabaseClient = null;

  if (
    window.supabase &&
    SUPABASE_URL &&
    SUPABASE_ANON_KEY &&
    !SUPABASE_URL.includes("MASUKKAN_") &&
    !SUPABASE_ANON_KEY.includes("MASUKKAN_")
  ) {
    try {
      supabaseClient = window.supabase.createClient(
        SUPABASE_URL,
        SUPABASE_ANON_KEY
      );
    } catch (error) {
      console.error("Supabase initialization error:", error);
    }
  }

  /* =======================================================
     STATE
     ======================================================= */

  const state = {
    stream: null,

    photoCount: 4,
    countdown: 3,
    cameraFacing: "user",

    photos: [],
    selectedPhotoIndex: null,

    templateFile: null,
    templateImage: null,

    finalBlob: null,
    finalDataUrl: "",
    finalObjectUrl: "",

    gifBlob: null,
    gifObjectUrl: "",

    videoBlob: null,
    videoObjectUrl: "",

    videoRecorder: null,
    videoChunks: [],

    sessionId: null,
    resultUrl: "",

    isCapturing: false,
    isCameraRunning: false,

    print: {
      paper: "4r",
      orientation: "portrait",
      copies: 1,
      margin: 0
    }
  };

  /* =======================================================
     DOM HELPER
     ======================================================= */

  const $ = (id) => document.getElementById(id);

  const el = {
    setupCard: $("setupCard"),

    photoCount: $("photoCount"),
    countdown: $("countdown"),
    cameraFacing: $("cameraFacing"),
    templateFile: $("templateFile"),

    templatePreview: $("templatePreview"),
    templateEmpty: $("templateEmpty"),

    startCameraBtn: $("startCameraBtn"),

    cameraCard: $("cameraCard"),
    cameraVideo: $("cameraVideo"),
    cameraCanvas: $("cameraCanvas"),

    countdownOverlay: $("countdownOverlay"),
    countdownNumber: $("countdownNumber"),

    cameraFrame: $("cameraFrame"),

    captureBtn: $("captureBtn"),
    stopCameraBtn: $("stopCameraBtn"),

    photoProgress: $("photoProgress"),
    currentPhotoNumber: $("currentPhotoNumber"),

    reviewCard: $("reviewCard"),
    reviewGrid: $("reviewGrid"),
    retakeAllBtn: $("retakeAllBtn"),
    createFinalBtn: $("createFinalBtn"),

    finalCard: $("finalCard"),
    finalImage: $("finalImage"),

    downloadJpgBtn: $("downloadJpgBtn"),

    createGifBtn: $("createGifBtn"),
    createVideoBtn: $("createVideoBtn"),

    gifResultBox: $("gifResultBox"),
    gifPreview: $("gifPreview"),
    downloadGifBtn: $("downloadGifBtn"),

    videoResultBox: $("videoResultBox"),
    videoPreview: $("videoPreview"),
    downloadVideoBtn: $("downloadVideoBtn"),

    printCard: $("printCard"),

    paperSize: $("paperSize"),
    printOrientation: $("printOrientation"),
    printCopies: $("printCopies"),
    printMargin: $("printMargin"),
    printMode: $("printMode"),

    printBtn: $("printBtn"),
    printStatus: $("printStatus"),

    onlineCard: $("onlineCard"),
    saveOnlineBtn: $("saveOnlineBtn"),
    uploadStatus: $("uploadStatus"),

    qrBox: $("qrBox"),
    qrcode: $("qrcode"),
    resultUrl: $("resultUrl"),
    copyResultUrlBtn: $("copyResultUrlBtn"),

    newSessionCard: $("newSessionCard"),
    newSessionBtn: $("newSessionBtn"),

    loadingOverlay: $("loadingOverlay"),
    loadingText: $("loadingText"),

    toast: $("toast"),
    toastMessage: $("toastMessage")
  };

  /* =======================================================
     GENERAL HELPERS
     ======================================================= */

  function showToast(message, duration = 3000) {
    if (!el.toast || !el.toastMessage) return;

    el.toastMessage.textContent = message;
    el.toast.classList.add("show");

    clearTimeout(showToast.timer);

    showToast.timer = setTimeout(() => {
      el.toast.classList.remove("show");
    }, duration);
  }

  function showLoading(message = "Memproses...") {
    if (!el.loadingOverlay) return;

    if (el.loadingText) {
      el.loadingText.textContent = message;
    }

    el.loadingOverlay.classList.add("show");
  }

  function hideLoading() {
    if (!el.loadingOverlay) return;
    el.loadingOverlay.classList.remove("show");
  }

  function setStatus(target, message, type = "") {
    if (!target) return;

    target.textContent = message;

    target.classList.remove(
      "success",
      "error",
      "warning",
      "info"
    );

    if (type) {
      target.classList.add(type);
    }
  }

  function delay(ms) {
    return new Promise((resolve) => setTimeout(resolve, ms));
  }

  function uuid() {
    if (crypto.randomUUID) {
      return crypto.randomUUID();
    }

    return "xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx".replace(
      /[xy]/g,
      (c) => {
        const r = (Math.random() * 16) | 0;
        const v = c === "x"
          ? r
          : (r & 0x3) | 0x8;

        return v.toString(16);
      }
    );
  }

  function isValidImageFile(file) {
    if (!file) return false;

    return [
      "image/png",
      "image/jpeg",
      "image/webp"
    ].includes(file.type);
  }

  function blobToDataURL(blob) {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();

      reader.onload = () => resolve(reader.result);
      reader.onerror = reject;

      reader.readAsDataURL(blob);
    });
  }

  function dataURLToBlob(dataURL) {
    const parts = dataURL.split(",");
    const mime = parts[0]
      .match(/:(.*?);/)[1];

    const binary = atob(parts[1]);
    const array = new Uint8Array(binary.length);

    for (let i = 0; i < binary.length; i++) {
      array[i] = binary.charCodeAt(i);
    }

    return new Blob([array], { type: mime });
  }

  function downloadBlob(blob, filename) {
    if (!blob) return;

    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");

    a.href = url;
    a.download = filename;

    document.body.appendChild(a);
    a.click();
    a.remove();

    setTimeout(() => {
      URL.revokeObjectURL(url);
    }, 1000);
  }

  function downloadDataUrl(dataURL, filename) {
    if (!dataURL) return;

    const blob = dataURLToBlob(dataURL);
    downloadBlob(blob, filename);
  }

  function getFileExtension(file) {
    if (!file) return "jpg";

    if (file.type === "image/png") return "png";
    if (file.type === "image/webp") return "webp";

    return "jpg";
  }

  /* =======================================================
     UI SECTION HELPERS
     ======================================================= */

  function showCard(card) {
    if (!card) return;

    card.classList.remove("hidden");
  }

  function hideCard(card) {
    if (!card) return;

    card.classList.add("hidden");
  }

  function scrollToElement(element) {
    if (!element) return;

    setTimeout(() => {
      element.scrollIntoView({
        behavior: "smooth",
        block: "start"
      });
    }, 100);
  }

  function updatePhotoProgress() {
    if (el.photoProgress) {
      el.photoProgress.textContent =
        `${state.photos.length} / ${state.photoCount}`;
    }

    if (el.currentPhotoNumber) {
      el.currentPhotoNumber.textContent =
        Math.min(
          state.photos.length + 1,
          state.photoCount
        );
    }
  }

  /* =======================================================
     TEMPLATE
     ======================================================= */

  function handleTemplateChange(event) {
    const file = event.target.files?.[0];

    if (!file) return;

    if (!isValidImageFile(file)) {
      showToast(
        "Template harus berupa PNG, JPG, JPEG, atau WebP."
      );

      event.target.value = "";
      return;
    }

    state.templateFile = file;

    const objectURL = URL.createObjectURL(file);

    if (el.templatePreview) {
      el.templatePreview.src = objectURL;
      el.templatePreview.classList.remove("hidden");
    }

    if (el.templateEmpty) {
      el.templateEmpty.classList.add("hidden");
    }

    const img = new Image();

    img.onload = () => {
      state.templateImage = img;
    };

    img.src = objectURL;

    showToast("Template berhasil dipilih.");
  }

  /* =======================================================
     CAMERA
     ======================================================= */

  async function startCamera() {
    try {
      stopCamera(false);

      const facingMode =
        state.cameraFacing === "environment"
          ? "environment"
          : "user";

      const constraints = {
        audio: false,
        video: {
          facingMode,
          width: {
            ideal: 1920
          },
          height: {
            ideal: 1080
          }
        }
      };

      state.stream =
        await navigator.mediaDevices.getUserMedia(
          constraints
        );

      if (el.cameraVideo) {
        el.cameraVideo.srcObject = state.stream;

        el.cameraVideo.setAttribute(
          "playsinline",
          ""
        );

        el.cameraVideo.muted = true;

        await el.cameraVideo.play();
      }

      state.isCameraRunning = true;

      showCard(el.cameraCard);

      if (el.captureBtn) {
        el.captureBtn.disabled = false;
      }

      showToast("Kamera siap digunakan.");

      scrollToElement(el.cameraCard);

    } catch (error) {
      console.error("Camera error:", error);

      let message =
        "Kamera tidak dapat dibuka.";

      if (error.name === "NotAllowedError") {
        message =
          "Izin kamera ditolak. Silakan izinkan akses kamera.";
      }

      if (error.name === "NotFoundError") {
        message =
          "Kamera tidak ditemukan pada perangkat.";
      }

      if (error.name === "NotReadableError") {
        message =
          "Kamera sedang digunakan aplikasi lain.";
      }

      showToast(message, 5000);
    }
  }

  function stopCamera(showMessage = true) {
    if (state.stream) {
      state.stream
        .getTracks()
        .forEach((track) => track.stop());
    }

    state.stream = null;
    state.isCameraRunning = false;

    if (el.cameraVideo) {
      el.cameraVideo.srcObject = null;
    }

    if (showMessage) {
      showToast("Kamera dihentikan.");
    }
  }

  function getVideoDimensions() {
    const video = el.cameraVideo;

    if (!video) {
      return {
        width: 1280,
        height: 720
      };
    }

    return {
      width: video.videoWidth || 1280,
      height: video.videoHeight || 720
    };
  }

  function captureVideoFrame() {
    const video = el.cameraVideo;
    const canvas = el.cameraCanvas;

    if (!video || !canvas) {
      throw new Error("Kamera belum tersedia.");
    }

    const {
      width,
      height
    } = getVideoDimensions();

    canvas.width = width;
    canvas.height = height;

    const ctx = canvas.getContext("2d");

    ctx.save();

    /*
      Kamera depan biasanya ditampilkan mirror.
      Foto juga dibuat mirror agar hasil sama seperti preview.
    */

    if (state.cameraFacing === "user") {
      ctx.translate(width, 0);
      ctx.scale(-1, 1);
    }

    ctx.drawImage(
      video,
      0,
      0,
      width,
      height
    );

    ctx.restore();

    return canvas.toDataURL(
      "image/jpeg",
      0.95
    );
  }

  /* =======================================================
     COUNTDOWN
     ======================================================= */

  async function runCountdown(seconds) {
    if (!el.countdownOverlay ||
        !el.countdownNumber) {
      await delay(seconds * 1000);
      return;
    }

    el.countdownOverlay.classList.remove(
      "hidden"
    );

    for (let i = seconds; i > 0; i--) {
      el.countdownNumber.textContent = i;

      await delay(1000);
    }

    el.countdownNumber.textContent = "📸";

    await delay(350);

    el.countdownOverlay.classList.add(
      "hidden"
    );
  }

  /* =======================================================
     CAPTURE SESSION
     ======================================================= */

  async function captureOnePhoto() {
    if (!state.isCameraRunning) {
      showToast("Kamera belum aktif.");
      return null;
    }

    await runCountdown(
      state.countdown
    );

    try {
      return captureVideoFrame();
    } catch (error) {
      console.error(error);

      showToast(
        "Gagal mengambil foto."
      );

      return null;
    }
  }

  async function startPhotoSession() {
    if (state.isCapturing) return;

    if (!state.isCameraRunning) {
      await startCamera();
    }

    if (!state.isCameraRunning) return;

    state.isCapturing = true;

    state.photos = [];

    updatePhotoProgress();

    hideCard(el.reviewCard);
    hideCard(el.finalCard);
    hideCard(el.printCard);
    hideCard(el.onlineCard);
    hideCard(el.newSessionCard);

    try {
      for (
        let i = 0;
        i < state.photoCount;
        i++
      ) {
        updatePhotoProgress();

        const photo =
          await captureOnePhoto();

        if (!photo) {
          break;
        }

        state.photos.push(photo);

        updatePhotoProgress();

        renderReviewGrid();

        /*
          Jeda antar foto agar pengguna
          punya waktu bersiap.
        */

        if (
          i < state.photoCount - 1
        ) {
          await delay(600);
        }
      }

      if (
        state.photos.length ===
        state.photoCount
      ) {
        showCard(el.reviewCard);

        scrollToElement(
          el.reviewCard
        );

        showToast(
          "Semua foto berhasil diambil."
        );
      }

    } finally {
      state.isCapturing = false;
    }
  }

  /* =======================================================
     REVIEW PHOTOS
     ======================================================= */

  function renderReviewGrid() {
    if (!el.reviewGrid) return;

    el.reviewGrid.innerHTML = "";

    state.photos.forEach(
      (dataURL, index) => {
        const item =
          document.createElement("div");

        item.className =
          "review-item";

        item.innerHTML = `
          <div class="review-number">
            FOTO ${index + 1}
          </div>

          <img
            src="${dataURL}"
            alt="Foto ${index + 1}"
          >

          <button
            type="button"
            class="btn btn-small review-retake"
            data-index="${index}"
          >
            Retake
          </button>
        `;

        el.reviewGrid.appendChild(item);
      }
    );

    el.reviewGrid
      .querySelectorAll(
        ".review-retake"
      )
      .forEach((button) => {
        button.addEventListener(
          "click",
          () => {
            const index =
              Number(
                button.dataset.index
              );

            retakePhoto(index);
          }
        );
      });
  }

  async function retakePhoto(index) {
    if (
      index < 0 ||
      index >= state.photos.length
    ) {
      return;
    }

    if (!state.isCameraRunning) {
      await startCamera();
    }

    if (!state.isCameraRunning) {
      return;
    }

    showToast(
      `Bersiap mengambil ulang foto ${index + 1}.`
    );

    const photo =
      await captureOnePhoto();

    if (!photo) return;

    state.photos[index] = photo;

    renderReviewGrid();

    showToast(
      `Foto ${index + 1} berhasil diganti.`
    );
  }

  function retakeAllPhotos() {
    state.photos = [];

    updatePhotoProgress();

    hideCard(el.reviewCard);
    hideCard(el.finalCard);
    hideCard(el.printCard);
    hideCard(el.onlineCard);
    hideCard(el.newSessionCard);

    renderReviewGrid();

    startPhotoSession();
  }

  /* =======================================================
     IMAGE COVER / CROP
     ======================================================= */

  function drawImageCover(
    ctx,
    img,
    x,
    y,
    width,
    height
  ) {
    const imgWidth =
      img.videoWidth ||
      img.naturalWidth ||
      img.width;

    const imgHeight =
      img.videoHeight ||
      img.naturalHeight ||
      img.height;

    if (
      !imgWidth ||
      !imgHeight
    ) {
      return;
    }

    const imageRatio =
      imgWidth / imgHeight;

    const boxRatio =
      width / height;

    let sourceWidth =
      imgWidth;

    let sourceHeight =
      imgHeight;

    let sourceX = 0;
    let sourceY = 0;

    if (imageRatio > boxRatio) {
      sourceWidth =
        imgHeight * boxRatio;

      sourceX =
        (imgWidth - sourceWidth) / 2;

    } else {
      sourceHeight =
        imgWidth / boxRatio;

      sourceY =
        (imgHeight - sourceHeight) / 2;
    }

    ctx.drawImage(
      img,
      sourceX,
      sourceY,
      sourceWidth,
      sourceHeight,
      x,
      y,
      width,
      height
    );
  }

  function loadImage(dataURL) {
    return new Promise(
      (resolve, reject) => {
        const img =
          new Image();

        img.onload = () =>
          resolve(img);

        img.onerror = reject;

        img.src = dataURL;
      }
    );
  }

  /* =======================================================
     FINAL COMPOSITION
     ======================================================= */

  function calculateGrid(
    count,
    width,
    height
  ) {
    /*
      Komposisi 3:4.

      1 = full
      2 = 2 horizontal
      3 = 1 atas + 2 bawah
      4 = 2x2
      5 = 2 atas + 3 bawah
      6 = 2x3
      7 = 3 atas + 4 bawah
      8 = 4x2
    */

    const cells = [];

    if (count === 1) {
      cells.push({
        x: 0,
        y: 0,
        w: width,
        h: height
      });

      return cells;
    }

    if (count === 2) {
      const h = height / 2;

      for (let i = 0; i < 2; i++) {
        cells.push({
          x: 0,
          y: i * h,
          w: width,
          h
        });
      }

      return cells;
    }

    if (count === 3) {
      const topH =
        height * 0.52;

      cells.push({
        x: 0,
        y: 0,
        w: width,
        h: topH
      });

      const bottomH =
        height - topH;

      const w =
        width / 2;

      cells.push({
        x: 0,
        y: topH,
        w,
        h: bottomH
      });

      cells.push({
        x: w,
        y: topH,
        w,
        h: bottomH
      });

      return cells;
    }

    if (count === 4) {
      const w = width / 2;
      const h = height / 2;

      for (let row = 0; row < 2; row++) {
        for (
          let col = 0;
          col < 2;
          col++
        ) {
          cells.push({
            x: col * w,
            y: row * h,
            w,
            h
          });
        }
      }

      return cells;
    }

    if (count === 5) {
      const topH =
        height * 0.5;

      const bottomH =
        height - topH;

      const topW =
        width / 2;

      cells.push({
        x: 0,
        y: 0,
        w: topW,
        h: topH
      });

      cells.push({
        x: topW,
        y: 0,
        w: topW,
        h: topH
      });

      const bottomW =
        width / 3;

      for (let i = 0; i < 3; i++) {
        cells.push({
          x: i * bottomW,
          y: topH,
          w: bottomW,
          h: bottomH
        });
      }

      return cells;
    }

    if (count === 6) {
      const w = width / 2;
      const h = height / 3;

      for (let row = 0; row < 3; row++) {
        for (
          let col = 0;
          col < 2;
          col++
        ) {
          cells.push({
            x: col * w,
            y: row * h,
            w,
            h
          });
        }
      }

      return cells;
    }

    if (count === 7) {
      const topH =
        height * 0.5;

      const bottomH =
        height - topH;

      const topW =
        width / 3;

      for (let i = 0; i < 3; i++) {
        cells.push({
          x: i * topW,
          y: 0,
          w: topW,
          h: topH
        });
      }

      const bottomW =
        width / 4;

      for (let i = 0; i < 4; i++) {
        cells.push({
          x: i * bottomW,
          y: topH,
          w: bottomW,
          h: bottomH
        });
      }

      return cells;
    }

    /*
      8 foto
    */

    const w = width / 2;
    const h = height / 4;

    for (let row = 0; row < 4; row++) {
      for (
        let col = 0;
        col < 2;
        col++
      ) {
        cells.push({
          x: col * w,
          y: row * h,
          w,
          h
        });
      }
    }

    return cells;
  }

  async function createFinalComposition() {
    if (
      state.photos.length === 0
    ) {
      showToast(
        "Belum ada foto."
      );

      return;
    }

    showLoading(
      "Membuat foto final..."
    );

    try {
      const width = 1800;
      const height = 2400;

      const canvas =
        document.createElement(
          "canvas"
        );

      canvas.width = width;
      canvas.height = height;

      const ctx =
        canvas.getContext("2d");

      /*
        Background putih.
      */

      ctx.fillStyle = "#ffffff";
      ctx.fillRect(
        0,
        0,
        width,
        height
      );

      const images = [];

      for (
        const photo of state.photos
      ) {
        images.push(
          await loadImage(photo)
        );
      }

      const cells =
        calculateGrid(
          images.length,
          width,
          height
        );

      /*
        Margin kecil antar foto.
      */

      const gap = 8;

      images.forEach(
        (img, index) => {
          const cell =
            cells[index];

          if (!cell) return;

          drawImageCover(
            ctx,
            img,
            cell.x + gap / 2,
            cell.y + gap / 2,
            cell.w - gap,
            cell.h - gap
          );
        }
      );

      /*
        Overlay template.
        Template transparan PNG sangat cocok.
      */

      if (state.templateImage) {
        ctx.drawImage(
          state.templateImage,
          0,
          0,
          width,
          height
        );
      }

      /*
        Tambahkan branding jika template
        tidak dipilih.
      */

      if (!state.templateImage) {
        ctx.save();

        ctx.fillStyle =
          "rgba(255,255,255,0.92)";

        ctx.fillRect(
          0,
          height - 150,
          width,
          150
        );

        ctx.fillStyle =
          "#111111";

        ctx.font =
          "bold 52px Arial";

        ctx.textAlign =
          "center";

        ctx.textBaseline =
          "middle";

        ctx.fillText(
          BRAND,
          width / 2,
          height - 75
        );

        ctx.restore();
      }

      state.finalDataUrl =
        canvas.toDataURL(
          "image/jpeg",
          0.95
        );

      state.finalBlob =
        dataURLToBlob(
          state.finalDataUrl
        );

      if (state.finalObjectUrl) {
        URL.revokeObjectURL(
          state.finalObjectUrl
        );
      }

      state.finalObjectUrl =
        URL.createObjectURL(
          state.finalBlob
        );

      if (el.finalImage) {
        el.finalImage.src =
          state.finalObjectUrl;
      }

      showCard(el.finalCard);
      showCard(el.printCard);
      showCard(el.onlineCard);
      showCard(el.newSessionCard);

      hideCard(el.reviewCard);

      scrollToElement(
        el.finalCard
      );

      showToast(
        "Foto final berhasil dibuat."
      );

    } catch (error) {
      console.error(
        "Final composition error:",
        error
      );

      showToast(
        "Gagal membuat foto final."
      );

    } finally {
      hideLoading();
    }
  }

  /* =======================================================
     DOWNLOAD JPG
     ======================================================= */

  function downloadFinalJPG() {
    if (!state.finalBlob) {
      showToast(
        "Foto final belum tersedia."
      );

      return;
    }

    downloadBlob(
      state.finalBlob,
      `TERASYAQUB-${Date.now()}.jpg`
    );
  }

  /* =======================================================
     GIF
     ======================================================= */

  async function createGIF() {
    if (
      !state.photos.length
    ) {
      showToast(
        "Belum ada foto."
      );

      return;
    }

    if (!window.GIF) {
      showToast(
        "Library GIF belum berhasil dimuat."
      );

      return;
    }

    showLoading(
      "Membuat GIF..."
    );

    try {
      const gif =
        new GIF({
          workers: 2,
          quality: 10,
          width: 900,
          height: 1200,

          workerScript:
            "https://cdn.jsdelivr.net/npm/gif.js@0.2.0/dist/gif.worker.js"
        });

      for (
        const photo of state.photos
      ) {
        const img =
          await loadImage(photo);

        const canvas =
          document.createElement(
            "canvas"
          );

        canvas.width = 900;
        canvas.height = 1200;

        const ctx =
          canvas.getContext("2d");

        ctx.fillStyle = "#ffffff";

        ctx.fillRect(
          0,
          0,
          900,
          1200
        );

        drawImageCover(
          ctx,
          img,
          0,
          0,
          900,
          1200
        );

        /*
          Template ikut dimasukkan
          ke GIF jika tersedia.
        */

        if (state.templateImage) {
          ctx.drawImage(
            state.templateImage,
            0,
            0,
            900,
            1200
          );
        }

        gif.addFrame(
          canvas,
          {
            delay: 700,
            copy: true
          }
        );
      }

      gif.on(
        "finished",
        (blob) => {
          state.gifBlob = blob;

          if (state.gifObjectUrl) {
            URL.revokeObjectURL(
              state.gifObjectUrl
            );
          }

          state.gifObjectUrl =
            URL.createObjectURL(
              blob
            );

          if (el.gifPreview) {
            el.gifPreview.src =
              state.gifObjectUrl;
          }

          showCard(
            el.gifResultBox
          );

          hideLoading();

          showToast(
            "GIF berhasil dibuat."
          );
        }
      );

      gif.on(
        "abort",
        () => {
          hideLoading();

          showToast(
            "Pembuatan GIF dibatalkan."
          );
        }
      );

      gif.render();

    } catch (error) {
      console.error(
        "GIF error:",
        error
      );

      hideLoading();

      showToast(
        "Gagal membuat GIF."
      );
    }
  }

  function downloadGIF() {
    if (!state.gifBlob) {
      showToast(
        "GIF belum dibuat."
      );

      return;
    }

    downloadBlob(
      state.gifBlob,
      `TERASYAQUB-${Date.now()}.gif`
    );
  }

  /* =======================================================
     VIDEO
     ======================================================= */

  async function createVideo() {
    if (
      !state.photos.length
    ) {
      showToast(
        "Belum ada foto."
      );

      return;
    }

    if (
      !window.MediaRecorder
    ) {
      showToast(
        "Browser ini tidak mendukung pembuatan video."
      );

      return;
    }

    showLoading(
      "Membuat video..."
    );

    try {
      const canvas =
        document.createElement(
          "canvas"
        );

      canvas.width = 900;
      canvas.height = 1200;

      const ctx =
        canvas.getContext("2d");

      const stream =
        canvas.captureStream(30);

      let mimeType =
        "video/webm;codecs=vp9";

      if (
        !MediaRecorder.isTypeSupported(
          mimeType
        )
      ) {
        mimeType =
          "video/webm;codecs=vp8";
      }

      if (
        !MediaRecorder.isTypeSupported(
          mimeType
        )
      ) {
        mimeType =
          "video/webm";
      }

      const recorder =
        new MediaRecorder(
          stream,
          {
            mimeType
          }
        );

      const chunks = [];

      recorder.ondataavailable =
        (event) => {
          if (
            event.data &&
            event.data.size
          ) {
            chunks.push(
              event.data
            );
          }
        };

      const stopped =
        new Promise(
          (resolve) => {
            recorder.onstop =
              resolve;
          }
        );

      recorder.start();

      for (
        const photo of state.photos
      ) {
        const img =
          await loadImage(photo);

        const start =
          performance.now();

        const duration =
          900;

        while (
          performance.now() -
            start <
          duration
        ) {
          ctx.fillStyle =
            "#ffffff";

          ctx.fillRect(
            0,
            0,
            900,
            1200
          );

          drawImageCover(
            ctx,
            img,
            0,
            0,
            900,
            1200
          );

          if (
            state.templateImage
          ) {
            ctx.drawImage(
              state.templateImage,
              0,
              0,
              900,
              1200
            );
          }

          await new Promise(
            (resolve) =>
              requestAnimationFrame(
                resolve
              )
          );
        }
      }

      recorder.stop();

      await stopped;

      state.videoBlob =
        new Blob(
          chunks,
          {
            type: mimeType
          }
        );

      if (state.videoObjectUrl) {
        URL.revokeObjectURL(
          state.videoObjectUrl
        );
      }

      state.videoObjectUrl =
        URL.createObjectURL(
          state.videoBlob
        );

      if (el.videoPreview) {
        el.videoPreview.src =
          state.videoObjectUrl;

        el.videoPreview.controls =
          true;
      }

      showCard(
        el.videoResultBox
      );

      hideLoading();

      showToast(
        "Video berhasil dibuat."
      );

    } catch (error) {
      console.error(
        "Video error:",
        error
      );

      hideLoading();

      showToast(
        "Gagal membuat video."
      );
    }
  }

  function downloadVideo() {
    if (!state.videoBlob) {
      showToast(
        "Video belum dibuat."
      );

      return;
    }

    downloadBlob(
      state.videoBlob,
      `TERASYAQUB-${Date.now()}.webm`
    );
  }

  /* =======================================================
     PRINT
     ======================================================= */

  const PAPER_SIZES = {
    "4r": {
      name: "4R",
      width: 4,
      height: 6,
      unit: "in"
    },

    strip: {
      name: "Photo Strip",
      width: 2,
      height: 6,
      unit: "in"
    },

    square: {
      name: "Square",
      width: 6,
      height: 6,
      unit: "in"
    },

    polaroid: {
      name: "Polaroid",
      width: 4,
      height: 5,
      unit: "in"
    },

    a5: {
      name: "A5",
      width: 148,
      height: 210,
      unit: "mm"
    },

    a4: {
      name: "A4",
      width: 210,
      height: 297,
      unit: "mm"
    },

    a3: {
      name: "A3",
      width: 297,
      height: 420,
      unit: "mm"
    }
  };

  function getPrintSettings() {
    return {
      paper:
        el.paperSize?.value ||
        "4r",

      orientation:
        el.printOrientation?.value ||
        "portrait",

      copies:
        Number(
          el.printCopies?.value ||
          1
        ),

      marginMm:
        Number(
          el.printMargin?.value ||
          0
        )
    };
  }

  function getPaperDimensions(
    paperKey,
    orientation
  ) {
    const paper =
      PAPER_SIZES[
        paperKey
      ] ||
      PAPER_SIZES["4r"];

    let width =
      paper.width;

    let height =
      paper.height;

    if (
      orientation ===
      "landscape"
    ) {
      [
        width,
        height
      ] = [
        height,
        width
      ];
    }

    return {
      width,
      height,
      unit: paper.unit,
      name: paper.name
    };
  }

  async function printBrowser() {
    if (!state.finalBlob) {
      showToast(
        "Foto final belum tersedia."
      );

      return;
    }

    const settings =
      getPrintSettings();

    const paper =
      getPaperDimensions(
        settings.paper,
        settings.orientation
      );

    const imageURL =
      URL.createObjectURL(
        state.finalBlob
      );

    /*
      Membuat halaman print khusus.
    */

    const printWindow =
      window.open(
        "",
        "_blank"
      );

    if (!printWindow) {
      showToast(
        "Popup diblokir browser. Izinkan popup untuk mencetak."
      );

      URL.revokeObjectURL(
        imageURL
      );

      return;
    }

    const widthCSS =
      paper.unit === "mm"
        ? `${paper.width}mm`
        : `${paper.width}in`;

    const heightCSS =
      paper.unit === "mm"
        ? `${paper.height}mm`
        : `${paper.height}in`;

    const margin =
      settings.marginMm;

    const copiesHTML =
      Array.from(
        {
          length:
            settings.copies
        }
      )
        .map(
          () => `
            <div class="print-page">
              <img src="${imageURL}">
            </div>
          `
        )
        .join("");

    printWindow.document.open();

    printWindow.document.write(`
      <!DOCTYPE html>
      <html>
      <head>
        <meta charset="UTF-8">

        <title>
          ${APP_NAME}
        </title>

        <style>

          @page {
            size:
              ${widthCSS}
              ${heightCSS};

            margin:
              ${margin}mm;
          }

          * {
            box-sizing: border-box;
          }

          html,
          body {
            margin: 0;
            padding: 0;
            background: white;
          }

          body {
            font-family: Arial, sans-serif;
          }

          .print-page {
            width:
              ${widthCSS};

            height:
              ${heightCSS};

            display: flex;
            align-items: center;
            justify-content: center;

            page-break-after: always;

            overflow: hidden;
          }

          .print-page:last-child {
            page-break-after: auto;
          }

          .print-page img {
            width: 100%;
            height: 100%;

            object-fit: contain;

            display: block;
          }

        </style>
      </head>

      <body>
        ${copiesHTML}

        <script>

          window.addEventListener(
            "load",
            function() {

              setTimeout(
                function() {
                  window.print();

                  setTimeout(
                    function() {
                      window.close();
                    },
                    1000
                  );
                },
                500
              );

            }
          );

        <\/script>

      </body>
      </html>
    `);

    printWindow.document.close();

    setStatus(
      el.printStatus,
      `Dialog print dibuka — ${paper.name}, ${settings.orientation}, ${settings.copies} copy.`,
      "success"
    );
  }

  async function printViaBridge() {
    if (!state.finalDataUrl) {
      showToast(
        "Foto final belum tersedia."
      );

      return;
    }

    const settings =
      getPrintSettings();

    const paper =
      getPaperDimensions(
        settings.paper,
        settings.orientation
      );

    setStatus(
      el.printStatus,
      "Menghubungkan ke Print Bridge...",
      "info"
    );

    try {
      const response =
        await fetch(
          `${PRINT_BRIDGE_URL}/print`,
          {
            method: "POST",

            headers: {
              "Content-Type":
                "application/json"
            },

            body: JSON.stringify({
              imageDataUrl:
                state.finalDataUrl,

              paper:
                settings.paper,

              width:
                paper.width,

              height:
                paper.height,

              unit:
                paper.unit,

              orientation:
                settings.orientation,

              copies:
                settings.copies,

              marginMm:
                settings.marginMm,

              printerName:
                PRINTER_NAME
            })
          }
        );

      const data =
        await response.json()
          .catch(() => ({}));

      if (!response.ok) {
        throw new Error(
          data.message ||
          `HTTP ${response.status}`
        );
      }

      setStatus(
        el.printStatus,
        "Berhasil dikirim ke printer.",
        "success"
      );

      showToast(
        "Perintah print berhasil dikirim."
      );

    } catch (error) {
      console.error(
        "Print bridge error:",
        error
      );

      setStatus(
        el.printStatus,
        `Print Bridge gagal: ${error.message}`,
        "error"
      );

      showToast(
        "Tidak dapat terhubung ke Print Bridge. Pastikan server berjalan."
      );
    }
  }

  async function printPhoto() {
    if (!state.finalBlob) {
      showToast(
        "Buat foto final terlebih dahulu."
      );

      return;
    }

    const selectedMode =
      el.printMode?.value ||
      PRINT_MODE;

    if (
      selectedMode ===
      "bridge"
    ) {
      await printViaBridge();
    } else {
      await printBrowser();
    }
  }

  /* =======================================================
     SUPABASE
     ======================================================= */

  function supabaseReady() {
    return Boolean(
      supabaseClient
    );
  }

  function getResultPageURL(
    sessionId
  ) {
    const base =
      new URL(
        "result.html",
        window.location.href
      );

    base.searchParams.set(
      "id",
      sessionId
    );

    return base.href;
  }

  async function uploadFile(
    path,
    blob,
    contentType
  ) {
    if (!supabaseReady()) {
      throw new Error(
        "Supabase belum dikonfigurasi."
      );
    }

    const result =
      await supabaseClient
        .storage
        .from(STORAGE_BUCKET)
        .upload(
          path,
          blob,
          {
            contentType,
            upsert: true
          }
        );

    if (result.error) {
      throw result.error;
    }

    const publicResult =
      supabaseClient
        .storage
        .from(STORAGE_BUCKET)
        .getPublicUrl(
          path
        );

    return publicResult
      .data
      .publicUrl;
  }

  async function saveOnline() {
    if (!state.finalBlob) {
      showToast(
        "Foto final belum tersedia."
      );

      return;
    }

    if (!supabaseReady()) {
      setStatus(
        el.uploadStatus,
        "Supabase belum dikonfigurasi. Isi SUPABASE_URL dan SUPABASE_ANON_KEY di config/config.js.",
        "warning"
      );

      showToast(
        "Supabase belum dikonfigurasi."
      );

      return;
    }

    showLoading(
      "Menyimpan foto ke online storage..."
    );

    setStatus(
      el.uploadStatus,
      "Mengupload foto...",
      "info"
    );

    try {
      const sessionId =
        state.sessionId ||
        uuid();

      state.sessionId =
        sessionId;

      /*
        Upload final JPG.
      */

      const finalPath =
        `sessions/${sessionId}/final.jpg`;

      const finalURL =
        await uploadFile(
          finalPath,
          state.finalBlob,
          "image/jpeg"
        );

      /*
        Upload setiap foto.
      */

      const photoURLs = [];

      for (
        let i = 0;
        i < state.photos.length;
        i++
      ) {
        setStatus(
          el.uploadStatus,
          `Mengupload foto ${i + 1} dari ${state.photos.length}...`,
          "info"
        );

        const photoBlob =
          dataURLToBlob(
            state.photos[i]
          );

        const photoPath =
          `sessions/${sessionId}/photos/photo-${String(
            i + 1
          ).padStart(2, "0")}.jpg`;

        const photoURL =
          await uploadFile(
            photoPath,
            photoBlob,
            "image/jpeg"
          );

        photoURLs.push(
          photoURL
        );
      }

      /*
        Upload GIF jika sudah dibuat.
      */

      let gifURL = null;

      if (state.gifBlob) {
        setStatus(
          el.uploadStatus,
          "Mengupload GIF...",
          "info"
        );

        gifURL =
          await uploadFile(
            `sessions/${sessionId}/result.gif`,
            state.gifBlob,
            "image/gif"
          );
      }

      /*
        Upload video jika sudah dibuat.
      */

      let videoURL = null;

      if (state.videoBlob) {
        setStatus(
          el.uploadStatus,
          "Mengupload video...",
          "info"
        );

        videoURL =
          await uploadFile(
            `sessions/${sessionId}/result.webm`,
            state.videoBlob,
            "video/webm"
          );
      }

      /*
        Simpan metadata session.
      */

      const {
        error
      } =
        await supabaseClient
          .from(
            "photobooth_sessions"
          )
          .upsert({
            id: sessionId,

            photo_count:
              state.photos.length,

            final_photo_url:
              finalURL,

            gif_url:
              gifURL,

            video_url:
              videoURL,

            photo_urls:
              photoURLs
          });

      if (error) {
        throw error;
      }

      /*
        Buat URL hasil.
      */

      state.resultUrl =
        getResultPageURL(
          sessionId
        );

      if (el.resultUrl) {
        el.resultUrl.value =
          state.resultUrl;
      }

      generateQRCode(
        state.resultUrl
      );

      setStatus(
        el.uploadStatus,
        "Berhasil disimpan online.",
        "success"
      );

      hideLoading();

      showCard(el.onlineCard);

      showToast(
        "Foto berhasil disimpan online."
      );

    } catch (error) {
      console.error(
        "Supabase upload error:",
        error
      );

      setStatus(
        el.uploadStatus,
        `Gagal menyimpan online: ${error.message}`,
        "error"
      );

      hideLoading();

      showToast(
        "Gagal menyimpan foto online."
      );
    }
  }

  /* =======================================================
     QR CODE
     ======================================================= */

  function generateQRCode(
    url
  ) {
    if (
      !el.qrcode ||
      !url
    ) {
      return;
    }

    el.qrcode.innerHTML = "";

    if (!window.QRCode) {
      showToast(
        "Library QR Code belum dimuat."
      );

      return;
    }

    try {
      new QRCode(
        el.qrcode,
        {
          text: url,

          width: 220,
          height: 220,

          colorDark:
            "#000000",

          colorLight:
            "#ffffff",

          correctLevel:
            QRCode.CorrectLevel.H
        }
      );

      showCard(
        el.qrBox
      );

    } catch (error) {
      console.error(
        "QR Code error:",
        error
      );
    }
  }

  async function copyResultURL() {
    if (!state.resultUrl) {
      showToast(
        "URL hasil belum tersedia."
      );

      return;
    }

    try {
      await navigator.clipboard.writeText(
        state.resultUrl
      );

      showToast(
        "URL berhasil disalin."
      );

    } catch (error) {
      /*
        Fallback untuk browser lama.
      */

      if (el.resultUrl) {
        el.resultUrl.select();

        document.execCommand(
          "copy"
        );

        showToast(
          "URL berhasil disalin."
        );
      }
    }
  }

  /* =======================================================
     RESET SESSION
     ======================================================= */

  function resetSession() {
    stopCamera(false);

    if (state.finalObjectUrl) {
      URL.revokeObjectURL(
        state.finalObjectUrl
      );
    }

    if (state.gifObjectUrl) {
      URL.revokeObjectURL(
        state.gifObjectUrl
      );
    }

    if (state.videoObjectUrl) {
      URL.revokeObjectURL(
        state.videoObjectUrl
      );
    }

    state.photos = [];

    state.templateFile = null;
    state.templateImage = null;

    state.finalBlob = null;
    state.finalDataUrl = "";
    state.finalObjectUrl = "";

    state.gifBlob = null;
    state.gifObjectUrl = "";

    state.videoBlob = null;
    state.videoObjectUrl = "";

    state.sessionId = null;
    state.resultUrl = "";

    state.isCapturing = false;

    if (el.templateFile) {
      el.templateFile.value = "";
    }

    if (el.templatePreview) {
      el.templatePreview.src = "";
      el.templatePreview.classList.add(
        "hidden"
      );
    }

    if (el.templateEmpty) {
      el.templateEmpty.classList.remove(
        "hidden"
      );
    }

    if (el.finalImage) {
      el.finalImage.src = "";
    }

    if (el.gifPreview) {
      el.gifPreview.src = "";
    }

    if (el.videoPreview) {
      el.videoPreview.src = "";
    }

    if (el.resultUrl) {
      el.resultUrl.value = "";
    }

    if (el.qrcode) {
      el.qrcode.innerHTML = "";
    }

    if (el.reviewGrid) {
      el.reviewGrid.innerHTML = "";
    }

    updatePhotoProgress();

    hideCard(el.cameraCard);
    hideCard(el.reviewCard);
    hideCard(el.finalCard);
    hideCard(el.printCard);
    hideCard(el.onlineCard);
    hideCard(el.newSessionCard);
    hideCard(el.gifResultBox);
    hideCard(el.videoResultBox);
    hideCard(el.qrBox);

    setStatus(
      el.uploadStatus,
      ""
    );

    setStatus(
      el.printStatus,
      ""
    );

    showCard(
      el.setupCard
    );

    window.scrollTo({
      top: 0,
      behavior: "smooth"
    });

    showToast(
      "Sesi baru siap digunakan."
    );
  }

  /* =======================================================
     INITIALIZATION
     ======================================================= */

  function readSettingsFromForm() {
    state.photoCount =
      Math.max(
        1,
        Math.min(
          8,
          Number(
            el.photoCount?.value ||
            4
          )
        )
      );

    state.countdown =
      Math.max(
        1,
        Number(
          el.countdown?.value ||
          3
        )
      );

    state.cameraFacing =
      el.cameraFacing?.value ||
      "user";
  }

  function bindEvents() {
    /*
      Setup
    */

    el.photoCount?.addEventListener(
      "change",
      () => {
        readSettingsFromForm();
      }
    );

    el.countdown?.addEventListener(
      "change",
      () => {
        readSettingsFromForm();
      }
    );

    el.cameraFacing?.addEventListener(
      "change",
      () => {
        readSettingsFromForm();

        /*
          Jika kamera sedang aktif,
          restart kamera dengan kamera baru.
        */

        if (state.isCameraRunning) {
          startCamera();
        }
      }
    );

    el.templateFile?.addEventListener(
      "change",
      handleTemplateChange
    );

    /*
      Camera
    */

    el.startCameraBtn?.addEventListener(
      "click",
      async () => {
        readSettingsFromForm();

        await startCamera();

        if (
          state.isCameraRunning
        ) {
          /*
            Setelah kamera aktif,
            langsung mulai sesi foto.
          */

          await startPhotoSession();
        }
      }
    );

    el.captureBtn?.addEventListener(
      "click",
      async () => {
        await startPhotoSession();
      }
    );

    el.stopCameraBtn?.addEventListener(
      "click",
      () => {
        stopCamera();
      }
    );

    /*
      Review
    */

    el.retakeAllBtn?.addEventListener(
      "click",
      () => {
        retakeAllPhotos();
      }
    );

    el.createFinalBtn?.addEventListener(
      "click",
      async () => {
        await createFinalComposition();
      }
    );

    /*
      Final
    */

    el.downloadJpgBtn?.addEventListener(
      "click",
      downloadFinalJPG
    );

    /*
      GIF
    */

    el.createGifBtn?.addEventListener(
      "click",
      async () => {
        await createGIF();
      }
    );

    el.downloadGifBtn?.addEventListener(
      "click",
      downloadGIF
    );

    /*
      Video
    */

    el.createVideoBtn?.addEventListener(
      "click",
      async () => {
        await createVideo();
      }
    );

    el.downloadVideoBtn?.addEventListener(
      "click",
      downloadVideo
    );

    /*
      Print
    */

    el.printBtn?.addEventListener(
      "click",
      async () => {
        await printPhoto();
      }
    );

    /*
      Online
    */

    el.saveOnlineBtn?.addEventListener(
      "click",
      async () => {
        await saveOnline();
      }
    );

    el.copyResultUrlBtn?.addEventListener(
      "click",
      copyResultURL
    );

    /*
      New session
    */

    el.newSessionBtn?.addEventListener(
      "click",
      () => {
        resetSession();
      }
    );

    /*
      Print mode status
    */

    el.printMode?.addEventListener(
      "change",
      () => {
        const mode =
          el.printMode.value;

        if (
          mode === "bridge"
        ) {
          setStatus(
            el.printStatus,
            "Mode Wi-Fi/LAN Bridge aktif. Pastikan Print Bridge berjalan di komputer printer.",
            "info"
          );
        } else {
          setStatus(
            el.printStatus,
            "Mode Browser Print aktif.",
            "info"
          );
        }
      }
    );

    /*
      Keyboard shortcut
    */

    document.addEventListener(
      "keydown",
      (event) => {
        /*
          Space = capture
        */

        if (
          event.code === "Space" &&
          state.isCameraRunning &&
          !state.isCapturing
        ) {
          const active =
            document.activeElement;

          if (
            active &&
            [
              "INPUT",
              "SELECT",
              "TEXTAREA",
              "BUTTON"
            ].includes(
              active.tagName
            )
          ) {
            return;
          }

          event.preventDefault();

          startPhotoSession();
        }
      }
    );
  }

  function initialize() {
    /*
      Default settings
    */

    readSettingsFromForm();

    /*
      Hide result sections
      until needed.
    */

    hideCard(el.cameraCard);
    hideCard(el.reviewCard);
    hideCard(el.finalCard);
    hideCard(el.printCard);
    hideCard(el.onlineCard);
    hideCard(el.newSessionCard);
    hideCard(el.gifResultBox);
    hideCard(el.videoResultBox);
    hideCard(el.qrBox);

    updatePhotoProgress();

    bindEvents();

    /*
      Inform user if Supabase
      isn't configured.
    */

    if (!supabaseReady()) {
      console.info(
        "Supabase belum dikonfigurasi."
      );

      setStatus(
        el.uploadStatus,
        "Supabase belum dikonfigurasi. Foto tetap dapat dibuat dan didownload.",
        "warning"
      );
    }

    /*
      Print mode default.
    */

    if (
      el.printMode &&
      !el.printMode.value
    ) {
      el.printMode.value =
        PRINT_MODE;
    }

    console.log(
      `${APP_NAME} initialized`
    );
  }

  /* =======================================================
     PAGE LIFECYCLE
     ======================================================= */

  document.addEventListener(
    "DOMContentLoaded",
    initialize
  );

  window.addEventListener(
    "beforeunload",
    () => {
      stopCamera(false);

      if (state.finalObjectUrl) {
        URL.revokeObjectURL(
          state.finalObjectUrl
        );
      }

      if (state.gifObjectUrl) {
        URL.revokeObjectURL(
          state.gifObjectUrl
        );
      }

      if (state.videoObjectUrl) {
        URL.revokeObjectURL(
          state.videoObjectUrl
        );
      }
    }
  );

})();
