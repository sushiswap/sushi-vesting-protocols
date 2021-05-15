import { Command } from "commander";
import fs from "fs";

import getYamDistribution from './index';

import { DEFAULT_STEP, VESTING_START } from "./constants";
import { Options } from "../types/index";

const program = new Command();

program
    .option('-s, --startBlock <number>')
    .requiredOption('-e, --endBlock <number>')
    .option('--step <number>')
    .requiredOption('-t, --totalVested <bigint>');

program.parse(process.argv);

const options: Options = {
    startBlock: Number(program.opts().startBlock ?? VESTING_START),
    endBlock: Number(program.opts().endBlock),
    step: Number(program.opts().step ?? DEFAULT_STEP),
    totalVested: Number(program.opts().totalVested)
}

main();

async function main() {
    const distribution = await getYamDistribution(options);

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