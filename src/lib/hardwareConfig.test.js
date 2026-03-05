import { describe, it, expect } from 'vitest'
import {
  HARDWARE_CONFIG_SCHEMA,
  getDefaultConfig,
  HARDWARE_PRESETS,
  normalizeConfig,
  hardwareConfigToText,
  validateConfig,
  isEmptyConfig,
  hwConfigDiffLines
} from './hardwareConfig'

describe('hardwareConfig', () => {
  describe('HARDWARE_CONFIG_SCHEMA', () => {
    it('has radio, frequencyBand, visualNavigation, gps', () => {
      expect(HARDWARE_CONFIG_SCHEMA).toHaveProperty('radio')
      expect(HARDWARE_CONFIG_SCHEMA).toHaveProperty('frequencyBand')
      expect(HARDWARE_CONFIG_SCHEMA).toHaveProperty('visualNavigation')
      expect(HARDWARE_CONFIG_SCHEMA).toHaveProperty('gps')
    })
    it('radio has h30, silvus, radioNor, custom (no gpsSim)', () => {
      expect(HARDWARE_CONFIG_SCHEMA.radio).toHaveProperty('h30')
      expect(HARDWARE_CONFIG_SCHEMA.radio.h30).toEqual({ enabled: false })
      expect(HARDWARE_CONFIG_SCHEMA.radio.silvus).toEqual({ enabled: false })
      expect(HARDWARE_CONFIG_SCHEMA.radio.radioNor).toEqual({ enabled: false })
      expect(HARDWARE_CONFIG_SCHEMA.radio.custom).toEqual({ enabled: false, value: '' })
      expect(HARDWARE_CONFIG_SCHEMA.radio).not.toHaveProperty('gpsSim')
      expect(HARDWARE_CONFIG_SCHEMA.radio).not.toHaveProperty('boson')
    })
    it('visualNavigation has yes, no, boson (3 checkboxes)', () => {
      expect(HARDWARE_CONFIG_SCHEMA.visualNavigation).toEqual({
        yes: false,
        no: false,
        boson: false
      })
    })
    it('frequencyBand has s, c, l, custom', () => {
      expect(HARDWARE_CONFIG_SCHEMA.frequencyBand).toEqual({ s: false, c: false, l: false, custom: '' })
    })
    it('gps has holyBro, hardenGps, arcXL, arcX20, custom', () => {
      expect(HARDWARE_CONFIG_SCHEMA.gps).toHaveProperty('holyBro')
      expect(HARDWARE_CONFIG_SCHEMA.gps).toHaveProperty('hardenGps')
      expect(HARDWARE_CONFIG_SCHEMA.gps).toHaveProperty('arcXL')
      expect(HARDWARE_CONFIG_SCHEMA.gps).toHaveProperty('arcX20')
      expect(HARDWARE_CONFIG_SCHEMA.gps).toHaveProperty('custom')
      expect(HARDWARE_CONFIG_SCHEMA.gps.holyBro).toEqual({ enabled: false })
      expect(HARDWARE_CONFIG_SCHEMA.gps.arcXL).toEqual({ enabled: false })
      expect(HARDWARE_CONFIG_SCHEMA.gps.arcX20).toEqual({ enabled: false })
    })
  })

  describe('getDefaultConfig', () => {
    it('returns a deep clone of schema', () => {
      const c = getDefaultConfig()
      expect(c).toEqual(HARDWARE_CONFIG_SCHEMA)
      expect(c).not.toBe(HARDWARE_CONFIG_SCHEMA)
      c.radio.h30.enabled = true
      expect(HARDWARE_CONFIG_SCHEMA.radio.h30.enabled).toBe(false)
    })
  })

  describe('HARDWARE_PRESETS', () => {
    it('has standard, silvusC, radioNorL, minimal', () => {
      expect(HARDWARE_PRESETS.standard.name).toBe('Standard')
      expect(HARDWARE_PRESETS.silvusC.name).toBe('Silvus C-Band')
      expect(HARDWARE_PRESETS.radioNorL.name).toBe('RadioNor L-Band')
      expect(HARDWARE_PRESETS.minimal.name).toBe('Minimal')
    })
    it('standard preset has H30, S-Band, Visual Nav Yes, HolyBro', () => {
      const c = HARDWARE_PRESETS.standard.config
      expect(c.radio.h30.enabled).toBe(true)
      expect(c.frequencyBand.s).toBe(true)
      expect(c.visualNavigation.yes).toBe(true)
      expect(c.gps.holyBro.enabled).toBe(true)
    })
  })

  describe('normalizeConfig', () => {
    it('returns default for null/undefined', () => {
      expect(normalizeConfig(null)).toEqual(getDefaultConfig())
      expect(normalizeConfig(undefined)).toEqual(getDefaultConfig())
    })
    it('handles legacy { raw: "text" }', () => {
      const c = normalizeConfig({ raw: 'Skynode SN-1024' })
      expect(c.legacy_text).toBe('Skynode SN-1024')
      expect(c.radio).toBeDefined()
    })
    it('handles legacy { legacy_text: "text" }', () => {
      const c = normalizeConfig({ legacy_text: 'Here3' })
      expect(c.legacy_text).toBe('Here3')
    })
    it('merges partial structured config', () => {
      const c = normalizeConfig({ radio: { h30: { enabled: true } } })
      expect(c.radio.h30.enabled).toBe(true)
      expect(c.frequencyBand.s).toBe(false)
    })
    it('maps legacy visualNavigation.enabled to yes/no', () => {
      const c = normalizeConfig({ visualNavigation: { enabled: true } })
      expect(c.visualNavigation.yes).toBe(true)
      expect(c.visualNavigation.no).toBe(false)
      expect(c.visualNavigation.boson).toBe(false)
      const cNo = normalizeConfig({ visualNavigation: { enabled: false } })
      expect(cNo.visualNavigation.yes).toBe(false)
      expect(cNo.visualNavigation.no).toBe(true)
    })
    it('maps legacy visualNavigation.mode to yes/no/boson', () => {
      const c = normalizeConfig({ visualNavigation: { mode: 'yes', boson: { enabled: true } } })
      expect(c.visualNavigation.yes).toBe(true)
      expect(c.visualNavigation.no).toBe(false)
      expect(c.visualNavigation.boson).toBe(true)
    })
  })

  describe('hardwareConfigToText', () => {
    it('returns empty for null/empty', () => {
      expect(hardwareConfigToText(null)).toBe('')
      expect(hardwareConfigToText(getDefaultConfig())).toBe('')
    })
    it('formats legacy_text only', () => {
      expect(hardwareConfigToText({ legacy_text: 'Skynode' })).toContain('Skynode')
    })
    it('formats radio and frequency', () => {
      const c = getDefaultConfig()
      c.radio.h30.enabled = true
      c.frequencyBand.s = true
      const text = hardwareConfigToText(c)
      expect(text).toContain('H30')
      expect(text).toContain('S-Band')
    })
    it('formats preset standard', () => {
      const text = hardwareConfigToText(HARDWARE_PRESETS.standard.config)
      expect(text).toContain('Radio: H30')
      expect(text).toContain('Freq: S-Band')
      expect(text).toContain('Visual Nav: Yes')
      expect(text).toContain('GPS: Holybro')
    })
    it('formats Visual Nav Yes and Boson (3 checkboxes)', () => {
      const c = getDefaultConfig()
      c.visualNavigation.yes = true
      c.visualNavigation.boson = true
      const text = hardwareConfigToText(c)
      expect(text).toContain('Visual Nav: Yes, Boson')
      expect(text).not.toMatch(/Radio:.*Boson/)
    })
    it('formats Visual Nav No', () => {
      const cNo = getDefaultConfig()
      cNo.visualNavigation.no = true
      expect(hardwareConfigToText(cNo)).toContain('Visual Nav: No')
    })
    it('displays ARC_XL for arcXL and Arc (x20) for arcX20 GPS options', () => {
      const c = getDefaultConfig()
      c.gps.arcXL.enabled = true
      expect(hardwareConfigToText(c)).toContain('ARC_XL')
      const c2 = getDefaultConfig()
      c2.gps.arcX20.enabled = true
      expect(hardwareConfigToText(c2)).toContain('Arc (x20)')
    })
  })

  describe('validateConfig', () => {
    it('valid for null or empty object', () => {
      expect(validateConfig(null).valid).toBe(true)
      expect(validateConfig({}).valid).toBe(true)
    })
    it('valid for proper schema', () => {
      expect(validateConfig(getDefaultConfig()).valid).toBe(true)
    })
    it('invalid when radio is not object', () => {
      const r = validateConfig({ radio: 'x' })
      expect(r.valid).toBe(false)
      expect(r.errors).toContain('radio must be an object')
    })
  })

  describe('isEmptyConfig', () => {
    it('true for null or default config', () => {
      expect(isEmptyConfig(null)).toBe(true)
      expect(isEmptyConfig(getDefaultConfig())).toBe(true)
    })
    it('false when any option set', () => {
      const c = getDefaultConfig()
      c.radio.h30.enabled = true
      expect(isEmptyConfig(c)).toBe(false)
    })
    it('false when legacy_text set', () => {
      expect(isEmptyConfig({ legacy_text: 'x' })).toBe(false)
    })
  })

  describe('hwConfigDiffLines', () => {
    it('returns empty when configs are equal', () => {
      const c = getDefaultConfig()
      expect(hwConfigDiffLines(c, c)).toEqual([])
      expect(hwConfigDiffLines(null, getDefaultConfig())).toEqual([])
    })
    it('returns Radio line when radio enabled changes', () => {
      const oldC = getDefaultConfig()
      const newC = getDefaultConfig()
      newC.radio.h30.enabled = true
      const lines = hwConfigDiffLines(oldC, newC)
      expect(lines).toContain('Radio: H30 disabled → enabled')
    })
    it('returns GPS and Frequency lines for preset change', () => {
      const lines = hwConfigDiffLines(HARDWARE_PRESETS.standard.config, HARDWARE_PRESETS.silvusC.config)
      expect(lines.some(l => l.startsWith('Radio:'))).toBe(true)
      expect(lines.some(l => l.startsWith('Frequency:'))).toBe(true)
      expect(lines.some(l => l.startsWith('GPS:'))).toBe(true)
    })
    it('handles null/undefined old or new', () => {
      const c = getDefaultConfig()
      c.radio.h30.enabled = true
      const lines = hwConfigDiffLines(null, c)
      expect(lines.length).toBeGreaterThan(0)
      expect(lines.some(l => l.includes('H30'))).toBe(true)
    })
  })
})
