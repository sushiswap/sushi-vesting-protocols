import * as dotenv from "dotenv";
import pageResults from 'graph-results-pager';
import Web3 from 'web3';

import { DEPOSIT_TOPIC, WITHDRAW_TOPIC,DRACULA_VESTING_SUBGRAPH, MASTER_VAMPIRE_ADDRESS, SUSHI_ADAPTER_ADDRESSES } from './constants';
import { Change, VampirePool, VampireUser } from "../types/subgraphs/dracula_vesting";
import { Awaited } from "../types";

dotenv.config({ path: './.env' });

const web3 = new Web3(process.env.WEB3_PROVIDER as string);


test()
async function test() {
    console.log((await usersQuery())[0])
}

async function changesQuery() {
    const results: Change[] = await pageResults({
        api: DRACULA_VESTING_SUBGRAPH,
        query: {
            entity: 'changes',
            properties: [
                'id',
                'oldWeight',
                'newWeight',
                'block'
            ]
        },
    })

    return results.map(change => ({
        poolId: change.id?.split("-")[0],
        changeNumber: change.id?.split("-")[1],
        oldWeight: Number(change.oldWeight),
        newWeight: Number(change.newWeight),
        block: BigInt(change.block)
    }))
}

async function poolsQuery() {
    const results: VampirePool[] = await pageResults({
        api: DRACULA_VESTING_SUBGRAPH,
        query: {
            entity: 'vampirePools',
            properties: [
                'id',
                'victim',
                'victimPoolId'
            ]
        }
    })

        return results
            .filter(pool => SUSHI_ADAPTER_ADDRESSES.find(adapter => pool.victim === adapter.toLowerCase()))
            .map(pool => ({
                vampirePoolId: Number(pool.id),
                masterchefPoolId: Number(pool.victimPoolId)
            }))
            .sort((a, b) => a.vampirePoolId - b.vampirePoolId);
}

async function usersQuery() {
    const results: VampireUser[] = await pageResults({
        api: DRACULA_VESTING_SUBGRAPH,
        query: {
            entity: 'vampireUsers',
            properties: [
                'id',
                'vampirePool { victimPoolId }',
                'actions(first: 1000) { id, type, balanceBefore, balanceAfter, block }'
            ]
        }
    });

    const pools = await poolsQuery();
    console.log(pools)
    return results
        .filter(user => pools.find(pool => user.id?.split("-")[1] === String(pool.vampirePoolId)) ? true : false)
        .map(user => ({
            address: user.id?.split("-")[0],
            vampirePoolId: Number(user.id?.split("-")[1]),
            masterchefPoolId: Number(user.vampirePool?.victimPoolId),
            actions: user.actions?.map(action => ({
                type: action.type,
                balanceBefore: BigInt(action.balanceBefore),
                balanceAfter: BigInt(action.balanceAfter),
                block: BigInt(action.block)
            })).sort((a,b) => Number(a.block - b.block))
        }))
}

export default {
    changesQuery,
    poolsQuery,
    usersQuery
}