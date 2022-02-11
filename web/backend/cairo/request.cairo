from starkware.cairo.common.cairo_builtins import HashBuiltin
from starkware.cairo.common.hash import hash2
from starkware.cairo.common.math import assert_nn_le
from starkware.cairo.common.alloc import alloc
from starkware.cairo.common.registers import get_fp_and_pc

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

func max_request() -> (mr: Request*):
    alloc_locals
    let (__fp__, _) = get_fp_and_pc()
    const m = 2 ** 250
    local rq : Request = Request(meta=m,requestLinter=m,user=m,blockNumber=m,message1=m,message2=m,message3=m,message4=m,signature_r=m,signature_s=m)
    let rqp = cast(&rq, Request*)
    return (rqp)
end

func zero_request() -> (mr: Request*):
    alloc_locals
    let (__fp__, _) = get_fp_and_pc()
    local rq : Request = Request(meta=0,requestLinter=0,user=0,blockNumber=0,message1=0,message2=0,message3=0,message4=0,signature_r=0,signature_s=0)
    let rqp = cast(&rq, Request*)
    return (rqp)
end

func request_equal{pedersen_ptr : HashBuiltin*}(r1 : Request*, r2 : Request*) -> (res):
    let (h1) = hash_request{pedersen_ptr=pedersen_ptr}(r1)
    let (h2) = hash_request{pedersen_ptr=pedersen_ptr}(r2)
    if h1 == h2:
        return (1)
    end
    return (0)
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