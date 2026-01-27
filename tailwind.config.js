/** @type {import('tailwindcss').Config} */
export default {
    content: [
        "./index.html",
        "./src/**/*.{js,ts,jsx,tsx}",
        "./components/**/*.{js,ts,jsx,tsx}",
        "./hooks/**/*.{js,ts,jsx,tsx}",
        "./context/**/*.{js,ts,jsx,tsx}",
        "./academic-hub/**/*.{js,ts,jsx,tsx}",
    ],
    theme: {
        extend: {
            fontFamily: {
                mono: ['Share Tech Mono', 'monospace'],
            },
            colors: {
                slate: {
                    700: '#334155',
                    800: '#1e293b',
                    900: '#0f172a',
                },
                emerald: {
                    400: '#34d399',
                    500: '#10b981',
                    950: '#022c22',
                },
            },
        },
    },
    plugins: [
        require('@tailwindcss/typography'),
        require('@tailwindcss/forms'),
    ],
    darkMode: 'class',
}
