import axios from 'axios'

// Uses env variable in production, falls back to render URL, then localhost
export const BASE = import.meta.env.VITE_API_URL
  || 'https://freebeat-1.onrender.com'

console.log('🔧 API BASE:', BASE)

export const searchTracks = (q) =>
  axios.get(`${BASE}/search`, { params: { q } }).then(r => r.data)

export const getStream = async (id) => {
  const data = await axios.get(`${BASE}/stream`, { params: { id } }).then(r => r.data)
  if (data.url && data.url.startsWith('/')) {
    data.url = `${BASE}${data.url}`
  }
  console.log('🎵 Stream URL:', data.url)
  return data
}