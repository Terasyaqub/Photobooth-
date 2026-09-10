/* =========================================================
   TERASYAQUB PHOTOBOOTH
   Camera + 1-8 Photos + Retake + Template
   + Final Image + GIF + Video
   + Supabase Storage + QR
========================================================= */


/* =========================================================
   1. SUPABASE CONFIGURATION
=========================================================

   GANTI DUA NILAI DI BAWAH INI DENGAN MILIK ANDA.

   Jangan gunakan service_role key.

========================================================= */

const SUPABASE_URL =
  "https://GANTI-PROJECT-ANDA.supabase.co";

const SUPABASE_ANON_KEY =
  "GANTI-ANON-KEY-ANDA";


const supabaseClient =
  window.supabase.createClient(
    SUPABASE_URL,
    SUPABASE_ANON_KEY
  );


/* =========================================================
   SUPABASE STORAGE
========================================================= */

const STORAGE_BUCKET = "photobooth";


/* =========================================================
   GLOBAL STATE
========================================================= */

let cameraStream = null;

let jumlahFoto = 4;

let countdown = 5;

let currentPhotoIndex = 0;

let photos = [];

let templateImage = null;

let templateObjectUrl = null;

let finalBlob = null;

let gifBlob = null;

let videoBlob = null;

let sessionId = null;


/* =========================================================
   DOM
========================================================= */

const kamera =
  document.getElementById("kamera");

const cameraCanvas =
  document.getElementById("cameraCanvas");

const cameraOverlay =
  document.getElementById("cameraOverlay");

const countdownDisplay =
  document.getElementById("countdownDisplay");

const setupArea =
  document.getElementById("setupArea");

const cameraArea =
  document.getElementById("cameraArea");

const gridArea =
  document.getElementById("gridArea");

const resultArea =
  document.getElementById("resultArea");

const photoGrid =
  document.getElementById("photoGrid");

const jumlahFotoInput =
  document.getElementById("jumlahFoto");

const countdownInput =
  document.getElementById("durasiCountdown");

const templateInput =
  document.getElementById("templateInput");

const templatePreview =
  document.getElementById("templatePreview");

const templatePlaceholder =
  document.getElementById("templatePlaceholder");

const templateName =
  document.getElementById("templateName");

const finalImage =
  document.getElementById("finalImage");

const qrCanvas =
  document.getElementById("qrCanvas");

const resultUrl =
  document.getElementById("resultUrl");

const qrArea =
  document.getElementById("qrArea");

const uploadStatus =
  document.getElementById("uploadStatus");

const uploadText =
  document.getElementById("uploadText");

const uploadProgress =
  document.getElementById("uploadProgress");

const gifPreview =
  document.getElementById("gifPreview");

const videoPreview =
  document.getElementById("videoPreview");

const mediaArea =
  document.getElementById("mediaArea");

const messageBox =
  document.getElementById("messageBox");


/* =========================================================
   HELPERS
========================================================= */

function showMessage(text, duration = 3000) {

  messageBox.textContent = text;

  messageBox.classList.remove("hidden");

  setTimeout(() => {

    messageBox.classList.add("hidden");

  }, duration);
}


function show(element) {

  element.classList.remove("hidden");

}


function hide(element) {

  element.classList.add("hidden");

}


function sleep(ms) {

  return new Promise(resolve =>
    setTimeout(resolve, ms)
  );

}


function generateSessionId() {

  if (
    window.crypto &&
    crypto.randomUUID
  ) {

    return crypto.randomUUID();

  }

  return (
    Date.now().toString(36) +
    "-" +
    Math.random()
      .toString(36)
      .substring(2, 12)
  );
}


function blobFromDataURL(dataURL) {

  const parts =
    dataURL.split(",");

  const mime =
    parts[0]
      .match(/:(.*?);/)[1];

  const binary =
    atob(parts[1]);

  const array =
    new Uint8Array(
      binary.length
    );

  for (
    let i = 0;
    i < binary.length;
    i++
  ) {

    array[i] =
      binary.charCodeAt(i);

  }

  return new Blob(
    [array],
    { type: mime }
  );
}


