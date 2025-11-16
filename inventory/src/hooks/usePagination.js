import { useState, useEffect, useRef, useCallback } from 'react'

export function usePagination(fetchFunction, initialParams = {}) {
  const [data, setData] = useState([])
  const [loading, setLoading] = useState(true)
  const [pagination, setPagination] = useState({
    page: 1,
    limit: 10,
    total: 0,
    totalPages: 0
  })
  const [params, setParams] = useState(initialParams)
  const isInitialMount = useRef(true)
  const paramsRef = useRef(params)
  const fetchFunctionRef = useRef(fetchFunction)

  // Keep refs in sync
  useEffect(() => {
    paramsRef.current = params
    fetchFunctionRef.current = fetchFunction
  }, [params, fetchFunction])

  const fetchData = useCallback(async (newParams = {}) => {
    setLoading(true)
    try {
      const queryParams = { ...paramsRef.current, ...newParams }
      const response = await fetchFunctionRef.current(queryParams)
      
      // Handle different response structures
      let responseData, responsePagination
      
      if (response && response.data) {
        // Check if response has nested data structure (API standard)
        if (response.data.data && response.data.pagination) {
          responseData = response.data.data
          responsePagination = response.data.pagination
        } else if (response.data.items && response.data.pagination) {
          responseData = response.data.items
          responsePagination = response.data.pagination
        } else if (Array.isArray(response.data)) {
          // Direct array response
          responseData = response.data
          responsePagination = {
            page: 1,
            limit: response.data.length,
            total: response.data.length,
            totalPages: 1
          }
        } else {
          // Fallback: assume response.data is the data
          responseData = response.data
          responsePagination = {
            page: 1,
            limit: 10,
            total: response.data.length || 0,
            totalPages: 1
          }
        }
      } else {
        // Direct response (fallback)
        responseData = response || []
        responsePagination = {
          page: 1,
          limit: 10,
          total: response.length || 0,
          totalPages: 1
        }
      }
      
      setData(responseData || [])
      setPagination(responsePagination || {
        page: 1,
        limit: 10,
        total: 0,
        totalPages: 0
      })
    } catch (error) {
      console.error('Error fetching data:', error)
      setData([])
      setPagination({
        page: 1,
        limit: 10,
        total: 0,
        totalPages: 0
      })
    } finally {
      setLoading(false)
    }
  }, [])

  const goToPage = useCallback((page) => {
    const newParams = { ...paramsRef.current, page }
    setParams(newParams)
    fetchData(newParams)
  }, [])

  const updateParams = useCallback((newParams) => {
    const updatedParams = { ...paramsRef.current, ...newParams, page: 1 }
    setParams(updatedParams)
    fetchData(updatedParams)
  }, [])

  const refresh = useCallback(() => {
    fetchData(paramsRef.current)
  }, [])

  useEffect(() => {
    if (isInitialMount.current) {
      isInitialMount.current = false
      fetchData(initialParams)
    }
  }, [])

  return {
    data,
    loading,
    pagination,
    goToPage,
    updateParams,
    refresh
  }
}