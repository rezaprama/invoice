# Invoice Studio

Invoice generator untuk freelancer dan bisnis kecil. Bahasa Indonesia dan Inggris, tanpa akun atau backend.

**Website:** [rezaprama.github.io/invoice](https://rezaprama.github.io/invoice/)

## Fitur

- Editor dan pratinjau A4 langsung. Navigasi bagian mempercepat perpindahan ke item atau pembayaran; ponsel punya tab Edit dan Pratinjau. Bahasa dokumen dapat diatur terpisah dari bahasa antarmuka.
- Tambah, duplikat, urutkan, hapus, dan urungkan penghapusan item. Mendukung jumlah pecahan, satuan bebas, dan contoh item desain/pengembangan/jasa.
- Hitungan desimal dengan `decimal.js`, pembulatan per baris, diskon persen/nominal, pajak, biaya tambahan, pembayaran sebagian, dan kelebihan bayar.
- 22 mata uang. IDR, JPY, KRW, dan VND ditampilkan tanpa pecahan; BHD dan KWD dengan tiga desimal; mata uang lainnya dua desimal. Mengganti mata uang tidak mengonversi kurs.
- PDF A4 berupa teks, bukan screenshot. Tabel berlanjut ke halaman berikutnya dengan header berulang dan nomor halaman. Mesin PDF dan font baru dimuat saat unduh pertama. Cetak melalui browser juga tersedia.
- Logo PNG/JPG diproses lokal, profil pengirim yang dapat digunakan kembali, dan penomoran otomatis tahunan yang tetap dapat diedit.
- Riwayat otomatis dengan pencarian pengirim/klien/nomor, filter status, duplikasi, penghapusan, dan Undo.
- Status draf/terkirim/lunas. Status terkirim adalah penanda manual; aplikasi tidak mengirim email. Lunas menghitung seluruh total sebagai sudah dibayar.
- Cadangan JSON, validasi impor, dan penggabungan yang mempertahankan data lokal. Invoice/profil dengan ID sama dilewati, bukan ditimpa.
- Tema terang, gelap, atau sistem; fokus keyboard; label formulir; dialog native; reduced-motion.
- Peringatan kegagalan penyimpanan, pemulihan data rusak, dan deteksi perubahan antartab.

## Data dan perhitungan

Invoice dan profil tersimpan pada `localStorage` browser ini, dengan kunci `rezaprama:invoice-studio:v1`. Data tidak dikirim ke server oleh aplikasi. Hosting GitHub Pages tetap menerima permintaan untuk memuat aset website. Tidak ada analytics, akun, maupun layanan font pihak ketiga.

Menghapus data browser, mengganti profil browser, atau berganti perangkat membuat data lokal tidak tersedia. Gunakan **Cadangan → Ekspor cadangan** secara berkala. Cadangan mencakup detail klien dan pembayaran, jadi simpan secara pribadi. Jika kuota browser penuh, perubahan tetap ada dalam sesi dan dapat diekspor; banner memperingatkan bahwa autosave gagal.

Pajak dihitung atas subtotal setelah diskon. Biaya tambahan tidak dikenai pajak. Tarif pajak diisi pengguna; aplikasi tidak menentukan kewajiban atau tarif pajak. Nilai negatif tidak diterima. Setiap baris dibulatkan ke presisi mata uang, kemudian dijumlahkan. Status lunas menggantikan nilai pembayaran sebagian dalam hitungan; kembali ke draf/terkirim memulihkan nilai yang diisi sebelumnya.

Batas per cadangan: 1.000 invoice, 500 item per invoice, 100 profil, dan ukuran file impor 20 MB. Kapasitas penyimpanan aktual bergantung pada browser. Logo maksimal 2 MB saat diunggah, dikecilkan hingga 360 px, dan dibatasi 200 KB setelah diproses. Font PDF Noto Sans mendukung karakter Latin, Yunani, dan Kiril; aksara lain memerlukan font tambahan. Emoji tidak menjadi bagian dari cakupan font PDF.

Aplikasi tidak menyediakan sinkronisasi antarperangkat, perhitungan kurs, email otomatis, atau mode offline yang dijamin. Pratinjau layar mengikuti isi dokumen; pemisahan halaman final mengikuti mesin PDF atau dialog cetak browser.

## Pengembangan

Node.js 24 dan npm.

```sh
npm ci
npm run dev
npm run check
npx playwright install chromium
npm run test:e2e
```

Alamat lokal: `http://127.0.0.1:5173/invoice/`. Pada Windows, tes browser memakai Chrome terpasang. Pada CI/Linux, tes memakai Chromium Playwright. Browser tests mencakup workflow desktop dan viewport ponsel, bukan tes Safari/iOS native.

Stack: React, TypeScript, Vite, CSS native, Phosphor Icons, Zod, Decimal.js, jsPDF, dan jsPDF-AutoTable. Font DM Sans dan Noto Sans disajikan dari origin yang sama. Tidak memerlukan environment secret atau API key.

## Deployment

`vite.config.ts` memakai `base: '/invoice/'`. Di GitHub, aktifkan **Settings → Pages → Source: GitHub Actions**. Push ke `main` menjalankan tes unit, typecheck, build, dan tes browser sebelum deploy. Pull request menjalankan verifikasi tanpa publikasi.

Workflow: [deploy.yml](.github/workflows/deploy.yml). Hasil build ada di `dist/`. Deployment menggunakan permission `pages: write` dan OIDC pada job deployment saja.

## Clean-room dan desain

Implementasi dimulai dari direktori kosong. README publik [gogo-invoice](https://github.com/hallucinogen/gogo-invoice) dan [Midday](https://github.com/midday-ai/midday) dibaca untuk memahami kebutuhan produk. Tidak menyalin source implementasi, CSS, screenshot, atau aset kedua proyek tersebut.

[Anti Slop](https://github.com/miqdadbadjuber/anti-slop) dipakai sebagai panduan kualitas UI. Arah desain dan alasan pilihan visual dicatat pada [DESIGN.md](DESIGN.md), dengan hasil pemeriksaan pada [QA.md](QA.md). Tidak ada klaim pembandingan kecepatan dengan proyek referensi tanpa benchmark yang setara.
