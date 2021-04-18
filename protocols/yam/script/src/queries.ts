import pageResults from 'graph-results-pager';

import { YAM_VESTING_SUBGRAPH, DELAY, YAM_POOL_ID } from './constants';
import { MasterchefPool, YamUser } from "../types/subgraphs/yam_vesting";
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


// Fetches the pool data of our Masterchef, could be more efficient, but it's fast enough so w/e
async function masterchefPoolsQuery(blocks: number[]) {
    const queries = [];

    for(const block of blocks) {
        queries.push(
            makeQuery(
                {
                    api: YAM_VESTING_SUBGRAPH,
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
            weight: Number(pool.allocPoint) / Number(pool.masterchef?.totalAllocPoint), // Calculates the weight of the whole pool
            balance: Number(pool.balance)
        })),
    );
}


// Fetches user data
async function usersQuery(blocks: number[]) {
    const queries = [];

    for(const block of blocks) {
        queries.push(
            makeQuery({
                api: YAM_VESTING_SUBGRAPH,
                query: {
                    entity: "yamUsers",
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

    const users: YamUser[][] = await Promise.all(queries);

    return users.map(block => 
        block
            .map(user => ({
                user: user.id?.split("-")[0]!,
                balance: Number(user.balance)
            }))
    );
}


// Wrapper and clean-upper for all the queries
export default async function query({startBlock, endBlock, step}: {startBlock: number, endBlock: number, step: number}) {  
    const blocks: number[] = [];

    for(let i = startBlock; i <= endBlock; i += step) {
        blocks.push(i);
    }
    
    const masterchefPools = await masterchefPoolsQuery(blocks);
    const users = await usersQuery(blocks);

    return {
        poolsData: masterchefPools.map((blockOfPools, i) => {
            const yamPool = blockOfPools.find(pool => pool.id === YAM_POOL_ID);
            const yamIncentiviserBalance = users[i].reduce((a, b) => a + b.balance, 0);
            
            const weight = yamPool ? (yamIncentiviserBalance / yamPool.balance) * yamPool.weight : 0;

            return ({
                weight: isFinite(weight) ? weight : 0
            })

        }),

        usersData: users
    }
}