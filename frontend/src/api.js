import axios from 'axios'

export const BASE = import.meta.env.VITE_API_URL || 'http://localhost:8080'

export const searchTracks = (q) =>
  axios.get(`${BASE}/search`, { params: { q } }).then(r => r.data)

export const getStream = async (id) => {
  const data = await axios.get(`${BASE}/stream`, { params: { id } }).then(r => r.data)
  if (data.url && data.url.startsWith('/')) {
    data.url = `${BASE}${data.url}`
  }
  return data
}