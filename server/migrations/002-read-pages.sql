
--------------------------------------------------------------------------------
-- Up
--------------------------------------------------------------------------------

CREATE TABLE ReadPages (
    volumeId INTEGER NOT NULL REFERENCES VolumeState(id),
    pageBase INTEGER NOT NULL,
    pageBits INTEGER NOT NULL DEFAULT 0,

    PRIMARY KEY (volumeId, pageBase)
);

--------------------------------------------------------------------------------
-- Down
--------------------------------------------------------------------------------

DROP TABLE ReadPages;
