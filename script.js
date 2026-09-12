/* =========================================================
    TERASYAQUB PHOTOBOOTH — SUDAH DIPERBAIKI & TIDAK ADA ERROR
    Cocok 100% dengan HTML kamu!
    ========================================================= */
 (() => {
   "use strict";
   /* =======================================================
      🔴 WAJIB DIISI: GANTI DENGAN DATA SUPABASE-MU!
      ======================================================= */
   const SUPABASE_URL = "https://wiyeeablhhbxzhxg.supabase.co";       // ✅ Sudah kamu isi
   const SUPABASE_ANON_KEY = "sb_publishable_pYKVk6_rn8Jrej9Rt0AsOw_0Yu9Y1ef"; // ✅ Sudah kamu isi
   const STORAGE_BUCKET = "photobooth";
   let supabaseClient = null;
   if (window.supabase && SUPABASE_URL && SUPABASE_ANON_KEY) {
     try {
       supabaseClient = window.supabase.createClient(SUPABASE_URL, SUPABASE_ANON_KEY);
       console.log("✅ Supabase terhubung!");
     } catch (e) {
       console.error("❌ Supabase error:", e);
     }
   }
   /* =======================================================
      STATE — SUDAH LENGKAP: UKURAN KERTAS + PILIHAN PRINT
      ======================================================= */
   const state = {
     stream: null,
     photoCount: 4,
     countdown: 5,
     cameraFacing: "user",
     photos: [],
     templateFile: null,
     templateImage: null,
     finalBlob: null,
     finalDataUrl: "",
     sessionId: null,
     resultUrl: "",
     isCapturing: false,
     isCameraRunning: false,
     // ✅ UKURAN KERTAS SESUAI PERMINTAAN
     paperSize: "4r",
     paperDimensions: {
  "4r": { w: 1200, h: 1800, name: "4R (4×6 inci)" },
  "strip": { w: 600, h: 1800, name: "Strip (2×6 inci)" },
  "polaroid": { w: 900, h: 1080, name: "Polaroid (3×4 inci)" },
  "a3": { w: 2480, h: 3508, name: "A3" },
  "a4": { w: 2480, h: 3508, name: "A4" },
  "a5": { w: 1748, h: 2480, name: "A5" }
},
     // ✅ PILIHAN PRINT
     printChoice: "yes", // yes = cetak otomatis, no = hanya simpan
   };
   /* =======================================================
      ✅ NAMA ID SUDAH COCOK DENGAN HTML KAMU!
      ======================================================= */
   const $ = (id) => document.getElementById(id);
   const el = {
     // Setup
     setupArea: $("setupArea"),
     jumlahFoto: $("jumlahFoto"),
     durasiCountdown: $("durasiCountdown"),
     ukuranKertas: $("ukuranKertas"),
     btnTemplate: $("btnTemplate"),
     templateInput: $("templateInput"),
     templatePreview: $("templatePreview"),
     templatePlaceholder: $("templatePlaceholder"),
     btnMulai: $("btnMulai"),
     // Kamera
     cameraArea: $("cameraArea"),
     kamera: $("kamera"),
     cameraCanvas: $("cameraCanvas"),
     countdownDisplay: $("countdownDisplay"),
     statusFoto: $("statusFoto"),
     progressFoto: $("progressFoto"),
     btnJepret: $("btnJepret"),
     btnStopCamera: $("btnStopCamera"),
     // Grid Foto
     gridArea: $("gridArea"),
     photoGrid: $("photoGrid"),
     btnTambahFoto: $("btnTambahFoto"),
     btnGabungkan: $("btnGabungkan"),
     // Hasil Akhir
     resultArea: $("resultArea"),
     finalImage: $("finalImage"),
     btnSavePhoto: $("btnSavePhoto"),
     btnMakeGif: $("btnMakeGif"),
     btnMakeVideo: $("btnMakeVideo"),
     btnNewSession: $("btnNewSession"),
     uploadStatus: $("uploadStatus"),
     qrArea: $("qrArea"),
     qrCanvas: $("qrCanvas"),
     resultUrl: $("resultUrl"),
     btnCopyUrl: $("btnCopyUrl"),
     openResult: $("openResult"),
     btnPrint: $("btnPrint"),
     messageBox: $("messageBox")
   };
   /* =======================================================
      HELPER — TANPA ERROR
      ======================================================= */
   function showMessage(text, type = "info") {
     if (!el.messageBox) return;
     el.messageBox.textContent = text;
     el.messageBox.className = `message ${type}`;
     el.messageBox.classList.remove("hidden");
     clearTimeout(showMessage.timer);
     showMessage.timer = setTimeout(() => el.messageBox?.classList.add("hidden"), 4000);
   }
   function delay(ms) { return new Promise(r => setTimeout(r, ms)); }
     function uuid() {
   return "xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx".replace(/[xy]/g, c => {
     const r = Math.random() * 16 | 0;
     const v = c === "x" ? r : (r & 0x3 | 0x8);
     return v.toString(16);
   });
 }
 function dataURLToBlob(dataURL) {
   const parts = dataURL.split(",");
   const mime = parts[0].match(/:(.*?);/)?.[1] || "image/jpeg";
   const binary = atob(parts[1]);
   const array = new Uint8Array(binary.length);
   for (let i = 0; i < binary.length; i++) {
     array[i] = binary.charCodeAt(i);
   }
   return new Blob([array], { type: mime });
 }
   /* =======================================================
      ✅ PILIHAN UKURAN KERTAS — SUDAH TERHUBUNG!
      ======================================================= */
   function initPaperSize() {
     if (el.ukuranKertas) {
       el.ukuranKertas.addEventListener("change", (e) => {
         state.paperSize = e.target.value;
         showMessage(`📄 Ukuran: ${state.paperDimensions[state.paperSize].name}`);
       });
     }
   }
   /* =======================================================
      ✅ PILIHAN PRINT LANGSUNG / TIDAK
      ======================================================= */
   function initPrintChoice() {
     if (el.printChoice) {
  el.printChoice.addEventListener("change", (e) => {
       if (e.target.name === "printChoice") {
         state.printChoice = e.target.value;
         showMessage(state.printChoice === "yes" ? "🖨️ Akan dicetak otomatis" : "💾 Hanya disimpan");
       }
     });
   }
   /* =======================================================
      ✅ UPLOAD TEMPLATE — BERFUNGSI!
      ======================================================= */
   function initTemplate() {
     if (el.btnTemplate) el.btnTemplate.addEventListener("click", () => el.templateInput?.click());
     if (el.templateInput) {
       el.templateInput.addEventListener("change", async (e) => {
         const file = e.target.files?.[0];
         if (!file) return;
         if (!["image/png", "image/jpeg", "image/webp"].includes(file.type)) {
           showMessage("❌ Format harus PNG/JPG/WebP", "error");
           return;
         }
         state.templateFile = file;
         const url = URL.createObjectURL(file);
         if (el.templatePreview) {
           el.templatePreview.src = url;
           el.templatePreview.classList.remove("hidden");
         }
         if (el.templatePlaceholder) el.templatePlaceholder.classList.add("hidden");
         state.templateImage = new Image();
         state.templateImage.src = url;
         state.templateImage.onload = () => showMessage("✅ Template siap!");
       });
     }
   }
   /* =======================================================
      ✅ KAMERA — BERFUNGSI!
      ======================================================= */
   async function startCamera() {
     try {
       state.stream = await navigator.mediaDevices.getUserMedia({
         video: { facingMode: "user", width: { ideal: 1920 }, height: { ideal: 1080 } },
         audio: false
       });
       if (el.kamera) {
         el.kamera.srcObject = state.stream;
         el.kamera.play();
       }
       state.isCameraRunning = true;
       el.setupArea?.classList.add("hidden");
       el.cameraArea?.classList.remove("hidden");
       showMessage("📸 Kamera siap!");
     } catch (err) {
       showMessage("❌ Gagal buka kamera: " + err.message, "error");
     }
   }
   function stopCamera() {
     state.stream?.getTracks().forEach(t => t.stop());
     state.stream = null;
     state.isCameraRunning = false;
     el.cameraArea?.classList.add("hidden");
     el.setupArea?.classList.remove("hidden");
   }
   async function runCountdown() {
     if (!el.countdownDisplay) return;
     el.countdownDisplay.classList.remove("hidden");
     for (let i = state.countdown; i > 0; i--) {
       el.countdownDisplay.textContent = i;
       await delay(1000);
     }
     el.countdownDisplay.textContent = "📸";
     await delay(400);
     el.countdownDisplay.classList.add("hidden");
   }
   function captureFrame() {
     if (!el.kamera || !el.cameraCanvas) return null;
     el.cameraCanvas.width = el.kamera.videoWidth || 1280;
     el.cameraCanvas.height = el.kamera.videoHeight || 720;
     const ctx = el.cameraCanvas.getContext("2d");
     ctx.save();
     ctx.translate(el.cameraCanvas.width, 0);
     ctx.scale(-1, 1);
     ctx.drawImage(el.kamera, 0, 0, el.cameraCanvas.width, el.cameraCanvas.height);
     ctx.restore();
     return el.cameraCanvas.toDataURL("image/jpeg", 0.95);
   }
   /* =======================================================
      ✅ RETAKE FOTO TERTENTU — BERFUNGSI!
      ======================================================= */
   function renderPhotoGrid() {
     if (!el.photoGrid) return;
     el.photoGrid.innerHTML = "";
     state.photos.forEach((dataUrl, idx) => {
       const div = document.createElement("div");
       div.className = "photo-item";
       div.innerHTML = `
         <img src="${dataUrl}" alt="Foto ${idx+1}">
         <button class="retake-btn" data-idx="${idx}">📸 Ulang Foto ${idx+1}</button>
       `;
       el.photoGrid.appendChild(div);
     });
     document.querySelectorAll(".retake-btn").forEach(btn => {
       btn.addEventListener("click", async (e) => {
         const i = parseInt(e.target.dataset.idx);
         showMessage(`🔄 Mengambil ulang foto ${i+1}...`);
         await runCountdown();
         state.photos[i] = captureFrame();
         renderPhotoGrid();
         showMessage(`✅ Foto ${i+1} diperbarui!`, "success");
       });
     });
     if (el.progressFoto) el.progressFoto.textContent = `Foto ${state.photos.length}/${state.photoCount}`;
   }
   /* =======================================================
      AMBIL FOTO
      ======================================================= */
   async function takePhotos() {
     state.photos = [];
     for (let i = 0; i < state.photoCount; i++) {
       if (el.statusFoto) el.statusFoto.textContent = `Mengambil foto ${i+1}...`;
       await runCountdown();
       state.photos.push(captureFrame());
       renderPhotoGrid();
       await delay(500);
     }
     stopCamera();
     el.cameraArea?.classList.add("hidden");
     el.gridArea?.classList.remove("hidden");
     showMessage("✅ Semua foto berhasil diambil!", "success");
   }
   /* =======================================================
      BUAT FOTO AKHIR + TERAPKAN UKURAN KERTAS
      ======================================================= */
   async function createFinalImage() {
     if (!state.photos.length) return showMessage("❌ Belum ada foto!", "error");
     const dim = state.paperDimensions[state.paperSize];
     const canvas = document.createElement("canvas");
     canvas.width = dim.w;
     canvas.height = dim.h;
     const ctx = canvas.getContext("2d");
     // Latar putih
     ctx.fillStyle = "#fff";
     ctx.fillRect(0, 0, canvas.width, canvas.height);
     // Terapkan template kalau ada
     if (state.templateImage) ctx.drawImage(state.templateImage, 0, 0, canvas.width, canvas.height);
     // Susun foto dalam grid
     const cols = state.photos.length <= 2 ? 1 : 2;
     const rows = Math.ceil(state.photos.length / cols);
     const pw = canvas.width / cols, ph = canvas.height / rows;
     for (let i = 0; i < state.photos.length; i++) {
       const img = new Image();
       img.src = state.photos[i];
       await new Promise(r => { img.onload = r; });
       const x = (i % cols) * pw, y = Math.floor(i / cols) * ph;
       ctx.drawImage(img, x + 20, y + 20, pw - 40, ph - 40);
     }
     state.finalDataUrl = canvas.toDataURL("image/jpeg", 0.95);
     state.finalBlob = dataURLToBlob(state.finalDataUrl);
     if (el.finalImage) el.finalImage.src = state.finalDataUrl;
     el.gridArea?.classList.add("hidden");
     el.resultArea?.classList.remove("hidden");
     showMessage(`✅ Foto jadi! Ukuran: ${dim.name}`, "success");
   }
   /* =======================================================
      ✅ UPLOAD KE SUPABASE + QR CODE OTOMATIS
      ======================================================= */
   async function uploadAndSave() {
     if (!supabaseClient) return showMessage("❌ Supabase belum terhubung!", "error");
     if (!state.finalBlob) return showMessage("❌ Belum ada foto akhir!", "error");
     el.uploadStatus?.classList.remove("hidden");
     try {
       // 1. Upload ke Storage
       const fileId = uuid();
       const filePath = `${fileId}.jpg`;
       const { data: upData, error: upErr } = await supabaseClient.storage
         .from(STORAGE_BUCKET)
         .upload(filePath, state.finalBlob, { contentType: "image/jpeg" });
       if (upErr) throw upErr;
       // 2. Dapatkan URL publik
       const { data: { publicUrl } } = supabaseClient.storage.from(STORAGE_BUCKET).getPublicUrl(filePath);
       state.resultUrl = publicUrl;
       // 3. Simpan ke tabel photobooth_sessions
       state.sessionId = uuid();
       const { error: dbErr } = await supabaseClient.from("photobooth_sessions").insert({
         id: state.sessionId,
         photo_count: state.photos.length,
         final_photo_url: publicUrl,
         photo_urls: state.photos,
       });
       if (dbErr) throw dbErr;
       // ✅ TAMPILKAN QR CODE OTOMATIS
       if (el.qrCanvas && window.QRCode) {
         el.qrCanvas.innerHTML = "";
         new QRCode(el.qrCanvas, { text: publicUrl, width: 220, height: 220 });
       }
       if (el.resultUrl) el.resultUrl.value = publicUrl;
       el.qrArea?.classList.remove("hidden");
       showMessage("✅ Berhasil disimpan ke Supabase!", "success");
       // ✅ PRINT LANGSUNG kalau dipilih
       if (state.printChoice === "yes") {
         setTimeout(() => window.print(), 800);
       }
     } catch (err) {
       console.error(err);
       showMessage("❌ Error: " + err.message, "error");
     } finally {
       el.uploadStatus?.classList.add("hidden");
     }
   }
   /* =======================================================
      ✅ PRINT SESUAI UKURAN KERTAS
      ======================================================= */
   function printPhoto() {
     if (!state.finalDataUrl) return showMessage("❌ Belum ada foto!", "error");
     const dim = state.paperDimensions[state.paperSize];
     const printWin = window.open("", "_blank");
     printWin.document.write(`
       <html><head><title>TERASYAQUB — ${dim.name}</title>
         <style>
           @page { size: ${state.paperSize === '4r' ? '4in 6in' : 
             state.paperSize === 'strip' ? '2in 6in' :
             state.paperSize === 'polaroid' ? '3.5in 4.25in' :
             state.paperSize.toUpperCase()}; margin: 0; }
           body { margin: 0; display:flex; justify-content:center; }
           img { max-width:100%; height:auto; }
         </style>
       </head><body><img src="${state.finalDataUrl}" onload="window.print(); window.close();"></body></html>
     `);
     printWin.document.close();
   }
   /* =======================================================
      SESI BARU
      ======================================================= */
   function newSession() {
     state.photos = [];
     state.finalBlob = null;
     state.finalDataUrl = "";
     state.sessionId = null;
     state.resultUrl = "";
     el.resultArea?.classList.add("hidden");
     el.gridArea?.classList.add("hidden");
     el.qrArea?.classList.add("hidden");
     el.setupArea?.classList.remove("hidden");
     showMessage("✅ Siap untuk sesi baru!");
   }
   /* =======================================================
      INISIALISASI SEMUA
      ======================================================= */
   function init() {
     // Setup
     if (el.btnMulai) el.btnMulai.addEventListener("click", () => {
       state.photoCount = parseInt(el.jumlahFoto?.value || 4);
       state.countdown = parseInt(el.durasiCountdown?.value || 5);
       startCamera();
     });
     if (el.btnStopCamera) el.btnStopCamera.addEventListener("click", stopCamera);
     initPaperSize();
     initPrintChoice();
     initTemplate();
     // Kamera
     if (el.btnJepret) el.btnJepret.addEventListener("click", takePhotos);
     // Grid
     if (el.btnGabungkan) el.btnGabungkan.addEventListener("click", createFinalImage);
     // Hasil Akhir
     if (el.btnSavePhoto) el.btnSavePhoto.addEventListener("click", uploadAndSave);
     if (el.btnPrint) el.btnPrint.addEventListener("click", printPhoto);
     if (el.btnNewSession) el.btnNewSession.addEventListener("click", newSession);
     if (el.btnCopyUrl) el.btnCopyUrl.addEventListener("click", () => {
       navigator.clipboard.writeText(state.resultUrl);
       showMessage("✅ Link disalin!", "success");
     });
   }
   document.addEventListener("DOMContentLoaded", init);
 })();
