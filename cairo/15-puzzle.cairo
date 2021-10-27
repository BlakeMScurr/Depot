from starkware.cairo.common.registers import get_fp_and_pc

func main():
    alloc_locals

    local locs_tuple: (Location, Location, Location, Location, Location) = (
        Location(row=0, column=2),
        Location(row=1, column=2),
        Location(row=1, column=3),
        Location(row=2, column=3),
        Location(row=3, column=3),
    )

    let (__fp__, _) = get_fp_and_pc()
    verify_location_list(loc_list=cast(&locs_tuple, Location*), n_steps=4)
    return ()
end

struct Location:
    member row: felt
    member column: felt
end

func verify_valid_location(loc: Location*):
    # TODO: can we skip the tempvar?
    tempvar row = loc.row
    assert row * (row - 1) * (row - 2) * (row - 3) = 0

    tempvar col = loc.column
    assert row * (row - 1) * (row - 2) * (row - 3) = 0

    return ()
end

func verify_adjacent_locations(loc0: Location*, loc1: Location*) {
    alloc_locals
    local row_diff = loc0.row - loc1.row
    local col_diff = loc0.column - loc1.column
    if row_diff = 0:
        assert col_diff * col_diff = 1
        return ()
    else:
        assert row_diff * row_diff = 1
        assert col_diff = 0
        return ()
    end
end

func verify_location_list(loc_list: Location*, n_steps):
    verify_valid_location(loc_list)

    if n_steps == 0:
        return ()
    end

    verify_adjacent_locations(loc0=loc_list, loc1=loc_list + Location.SIZE)
    verify_location_list(loc_list=loc_list + Location.SIZE, n_steps=n_steps - 1)
end