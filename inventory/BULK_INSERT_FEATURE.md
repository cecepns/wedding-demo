# Fitur Bulk Insert Produk dari Order

## Overview
Fitur ini memungkinkan admin untuk melakukan bulk insert produk dari data order yang sudah ada. Admin dapat memilih produk-produk dari list order dan menyimpannya ke database produk secara massal.

## Implementasi

### 1. Backend API Endpoint (`backend/server.js`)
**Endpoint:** `POST /api/products/bulk-insert`

**Deskripsi:** Menerima array ID order dan membuat produk baru dari data order tersebut.

**Request Body:**
```json
{
  "orderIds": [1, 2, 3, 4]
}
```

**Response:**
```json
{
  "message": "Bulk insert completed: 3 success, 1 failed",
  "successCount": 3,
  "errorCount": 1,
  "errors": [
    {
      "code": "PRD001",
      "name": "Produk A",
      "reason": "Kode barang sudah ada"
    }
  ]
}
```

**Fitur:**
- Validasi apakah kode produk sudah ada
- Generate barcode_id otomatis dari product_code
- Insert produk dengan mapping:
  - `product_code` → `code`
  - `product_name` → `name`
  - `category` → `category`
  - `brand` → `brand`
  - `quantity` → `initial_stock` dan `current_stock`
- Logging activity untuk setiap produk yang berhasil di-insert
- Error handling untuk setiap produk (tidak gagal semua jika ada yang error)

### 2. Frontend Components (`src/pages/Products.jsx`)

#### State Management
- `showBulkInsertModal`: Boolean untuk menampilkan/menyembunyikan modal
- `orders`: Array data order dari API
- `selectedOrders`: Array kode produk yang dipilih
- `loadingOrders`: Boolean loading state saat fetch orders
- `orderSearchTerm`: String untuk search orders

#### Fungsi Utama

**`fetchOrdersForBulkInsert()`**
- Mengambil data order summary dari API
- Limit 100 order untuk dipilih
- Support search/filter

**`handleOpenBulkInsert()`**
- Membuka modal bulk insert
- Reset selected orders
- Fetch data orders

**`handleOrderToggle(productCode)`**
- Toggle selection produk individual
- Add/remove dari array selectedOrders

**`handleSelectAll()`**
- Select/deselect semua produk sekaligus

**`handleBulkInsertSubmit()`**
- Validasi minimal 1 produk dipilih
- Fetch full order data untuk mendapatkan order IDs
- Call API bulk insert dengan order IDs
- Handle response (success/error)
- Refresh products list
- Close modal

#### UI Components

**Button "Bulk Insert dari Order"**
- Posisi: Di header Products page, sebelah kiri button "Tambah Produk"
- Icon: FiDownload
- Warna: btn-success (hijau)

**Modal Bulk Insert**
- Full-width modal dengan max-width 4xl
- Max height 90vh dengan scroll
- Sticky table header

**Fitur Modal:**
1. **Search Bar**
   - Search produk dari order
   - Debounce 500ms

2. **Info Box**
   - Penjelasan fitur bulk insert
   - Informasi data yang akan disimpan

3. **Select All Checkbox**
   - Di atas tabel
   - Menampilkan jumlah yang dipilih

4. **Tabel Orders**
   - Checkbox per row
   - Kolom: Kode, Nama Barang, Kategori, Merk, Total Qty, Total Order
   - Row highlight (bg-blue-50) untuk yang dipilih
   - Sticky header saat scroll

5. **Footer**
   - Info jumlah produk dipilih
   - Button Batal
   - Button Simpan (disabled jika tidak ada yang dipilih)

## Cara Penggunaan

1. **Buka halaman Products**
   - Navigate ke menu "Data Produk"

2. **Klik button "Bulk Insert dari Order"**
   - Modal akan terbuka menampilkan list order

3. **Pilih produk yang akan di-insert**
   - Gunakan search untuk filter produk
   - Klik checkbox pada produk yang diinginkan
   - Atau gunakan "Pilih Semua" untuk select semua

4. **Submit**
   - Klik button "Simpan X Produk"
   - System akan memproses dan menampilkan hasil

5. **Review hasil**
   - Notifikasi sukses dengan jumlah berhasil/gagal
   - Jika ada error, akan ditampilkan detail errornya

## Validasi dan Error Handling

### Backend
- ✅ Validasi orderIds tidak boleh kosong
- ✅ Check apakah order exists
- ✅ Check duplikasi kode produk
- ✅ Individual error handling (tidak stop semua jika ada yang error)
- ✅ Return detail error per produk

### Frontend
- ✅ Validasi minimal 1 produk dipilih
- ✅ Loading state saat fetch dan submit
- ✅ Disable button saat loading
- ✅ Error message jelas dan informatif
- ✅ Auto refresh products list setelah sukses

## Data Mapping

| Order Field     | Product Field    | Notes                          |
|-----------------|------------------|--------------------------------|
| product_code    | code             | Primary identifier             |
| product_name    | name             | Product name                   |
| category        | category         | Product category               |
| brand           | brand            | Product brand                  |
| quantity        | initial_stock    | Set as initial stock           |
| quantity        | current_stock    | Set as current stock           |
| product_code    | barcode_id       | Auto-generated from code       |
| resi_number     | -                | Not saved (displayed only)     |
| price           | -                | Not saved (products have no price) |

## Keamanan
- ✅ Endpoint dilindungi dengan `authenticateToken`
- ✅ Hanya role `manager` yang bisa akses
- ✅ Activity logging untuk audit trail

## Testing Checklist
- [ ] Modal terbuka dengan benar
- [ ] Data order tampil dengan benar
- [ ] Search berfungsi
- [ ] Select/deselect individual berfungsi
- [ ] Select all berfungsi
- [ ] Submit berhasil insert produk
- [ ] Error handling untuk kode duplikat
- [ ] Notifikasi sukses/error tampil
- [ ] Products list refresh setelah insert
- [ ] Activity log tercatat

## Screenshots / Demo
(Untuk diisi setelah testing)

## Future Improvements
1. Tambah filter by date range untuk orders
2. Tambah preview data sebelum insert
3. Support untuk update quantity jika produk sudah ada (optional)
4. Export/import dari Excel untuk bulk operations
5. Batch processing untuk order dalam jumlah besar
