import { Command } from "commander";
import fs from "fs";
import { utils } from "@lufycz/sushi-data";

import getDistribution from "@sushiswap/sushi-vesting-query";

import getProtocolDistribution from './index';
import { DEFAULT_STEP, VESTING_START } from "./constants";

import { Options } from "../types/index";

const program = new Command();

program
    .option('-s, --startBlock <number>')
    .requiredOption('-e, --endBlock <number>')
    .option('-c, --claimBlock <number>')
    .option('--step <number>')
    .option('-p, --pathToBlacklistList <string>');

program.parse(process.argv);

main();

async function main() {
    const options: Options = {
        startBlock: Number(program.opts().startBlock ?? VESTING_START),
        endBlock: Number(program.opts().endBlock),
        claimBlock: program.opts().claimBlock ?
            Number(program.opts().claimBlock) :
            undefined,
        step: Number(program.opts().step ?? DEFAULT_STEP),
        blacklistDistribution: program.opts().pathToBlacklistList ? 
            JSON.parse(fs.readFileSync(program.opts().pathToBlacklistList, 'utf8')) :
            (await getDistribution({
                startBlock: Number(program.opts().startBlock ?? VESTING_START),
                endBlock: Number(program.opts().endBlock)
            })).blacklisted
    }

    const distribution = await getProtocolDistribution(options);

    if(!fs.existsSync('./outputs')) {
        fs.mkdirSync('./outputs')
    }

    fs.writeFileSync(
        `./outputs/amounts-${options.startBlock}-${options.endBlock}.json`,
        JSON.stringify(
            distribution.amounts, null, 1
        )
    );

    fs.writeFileSync(
        `./outputs/merkle-${options.startBlock}-${options.endBlock}.json`,
        JSON.stringify(
            distribution.merkle, null, 1
        )
    );
}