------------------------------------
-- messages table
------------------------------------
CREATE TABLE IF NOT EXISTS messages (
    authorId VARCHAR(100) NOT NULL,
    messageId VARCHAR(100) NOT NULL,
    room TEXT NOT NULL,
    message LONGTEXT NOT NULL,
    createdAt DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    PRIMARY KEY (messageId)
);

------------------------------------
-- message_reactions table
------------------------------------
CREATE TABLE IF NOT EXISTS message_reactions (
    reactionId INT NOT NULL AUTO_INCREMENT,
    cid VARCHAR(500) NOT NULL UNIQUE,
    messageId VARCHAR(100) NOT NULL,
    emojiHash LONGTEXT NOT NULL,
    memberId VARCHAR(100) NOT NULL,
    react_timestamp DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    PRIMARY KEY (reactionId)
);

------------------------------------
-- ip_cache table
------------------------------------
CREATE TABLE IF NOT EXISTS ip_cache (
    ip VARCHAR(100) NOT NULL,
    data LONGTEXT NOT NULL,
    last_sync DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    created DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    PRIMARY KEY (ip)
);

------------------------------------
-- cache table
------------------------------------
CREATE TABLE IF NOT EXISTS cache (
    rowId INT(12) NOT NULL AUTO_INCREMENT,
    identifier VARCHAR(255) NOT NULL UNIQUE,
    type VARCHAR(255) NOT NULL,
    data LONGTEXT NOT NULL,
    last_update DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    PRIMARY KEY (rowId)
);

------------------------------------
-- migrations table
------------------------------------
CREATE TABLE IF NOT EXISTS migrations (
    migration_name VARCHAR(100) NOT NULL,
    done INT(10) NOT NULL DEFAULT 0,
    PRIMARY KEY (migration_name)
);

------------------------------------
-- inbox table
------------------------------------
CREATE TABLE IF NOT EXISTS inbox (
    inboxId INT NOT NULL AUTO_INCREMENT,
    memberId VARCHAR(250) NOT NULL,
    customId VARCHAR(250) DEFAULT NULL UNIQUE,
    data LONGTEXT NOT NULL,
    type VARCHAR(250) NOT NULL,
    isRead BIGINT NOT NULL DEFAULT 0,
    createdAt DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    PRIMARY KEY (inboxId)
);

------------------------------------
-- message_logs table
------------------------------------
CREATE TABLE IF NOT EXISTS message_logs (
    id INT NOT NULL AUTO_INCREMENT,
    authorId VARCHAR(100) NOT NULL,
    messageId VARCHAR(100) NOT NULL,
    room TEXT NOT NULL,
    message LONGTEXT NOT NULL,
    PRIMARY KEY (id)
);

------------------------------------
-- url_cache table
------------------------------------
CREATE TABLE IF NOT EXISTS url_cache (
    id INT NOT NULL AUTO_INCREMENT,
    url LONGTEXT NOT NULL UNIQUE,
    media_type TEXT NOT NULL,
    PRIMARY KEY (id)
);

------------------------------------
-- reports table
------------------------------------
CREATE TABLE IF NOT EXISTS reports (
    id INT NOT NULL AUTO_INCREMENT,
    reportCreator LONGTEXT NOT NULL,
    reportedUser LONGTEXT NOT NULL,
    reportType TEXT NOT NULL,
    reportData LONGTEXT NULL,
    reportNotes LONGTEXT NULL,
    reportStatus VARCHAR(100) NOT NULL DEFAULT 'pending',
    PRIMARY KEY (id)
);

------------------------------------
-- dms_threads table
------------------------------------
CREATE TABLE IF NOT EXISTS dms_threads (
    threadId VARCHAR(100) NOT NULL,
    type VARCHAR(50) NOT NULL,
    title TEXT NULL,
    PRIMARY KEY (threadId)
);

------------------------------------
-- dms_participants table
------------------------------------
CREATE TABLE IF NOT EXISTS dms_participants (
    threadId VARCHAR(100) NOT NULL,
    memberId VARCHAR(100) NOT NULL,
    PRIMARY KEY (threadId, memberId),
    KEY memberId (memberId)
);

------------------------------------
-- dms_message_logs table
------------------------------------
CREATE TABLE IF NOT EXISTS dms_message_logs (
    id INT NOT NULL AUTO_INCREMENT,
    messageId VARCHAR(100) NOT NULL,
    threadId VARCHAR(100) NOT NULL,
    authorId VARCHAR(100) NOT NULL,
    message LONGTEXT NOT NULL,
    loggedAt DATETIME NOT NULL,
    PRIMARY KEY (id)
);

------------------------------------
-- dms_messages table
------------------------------------
CREATE TABLE IF NOT EXISTS dms_messages (
    messageId VARCHAR(100) NOT NULL,
    threadId VARCHAR(100) NOT NULL,
    authorId VARCHAR(100) NOT NULL,
    message LONGTEXT NOT NULL,
    createdAt DATETIME NOT NULL,
    supportIdentity VARCHAR(20) NOT NULL DEFAULT 'self',
    displayName TEXT NULL,
    PRIMARY KEY (messageId),
    KEY threadId (threadId)
);

