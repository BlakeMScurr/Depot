from cairo.pre_proof import chain_hash
from cairo.pre_proof import merkle_tree

raw_messages = [
    { "type": 0, "blocknumber": 1, "sender": 0x229Ef5a78fF88Cd1985bA709c56D65016B3D5259, "message": [1, 152632524867406571304184616186155773426136391771967], "signature": 123, },
    { "type": 0, "blocknumber": 1, "sender": 0xAb5801a7D398351b8bE11C439e05C5B3259aeC9B, "message": [1, 2595724071118733894028796284220695477835951201], "signature": 124 },
    { "type": 0, "blocknumber": 1, "sender": 0xAb5801a7D398351b8bE11C439e05C5B3259aeC9B, "message": [1, 630521840231950245079044493625488752], "signature": 125 },
    { "type": 0, "blocknumber": 1, "sender": 0xAb5801a7D398351b8bE11C439e05C5B3259aeC9B, "message": [1, 161362985116191542540540984826690434405], "signature": 126 },
    { "type": 0, "blocknumber": 1, "sender": 0xAb5801a7D398351b8bE11C439e05C5B3259aeC9B, "message": [1, 9908240676135212083450090473416363315419018108784109601], "signature": 127 },
    { "type": 0, "blocknumber": 1, "sender": 0xAb5801a7D398351b8bE11C439e05C5B3259aeC9B, "message": [1, 9908240676135212083450090473416363315419018108784109601], "signature": 128 },
    { "type": 0, "blocknumber": 1, "sender": 0xE5501BC2B0Df6D0D7daAFC18D2ef127D9e612963, "message": [1, 26477], "signature": 129 },
    { "type": 0, "blocknumber": 1, "sender": 0xb8c2C29ee19D8307cb7255e1Cd9CbDE883A267d5, "message": [2, 210975209673079988634703143370631324886738580130199451368637689292119308151, 942136265740830059898802705088319], "signature": 130},
]

class store:
    tree = {}
    messages = []
    hashes = []

    def __init__(self, raw_messages):
        self.messages = raw_messages

        for rq in raw_messages:
            self.hashes.append(chain_hash([rq["type"], rq["blocknumber"], rq["sender"], rq["signature"]] + rq["message"]))
        self.tree = merkle_tree(self.hashes)

    def by_user(self, user):
        ms = []
        for hash in self.hashes:
            if self.messages[self.hashes.index(hash)]["sender"] == user:
                ms.append(self.get_message(hash))
        return ms

    def get_message(self, hash):
        index = self.tree.index(hash)
        return { "rq": self.messages[index], "metadata": { "hash": hash, "root": self.tree.root(), "branches": self.tree.proof(hash) } }

    def all_messages(self):
        ms = []
        for hash in self.hashes:
            ms.append(self.get_message(hash))
        return ms
            
messages = store(raw_messages)