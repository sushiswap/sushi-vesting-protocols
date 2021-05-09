import { Address, BigInt, log } from "@graphprotocol/graph-ts"
import {
  AddCall as MasterchefAddCall,
  SetCall as MasterchefSetCall,
  Deposit as MasterchefDeposit,
  Withdraw as MasterchefWithdraw,
} from "../generated/Masterchef/Masterchef"
import {
    DoHardWorkCall,
    Transfer as HarvestTransfer, Vault
} from "../generated/Harvest_DAI_ETH/Vault"
import { ProfitLogInReward } from "../generated/Harvest_USDC_ETH/Strategy"
import { Masterchef, MasterchefPool, HarvestPool, HarvestUser } from "../generated/schema"

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





function getHarvestUser(id: string): HarvestUser {
    let harvestUser = HarvestUser.load(id);

    if(harvestUser === null) {
        harvestUser = new HarvestUser(id);
        harvestUser.address = id.split("-")[1];
        harvestUser.harvestPool = id.split("-")[0];
        harvestUser.balance = BigInt.fromI32(0);

        harvestUser.save();
    }

    return harvestUser as HarvestUser;
}

function getHarvestPool(id: string): HarvestPool {
    let harvestPool = HarvestPool.load(id);

    if(harvestPool === null) {
        harvestPool = new HarvestPool(id);
        const poolAddress = id;

        harvestPool.masterchefPoolId = 
            poolAddress == "0x203e97aa6eb65a1a02d9e80083414058303f241e" ? BigInt.fromI32(2) : // DAI_ETH_Proxy 0x895cc1b32aa6f5fedf0e113eac556309ad225322
            poolAddress == "0x29ec64560ab14d3166222bf07c3f29c4916e0027" ? BigInt.fromI32(2) : // DAI_ETH 0x923ca6dcef62030bed25aa3ef854f39dc45dda65
            poolAddress == "0x01bd09a1124960d9be04b638b142df9df942b04a" ? BigInt.fromI32(1) : // USDC_ETH 0xd5d2adcb5e6ad20425b0650e4050c0ea9ec3cec0
            poolAddress == "0x64035b583c8c694627a199243e863bb33be60745" ? BigInt.fromI32(0) : // USDT_ETH 0x180a71c5688ac7e2368890ef77b0036af8e261b6
            poolAddress == "0x5c0a3f55aac52aa320ff5f280e77517cbaf85524" ? BigInt.fromI32(21) : // WBTC_ETH 0xdd1dfbb5a580e96c2723ccaf687227900f97f053
            BigInt.fromI32(999);
        
        harvestPool.balance = BigInt.fromI32(0);
        harvestPool.pricePerShare = BigInt.fromI32(1);

        harvestPool.save();
    }

    return harvestPool as HarvestPool;
}

export function harvestTransferHandler(event: HarvestTransfer): void {
    const poolAddress = event.address.toHex();
    const amount = event.params.value;

    if(event.params.from.toHex() == "0x0000000000000000000000000000000000000000") { // Deposit
        const userAddress = event.params.to.toHex();
        harvestDepositHandler(poolAddress, userAddress, amount);
    }

    if(event.params.to.toHex() == "0x0000000000000000000000000000000000000000") { // Withdraw
        const userAddress = event.params.from.toHex();
        harvestWithdrawHandler(poolAddress, userAddress, amount);
    }
}

function harvestDepositHandler(poolAddress: string, userAddress: string, amount: BigInt): void {
    const userId = poolAddress + "-" + userAddress;
    let harvestUser = getHarvestUser(userId);    
    harvestUser.balance = harvestUser.balance.plus(amount);
    harvestUser.save();

    let harvestPool = getHarvestPool(poolAddress);
    harvestPool.balance = harvestPool.balance.plus(amount);
    harvestPool.save();
}

function harvestWithdrawHandler(poolAddress: string, userAddress: string, amount: BigInt): void {
    const userId = poolAddress + "-" + userAddress;
    let harvestUser = getHarvestUser(userId);
    harvestUser.balance = harvestUser.balance.minus(amount);
    harvestUser.save();

    let harvestPool = getHarvestPool(poolAddress);
    harvestPool.balance = harvestPool.balance.minus(amount);
    harvestPool.save();
}

export function harvestLogProfitHandler(event: ProfitLogInReward): void {
    const strategy = event.address.toHex();    

    const vaultAddress = (
        strategy == "0x895cc1b32aa6f5fedf0e113eac556309ad225322" ? "0x203e97aa6eb65a1a02d9e80083414058303f241e" :
        strategy == "0x923ca6dcef62030bed25aa3ef854f39dc45dda65" ? "0x29ec64560ab14d3166222bf07c3f29c4916e0027" :
        strategy == "0xd5d2adcb5e6ad20425b0650e4050c0ea9ec3cec0" ? "0x01bd09a1124960d9be04b638b142df9df942b04a" :
        strategy == "0x180a71c5688ac7e2368890ef77b0036af8e261b6" ? "0x64035b583c8c694627a199243e863bb33be60745" :
        strategy == "0xdd1dfbb5a580e96c2723ccaf687227900f97f053" ? "0x5c0a3f55aac52aa320ff5f280e77517cbaf85524" :
        "UNDEFINED"
    );

    if(vaultAddress == "UNDEFINED") return;

    const vaultContract = Vault.bind(Address.fromString(vaultAddress));

    const harvestPool = getHarvestPool(vaultAddress);
    harvestPool.pricePerShare = vaultContract.getPricePerFullShare();
    harvestPool.save();
}