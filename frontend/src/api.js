import axios from 'axios'

const BASE = 'http://localhost:8080'

export const searchTracks = (q) =>
  axios.get(`${BASE}/search`, { params: { q } }).then(r => r.data)

export const getStream = (id) =>
  axios.get(`${BASE}/stream`, { params: { id } }).then(r => r.data)