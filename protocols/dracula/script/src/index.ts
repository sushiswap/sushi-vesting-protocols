import BigNumber from "bignumber.js";

import { DEFAULT_STEP, MASTER_VAMPIRE_ADDRESS, VESTING_START } from './constants';
import query from './queries';

import { Options } from "../types/index";


export default async function getDraculaDistribution(options: Options) {
    options.startBlock = options.startBlock ?? VESTING_START;
    options.step = options.step ?? DEFAULT_STEP;

    const { poolsData, usersData } = await query({startBlock: options.startBlock, endBlock: options.endBlock, step: options.step});

    const balances: {[key: string]: BigNumber} = {};

    poolsData.forEach((block, i) => {
        const usersBlock = usersData[i];

        block.forEach(pool => {
            const users = usersBlock.filter(user => user.poolId === pool.poolId)
            
            users.forEach(user => {
                const points = user.balance.times(pool.weight);

                balances[user.user] = balances[user.user] ? balances[user.user].plus(points) : points;
            });
        });
    });

    let totalPoints = new BigNumber(0);
    Object.keys(balances).forEach(key => totalPoints = balances[key].plus(totalPoints));

    const fraction = (new BigNumber(options.blacklistDistribution[MASTER_VAMPIRE_ADDRESS])).dividedBy(totalPoints);

    const final: {[key: string]: string} = {};

    Object.keys(balances).forEach(key => { 
        final[key] = (balances[key].times(fraction)).integerValue().toFixed();
        if(final[key] === "0") delete final[key];
    })

    return final;
}