from starkware.crypto.signature.signature import pedersen_hash
import math

class merkle_tree:
    layers = []
    members = {}
    depth = 0
    def __init__(self, leaves):
        self.layers = make_merkle_tree(leaves)
        self.layers.append(leaves)
        self.members = {k: v for v, k in enumerate(leaves)}
        self.depth = int(math.log2(len(leaves)))

    def root(self):
        return self.layers[0][0]

    def is_member(self, hash):
        return hash in self.members

    def index(self, hash):
        return self.members[hash]

    def proof(self, hash):
        if not self.is_member(hash):
            raise ValueError('Cannot construct merkle proof for non member')

        # Suppose we have the following tree and want the merkle proof to the index 110
        #
        # r
        # 0               1  
        # 00      01      10      11
        # 000 001 010 011 100 101 110 111
        # 
        # The path to is simply [1, 11, 110] (i.e., the substrings of the index) and the sibling hashes required for the proof are [0, 10, 111] (i.e, the last bit being flipped)
        
        # convert index to binary to build a path from the root
        path = bin(self.members[hash])[2:].zfill(self.depth)

        branches = []
        # for each layer we find the node needed for the proof
        for layer in range(1, len(path) + 1):
            ancestor = path[0:layer] # the ancestor is the node along the path
            is_left = ancestor[-1] == "0" 
            uncle = int(ancestor[:-1] + ("1" if is_left else "0"), 2)
            branches.append({"left": is_left, "value": self.layers[layer][uncle]})
        return branches

# TODO: output intermediate hashes for storage
def make_merkle_tree(leaves):
    nextLayer = merkle_layer(leaves)
    if len(nextLayer) == 0:
        raise ValueError('Cannot build a merkle tree from a zero length list.')
    elif len(nextLayer) == 1:
        return [nextLayer]
    else:
        layers = make_merkle_tree(nextLayer)
        layers.append(nextLayer)
        return layers

def merkle_layer(leaves):
    nextLayer = []
    for i in range(0, len(leaves), 2):
        if i + 1 < len(leaves):
            nextLayer.append(pedersen_hash(leaves[i], leaves[i+1]))
        else:
            raise ValueError('This merkle layer is not a multiple of 2. Merkle trees must be constructed from data sets of power of 2 size, or else the proofs are wonky and inconsistent.')
    return nextLayer

def chain_hash(vals):
    hash = pedersen_hash(vals[0], vals[1])
    for val in vals[2:]:
        hash = pedersen_hash(hash, val)
    return hash

