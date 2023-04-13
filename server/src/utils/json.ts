import fs from "fs";

export const loadJSON = async (url: URL) => JSON.parse((await fs.promises.readFile(url)).toString());
export const saveJSON = async (url: URL, object) => await fs.promises.writeFile(url, JSON.stringify(object));