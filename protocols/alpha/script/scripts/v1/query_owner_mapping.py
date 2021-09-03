from concurrent.futures import ThreadPoolExecutor, wait
import os
import json
from web3 import Web3, HTTPProvider
import sys

with open("abi/Bank.json") as f:
    abi_json = json.load(f)
bank_abi = abi_json


def main():

    if len(sys.argv) < 2:
        raise Exception("Please provide your API url")
    api = sys.argv[-1]
    w3 = Web3(HTTPProvider(api))

    bank_address = '0x67b66c99d3eb37fa76aa3ed1ff33e8e39f0b9c7a'  # AHv1 bank address

    endBlock = int(json.load(open('./configs/end_block.json')))
    events = json.load(open('aggregated_goblin_events.json'))

    position_ids = set(map(lambda x: x["posId"], events))

    contract_address = w3.toChecksumAddress(bank_address)
    bank = w3.eth.contract(address=contract_address, abi=bank_abi)

    def getPosition(id):
        return id, bank.functions.positions(id).call()

    executor = ThreadPoolExecutor(30)
    tasks = []

    for id in position_ids:
        tasks.append(executor.submit(getPosition, id))

    results = []
    new_events = []
    for t in tasks:
        wait([t])
        print(t.result())
        results.append(t.result())

    positions = {}
    for result in results:
        positions[result[0]] = (result[1][0], result[1][1])  # position's owner

    for i in range(len(events)):
        # only event before end block
        if events[i]["posId"] in positions and events[i]["blockNumber"] <= endBlock:
            events[i]["owner"] = positions[events[i]["posId"]][1].lower()
            new_events.append(events[i])

    json.dump(new_events, open(
        './results/v1/goblin_v1_events_with_owner.json', 'w'))


if __name__ == '__main__':
    main()
