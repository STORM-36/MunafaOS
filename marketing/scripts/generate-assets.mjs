import sharp from 'sharp'
import { mkdirSync } from 'fs'
import { fileURLToPath } from 'url'
import path from 'path'

const __dirname = path.dirname(fileURLToPath(import.meta.url))
const publicDir = path.join(__dirname, '..', 'public')
mkdirSync(publicDir, { recursive: true })

// Exact icon-mark SVG, copied literally from marketing/src/components/MunafaLogo.jsx
// (navy rx=22 tile, white left leg, gold diagonal + gold arrowhead)
const iconMarkInner = `
  <rect width="100" height="100" rx="22" fill="#0F1F3D" />
  <polyline points="28,70 28,32 50,55" stroke="#FFFFFF" stroke-width="9" stroke-linecap="round" stroke-linejoin="round" />
  <polyline points="50,55 72,28" stroke="#E8B84B" stroke-width="9" stroke-linecap="round" stroke-linejoin="round" />
  <polyline points="58,28 72,28 72,42" stroke="#E8B84B" stroke-width="9" stroke-linecap="round" stroke-linejoin="round" />
`

function iconSvg(size) {
  return `<svg width="${size}" height="${size}" viewBox="0 0 100 100" fill="none" xmlns="http://www.w3.org/2000/svg">${iconMarkInner}</svg>`
}

async function generateIconAssets() {
  const svg512 = Buffer.from(iconSvg(512))
  await sharp(svg512).png().toFile(path.join(publicDir, 'favicon.png'))
  console.log('favicon.png (512x512) written')

  const svg32 = Buffer.from(iconSvg(32))
  await sharp(svg32).png().toFile(path.join(publicDir, 'favicon-32.png'))
  console.log('favicon-32.png (32x32) written')

  const svg180 = Buffer.from(iconSvg(180))
  await sharp(svg180).png().toFile(path.join(publicDir, 'apple-touch-icon.png'))
  console.log('apple-touch-icon.png (180x180) written')
}

async function generateOgImage() {
  const width = 1200
  const height = 630
  const iconSize = 120
  const iconX = 220
  const iconY = 190

  // Icon mark, translated/scaled into place within the OG canvas coordinate space
  const iconGroup = `
    <g transform="translate(${iconX}, ${iconY}) scale(${iconSize / 100})">
      ${iconMarkInner}
    </g>
  `

  const textX = iconX + iconSize + 32

  const svg = `
    <svg width="${width}" height="${height}" viewBox="0 0 ${width} ${height}" xmlns="http://www.w3.org/2000/svg">
      <rect width="${width}" height="${height}" fill="#0F1F3D" />
      ${iconGroup}
      <text x="${textX}" y="${iconY + iconSize * 0.62}" font-family="Poppins, 'Segoe UI', sans-serif" font-weight="700" font-size="72" letter-spacing="-1.5">
        <tspan fill="#FFFFFF">Munafa</tspan><tspan fill="#E8B84B">OS</tspan>
      </text>
      <text x="${width / 2}" y="${iconY + iconSize + 90}" text-anchor="middle" font-family="Manrope, 'Segoe UI', sans-serif" font-weight="600" font-size="30" fill="#FFFFFF" fill-opacity="0.85">
        The Profit Operating System for Bangladesh's F-Commerce
      </text>
      <text x="${width / 2}" y="${height - 48}" text-anchor="middle" font-family="Manrope, 'Segoe UI', sans-serif" font-weight="600" font-size="22" letter-spacing="1" fill="#E8B84B" fill-opacity="0.9">
        munafaos.com
      </text>
    </svg>
  `

  await sharp(Buffer.from(svg)).png().toFile(path.join(publicDir, 'og-image.png'))
  console.log('og-image.png (1200x630) written')
}

await generateIconAssets()
await generateOgImage()
console.log('All assets generated in', publicDir)
