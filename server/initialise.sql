CREATE TABLE receipts (
    id serial PRIMARY KEY,
    address text,
    message text,
    block bigint,
    receipt json
);