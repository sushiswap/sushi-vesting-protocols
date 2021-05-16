import BigNumber from "bignumber.js";

import { sushi } from "@lufycz/sushi-data";

import getDraculaDistribution from "sushi-vesting-dracula";
import getYamDistribution from "sushi-vesting-yam";
import getHarvestDistribution from "sushi-vesting-harvest";

import { parseBalanceMap } from './merkle/parse-balance-map';

import { Options } from "../types/index";


export default async function getProtocolDistribution(options: Options) {
    const protocolList: {[key: string]: string}[] = [];

    // Will be fetching synchronously to not clog the API
    protocolList.push(await getDraculaDistribution(options));
    protocolList.push(await getYamDistribution(options));
    protocolList.push(await getHarvestDistribution(options));

    const balances: {[key: string]: BigNumber} = {};

    // Consolidate into one array
    protocolList.forEach(protocol => {
        Object.keys(protocol).forEach(userKey => {
            balances[userKey] = balances[userKey] ? 
                balances[userKey] = balances[userKey].plus(new BigNumber(protocol[userKey])) :
                new BigNumber(protocol[userKey])
        })
    })

    const claimedList = await sushi.vesting.users({block: options.claimBlock, type: "protocol"})

    // Subtract the claimed amounts
    Object.keys(balances).forEach(userKey => {
        const claimedAmount = claimedList.find(user => user.id === userKey)?.totalClaimed ?? new BigNumber(0);

        balances[userKey] = balances[userKey].minus(claimedAmount);
    })

    // Prepare for finalization
    const final: {[key: string]: string} = {};

    Object.keys(balances).forEach(userKey => {
        if(balances[userKey].lte(0)) return;

        final[userKey] = balances[userKey].integerValue().toFixed();
    })

    return {
        amounts: final,
        merkle: parseBalanceMap(final)
    }
}