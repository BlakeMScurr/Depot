%builtins pedersen range_check
# We implement our own merkle tree because the one in the standard library operates on
# state trees with mutable leaves, which we don't need, and they don't enforce any ordering.

from starkware.cairo.common.cairo_builtins import HashBuiltin
from starkware.cairo.common.hash import hash2
from starkware.cairo.common.math import assert_nn_le
from starkware.cairo.common.alloc import alloc
from starkware.cairo.common.registers import get_fp_and_pc

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

# Returns a hash committing to the request's state using the
# following formula:
#   H(H(H(H(meta, requestLinter), user), blockNumber, message1) ...
# where H is the Pedersen hash function.
# This creates the hashes at the bottom of the merkle tree
# TODO: replace with hash_chain
func hash_request{pedersen_ptr : HashBuiltin*}(r : Request*) -> (res : felt):
    let res = r.meta
    let (res) = hash2{hash_ptr=pedersen_ptr}(
        res, r.requestLinter)
    let (res) = hash2{hash_ptr=pedersen_ptr}(
        res, r.user)
    let (res) = hash2{hash_ptr=pedersen_ptr}(
        res, r.blockNumber)
    let (res) = hash2{hash_ptr=pedersen_ptr}(
        res, r.message1)
    let (res) = hash2{hash_ptr=pedersen_ptr}(
        res, r.message2)
    let (res) = hash2{hash_ptr=pedersen_ptr}(
        res, r.message3)
    let (res) = hash2{hash_ptr=pedersen_ptr}(
        res, r.message4)
    let (res) = hash2{hash_ptr=pedersen_ptr}(
        res, r.signature_r)
    let (res) = hash2{hash_ptr=pedersen_ptr}(
        res, r.signature_s)
    return (res=res)
end

func max_request_hash{pedersen_ptr : HashBuiltin*}() -> (mrh: felt):
    alloc_locals
    let (__fp__, _) = get_fp_and_pc()
    const m = 2 ** 250
    local rq : Request = Request(meta=m,requestLinter=m,user=m,blockNumber=m,message1=m,message2=m,message3=m,message4=m,signature_r=m,signature_s=m)
    let (mrh) = hash_request(cast(&rq, Request*))
    return (mrh)
end

# A signed request from a user to be stored in the silo.
struct Request:
    member meta : felt              # the meta of a stored message is always "store", i.e., 0 as a felt 
    member requestLinter : felt     # ethereum address of the contract that defines the format of the message (@guthl, can we store eth addresses as a felt? felt is only 2^252, whereas ethereum addresses are 32 bytes)
    member user : felt      # EC Public Key corresponding to the ethereum EOC of the user (@guthl presumably we can store ecdsa pub keys as felts, since it's done here https://www.cairo-lang.org/docs/hello_cairo/voting.html?highlight=ecdsa#processing-the-program-input) (@guthl I'd rather store the ethereum address instead, is there ecrecover yet? or is that what's meant by "Support for ethereum signatures as a Cairo function" in v.0.6.0?)
    member blockNumber : felt       # the ethereum block number at which the message was stored
    # v0 has a fixed message size of 124 bytes (4 252 bit felts) which is basically a twitter message
    member message1 : felt
    member message2 : felt
    member message3 : felt
    member message4 : felt
    
    # TODO: handle Ethereum signatures once it's included in v.0.6.0 - though proper signing is fairly well guaranteed with the ValidRequestPledge
    # ECDSA signature of all above fields, including user_pub_key
    member signature_r : felt
    member signature_s : felt
end