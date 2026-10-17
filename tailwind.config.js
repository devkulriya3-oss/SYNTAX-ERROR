/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  theme: {
    extend: {
      colors: {
        brand: {
          navy: '#17243A',
          'navy-light': '#1E2E4A',
          'navy-dark': '#0F1726',
          blue: '#4263EB',
          'blue-hover': '#364FC7',
          'blue-light': '#EDF2FF',
          bg: '#F7F8FA',
          surface: '#FFFFFF',
          border: '#E2E8F0',
          'border-subtle': '#EEF2F6',
          muted: '#64748B',
          text: '#0F172A',
          'text-secondary': '#475569',
        },
        status: {
          success: '#10B981',
          'success-bg': '#ECFDF5',
          'success-border': '#A7F3D0',
          'success-text': '#065F46',
          warning: '#F59E0B',
          'warning-bg': '#FFFBEB',
          'warning-border': '#FDE68A',
          'warning-text': '#92400E',
          error: '#EF4444',
          'error-bg': '#FEF2F2',
          'error-border': '#FECACA',
          'error-text': '#991B1B',
        }
      },
      fontFamily: {
        sans: ['Inter', '-apple-system', 'BlinkMacSystemFont', 'Segoe UI', 'Roboto', 'sans-serif'],
        mono: ['JetBrains Mono', 'ui-monospace', 'SFMono-Regular', 'Menlo', 'Monaco', 'Consolas', 'monospace'],
      },
      boxShadow: {
        'subtle': '0 1px 2px 0 rgba(0, 0, 0, 0.05)',
        'card': '0 1px 3px 0 rgba(15, 23, 42, 0.06), 0 1px 2px -1px rgba(15, 23, 42, 0.04)',
        'dropdown': '0 4px 12px 0 rgba(15, 23, 42, 0.08), 0 2px 4px -1px rgba(15, 23, 42, 0.04)',
      }
    },
  },
  plugins: [],
}
