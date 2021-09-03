import glob
import json
from collections import defaultdict


def get_key(event):
    return (event['blockNumber'], event['logIndex'])


def sort_all_events(events):
    sorted_events = sorted(events, key=get_key)
    return sorted_events


endBlock = int(json.load(open('./configs/end_block.json')))

all_events = []
for filepath in glob.glob('./events/bank_events_v2.json'):
    data = json.load(open(filepath))['blocks']
    events = []
    for block_number in data:
        data1 = data[block_number]
        for tx_hash in data1:
            data2 = data1[tx_hash]
            for log_index in data2:
                if int(block_number) <= endBlock:
                    event = {}
                    event['blockNumber'] = int(block_number)
                    event['transactionHash'] = tx_hash
                    event['logIndex'] = int(log_index)

                    data3 = data2[log_index]
                    event['event'] = data3['event']
                    # convert from +7 to UTC.
                    event['timeStamp'] = data3['block_timestamp'] + 25200
                    event['token'] = data3['debtToken'] if event['event'] == "Liquidate" else data3['token']

                    if event['event'] == "PutCollateral" or event['event'] == "TakeCollateral":
                        event['posId'] = data3['positionId']
                        event['amount'] = data3['amount']
                    else:  # liquidate
                        event['posId'] = data3['positionId']
                        event['bounty'] = data3['bounty']
                    events.append(event)

    all_events.extend(events)

json.dump(sort_all_events(all_events), open(
    './aggregated_bank_events.json', 'w'))
