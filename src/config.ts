import packageJson from '../package.json';

const BASE_URL = 'https://aigcpanel.com';

export const AppConfig = {
    name: 'AigcPanel',
    slogan: '一站式AI数字人系统',
    version: packageJson.version,
    website: `${BASE_URL}`,
    websiteGithub: 'https://github.com/modstart-lib/aigcpanel',
    websiteGitee: 'https://gitee.com/modstart-lib/aigcpanel',
    apiBaseUrl: `${BASE_URL}/api`,
    updaterUrl: `${BASE_URL}/app_manager/updater`,
    downloadUrl: `${BASE_URL}/app_manager/download`,
    feedbackUrl: `${BASE_URL}/feedback`,
    statisticsUrl: `${BASE_URL}/app_manager/collect`,
    helpUrl: `${BASE_URL}/app_manager/help`,
    basic: {
        userEnable: false,
    }
}

