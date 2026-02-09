import { app } from "../../../index.mjs";
import path from "path";
import fs from "fs";

import Logger from "../../functions/logger.mjs";
import {queryDatabase} from "../../functions/mysql/mysql.mjs";
import DateTools from "@hackthedev/datetools"
import JSONTools from "@hackthedev/json-tools";

import unzipper from "unzipper";
import {Readable} from "stream";
import {getThemes} from "../getThemes.mjs";


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
        //const res = await fetch("https://api.github.com/repos/DCTS-Project/themes/contents/theme");
        //themes = (await res.json()).filter(e => e.type === "dir").map(e => e.name);

        let themes = await getThemes();

        // then save and return the new themes
        await saveThemeCache(themes)
        return themes;
    }

    return themes;
}

export async function downloadTheme(themeName){
    if(!themeName) throw new Error("Missing theme name");

    const zipUrl = "https://api.github.com/repos/DCTS-Project/themes/zipball/main";
    const themesDir = path.resolve("public", "css", "themes");
    const targetDir = path.join(themesDir, themeName);

    if(fs.existsSync(targetDir)) {
        return path.join(targetDir, `${themeName}.css`);
    }

    fs.mkdirSync(themesDir, { recursive: true });

    const res = await fetch(zipUrl, {
        headers: { "User-Agent": "DCTS" }
    });

    if(!res.ok) throw new Error("zip download failed");

    const nodeStream = Readable.fromWeb(res.body);

    await new Promise((resolve, reject) => {
        nodeStream
            .pipe(unzipper.Parse())
            .on("entry", entry => {
                const rel = entry.path.split("/").slice(1).join("/");

                if(!rel.startsWith(`theme/${themeName}/`)){
                    entry.autodrain();
                    return;
                }

                const outPath = path.join(
                    themesDir,
                    rel.replace(`theme/${themeName}/`, `${themeName}/`)
                );

                if(entry.type === "Directory"){
                    fs.mkdirSync(outPath, { recursive: true });
                    entry.autodrain();
                } else {
                    fs.mkdirSync(path.dirname(outPath), { recursive: true });
                    entry.pipe(fs.createWriteStream(outPath));
                }
            })
            .on("close", resolve)
            .on("error", reject);
    });

    return path.join(targetDir, `${themeName}.css`);
}


app.get("/themes/list", async (req, res) => {
    let themes = await listThemes();
    return res.status(200).json({ ok: true, themes });
});

app.get("/themes/download{/:theme}", async (req, res) => {
    const {theme} = req.params;

    if(!theme) return res.status(404).json({ok: false, error: "Missing theme parameter"});
    let themePath = await downloadTheme(theme);
    console.log(themePath)

    return res.status(200).json({ ok: true, theme });
});



export default (io) => (socket) => {};
