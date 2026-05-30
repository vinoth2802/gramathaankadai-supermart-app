-- CreateTable
CREATE TABLE `flyway_schema_history` (
    `installed_rank` INTEGER NOT NULL,
    `version` VARCHAR(50) NULL,
    `description` VARCHAR(200) NOT NULL,
    `type` VARCHAR(20) NOT NULL,
    `script` VARCHAR(1000) NOT NULL,
    `checksum` INTEGER NULL,
    `installed_by` VARCHAR(100) NOT NULL,
    `installed_on` TIMESTAMP(0) NOT NULL DEFAULT CURRENT_TIMESTAMP(0),
    `execution_time` INTEGER NOT NULL,
    `success` BOOLEAN NOT NULL,

    INDEX `flyway_schema_history_s_idx`(`success`),
    PRIMARY KEY (`installed_rank`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;
