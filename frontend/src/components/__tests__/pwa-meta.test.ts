import { readFileSync } from 'fs'
import { resolve } from 'path'

// Read the actual index.html from the project root (relative to this test file)
const indexHtml = readFileSync(
  resolve(__dirname, '../../../../index.html'),
  'utf-8'
)

describe('PWA iOS meta tags in index.html (PWA-05)', () => {
  it('has apple-mobile-web-app-capable meta tag', () => {
    expect(indexHtml).toContain('name="apple-mobile-web-app-capable"')
    expect(indexHtml).toContain('content="yes"')
  })

  it('has apple-mobile-web-app-status-bar-style meta tag', () => {
    expect(indexHtml).toContain('name="apple-mobile-web-app-status-bar-style"')
    expect(indexHtml).toContain('content="default"')
  })

  it('has apple-mobile-web-app-title meta tag with value Recibos', () => {
    expect(indexHtml).toContain('name="apple-mobile-web-app-title"')
    expect(indexHtml).toContain('content="Recibos"')
  })

  it('viewport meta includes viewport-fit=cover for iPhone notch', () => {
    expect(indexHtml).toContain('viewport-fit=cover')
  })

  it('no manual navigator.serviceWorker.register() inline script (vite-plugin-pwa handles registration)', () => {
    expect(indexHtml).not.toContain('navigator.serviceWorker.register')
  })
})
