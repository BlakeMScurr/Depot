%lang starknet

from merkle_tree import merkle_layer, merkle_tree, hash_request, Request
from starkware.cairo.common.cairo_builtins import HashBuiltin
from starkware.cairo.common.alloc import alloc

# exposes the values of merkle layer
# TODO: return the whole lot, though (@guthl) apparently we can't return a felt*
@external
func val_in_next_layer{pedersen_ptr : HashBuiltin*}(elems_len: felt, elems: felt*, index: felt) -> (val):
    let (next_len) = merkle_layer(elems_len, elems, 0)
    return ([elems + elems_len + index + 1]) # +1 accounts for the memory cell after the array assigned to 0
end

# expose the internal merkle_tree function for testing
@external
func merkle_tree_t{pedersen_ptr : HashBuiltin*}(elems_len: felt, elems: felt*) -> (root_hash):
    let (res) = merkle_tree(elems_len, elems)
    return (res)
end

# expose the internal merkle_layer function for testing
@external
func merkle_layer_t{pedersen_ptr : HashBuiltin*}(elems_len: felt, elems: felt*, hash_index: felt) -> (next_len):
    let (res) = merkle_layer(elems_len, elems, hash_index)
    return (res)
end

# pass data for a request in for testing
@external
func hash_request_t{pedersen_ptr : HashBuiltin*}(meta, requestLinter, user, blockNumber, message1, message2, message3, message4, signature_r, signature_s) -> (hash):
    let (rq) = alloc()
    [rq] = meta
    [rq + 1] = requestLinter
    [rq + 2] = user
    [rq + 3] = blockNumber
    [rq + 4] = message1
    [rq + 5] = message2
    [rq + 6] = message3
    [rq + 7] = message4
    [rq + 8] = signature_r
    [rq + 9] = signature_s
    let (res) = hash_request(cast(rq, Request*))
    return (res)
end