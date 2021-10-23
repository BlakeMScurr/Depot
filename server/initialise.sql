CREATE TABLE receipts (
    id serial PRIMARY KEY,
    userAddress text,
    linterAddress text,
    message text,
    block bigint,
    receipt json
);