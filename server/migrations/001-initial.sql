
--------------------------------------------------------------------------------
-- Up
--------------------------------------------------------------------------------

CREATE TABLE Users (
    id INTEGER PRIMARY KEY,
    username TEXT NOT NULL UNIQUE,
    password TEXT NOT NULL,
    settings TEXT
);

CREATE TABLE Sessions (
    id INTEGER PRIMARY KEY,
    userId INTEGER NOT NULL REFERENCES Users(id) ON DELETE CASCADE,
    device TEXT NOT NULL,
    uuid TEXT NOT NULL UNIQUE
);

--------------------------------------------------------------------------------
-- Down
--------------------------------------------------------------------------------

DROP TABLE Users;
DROP TABLE Sessions;
