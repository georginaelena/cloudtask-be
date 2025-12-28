# Deployment Guide – Backend (CloudTask API)

Dokumen ini menjelaskan langkah-langkah deployment **backend CloudTask** pada server berbasis **Ubuntu Linux** menggunakan **Node.js**, **Express**, dan **PM2**.

---

## Persiapan Server Backend

Pastikan server menggunakan **Ubuntu Server**.

Update package:

```bash
sudo apt update && sudo apt upgrade -y
```

Install dependency dasar:

```bash
sudo apt install -y git curl
```

Install Node.js (versi 18):

```bash
curl -fsSL https://deb.nodesource.com/setup_18.x | sudo -E bash -
sudo apt install -y nodejs
```

Cek instalasi:

```bash
node -v
npm -v
```

---

## Clone Repository Backend

```bash
git clone https://github.com/georginaelena/cloudtask-be
cd cloudtask-backend
```

Install dependency backend:

```bash
npm install
```

---

## Konfigurasi Environment Backend

Buat file `.env`:

```bash
nano .env
```

Isi dengan konfigurasi database:

```env
PORT=8080

DB_HOST=<IP_DATABASE>
DB_PORT=5432
DB_NAME=cloudtask
DB_USER=cloudtask_user
DB_PASSWORD=<password_db>

JWT_SECRET=<secret_key>
```

> **Catatan:**
> Backend akan menggunakan konfigurasi ini untuk terhubung ke database PostgreSQL.

---

## Menjalankan Backend

Jalankan backend untuk testing:

```bash
node server.js
```

Jika berhasil, backend akan berjalan di:

```
http://<BACKEND_IP>:8080
```

---

## Menjalankan Backend dengan PM2 (Production)

Install PM2:

```bash
sudo npm install -g pm2
```

Jalankan backend:

```bash
pm2 start server.js --name cloudtask-api
pm2 save
pm2 startup
```

Cek status:

```bash
pm2 status
```

Backend siap digunakan oleh frontend.

---

# Deployment Guide – Database (PostgreSQL)

Dokumen ini menjelaskan langkah-langkah deployment **database CloudTask** menggunakan **PostgreSQL** pada server Ubuntu Linux.

---

## Persiapan Server Database

Pastikan server menggunakan **Ubuntu Server**.

Update package:

```bash
sudo apt update && sudo apt upgrade -y
```

Install PostgreSQL:

```bash
sudo apt install -y postgresql postgresql-contrib
```

Cek status PostgreSQL:

```bash
sudo systemctl status postgresql
```

---

## Pembuatan Database dan User

Masuk ke PostgreSQL:

```bash
sudo -u postgres psql
```

Buat database dan user:

```sql
CREATE DATABASE cloudtask;
CREATE USER cloudtask_user WITH PASSWORD 'cloudtask_password';
GRANT ALL PRIVILEGES ON DATABASE cloudtask TO cloudtask_user;
\q
```

---

## Konfigurasi Akses Database

Edit file konfigurasi:

```bash
sudo nano /etc/postgresql/*/main/postgresql.conf
```

Pastikan:

```conf
listen_addresses = '*'
```

Edit `pg_hba.conf`:

```bash
sudo nano /etc/postgresql/*/main/pg_hba.conf
```

Tambahkan:

```conf
host cloudtask cloudtask_user BACKEND_IP/32 md5
```

Restart PostgreSQL:

```bash
sudo systemctl restart postgresql
```

---

## Pembuatan Struktur Tabel

Masuk ke database:

```bash
sudo -u postgres psql
\c cloudtask
```

Jalankan SQL berikut:

```sql
CREATE TABLE workspaces (
  id SERIAL PRIMARY KEY,
  name VARCHAR(100),
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE users (
  id SERIAL PRIMARY KEY,
  email VARCHAR(100),
  password VARCHAR(255),
  workspace_id INTEGER REFERENCES workspaces(id)
);

CREATE TABLE tasks (
  id SERIAL PRIMARY KEY,
  title VARCHAR(100),
  status VARCHAR(50),
  workspace_id INTEGER REFERENCES workspaces(id),
  user_id INTEGER REFERENCES users(id),
  notes TEXT
);
```

---

## Verifikasi Database

```sql
\dt
\d workspaces
\d users
\d tasks
```

Jika tabel tampil, database siap digunakan oleh backend.

---
