import BigNumber from "bignumber.js";

import query from './queries';

import { DEFAULT_STEP, VESTING_START, YAM_REWARDER_ADDRESS } from './constants';
import { Options } from "../types/index";



export default async function getYamDistribution(options: Options) {
    options.startBlock = options.startBlock ?? VESTING_START;
    options.step = options.step ?? DEFAULT_STEP;

    const { poolsData, usersData } = await query({startBlock: options.startBlock, endBlock: options.endBlock, step: options.step});

    const balances: {[key: string]: BigNumber} = {};

    // The amount of entries in the users array and pools array is the same => can assume that the corresponding entry will be at the same index
    poolsData.forEach((pool, i) => {
        const users = usersData[i];
        users.forEach(user => {
            const points = user.balance.times(pool.weight);

            balances[user.user] = balances[user.user] ? balances[user.user].plus(points) : points;
        })
    });

    let totalPoints = new BigNumber(0);
    Object.keys(balances).forEach(key => totalPoints = totalPoints.plus(balances[key]));

    const fraction = (new BigNumber(options.blacklistDistribution[YAM_REWARDER_ADDRESS])).dividedBy(totalPoints);

    const final: {[key: string]: string} = {};

    Object.keys(balances).forEach(key => { 
        final[key] = (balances[key].times(fraction)).integerValue().toFixed();
        if(final[key] === "0") delete final[key];
    })

    return final;
}