import requests
import math
from datetime import datetime
from decimal import Decimal

CREAM_SUBGRAPH_URL = 'https://api.thegraph.com/subgraphs/name/creamfinancedev/cream-portfolio-mainnet'
BLOCKLYTICS_SUBGRAPH_URL = 'https://api.thegraph.com/subgraphs/name/blocklytics/ethereum-blocks'
class AbstractQuery:
    def __init__(self, contract_address, symbol, vesting_end_block):
        self.contract_address = contract_address
        self.symbol = symbol
        self.vesting_end_block = vesting_end_block
    def get_events(self):
        block_number_threshold = 0
        results = []
        while True:
            query_string = self.get_next_query_string(block_number_threshold)
            params = {'query':query_string}
            res = requests.post(CREAM_SUBGRAPH_URL,json=params)
            data = res.json().get('data')[self.event_name]
            if len(data):
                results += data 
                block_number_threshold = data[-1]['blockNumber']
            else:
                break
        return results
    def get_next_query_string(self, block_number_threshold):
        raise NotImplementedError()
        
class MintEventQuery(AbstractQuery):
    event_name = 'mintEvents'
    mint_event_query_string_template = """
        {{
            mintEvents(orderBy: blockTime, orderDirection: asc, where: {{ blockNumber_lt: {vesting_end_block}, blockNumber_gt: {block_number_threshold}  ,cToken: "{contract_address}" }}){{
            id,
            amount,
            minter,
            blockNumber,
            blockTime,
            }},
        }}
    """
    def get_next_query_string(self, block_number_threshold):
        return self.mint_event_query_string_template.format(vesting_end_block=self.vesting_end_block, block_number_threshold=block_number_threshold, contract_address=self.contract_address)

class RedeemEventQuery(AbstractQuery):
    event_name = 'redeemEvents'
    redeem_event_query_string_template = """
        {{
            redeemEvents(orderBy: blockTime, orderDirection: asc, where: {{ blockNumber_lt: {vesting_end_block},blockNumber_gt: {block_number_threshold}  ,cToken: "{contract_address}" }}){{
            id,
            amount,
            redeemer,
            blockNumber,
            blockTime,
            }},
        }}
    """
    def get_next_query_string(self, block_number_threshold):
        return self.redeem_event_query_string_template.format(vesting_end_block=self.vesting_end_block,block_number_threshold=block_number_threshold, contract_address=self.contract_address)

class TransferEventQuery(AbstractQuery):
    event_name = 'transferEvents'
    transfer_event_query_string_template = """
        {{
            transferEvents(orderBy: blockTime, orderDirection: asc, where: {{ blockNumber_lt: {vesting_end_block}, blockNumber_gt: {block_number_threshold}, cTokenSymbol: "{symbol}"}}){{
            id,
            amount,
            to,
            from,
            blockNumber,
            blockTime,
            cTokenSymbol,
            }}
        }}
    """
    def get_next_query_string(self, block_number_threshold):
        return self.transfer_event_query_string_template.format(vesting_end_block=self.vesting_end_block,block_number_threshold=block_number_threshold, symbol=self.symbol)

def get_events(contract_address, symbol, vesting_end_block):
    events = []
    query = MintEventQuery(contract_address, symbol, vesting_end_block)
    events += query.get_events()
    query = RedeemEventQuery(contract_address, symbol, vesting_end_block)
    events += query.get_events()
    query = TransferEventQuery(contract_address, symbol, vesting_end_block)
    events += query.get_events()
    return events

def get_block_number(datetime_object):
    timestamp = int(datetime.timestamp(datetime_object))
    query_string = f"{{blocks(first: 1, orderBy: timestamp, orderDirection: desc, where: {{ timestamp_lte: {timestamp} }}) {{number}}}}"
    resp = requests.post(BLOCKLYTICS_SUBGRAPH_URL, json={'query':query_string})
    return int(resp.json()['data']['blocks'][0]['number'])

def get_block_time(block_number):
    query_string = f"{{blocks(where: {{ number: {block_number} }}) {{timestamp}}}}"
    resp = requests.post(BLOCKLYTICS_SUBGRAPH_URL, json={'query':query_string})
    return int(resp.json()['data']['blocks'][0]['timestamp'])


