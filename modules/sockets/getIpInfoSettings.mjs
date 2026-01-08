import {saveConfig, serverconfig, versionCode, xssFilters} from "../../index.mjs";
import { hasPermission } from "../functions/chat/main.mjs";
import Logger from "../functions/logger.mjs";
import {
    checkObjectKeys,
    copyObject,
    getCastingMemberObject,
    sendMessageToUser,
    validateMemberId
} from "../functions/main.mjs";

export default (io) => (socket) => {
    // socket.on code here
    socket.on("getIpInfoSettings", function (member, response) {
        if (validateMemberId(member?.id, socket,  member?.token) === true
        ) {
            if (hasPermission(member.id, "manageIpSettings")) {
                return response({ip: serverconfig.serverinfo.moderation.ip})
            }

            response({ error: "You dont have permissions for that"});
        }
        else {
            Logger.warn("ID or Token was invalid while requesting server information");
            Logger.warn(`ID: ${member.id}`);
            Logger.warn(`Token: ${member.token}`);
        }
    });

    socket.on("saveIpInfoSettings", async function (member, response) {
        if (validateMemberId(member?.id, socket,  member?.token) === true
        ) {
            if (hasPermission(member.id, "manageIpSettings")) {
                if(member?.ip?.blockedCountryCodes != null) serverconfig.serverinfo.moderation.ip.blockedCountryCodes = member.ip.blockedCountryCodes;
                if(member?.ip?.blockDataCenter != null) serverconfig.serverinfo.moderation.ip.blockDataCenter = member.ip.blockDataCenter;
                if(member?.ip?.blockSattelites != null) serverconfig.serverinfo.moderation.ip.blockSattelites = member.ip.blockSattelites;
                if(member?.ip?.blockCrawler != null) serverconfig.serverinfo.moderation.ip.blockCrawler = member.ip.blockCrawler;
                if(member?.ip?.blockBogon != null) serverconfig.serverinfo.moderation.ip.blockBogon = member.ip.blockBogon;
                if(member?.ip?.blockProxy != null) serverconfig.serverinfo.moderation.ip.blockProxy = member.ip.blockProxy;
                if(member?.ip?.blockVPN != null) serverconfig.serverinfo.moderation.ip.blockVPN = member.ip.blockVPN;
                if(member?.ip?.blockTor != null) serverconfig.serverinfo.moderation.ip.blockTor = member.ip.blockTor;
                if(member?.ip?.blockAbuser != null) serverconfig.serverinfo.moderation.ip.blockAbuser = member.ip.blockAbuser;
                if(member?.ip?.whitelist != null) serverconfig.serverinfo.moderation.ip.whitelist = member.ip.whitelist;
                await saveConfig(serverconfig);
                return response({error: null})
            }

            response({ error: "You dont have permissions for that"});
        }
        else {
            Logger.warn("ID or Token was invalid while requesting server information");
            Logger.warn(`ID: ${member.id}`);
            Logger.warn(`Token: ${member.token}`);
        }
    });
}
