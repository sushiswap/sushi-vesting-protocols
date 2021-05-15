import pageResults from 'graph-results-pager';
import BigNumber from "bignumber.js";

import { DRACULA_VESTING_SUBGRAPH, SUSHI_ADAPTER_ADDRESSES, DELAY } from './constants';
import { MasterchefPool, VampirePool, VampireUser } from "../types/subgraphs/dracula_vesting";
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
                    api: DRACULA_VESTING_SUBGRAPH,
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
            weight: new BigNumber(pool.allocPoint!).dividedBy(new BigNumber(pool.masterchef!.totalAllocPoint!)), // Calculates the weight of the whole pool
            balance: new BigNumber(pool.balance!)
        })),
    );
}


// Fetches the pool data of Dracula's MasterVampire
async function vampirePoolsQuery(blocks: number[]) {
    const queries = [];

    for(const block of blocks) {
        queries.push(
            makeQuery({
                api: DRACULA_VESTING_SUBGRAPH,
                query: {
                    entity: "vampirePools",
                    selection: {
                        block: {number: block}
                    },
                    properties: [
                        'id',
                        'victim',
                        'victimPoolId',
                        'balance'
                    ]
                }
            })
        );
        await delay(DELAY);
    }

    const vampirePools: VampirePool[][] = await Promise.all(queries);

    return vampirePools.map(block => 
        block
            .filter(pool => (
                // Filter out non-sushi "victims"
                SUSHI_ADAPTER_ADDRESSES.find(adapter => pool.victim === adapter.toLowerCase())
            ))
            .map(pool => ({
                vampirePoolId: Number(pool.id),
                masterchefPoolId: Number(pool.victimPoolId),
                balance: new BigNumber(pool.balance!),
            }))
            .sort((a, b) => a.vampirePoolId - b.vampirePoolId)
    );
}


// Fetches user data
async function usersQuery(blocks: number[]) {
    const queries = [];

    for(const block of blocks) {
        queries.push(
            makeQuery({
                api: DRACULA_VESTING_SUBGRAPH,
                query: {
                    entity: "vampireUsers",
                    selection: {
                        where: {
                            balance_gt: 0
                        },
                        block: {number: block}
                    },
                    properties: [
                        'id',
                        'balance'
                    ]
                }
            })
        );
        await delay(DELAY);
    }

    const users: VampireUser[][] = await Promise.all(queries);

    return users.map(block => 
        block
            .map(user => ({
                user: user.id?.split("-")[0]!,
                poolId: Number(user.id?.split("-")[1]),
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
    const vampirePools = await vampirePoolsQuery(blocks);
    const users = await usersQuery(blocks);

    return {
        poolsData: vampirePools.map((block, i) => {
            // Can assume that the corresponding masterchef block of pools will be on the same index
            const masterchefBlock = masterchefPools[i];

            return (
                block.map(vampirePool => {
                    const masterchefPool = masterchefBlock.find(masterchefPool => masterchefPool.id === vampirePool.masterchefPoolId)!;
                
                    // Calculates the weight of the vampire pool compared to the total weight of Masterchef
                    const weight = (vampirePool.balance.dividedBy(masterchefPool.balance)).times(masterchefPool.weight);

                    return ({
                        poolId: vampirePool.vampirePoolId, // Use vampirePoolId, since user ids will have this id as well 
                        weight: weight.isFinite() ? weight : new BigNumber(0) // Can be NaN or Infinite if some value is zero
                    })
                })
            )
        }),

        usersData: users
    };
}