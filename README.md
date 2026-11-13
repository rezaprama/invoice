# Invoice Studio

Isi invoice di browser, lalu langsung unduh PDF. Satu formulir sekali pakai, tanpa akun atau penyimpanan data formulir.

**Website:** [rezaprama.github.io/invoice](https://rezaprama.github.io/invoice/)

## Cara pakai

1. Pilih **Format invoice** atau mulai dengan format bebas. Klik langsung nama, alamat, nomor invoice, atau tanggal pada lembar dokumen untuk mengedit.
2. Tambahkan item, jumlah, satuan, dan harga. Duplikat atau urutkan item sesuai kebutuhan.
3. Tambahkan diskon, biaya tambahan, atau pembayaran sebagian dari ringkasan. Pajak, logo, dan catatan juga dapat diedit di dokumen yang sama.
4. Klik **Unduh PDF**. Tidak perlu berpindah dari formulir ke pratinjau atau menyimpan draf.

Nomor invoice bebas diedit. Karena tidak ada riwayat, aplikasi tidak mendeteksi nomor yang sudah dipakai pada sesi sebelumnya.

## 20 format bidang

| Kelompok | Format |
| --- | --- |
| Konstruksi | Termin proyek; volume pekerjaan |
| Teknik sipil | Konsultan teknik sipil; pengawasan proyek; survei & pemetaan |
| Arsitektur & interior | Arsitek/perencanaan; desain interior; pengadaan & pemasangan interior |
| Kos Zania Tangerang | Bulanan; masuk/deposit; tahunan |
| Jasa hukum Sriyani Suhartati | Konsultasi; pendampingan; retainer |
| Lainnya | Sewa properti; perawatan bangunan; perangkat lunak; desain kreatif; pelatihan; jasa profesional umum |

Format berisi judul, contoh item tanpa harga, satuan, serta kolom informasi yang sesuai: proyek/termin/lokasi untuk konstruksi, kamar/periode untuk kos, atau referensi penugasan/periode untuk jasa hukum. Label dan isinya dapat diedit langsung. Kolom terisi ikut masuk PDF; kolom kosong tidak dicetak. **Tambah detail** memungkinkan penambahan kolom sendiri.

Nama Kos Zania, kota Tangerang, dan Sriyani Suhartati berasal dari arahan pemilik proyek. Tidak ada nomor rekening, alamat lengkap, kredensial profesi, harga pasar, tarif pajak, atau syarat perjanjian yang dibuat otomatis. Angka meter pada format kos adalah informasi manual; jumlah kWh pada item diisi pengguna.

Mengganti format pada invoice yang sudah berisi item menampilkan pilihan untuk mempertahankan atau mengganti item. Pilihan awal mempertahankan item dan harga. Identitas kustom, judul kustom, serta detail terisi tetap dipertahankan. Nama otomatis dari format personal dapat berubah ke nama format personal berikutnya selama belum diubah sendiri. Memilih **Format bebas** melepas pilihan format tanpa mengosongkan isi.

## Sesi tanpa penyimpanan

Seluruh data formulir dan logo berada dalam memori tab. Aplikasi tidak membaca atau menulis `localStorage`, `sessionStorage`, IndexedDB, maupun cookie. Tidak ada autosave, riwayat, profil bisnis tersimpan, ekspor JSON, atau impor cadangan. Tema dan bahasa juga hanya berlaku pada sesi yang sedang dibuka.

**Refresh atau membuka tab baru memulai formulir kosong.** Tombol Mulai ulang mengosongkan formulir setelah konfirmasi. Undo penghapusan item juga hanya berlaku dalam sesi aktif. Hasil unduhan aplikasi hanya file PDF.

Website tetap memuat aset dari GitHub Pages. Pembuatan PDF dan pemrosesan logo berlangsung di browser; aplikasi tidak mengunggah detail invoice. Tidak ada analytics, backend, atau layanan font pihak ketiga. Pengaturan autofill formulir dimatikan melalui atribut `autocomplete="off"`; kebijakan browser atau pengelola kata sandi tetap di luar kendali aplikasi. Aset website boleh di-cache browser, tetapi aplikasi tidak menyimpan isi invoice.

Data yang pernah disimpan oleh versi lama tidak dimuat atau dipakai oleh versi ini. Versi ini juga tidak menghapus entri penyimpanan lama secara otomatis.

## Fitur

- Tambah, duplikat, naik/turunkan urutan, hapus, dan Undo item. Jumlah pecahan dan satuan bebas didukung; maksimal 500 item.
- Hitungan `decimal.js`, diskon persen/nominal, pajak setelah diskon, biaya tambahan tanpa pajak, pembayaran sebagian, dan kelebihan bayar.
- 22 mata uang. IDR/JPY/KRW/VND tanpa pecahan; BHD/KWD tiga desimal; lainnya dua desimal. Mengganti mata uang tidak mengonversi kurs. Masukkan angka tanpa pemisah ribuan; koma atau titik untuk desimal.
- PDF A4 berupa teks, tabel banyak halaman, header berulang, nomor halaman, logo opsional, dan font yang dimuat saat unduh pertama.
- Bahasa dokumen Indonesia/Inggris, terpisah dari bahasa UI.
- Tema mengikuti dark/light sistem secara langsung; pilihan manual terang/gelap tersedia tanpa disimpan.
- Satu lembar dokumen yang dapat diedit langsung. Field berupa input/textarea native, dengan penanda hover/fokus. Harga terformat ketika tidak difokuskan dan menjadi angka mentah saat diedit; textarea tumbuh mengikuti isi. Ponsel menampilkan baris item sebagai kelompok berlabel agar tetap nyaman disentuh.
- Logo PNG/JPG maksimal 2 MB, diproses lokal hingga 360 px dan maksimal 200 KB setelah diproses.

Status draf/terkirim/lunas hanya label dokumen. Tidak ada pengiriman email otomatis. Status lunas menghitung seluruh total sebagai dibayar. Tarif pajak diisi pengguna. Font PDF Noto Sans mendukung Latin/Yunani/Kiril; aksara lain memerlukan font tambahan. Pratinjau dan PDF menggunakan data/hitungan yang sama, dengan mesin layout berbeda sehingga pembungkusan teks dapat berbeda.

## Pengembangan dan deployment

Node.js 24 dan npm:

```sh
npm ci
npm run dev
npm run check
npx playwright install chromium
npm run test:e2e
```

Alamat lokal: `http://127.0.0.1:5173/invoice/`. Tes Windows memakai Chrome terpasang; CI memakai Chromium Playwright. Emulasi ponsel bukan pengujian Safari/iOS native.

Stack: React, TypeScript, Vite, CSS native, Phosphor Icons, Decimal.js, jsPDF, dan jsPDF-AutoTable. Tidak memerlukan API key. UI memakai DM Sans self-hosted. Mesin PDF dimuat hanya saat diperlukan.

`vite.config.ts` memakai `base: '/invoice/'`. GitHub Pages memakai **Source: GitHub Actions**. Push ke `main` menjalankan tes unit, typecheck, build, dan tes browser sebelum deploy. Pull request menjalankan verifikasi tanpa publikasi. Lihat [.github/workflows/deploy.yml](.github/workflows/deploy.yml).

## Clean-room dan desain

Implementasi awal dibuat dari direktori kosong. README publik [gogo-invoice](https://github.com/hallucinogen/gogo-invoice) dan [Midday](https://github.com/midday-ai/midday) digunakan untuk memahami kebutuhan produk, tanpa menyalin source implementasi, CSS, screenshot, atau aset.

Revisi saat ini mengikuti arahan pengguna: edit langsung di dokumen, browser saja, tanpa penyimpanan, hasil langsung PDF, aksen biru, dan tema sistem. UI publik [Gogo Invoice](https://hallucinogen.github.io/gogo-invoice/) diperiksa untuk pola interaksi, tanpa membaca source implementasinya atau menyalin aset. [Anti Slop](https://github.com/miqdadbadjuber/anti-slop) digunakan sebagai filter kualitas. Alasan desain tercatat di [DESIGN.md](DESIGN.md), hasil pemeriksaan di [QA.md](QA.md).
