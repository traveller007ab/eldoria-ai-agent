/**
 * Eldoria AI IDE - Electron Builder Configuration
 * 
 * Multi-platform packaging with ASAR compression and auto-update support.
 */

module.exports = {
    appId: "com.eldoria.aiide",
    productName: "Eldoria AI IDE",
    copyright: "Copyright © 2024 Eldoria Team",

    directories: {
        output: "release",
        buildResources: "electron/assets"
    },

    files: [
        "dist/**/*",
        "electron/**/*",
        "services/**/*",
        "projects/**/*",
        "!**/node_modules/*/{CHANGELOG.md,README.md,README,readme.md,readme}",
        "!**/node_modules/*/{test,__tests__,tests,powered-test,example,examples}",
        "!**/node_modules/.bin"
    ],

    extraResources: [
        {
            from: "services",
            to: "services",
            filter: ["**/*"]
        }
    ],

    asar: true,

    win: {
        target: [
            {
                target: "nsis",
                arch: ["x64"]
            }
        ],
        icon: "electron/assets/icon.ico",
        artifactName: "${productName}-${version}-Setup.${ext}"
    },

    nsis: {
        oneClick: false,
        allowToChangeInstallationDirectory: true,
        installerIcon: "electron/assets/icon.ico",
        uninstallerIcon: "electron/assets/icon.ico",
        installerHeaderIcon: "electron/assets/icon.ico",
        createDesktopShortcut: true,
        createStartMenuShortcut: true,
        shortcutName: "Eldoria AI IDE"
    },

    mac: {
        target: ["dmg", "zip"],
        icon: "electron/assets/icon.icns",
        category: "public.app-category.developer-tools",
        artifactName: "${productName}-${version}.${ext}"
    },

    linux: {
        target: ["AppImage", "deb"],
        icon: "electron/assets",
        category: "Development",
        artifactName: "${productName}-${version}.${ext}"
    },

    publish: [
        {
            provider: "github",
            owner: "eldoria-team",
            repo: "eldoria-ai-agent",
            releaseType: "release"
        }
    ]
};
