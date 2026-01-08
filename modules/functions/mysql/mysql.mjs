import { mysql, pool, serverconfig } from "../../../index.mjs";
import Logger from "../logger.mjs";

export async function queryDatabase(query, params, retryCount = 3) {
    let connection;

    try {
        connection = await pool.getConnection();
        const [results,] = await connection.execute(query, params);
        return results;
    } catch (err) {
        if (err.code === 'ER_LOCK_DEADLOCK' && retryCount > 0) {
            console.warn('Deadlock detected, retrying transaction...', retryCount);
            // wait for a short period before retrying
            await new Promise(resolve => setTimeout(resolve, 100));
            return queryDatabase(query, params, retryCount - 1);
        } else {
            Logger.error('SQL Error executing query:');
            Logger.error(err);
            throw err;
        }
    } finally {
        if (connection) connection.release();
    }
}

export async function checkAndCreateTable(table) {
    const query = `
    SELECT COUNT(*)
    FROM information_schema.tables 
    WHERE table_schema = ? 
      AND table_name = ?
  `;

    try {
        const results = await queryDatabase(query, [serverconfig.serverinfo.sql.database, table.name]);
        const tableExists = results[0]['COUNT(*)'] > 0;

        if (tableExists) {
            await checkAndCreateColumns(table);
            await syncColumns(table);
        } else {
            await createTable(table);
        }
    } catch (err) {
        Logger.error('Error in checkAndCreateTable:', err);
    }
}

async function checkAndCreateColumns(table) {
    const query = `
        SELECT COLUMN_NAME, IS_NULLABLE, COLUMN_TYPE, COLUMN_DEFAULT
        FROM information_schema.columns
        WHERE table_schema = ?
          AND table_name = ?
    `;

    try {
        const results = await queryDatabase(query, [serverconfig.serverinfo.sql.database, table.name]);
        const existingColumns = results.map(row => row.COLUMN_NAME);
        const missingColumns = table.columns.filter(col => !existingColumns.includes(col.name));

        if (missingColumns.length > 0) {
            console.log(`Adding missing columns to table "${table.name}":`, missingColumns);
            await addMissingColumns(table.name, missingColumns);
        } else {
            //console.log(`All columns in table "${table.name}" are up to date.`);
        }
    } catch (err) {
        Logger.error('Error in checkAndCreateColumns:', err);
    }
}

async function createTable(table) {
    const columnsDefinition = table.columns.map(col => `${col.name} ${col.type}`).join(', ');
    const createTableQuery = mysql.format(
        `
      CREATE TABLE ?? (
          ${columnsDefinition}
      ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci
      `,
        [table.name]
    );

    try {
        console.log('Executing CREATE TABLE query:', createTableQuery);
        await queryDatabase(createTableQuery);

        console.log(`Table "${table.name}" created successfully.`);
        if (table.keys) {
            await addKeys(table);
        }
        if (table.autoIncrement) {
            await addAutoIncrement(table);
        }
    } catch (err) {
        Logger.error('Error in createTable:', err);
    }
}

async function syncColumns(table) {
    const query = `
        SELECT COLUMN_NAME, IS_NULLABLE, COLUMN_TYPE, COLUMN_DEFAULT
        FROM information_schema.columns
        WHERE table_schema = ?
          AND table_name = ?
    `;

    const results = await queryDatabase(query, [
        serverconfig.serverinfo.sql.database,
        table.name
    ]);

    const dbColumns = Object.fromEntries(
        results.map(r => [r.COLUMN_NAME, r])
    );

    for (const col of table.columns) {
        const dbCol = dbColumns[col.name];

        if (!dbCol) {
            await addMissingColumns(table.name, [col]);
            continue;
        }

        const desired = parseColumn(col.type);
        const current = {
            type: dbCol.COLUMN_TYPE.toLowerCase(),
            nullable: dbCol.IS_NULLABLE === "YES",
            default: dbCol.COLUMN_DEFAULT
        };

        if (
            desired.type !== current.type ||
            desired.nullable !== current.nullable ||
            desired.default !== current.default
        ) {
            await modifyColumn(table.name, col);
        }
    }
}

function parseColumn(type) {
    const t = type.toLowerCase();

    return {
        type: t
            .replace(/ not null/g, "")
            .replace(/ null/g, "")
            .replace(/ default .+$/, "")
            .trim(),
        nullable: !t.includes("not null"),
        default: (() => {
            const m = t.match(/default\s+(.+)$/);
            if (!m) return null;
            const v = m[1].trim();
            if (v.toUpperCase() === "NULL") return null;
            return v.replace(/^'|'$/g, "");
        })()
    };
}

async function modifyColumn(tableName, col) {
    let type = col.type.replace(/primary key/gi, "").trim();

    const query = mysql.format(
        `ALTER TABLE ?? MODIFY COLUMN ${col.name} ${type}`,
        [tableName]
    );

    await queryDatabase(query);
}


async function addMissingColumns(tableName, columns) {
    const alter = columns
        .map(col => `ADD COLUMN ${col.name} ${col.type}`)
        .join(", ");

    const query = mysql.format(
        `ALTER TABLE ?? ${alter}`,
        [tableName]
    );

    await queryDatabase(query);
}


async function addKeys(table) {
    const keysQueries = table.keys.map(key => `ADD ${key.name} ${key.type}`).join(', ');
    const keysQuery = mysql.format(
        `ALTER TABLE ?? ${keysQueries}`,
        [table.name]
    );

    try {
        console.log('Executing ADD KEYS query:', keysQuery);
        await queryDatabase(keysQuery);
    } catch (err) {
        Logger.error('Error in addKeys:', err);
    }
}


async function addAutoIncrement(table) {
    const autoIncrementQuery = mysql.format(
        `ALTER TABLE ?? MODIFY ${table.autoIncrement}`,
        [table.name]
    );

    try {
        console.log('Executing AUTO_INCREMENT query:', autoIncrementQuery);
        await queryDatabase(autoIncrementQuery);
    } catch (err) {
        Logger.error('Error in addAutoIncrement:', err);
    }
}