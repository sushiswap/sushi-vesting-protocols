import BigNumber from "bignumber.js";

import { DUSD_DEPLOY_BLOCK, VESTING_START } from './constants';
import { harvestedQuery, pendingQuery } from './queries';

import { Options } from "../types/index";

export default async function getDefiDollarDistribution(options: Options) {
    options.startBlock = options.startBlock ?? VESTING_START;
    if(options.endBlock <= DUSD_DEPLOY_BLOCK) return {} 

    const { harvestedStart, harvestedEnd } = await harvestedQuery(options as any);
    
    const users = harvestedEnd.map(entry => entry.user as string)

    const { pendingStart, pendingEnd } = await pendingQuery(users, options as any)

    const final: {[key: string]: string} = {};

    users.forEach(user => {
        const hStart = harvestedStart.find(u => u.user === user)?.harvested ?? new BigNumber(0)
        const hEnd = harvestedEnd.find(u => u.user === user)!.harvested as BigNumber

        const pStart = pendingStart.find(u => u.user === user)!.pending as BigNumber
        const pEnd = pendingEnd.find(u => u.user === user)!.pending as BigNumber

        // ((pendingEnd - pendingStart) + (harvestedEnd - harvestedStart)) * 2
        final[user] = (pEnd.minus(pStart).plus(hEnd.minus(hStart))).times(2).toFixed()
    })

    return final;
}