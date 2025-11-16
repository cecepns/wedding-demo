import { useState, useEffect, useCallback, useRef } from 'react'
import { FiPlus, FiTrendingUp, FiSearch, FiEdit2, FiTrash2, FiAlertTriangle } from 'react-icons/fi'
import api from '../utils/api'
import { useNotification } from '../contexts/NotificationContext'
import { useAuth } from '../contexts/AuthContext'
import ProductSelect from '../components/ProductSelect'
import { usePagination } from '../hooks/usePagination'
import Pagination from '../components/Pagination'

export default function IncomingGoods() {
  const [loading, setLoading] = useState(false)
  const [showForm, setShowForm] = useState(false)
  const [editingItem, setEditingItem] = useState(null)
  const [searchTerm, setSearchTerm] = useState('')
  const [sortBy, setSortBy] = useState('date') // Default sort by date
  const [formData, setFormData] = useState({
    product_code: '',
    product_name: '',
    category: '',
    brand: '',
    resi_number: '',
    quantity: '',
    platform: '',
    date: new Date().toISOString().split('T')[0]
  })
  const [resiCheckLoading, setResiCheckLoading] = useState(false)
  const [resiDuplicate, setResiDuplicate] = useState(null)
  const [productsData, setProductsData] = useState({})
  const { showSuccess, showError } = useNotification()
  const { hasRole } = useAuth()

  // Add refs for debouncing
  const resiCheckTimeoutRef = useRef(null)

  // Fetch function for pagination
  const fetchIncomingGoods = useCallback(async (params) => {
    const response = await api.get('/api/incoming-goods', { params })
    return response
  }, [])

  // Use pagination hook
  const {
    data: incomingGoods,
    loading: dataLoading,
    pagination,
    goToPage,
    updateParams,
    refresh
  } = usePagination(fetchIncomingGoods)

  // Fetch products data for barcode information
  const fetchProductsData = useCallback(async () => {
    try {
      const response = await api.get('/api/products/all')
      const products = response.data.data || []
      const productsMap = {}
      products.forEach(product => {
        productsMap[product.code] = product
      })
      setProductsData(productsMap)
    } catch (error) {
      console.error('Error fetching products data:', error)
    }
  }, [])

  // Fetch products data when component mounts
  useEffect(() => {
    fetchProductsData()
  }, [fetchProductsData])

  // Cleanup timeout on unmount
  useEffect(() => {
    return () => {
      if (resiCheckTimeoutRef.current) {
        clearTimeout(resiCheckTimeoutRef.current)
      }
    }
  }, [])

  // Update search params
  useEffect(() => {
    const timeoutId = setTimeout(() => {
      const params = { search: searchTerm }
      if (sortBy === 'brand') {
        params.sort = 'brand'
      } else if (sortBy === 'brand_desc') {
        params.sort = 'brand_desc'
      }
      updateParams(params)
    }, 500) // Debounce search

    return () => clearTimeout(timeoutId)
  }, [searchTerm, sortBy])

  // Function to check for duplicate resi numbers with debouncing
  const checkDuplicateResi = async (resiNumber, excludeId = null) => {
    if (!resiNumber || resiNumber.trim() === '') {
      setResiDuplicate(null)
      return false
    }
    
    setResiCheckLoading(true)
    try {
      const params = new URLSearchParams()
      if (excludeId) params.append('excludeId', excludeId)
      
      const response = await api.get(`/api/incoming-goods/check-resi/${resiNumber}?${params}`)
      const isDuplicate = response.data.isDuplicate
      setResiDuplicate(isDuplicate ? response.data.duplicates : null)
      return isDuplicate
    } catch (error) {
      console.error('Error checking resi number:', error)
      return false
    } finally {
      setResiCheckLoading(false)
    }
  }

  // Debounced resi check function
  const debouncedCheckResi = useCallback((resiNumber, excludeId = null) => {
    // Clear existing timeout
    if (resiCheckTimeoutRef.current) {
      clearTimeout(resiCheckTimeoutRef.current)
    }
    
    // Set new timeout
    resiCheckTimeoutRef.current = setTimeout(() => {
      checkDuplicateResi(resiNumber, excludeId)
    }, 500)
  }, [])

  // Function to get duplicate count for a resi number
  const getDuplicateCount = (resiNumber) => {
    if (!resiNumber) return 0
    return incomingGoods.filter(item => item.resi_number === resiNumber).length
  }

  // Function to get barcode ID for a product
  const getBarcodeId = (productCode) => {
    const product = productsData[productCode]
    return product ? product.barcode_id : 'N/A'
  }

  const handleProductChange = (product) => {
    if (product) {
      setFormData({
        ...formData,
        product_code: product.code,
        product_name: product.name,
        category: product.category,
        brand: product.brand
      })
    } else {
      setFormData({
        ...formData,
        product_code: '',
        product_name: '',
        category: '',
        brand: ''
      })
    }
  }

  // Function to get today's date in YYYY-MM-DD format
  const getTodayDate = () => {
    const today = new Date()
    const year = today.getFullYear()
    const month = String(today.getMonth() + 1).padStart(2, '0')
    const day = String(today.getDate()).padStart(2, '0')
    return `${year}-${month}-${day}`
  }

  // Function to check if date is in the past
  const isPastDate = (dateString) => {
    if (!dateString) return false
    const inputDate = new Date(dateString)
    const today = new Date()
    today.setHours(0, 0, 0, 0)
    inputDate.setHours(0, 0, 0, 0)
    return inputDate < today
  }

  // Function to check if item can be edited (only managers)
  const canEditItem = () => {
    return hasRole('manager')
  }

  const getEditTooltip = () => {
    const isManager = hasRole('manager')
    
    if (!isManager) {
      return 'Hanya manager yang dapat mengedit data'
    }
    return 'Edit'
  }

  const getDeleteTooltip = () => {
    const isManager = hasRole('manager')
    
    if (!isManager) {
      return 'Hanya manager yang dapat menghapus data'
    }
    return 'Hapus'
  }

  const handleEdit = (item) => {
    if (!canEditItem()) {
      showError('Hanya manager yang dapat mengedit data')
      return
    }
    
    // Fix timezone issue by using local date string
    const formatDateForInput = (dateString) => {
      if (!dateString) return new Date().toISOString().split('T')[0]
      const date = new Date(dateString)
      const year = date.getFullYear()
      const month = String(date.getMonth() + 1).padStart(2, '0')
      const day = String(date.getDate()).padStart(2, '0')
      return `${year}-${month}-${day}`
    }
    
    setEditingItem(item)
    setFormData({
      product_code: item.product_code,
      product_name: item.product_name,
      category: item.category,
      brand: item.brand,
      resi_number: item.resi_number,
      quantity: item.quantity,
      platform: item.platform,
      date: formatDateForInput(item.date)
    })
    setShowForm(true)
  }

  const handleDelete = async (item) => {
    if (!canEditItem()) {
      showError('Hanya manager yang dapat menghapus data')
      return
    }
    
    if (!window.confirm('Apakah Anda yakin ingin menghapus data ini?')) {
      return
    }

    try {
      await api.delete(`/api/incoming-goods/${item.id}`)
      showSuccess('Data berhasil dihapus')
      refresh()
    } catch (error) {
      showError(error.response?.data?.message || 'Gagal menghapus data')
    }
  }

  const handleSubmit = async (e) => {
    e.preventDefault()
    
    // Validate quantity
    if (!formData.quantity || parseInt(formData.quantity) <= 0) {
      showError('Jumlah harus lebih dari 0')
      return
    }
    
    // Check for duplicate resi number (exclude current item if editing)
    const isDuplicate = await checkDuplicateResi(formData.resi_number, editingItem?.id)
    if (isDuplicate) {
      showError('Nomor resi sudah digunakan sebelumnya!')
      return
    }
    
    setLoading(true)

    try {
      if (editingItem) {
        // Update existing record
        await api.put(`/api/incoming-goods/${editingItem.id}`, formData)
        showSuccess('Data berhasil diperbarui')
      } else {
        // Create new record
        await api.post('/api/incoming-goods', formData)
        showSuccess('Barang masuk berhasil ditambahkan')
      }
      resetForm()
      refresh()
    } catch (error) {
      showError(error.response?.data?.message || 'Gagal menyimpan data')
    } finally {
      setLoading(false)
    }
  }

  const resetForm = () => {
    setFormData({
      product_code: '',
      product_name: '',
      category: '',
      brand: '',
      resi_number: '',
      quantity: '',
      platform: '',
      date: new Date().toISOString().split('T')[0]
    })
    setEditingItem(null)
    setShowForm(false)
  }

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <h1 className="text-2xl font-bold text-gray-900">Barang Masuk</h1>
        <button
          onClick={() => setShowForm(true)}
          className="btn btn-success flex items-center"
        >
          <FiPlus className="mr-2" />
          Tambah Barang Masuk
        </button>
      </div>

      {/* Search and Sort */}
      <div className="card">
        <div className="flex flex-col sm:flex-row gap-4">
          <div className="relative flex-1">
            <FiSearch className="absolute left-3 top-3 text-gray-400" size={20} />
            <input
              type="text"
              placeholder="Cari barang masuk..."
              className="form-input pl-10"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
            />
          </div>
          <div className="flex items-center gap-2">
            <label className="text-sm text-gray-600 whitespace-nowrap">Urutkan:</label>
            <select
              className="form-select"
              value={sortBy}
              onChange={(e) => setSortBy(e.target.value)}
            >
              <option value="date">Tanggal (Terbaru)</option>
              <option value="brand">Merek (A-Z)</option>
              <option value="brand_desc">Merek (Z-A)</option>
            </select>
          </div>
        </div>
      </div>

      {/* Form Modal */}
      {showForm && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg p-6 w-full max-w-md mx-4 max-h-screen overflow-y-auto">
            <h3 className="text-lg font-semibold mb-4">
              {editingItem ? 'Edit Barang Masuk' : 'Tambah Barang Masuk'}
            </h3>
            
            <form onSubmit={handleSubmit} className="space-y-4">
              <div>
                <label className="form-label">Tanggal</label>
                <input
                  type="date"
                  className={`form-input ${hasRole('admin') && isPastDate(formData.date) ? 'border-red-500 bg-red-50' : ''}`}
                  value={formData.date}
                  onChange={(e) => {
                    const selectedDate = e.target.value
                    if (hasRole('admin') && isPastDate(selectedDate)) {
                      showError('Tidak dapat memasukkan tanggal kemarin atau tanggal lampau')
                      return
                    }
                    setFormData({...formData, date: selectedDate})
                  }}
                  min={hasRole('admin') ? getTodayDate() : undefined}
                  required
                />
              </div>
              
              <div>
                <label className="form-label">Pilih Produk</label>
                <ProductSelect
                  value={formData.product_code}
                  onChange={handleProductChange}
                  placeholder="Cari dan pilih produk..."
                  disableOutOfStock={false}
                />
              </div>
              
              <div>
                <label className="form-label">Nama Barang</label>
                <input
                  type="text"
                  className="form-input"
                  value={formData.product_name}
                  readOnly
                />
              </div>
              
              <div>
                <label className="form-label">Kategori</label>
                <input
                  type="text"
                  className="form-input"
                  value={formData.category}
                  readOnly
                />
              </div>
              
              <div>
                <label className="form-label">Merk</label>
                <input
                  type="text"
                  className="form-input"
                  value={formData.brand}
                  readOnly
                />
              </div>
              
              <div>
                <label className="form-label">Nomor Resi</label>
                <div className="relative">
                  <input
                    type="text"
                    className={`form-input ${resiDuplicate ? 'border-red-500 bg-red-50' : ''}`}
                    value={formData.resi_number}
                    onChange={(e) => {
                      setFormData({...formData, resi_number: e.target.value})
                      // Check for duplicates when user types with debouncing
                      if (e.target.value.trim()) {
                        debouncedCheckResi(e.target.value, editingItem?.id)
                      } else {
                        setResiDuplicate(null)
                      }
                    }}
                    required
                  />
                  {resiCheckLoading && (
                    <div className="absolute right-3 top-1/2 transform -translate-y-1/2">
                      <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-primary-500"></div>
                    </div>
                  )}
                  {resiDuplicate && (
                    <div className="absolute right-3 top-1/2 transform -translate-y-1/2">
                      <FiAlertTriangle className="text-red-500" size={20} />
                    </div>
                  )}
                </div>
                {resiDuplicate && (
                  <p className="text-sm text-red-600 mt-1 flex items-center">
                    <FiAlertTriangle className="mr-1" size={14} />
                    Nomor resi ini sudah digunakan sebelumnya!
                  </p>
                )}
              </div>
              
              <div>
                <label className="form-label">Jumlah</label>
                <input
                  type="number"
                  className="form-input"
                  value={formData.quantity}
                  onChange={(e) => {
                    const value = e.target.value
                    // Prevent 0 and negative values
                    if (value === '' || (parseInt(value) > 0)) {
                      setFormData({...formData, quantity: value})
                    }
                  }}
                  min="1"
                  required
                />
              </div>
              
              <div>
                <label className="form-label">Platform</label>
                <input
                  type="text"
                  className="form-input"
                  value={formData.platform}
                  onChange={(e) => setFormData({...formData, platform: e.target.value})}
                  placeholder="Contoh: Tokopedia, Shopee, dll"
                  required
                />
              </div>
              
              <div className="flex justify-end space-x-3 pt-4">
                <button
                  type="button"
                  onClick={resetForm}
                  className="btn btn-secondary"
                >
                  Batal
                </button>
                <button
                  type="submit"
                  disabled={loading || resiDuplicate}
                  className="btn btn-success"
                >
                  {loading ? 'Menyimpan...' : (editingItem ? 'Update' : 'Simpan')}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Incoming Goods Table */}
      <div className="card">
        {dataLoading ? (
          <div className="flex justify-center items-center h-64">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary-500"></div>
          </div>
        ) : (
          <>
            <div className="overflow-x-auto">
              <table className="table">
                <thead>
                  <tr>
                    <th>Tanggal</th>
                    <th>Barcode</th>
                    <th>Kode Barang</th>
                    <th>Nama Barang</th>
                    <th>Kategori</th>
                    <th>Merk</th>
                    <th>Nomor Resi</th>
                    <th>Jumlah</th>
                    <th>Platform</th>
                    <th>Aksi</th>
                  </tr>
                </thead>
                <tbody>
                  {incomingGoods.map((item) => {
                    const isDuplicate = getDuplicateCount(item.resi_number) > 1
                    const canEdit = canEditItem()
                    return (
                      <tr 
                        key={item.id} 
                        className={isDuplicate ? 'bg-red-50 border-l-4 border-l-red-500' : ''}
                      >
                        <td>{new Date(item.date).toLocaleDateString('id-ID')}</td>
                        <td>{getBarcodeId(item.product_code)}</td>
                        <td>{item.product_code}</td>
                        <td>{item.product_name}</td>
                        <td>{item.category}</td>
                        <td>{item.brand}</td>
                        <td>
                          <div className="flex items-center space-x-2">
                            <span className={isDuplicate ? 'text-red-700 font-medium' : ''}>
                              {item.resi_number}
                            </span>
                            {isDuplicate && (
                              <span className="px-2 py-1 bg-red-100 text-red-800 rounded-full text-xs font-medium flex items-center">
                                <FiAlertTriangle className="mr-1" size={12} />
                                Duplikat
                              </span>
                            )}
                          </div>
                        </td>
                        <td>
                          <span className="px-2 py-1 bg-green-100 text-green-800 rounded-full text-sm font-medium">
                            +{item.quantity}
                          </span>
                        </td>
                        <td>{item.platform}</td>
                        <td>
                          <div className="flex space-x-2 items-center">
                            <button
                              onClick={() => handleEdit(item)}
                              disabled={!canEdit}
                              className={`rounded-lg transition-colors ${
                                canEdit 
                                  ? 'text-blue-600 hover:bg-blue-50 hover:text-blue-700' 
                                  : 'text-gray-400 cursor-not-allowed'
                              }`}
                              title={getEditTooltip()}
                            >
                              <FiEdit2 size={16} />
                            </button>
                            <button
                              onClick={() => handleDelete(item)}
                              disabled={!canEdit}
                              className={`rounded-lg transition-colors ${
                                canEdit 
                                  ? 'text-red-600 hover:bg-red-50 hover:text-red-700' 
                                  : 'text-gray-400 cursor-not-allowed'
                              }`}
                              title={getDeleteTooltip()}
                            >
                              <FiTrash2 size={16} />
                            </button>
                          </div>
                        </td>
                      </tr>
                    )
                  })}
                </tbody>
              </table>
              
              {incomingGoods.length === 0 && (
                <div className="text-center py-8">
                  <FiTrendingUp className="mx-auto text-gray-400 mb-4" size={48} />
                  <p className="text-gray-500">Tidak ada data barang masuk</p>
                </div>
              )}
            </div>

            {/* Pagination */}
            <div className="mt-4 flex flex-col sm:flex-row justify-between items-center gap-4">
              {/* Items per page selector */}
              <div className="flex items-center gap-2">
                <label className="text-sm text-gray-600">Tampilkan:</label>
                <select
                  className="form-select text-sm"
                  value={pagination.limit}
                  onChange={(e) => {
                    updateParams({
                      limit: parseInt(e.target.value),
                      page: 1,
                    });
                  }}
                >
                  <option value={10}>10</option>
                  <option value={20}>20</option>
                  <option value={50}>50</option>
                </select>
                <span className="text-sm text-gray-600">
                  dari {pagination.total} item
                </span>
              </div>

              {/* Pagination */}
              {pagination.totalPages > 1 && (
                <Pagination
                  currentPage={pagination.page}
                  totalPages={pagination.totalPages}
                  totalItems={pagination.total}
                  itemsPerPage={pagination.limit}
                  onPageChange={goToPage}
                />
              )}
            </div>
          </>
        )}
      </div>
    </div>
  )
}