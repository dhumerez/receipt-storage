import { renderHook, act } from '@testing-library/react'
import { usePwaInstall } from '../usePwaInstall'

// jsdom does not implement matchMedia — provide a factory helper
function mockMatchMedia(standalone: boolean) {
  Object.defineProperty(window, 'matchMedia', {
    writable: true,
    value: (query: string) => ({
      matches: standalone && query === '(display-mode: standalone)',
      media: query,
      onchange: null,
      addListener: () => {},
      removeListener: () => {},
      addEventListener: () => {},
      removeEventListener: () => {},
      dispatchEvent: () => false,
    }),
  })
}

describe('usePwaInstall', () => {
  beforeEach(() => {
    mockMatchMedia(false)
  })

  it('isInstalled=true and canInstall=false when display-mode is standalone', () => {
    mockMatchMedia(true)
    const { result } = renderHook(() => usePwaInstall())
    expect(result.current.isInstalled).toBe(true)
    expect(result.current.canInstall).toBe(false)
  })

  it('canInstall becomes true when beforeinstallprompt fires', () => {
    const { result } = renderHook(() => usePwaInstall())
    expect(result.current.canInstall).toBe(false)

    const mockPrompt = vi.fn().mockResolvedValue(undefined)
    const mockUserChoice = Promise.resolve({ outcome: 'accepted' as const })
    const promptEvent = Object.assign(new Event('beforeinstallprompt'), {
      prompt: mockPrompt,
      userChoice: mockUserChoice,
    })

    act(() => {
      window.dispatchEvent(promptEvent)
    })

    expect(result.current.canInstall).toBe(true)
  })

  it('canInstall becomes false and isInstalled true when appinstalled fires', () => {
    const { result } = renderHook(() => usePwaInstall())

    const promptEvent = Object.assign(new Event('beforeinstallprompt'), {
      prompt: vi.fn(),
      userChoice: Promise.resolve({ outcome: 'accepted' as const }),
    })
    act(() => { window.dispatchEvent(promptEvent) })
    expect(result.current.canInstall).toBe(true)

    act(() => { window.dispatchEvent(new Event('appinstalled')) })
    expect(result.current.isInstalled).toBe(true)
    expect(result.current.canInstall).toBe(false)
  })

  it('promptInstall calls prompt() and clears installEvent on accepted', async () => {
    const mockPrompt = vi.fn().mockResolvedValue(undefined)
    const mockUserChoice = Promise.resolve({ outcome: 'accepted' as const })
    const promptEvent = Object.assign(new Event('beforeinstallprompt'), {
      prompt: mockPrompt,
      userChoice: mockUserChoice,
    })

    const { result } = renderHook(() => usePwaInstall())
    act(() => { window.dispatchEvent(promptEvent) })

    await act(async () => { await result.current.promptInstall() })

    expect(mockPrompt).toHaveBeenCalledTimes(1)
    expect(result.current.canInstall).toBe(false)
  })

  it('promptInstall is a no-op when installEvent is null', async () => {
    const { result } = renderHook(() => usePwaInstall())
    // Should not throw
    await act(async () => { await result.current.promptInstall() })
    expect(result.current.canInstall).toBe(false)
  })
})
