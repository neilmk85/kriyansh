import axios from 'axios'

const api = axios.create({ baseURL: '/api/v1' })

// Attach JWT to every request
api.interceptors.request.use(config => {
  const token = localStorage.getItem('salonos_token')
  if (token) config.headers.Authorization = `Bearer ${token}`
  return config
})

// Auto-logout on 401, but NOT for the login endpoint itself
api.interceptors.response.use(
  res => res,
  err => {
    if (err.response?.status === 401 && !err.config?.url?.includes('/auth/login')) {
      localStorage.removeItem('salonos_token')
      window.location.href = '/login'
    }
    return Promise.reject(err)
  }
)

export default api
