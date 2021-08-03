import pageResults from 'graph-results-pager';
import BigNumber from "bignumber.js";
import dotenv from "dotenv";
import Web3 from 'web3'

import { DEFIDOLLAR_VESTING_SUBGRAPH, DELAY, DFDMINER_ABI, DFD_ADDRESS, DUSD_ADDRESS, DUSD_DEPLOY_BLOCK } from './constants';
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
export async function harvestedQuery({startBlock, endBlock}: {startBlock: number, endBlock: number}) {
    const query = (block: number) => (
        {
            api: DEFIDOLLAR_VESTING_SUBGRAPH,
            query: {
                entity: "users",
                selection: {
                    block: {number: block}
                },
                properties: [
                    'id',
                    'sushiHarvested'
                ]
            }
        }
    )

    const harvestedStart = await makeQuery(query(startBlock))
    const harvestedEnd = await makeQuery(query(endBlock))

    // Clean up the output of the query
    return {
        harvestedStart: harvestedStart.map(entry => ({ user: entry.id, harvested: new BigNumber(entry.sushiHarvested as string) })),
        harvestedEnd: harvestedEnd.map(entry => ({ user: entry.id, harvested: new BigNumber(entry.sushiHarvested as string) }))
    }
}

export async function pendingQuery(users: string[], {startBlock, endBlock}: {startBlock: number, endBlock: number}) {
    const config = dotenv.config({path: __filename.replace("protocols/defidollar/script/src/queries.ts", ".env")}).parsed!
    if(!config.WEB3_API) throw new Error("WEB3_API not defined in .env!")
    const web3 = new Web3(new Web3.providers.HttpProvider(config.WEB3_API))

    const query = async(block: number, contractAddress: string) => {
        if(block <= DUSD_DEPLOY_BLOCK) return []

        const contract = new web3.eth.Contract(DFDMINER_ABI as any, contractAddress)

        const queries = []
        for(const user of users) {
            queries.push(contract.methods.sushiEarned(user).call(block).then(
                (amount: string) => ({
                    user: user,
                    amount: new BigNumber(amount)
                })
            ))
        }

        return await Promise.all(queries)
    }

    const [
        dusdFetchedStart,
        dusdFetchedEnd,
        dfdFetchedStart,
        dfdFetchedEnd
    ] = await Promise.all([
        await query(startBlock, DUSD_ADDRESS),
        await query(endBlock, DUSD_ADDRESS),
        await query(startBlock, DFD_ADDRESS),
        await query(endBlock, DFD_ADDRESS)
    ])

    const fetchedStart = users.map(user => {
        const dusd = dusdFetchedStart.find(u => user === u.user)?.amount
        const dfd = dfdFetchedStart.find(u => user === u.user)?.amount

        return {
            user: user,
            pending: (dusd ?? new BigNumber(0)).plus(dfd ?? new BigNumber(0))
        }
    })

    const fetchedEnd = users.map(user => {
        const dusd = dusdFetchedEnd.find(u => user === u.user)?.amount
        const dfd = dfdFetchedEnd.find(u => user === u.user)?.amount

        return {
            user: user,
            pending: (dusd ?? new BigNumber(0)).plus(dfd ?? new BigNumber(0))
        }
    })

    return {
        pendingStart: fetchedStart,
        pendingEnd: fetchedEnd
    }
}