function downloadBlob(
  blob,
  filename
) {

  const url =
    URL.createObjectURL(blob);

  const a =
    document.createElement("a");

  a.href = url;

  a.download = filename;

  document.body.appendChild(a);

  a.click();

  a.remove();

  setTimeout(() => {

    URL.revokeObjectURL(url);

  }, 1000);
}


/* =========================================================
   2. TEMPLATE
========================================================= */

document
  .getElementById("btnTemplate")
  .addEventListener(
    "click",
    () => templateInput.click()
  );


templateInput.addEventListener(
  "change",
  async event => {

    const file =
      event.target.files[0];

    if (!file) return;

    if (
      !file.type.startsWith("image/")
    ) {

      showMessage(
        "Template harus berupa gambar."
      );

      return;

    }

    if (templateObjectUrl) {

      URL.revokeObjectURL(
        templateObjectUrl
      );

    }

    templateObjectUrl =
      URL.createObjectURL(file);

    templatePreview.src =
      templateObjectUrl;

    templatePreview.style.display =
      "block";

    templatePlaceholder.style.display =
      "none";

    templateName.textContent =
      file.name;

    templateImage =
      await loadImage(
        templateObjectUrl
      );

    showMessage(
      "Template berhasil dipilih."
    );

  }
);


function loadImage(src) {

  return new Promise(
    (resolve, reject) => {

      const img =
        new Image();

      img.onload =
        () => resolve(img);

      img.onerror =
        reject;

      img.src = src;

    }
  );
}


/* =========================================================
   3. START BUTTON
========================================================= */

document
  .getElementById("btnMulai")
  .addEventListener(
    "click",
    startPhotobooth
  );


async function startPhotobooth() {

  jumlahFoto =
    Number(
      jumlahFotoInput.value
    );

  countdown =
    Number(
      countdownInput.value
    );

  photos =
    new Array(jumlahFoto)
      .fill(null);

  currentPhotoIndex = 0;

  sessionId =
    generateSessionId();

  updateProgress();

  renderPhotoGrid();

  try {

    await startCamera();

    hide(setupArea);

    hide(gridArea);

    hide(resultArea);

    show(cameraArea);

    showMessage(
      "Kamera siap."
    );

  } catch (error) {

    console.error(error);

    showMessage(
      "Kamera tidak dapat diakses. Pastikan izin kamera diberikan."
    );

  }

}


/* =========================================================
   4. CAMERA
========================================================= */

async function startCamera() {

  if (cameraStream) {

    stopCamera();

  }

  cameraStream =
    await navigator.mediaDevices.getUserMedia({

      video: {
        facingMode: "user",
        width: {
          ideal: 1920
        },
        height: {
          ideal: 1080
        }
      },

      audio: false

    });

  kamera.srcObject =
    cameraStream;

  await kamera.play();

}


function stopCamera() {

  if (!cameraStream) return;

  cameraStream
    .getTracks()
    .forEach(track =>
      track.stop()
    );

  cameraStream = null;

  kamera.srcObject = null;

}


/* =========================================================
   STOP CAMERA
========================================================= */

document
  .getElementById("btnStopCamera")
  .addEventListener(
    "click",
    () => {

      stopCamera();

      hide(cameraArea);

      show(setupArea);

    }
  );


/* =========================================================
   5. TAKE PHOTO
========================================================= */

document
  .getElementById("btnJepret")
  .addEventListener(
    "click",
    () => takePhoto()
  );


async function takePhoto() {

  if (!cameraStream) {

    showMessage(
      "Kamera belum aktif."
    );

    return;

  }

  if (
    currentPhotoIndex >= jumlahFoto
  ) {

    showMessage(
      "Semua foto sudah diambil."
    );

    return;

  }

  const btn =
    document.getElementById(
      "btnJepret"
    );

  btn.disabled = true;

  await runCountdown();

  const photo =
    captureCameraFrame();

  photos[currentPhotoIndex] =
    photo;

  renderPhotoGrid();

  currentPhotoIndex++;

  updateProgress();

  btn.disabled = false;

  if (
    currentPhotoIndex >= jumlahFoto
  ) {

    stopCamera();

    hide(cameraArea);

    show(gridArea);

    showMessage(
      "Semua foto selesai."
    );

  }

}


