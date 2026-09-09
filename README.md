# 🎬 UnduhVideo - Pengunduh Video & Musik YouTube Ramah Ortu

Aplikasi web modern, simpel, dan sangat ramah untuk orang tua atau keluarga yang ingin mendownload video YouTube (MP4) atau musik (MP3) secara cepat. Didesain dengan antarmuka yang bersih, tombol besar, fitur **"Tempel Link"** otomatis 1-klik, dan dukungan **PWA** agar bisa di-install langsung ke layar utama HP seperti aplikasi asli.

---

## ✨ Fitur Unggulan

1. **Ramah Orang Tua & Keluarga**:
   - Teks Bahasa Indonesia yang jelas dan mudah dipahami.
   - Tombol **"📋 Tempel Link"** (Clipboard API 1x klik, tidak perlu repot tahan lama / long-press di HP).
   - 2 Tombol Aksi Raksasa:
     - 🎬 **Download Video (MP4)**: Otomatis memilih kualitas terbaik (1080p/720p) lengkap dengan audio.
     - 🎵 **Download Musik (MP3)**: Otomatis mengonversi audio ke MP3 jernih kompatibel untuk semua HP & speaker mobil.
2. **Umpan Balik Real-time (Live Progress)**:
   - Menampilkan persentase unduhan, kecepatan download, sisa waktu, dan status proses secara langsung.
   - File otomatis langsung terunduh ke perangkat saat selesai.
3. **PWA (Progressive Web App)**:
   - Dapat dipasang (*Add to Home Screen*) di Android & iPhone dengan ikon aplikasi resmi.
4. **Perlindungan Sumber Daya VPS**:
   - *Concurrency Limiter*: Membatasi maksimal 3 unduhan bersamaan agar CPU VPS tidak overload.
   - *Auto-cleanup*: File temporer otomatis terhapus setelah diunduh atau setelah 15 menit agar kapasitas disk VPS tetap bersih.
   - *Duration Cap*: Batas maksimal durasi video 3 jam untuk mencegah file raksasa.
   - Dukungan `cookies.txt` opsional untuk mitigasi blokir bot YouTube.

---

## 🚀 Cara Deploy di VPS (Docker & Docker Compose)

Aplikasi ini telah dikemas lengkap dengan **Node.js 20**, **ffmpeg**, dan **yt-dlp terbaru** dalam kontainer Docker. Anda tidak perlu repot menginstall Python atau ffmpeg di OS host VPS Anda.

### 1. Salin Proyek ke VPS
```bash
git clone <repo-anda> video-downloader
cd video-downloader
```

### 2. Jalankan dengan Docker Compose
```bash
docker compose up -d --build
```
Aplikasi akan langsung aktif di port **3000** (`http://ip-vps-anda:3000`).

### 3. (Opsional) Sambungkan ke Nginx & Domain HTTPS
Jika Anda memiliki domain (misal: `unduh.keluarga.com`), gunakan reverse proxy Nginx sederhana:
```nginx
server {
    server_name unduh.keluarga.com;

    location / {
        proxy_pass http://127.0.0.1:3000;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host $host;
        proxy_cache_bypass $http_upgrade;

        # Agar download file besar tidak terpotong
        client_max_body_size 500M;
        proxy_read_timeout 600s;
        proxy_send_timeout 600s;
    }
}
```
Lalu pasang SSL gratis via Certbot:
```bash
sudo certbot --nginx -d unduh.keluarga.com
```

---

## 📱 Cara Memasang di HP Orang Tua (PWA)

1. Buka link web di browser Chrome (Android) atau Safari (iPhone).
2. Di Android: Tekan tombol **"Pasang di HP"** di bagian atas web atau menu titik tiga browser > **Tambahkan ke Layar Utama** (Install App).
3. Di iPhone: Tekan ikon **Share** (kotak panah ke atas) > **Add to Home Screen**.
4. Ikon aplikasi **UnduhVideo** akan muncul di layar depan HP orang tua seperti aplikasi Play Store!

---

## 🍪 Solusi Jika YouTube Memblokir IP VPS (Cookie YouTube)

Jika sewaktu-waktu YouTube menampilkan pesan *"Sign in to confirm you're not a bot"*, Anda cukup mengekstrak cookie YouTube dari browser Anda:
1. Gunakan ekstensi browser seperti **"Get cookies.txt LOCALLY"** di Chrome/Firefox.
2. Simpan hasilnya sebagai file `cookies.txt` di folder proyek di VPS.
3. Buka `docker-compose.yml`, aktifkan baris volume:
   ```yaml
   volumes:
     - ./downloads:/app/downloads
     - ./cookies.txt:/app/cookies.txt:ro
   ```
4. Restart container: `docker compose up -d`

---

## 💻 Menjalankan Secara Lokal untuk Development

```bash
# Install dependensi
npm install

# Jalankan server dev
npm run dev
```
Buka browser di `http://localhost:3000`.
