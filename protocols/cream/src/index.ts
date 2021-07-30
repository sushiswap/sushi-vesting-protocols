import { exec } from "child_process";
import dotenv from "dotenv";
import fs from "fs";
import BigNumber from "bignumber.js";

import { Options } from "../types/index";

const path = __filename.replace("src/index.ts", "").concat("script");

export default async function getCreamDistribution(options: Options) {
    fs.writeFileSync(path + "/blacklist.json", JSON.stringify(options.blacklistDistribution, null, 1))

    await execShellCommand(`python3 run.py -e ${options.endBlock} -p blacklist.json`);

    const outputFiles = fs.readdirSync(path + "/output")
    const results: {[user: string]: string}[] = outputFiles.map(filePath => JSON.parse(fs.readFileSync(path + "/output/" + filePath, {encoding: "utf-8"})))

    const balances: {[user: string]: BigNumber} = {};

    results.forEach(contract => Object.keys(contract).forEach(user => {
        balances[user] = balances[user] ? balances[user].plus(new BigNumber(contract[user])) : new BigNumber(contract[user])
    }))

    const final: {[user: string]: string} = {};

    Object.keys(balances).forEach(user => {
        if(balances[user].toFixed() !== "0") { 
            final[user] = balances[user].integerValue().toFixed()
        }
    })

    return final;
}

function execShellCommand(cmd: string) {
    return new Promise((resolve, reject) => {
        exec(cmd,
            {
                cwd: path,
            },
            (error, stdout, stderr) => {
        if (error) {
            console.warn(error);
        }
        resolve(stdout? stdout : stderr);
        });
    });
}