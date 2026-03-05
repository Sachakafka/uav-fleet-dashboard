/**
 * Funnel (filter) icon - wide at top, narrow at bottom.
 * Use for filter actions. Not an inverted triangle.
 */
export default function FilterFunnelIcon({ size = 20, color = 'currentColor', className = '' }) {
    return (
        <svg
            width={size}
            height={size}
            viewBox="0 0 24 24"
            fill="none"
            stroke={color}
            strokeWidth="2"
            strokeLinecap="round"
            strokeLinejoin="round"
            className={className}
            aria-hidden="true"
        >
            {/* Funnel: wide top opening, narrow spout at bottom */}
            <path d="M4 4h16v2.586a1 1 0 01-.293.707l-5.414 5.414a1 1 0 00-.293.707V18l-4 2v-6.586a1 1 0 00-.293-.707L4.293 7.293A1 1 0 014 6.586V4z" />
        </svg>
    )
}
