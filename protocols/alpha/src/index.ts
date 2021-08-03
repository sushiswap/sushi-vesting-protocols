import { exec } from "child_process";
import dotenv from "dotenv";
import fs from "fs";
import BigNumber from "bignumber.js";

import { Options } from "../types/index";

const config = dotenv.config({path: __filename.replace("protocols/alpha/src/index.ts", ".env")}).parsed!
const path = __filename.replace("src/index.ts", "").concat("script/nam");

export default async function getAlphaDistribution(options: Options) {
    if(!fs.existsSync("script")) return {}
    
    fs.writeFileSync(path + "/configs/end_block.json", String(options.endBlock));
    fs.writeFileSync(path + "/data/sushi_blacklist.json", JSON.stringify(options.blacklistDistribution, null, 1))

    const v1 = execShellCommand("./run_v1.sh");
    const v2 = execShellCommand("./run_v2.sh");
 
    await Promise.all([v1, v2]);

    const v1results = JSON.parse(fs.readFileSync(path + "/results/v1/user_rewards_homora_v1.json", 'utf-8'));
    const v2results = JSON.parse(fs.readFileSync(path + "/results/v2/user_rewards_homora_v2.json", 'utf-8'));

    const balances: {[user: string]: BigNumber} = {};

    Object.keys(v1results).forEach(user => balances[user] = new BigNumber(v1results[user]));
    Object.keys(v2results).forEach(user => {
        balances[user] = balances[user] ? balances[user].plus(new BigNumber(v2results[user])) : new BigNumber(v2results[user])
    });

    const final: {[user: string]: string} = {};

    Object.keys(balances).forEach(user => final[user] = balances[user].toFixed())

    return final;
}

function execShellCommand(cmd: string) {
    return new Promise((resolve, reject) => {
        exec(cmd,
            {
                cwd: path,
                env: {
                    WEB3_API: config.WEB3_API
                }
            },
            (error, stdout, stderr) => {
        if (error) {
            console.warn(error);
        }
        resolve(stdout? stdout : stderr);
        });
    });
}