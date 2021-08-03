import { Command } from "commander";
import fs from "fs";
import getDistribution from "@sushiswap/sushi-vesting-query";

import getDefiDollarDistribution from './index';
import { VESTING_START } from "./constants";

import { Options } from "../types/index";

const program = new Command();

program
    .option('-s, --startBlock <number>')
    .requiredOption('-e, --endBlock <number>')
    .option('--step <number>')
    .option('-p, --pathToBlacklistList <string>');

program.parse(process.argv);

main();

async function main() {
    const options: Options = {
        startBlock: Number(program.opts().startBlock ?? VESTING_START),
        endBlock: Number(program.opts().endBlock),
        blacklistDistribution: program.opts().pathToBlacklistList ? 
            JSON.parse(fs.readFileSync(program.opts().pathToBlacklistList, 'utf8')) :
            (await getDistribution({
                startBlock: Number(program.opts().startBlock ?? VESTING_START),
                endBlock: Number(program.opts().endBlock)
            })).blacklisted
    }

    const distribution = await getDefiDollarDistribution(options);

    if(!fs.existsSync('./outputs')) {
        fs.mkdirSync('./outputs')
    }

    fs.writeFileSync(
        `./outputs/amounts-${options.startBlock}-${options.endBlock}.json`,
        JSON.stringify(
            distribution, null, 1
        )
    );
}