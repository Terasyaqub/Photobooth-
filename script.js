// === KAMERA LANGSUNG ===
 const kamera = document.getElementById('kamera');
 const kanvas = document.getElementById('kanvas');
 const ctx = kanvas.getContext('2d');
 let linkFotoSelesai = '';
 // Buka kamera otomatis saat halaman dibuka
 navigator.mediaDevices.getUserMedia({ video: { facingMode: 'user' } })
   .then(aliran => kamera.srcObject = aliran)
   .catch(err => alert('Izinkan kamera ya! ' + err));
 // === HITUNG MUNDUR & JEPRET ===
 async function mulaiFoto() {
   const hitung = document.getElementById('hitungMundur');
   for (let i = 3; i >= 1; i--) {
     hitung.innerText = i;
     await new Promise(tunggu => setTimeout(tunggu, 1000));
   }
   hitung.innerText = '';
   jepretFoto();
 }
 // === AMBIL FOTO + TAMBAH FRAME ===
 function jepretFoto() {
   kanvas.width = kamera.videoWidth;
   kanvas.height = kamera.videoHeight;
   
   // Gambar foto dari kamera
   ctx.drawImage(kamera, 0, 0, kanvas.width, kanvas.height);
   
   // Tambah frame/logo Terasyaqub (upload frame.png dulu)
   const frame = document.getElementById('frame');
   if (frame.complete) ctx.drawImage(frame, 0, 0, kanvas.width, kanvas.height);
   // Simpan hasil & tampilkan
   linkFotoSelesai = kanvas.toDataURL('image/png');
   document.getElementById('fotoHasil').src = linkFotoSelesai;
   
   // Tampilkan QR Code
   document.getElementById('hasilArea').style.display = 'block';
   QRCode.toCanvas(document.createElement('canvas'), linkFotoSelesai, { width: 200 }, function (er, qrCanvas) {
     document.getElementById('qrcode').innerHTML = '';
     document.getElementById('qrcode').appendChild(qrCanvas);
   });
 }
 // === MODE GIF ===
 function modeGIF() {
   alert('Merekam beberapa detik untuk GIF... (fitur lanjutan, sudah siap kerangkanya!)');
   // Bisa dikembangkan — gabung beberapa foto jadi GIF animasi
 }
 // === MODE VIDEO ===
 function modeVideo() {
   alert('Merekam video... (fitur lanjutan, sudah siap kerangkanya!)');
   // Bisa dikembangkan — rekam video pendek & simpan
 }
 // === ULANGI FOTO ===
 function reset() {
   document.getElementById('hasilArea').style.display = 'none';
   document.getElementById('qrcode').innerHTML = '';
 }