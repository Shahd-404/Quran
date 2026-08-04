import fs from 'node:fs'
import { describe, expect, it } from 'vitest'

const activity = fs.readFileSync(
  'android-twa/app/src/main/java/com/shahd404/wird/OfflineEntryActivity.java',
  'utf8',
)
const manifest = fs.readFileSync(
  'android-twa/app/src/main/AndroidManifest.xml',
  'utf8',
)

describe('Android TWA first-launch offline fallback', () => {
  it('routes returning users to the TWA so downloaded web content remains available', () => {
    expect(activity).toContain('if (hasOnlineLaunch())')
    expect(activity).toContain('launchTwa()')
    expect(activity).toContain('HAS_ONLINE_LAUNCH')
  })

  it('uses a branded Arabic first-launch fallback and the narrow network permission', () => {
    expect(activity).toContain('يلزم الاتصال بالإنترنت عند فتح ورد لأول مرة')
    expect(manifest).toContain('android.permission.ACCESS_NETWORK_STATE')
    expect(manifest).toContain('android:name="OfflineEntryActivity"')
    expect(manifest).toContain('android.intent.category.LAUNCHER')
  })
})
