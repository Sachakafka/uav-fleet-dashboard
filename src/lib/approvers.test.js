import { describe, it, expect } from 'vitest'
import { APPROVER_EMAILS, isApprover } from './approvers'

describe('approvers', () => {
    it('exports approver emails', () => {
        expect(APPROVER_EMAILS).toContain('izabela@deltaquad.com')
        expect(APPROVER_EMAILS).toContain('a.chang@deltaquad.com')
        expect(APPROVER_EMAILS).toContain('events@deltaquad.com')
    })

    it('isApprover returns true for izabela@deltaquad.com', () => {
        expect(isApprover('izabela@deltaquad.com')).toBe(true)
    })

    it('isApprover returns true for a.chang@deltaquad.com', () => {
        expect(isApprover('a.chang@deltaquad.com')).toBe(true)
    })

    it('isApprover returns true for events@deltaquad.com', () => {
        expect(isApprover('events@deltaquad.com')).toBe(true)
    })

    it('isApprover returns false for other emails', () => {
        expect(isApprover('other@deltaquad.com')).toBe(false)
        expect(isApprover('user@example.com')).toBe(false)
    })

    it('isApprover is case-insensitive', () => {
        expect(isApprover('IZABELA@DELTAQUAD.COM')).toBe(true)
        expect(isApprover('A.Chang@DeltaQuad.com')).toBe(true)
        expect(isApprover('EVENTS@DELTAQUAD.COM')).toBe(true)
    })

    it('isApprover returns false for empty or invalid input', () => {
        expect(isApprover('')).toBe(false)
        expect(isApprover(null)).toBe(false)
        expect(isApprover(undefined)).toBe(false)
    })
})
