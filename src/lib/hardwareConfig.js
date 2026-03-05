/**
 * Hardware configuration schema and helpers for DeltaQuad fleet.
 * Used by vehicles and snapshotted in bookings (immutable at booking time).
 */

/**
 * @typedef {Object} HardwareConfig
 * @property {Object} [radio]
 * @property {Object} [frequencyBand]
 * @property {Object} [visualNavigation]
 * @property {Object} [gps]
 * @property {string} [legacy_text]
 */

/**
 * Default schema for structured hardware config.
 * Radio: H30, Silvus, RadioNor, Custom (no GPS Sim)
 * Frequency: S-Band, C-Band, L-Band, Custom (string)
 * Visual Navigation: 3 checkboxes — Yes, No, Boson
 * GPS: HolyBro, Harden GPS, ARC_XL, Arc (x20), Custom
 */
export const HARDWARE_CONFIG_SCHEMA = {
  radio: {
    h30: { enabled: false },
    silvus: { enabled: false },
    radioNor: { enabled: false },
    custom: { enabled: false, value: '' }
  },
  frequencyBand: {
    s: false,
    c: false,
    l: false,
    custom: ''
  },
  visualNavigation: {
    yes: false,
    no: false,
    boson: false
  },
  gps: {
    holyBro: { enabled: false },
    hardenGps: { enabled: false },
    arcXL: { enabled: false },
    arcX20: { enabled: false },
    custom: { enabled: false, value: '' }
  }
}

/**
 * Deep clone of the default schema (use for new configs).
 * @returns {HardwareConfig}
 */
export function getDefaultConfig() {
  return JSON.parse(JSON.stringify(HARDWARE_CONFIG_SCHEMA))
}

/**
 * Preset configurations for quick selection.
 */
export const HARDWARE_PRESETS = {
  standard: {
    name: 'Standard',
    config: (() => {
      const c = getDefaultConfig()
      c.radio.h30.enabled = true
      c.frequencyBand.s = true
      c.visualNavigation.yes = true
      c.gps.holyBro.enabled = true
      return c
    })()
  },
  silvusC: {
    name: 'Silvus C-Band',
    config: (() => {
      const c = getDefaultConfig()
      c.radio.silvus.enabled = true
      c.frequencyBand.c = true
      c.visualNavigation.yes = true
      c.gps.hardenGps.enabled = true
      return c
    })()
  },
  radioNorL: {
    name: 'RadioNor L-Band',
    config: (() => {
      const c = getDefaultConfig()
      c.radio.radioNor.enabled = true
      c.frequencyBand.l = true
      c.gps.arcXL.enabled = true
      return c
    })()
  },
  minimal: {
    name: 'Minimal',
    config: getDefaultConfig()
  }
}

/**
 * Normalize incoming config (from DB or modal) into full schema shape.
 * Handles legacy { raw: "..." } and partial objects.
 * @param {unknown} input - Raw value from DB or form
 * @returns {HardwareConfig}
 */
export function normalizeConfig(input) {
  const defaultConfig = getDefaultConfig()
  if (input == null || typeof input !== 'object') {
    return defaultConfig
  }
  const obj = /** @type {Record<string, unknown>} */ (input)

  // Legacy format: { raw: "text" } or { legacy_text: "text" }
  if (obj.raw != null || obj.legacy_text != null) {
    const legacy = String(obj.raw ?? obj.legacy_text ?? '')
    if (!legacy.trim()) return defaultConfig
    return {
      ...defaultConfig,
      legacy_text: legacy
    }
  }

  const merge = (target, source) => {
    if (!source || typeof source !== 'object') return
    for (const key of Object.keys(source)) {
      if (typeof source[key] === 'object' && source[key] !== null && !Array.isArray(source[key])) {
        if (target[key] && typeof target[key] === 'object') {
          merge(target[key], source[key])
        } else {
          target[key] = { ...(target[key] || {}), ...source[key] }
        }
      } else {
        target[key] = source[key]
      }
    }
  }

  const result = getDefaultConfig()
  merge(result, obj)
  if (obj.legacy_text != null) result.legacy_text = String(obj.legacy_text)
  // Remove deprecated radio.gpsSim so it is not persisted
  if (result.radio && 'gpsSim' in result.radio) delete result.radio.gpsSim

  // Backward compatibility: map legacy visualNavigation (enabled/mode/otherValue/boson) to yes/no/boson checkboxes
  const vn = result.visualNavigation
  if (vn) {
    if (typeof vn.enabled === 'boolean') {
      vn.yes = vn.enabled
      vn.no = !vn.enabled
      delete vn.enabled
    }
    if ('mode' in vn && vn.mode !== undefined) {
      const mode = String(vn.mode)
      vn.yes = mode === 'yes'
      vn.no = mode === 'no'
      vn.boson = !!(vn.boson && typeof vn.boson === 'object' && vn.boson.enabled)
      delete vn.mode
      delete vn.otherValue
    }
    if (typeof vn.boson === 'object' && vn.boson !== null && 'enabled' in vn.boson) {
      vn.boson = !!vn.boson.enabled
    }
    if (typeof vn.yes !== 'boolean') vn.yes = false
    if (typeof vn.no !== 'boolean') vn.no = false
    if (typeof vn.boson !== 'boolean') vn.boson = false
  }

  return result
}

