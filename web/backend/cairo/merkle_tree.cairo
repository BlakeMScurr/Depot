%builtins pedersen range_check
# We implement our own merkle tree because the one in the standard library operates on
# state trees with mutable leaves, which we don't need, and they don't enforce any ordering.

from starkware.cairo.common.cairo_builtins import HashBuiltin
from starkware.cairo.common.hash import hash2
from starkware.cairo.common.math import assert_nn_le
from starkware.cairo.common.alloc import alloc
from request import Request, hash_request

func merkle_tree{range_check_ptr, pedersen_ptr : HashBuiltin*}(depth: felt, filler: felt, elems_len: felt, elems: felt*) -> (root_hash):
    alloc_locals
    let (full_length) = two_pow(depth)
    assert_nn_le(full_length, elems_len*2)
    assert_nn_le(elems_len, full_length)
    fill_elems(full_length - elems_len, elems + elems_len, filler)
    let (root_hash) = merkle_tree_rec{pedersen_ptr=pedersen_ptr}(full_length, elems)
    return (root_hash)
end

# Double asterix exponentiation *should* work, right? Seems not to allow variables as exponents.
# TODO: fix
# @guthl, what's up no exponentiation of variables?
func two_pow(exp) -> (result):
    if exp == 0:
        return (1)
    end
    let (two_pow_n_minus_1) = two_pow(exp -1)
    return (2 * two_pow_n_minus_1)
end

func fill_elems(to_fill_len: felt, to_fill: felt*, filler: felt):
    if to_fill_len == 0:
        return ()
    end

    to_fill[0] = filler
    fill_elems(to_fill_len - 1, to_fill + 1, filler)
    return ()
end

func merkle_tree_rec{pedersen_ptr : HashBuiltin*}(elems_len: felt, elems: felt*) -> (root_hash):
    let (next_len) = merkle_layer(elems_len, elems, 0)
    if next_len == 0:
        return (0) # we define 0 as the hash of an empty tree
    end
    if next_len == 1:
        return ([elems + elems_len + 1])
    end

    let (res) = merkle_tree_rec{pedersen_ptr=pedersen_ptr}(next_len, elems + elems_len + 1)
    return (res)
end

# Computes the next layer of a merkle tree
# elem is a pointer to the first element of the layer
# length is the number of elements in the layer
# hash_index is the index to place the hash in in the next layer
func merkle_layer{pedersen_ptr : HashBuiltin*}(elems_len: felt, elems: felt*, hash_index: felt) -> (next_len):
    # base case: if we're out of elem, return the elem of the next layer and its length
    if 2*hash_index == elems_len:
        return (0)
    end

    # If there were an odd number of elements, we add the last hash to the end of the layer
    # @guthl, it seems like the element at elems + elems_len is set to 0, even though there is not a zero element explicitly set there,
    # is this some kind of terminus? We add 1 to get to the first unassigned memory cell.
    # TODO: try to remove the +1
    let hash_offset = elems + elems_len + 1 + hash_index
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

func hash_requests{pedersen_ptr : HashBuiltin*}(requests_len: felt, requests: Request*, res: felt*) ->():
    alloc_locals

    if requests_len == 0:
        return ()
    end

    hash_requests(requests_len-1, requests+Request.SIZE, res + 1)
    let (h) = hash_request(requests)
    [res] = h
    return ()
end