import axios from 'axios'

// Hardcoded for now to confirm deployment works
// We'll switch back to env variable once confirmed
export const BASE = 'https://freebeat.onrender.com'

export const searchTracks = (q) =>
  axios.get(`${BASE}/search`, { params: { q } }).then(r => r.data)

export const getStream = async (id) => {
  const data = await axios.get(`${BASE}/stream`, { params: { id } }).then(r => r.data)
  if (data.url && data.url.startsWith('/')) {
    data.url = `${BASE}${data.url}`
  }
  return data
}