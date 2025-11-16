import { useState, useEffect } from 'react'
import { 
  FiPackage, 
  FiTrendingUp, 
  FiTrendingDown, 
  FiAlertTriangle,
  FiInfo,
  FiCheckCircle,
  FiRefreshCw
} from 'react-icons/fi'
import api from '../utils/api'
import { useNotification } from '../contexts/NotificationContext'

export default function Dashboard() {
  const [stats, setStats] = useState({
    totalStock: 0,
    totalInitialStock: 0,
    incomingGoods: 0,
    outgoingGoods: 0,
    totalIncomingGoods: 0,
    totalOutgoingGoods: 0,
    calculatedStock: 0,
    stockConsistency: {
      isConsistent: true,
      difference: 0
    },
    topStockProducts: [],
    mostOutgoingProducts: [],
    outOfStockProducts: [],
    topOutOfStockProducts: []
  })
  const [loading, setLoading] = useState(true)
  const [recalculating, setRecalculating] = useState(false)
  const [period, setPeriod] = useState('all')
  const { showSuccess, showError } = useNotification()

  useEffect(() => {
    fetchStats()
  }, [period])

  const fetchStats = async () => {
    try {
      const response = await api.get(`/api/dashboard/stats?period=${period}`)
      setStats(response.data)
    } catch (error) {
      console.error('Error fetching stats:', error)
    } finally {
      setLoading(false)
    }
  }

  const handleRecalculateStock = async () => {
    if (!window.confirm('Apakah Anda yakin ingin menghitung ulang stok? Operasi ini akan memperbaiki data yang tidak konsisten.')) {
      return
    }

    setRecalculating(true)
    try {
      await api.post('/api/utils/recalculate-stock')
      showSuccess('Stok berhasil dihitung ulang')
      fetchStats() // Refresh stats after recalculation
    } catch (error) {
      showError(error.response?.data?.message || 'Gagal menghitung ulang stok')
    } finally {
      setRecalculating(false)
    }
  }

  const statCards = [
    {
      title: 'Total Stok Barang',
      value: stats.totalStock,
      icon: FiPackage,
      color: 'bg-blue-500',
      bgColor: 'bg-blue-50',
      subtitle: `Awal: ${stats.totalInitialStock}`
    },
    {
      title: 'Barang Masuk',
      value: stats.incomingGoods,
      icon: FiTrendingUp,
      color: 'bg-green-500',
      bgColor: 'bg-green-50',
      subtitle: period === 'all' ? `Total: ${stats.totalIncomingGoods}` : ''
    },
    {
      title: 'Barang Keluar',
      value: stats.outgoingGoods,
      icon: FiTrendingDown,
      color: 'bg-red-500',
      bgColor: 'bg-red-50',
      subtitle: period === 'all' ? `Total: ${stats.totalOutgoingGoods}` : ''
    },
    {
      title: 'Stok Habis',
      value: stats.outOfStockProducts ? stats.outOfStockProducts.length : 0,
      icon: FiAlertTriangle,
      color: 'bg-yellow-500',
      bgColor: 'bg-yellow-50'
    }
  ]

  if (loading) {
    return (
      <div className="flex justify-center items-center h-64">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary-500"></div>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      {/* Period Filter */}
      <div className="flex justify-between items-center">
        <h1 className="text-2xl font-bold text-gray-900">Dashboard</h1>
        <select
          value={period}
          onChange={(e) => setPeriod(e.target.value)}
          className="form-input w-auto"
        >
          <option value="all">Semua Waktu</option>
          <option value="today">Hari Ini</option>
          <option value="week">Minggu Ini</option>
          <option value="month">Bulan Ini</option>
          <option value="year">Tahun Ini</option>
        </select>
      </div>

      {/* Stock Consistency Warning */}
      {!stats.stockConsistency.isConsistent && (
        <div className="card bg-yellow-50 border-yellow-200">
          <div className="flex items-center justify-between">
            <div className="flex items-center">
              <FiAlertTriangle className="text-yellow-600 mr-3" size={24} />
              <div>
                <h3 className="text-lg font-semibold text-yellow-800">Peringatan Konsistensi Data</h3>
                <p className="text-yellow-700">
                  Total stok ({stats.totalStock}) tidak sesuai dengan perhitungan ({stats.calculatedStock}). 
                  Selisih: {stats.stockConsistency.difference} unit.
                </p>
                <p className="text-sm text-yellow-600 mt-1">
                  Gunakan fitur &ldquo;Recalculate Stock&rdquo; untuk memperbaiki data.
                </p>
              </div>
            </div>
            <button
              onClick={handleRecalculateStock}
              disabled={recalculating}
              className="btn btn-warning flex items-center"
            >
              <FiRefreshCw className={`mr-2 ${recalculating ? 'animate-spin' : ''}`} />
              {recalculating ? 'Menghitung...' : 'Hitung Ulang Stok'}
            </button>
          </div>
        </div>
      )}

      {/* Stock Consistency Success */}
      {stats.stockConsistency.isConsistent && period === 'all' && (
        <div className="card bg-green-50 border-green-200">
          <div className="flex items-center">
            <FiCheckCircle className="text-green-600 mr-3" size={24} />
            <div>
              <h3 className="text-lg font-semibold text-green-800">Data Konsisten</h3>
              <p className="text-green-700">
                Total stok sesuai dengan perhitungan: {stats.totalStock} unit
              </p>
            </div>
          </div>
        </div>
      )}

      {/* Stats Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        {statCards.map((card, index) => {
          const Icon = card.icon
          return (
            <div key={index} className={`card ${card.bgColor}`}>
              <div className="flex items-center">
                <div className={`p-3 rounded-full ${card.color}`}>
                  <Icon className="text-white" size={24} />
                </div>
                <div className="ml-4">
                  <p className="text-sm font-medium text-gray-600">{card.title}</p>
                  <p className="text-2xl font-bold text-gray-900">{card.value.toLocaleString()}</p>
                  {card.subtitle && (
                    <p className="text-xs text-gray-500">{card.subtitle}</p>
                  )}
                </div>
              </div>
            </div>
          )
        })}
      </div>

      {/* Stock Calculation Info */}
      {period === 'all' && (
        <div className="card bg-gray-50">
          <div className="flex items-start">
            <FiInfo className="text-gray-600 mr-3 mt-1" size={20} />
            <div>
              <h3 className="text-lg font-semibold text-gray-800 mb-2">Informasi Perhitungan Stok</h3>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4 text-sm">
                <div>
                  <p className="text-gray-600">Stok Awal:</p>
                  <p className="font-semibold">{stats.totalInitialStock.toLocaleString()} unit</p>
                </div>
                <div>
                  <p className="text-gray-600">Total Masuk:</p>
                  <p className="font-semibold text-green-600">+{stats.totalIncomingGoods.toLocaleString()} unit</p>
                </div>
                <div>
                  <p className="text-gray-600">Total Keluar:</p>
                  <p className="font-semibold text-red-600">-{stats.totalOutgoingGoods.toLocaleString()} unit</p>
                </div>
              </div>
              <div className="mt-3 pt-3 border-t border-gray-200">
                <p className="text-gray-600">Perhitungan:</p>
                <p className="font-semibold">
                  {stats.totalInitialStock} + {stats.totalIncomingGoods} - {stats.totalOutgoingGoods} = {stats.calculatedStock} unit
                </p>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Charts and Lists */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Top Stock Products */}
        <div className="card">
          <h3 className="text-lg font-semibold text-gray-900 mb-4">
            Top 5 Barang Stok Terbanyak
          </h3>
          <div className="space-y-3">
            {stats.topStockProducts && stats.topStockProducts.map((product, index) => (
              <div key={index} className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
                <div>
                  <p className="font-medium text-gray-900">{product.name}</p>
                  <p className="text-sm text-gray-600">{product.code}</p>
                </div>
                <span className="text-lg font-semibold text-primary-600">
                  {product.stock}
                </span>
              </div>
            ))}
          </div>
        </div>

        {/* Most Outgoing Products */}
        <div className="card">
          <h3 className="text-lg font-semibold text-gray-900 mb-4">
            Top 5 Barang Keluar Terbanyak
          </h3>
          <div className="space-y-3">
            {stats.mostOutgoingProducts && stats.mostOutgoingProducts.map((product, index) => (
              <div key={index} className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
                <div>
                  <p className="font-medium text-gray-900">{product.name}</p>
                  <p className="text-sm text-gray-600">{product.code}</p>
                </div>
                <span className="text-lg font-semibold text-red-600">
                  {product.total_out}
                </span>
              </div>
            ))}
          </div>
        </div>

        {/* Top 5 Barang Stok Habis Terbanyak */}
        <div className="card">
          <h3 className="text-lg font-semibold text-gray-900 mb-4 flex items-center">
            <FiAlertTriangle className="text-yellow-500 mr-2" />
            Top 5 Barang Stok Habis Terbanyak
          </h3>
          <div className="space-y-3">
            {stats.topOutOfStockProducts && stats.topOutOfStockProducts.length > 0 ? (
              stats.topOutOfStockProducts.map((product, index) => (
                <div key={index} className="flex items-center justify-between p-3 bg-red-50 rounded-lg border border-red-200">
                  <div>
                    <p className="font-medium text-gray-900">{product.name}</p>
                    <p className="text-sm text-gray-600">{product.code}</p>
                    <p className="text-xs text-red-600">Stok: {product.stock}</p>
                  </div>
                  <div className="text-right">
                    <span className="text-lg font-semibold text-red-600">
                      {product.total_outgoing}
                    </span>
                    <p className="text-xs text-gray-500">Total Keluar</p>
                  </div>
                </div>
              ))
            ) : (
              <div className="text-center py-4 text-gray-500">
                Tidak ada barang stok habis
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Out of Stock Products */}
      {stats.outOfStockProducts && stats.outOfStockProducts.length > 0 && (
        <div className="card">
          <h3 className="text-lg font-semibold text-gray-900 mb-4 flex items-center">
            <FiAlertTriangle className="text-yellow-500 mr-2" />
            Barang Stok Habis
          </h3>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {stats.outOfStockProducts.map((product, index) => (
              <div key={index} className="p-4 border border-yellow-200 bg-yellow-50 rounded-lg">
                <p className="font-medium text-gray-900">{product.name}</p>
                <p className="text-sm text-gray-600">{product.code}</p>
                <p className="text-sm text-red-600 font-medium">Stok: {product.stock}</p>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  )
}