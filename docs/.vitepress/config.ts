import { defineConfig } from 'vitepress'

export default defineConfig({
    title: 'Eldoria AI IDE',
    description: 'Documentation for the Sentient Academic Co-Pilot',

    head: [
        ['link', { rel: 'icon', href: '/favicon.ico' }]
    ],

    themeConfig: {
        logo: '/logo.svg',

        nav: [
            { text: 'Guide', link: '/guide/getting-started' },
            { text: 'Features', link: '/features/editor' },
            { text: 'Reference', link: '/reference/buttons' },
            { text: 'FAQ', link: '/faq' }
        ],

        sidebar: {
            '/guide/': [
                {
                    text: 'Getting Started',
                    items: [
                        { text: 'Introduction', link: '/guide/getting-started' },
                        { text: 'Installation', link: '/guide/installation' },
                        { text: 'First Canvas', link: '/guide/first-canvas' },
                        { text: 'Connecting AI', link: '/guide/connecting-ai' }
                    ]
                }
            ],
            '/features/': [
                {
                    text: 'Core Features',
                    items: [
                        { text: 'SAF Framework', link: '/features/saf-framework' },
                        { text: 'Editor Panel', link: '/features/editor' },
                        { text: 'Chat Interface', link: '/features/chat' },
                        { text: 'Prompt Library', link: '/features/prompt-library' },
                        { text: 'Terminal & Bridge', link: '/features/terminal' }
                    ]
                },
                {
                    text: 'Academic Hub',
                    items: [
                        { text: 'Thesis Wizard', link: '/features/thesis-wizard' },
                        { text: 'Defense Deck', link: '/features/defense-deck' },
                        { text: 'Autonomous Researcher', link: '/features/researcher' },
                        { text: 'Integrity Guardian', link: '/features/integrity' }
                    ]
                }
            ],
            '/reference/': [
                {
                    text: 'Reference',
                    items: [
                        { text: 'Button Index', link: '/reference/buttons' },
                        { text: 'Keyboard Shortcuts', link: '/reference/shortcuts' },
                        { text: 'Status Indicators', link: '/reference/status' },
                        { text: 'Power Combos', link: '/reference/combos' }
                    ]
                }
            ]
        },

        socialLinks: [
            { icon: 'github', link: 'https://github.com/traveller007ab/eldoria-ai-agent' }
        ],

        footer: {
            message: 'Built with 🧠 by Eldoria Team',
            copyright: 'Copyright © 2024-present'
        },

        search: {
            provider: 'local'
        }
    }
})