/* =========================================================
   COUNTDOWN
========================================================= */

async function runCountdown() {

  for (
    let i = countdown;
    i > 0;
    i--
  ) {

    countdownDisplay.textContent =
      i;

    await sleep(1000);

  }

  countdownDisplay.textContent =
    "📸";

  await sleep(500);

  countdownDisplay.textContent =
    "";

}


/* =========================================================
   CAPTURE CAMERA
========================================================= */

function captureCameraFrame() {

  const videoWidth =
    kamera.videoWidth;

  const videoHeight =
    kamera.videoHeight;

  if (
    !videoWidth ||
    !videoHeight
  ) {

    throw new Error(
      "Ukuran kamera tidak tersedia."
    );

  }

  cameraCanvas.width =
    videoWidth;

  cameraCanvas.height =
    videoHeight;

  const ctx =
    cameraCanvas.getContext(
      "2d"
    );

  /*
    Mirror agar hasil foto seperti
    preview kamera depan.
  */

  ctx.save();

  ctx.translate(
    videoWidth,
    0
  );

  ctx.scale(-1, 1);

  ctx.drawImage(
    kamera,
    0,
    0,
    videoWidth,
    videoHeight
  );

  ctx.restore();

  return cameraCanvas
    .toDataURL(
      "image/jpeg",
      0.95
    );

}


/* =========================================================
   6. PHOTO GRID
========================================================= */

function renderPhotoGrid() {

  photoGrid.innerHTML = "";

  photoGrid.className =
    "photo-grid grid-" +
    jumlahFoto;

  for (
    let i = 0;
    i < jumlahFoto;
    i++
  ) {

    const card =
      document.createElement(
        "div"
      );

    card.className =
      "photo-card";


    const number =
      document.createElement(
        "div"
      );

    number.className =
      "photo-number";

    number.textContent =
      "Foto " + (i + 1);

    card.appendChild(number);


    if (photos[i]) {

      const img =
        document.createElement(
          "img"
        );

      img.src =
        photos[i];

      card.appendChild(img);


      const btn =
        document.createElement(
          "button"
        );

      btn.className =
        "retake-btn secondary-btn";

      btn.textContent =
        "🔄 Retake Foto " +
        (i + 1);

      btn.addEventListener(
        "click",
        () => retakePhoto(i)
      );

      card.appendChild(btn);

    } else {

      const empty =
        document.createElement(
          "div"
        );

      empty.style.aspectRatio =
        "4 / 3";

      empty.style.display =
        "flex";

      empty.style.alignItems =
        "center";

      empty.style.justifyContent =
        "center";

      empty.textContent =
        "Belum ada foto";

      card.appendChild(empty);

    }

    photoGrid.appendChild(card);

  }

}


/* =========================================================
   RETAKE PER FOTO
========================================================= */

async function retakePhoto(index) {

  currentPhotoIndex =
    index;

  try {

    await startCamera();

    hide(gridArea);

    hide(resultArea);

    show(cameraArea);

    updateProgress();

    const btn =
      document.getElementById(
        "btnJepret"
      );

    btn.disabled = false;

    showMessage(
      "Retake Foto " +
      (index + 1)
    );

  } catch (error) {

    console.error(error);

    showMessage(
      "Tidak bisa membuka kamera."
    );

  }

}


/* =========================================================
   PROGRESS
========================================================= */

function updateProgress() {

  document.getElementById(
    "progressFoto"
  ).textContent =
    "Foto " +
    Math.min(
      currentPhotoIndex,
      jumlahFoto
    ) +
    " / " +
    jumlahFoto;

}