/**
 * Convert structured config to human-readable text (for display or legacy export).
 * @param {HardwareConfig} config
 * @returns {string}
 */
export function hardwareConfigToText(config) {
  if (!config || typeof config !== 'object') return ''
  const c = normalizeConfig(config)
  const parts = []

  const radios = []
  if (c.radio?.h30?.enabled) radios.push('H30')
  if (c.radio?.silvus?.enabled) radios.push('Silvus')
  if (c.radio?.radioNor?.enabled) radios.push('RadioNor')
  if (c.radio?.custom?.enabled && c.radio.custom.value) radios.push(c.radio.custom.value)
  if (radios.length) parts.push('Radio: ' + radios.join(', '))

  const bands = []
  if (c.frequencyBand?.s) bands.push('S-Band')
  if (c.frequencyBand?.c) bands.push('C-Band')
  if (c.frequencyBand?.l) bands.push('L-Band')
  const customBand = (c.frequencyBand?.custom ?? '').trim()
  if (customBand) bands.push(customBand)
  if (bands.length) parts.push('Freq: ' + bands.join(', '))

  const vn = c.visualNavigation
  if (vn) {
    const labels = []
    if (vn.yes) labels.push('Yes')
    if (vn.no) labels.push('No')
    if (vn.boson) labels.push('Boson')
    if (labels.length) parts.push('Visual Nav: ' + labels.join(', '))
  }

  const gpsList = []
  if (c.gps?.holyBro?.enabled) gpsList.push('Holybro')
  if (c.gps?.hardenGps?.enabled) gpsList.push('Harden GPS')
  if (c.gps?.arcXL?.enabled) gpsList.push('ARC_XL')
  if (c.gps?.arcX20?.enabled) gpsList.push('Arc (x20)')
  if (c.gps?.custom?.enabled && c.gps.custom.value) gpsList.push(c.gps.custom.value)
  if (gpsList.length) parts.push('GPS: ' + gpsList.join(', '))

  if (c.legacy_text) parts.push(c.legacy_text)
  return parts.join(' · ') || ''
}

/**
 * Validate config shape and types (for save/submit).
 * @param {unknown} config
 * @returns {{ valid: boolean, errors: string[] }}
 */
export function validateConfig(config) {
  const errors = []
  const c = config && typeof config === 'object' ? /** @type {Record<string, unknown>} */ (config) : null
  if (!c) {
    return { valid: true, errors: [] }
  }
  if (c.radio && typeof c.radio !== 'object') errors.push('radio must be an object')
  if (c.frequencyBand && typeof c.frequencyBand !== 'object') errors.push('frequencyBand must be an object')
  if (c.gps && typeof c.gps !== 'object') errors.push('gps must be an object')
  return {
    valid: errors.length === 0,
    errors
  }
}

/**
 * Check if config is empty (default) or has no meaningful options set.
 * @param {HardwareConfig} config
 * @returns {boolean}
 */
export function isEmptyConfig(config) {
  if (!config) return true
  const c = normalizeConfig(config)
  const text = hardwareConfigToText(c)
  return !text || text.trim() === ''
}

