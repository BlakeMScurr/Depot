%lang starknet
%builtins pedersen range_check

# We implement our own merkle tree because the one in the standard library operates on
# state trees with mutable leaves, which we don't need, and they don't enforce any ordering.

from starkware.cairo.common.cairo_builtins import HashBuiltin
from starkware.cairo.common.hash import hash2

# tester function that shows the next merkle layer
# TODO: return the whole lot, though (@guthl) apparently we can't return a felt*
@external
func val_in_next_layer{pedersen_ptr : HashBuiltin*}(elems_len: felt, elems: felt*, index: felt) -> (val):
    let (next_len) = merkle_layer(elems_len, elems, 0)
    return ([elems + elems_len + index + 1]) # +1 accounts for the memory cell after the array assigned to 0
end

# Computes the next layer of a merkle tree
# elem is a pointer to the first element of the layer
# length is the number of elements in the layer
# hash_index is the index to place the hash in in the next layer
@external
func merkle_layer{pedersen_ptr : HashBuiltin*}(elems_len: felt, elems: felt*, hash_index: felt) -> (next_len):
    # base case: if we're out of elem, return the elem of the next layer and its length
    if 2*hash_index == elems_len:
        return (0)
    end

    # If there were an odd number of elements, we add the last hash to the end of the layer
    # @guthl, it seems like the element at elems + elems_len is set to 0, even though there is not a zero element explicitly set there,
    # is this some kind of terminus? We add 1 to get to the first unassigned memory cell.
    # TODO: try to remove the +1
    let hash_offset = elems+elems_len+hash_index+1
    if 2*hash_index+1 == elems_len:
        assert [hash_offset] = [elems+elems_len-1]
        return (1)
    end

    # put hash in the next layer
    let (h) = hash2{hash_ptr=pedersen_ptr}(
        [elems+hash_index*2], [elems+hash_index*2+1]
    )
    assert [hash_offset] = h

    # recurse along the list
    let (next_len) = merkle_layer(elems_len=elems_len, elems=elems, hash_index=hash_index+1)
    return (next_len + 1)
end