/* =========================================================
   7. TAMBAH / FOTO ULANG
========================================================= */

document
  .getElementById("btnTambahFoto")
  .addEventListener(
    "click",
    async () => {

      const emptyIndex =
        photos.findIndex(
          photo => !photo
        );

      if (
        emptyIndex === -1
      ) {

        await retakePhoto(0);

      } else {

        await retakePhoto(
          emptyIndex
        );

      }

    }
  );


/* =========================================================
   8. FINAL IMAGE
========================================================= */

document
  .getElementById("btnGabungkan")
  .addEventListener(
    "click",
    async () => {

      const complete =
        photos.every(
          photo => photo
        );

      if (!complete) {

        showMessage(
          "Semua foto harus diisi terlebih dahulu."
        );

        return;

      }

      try {

        showMessage(
          "Membuat hasil akhir..."
        );

        finalBlob =
          await createFinalImage();

        const url =
          URL.createObjectURL(
            finalBlob
          );

        finalImage.src =
          url;

        hide(gridArea);

        show(resultArea);

        showMessage(
          "Hasil akhir siap."
        );

      } catch (error) {

        console.error(error);

        showMessage(
          "Gagal membuat hasil akhir."
        );

      }

    }
  );


/* =========================================================
   CREATE FINAL IMAGE

   Jika template tersedia:
   template dianggap sebagai overlay
   yang menutupi canvas.

   Jika template tidak tersedia:
   foto disusun grid otomatis.
========================================================= */

async function createFinalImage() {

  const images = [];

  for (
    const photo of photos
  ) {

    images.push(
      await loadImage(photo)
    );

  }


  /*
    Layout:
    1 = 1x1
    2 = 2x1
    3-4 = 2x2
    5-6 = 3x2
    7-8 = 4x2
  */

  let cols;

  if (jumlahFoto === 1) {

    cols = 1;

  } else if (
    jumlahFoto === 2
  ) {

    cols = 2;

  } else if (
    jumlahFoto <= 4
  ) {

    cols = 2;

  } else if (
    jumlahFoto <= 6
  ) {

    cols = 3;

  } else {

    cols = 4;

  }


  const rows =
    Math.ceil(
      jumlahFoto / cols
    );


  const cellWidth =
    1200;

  const cellHeight =
    900;


  const canvas =
    document.createElement(
      "canvas"
    );

  canvas.width =
    cellWidth * cols;

  canvas.height =
    cellHeight * rows;


  const ctx =
    canvas.getContext("2d");


  ctx.fillStyle =
    "#ffffff";

  ctx.fillRect(
    0,
    0,
    canvas.width,
    canvas.height
  );


  images.forEach(
    (img, index) => {

      const col =
        index % cols;

      const row =
        Math.floor(
          index / cols
        );

      const x =
        col * cellWidth;

      const y =
        row * cellHeight;


      /*
        Crop foto agar memenuhi cell.
      */

      const scale =
        Math.max(
          cellWidth / img.width,
          cellHeight / img.height
        );

      const width =
        img.width * scale;

      const height =
        img.height * scale;

      const dx =
        x +
        (cellWidth - width) / 2;

      const dy =
        y +
        (cellHeight - height) / 2;


      ctx.save();

      ctx.beginPath();

      ctx.rect(
        x,
        y,
        cellWidth,
        cellHeight
      );

      ctx.clip();


      ctx.drawImage(
        img,
        dx,
        dy,
        width,
        height
      );

      ctx.restore();

    }
  );


  /*
    Template overlay
  */

  if (templateImage) {

    ctx.drawImage(
      templateImage,
      0,
      0,
      canvas.width,
      canvas.height
    );

  }


  return new Promise(
    resolve => {

      canvas.toBlob(
        blob => resolve(blob),
        "image/jpeg",
        0.95
      );

    }
  );

}


/* =========================================================
   9. SAVE PHOTO LOCAL
========================================================= */

document
  .getElementById("btnSavePhoto")
  .addEventListener(
    "click",
    saveAllOnline
  );