------------------------------------
-- tickets table
------------------------------------
CREATE TABLE IF NOT EXISTS tickets (
    threadId VARCHAR(100) NOT NULL,
    creatorId VARCHAR(100) NOT NULL,
    status VARCHAR(20) NOT NULL DEFAULT 'open',
    createdAt DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updatedAt DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    PRIMARY KEY threadId (threadId),
    KEY status (status),
    KEY creatorId (creatorId)
);

------------------------------------
-- posts table
------------------------------------
CREATE TABLE IF NOT EXISTS posts (
    id INT NOT NULL AUTO_INCREMENT,
    title TEXT NOT NULL,
    body LONGTEXT NOT NULL,
    authorId VARCHAR(100) NOT NULL,
    tag VARCHAR(100) NULL,
    pinned TINYINT(1) NOT NULL DEFAULT 0,
    createdAt DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    PRIMARY KEY (id)
);

------------------------------------
-- news table
------------------------------------
CREATE TABLE IF NOT EXISTS news (
    id INT NOT NULL AUTO_INCREMENT,
    title TEXT NOT NULL,
    body LONGTEXT NOT NULL,
    authorId VARCHAR(100) NOT NULL,
    pinned TINYINT(1) NOT NULL DEFAULT 0,
    createdAt DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    PRIMARY KEY (id)
);

------------------------------------
-- help table
------------------------------------
CREATE TABLE IF NOT EXISTS help (
    id INT NOT NULL AUTO_INCREMENT,
    slug VARCHAR(120) NOT NULL UNIQUE,
    title TEXT NOT NULL,
    body LONGTEXT NOT NULL,
    authorId VARCHAR(100) NOT NULL,
    pinned TINYINT(1) NOT NULL DEFAULT 0,
    createdAt DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    PRIMARY KEY (id)
);

------------------------------------
-- dms_reads table
------------------------------------
CREATE TABLE IF NOT EXISTS dms_reads (
    threadId VARCHAR(100) NOT NULL,
    memberId VARCHAR(100) NOT NULL,
    last_read_at TEXT NOT NULL,
    PRIMARY KEY (threadId, memberId),
    KEY threadId (threadId),
    KEY memberId (memberId)
);

------------------------------------
-- content_reads table
------------------------------------
CREATE TABLE IF NOT EXISTS content_reads (
    id BIGINT NOT NULL AUTO_INCREMENT,
    contentType VARCHAR(32) NOT NULL,
    contentId BIGINT NOT NULL,
    userId VARCHAR(128) NOT NULL,
    readAt DATETIME NULL,
    createdAt DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    PRIMARY KEY (id)
    UNIQUE KEY uq_content_user (contentType, contentId, userId),
    INDEX idx_user_unread (userId, readAt),
    INDEX idx_content (contentType, contentId)
);

------------------------------------
-- network_servers table
------------------------------------
CREATE TABLE IF NOT EXISTS network_servers (
    id INT NOT NULL AUTO_INCREMENT,
    address VARCHAR(255) NOT NULL UNIQUE,
    status VARCHAR(255) NOT NULL,
    data LONGTEXT,
    last_sync DATETIME NULL,
    PRIMARY KEY (id)
);

------------------------------------
-- auditlog table
------------------------------------
CREATE TABLE IF NOT EXISTS auditlog (
    text LONGTEXT NOT NULL,
    datetime DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP
);

------------------------------------
-- members table
------------------------------------
CREATE TABLE IF NOT EXISTS members (
    rowId INT NOT NULL AUTO_INCREMENT,
    id VARCHAR(100) NOT NULL UNIQUE,
    token VARCHAR(255),
    onboarding BOOLEAN DEFAULT FALSE,
    loginName VARCHAR(100),
    name VARCHAR(100) NOT NULL DEFAULT 'User',
    nickname VARCHAR(100) DEFAULT NULL,
    country_code VARCHAR(50) DEFAULT NULL,
    status TEXT DEFAULT '',
    aboutme TEXT DEFAULT '',
    icon LONGTEXT DEFAULT '',
    banner LONGTEXT DEFAULT '',
    joined DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    isOnline BOOLEAN DEFAULT FALSE,
    lastOnline BIGINT DEFAULT 0,
    isBanned BOOLEAN DEFAULT FALSE,
    isMuted BOOLEAN DEFAULT FALSE,
    password TEXT DEFAULT NULL,
    publicKey TEXT DEFAULT '',
    isVerifiedKey BOOLEAN DEFAULT FALSE,
    pow TEXT DEFAULT '',
    PRIMARY KEY (rowId)
);

------------------------------------
-- Ensure messageId exists for purge task optimization
------------------------------------
ALTER TABLE reports
ADD COLUMN IF NOT EXISTS messageId VARCHAR(100) NULL;

CREATE INDEX IF NOT EXISTS idx_reports_messageId
ON reports(messageId);