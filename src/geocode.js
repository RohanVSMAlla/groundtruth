// coordinates → country name (free, no API key)
export async function getCountry(lat, lng) {
  try {
    const res = await fetch(
      `https://nominatim.openstreetmap.org/reverse?lat=${lat}&lon=${lng}&format=json&zoom=3`
    )
    const data = await res.json()
    return data.address?.country || null
  } catch {
    return null
  }
}