/* =========================================================
   10. GIF
========================================================= */

document
  .getElementById("btnMakeGif")
  .addEventListener(
    "click",
    createGIF
  );


async function createGIF() {

  if (!photos.length) {

    showMessage(
      "Belum ada foto."
    );

    return;

  }

  try {

    showMessage(
      "Membuat GIF..."
    );

    const gif =
      new GIF({

        workers: 2,

        quality: 10,

        width: 600,

        height: 450,

        workerScript:
          "https://cdn.jsdelivr.net/npm/gif.js@0.2.0/dist/gif.worker.js"

      });


    for (
      const photo of photos
    ) {

      const img =
        await loadImage(photo);


      const canvas =
        document.createElement(
          "canvas"
        );

      canvas.width = 600;

      canvas.height = 450;

      const ctx =
        canvas.getContext("2d");


      const scale =
        Math.max(
          600 / img.width,
          450 / img.height
        );

      const width =
        img.width * scale;

      const height =
        img.height * scale;


      ctx.fillStyle =
        "white";

      ctx.fillRect(
        0,
        0,
        600,
        450
      );


      ctx.drawImage(
        img,
        (600 - width) / 2,
        (450 - height) / 2,
        width,
        height
      );


      /*
        Template pada GIF.
      */

      if (templateImage) {

        ctx.drawImage(
          templateImage,
          0,
          0,
          600,
          450
        );

      }


      gif.addFrame(
        canvas,
        {
          delay: 900,
          copy: true
        }
      );

    }


    gif.addFrame(
      await makeGIFFinalFrame(),
      {
        delay: 1500,
        copy: true
      }
    );


    gif.on(
      "finished",
      blob => {

        gifBlob = blob;

        const url =
          URL.createObjectURL(
            blob
          );

        gifPreview.src =
          url;

        gifPreview.classList.remove(
          "hidden"
        );

        mediaArea.classList.remove(
          "hidden"
        );

        showMessage(
          "GIF selesai dibuat."
        );

      }
    );


    gif.render();

  } catch (error) {

    console.error(error);

    showMessage(
      "Gagal membuat GIF."
    );

  }

}


async function makeGIFFinalFrame() {

  const img =
    await loadImage(
      finalImage.src
    );

  const canvas =
    document.createElement(
      "canvas"
    );

  canvas.width = 600;

  canvas.height = 450;

  const ctx =
    canvas.getContext("2d");

  ctx.drawImage(
    img,
    0,
    0,
    600,
    450
  );

  return canvas;

}


/* =========================================================
   11. VIDEO
========================================================= */

document
  .getElementById("btnMakeVideo")
  .addEventListener(
    "click",
    createVideo
  );


async function createVideo() {

  if (!photos.length) {

    showMessage(
      "Belum ada foto."
    );

    return;

  }


  try {

    showMessage(
      "Membuat video..."
    );


    /*
      Canvas + MediaRecorder.

      Format:
      WebM.
      Browser modern Android/Chrome
      biasanya mendukung WebM.
    */

    const canvas =
      document.createElement(
        "canvas"
      );

    canvas.width = 1280;

    canvas.height = 720;

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
      event => {

        if (
          event.data.size > 0
        ) {

          chunks.push(
            event.data
          );

        }

      };


    const stopped =
      new Promise(
        resolve => {

          recorder.onstop =
            resolve;

        }
      );


    recorder.start();


    /*
      Semua foto tampil bergantian.
    */

    for (
      const photo of photos
    ) {

      const img =
        await loadImage(photo);


      const start =
        Date.now();


      while (
        Date.now() - start <
        1200
      ) {

        drawVideoFrame(
          ctx,
          canvas,
          img
        );

        await sleep(33);

      }

    }


    /*
      Tampilkan final image.
    */

    const finalImg =
      await loadImage(
        finalImage.src
      );


    const finalStart =
      Date.now();


    while (
      Date.now() -
      finalStart <
      2000
    ) {

      drawVideoFrame(
        ctx,
        canvas,
        finalImg
      );

      await sleep(33);

    }


    recorder.stop();

    await stopped;


    videoBlob =
      new Blob(
        chunks,
        {
          type: mimeType
        }
      );


    const url =
      URL.createObjectURL(
        videoBlob
      );


    videoPreview.src =
      url;

    videoPreview.classList.remove(
      "hidden"
    );

    mediaArea.classList.remove(
      "hidden"
    );


    showMessage(
      "Video selesai dibuat."
    );

  } catch (error) {

    console.error(error);

    showMessage(
      "Gagal membuat video. Coba gunakan Chrome."
    );

  }

}


