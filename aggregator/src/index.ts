import BigNumber from "bignumber.js";

import { sushi } from "@lufycz/sushi-data";

import getAlphaDistribution from "sushi-vesting-alpha";
import getCreamDistribution from "sushi-vesting-cream";
import getDefiDollarDistribution from "sushi-vesting-defidollar"
import getDraculaDistribution from "sushi-vesting-dracula";
import getYamDistribution from "sushi-vesting-yam";
import getHarvestDistribution from "sushi-vesting-harvest";
import getPickleDistribution from "sushi-vesting-pickle";

import { parseBalanceMap } from './merkle/parse-balance-map';

import { Options } from "../types/index";

import redirects from './redirects.json';

export default async function getProtocolDistribution(options: Options) {
    const protocolList: {[key: string]: string}[] = [];

    // Will be fetching synchronously to not clog the API
    protocolList.push(await getAlphaDistribution(options));
    protocolList.push(await getCreamDistribution(options));
    protocolList.push(await getDefiDollarDistribution(options));
    protocolList.push(await getDraculaDistribution(options));
    protocolList.push(await getYamDistribution(options));
    protocolList.push(await getHarvestDistribution(options));
    protocolList.push(await getPickleDistribution(options));

    const balances: {[key: string]: BigNumber} = {};

    // Consolidate into one array
    protocolList.forEach(protocol => {
        Object.keys(protocol).forEach(userKey => {
            balances[userKey] = balances[userKey] ? 
                balances[userKey] = balances[userKey].plus(new BigNumber(protocol[userKey])) :
                new BigNumber(protocol[userKey])
        })
    })

    const claimedList: any = [] // will be done in one go

    // Redirect
    //claimedList.forEach(claim => redirects.find(redirect => claim.id === redirect.from)?.to ?? claim.id);
    Object.keys(balances).forEach(userKey => {
        const newAddress = redirects.find(redirect => redirect.from === userKey)?.to;
        if(newAddress) {
            balances[newAddress] = balances[userKey];
            delete balances[userKey];
        }
    })

    // Subtract the claimed amounts
    // Object.keys(balances).forEach(userKey => {
    //     const claimedAmount = claimedList.find(user => user.id === userKey)?.totalClaimed ?? new BigNumber(0);

    //     balances[userKey] = balances[userKey].minus(claimedAmount);
    // })

    // Prepare for finalization
    const final: {[key: string]: string} = {};

    Object.keys(balances).forEach(userKey => {
        if(balances[userKey].lte(0)) return;

        final[userKey] = balances[userKey].integerValue().toFixed();
    })

    const totalBlacklisted = Object.values(options.blacklistDistribution).reduce((acc,amount) => acc + BigInt(amount), BigInt(0))
    const totalToDistribute = Object.values(final).reduce((acc,amount) => acc + BigInt(amount), BigInt(0))

    console.log(`totalBlacklisted: ${totalBlacklisted / BigInt(1e18)}`)
    console.log(`totalToDistribute: ${totalToDistribute / BigInt(1e18)}`)

    return {
        amounts: final,
        merkle: parseBalanceMap(final)
    }
}
