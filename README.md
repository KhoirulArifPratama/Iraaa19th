# 🌸 Panduan Kustomisasi Website Ulang Tahun Humaira 🌸

Website ini telah dirancang dengan tema **Pink Elegan & Lucu** menggunakan maskot kartun kucing pacar Anda, **Mimi**, lengkap dengan berbagai animasi dan interaksi seru.

Berikut adalah panduan mudah untuk menyesuaikan konten website ini dengan foto dan pesan pribadi Anda sebelum membagikannya ke pacar Anda!

---

## 🗺️ Urutan Halaman (setelah PIN dimasukkan)

1. **Tanggal** — Kalender Juli 2026 dengan tanggal 21 ditandai, lalu kotak kado yang lari-lari dan baru terbuka di klik ke-3. Setelah terbuka langsung muncul teks "Happy Birthday" beserta galeri foto di bawahnya.
2. **Kartu Ucapan** — Amplop yang bisa diklik, munculkan pop up kartu ucapan.
3. **Kue** — Tiup lilin.
4. **Video Kenangan** — Slot video (lihat bagian "Menambahkan Video" di bawah).
5. **Galaksi** — Tampil full screen begitu halaman ini aktif.
6. **Kucing** — Beri makan Abang, setelah kenyang penuh Abang mengucapkan selamat ulang tahun ke Humaira.
7. **Ucapan Terakhir** — Amplop surat penutup (beda dari kartu ucapan di halaman 2).
8. **Selesai** — Tombol untuk mengulang dari awal (reset semua state).

### Menambahkan Video Kenangan 🎬
Halaman "Video Kenangan" sudah disiapkan sebagai slot kosong. Untuk mengisinya:
1. Simpan file video Anda ke folder `videos/`.
2. Beri nama file tersebut `video-kenangan.mp4` — **atau**, jika ingin nama lain, buka `index.html`, cari `id="memory-video"`, lalu ubah `src="videos/..."` sesuai nama file Anda.
3. Selama file belum ada, halaman akan otomatis menampilkan placeholder "Taruh video kamu di sini!" — jadi aman untuk dibagikan lebih dulu tanpa video.

### Mengubah Isi Kartu Ucapan (Pop Up) 💌
* Buka `script.js`, cari variabel `GREETING_CARD_TEXT` di bagian atas file, lalu ganti teksnya sesuai keinginan.

### Mengubah Tanggal di Kalender 📅
* Buka `script.js`, cari baris `buildBdayCalendar(2026, 6, 21);` (bulan Juli = index 6, angka terakhir adalah tanggal yang ditandai). Ubah sesuai kebutuhan.

---

## 🛠️ Cara Kustomisasi Konten Lainnya

Semua file kode terletak di folder ini:
*   [index.html](file:///d:/Humaira19/index.html) — Struktur website dan teks utama.
*   [style.css](file:///d:/Humaira19/style.css) — Desain visual, tema pink, dan animasi.
*   [script.js](file:///d:/Humaira19/script.js) — Logika game, kalender, kado, amplop, dan pemutar musik.

### 1. Mengubah Nama Pacar Anda
Jika nama panggilan pacar Anda bukan "Humaira", cari & ganti teks "Humaira" di `index.html` dan `script.js` (mis. variabel `mimiSpeechQuotes`, `loveLetterText`, dan `GREETING_CARD_TEXT`).

### 2. Mengganti Foto
Foto galeri ada di folder `photos/` dan dirujuk pada bagian "CELEBRATION WRAPPER" di `index.html` (halaman Tanggal). Ganti file di folder tersebut atau ubah nama filenya di tag `<img src="photos/...">`.

### 3. Mengubah Isi Surat Cinta (Ucapan Terakhir) ✉️
Anda dapat mengedit isi surat cinta yang akan diketik otomatis saat amplop di halaman terakhir dibuka.
*   Buka file [script.js](file:///d:/Humaira19/script.js).
*   Cari variabel `loveLetterText` di bagian atas file dan ganti teks di dalamnya dengan ungkapan hati Anda sendiri. Pastikan menggunakan tanda petik miring (backtick \` \`) agar mendukung baris baru.

---

## 🚀 Cara Menjalankan & Menyebarkan Website

### Cara Menjalankan di Komputer Sendiri
*   Cukup klik dua kali pada file [index.html](file:///d:/Humaira19/index.html) untuk membukanya langsung di Google Chrome, Microsoft Edge, atau browser favorit Anda.
*   *Catatan: Musik latar dan suara synthesizer menggunakan teknologi Web Audio API, yang akan otomatis aktif setelah Anda berinteraksi dengan halaman (misalnya mengklik tombol "Buka Sekarang").*

### Cara Mengirimkan ke Pacar Anda (Online gratis!)
Agar pacar Anda bisa membuka website ini dari HP atau laptopnya sendiri di mana saja, Anda bisa meng-hosting website ini secara gratis:
1.  **Netlify (Paling Mudah):**
    *   Buka situs [Netlify](https://www.netlify.com/).
    *   Daftar/masuk akun gratis.
    *   Tarik dan lepaskan (drag and drop) folder proyek ini (`Humaira19`) ke area "Drag and drop your site folder here" di dashboard Netlify.
    *   Website Anda langsung online! Anda akan mendapatkan link website acak yang bisa diubah namanya (misal: `hbd-humaira.netlify.app`).
2.  **GitHub Pages:**
    *   Unggah folder ini ke repository GitHub.
    *   Aktifkan fitur GitHub Pages di tab *Settings* repository tersebut.