function drawVideoFrame(
  ctx,
  canvas,
  img
) {

  ctx.fillStyle =
    "#000";

  ctx.fillRect(
    0,
    0,
    canvas.width,
    canvas.height
  );


  const scale =
    Math.max(
      canvas.width / img.width,
      canvas.height / img.height
    );


  const width =
    img.width * scale;

  const height =
    img.height * scale;


  ctx.drawImage(
    img,
    (canvas.width - width) / 2,
    (canvas.height - height) / 2,
    width,
    height
  );

}


/* =========================================================
   12. SUPABASE UPLOAD
========================================================= */

async function uploadFile(
  blob,
  path,
  contentType
) {

  const {
    data,
    error
  } =
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


  if (error) {

    throw error;

  }


  return data;

}


/* =========================================================
   13. SAVE EVERYTHING ONLINE
========================================================= */

async function saveAllOnline() {

  if (!finalBlob) {

    showMessage(
      "Buat hasil akhir terlebih dahulu."
    );

    return;

  }


  hide(qrArea);

  show(uploadStatus);

  uploadProgress.style.width =
    "5%";

  uploadText.textContent =
    "Menyiapkan upload...";


  try {

    /*
      Cek Supabase
    */

    if (
      SUPABASE_URL.includes(
        "GANTI-PROJECT"
      )
    ) {

      throw new Error(
        "Supabase belum dikonfigurasi."
      );

    }


    if (
      SUPABASE_ANON_KEY.includes(
        "GANTI-ANON"
      )
    ) {

      throw new Error(
        "Supabase ANON KEY belum dikonfigurasi."
      );

    }


    const id =
      sessionId ||
      generateSessionId();

    sessionId = id;


    /*
      Upload FINAL PHOTO
    */

    uploadText.textContent =
      "Upload foto...";

    uploadProgress.style.width =
      "25%";


    const photoPath =
      `${id}/final.jpg`;


    await uploadFile(
      finalBlob,
      photoPath,
      "image/jpeg"
    );


    /*
      Upload GIF jika sudah dibuat
    */

    let gifPath = null;


    if (gifBlob) {

      uploadText.textContent =
        "Upload GIF...";

      uploadProgress.style.width =
        "45%";


      gifPath =
        `${id}/result.gif`;


      await uploadFile(
        gifBlob,
        gifPath,
        "image/gif"
      );

    }


    /*
      Upload VIDEO jika sudah dibuat
    */

    let videoPath = null;


    if (videoBlob) {

      uploadText.textContent =
        "Upload video...";

      uploadProgress.style.width =
        "65%";


      videoPath =
        `${id}/result.webm`;


      await uploadFile(
        videoBlob,
        videoPath,
        "video/webm"
      );

    }


    /*
      Upload foto individual
    */

    uploadText.textContent =
      "Upload foto individual...";

    uploadProgress.style.width =
      "75%";


    const photoPaths = [];


    for (
      let i = 0;
      i < photos.length;
      i++
    ) {

      const blob =
        blobFromDataURL(
          photos[i]
        );


      const path =
        `${id}/photo-${i + 1}.jpg`;


      await uploadFile(
        blob,
        path,
        "image/jpeg"
      );


      photoPaths.push(path);

    }


    /*
      Buat public URLs.
    */

    const finalPublicUrl =
      getPublicUrl(
        photoPath
      );


    const gifPublicUrl =
      gifPath
        ? getPublicUrl(gifPath)
        : null;


    const videoPublicUrl =
      videoPath
        ? getPublicUrl(videoPath)
        : null;


    const individualUrls =
      photoPaths.map(
        path =>
          getPublicUrl(path)
      );


    uploadText.textContent =
      "Menyimpan data sesi...";

    uploadProgress.style.width =
      "90%";


    /*
      Insert database.

      Tabel:
      photobooth_sessions
    */

    const {
      error: dbError
    } =
      await supabaseClient
        .from(
          "photobooth_sessions"
        )
        .insert({

          id,

          photo_count:
            jumlahFoto,

          final_photo_url:
            finalPublicUrl,

          gif_url:
            gifPublicUrl,

          video_url:
            videoPublicUrl,

          photo_urls:
            individualUrls

        });


    if (dbError) {

      throw dbError;

    }


    uploadProgress.style.width =
      "100%";

    uploadText.textContent =
      "Selesai!";


    /*
      URL halaman hasil.

      Jika aplikasi berada di:
      https://domainanda.com/index.html

      maka:
      https://domainanda.com/result.html?id=...
      
      Untuk versi paling sederhana,
      kita gunakan index.html?result=...
      dan script akan mendeteksi mode hasil.
    */

    const baseUrl =
      window.location.origin +
      window.location.pathname
        .replace(
          /\/[^/]*$/,
          "/"
        );


    const url =
      baseUrl +
      "result.html?id=" +
      encodeURIComponent(id);


    resultUrl.value =
      url;


    const openResult =
      document.getElementById(
        "openResult"
      );

    openResult.href =
      url;


    /*
      QR
    */

    await QRCode.toCanvas(
      qrCanvas,
      url,
      {
        width: 280,

        margin: 2,

        errorCorrectionLevel:
          "H"
      }
    );


    show(qrArea);


    showMessage(
      "Berhasil disimpan online. QR Code siap."
    );


  } catch (error) {

    console.error(error);

    uploadText.textContent =
      "Gagal menyimpan.";

    uploadProgress.style.width =
      "0%";


    showMessage(
      "Gagal upload: " +
      (
        error.message ||
        "Periksa konfigurasi Supabase."
      ),
      6000
    );

  }

}


