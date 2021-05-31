import { Address, BigInt, log } from "@graphprotocol/graph-ts"
import {
  AddCall as MasterchefAddCall,
  SetCall as MasterchefSetCall,
  Deposit as MasterchefDeposit,
  Withdraw as MasterchefWithdraw,
} from "../generated/Masterchef/Masterchef"
import {
    HarvestCall as PickleHarvestCall
} from "../generated/Pickle_DAI/ETH_Strategy/Strategy"
import { 
    Transfer as PickleTransfer,
    Jar
 } from "../generated/Pickle_DAI/ETH/Jar"
import { Masterchef, MasterchefPool, PicklePool, PickleUser } from "../generated/schema"

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





function getPickleUser(id: string): PickleUser {
    let pickleUser = PickleUser.load(id);

    if(pickleUser === null) {
        pickleUser = new PickleUser(id);
        pickleUser.address = id.split("-")[1];
        pickleUser.picklePool = id.split("-")[0];
        pickleUser.balance = BigInt.fromI32(0);

        pickleUser.save();
    }

    return pickleUser as PickleUser;
}

function getPicklePool(id: string): PicklePool {
    let picklePool = PicklePool.load(id);

    if(picklePool === null) {
        picklePool = new PicklePool(id);
        const poolAddress = id;

        picklePool.masterchefPoolId = 
            poolAddress == "0x55282da27a3a02ffe599f6d11314d239dac89135" ? BigInt.fromI32(2) : // DAI_ETH 0x8e4e4cfca2ff1db24708dfae8c97385cc63149e1
            poolAddress == "0x8c2d16b7f6d3f989eb4878ecf13d695a7d504e43" ? BigInt.fromI32(1) : // USDC_ETH 0xaa430e7886b60a925ac77e79e91924ce544b0690
            poolAddress == "0xa7a37ae5cb163a3147de83f15e15d8e5f94d6bce" ? BigInt.fromI32(0) : // USDT_ETH 0x10d2740ffb6c38f14221df8346d07253cef8902d
            poolAddress == "0xde74b6c547bd574c3527316a2ee30cd8f6041525" ? BigInt.fromI32(21) : // WBTC_ETH 0xced8eed93677bcf0100f05a38d5b0b2761b09f26
            poolAddress == "0x3261d9408604cc8607b687980d40135afa26ffed" ? BigInt.fromI32(11) : // YFI_ETH 0x8785a589237a8699afaaf5deb407010db0950043
            poolAddress == "0x5eff6d166d66bacbc1bf52e2c54dd391ae6b1f48" ? BigInt.fromI32(132) : // yveCRV-DAO_ETH 0x5807424c47ea796d4c6be03b840ccc8c8a642711            
            BigInt.fromI32(999);
        
        picklePool.balance = BigInt.fromI32(0);
        picklePool.pricePerShare = BigInt.fromI32(1);

        picklePool.save();
    }

    return picklePool as PicklePool;
}

export function pickleTransferHandler(event: PickleTransfer): void {
    const poolAddress = event.address.toHex();
    const amount = event.params.value;

    if(event.params.from.toHex() == "0x0000000000000000000000000000000000000000") { // Deposit
        const userAddress = event.params.to.toHex();
        pickleDeposit(poolAddress, userAddress, amount);
    }

    if(event.params.to.toHex() == "0x0000000000000000000000000000000000000000") { // Withdraw
        const userAddress = event.params.from.toHex();
        pickleWithdraw(poolAddress, userAddress, amount);
    }
}

function pickleDeposit(poolAddress: string, userAddress: string, amount: BigInt): void {
    const userId = poolAddress + "-" + userAddress;
    let pickleUser = getPickleUser(userId);    
    pickleUser.balance = pickleUser.balance.plus(amount);
    pickleUser.save();

    let picklePool = getPicklePool(poolAddress);
    picklePool.balance = picklePool.balance.plus(amount);
    picklePool.save();
}

function pickleWithdraw(poolAddress: string, userAddress: string, amount: BigInt): void {
    const userId = poolAddress + "-" + userAddress;
    let pickleUser = getPickleUser(userId);
    pickleUser.balance = pickleUser.balance.minus(amount);
    pickleUser.save();

    let picklePool = getPicklePool(poolAddress);
    picklePool.balance = picklePool.balance.minus(amount);
    picklePool.save();
}

export function pickleHarvestHandler(call: PickleHarvestCall): void {
    const strategy = call.to.toHex();    

    const jarAddress = (
        strategy == "0xaa430e7886b60a925ac77e79e91924ce544b0690" ? "0x8c2d16b7f6d3f989eb4878ecf13d695a7d504e43" :
        strategy == "0x10d2740ffb6c38f14221df8346d07253cef8902d" ? "0xa7a37ae5cb163a3147de83f15e15d8e5f94d6bce" :
        strategy == "0x8785a589237a8699afaaf5deb407010db0950043" ? "0x3261d9408604cc8607b687980d40135afa26ffed" :
        strategy == "0x5807424c47ea796d4c6be03b840ccc8c8a642711" ? "0x5eff6d166d66bacbc1bf52e2c54dd391ae6b1f48" :
        strategy == "0x8e4e4cfca2ff1db24708dfae8c97385cc63149e1" ? "0x55282da27a3a02ffe599f6d11314d239dac89135" :
        strategy == "0xced8eed93677bcf0100f05a38d5b0b2761b09f26" ? "0xde74b6c547bd574c3527316a2ee30cd8f6041525" :       
        "UNDEFINED"
    );

    if(jarAddress == "UNDEFINED") return;

    const jarContract = Jar.bind(Address.fromString(jarAddress));

    const picklePool = getPicklePool(jarAddress);
    picklePool.pricePerShare = jarContract.getRatio();
    picklePool.save();
}