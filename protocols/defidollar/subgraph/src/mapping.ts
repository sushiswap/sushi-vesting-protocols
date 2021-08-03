import { Address, BigInt, log } from "@graphprotocol/graph-ts"
import {
  SushiPaid,
  Staked
} from "../generated/DFDETH/SushiDFDMiner"
import { User } from "../generated/schema"

function getUser(address: Address): User {
    let user = User.load(address.toHex())

    if(user === null) {
        user = new User(address.toHex());
        user.sushiHarvested = BigInt.fromI32(0);
    }

    return user as User;
}

// Just log that a user exists
export function stakedHandler(event: Staked): void {
    const user = getUser(event.params.user)
    user.save()
}

export function sushiPaidHandler(event: SushiPaid): void {
    const user = getUser(event.params.user)

    user.sushiHarvested = user.sushiHarvested.plus(event.params.reward)
    user.save()
}