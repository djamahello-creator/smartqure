/** @type {import('tailwindcss').Config} */
// SmartQure Design System — Tailwind v3 config
//
// Brand contexts:
//   - SmartQure / Patient / RxQure:  Teal palette   — what patients always see
//   - DocQure (B2B):                 Indigo palette  — doctor portal
//   - PharmaQure (B2B):              Purple palette  — pharmacy dashboard
//   - Triage bot / Dark mode:        Deep navy bg    — smartqure-triage.jsx
//
// Fonts:
//   Patient/DocQure: DM Sans (body) + Archivo (headings)
//   PharmaQure:      Sora (headings) + DM Mono (data/numbers)
//
// Usage examples:
//   bg-brand-500          → primary teal background
//   text-doc-600          → DocQure indigo text
//   bg-pharma-700         → PharmaQure purple background
//   bg-navy-950           → triage bot dark background
//   font-heading          → Archivo
//   font-mono-data        → DM Mono (PharmaQure numbers)

const { fontFamily } = require('tailwindcss/defaultTheme');

module.exports = {
  content: [
    './app/**/*.{js,jsx,ts,tsx,mdx}',
    './components/**/*.{js,jsx,ts,tsx,mdx}',
    './pages/**/*.{js,jsx,ts,tsx,mdx}',
    './src/**/*.{js,jsx,ts,tsx,mdx}',
  ],

  darkMode: 'class', // enable dark mode via .dark class (triage bot uses this)

  theme: {
    extend: {

      // -----------------------------------------------------------------------
      // COLOUR PALETTE
      // -----------------------------------------------------------------------
      colors: {

        // --- SmartQure / Patient / RxQure — TEAL ---
        brand: {
          50:  '#f0fdfa',
          100: '#ccfbf1',
          200: '#99f6e4',
          300: '#5eead4',
          400: '#2dd4bf',
          500: '#14b8a6',   // Primary — CTAs, active states
          600: '#0d9488',   // Hover state
          700: '#0f766e',   // Deep teal — headings, hero gradient
          800: '#115e59',
          900: '#134e4a',
          950: '#042f2e',
        },

        // Triage bot accent (slightly brighter, per smartqure-triage.jsx source)
        triage: {
          accent: '#00d4aa',
          bg:     '#0a1628',
          card:   '#0d1f38',
          border: '#1a2d4a',
          text:   '#e2e8f0',
        },

        // --- DocQure (B2B — Doctor Portal) — INDIGO ---
        doc: {
          50:  '#eef2ff',
          100: '#e0e7ff',
          200: '#c7d2fe',
          300: '#a5b4fc',
          400: '#818cf8',
          500: '#6366f1',   // DocQure primary
          600: '#4f46e5',   // DocQure hover
          700: '#4338ca',   // DocQure deep
          800: '#3730a3',
          900: '#312e81',
          950: '#1e1b4b',
        },

        // --- PharmaQure (B2B — Pharmacy Dashboard) — PURPLE ---
        pharma: {
          50:  '#faf5ff',
          100: '#f3e8ff',
          200: '#e9d5ff',
          300: '#d8b4fe',
          400: '#c084fc',
          500: '#a855f7',   // PharmaQure primary
          600: '#9333ea',   // PharmaQure hover
          700: '#7e22ce',   // PharmaQure deep
          800: '#6b21a8',
          900: '#581c87',
          950: '#3b0764',
        },

        // --- Status colours (shared across all contexts) ---
        verified: {
          DEFAULT: '#10b981',
          light:   '#d1fae5',
          dark:    '#065f46',
        },
        caution: {
          DEFAULT: '#f59e0b',
          light:   '#fef3c7',
          dark:    '#92400e',
        },
        danger: {
          DEFAULT: '#ef4444',
          light:   '#fee2e2',
          dark:    '#991b1b',
        },
        crisis: {
          DEFAULT: '#dc2626',
          light:   '#fef2f2',
        },

        // --- Dark navy (triage bot + dark mode) ---
        navy: {
          700: '#1e3a5f',
          800: '#152d4a',
          900: '#0d1f38',
          950: '#0a1628',
        },

        // --- Neutral text system ---
        'text-primary':   '#1e293b',
        'text-secondary': '#64748b',
        'text-muted':     '#94a3b8',
        'text-inverse':   '#f8fafc',

        // --- Surface system ---
        surface: {
          DEFAULT: '#ffffff',
          muted:   '#f8fafc',
          subtle:  '#f1f5f9',
          border:  '#e2e8f0',
        },
      },

      // -----------------------------------------------------------------------
      // TYPOGRAPHY
      // -----------------------------------------------------------------------
      fontFamily: {
        sans:        ['DM Sans', 'Inter', ...fontFamily.sans],
        heading:     ['Archivo', 'DM Sans', ...fontFamily.sans],
        pharma:      ['Sora', 'DM Sans', ...fontFamily.sans],
        'mono-data': ['DM Mono', 'JetBrains Mono', ...fontFamily.mono],
      },

      fontSize: {
        'display-xl': ['3.5rem',   { lineHeight: '1.1',  fontWeight: '700', letterSpacing: '-0.02em' }],
        'display-lg': ['2.75rem',  { lineHeight: '1.15', fontWeight: '700', letterSpacing: '-0.02em' }],
        'display-md': ['2.25rem',  { lineHeight: '1.2',  fontWeight: '700', letterSpacing: '-0.01em' }],
        'heading-xl': ['1.75rem',  { lineHeight: '1.25', fontWeight: '600' }],
        'heading-lg': ['1.5rem',   { lineHeight: '1.3',  fontWeight: '600' }],
        'heading-md': ['1.25rem',  { lineHeight: '1.35', fontWeight: '600' }],
        'heading-sm': ['1.125rem', { lineHeight: '1.4',  fontWeight: '600' }],
        'body-lg':    ['1.0625rem',{ lineHeight: '1.6',  fontWeight: '400' }],
        'body':       ['1rem',     { lineHeight: '1.6',  fontWeight: '400' }],
        'body-sm':    ['0.9375rem',{ lineHeight: '1.6',  fontWeight: '400' }],
        'caption':    ['0.875rem', { lineHeight: '1.5',  fontWeight: '400' }],
        'label':      ['0.8125rem',{ lineHeight: '1.4',  fontWeight: '500', letterSpacing: '0.01em' }],
        'micro':      ['0.75rem',  { lineHeight: '1.4',  fontWeight: '500' }],
      },

      // -----------------------------------------------------------------------
      // SPACING — 8px grid
      // -----------------------------------------------------------------------
      spacing: {
        '4.5': '1.125rem',
        '13':  '3.25rem',
        '18':  '4.5rem',
        '22':  '5.5rem',
        '26':  '6.5rem',
        '30':  '7.5rem',
        '34':  '8.5rem',
        '38':  '9.5rem',
        '42':  '10.5rem',
        '46':  '11.5rem',
        '50':  '12.5rem',
        '54':  '13.5rem',
        '58':  '14.5rem',
        '62':  '15.5rem',
        '66':  '16.5rem',
        '70':  '17.5rem',
        '76':  '19rem',
        '84':  '21rem',
        '88':  '22rem',
        '92':  '23rem',
        '96':  '24rem',
        '100': '25rem',
        '128': '32rem',
      },

      // -----------------------------------------------------------------------
      // BORDER RADIUS
      // -----------------------------------------------------------------------
      borderRadius: {
        'xs':   '4px',
        'sm':   '6px',
        DEFAULT:'8px',
        'md':   '10px',
        'lg':   '12px',
        'xl':   '16px',
        '2xl':  '20px',
        '3xl':  '24px',
        'card': '16px',
        'pill': '9999px',
      },

      // -----------------------------------------------------------------------
      // SHADOWS
      // -----------------------------------------------------------------------
      boxShadow: {
        'xs':         '0 1px 2px 0 rgba(0,0,0,0.04)',
        'sm':         '0 2px 6px 0 rgba(0,0,0,0.06)',
        DEFAULT:      '0 4px 12px 0 rgba(0,0,0,0.08)',
        'md':         '0 4px 16px 0 rgba(0,0,0,0.10)',
        'lg':         '0 8px 24px 0 rgba(0,0,0,0.12)',
        'xl':         '0 12px 40px 0 rgba(0,0,0,0.16)',
        '2xl':        '0 20px 60px 0 rgba(0,0,0,0.20)',
        'brand':      '0 4px 20px 0 rgba(20,184,166,0.35)',
        'doc':        '0 4px 20px 0 rgba(99,102,241,0.35)',
        'pharma':     '0 4px 20px 0 rgba(168,85,247,0.35)',
        'inner-sm':   'inset 0 1px 3px 0 rgba(0,0,0,0.08)',
        'inner':      'inset 0 2px 6px 0 rgba(0,0,0,0.12)',
        'dark-card':  '0 4px 20px 0 rgba(0,0,0,0.40)',
        'none':       'none',
      },

      // -----------------------------------------------------------------------
      // KEYFRAME ANIMATIONS
      // -----------------------------------------------------------------------
      keyframes: {
        'fade-in': {
          '0%':   { opacity: '0' },
          '100%': { opacity: '1' },
        },
        'fade-in-up': {
          '0%':   { opacity: '0', transform: 'translateY(12px)' },
          '100%': { opacity: '1', transform: 'translateY(0)' },
        },
        'scale-in': {
          '0%':   { opacity: '0', transform: 'scale(0.95)' },
          '100%': { opacity: '1', transform: 'scale(1)' },
        },
        'typing': {
          '0%, 60%, 100%': { transform: 'translateY(0)' },
          '30%':           { transform: 'translateY(-6px)' },
        },
        'shimmer': {
          '0%':   { backgroundPosition: '-200% 0' },
          '100%': { backgroundPosition: '200% 0' },
        },
        'scan-line': {
          '0%':   { top: '0%' },
          '50%':  { top: '90%' },
          '100%': { top: '0%' },
        },
        'ring-pulse': {
          '0%':   { boxShadow: '0 0 0 0 rgba(20,184,166,0.4)' },
          '70%':  { boxShadow: '0 0 0 12px rgba(20,184,166,0)' },
          '100%': { boxShadow: '0 0 0 0 rgba(20,184,166,0)' },
        },
        'slide-in-right': {
          '0%':   { opacity: '0', transform: 'translateX(24px)' },
          '100%': { opacity: '1', transform: 'translateX(0)' },
        },
      },

      animation: {
        'fade-in':      'fade-in 0.2s ease-out',
        'fade-in-up':   'fade-in-up 0.3s ease-out',
        'scale-in':     'scale-in 0.2s ease-out',
        'slide-in':     'slide-in-right 0.3s ease-out',
        'typing-1':     'typing 1.4s ease-in-out infinite',
        'typing-2':     'typing 1.4s ease-in-out 0.2s infinite',
        'typing-3':     'typing 1.4s ease-in-out 0.4s infinite',
        'shimmer':      'shimmer 2s linear infinite',
        'scan':         'scan-line 2s ease-in-out infinite',
        'ring-pulse':   'ring-pulse 2s ease-in-out infinite',
      },

      // -----------------------------------------------------------------------
      // Z-INDEX SYSTEM
      // -----------------------------------------------------------------------
      zIndex: {
        'below':   '-1',
        'base':    '0',
        'raised':  '10',
        'sticky':  '100',
        'overlay': '200',
        'modal':   '300',
        'toast':   '400',
        'tooltip': '500',
      },

      // -----------------------------------------------------------------------
      // SCREENS
      // -----------------------------------------------------------------------
      screens: {
        'xs':  '375px',
        'sm':  '640px',
        'md':  '768px',
        'lg':  '1024px',
        'xl':  '1280px',
        '2xl': '1536px',
      },
    },
  },

  plugins: [
    function({ addComponents, addUtilities, theme }) {

      addComponents({
        // Primary teal button
        '.btn-primary': {
          backgroundColor: theme('colors.brand.500'),
          color: '#ffffff',
          fontFamily: theme('fontFamily.sans')[0],
          fontWeight: '600',
          padding: `${theme('spacing.3')} ${theme('spacing.6')}`,
          borderRadius: theme('borderRadius.lg'),
          boxShadow: theme('boxShadow.brand'),
          transition: 'all 200ms cubic-bezier(0.4,0,0.2,1)',
          display: 'inline-flex',
          alignItems: 'center',
          justifyContent: 'center',
          '&:hover': {
            backgroundColor: theme('colors.brand.600'),
            transform: 'translateY(-1px)',
          },
          '&:active': {
            backgroundColor: theme('colors.brand.700'),
            transform: 'translateY(0)',
          },
        },
        // DocQure indigo button
        '.btn-doc': {
          backgroundColor: theme('colors.doc.500'),
          color: '#ffffff',
          fontWeight: '600',
          padding: `${theme('spacing.3')} ${theme('spacing.6')}`,
          borderRadius: theme('borderRadius.lg'),
          boxShadow: theme('boxShadow.doc'),
          transition: 'all 200ms ease',
          '&:hover': {
            backgroundColor: theme('colors.doc.600'),
            transform: 'translateY(-1px)',
          },
        },
        // PharmaQure purple button
        '.btn-pharma': {
          backgroundColor: theme('colors.pharma.500'),
          color: '#ffffff',
          fontWeight: '600',
          padding: `${theme('spacing.3')} ${theme('spacing.6')}`,
          borderRadius: theme('borderRadius.lg'),
          boxShadow: theme('boxShadow.pharma'),
          transition: 'all 200ms ease',
          '&:hover': {
            backgroundColor: theme('colors.pharma.600'),
            transform: 'translateY(-1px)',
          },
        },
        // Ghost button
        '.btn-ghost': {
          backgroundColor: 'transparent',
          color: theme('colors.brand.600'),
          fontWeight: '600',
          padding: `${theme('spacing.3')} ${theme('spacing.6')}`,
          borderRadius: theme('borderRadius.lg'),
          border: `2px solid ${theme('colors.brand.500')}`,
          transition: 'all 200ms ease',
          '&:hover': { backgroundColor: theme('colors.brand.50') },
        },
        // Card components
        '.card': {
          backgroundColor: '#ffffff',
          borderRadius: theme('borderRadius.card'),
          boxShadow: theme('boxShadow.DEFAULT'),
          padding: theme('spacing.5'),
        },
        '.card-dark': {
          backgroundColor: theme('colors.triage.card'),
          borderRadius: theme('borderRadius.card'),
          boxShadow: theme('boxShadow.dark-card'),
          padding: theme('spacing.5'),
          border: `1px solid ${theme('colors.triage.border')}`,
        },
        // Status badges
        '.badge-verified': {
          backgroundColor: theme('colors.verified.light'),
          color: theme('colors.verified.dark'),
          fontSize: theme('fontSize.micro')[0],
          fontWeight: '600',
          padding: '2px 10px',
          borderRadius: theme('borderRadius.pill'),
        },
        '.badge-caution': {
          backgroundColor: theme('colors.caution.light'),
          color: theme('colors.caution.dark'),
          fontSize: theme('fontSize.micro')[0],
          fontWeight: '600',
          padding: '2px 10px',
          borderRadius: theme('borderRadius.pill'),
        },
        '.badge-danger': {
          backgroundColor: theme('colors.danger.light'),
          color: theme('colors.danger.dark'),
          fontSize: theme('fontSize.micro')[0],
          fontWeight: '600',
          padding: '2px 10px',
          borderRadius: theme('borderRadius.pill'),
        },
        // Form input
        '.input-base': {
          width: '100%',
          borderRadius: theme('borderRadius.lg'),
          border: `1.5px solid ${theme('colors.surface.border')}`,
          padding: `${theme('spacing.3')} ${theme('spacing.4')}`,
          fontSize: theme('fontSize.body')[0],
          transition: 'border-color 150ms ease, box-shadow 150ms ease',
          '&:focus': {
            outline: 'none',
            borderColor: theme('colors.brand.500'),
            boxShadow: '0 0 0 3px rgba(20,184,166,0.15)',
          },
        },
      });

      addUtilities({
        '.skeleton': {
          background: `linear-gradient(90deg, #f1f5f9 25%, #e2e8f0 50%, #f1f5f9 75%)`,
          backgroundSize: '200% 100%',
          animation: 'shimmer 2s linear infinite',
          borderRadius: theme('borderRadius.sm'),
        },
        '.text-gradient-brand': {
          background: `linear-gradient(135deg, ${theme('colors.brand.500')}, ${theme('colors.brand.700')})`,
          '-webkit-background-clip': 'text',
          '-webkit-text-fill-color': 'transparent',
          backgroundClip: 'text',
        },
        '.text-gradient-doc': {
          background: `linear-gradient(135deg, ${theme('colors.doc.500')}, ${theme('colors.doc.700')})`,
          '-webkit-background-clip': 'text',
          '-webkit-text-fill-color': 'transparent',
          backgroundClip: 'text',
        },
        '.glass': {
          backgroundColor: 'rgba(13,31,56,0.80)',
          backdropFilter: 'blur(12px)',
          '-webkit-backdrop-filter': 'blur(12px)',
          border: '1px solid rgba(255,255,255,0.06)',
        },
        '.safe-bottom': {
          paddingBottom: 'env(safe-area-inset-bottom)',
        },
        '.safe-top': {
          paddingTop: 'env(safe-area-inset-top)',
        },
      });
    },
  ],
};
