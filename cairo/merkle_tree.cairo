# We implement our own merkle tree because the one in the standard library operates on
# state trees with mutable leaves, which we don't need, and they don't enforce any ordering.

from starkware.cairo.common.cairo_builtins import (
    HashBuiltin, SignatureBuiltin)
from starkware.cairo.common.hash import hash2


# Computes the next layer of a merkle tree
# start is a pointer to the first element of the layer
# length is the number of elements in the layer
# hash_index is the index to place the hash in in the next layer
func merkle_layer{pedersen_ptr : HashBuiltin*}(start: felt*, length: felt, hash_index: felt) -> (next_start : felt*, next_length):
    # base case: if we're out of elements, return the start of the next layer and its length
    if 2*hash_index == length:
        return (start + length, next_length=hash_index)
    end
    # If there were an odd number of elements, we add the last hash to the end of the layer
    let hash_offset = start+length+hash_index
    if 2*hash_index+1 == length:
        assert [hash_offset] = [start+length-1]
        return (start + length, next_length=hash_index+1)
    end

    # put hash in the next layer
    let (h) = hash2{hash_ptr=pedersen_ptr}(
        [start+hash_index*2], [start+hash_index*2+1]
    )
    assert [hash_offset] = [h]

    # recurse along the list
    return merkle_layer(start=start, length=length, hash_index=hash_index+1)
end