import pageResults from 'graph-results-pager';
import BigNumber from "bignumber.js";

import { HARVEST_VESTING_SUBGRAPH, DELAY } from './constants';
import { MasterchefPool, HarvestPool, HarvestUser } from "../types/subgraphs/harvest_vesting";
import { Awaited } from '../types';


// TheGraph doesn't like it for some reason when I make thousands of requests a second...
async function delay(ms: number) {
    return new Promise( resolve => setTimeout(resolve, ms) );
}


// The queries fail quite often unfortunately
async function makeQuery(args: any) {
    let result: Awaited<ReturnType<typeof pageResults>> | undefined = undefined;

    while(!result) {
        try {
            result = await pageResults(args)
        }
        catch(err) {}
    }

    return result;
}


// Fetches the pool data of our Masterchef
async function masterchefPoolsQuery(blocks: number[]) {
    const queries = [];

    for(const block of blocks) {
        queries.push(
            makeQuery(
                {
                    api: HARVEST_VESTING_SUBGRAPH,
                    query: {
                        entity: "masterchefPools",
                        selection: {
                            block: {number: block}
                        },
                        properties: [
                            'id',
                            'allocPoint',
                            'masterchef { totalAllocPoint }',
                            'balance'
                        ]
                    }
                }
            )
        );
        await delay(DELAY);
    }

    const masterchefPools: MasterchefPool[][] = await Promise.all(queries);

    // Clean up the output of the query
    return masterchefPools.map(block => 
        block.map(pool => ({
            id: Number(pool.id),
            weight: new BigNumber(pool.allocPoint!).dividedBy(new BigNumber!(pool.masterchef?.totalAllocPoint!)), // Calculates the weight of the whole pool
            balance: new BigNumber(pool.balance!)
        })),
    );
}


// Fetches Harvest's pool data
async function harvestPoolsQuery(blocks: number[]) {
    const queries = [];

    for(const block of blocks) {
        queries.push(
            makeQuery({
                api: HARVEST_VESTING_SUBGRAPH,
                query: {
                    entity: "harvestPools",
                    selection: {
                        block: {number: block}
                    },
                    properties: [
                        'id',
                        'masterchefPoolId',
                        'balance',
                        'pricePerShare'
                    ]
                }
            })
        );
        await delay(DELAY);
    }

    const harvestPools: HarvestPool[][] = await Promise.all(queries);

    return harvestPools.map(block => 
        block
            .map(pool => ({
                harvestPoolAddress: String(pool.id),
                masterchefPoolId: Number(pool.masterchefPoolId),
                balance: new BigNumber(pool.balance!),
                pricePerShare: new BigNumber(pool.pricePerShare!).dividedBy(1e18)
            }))
    );
}


// Fetches user data
async function usersQuery(blocks: number[]) {
    const queries = [];

    for(const block of blocks) {
        queries.push(
            makeQuery({
                api: HARVEST_VESTING_SUBGRAPH,
                query: {
                    entity: "harvestUsers",
                    selection: {
                        where: {
                            balance_gt: 0
                        },
                        block: {number: block}
                    },
                    properties: [
                        'id',
                        'harvestPool { id }',
                        'address',
                        'balance'
                    ]
                }
            })
        );
        await delay(DELAY);
    }

    const users: HarvestUser[][] = await Promise.all(queries);

    return users.map(block => 
        block
            .map(user => ({
                user: user.address!,
                harvestPoolAddress: user.harvestPool?.id!,
                balance: new BigNumber(user.balance!)
            }))
    );
}


// Wrapped and clean-upper for all the queries
export default async function query({startBlock, endBlock, step}: {startBlock: number, endBlock: number, step: number}) {  
    const blocks: number[] = [];

    for(let i = startBlock; i <= endBlock; i += step) {
        blocks.push(i);
    }
    
    const masterchefPools = await masterchefPoolsQuery(blocks);
    const harvestPools = await harvestPoolsQuery(blocks);
    const users = await usersQuery(blocks);

    return {
        poolsData: harvestPools.map((block, i) => {
            // Can assume that the corresponding masterchef block of pools will be on the same index
            const masterchefBlock = masterchefPools[i];

            return (
                block.map(harvestPool => {
                    const masterchefPool = masterchefBlock.find(masterchefPool => masterchefPool.id === harvestPool.masterchefPoolId)!;
                
                    // Calculates the weight of the harvest pool compared to the total weight of Masterchef
                    const weight = harvestPool.balance.times(harvestPool.pricePerShare).dividedBy(masterchefPool.balance).times(masterchefPool.weight);

                    return ({
                        harvestPoolAddress: harvestPool.harvestPoolAddress,
                        pricePerShare: harvestPool.pricePerShare,
                        weight: weight.isFinite() ? weight : new BigNumber(0) // Can be NaN or Infinite if some value is zero
                    })
                })
            )
        }),

        usersData: users
    };
}