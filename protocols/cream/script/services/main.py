import requests
from decimal import Decimal
from services.query import get_events
import enum
import json
import os
import warnings

CRSLP_CONTRACT_ADDRESSES = {
    'crSLP-WBTC-ETH':'0x73f6cBA38922960b7092175c0aDD22Ab8d0e81fC',
    'crSLP-DAI-ETH':'0x38f27c03d6609a86FF7716ad03038881320BE4Ad',
    'crSLP-USDC-ETH':'0x5EcaD8A75216CEa7DFF978525B2D523a251eEA92',
    'crSLP-ETH-USDT':'0x5C291bc83d15f71fB37805878161718eA4b6AEe9',
    'crSLP-SUSHI-ETH':'0x6BA0C66C48641e220CF78177C144323b3838D375',
    'crSLP-YFI-ETH':'0xd532944df6DFd5Dd629E8772F03D4fC861873abF',
}

OUTPUT_PATH = './output/'
class EventType(enum.IntEnum):
    MINT=0
    REDEEM=1
    TRANSFER=2

class AddressRecord:
    def __init__(self, address):
        self.address = address
        self.balance = Decimal('0.0')
        self.last_update_block_time = 0
        self.cumulative_percentage = Decimal('0')
        self.previous_percentage = Decimal('0')

def get_event_type(event):
    if event.get('minter'):
        return EventType.MINT
    elif event.get('redeemer'):
        return EventType.REDEEM
    elif event.get('from') and event.get('to'):
        return EventType.TRANSFER
    else:
        raise Exception('event type not recognized')

def update_address_cumulative_percentage(address_mapping, pool_balance, block_time, pool_start_block_time):
    for address_record in address_mapping.values():
        lapsed_time_from_last_update = block_time - address_record.last_update_block_time
        cumulative_lapsed_time = address_record.last_update_block_time - pool_start_block_time
        if (cumulative_lapsed_time + lapsed_time_from_last_update):
            address_record.cumulative_percentage = (address_record.previous_percentage * lapsed_time_from_last_update + address_record.cumulative_percentage * cumulative_lapsed_time) * Decimal(1e18) / (cumulative_lapsed_time + lapsed_time_from_last_update) / Decimal(1e18)
        address_record.previous_percentage = address_record.balance*Decimal(1e18) / pool_balance / Decimal(1e18) if pool_balance else 0
        address_record.last_update_block_time = block_time

def get_distribution(vesting_end_block, vesting_end_block_time,pool_vested_sushi_amounts):
    for symbol, contract_address in CRSLP_CONTRACT_ADDRESSES.items():
        pool_vested_sushi_amount = int(pool_vested_sushi_amounts.get(contract_address.lower(), 0))
        if not pool_vested_sushi_amounts:
            warnings.warn(f"blacklist amount is zero for contract {contract_address}. Please make sure the provided blacklist amount is correct. Ignore this warning if you are sure it's zero", UserWarning)
        print(f'processing {symbol}')
        # process events
        events = get_events(contract_address, symbol, vesting_end_block)
        address_mapping = {}
        if events:
            lower_contract_address = contract_address.lower()
            events = [e for e in events if lower_contract_address not in (e.get('to'), e.get('from'))] # remove transfer events that are related to mint/redeem events
            sorted_events = sorted(events, key=lambda e: (e['blockTime'], e['id']))
            # initiate 
            pool_start_block_time = events[0]['blockTime']
            pool_balance = Decimal('0.0')
            for event in sorted_events:
                event_type = get_event_type(event)
                block_time = event['blockTime']
                amount = Decimal(event['amount'])
                if event_type == EventType.MINT:
                    minter_address = event['minter']
                    pool_balance += amount
                    if minter_address in address_mapping:    
                        address_mapping[minter_address].balance += amount
                    else:
                        address_record = AddressRecord(minter_address)
                        address_record.balance += amount
                        address_record.last_update_block_time = block_time
                        address_record.previous_percentage = address_record.balance * Decimal(1e18) / pool_balance / Decimal(1e18)
                        address_mapping[minter_address] = address_record
                elif event_type == EventType.REDEEM:
                    pool_balance -= amount
                    address_mapping[event['redeemer']].balance -= amount
                elif event_type == EventType.TRANSFER:
                    address_mapping[event['from']].balance -= amount
                    _to = event['to']
                    if _to in address_mapping:
                        address_mapping[_to].balance += amount
                        address_mapping[_to].last_update_block_time = block_time
                    else:
                        address_record = AddressRecord(_to)
                        address_record.last_update_block_time = block_time
                        address_record.balance += amount
                        address_mapping[_to] = address_record
                        address_record.previous_percentage = amount * Decimal(1e18) / pool_balance / Decimal(1e18) if pool_balance else 0
                # update all addresses' cumulative percentage
                update_address_cumulative_percentage(address_mapping, pool_balance, block_time, pool_start_block_time)
            # in case the timestamp of the last event collected is smaller than the desired vesting end block timestamp
            update_address_cumulative_percentage(address_mapping, pool_balance, vesting_end_block_time, pool_start_block_time)
        # output. might write empty file
        if not os.path.isdir(OUTPUT_PATH):
            os.mkdir(OUTPUT_PATH)
        with open(os.path.join(OUTPUT_PATH, f'{symbol}.json'), 'w') as f:
            mapping = {address:"{:.18f}".format(address_record.cumulative_percentage * pool_vested_sushi_amount) for address, address_record in address_mapping.items()}
            f.write(json.dumps(mapping))

if __name__ == '__main__':
    get_distribution()