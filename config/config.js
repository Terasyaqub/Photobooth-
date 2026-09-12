window.TERASYAQUB_CONFIG = {
   // === SUPABASE — SUDAH DIISI, JANGAN DIUBAH ===
   SUPABASE_URL: "https://wiyeeablhbxzhxg.supabase.co",
   SUPABASE_ANON_KEY: "sb_publishable_pYKvK6_rn8Jrej9RtOasAw_0Yu9Y1ef",
   STORAGE_BUCKET: "photobooth",
   // === PRINTER EPSON L3251 — SUDAH SESUAI, JANGAN DIUBAH ===
   PRINT_MODE: "browser",
   PRINT_BRIDGE_URL: "",
   PRINTER_NAME: "EPSON L3251 Series",
   // === BRAND — SUDAH BENAR ===
   APP_NAME: "TERASYAQUB PHOTOBOOTH",
   BRAND: "PHOTOBOOTH TERASYAQUB",
   // === UKURAN KERTAS — SUDAH LENGKAP SEMUA ===
   PAPER_SIZES: [
     { id: "4R", name: "4R (4×6 in / 10.2×15.2 cm)", width: 102, height: 152, unit: "mm" },
  { id: "strip", name: "Strip (2×6 in / 5×15 cm)", width: 51, height: 152, unit: "mm" },
  { id: "polaroid", name: "Polaroid/Square (3×3 in / 2.7×4 in)", width: 76, height: 102, unit: "mm" },
  { id: "A5", name: "A5 (14.8×21 cm)", width: 148, height: 210, unit: "mm" },
  { id: "A4", name: "A4 (21×29.7 cm)", width: 210, height: 297, unit: "mm" },
  { id: "A3", name: "A3 (29.7×42 cm)", width: 297, height: 420, unit: "mm" }
],
   DEFAULT_PAPER_SIZE: "4R",
   // === FITUR — SEMUA SUDAH DIAKTIFKAN ===
   SHOW_QR_CODE: true,
   ENABLE_RETAKE: true,
   ENABLE_SEND_FILE: true,
   ENABLE_PRINT_OPTION: true,
   MAX_RETAKE_COUNT: 4,
   CAMERA_AUTO_START: true,
   TEMPLATE_UPLOAD_ENABLED: true
 };
