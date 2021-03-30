import { Command } from "commander";
import fs from "fs";

import getDraculaDistribution from './index';

const program = new Command();

const options = {
    startBlock: 11001618,
    endBlock: 12135554,
    step: 2500,
    totalVested: 1000
}

getDraculaDistribution(options)