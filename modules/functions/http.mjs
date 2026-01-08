import {server, serverconfig, http, https, app, setServer, fs, saveConfig} from "../../index.mjs";
import Logger from "./logger.mjs";
import {lookupIP} from "./chat/main.mjs";

var serverconfigEditable = serverconfig;

function getClientIp(req) {
    const xf = req.headers["x-forwarded-for"];
    if (xf) return xf.split(",")[0].trim();

    return req.socket?.remoteAddress || req.connection?.remoteAddress;
}


export function checkIP(){
    app.use(async (req, res, next) => {
        const ipInfo = await lookupIP(getClientIp(req));
        if (!ipInfo) return next();

        // whitelist some urls for functionality
        let reqPath = req.path;
        let whitelistedUrls = [
            "/discover"
        ];

        // allow the discovery url for "datacenters" aka other instances trying to look up our instance
        if(whitelistedUrls.includes(reqPath) && ipInfo.is_datacenter) return next();

        // let whitelisted ips pass
        if(serverconfig.serverinfo.moderation.ip.whitelist.includes(ipInfo.ip)) return next();

        // looking kinda beautiful
        if (ipInfo.is_bogon && serverconfig.serverinfo.moderation.ip.blockBogon) return res.sendStatus(403);
        if (ipInfo.is_datacenter && serverconfig.serverinfo.moderation.ip.blockDataCenter) return res.sendStatus(403);
        if (ipInfo.is_satellite && serverconfig.serverinfo.moderation.ip.blockSatellite) return res.sendStatus(403);
        if (ipInfo.is_crawler && serverconfig.serverinfo.moderation.ip.blockCrawler) return res.sendStatus(403);
        if (ipInfo.is_proxy && serverconfig.serverinfo.moderation.ip.blockProxy) return res.sendStatus(403);
        if (ipInfo.is_vpn && serverconfig.serverinfo.moderation.ip.blockVPN) return res.sendStatus(403);
        if (ipInfo.is_tor && serverconfig.serverinfo.moderation.ip.blockTor) return res.sendStatus(403);
        if (ipInfo.is_abuser && serverconfig.serverinfo.moderation.ip.blockAbuser) return res.sendStatus(403);

        if (
            ipInfo.location?.country_code &&
            serverconfig.serverinfo.moderation.ip.blockedCountryCodes
                .includes(ipInfo.location.country_code.toLowerCase())
        ) return res.sendStatus(403);

        // continue
        next();
    });
}

export function checkSSL(){
    // if ssl is disabled but the file exists, enable ssl and delete the file
    if(serverconfig.serverinfo.ssl.enabled == 0){
        if(fs.existsSync("./configs/ssl.txt")){
            serverconfig.serverinfo.ssl.enabled = 1;
            saveConfig(serverconfig)
            fs.unlinkSync("./configs/ssl.txt");
        }
    }

    if(serverconfig.serverinfo.ssl.enabled == 1){
        setServer(https.createServer({
            key: fs.readFileSync(serverconfig.serverinfo.ssl.key),
            cert: fs.readFileSync(serverconfig.serverinfo.ssl.cert),
            ca: fs.readFileSync(serverconfig.serverinfo.ssl.chain),

            requestCert: false,
            rejectUnauthorized: false },app));

        Logger.success("Running Server in public (production) mode with SSL.");
    }
    else{
        Logger.warn("Running Server in localhost (testing) mode.");
        Logger.warn("If accessed via the internet, SSL wont work and will cause problems");

        setServer(http.createServer(app))
    }
}

export function extractHost(url){
    if(!url) return null;
    const s = String(url).trim();

    const looksLikeBareIPv6 = !s.includes('://') && !s.includes('/') && s.includes(':') && /^[0-9A-Fa-f:.]+$/.test(s);
    const withProto = looksLikeBareIPv6 ? `https://[${s}]` : (s.includes('://') ? s : `https://${s}`);

    try {
        const u = new URL(withProto);
        const host = u.hostname; // IPv6 returned without brackets
        const port = u.port;
        if (host.includes(':')) {
            return port ? `[${host}]:${port}` : host;
        }
        return port ? `${host}:${port}` : host;
    } catch (e) {
        const re = /^(?:https?:\/\/)?(?:[^@\/\n]+@)?([^:\/?#]+)(?::(\d+))?(?:[\/?#]|$)/i;
        const m = s.match(re);
        if (!m) return null;
        const hostname = m[1].replace(/^\[(.*)\]$/, '$1');
        const port = m[2];
        if (hostname.includes(':')) return port ? `[${hostname}]:${port}` : hostname;
        return port ? `${hostname}:${port}` : hostname;
    }
}