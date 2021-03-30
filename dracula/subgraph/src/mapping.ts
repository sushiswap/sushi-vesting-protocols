import { BigInt, log } from "@graphprotocol/graph-ts"
import {
  AddCall as MasterchefAddCall,
  SetCall as MasterchefSetCall,
  Deposit as MasterchefDeposit,
  Withdraw as MasterchefWithdraw,
} from "../generated/Masterchef/Masterchef"
import {
    AddCall as VampireAddCall,
    Deposit as VampireDeposit,
    Withdraw as VampireWithdraw,
    UpdateVictimInfoCall as VampireUpdateVictimInfoCall
} from "../generated/Vampire/MasterVampire"
import { Masterchef, MasterchefPool, MasterVampire, VampirePool, VampireUser } from "../generated/schema"

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



function getMasterVampire(id: string): MasterVampire {
    let masterVampire = MasterVampire.load(id);

    if(masterVampire === null) {
        masterVampire = new MasterVampire(id);
        masterVampire.poolLength = BigInt.fromI32(0);
    }

    return masterVampire as MasterVampire;
}

function getVampireUser(id: string): VampireUser {
    let vampireUser = VampireUser.load(id);

    if(vampireUser === null) {
        vampireUser = new VampireUser(id);
        vampireUser.vampirePool = id.split("-")[1];
        vampireUser.balance = BigInt.fromI32(0);

        vampireUser.save();
    }

    return vampireUser as VampireUser;
}

export function vampireAddHandler(call: VampireAddCall): void {
    let masterVampire = getMasterVampire("1");

    let vampirePool = new VampirePool(masterVampire.poolLength.toString());

    vampirePool.victim = call.inputs._victim;
    vampirePool.victimPoolId = call.inputs._victimPoolId;
    vampirePool.balance = BigInt.fromI32(0);

    vampirePool.save();

    masterVampire.poolLength = masterVampire.poolLength.plus(BigInt.fromI32(1));
    masterVampire.save();
}

export function vampireUpdateVictimInfoHandler(call: VampireUpdateVictimInfoCall): void {
    let vampirePool = VampirePool.load(call.inputs._pid.toString());

    if(vampirePool === null) {
        return;
    }

    vampirePool.victim = call.inputs._victim;
    vampirePool.victimPoolId = call.inputs._victimPoolId;

    vampirePool.save();
}

export function vampireDepositHandler(event: VampireDeposit): void {
    const userId = event.params.user.toHex() + "-" +  event.params.pid.toString();
    let vampireUser = getVampireUser(userId);
    vampireUser.balance = vampireUser.balance.plus(event.params.amount);
    vampireUser.save();

    let vampirePool = VampirePool.load(event.params.pid.toString());
    vampirePool.balance = vampirePool.balance.plus(event.params.amount);
    vampirePool.save();
}

export function vampireWithdrawHandler(event: VampireWithdraw): void {
    const userId = event.params.user.toHex() + "-" +  event.params.pid.toString();
    let vampireUser = getVampireUser(userId)   
    vampireUser.balance = vampireUser.balance.minus(event.params.amount);
    vampireUser.save();

    let vampirePool = VampirePool.load(event.params.pid.toString());
    vampirePool.balance = vampirePool.balance.minus(event.params.amount);
    vampirePool.save();
}