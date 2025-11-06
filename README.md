# Server-RISA

Server-RISA adalah **backend API komprehensif** untuk platform kesehatan seksual dan reproduksi **RISA (Remaja Indonesia SehAt)**, dibangun menggunakan **Node.js** dan **Express.js**.
Server ini menyediakan berbagai **RESTful API** untuk manajemen user, mini-game, konten edukatif, pemesanan vaksin, serta sistem reward dan misi.

**Server produksi:** [https://server-risa.vercel.app](https://server-risa.vercel.app)

---

## Fitur Utama

* **Manajemen User**: Otentikasi dan otorisasi dengan token JWT
* **Mini-Game Edukatif**: Game interaktif seperti Drag & Drop dan Memo Card
* **Pelacakan Skor**: Analisis performa bermain dan umpan balik berbasis AI
* **Umpan Balik Real-Time**: Analisis kesalahan dari hasil permainan edukatif
* **Sistem Artikel**: Konten edukatif lengkap dengan fitur komentar
* **Sistem Misi**: Tugas harian dan pelacakan progres user
* **Sistem Reward**: Penukaran voucher dengan ekonomi berbasis stiker
* **Pemesanan Vaksin**: Pemilihan laboratorium dan penjadwalan vaksinasi

---

## Teknologi yang Digunakan

| Kategori          | Teknologi                                        |
| ----------------- | ------------------------------------------------ |
| Runtime           | Node.js                                          |
| Framework         | Express.js                                       |
| Basis Data        | PostgreSQL (melalui Supabase)                    |
| ORM               | Prisma                                           |
| Autentikasi       | JSON Web Token (JWT)                             |
| Enkripsi Password | bcryptjs                                         |
| CORS              | Diaktifkan untuk mendukung cross-origin requests |

---

## Prasyarat

* Node.js versi 14 atau lebih tinggi
* npm atau yarn
* Database PostgreSQL (disarankan menggunakan **Supabase**)

---

## Instalasi

1. **Clone repositori:**

   ```bash
   git clone <repository-url>
   cd server-risa
   ```

2. **Instal dependensi:**

   ```bash
   npm install
   ```

3. **Atur variabel lingkungan.**
   Buat file `.env` di direktori utama dengan isi berikut:

   ```env
   PORT=5000
   SUPABASE_URL=your_supabase_database_url
   DIRECT_URL=your_supabase_direct_url
   JWT_SECRET=your_jwt_secret_key
   ```

4. **Inisialisasi database:**

   ```bash
   npx prisma generate
   npx prisma db push
   ```

---

## Penggunaan

### Mode Pengembangan

```bash
npm run dev
```

### Mode Produksi

```bash
npm start
```

Server akan berjalan pada port yang ditentukan dalam file `.env` (default: **5000**).
Endpoint publik dapat diakses di: [https://server-risa.vercel.app](https://server-risa.vercel.app)

---

## Daftar Endpoint API

### Autentikasi

* `POST /api/users/register` – Registrasi user baru
* `POST /api/users/login` – Login user

### Artikel

* `GET /api/article` – Mendapatkan semua artikel
* `POST /api/article` – Menambahkan artikel baru
* `GET /api/article/:id` – Mendapatkan artikel berdasarkan ID
* `PUT /api/article/:id` – Memperbarui artikel
* `DELETE /api/article/:id` – Menghapus artikel

### Komentar

* `GET /api/article/:id/comment` – Mendapatkan komentar pada artikel
* `POST /api/article/:id/comment` – Menambahkan komentar pada artikel

### Pemesanan Vaksin

* `GET /api/labs` – Mendapatkan daftar laboratorium
* `GET /api/vaccine` – Mendapatkan jenis vaksin yang tersedia
* `POST /api/booking` – Membuat pemesanan vaksin
* `GET /api/booking` – Melihat riwayat pemesanan vaksin

### Mini-Game

* `GET /api/mini-games` – Mendapatkan daftar mini-game
* `GET /api/memo-cards` – Mendapatkan data game Memo Card
* `GET /api/drag-n-drop` – Mendapatkan data game Drag & Drop
* `POST /api/scores` – Mengirimkan skor hasil permainan

### Misi dan Reward

* `GET /api/missions` – Mendapatkan daftar misi aktif
* `POST /api/missions/:id/claim` – Mengklaim hadiah dari misi
* `GET /api/reward` – Mendapatkan daftar voucher atau hadiah
* `POST /api/reward/claim` – Menukarkan voucher

### Analisis Permainan

* `POST /api/game-feedback` – Mengirimkan umpan balik untuk analisis AI

---

## Database

Struktur database menggunakan **Prisma ORM**, dengan model utama sebagai berikut:

* **Users** – Data user dan saldo stiker
* **Articles** – Konten edukatif
* **Comments** – Diskusi artikel
* **Labs** – Daftar laboratorium vaksinasi
* **Vaccine_Types** – Jenis vaksin yang tersedia
* **Booking_Vaccine** – Data pemesanan vaksin
* **Mission** – Misi dan tugas harian
* **Mission_Log** – Pelacakan progress misi
* **Voucher** – Daftar hadiah atau voucher
* **Mini_Games** – Definisi permainan
* **Scores** – Catatan hasil permainan

---

## Deployment

Server ini dikonfigurasi untuk **deployment di Vercel**.

**Deployment aktif:** [https://server-risa.vercel.app](https://server-risa.vercel.app)

---

## Kontribusi

1. Fork repositori ini
2. Buat branch fitur baru

   ```bash
   git checkout -b fitur/fitur-baru
   ```
3. Commit perubahan

   ```bash
   git commit -m "Menambahkan fitur baru"
   ```
4. Push branch

   ```bash
   git push origin fitur/fitur-baru
   ```
5. Buat Pull Request