/* =========================================================
   PUBLIC URL
========================================================= */

function getPublicUrl(path) {

  const {
    data
  } =
    supabaseClient
      .storage
      .from(STORAGE_BUCKET)
      .getPublicUrl(path);


  return data.publicUrl;

}


/* =========================================================
   COPY URL
========================================================= */

document
  .getElementById("btnCopyUrl")
  .addEventListener(
    "click",
    async () => {

      try {

        await navigator.clipboard.writeText(
          resultUrl.value
        );

        showMessage(
          "Link berhasil disalin."
        );

      } catch {

        resultUrl.select();

        document.execCommand(
          "copy"
        );

        showMessage(
          "Link berhasil disalin."
        );

      }

    }
  );


/* =========================================================
   NEW SESSION
========================================================= */

document
  .getElementById("btnNewSession")
  .addEventListener(
    "click",
    () => {

      stopCamera();

      photos = [];

      currentPhotoIndex = 0;

      finalBlob = null;

      gifBlob = null;

      videoBlob = null;

      sessionId = null;


      finalImage.src = "";

      gifPreview.src = "";

      videoPreview.src = "";

      hide(resultArea);

      hide(gridArea);

      hide(cameraArea);

      hide(qrArea);

      hide(uploadStatus);

      hide(mediaArea);

      show(setupArea);

      showMessage(
        "Sesi baru siap."
      );

    }
  );


/* =========================================================
   PAGE LOAD
========================================================= */

window.addEventListener(
  "beforeunload",
  () => {

    stopCamera();

    if (
      templateObjectUrl
    ) {

      URL.revokeObjectURL(
        templateObjectUrl
      );

    }

  }
);


/* =========================================================
   INITIAL GRID
========================================================= */

renderPhotoGrid();
