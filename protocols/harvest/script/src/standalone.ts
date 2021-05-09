import { Command } from "commander";
import fs from "fs";
import { VESTING_START } from "./constants";

import getHarvestDistribution from './index';

import amounts from './blacklisted-10959148-12171394.json' // temporary solution

const program = new Command();

type Options = {
    startBlock: number,
    endBlock: number,
    step: number | undefined,
    totalVested: {[address: string]: string}
}

program
    .option('-s, --startBlock <number>')
    .requiredOption('-e, --endBlock <number>')
    .option('--step <number>')
    .requiredOption('-t, --totalVested <bigint>');

program.parse(process.argv);

const options: Options = {
    startBlock: Number(program.opts().startBlock ?? VESTING_START),
    endBlock: Number(program.opts().endBlock),
    step: Number(program.opts().step),
    totalVested: amounts
}

main();

async function main() {
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