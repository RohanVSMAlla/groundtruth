// Open Location Code (Plus Codes) - self-contained generator
const ALPHABET = '23456789CFGHJMPQRVWX'
const SEP = '+'

export async function coordsToWords(lat, lng) {
  try {
    return encodePlusCode(lat, lng)
  } catch {
    return null
  }
}

function encodePlusCode(latitude, longitude) {
  latitude = Math.min(Math.max(latitude, -90), 90)
  longitude = ((longitude + 180) % 360 + 360) % 360 - 180
  if (latitude === 90) latitude -= 0.0001

  let lat = latitude + 90
  let lng = longitude + 180
  const RES = [20.0, 1.0, 0.05, 0.0025, 0.000125]
  let code = ''

  for (let i = 0; i < 5; i++) {
    const latDigit = Math.floor(lat / RES[i])
    const lngDigit = Math.floor(lng / RES[i])
    lat -= latDigit * RES[i]
    lng -= lngDigit * RES[i]
    code += ALPHABET[latDigit] + ALPHABET[lngDigit]
    if (code.length === 8) code += SEP
  }
  return code
}

export async function wordsToCoords(code) {
  try {
    const clean = code.replace(SEP, '').trim().toUpperCase()
    if (clean.length < 10) return null
    let lat = -90, lng = -180
    const RES = [20.0, 1.0, 0.05, 0.0025, 0.000125]
    for (let i = 0; i < 5; i++) {
      const latIdx = ALPHABET.indexOf(clean[i * 2])
      const lngIdx = ALPHABET.indexOf(clean[i * 2 + 1])
      if (latIdx < 0 || lngIdx < 0) break
      lat += latIdx * RES[i]
      lng += lngIdx * RES[i]
    }
    return { lat: lat + RES[4] / 2, lng: lng + RES[4] / 2 }
  } catch {
    return null
  }
}