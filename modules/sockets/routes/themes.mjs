import { app } from "../../../index.mjs";
import path from "path";
import Logger from "../../functions/logger.mjs";
import {queryDatabase} from "../../functions/mysql/mysql.mjs";
import DateTools from "@hackthedev/datetools"
import JSONTools from "@hackthedev/json-tools";

export async function loadThemeCache(force = false){
    let themeCacheRow = await queryDatabase(`SELECT * FROM cache WHERE identifier = "theme_cache"`, []);

    // check cache and if it expired
    if(themeCacheRow?.length > 0) {
        let lastUpdate = themeCacheRow[0]?.last_update;
        let updateDate = new Date(lastUpdate);
        let cacheExpiredDate = updateDate.getTime() + DateTools.getDateFromOffset("1 day").getTime();

        // if true, cache expired
        if(new Date().getTime() > cacheExpiredDate){
            return null;
        }

        return JSONTools.tryParse(themeCacheRow[0].data);
    }
    return null;
}

export async function saveThemeCache(data){
    let themeCacheRow = await queryDatabase(
        `INSERT INTO cache (identifier, data) VALUES("theme_cache", ?)
            ON DUPLICATE KEY UPDATE data= VALUES(data), last_update = ?`
        , [JSON.stringify(data), new Date().getTime()]);

    if(themeCacheRow?.rowsAffected > 0) return true;
    return false;
}

export async function listThemes() {
    let themes = await loadThemeCache();

    // no theme cache found or expired
    if(!themes){
        // so we fetch freshly from github
        const res = await fetch("https://api.github.com/repos/DCTS-Project/themes/contents/theme");
        themes = (await res.json()).filter(e => e.type === "dir").map(e => e.name);

        // then save and return the new themes
        await saveThemeCache(themes)
        return themes;
    }

    return themes;
}

app.post("/themes/list", async (req, res) => {
    let themes = await listThemes();
    return res.status(200).json({ ok: true, themes });
});




export default (io) => (socket) => {


};
