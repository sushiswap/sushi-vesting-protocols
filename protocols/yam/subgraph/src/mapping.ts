import { BigInt, log } from "@graphprotocol/graph-ts"
import {
  AddCall as MasterchefAddCall,
  SetCall as MasterchefSetCall,
  Deposit as MasterchefDeposit,
  Withdraw as MasterchefWithdraw,
} from "../generated/Masterchef/Masterchef"
import {
    Staked as YamDeposit,
    Withdrawn as YamWithdraw,
} from "../generated/Incentivizer/YamIncentivizer"
import { Masterchef, MasterchefPool, YamUser } from "../generated/schema"

function getMasterchef(id: string): Masterchef {
    let masterchef = Masterchef.load(id);

    if(masterchef === null) {
        masterchef = new Masterchef(id);
        masterchef.totalAllocPoint = BigInt.fromI32(0);
        masterchef.poolLength = BigInt.fromI32(0);
    }

    return masterchef as Masterchef;
}

export function masterchefAddHandler(call: MasterchefAddCall): void {
    let masterchef = getMasterchef("1");
    let pool = new MasterchefPool(masterchef.poolLength.toString());

    pool.masterchef = "1";
    pool.allocPoint = call.inputs._allocPoint;
    pool.balance = BigInt.fromI32(0);
    pool.lastBlockUpdated = call.block.number;

    pool.save();

    masterchef.poolLength = BigInt.fromI32(1).plus(masterchef.poolLength);
    masterchef.totalAllocPoint = call.inputs._allocPoint.plus(masterchef.totalAllocPoint);

    masterchef.save();
}

export function masterchefSetHandler(call: MasterchefSetCall): void {
    let masterchef = getMasterchef("1");
    let pool = MasterchefPool.load(call.inputs._pid.toString());

    masterchef.totalAllocPoint = masterchef.totalAllocPoint.plus(call.inputs._allocPoint.minus(pool.allocPoint));

    masterchef.save();

    pool.allocPoint = call.inputs._allocPoint;
    pool.lastBlockUpdated = call.block.number;

    pool.save();
}

export function masterchefDepositHandler(event: MasterchefDeposit): void {
    let masterchefPool = MasterchefPool.load(event.params.pid.toString());

    masterchefPool.balance = masterchefPool.balance.plus(event.params.amount);

    masterchefPool.save();
}

export function masterchefWithdrawHandler(event: MasterchefWithdraw): void {
    let masterchefPool = MasterchefPool.load(event.params.pid.toString());

    masterchefPool.balance = masterchefPool.balance.minus(event.params.amount);

    masterchefPool.save();
}



function getYamUser(id: string): YamUser {
    let yamUser = YamUser.load(id);

    if(yamUser === null) {
        yamUser = new YamUser(id);
        yamUser.balance = BigInt.fromI32(0);

        yamUser.save();
    }

    return yamUser as YamUser;
}

export function yamDepositHandler(event: YamDeposit): void {
    const userId = event.params.user.toHex();
    let yamUser = getYamUser(userId);
    yamUser.balance = yamUser.balance.plus(event.params.amount);
    yamUser.save();
}

export function yamWithdrawHandler(event: YamWithdraw): void {
    const userId = event.params.user.toHex();
    let yamUser = getYamUser(userId)   
    yamUser.balance = yamUser.balance.minus(event.params.amount);
    yamUser.save();
}