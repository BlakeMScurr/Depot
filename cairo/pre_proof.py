from starkware.crypto.signature.signature import pedersen_hash

# TODO: output intermediate hashes for storage
def merkle_tree(leaves):
    nextLayer = merkle_layer(leaves)
    if len(nextLayer) == 0:
        return 0
    elif len(nextLayer) == 1:
        return nextLayer[0]
    else:
        return merkle_tree(nextLayer)

def merkle_layer(leaves):
    nextLayer = []
    for i in range(0, len(leaves), 2):
        if i + 1 < len(leaves):
            nextLayer.append(pedersen_hash(leaves[i], leaves[i+1]))
        else:
            nextLayer.append(leaves[i])
    print("nextLayer:", nextLayer)
    return nextLayer

def chain_hash(vals):
    hash = pedersen_hash(vals[0], vals[1])
    for val in vals[2:]:
        hash = pedersen_hash(hash, val)
    return hash

