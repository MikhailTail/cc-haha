import { describe, expect, test } from 'bun:test'
import { hostDetector } from '@opentelemetry/resources'

// Mirrors preload.ts so this test also runs when the preload is not applied.
const globals = globalThis as typeof globalThis & {
  MACRO?: Record<string, string>
}
globals.MACRO = {
  VERSION: '0.0.0-test',
  PACKAGE_URL: 'local',
  NATIVE_PACKAGE_URL: 'local',
  BUILD_TIME: '',
  FEEDBACK_CHANNEL: 'local',
  VERSION_CHANGELOG: '',
  ISSUES_EXPLAINER: '',
  ...globals.MACRO,
}

// hostDetector.detect() also runs getMachineId(), which shells out to
// `REG.exe QUERY HKEY_LOCAL_MACHINE\SOFTWARE\Microsoft\Cryptography /v MachineGuid`
// through child_process.exec with no windowsHide. The desktop sidecar and the
// CLI child it spawns both run without a console, so Windows allocates a
// visible console window for that probe on every session start — the black
// window that flashes when opening the app, a new chat, or a restored chat.
// Telemetry only ever kept host.arch from that detector, so it now reads
// os.arch() directly and the probe must not come back.
describe('telemetry resource detection', () => {
  test('initializeTelemetry does not run the host detector', async () => {
    const originalDetect = hostDetector.detect
    let detectCalls = 0
    hostDetector.detect = (...args: Parameters<typeof originalDetect>) => {
      detectCalls++
      return originalDetect.apply(hostDetector, args)
    }

    try {
      const { initializeTelemetry } = await import('./instrumentation.js')
      await initializeTelemetry()
    } finally {
      hostDetector.detect = originalDetect
    }

    expect(detectCalls).toBe(0)
  })
})
