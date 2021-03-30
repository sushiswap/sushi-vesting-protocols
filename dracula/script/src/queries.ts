import pageResults from 'graph-results-pager';

import { DRACULA_VESTING_SUBGRAPH, SUSHI_ADAPTER_ADDRESSES, DELAY } from './constants';
import { MasterchefPool, VampirePool, VampireUser } from "../types/subgraphs/dracula_vesting";


test()
async function test() {
    const results = await query()
    //console.log(results[100])
}

// TheGraph doesn't like it for some reason when I make thousands of requests a second...
async function delay(ms: number) {
    return new Promise( resolve => setTimeout(resolve, ms) );
}

async function masterchefPoolsQuery(blocks: number[]) {
    const queries = [];

    for(const block of blocks) {
        queries.push(
            pageResults({
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
            })
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



async function vampirePoolsQuery(blocks: number[]) {
    const queries = [];

    for(const block of blocks) {
        queries.push(
            pageResults({
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
                balance: Number(pool.balance),
            }))
            .sort((a, b) => a.vampirePoolId - b.vampirePoolId)
    );
}



async function usersQuery(blocks: number[]) {
    const queries = [];

    for(const block of blocks) {
        queries.push(
            pageResults({
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
                balance: Number(user.balance)
            }))
    );
}



export default async function query({startBlock = 11001618, endBlock = 12123943, step = 10000} = {}) {  
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
                    const weight = (vampirePool.balance / masterchefPool?.balance) * masterchefPool?.weight;

                    return ({
                        poolId: vampirePool.vampirePoolId, // Use vampirePoolId, since user ids will have this id as well 
                        weight: isFinite(weight) ? weight : 0 // Can be NaN or Infinite if some value is zero
                    })
                })
            )
            .filter(pool => pool.weight !== 0)
        }),

        usersData: users
    };
}