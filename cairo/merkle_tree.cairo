%lang starknet
%builtins pedersen range_check

# We implement our own merkle tree because the one in the standard library operates on
# state trees with mutable leaves, which we don't need, and they don't enforce any ordering.

from starkware.cairo.common.cairo_builtins import HashBuiltin
from starkware.cairo.common.hash import hash2

func test_merkle_layer{pedersen_ptr : HashBuiltin*}(elems_len: felt, elems: felt*) -> (vals_len: felt, vals: felt*):
    let (next_len) = merkle_layer(elems_len, elems, 0)
    return (next_len, elems + elems_len)
end

# Computes the next layer of a merkle tree
# elem is a pointer to the first element of the layer
# length is the number of elements in the layer
# hash_index is the index to place the hash in in the next layer
@external
func merkle_layer{pedersen_ptr : HashBuiltin*}(elems_len: felt, elems: felt*, hash_index: felt) -> (next_len: felt):
    # base case: if we're out of elem, return the elem of the next layer and its length
    if 2*hash_index == elems_len:
        return (0)
    end
    # If there were an odd number of elem, we add the last hash to the end of the layer
    let hash_offset = elems+elems_len+hash_index
    if 2*hash_index+1 == elems_len:
        assert [hash_offset] = [elems+elems_len-1]
        return (1)
    end

    # put hash in the next layer
    let (h) = hash2{hash_ptr=pedersen_ptr}(
        [elems+hash_index*2], [elems+hash_index*2+1]
    )
    assert [hash_offset] = [h]

    # recurse along the list
    let (next_len) = merkle_layer(elems_len=elems_len, elems=elems, hash_index=hash_index+1)
    return (next_len + 1)
end