
--------------------------------------------------------------------------------
-- Up
--------------------------------------------------------------------------------

CREATE TABLE Users (
    id INTEGER PRIMARY KEY,
    email TEXT NOT NULL UNIQUE,
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

CREATE TABLE Sources (
    id INTEGER PRIMARY KEY,
    userId INTEGER NOT NULL REFERENCES Users(id) ON DELETE CASCADE,
    url TEXT NOT NULL,
    uuid TEXT NOT NULL UNIQUE,

    UNIQUE(userId, url)
);

CREATE TABLE VolumeState (
    id INTEGER PRIMARY KEY,
    userId INTEGER NOT NULL REFERENCES Users(id) ON DELETE CASCADE,
    path TEXT NOT NULL,
    latestPage INTEGER,
    latestSessionId INTEGER REFERENCES Sessions(id) ON DELETE SET NULL,
    latestSourceId INTEGER REFERENCES Sources(id) ON DELETE SET NULL,

    UNIQUE(userId, path)
);

--------------------------------------------------------------------------------
-- Down
--------------------------------------------------------------------------------

DROP TABLE Users;
DROP TABLE Sessions;
DROP TABLE Sources;
DROP TABLE VolumeState;
