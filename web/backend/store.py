from cairo.pre_proof import make_merkle_tree, merkle_layer, chain_hash

messages = [
    {"rq": { "type": 0, "blocknumber": 1, "sender": 0x229Ef5a78fF88Cd1985bA709c56D65016B3D5259, "message": [1, 152632524867406571304184616186155773426136391771967], "signature": 123, }, "metadata": { "hash": "0", "root": 0, "branches": [{"left": True, "value": 0}, {"left": False, "value": 1}]}},
    {"rq": { "type": 0, "blocknumber": 1, "sender": 0xAb5801a7D398351b8bE11C439e05C5B3259aeC9B, "message": [1, 2595724071118733894028796284220695477835951201], "signature": 124 }, "metadata": { "hash": "1", "root": 0, "branches": [{"left": True, "value": 0}, {"left": False, "value": 1}]} },
    {"rq": { "type": 0, "blocknumber": 1, "sender": 0xAb5801a7D398351b8bE11C439e05C5B3259aeC9B, "message": [1, 630521840231950245079044493625488752], "signature": 125 }, "metadata": { "hash": "2", "root": 0, "branches": [{"left": True, "value": 0}, {"left": False, "value": 1}]} },
    {"rq": { "type": 0, "blocknumber": 1, "sender": 0xAb5801a7D398351b8bE11C439e05C5B3259aeC9B, "message": [1, 161362985116191542540540984826690434405], "signature": 126 }, "metadata": { "hash": "3", "root": 0, "branches": [{"left": True, "value": 0}, {"left": False, "value": 1}]} },
    {"rq": { "type": 0, "blocknumber": 1, "sender": 0xAb5801a7D398351b8bE11C439e05C5B3259aeC9B, "message": [1, 9908240676135212083450090473416363315419018108784109601], "signature": 127 }, "metadata": { "hash": "4", "root": 0, "branches": [{"left": True, "value": 0}, {"left": False, "value": 1}]} },
    {"rq": { "type": 0, "blocknumber": 1, "sender": 0xAb5801a7D398351b8bE11C439e05C5B3259aeC9B, "message": [1, 9908240676135212083450090473416363315419018108784109601], "signature": 128 }, "metadata": { "hash": "5", "root": 0, "branches": [{"left": True, "value": 0}, {"left": False, "value": 1}]} },
    {"rq": { "type": 0, "blocknumber": 1, "sender": 0xE5501BC2B0Df6D0D7daAFC18D2ef127D9e612963, "message": [1, 26477], "signature": 129 }, "metadata": { "hash": "6", "root": 0, "branches": [{"left": True, "value": 0}, {"left": False, "value": 1}]} },
    {"rq": { "type": 0, "blocknumber": 1, "sender": 0xb8c2C29ee19D8307cb7255e1Cd9CbDE883A267d5, "message": [2, 210975209673079988634703143370631324886738580130199451368637689292119308151, 942136265740830059898802705088319], "signature": "130"}, "metadata": { "hash": "7", "root": 0, "branches": [{"left": True, "value": 0}, {"left": False, "value": 1}]}}
]



def hash_tree(requests):
    hashes = []
    for rq in requests:
        hashes.append(chain_hash([rq["type"], rq["blocknumber"], rq["sender"], rq["signature"]] + rq["messages"]))
    root = make_merkle_tree(hashes)
    
