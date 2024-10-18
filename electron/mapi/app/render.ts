import {ipcRenderer} from "electron";
import {resolve} from "node:path";
import {isPackaged, platformName, platformArch} from "../../lib/env";
import {AppEnv, waitAppEnvReady} from "../env";
import appIndex from "./index";

const quit = () => {
    return ipcRenderer.invoke('app:quit')
}

const isPlatform = (name: 'win' | 'osx' | 'linux') => {
    return platformName() === name
}

const windowMin = () => {
    return ipcRenderer.invoke('window:min')
}

const windowMax = () => {
    return ipcRenderer.invoke('window:max')
}

const windowSetSize = (width: number, height: number) => {
    return ipcRenderer.invoke('window:setSize', width, height)
}

const windowHide = (name: string) => {
    return ipcRenderer.invoke('window:hide', name)
}

const windowClose = (name: string) => {
    return ipcRenderer.invoke('window:close', name)
}

const openExternalWeb = (url: string) => {
    return ipcRenderer.invoke('app:openExternalWeb', url)
}

const resourcePathResolve = async (filePath: string) => {
    await waitAppEnvReady()
    const basePath = isPackaged ? process.resourcesPath : AppEnv.appRoot
    return resolve(basePath, filePath)
}

const extraPathResolve = async (filePath: string) => {
    await waitAppEnvReady()
    const basePath = isPackaged ? process.resourcesPath : 'electron/resources'
    return resolve(basePath, 'extra', filePath)
}

const appEnv = async () => {
    await waitAppEnvReady()
    return AppEnv
}


export default {
    resourcePathResolve,
    extraPathResolve,
    platformName,
    platformArch,
    isPlatform,
    quit,
    windowMin,
    windowMax,
    windowSetSize,
    windowHide,
    windowClose,
    openExternalWeb,
    appEnv,
    shell: appIndex.shell,
    spawnShell: appIndex.spawnShell,
    availablePort: appIndex.availablePort,
    fixExecutable: appIndex.fixExecutable,
}