/** Human-readable labels for hardware config keys (for change history diff). */
const HW_LABELS = {
  radio: {
    h30: 'H30',
    silvus: 'Silvus',
    radioNor: 'RadioNor',
    custom: 'Custom'
  },
  frequencyBand: { s: 'S-Band', c: 'C-Band', l: 'L-Band', custom: 'Custom' },
  visualNavigation: { yes: 'Yes', no: 'No', boson: 'Boson' },
  gps: {
    holyBro: 'Holybro',
    hardenGps: 'Harden GPS',
    arcXL: 'ARC_XL',
    arcX20: 'Arc (x20)',
    custom: 'Custom'
  }
}

/**
 * Describe a single radio/gps item state for diff output.
 * @param {Object} item - { enabled, value? }
 * @returns {string}
 */
function itemState(item) {
  if (!item || typeof item !== 'object') return 'disabled'
  if (item.enabled === true) {
    const v = (item.value || '').trim()
    return v ? `enabled (${v})` : 'enabled'
  }
  return 'disabled'
}

/**
 * Diff two hardware configs and return human-readable change lines.
 * Used by Change History to show exactly which hw_config items changed.
 * @param {unknown} oldConfig - Raw old value (from changed_fields.hw_config.old)
 * @param {unknown} newConfig - Raw new value (from changed_fields.hw_config.new)
 * @returns {string[]} Lines like "Radio: H30 enabled → disabled", "Frequency: S-Band → C-Band"
 */
export function hwConfigDiffLines(oldConfig, newConfig) {
  const oldC = normalizeConfig(oldConfig)
  const newC = normalizeConfig(newConfig)
  const lines = []

  // Radio: h30, silvus, radioNor, custom
  const radioKeys = ['h30', 'silvus', 'radioNor', 'custom']
  for (const key of radioKeys) {
    const oldItem = oldC.radio?.[key]
    const newItem = newC.radio?.[key]
    const oldState = itemState(oldItem)
    const newState = itemState(newItem)
    if (oldState !== newState) {
      const label = HW_LABELS.radio[key] || key
      lines.push(`Radio: ${label} ${oldState} → ${newState}`)
    }
  }

  // Frequency: s, c, l, custom
  const bandKeys = ['s', 'c', 'l']
  const oldBands = []
  const newBands = []
  for (const k of bandKeys) {
    if (oldC.frequencyBand?.[k]) oldBands.push(HW_LABELS.frequencyBand[k])
    if (newC.frequencyBand?.[k]) newBands.push(HW_LABELS.frequencyBand[k])
  }
  const oldCustom = (oldC.frequencyBand?.custom ?? '').trim()
  const newCustom = (newC.frequencyBand?.custom ?? '').trim()
  if (oldCustom) oldBands.push(oldCustom)
  if (newCustom) newBands.push(newCustom)
  const oldBandStr = oldBands.length ? oldBands.join(', ') : '(none)'
  const newBandStr = newBands.length ? newBands.join(', ') : '(none)'
  if (oldBandStr !== newBandStr) {
    lines.push(`Frequency: ${oldBandStr} → ${newBandStr}`)
  }

  // Visual navigation: yes, no, boson
  const vnKeys = ['yes', 'no', 'boson']
  for (const key of vnKeys) {
    const oldVal = !!oldC.visualNavigation?.[key]
    const newVal = !!newC.visualNavigation?.[key]
    if (oldVal !== newVal) {
      const label = HW_LABELS.visualNavigation[key]
      const oldStr = oldVal ? 'enabled' : 'disabled'
      const newStr = newVal ? 'enabled' : 'disabled'
      lines.push(`Visual Nav: ${label} ${oldStr} → ${newStr}`)
    }
  }

  // GPS: holyBro, hardenGps, arcXL, arcX20, custom
  const gpsKeys = ['holyBro', 'hardenGps', 'arcXL', 'arcX20', 'custom']
  for (const key of gpsKeys) {
    const oldItem = oldC.gps?.[key]
    const newItem = newC.gps?.[key]
    const oldState = itemState(oldItem)
    const newState = itemState(newItem)
    if (oldState !== newState) {
      const label = HW_LABELS.gps[key] || key
      lines.push(`GPS: ${label} ${oldState} → ${newState}`)
    }
  }

  // Legacy text change
  const oldLegacy = (oldC.legacy_text ?? '').trim()
  const newLegacy = (newC.legacy_text ?? '').trim()
  if (oldLegacy !== newLegacy) {
    lines.push(`Legacy: "${oldLegacy || '(empty)'}" → "${newLegacy || '(empty)'}"`)
  }

  return lines
}
