import BigNumber from "bignumber.js";

import query from './queries';

import { DEFAULT_STEP, VESTING_START } from './constants';
import { Options } from "../types/index";

const VAULT_POOL_MAP = require('./constants').VAULT_POOL_MAP;



export default async function getHarvestDistribution(options: Options) {
    options.startBlock = options.startBlock ?? VESTING_START;
    options.step = options.step ?? DEFAULT_STEP;

    const { poolsData, usersData } = await query({startBlock: options.startBlock, endBlock: options.endBlock, step: options.step});

    const balances: {[pool: string]: {[user: string]: BigNumber}} = {};

    poolsData.forEach((block, i) => {
        const usersBlock = usersData[i];

        block.forEach(pool => {
            const users = usersBlock.filter(user => user.harvestPoolAddress === pool.harvestPoolAddress);

            // Looks dumb, but required, otherwise the forEach under it would fail
            balances[pool.harvestPoolAddress] = balances[pool.harvestPoolAddress] ?? {"0": new BigNumber(0)};

            users.forEach(user => {
                // Multiplying with pricePerShare since the balannce is the users' amount of shares, not SLPs
                const points = user.balance.times(pool.pricePerShare).times(pool.weight);

                balances[pool.harvestPoolAddress][user.user] = balances[pool.harvestPoolAddress][user.user] ? balances[pool.harvestPoolAddress][user.user].plus(points) : points;
            });
        });
    });

    // Gotta calculate for each pool separately
    const usersWithDuplicates = Object.keys(balances).map(poolKey => {
        const totalPoints = Object.keys(balances[poolKey])
            .reduce((points, userKey) => (new BigNumber(balances[poolKey][userKey])).plus(points), new BigNumber(0));

        // Has to be translated through a map because of Harvest's contract design
        const fraction = new BigNumber(options.blacklistDistribution[VAULT_POOL_MAP[poolKey]]).div(totalPoints);

        const users: {[key: string]: BigNumber} = {};
        Object.keys(balances[poolKey]).forEach(userKey => {
            users[userKey] = (balances[poolKey][userKey].times(fraction));
        })

        return users;
    });

    // Removes the duplicates (users who might've used multiple farms)
    const usersCleaned: {[key: string]: BigNumber} = {};
    usersWithDuplicates.forEach(usersBlock => {
        Object.keys(usersBlock).forEach(userKey => {
            // If exists, add to existring entry, if doesn't, create a new one
            usersCleaned[userKey] = usersCleaned[userKey] ? usersCleaned[userKey].plus(usersBlock[userKey]) : usersBlock[userKey];
        })
    })

    // Just converts the type to string
    const final: {[key: string]: string} = {};
    Object.keys(usersCleaned).forEach(userKey => {
        final[userKey] = usersCleaned[userKey].integerValue().toFixed();
        if(final[userKey] === "0") delete final[userKey];
    })

    return final;
}