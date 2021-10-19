CREATE TABLE receipts (
    id serial PRIMARY KEY,
    userAddress text,
    message text,
    block bigint,
    receipt json
);