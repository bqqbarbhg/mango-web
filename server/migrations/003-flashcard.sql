
--------------------------------------------------------------------------------
-- Up
--------------------------------------------------------------------------------

CREATE TABLE Flashcard (
    id INTEGER PRIMARY KEY,
    uuid TEXT NOT NULL UNIQUE,
    userId INTEGER NOT NULL REFERENCES Users(id) ON DELETE CASCADE,
    word TEXT NOT NULL,
    example TEXT NOT NULL,
    infoId INTEGER NOT NULL REFERENCES FlashcardInfo(id) ON DELETE CASCADE,
    addedTime INTEGER NOT NULL,
    answerTime INTEGER NOT NULL DEFAULT 0,
    answerHistory INTEGER NOT NULL DEFAULT 0,
    answersTotal INTEGER NOT NULL DEFAULT 0,
    answersCorrect INTEGER NOT NULL DEFAULT 0,

    UNIQUE (userId, word)
);

CREATE TABLE FlashcardInfo (
    id INTEGER PRIMARY KEY,
    info TEXT NOT NULL UNIQUE,
    refcount INTEGER NOT NULL
);

--------------------------------------------------------------------------------
-- Down
--------------------------------------------------------------------------------

DROP TABLE Flashcard;
DROP TABLE FlashcardInfo;
