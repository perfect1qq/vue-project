import request from '../utils/request'

const login = (data, config = {}) =>
  request.post('/api/login', data, { authRedirect: false, skipCancel: true, ...config })

const register = (data, config = {}) =>
  request.post('/api/register', data, { authRedirect: false, skipCancel: true, ...config })

const getProfile = (config = {}) =>
  request.get('/api/profile', {
    disableCacheBust: true,
    skipCancel: true,
    silent: true,
    authRedirect: false,
    ...config
  })

const logout = (config = {}) =>
  request.post('/api/logout', null, { authRedirect: false, skipCancel: true, silent: true, ...config })

export default {
  login,
  register,
  getProfile,
  logout
}
