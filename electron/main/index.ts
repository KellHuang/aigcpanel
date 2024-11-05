import {app, BrowserWindow, desktopCapturer, session, shell} from 'electron'
import {optimizer} from '@electron-toolkit/utils'
import path from 'node:path'
import os from 'node:os'

/** process.js 必须位于非依赖项的顶部 */
import {isDummy} from "../lib/process";

const isDummyNew = isDummy

import {AppEnv, AppRuntime} from "../mapi/env";
import {MAPI} from '../mapi/main';

import {WindowConfig} from "../config/window";
import {AppConfig} from "../../src/config";
import Log from "../mapi/log/main";
import {ConfigMenu} from "../config/menu";
import {ConfigLang} from "../config/lang";
import {ConfigContextMenu} from "../config/contextMenu";
import {MAIN_DIST, RENDERER_DIST, VITE_DEV_SERVER_URL} from "../lib/env-main";
import {Page} from "../page";
import {ConfigTray} from "../config/tray";
import {icnsLogoPath, icoLogoPath, logoPath} from "../config/icon";
import {isDev, isPackaged} from "../lib/env";

// The built directory structure
//
// ├─┬ dist-electron
// │ ├─┬ main
// │ │ └── index.js    > Electron-Main
// │ └─┬ preload
// │   └── index.mjs   > Preload-Scripts
// ├─┬ dist
// │ └── index.html    > Electron-Renderer
//

process.on('uncaughtException', (error) => {
    console.error('Uncaught Exception:', error);
});

process.on('unhandledRejection', (reason) => {
    console.error('Unhandled Rejection:', reason);
});

app.disableHardwareAcceleration()

// Set application name for Windows 10+ notifications
if (process.platform === 'win32') app.setAppUserModelId(app.getName())

if (!app.requestSingleInstanceLock()) {
    app.quit()
    process.exit(0)
}

const hasSplashWindow = true

const preload = path.join(MAIN_DIST, 'preload/index.mjs')
const splashHtml = path.join(RENDERER_DIST, 'splash.html')
const indexHtml = path.join(RENDERER_DIST, 'index.html')

AppEnv.appRoot = process.env.APP_ROOT
AppEnv.appData = app.getPath('appData')
AppEnv.userData = app.getPath('userData')
AppEnv.isInit = true

MAPI.init()
ConfigContextMenu.init()

Log.info('Starting')
Log.info('LaunchInfo', {
    splash: splashHtml,
    index: indexHtml,
    isPackaged
})
Log.info('UserDataDir', AppEnv.userData)

function createWindow() {
    let icon = logoPath
    if (process.platform === 'win32') {
        icon = icoLogoPath
    } else if (process.platform === 'darwin') {
        icon = icnsLogoPath
    }
    if (hasSplashWindow) {
        AppRuntime.splashWindow = new BrowserWindow({
            title: AppConfig.name,
            width: 600,
            height: 350,
            transparent: true,
            frame: false,
            alwaysOnTop: true,
            hasShadow: true,
        })
        if (VITE_DEV_SERVER_URL) {
            AppRuntime.splashWindow.loadURL(path.join(VITE_DEV_SERVER_URL, 'splash.html'))
        } else {
            AppRuntime.splashWindow.loadFile(splashHtml)
        }
    }
    AppRuntime.mainWindow = new BrowserWindow({
        show: !hasSplashWindow,
        title: AppConfig.name,
        ...(!isPackaged ? {icon} : {}),
        frame: false,
        transparent: true,
        hasShadow: true,
        center: true,
        minWidth: WindowConfig.initWidth,
        minHeight: WindowConfig.initHeight,
        width: WindowConfig.initWidth,
        height: WindowConfig.initHeight,
        backgroundColor: '#f1f5f9',
        webPreferences: {
            preload,
            // Warning: Enable nodeIntegration and disable contextIsolation is not secure in production
            nodeIntegration: true,
            webSecurity: false,
            webviewTag: true,
            // Consider using contextBridge.exposeInMainWorld
            // Read more on https://www.electronjs.org/docs/latest/tutorial/context-isolation
            contextIsolation: false,
            // sandbox: false,
        },
    })

    AppRuntime.mainWindow.on('closed', () => {
        AppRuntime.mainWindow = null
    })
    AppRuntime.mainWindow.on('show', () => {
        AppRuntime.mainWindow.webContents.executeJavaScript(
            `window.__page && window.__page.hooks && typeof window.__page.hooks.onShow === "function" && window.__page.hooks.onShow()`
        );
    });
    AppRuntime.mainWindow.on('hide', () => {
        AppRuntime.mainWindow.webContents.executeJavaScript(
            `window.__page && window.__page.hooks && typeof window.__page.hooks.onHide === "function" && window.__page.hooks.onHide()`
        );
    });

    // console.log('VITE_DEV_SERVER_URL:', VITE_DEV_SERVER_URL)
    if (VITE_DEV_SERVER_URL) { // #298
        AppRuntime.mainWindow.loadURL(VITE_DEV_SERVER_URL)
    } else {
        AppRuntime.mainWindow.loadFile(indexHtml)
    }

    AppRuntime.mainWindow.webContents.on('did-finish-load', () => {
        if (hasSplashWindow) {
            AppRuntime.mainWindow?.show()
            setTimeout(() => {
                try {
                    AppRuntime.splashWindow?.close()
                    AppRuntime.splashWindow = null
                    // AppRuntime.mainWindow.webContents.openDevTools({
                    //     mode: 'detach',
                    // })
                } catch (e) {
                }
            }, 1000);
        }
        Page.ready('main')
    })
    AppRuntime.mainWindow.webContents.setWindowOpenHandler(({url}) => {
        if (url.startsWith('https:')) shell.openExternal(url)
        return {action: 'deny'}
    })
}

app.whenReady()
    .then(() => {
        session.defaultSession.setDisplayMediaRequestHandler((request, callback) => {
            desktopCapturer.getSources({types: ['screen']}).then((sources) => {
                // Grant access to the first screen found.
                callback({video: sources[0], audio: 'loopback'})
            })
        })
    })
    .then(ConfigLang.readyAsync)
    .then(() => {
        MAPI.ready()
        ConfigMenu.ready()
        ConfigTray.ready()
        app.on('browser-window-created', (_, window) => {
            optimizer.watchWindowShortcuts(window)
        })
        createWindow()
    })

app.on('will-quit', () => {
    MAPI.destroy()
});

app.on('window-all-closed', () => {
    if (process.platform !== 'darwin') app.quit()
})

app.on('second-instance', () => {
    if (AppRuntime.mainWindow) {
        // Focus on the main window if the user tried to open another
        if (AppRuntime.mainWindow.isMinimized()) AppRuntime.mainWindow.restore()
        AppRuntime.mainWindow.focus()
    }
})

app.on('activate', () => {
    const allWindows = BrowserWindow.getAllWindows()
    if (allWindows.length) {
        if (!allWindows[0].isVisible()) {
            allWindows[0].show()
        }
        allWindows[0].focus()
    } else {
        createWindow()
    }
})


// New window example arg: new windows url
// ipcMain.handle('open-win', (_, arg) => {
//     const childWindow = new BrowserWindow({
//         webPreferences: {
//             preload,
//             nodeIntegration: true,
//             contextIsolation: false,
//         },
//     })
//
//     if (VITE_DEV_SERVER_URL) {
//         childWindow.loadURL(`${VITE_DEV_SERVER_URL}#${arg}`)
//     } else {
//         childWindow.loadFile(indexHtml, {hash: arg})
//     }
// })
