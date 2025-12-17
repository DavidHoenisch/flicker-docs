import { defineConfig } from 'vitepress'

export default defineConfig({
  base: '/flicker-docs/',
  title: "Flicker",
  description: "A lightweight, high-performance log shipping agent written in Rust.",
  head: [['link', { rel: 'icon', href: '/flicker.png' }]],
  themeConfig: {
    logo: '/flicker.png',
    
    nav: [
      { text: 'Home', link: '/' },
      { text: 'Guide', link: '/guide/' },
      { text: 'Features', link: '/features/registry' },
      { text: 'Reference', link: '/reference/performance' },
      { text: 'Development', link: '/development/testing' }
    ],

    sidebar: {
      '/guide/': [
        {
          text: 'Introduction',
          items: [
            { text: 'What is Flicker?', link: '/guide/' },
            { text: 'Architecture', link: '/guide/architecture' }
          ]
        },
        {
          text: 'Getting Started',
          items: [
            { text: 'Installation', link: '/guide/installation' },
            { text: 'Configuration', link: '/guide/configuration' }
          ]
        }
      ],
      '/features/': [
        {
          text: 'Core Features',
          items: [
            { text: 'Registry Tracking', link: '/features/registry' },
            { text: 'Docker Support', link: '/features/docker' },
            { text: 'mTLS & Security', link: '/features/mtls' },
            { text: 'Filtering & Buffering', link: '/features/filtering' }
          ]
        }
      ],
      '/reference/': [
        {
          text: 'Reference',
          items: [
            { text: 'Performance & Design', link: '/reference/performance' },
            { text: 'Troubleshooting', link: '/reference/troubleshooting' }
          ]
        }
      ],
      '/development/': [
        {
          text: 'Development',
          items: [
            { text: 'Testing Tools', link: '/development/testing' },
            { text: 'Contributing', link: '/development/contributing' }
          ]
        }
      ]
    },

    socialLinks: [
      { icon: 'github', link: 'https://github.com/DavidHoenisch/flicker' }
    ],

    footer: {
      message: 'Released under the MIT License.',
      copyright: 'Copyright © 2025 David Hoenisch'
    },

    search: {
      provider: 'local'
    }
  }
})