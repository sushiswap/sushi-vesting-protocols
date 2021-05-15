import { Command } from "commander";
import fs from "fs";
import getDistribution from "sushi-vesting-query";

import getHarvestDistribution from './index';

import { DEFAULT_STEP, VESTING_START } from "./constants";
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
        step: Number(program.opts().step ?? DEFAULT_STEP),
        blacklistDistribution: program.opts().pathToBlacklistList ? 
            JSON.parse(fs.readFileSync(program.opts().pathToBlacklistList, 'utf8')) :
            (await getDistribution({
                startBlock: Number(program.opts().startBlock ?? VESTING_START),
                endBlock: Number(program.opts().endBlock)
            })).blacklisted
    }

    const distribution = await getHarvestDistribution(options);

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