import { Address, BigDecimal, BigInt } from "@graphprotocol/graph-ts"
import {
  AddCall as MasterchefAddCall,
  SetCall as MasterchefSetCall
} from "../generated/Masterchef/Masterchef"
import {
    AddCall as VampireAddCall,
    Deposit as VampireDeposit,
    Withdraw as VampireWithdraw,
    UpdateVictimInfoCall as VampireUpdateVictimInfoCall
} from "../generated/Vampire/MasterVampire"
import { Masterchef, MasterchefPool, MasterVampire, VampirePool, VampireUser, Action, Change } from "../generated/schema"

function getMasterchef(id: string): Masterchef {
    let masterchef = Masterchef.load(id);

    if(masterchef === null) {
        masterchef = new Masterchef(id);
        masterchef.totalAllocPoint = BigInt.fromI32(0);
        masterchef.poolLength = BigInt.fromI32(0);
    }

    return masterchef as Masterchef;
}

function updatePools(_block: BigInt): void {
    let masterchef = getMasterchef("1");
    let tAP = masterchef.totalAllocPoint;
    let poolLength = masterchef.poolLength;

    for(let i = 0; i < poolLength.toI32(); i++) {
        let masterchefPool = MasterchefPool.load(i.toString());
        let change = new Change(i.toString() + "-" + masterchefPool.changesLength.toString());
        
        change.masterchefPool = masterchefPool.id;

        change.oldWeight = masterchefPool.weight;
        masterchefPool.weight = masterchefPool.allocPoint.toBigDecimal().div(tAP.toBigDecimal());

        change.newWeight = masterchefPool.weight;

        change.block = _block;
        masterchefPool.lastBlockUpdated = _block;
        masterchefPool.changesLength = masterchefPool.changesLength.plus(BigInt.fromI32(1));

        change.save();
        masterchefPool.save();
    }
}

export function masterchefAddHandler(call: MasterchefAddCall): void {
    let masterchef = getMasterchef("1");
    let pool = new MasterchefPool(masterchef.poolLength.toString());

    pool.allocPoint = call.inputs._allocPoint;
    pool.weight = BigDecimal.fromString("0");
    pool.lastBlockUpdated = call.block.number;
    pool.changesLength = BigInt.fromI32(0);

    pool.save();

    masterchef.poolLength = BigInt.fromI32(1).plus(masterchef.poolLength);
    masterchef.totalAllocPoint = call.inputs._allocPoint.plus(masterchef.totalAllocPoint);

    masterchef.save();

    updatePools(call.block.number);
}

export function masterchefSetHandler(call: MasterchefSetCall): void {
    let masterchef = getMasterchef("1");
    let pool = MasterchefPool.load(call.inputs._pid.toString());

    masterchef.totalAllocPoint = masterchef.totalAllocPoint.plus(call.inputs._allocPoint.minus(pool.allocPoint));

    masterchef.save();

    pool.allocPoint = call.inputs._allocPoint;
    pool.lastBlockUpdated = call.block.number;

    pool.save();

    updatePools(call.block.number);
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
        vampireUser.actionsLength = BigInt.fromI32(0);

        vampireUser.save();
    }

    return vampireUser as VampireUser;
}

export function vampireAddHandler(call: VampireAddCall): void {
    let masterVampire = getMasterVampire("1");

    let vampirePool = new VampirePool(masterVampire.poolLength.toString());

    vampirePool.victim = call.inputs._victim;
    vampirePool.victimPoolId = call.inputs._victimPoolId;

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
    let vampireUser = getVampireUser(userId)

    let actionId = vampireUser.id + "-" + vampireUser.actionsLength.toString()
    let depositAction = new Action(actionId);
    
    depositAction.user = userId;
    depositAction.type = "deposit";
    
    depositAction.balanceBefore = vampireUser.balance;
    vampireUser.balance = vampireUser.balance.plus(event.params.amount);
    depositAction.balanceAfter = vampireUser.balance;

    depositAction.amount = event.params.amount;
    depositAction.block = event.block.number;

    depositAction.save();

    vampireUser.actionsLength = vampireUser.actionsLength.plus(BigInt.fromI32(1));
    vampireUser.save();
}

export function vampireWithdrawHandler(event: VampireWithdraw): void {
    const userId = event.params.user.toHex() + "-" +  event.params.pid.toString();
    let vampireUser = getVampireUser(userId)

    let actionId = vampireUser.id + "-" + vampireUser.actionsLength.toString()
    let withdrawAction = new Action(actionId);
    
    withdrawAction.user = userId;
    withdrawAction.type = "withdraw";

    withdrawAction.balanceBefore = vampireUser.balance;
    vampireUser.balance = vampireUser.balance.minus(event.params.amount);
    withdrawAction.balanceAfter = vampireUser.balance;

    withdrawAction.amount = event.params.amount;    
    withdrawAction.block = event.block.number;

    withdrawAction.save();

    vampireUser.actionsLength = vampireUser.actionsLength.plus(BigInt.fromI32(1));
    vampireUser.save();
}