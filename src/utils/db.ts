/**
 * Offline Relational Database Service (Simulated SQLite on top of IndexedDB)
 * Exposes a SQL-like interface and queries for our local exam database.
 */

import { Exam, ExamAttempt, TamperEvent } from '../types';

const DB_NAME = "OfflineQuizSystemDB";
const DB_VERSION = 1;

export interface QueryResult {
  columns: string[];
  rows: any[][];
  error?: string;
  rowCount: number;
}

// Initialize database
export function initIndexedDB(): Promise<IDBDatabase> {
  return new Promise((resolve, reject) => {
    const request = indexedDB.open(DB_NAME, DB_VERSION);

    request.onupgradeneeded = (event) => {
      const db = request.result;
      
      // Store exams (simulates TABLE exams)
      if (!db.objectStoreNames.contains("exams")) {
        db.createObjectStore("exams", { keyPath: "id" });
      }
      
      // Store attempts (simulates TABLE attempts)
      if (!db.objectStoreNames.contains("attempts")) {
        db.createObjectStore("attempts", { keyPath: "id" });
      }

      // Store individual answers (simulates TABLE answers)
      if (!db.objectStoreNames.contains("answers")) {
        const store = db.createObjectStore("answers", { keyPath: "id" });
        store.createIndex("attemptId", "attemptId", { unique: false });
      }

      // Store tamper logs (simulates TABLE anti_tampering_logs)
      if (!db.objectStoreNames.contains("anti_tampering_logs")) {
        const store = db.createObjectStore("anti_tampering_logs", { keyPath: "id" });
        store.createIndex("attemptId", "attemptId", { unique: false });
      }
    };

    request.onsuccess = () => {
      resolve(request.result);
    };

    request.onerror = () => {
      reject(request.error);
    };
  });
}

// General helper to run operations in a transaction
function runInTransaction<T>(
  storeName: string,
  mode: IDBTransactionMode,
  callback: (store: IDBObjectStore) => IDBRequest<any> | void
): Promise<T> {
  return initIndexedDB().then((db) => {
    return new Promise<T>((resolve, reject) => {
      const transaction = db.transaction(storeName, mode);
      const store = transaction.objectStore(storeName);
      
      let req: IDBRequest<any> | void;
      try {
        req = callback(store);
      } catch (err) {
        reject(err);
        return;
      }

      transaction.oncomplete = () => {
        if (req && 'result' in req) {
          resolve(req.result as T);
        } else {
          resolve(undefined as unknown as T);
        }
      };

      transaction.onerror = () => {
        reject(transaction.error);
      };

      if (req) {
        req.onerror = () => {
          reject(req?.error);
        };
      }
    });
  });
}

// Database Actions
export const localDb = {
  // Exams
  async saveExam(exam: Exam): Promise<void> {
    await runInTransaction<void>("exams", "readwrite", (store) => {
      store.put(exam);
    });
  },

  async getExam(id: string): Promise<Exam | undefined> {
    return runInTransaction<Exam>("exams", "readonly", (store) => {
      return store.get(id);
    });
  },

  async getAllExams(): Promise<Exam[]> {
    return runInTransaction<Exam[]>("exams", "readonly", (store) => {
      return store.getAll();
    });
  },

  // Attempts
  async saveAttempt(attempt: ExamAttempt): Promise<void> {
    await runInTransaction<void>("attempts", "readwrite", (store) => {
      store.put(attempt);
    });
  },

  async getAttempt(id: string): Promise<ExamAttempt | undefined> {
    return runInTransaction<ExamAttempt>("attempts", "readonly", (store) => {
      return store.get(id);
    });
  },

  async getAllAttempts(): Promise<ExamAttempt[]> {
    return runInTransaction<ExamAttempt[]>("attempts", "readonly", (store) => {
      return store.getAll();
    });
  },

  // Individual Answers
  async saveAnswer(attemptId: string, questionId: string, answerIndex: number): Promise<void> {
    const id = `${attemptId}_${questionId}`;
    const record = { id, attemptId, questionId, answerIndex, timestamp: Date.now() };
    await runInTransaction<void>("answers", "readwrite", (store) => {
      store.put(record);
    });
  },

  async getAnswersForAttempt(attemptId: string): Promise<Array<{ questionId: string, answerIndex: number }>> {
    return new Promise<any[]>((resolve, reject) => {
      initIndexedDB().then((db) => {
        const transaction = db.transaction("answers", "readonly");
        const store = transaction.objectStore("answers");
        const index = store.index("attemptId");
        const request = index.getAll(attemptId);

        request.onsuccess = () => resolve(request.result);
        request.onerror = () => reject(request.error);
      }).catch(reject);
    });
  },

  // Tamper Logs
  async saveTamperLog(event: TamperEvent): Promise<void> {
    await runInTransaction<void>("anti_tampering_logs", "readwrite", (store) => {
      store.put(event);
    });
  },

  async getTamperLogsForAttempt(attemptId: string): Promise<TamperEvent[]> {
    return new Promise<TamperEvent[]>((resolve, reject) => {
      initIndexedDB().then((db) => {
        const transaction = db.transaction("anti_tampering_logs", "readonly");
        const store = transaction.objectStore("anti_tampering_logs");
        const index = store.index("attemptId");
        const request = index.getAll(attemptId);

        request.onsuccess = () => resolve(request.result);
        request.onerror = () => reject(request.error);
      }).catch(reject);
    });
  },

  /**
   * Run a virtual SQL query on top of our IndexedDB data structures.
   * This parses basic queries to give an authentic "local SQLite database inspector" experience.
   * Supported:
   *  - SELECT * FROM <tableName>
   *  - SELECT <cols> FROM <tableName> WHERE col = 'val'
   *  - SELECT count(*) FROM <tableName>
   *  - INSERT INTO <tableName> (cols...) VALUES (vals...)
   *  - UPDATE <tableName> SET col1 = val1, col2 = val2 WHERE id = 'val3'
   *  - DELETE FROM <tableName> WHERE col = 'val'
   *  - PRAGMA table_info(<tableName>)
   *  - HELP or SHOW TABLES
   */
  async runVirtualSqlQuery(sql: string): Promise<QueryResult> {
    const cleanSql = sql.trim().replace(/;$/, "");
    
    // Helper to parse simple WHERE clauses
    const parseWhereClause = (whereStr: string): { key: string; value: string; error?: string } => {
      const whereMatch = whereStr.trim().match(/(\w+)\s*=\s*['"]?([^'"]+)['"]?/i);
      if (!whereMatch) {
        return { key: "", value: "", error: "Simulated WHERE clause must be in simple format: column = 'value'" };
      }
      return { key: whereMatch[1], value: whereMatch[2] };
    };

    // Helper to parse comma-separated values ignoring quotes
    const parseValues = (valsStr: string): any[] => {
      const matches: any[] = [];
      let current = "";
      let inQuotes = false;
      let quoteChar = "";

      for (let i = 0; i < valsStr.length; i++) {
        const char = valsStr[i];
        if ((char === "'" || char === '"') && (i === 0 || valsStr[i - 1] !== '\\')) {
          if (!inQuotes) {
            inQuotes = true;
            quoteChar = char;
          } else if (char === quoteChar) {
            inQuotes = false;
          } else {
            current += char;
          }
        } else if (char === ',' && !inQuotes) {
          matches.push(current.trim());
          current = "";
        } else {
          current += char;
        }
      }
      matches.push(current.trim());
      return matches.map(m => {
        if (/^\d+$/.test(m)) return Number(m);
        if (m === "null" || m === "NULL") return null;
        return m;
      });
    };

    // 1. HELP / SHOW TABLES queries
    if (cleanSql.toLowerCase() === "help" || cleanSql.toLowerCase() === "show tables") {
      return {
        columns: ["Table Name", "Description", "Primary Key Schema"],
        rows: [
          ["exams", "Cached digital exam questionnaire packages (AES encrypted)", "id"],
          ["attempts", "Local candidate test attempts, timing counters, and proctoring locks", "id"],
          ["answers", "Simulated database relation for individual question selected choices", "id"],
          ["anti_tampering_logs", "Immutable audit trail records of candidate screen focus blurs", "id"]
        ],
        rowCount: 4
      };
    }

    // 2. PRAGMA table_info(tableName) queries
    const pragmaMatch = cleanSql.match(/^PRAGMA\s+table_info\((\w+)\)$/i);
    if (pragmaMatch) {
      const tableName = pragmaMatch[1].toLowerCase();
      const validTables = ["exams", "attempts", "answers", "anti_tampering_logs"];
      if (!validTables.includes(tableName)) {
        return { columns: [], rows: [], rowCount: 0, error: `Table '${tableName}' not found.` };
      }
      
      const columnsMap: Record<string, string[]> = {
        exams: ["id (TEXT)", "title (TEXT)", "description (TEXT)", "timeLimit (INTEGER)", "integrityHash (TEXT)"],
        attempts: ["id (TEXT)", "examId (TEXT)", "studentName (TEXT)", "studentEmail (TEXT)", "status (TEXT)", "startTime (INTEGER)", "timeRemaining (INTEGER)", "isSynchronized (BOOLEAN)"],
        answers: ["id (TEXT)", "attemptId (TEXT)", "questionId (TEXT)", "answerIndex (INTEGER)", "timestamp (INTEGER)"],
        anti_tampering_logs: ["id (TEXT)", "attemptId (TEXT)", "type (TEXT)", "timestamp (INTEGER)", "description (TEXT)"]
      };

      return {
        columns: ["cid", "name", "type", "notnull", "pk"],
        rows: columnsMap[tableName].map((col, idx) => {
          const [name, type] = col.split(" ");
          return [idx, name, type.replace(/[()]/g, ""), 1, idx === 0 ? 1 : 0];
        }),
        rowCount: columnsMap[tableName].length
      };
    }

    // 3. DELETE FROM queries
    const deleteMatch = cleanSql.match(/^DELETE\s+FROM\s+(\w+)(?:\s+WHERE\s+(.+))?$/i);
    if (deleteMatch) {
      const tableName = deleteMatch[1].toLowerCase();
      const whereClause = deleteMatch[2];
      const validTables = ["exams", "attempts", "answers", "anti_tampering_logs"];
      if (!validTables.includes(tableName)) {
        return { columns: [], rows: [], rowCount: 0, error: `Table '${tableName}' not found.` };
      }

      let records = await runInTransaction<any[]>(tableName, "readonly", (store) => store.getAll());
      let toDelete: any[] = [];

      if (whereClause) {
        const whereCond = parseWhereClause(whereClause);
        if (whereCond.error) {
          return { columns: [], rows: [], rowCount: 0, error: whereCond.error };
        }
        toDelete = records.filter(r => String(r[whereCond.key]) === String(whereCond.value));
      } else {
        toDelete = [...records];
      }

      await initIndexedDB().then((db) => {
        return new Promise<void>((resolve, reject) => {
          const tx = db.transaction(tableName, "readwrite");
          const store = tx.objectStore(tableName);
          if (whereClause) {
            toDelete.forEach(r => store.delete(r.id));
          } else {
            store.clear();
          }
          tx.oncomplete = () => resolve();
          tx.onerror = () => reject(tx.error);
        });
      });

      return {
        columns: ["Status", "Affected Rows"],
        rows: [["Success", toDelete.length]],
        rowCount: 1
      };
    }

    // 4. INSERT INTO queries
    const insertMatch = cleanSql.match(/^INSERT\s+INTO\s+(\w+)\s*\((.+?)\)\s*VALUES\s*\((.+?)\)$/i);
    if (insertMatch) {
      const tableName = insertMatch[1].toLowerCase();
      const colsStr = insertMatch[2];
      const valsStr = insertMatch[3];

      const validTables = ["exams", "attempts", "answers", "anti_tampering_logs"];
      if (!validTables.includes(tableName)) {
        return { columns: [], rows: [], rowCount: 0, error: `Table '${tableName}' not found.` };
      }

      const columns = colsStr.split(",").map(c => c.trim());
      const values = parseValues(valsStr);

      if (columns.length !== values.length) {
        return { columns: [], rows: [], rowCount: 0, error: `Column count (${columns.length}) does not match value count (${values.length}).` };
      }

      const record: Record<string, any> = {};
      columns.forEach((col, idx) => {
        let val = values[idx];
        if (["timestamp", "timeLimit", "startTime", "timeRemaining", "answerIndex"].includes(col)) {
          val = Number(val);
        } else if (["isSynchronized"].includes(col)) {
          val = val === "true" || val === "1" || val === true || val === 1;
        }
        record[col] = val;
      });

      if (!record.id) {
        record.id = `sql-${Math.random().toString(36).substring(2, 9)}`;
      }

      await runInTransaction<void>(tableName, "readwrite", (store) => {
        store.put(record);
      });

      return {
        columns: ["Status", "Affected Rows", "Inserted ID"],
        rows: [["Success", 1, record.id]],
        rowCount: 1
      };
    }

    // 5. UPDATE queries
    const updateMatch = cleanSql.match(/^UPDATE\s+(\w+)\s+SET\s+(.+?)(?:\s+WHERE\s+(.+))?$/i);
    if (updateMatch) {
      const tableName = updateMatch[1].toLowerCase();
      const setClause = updateMatch[2];
      const whereClause = updateMatch[3];

      const validTables = ["exams", "attempts", "answers", "anti_tampering_logs"];
      if (!validTables.includes(tableName)) {
        return { columns: [], rows: [], rowCount: 0, error: `Table '${tableName}' not found.` };
      }

      const setPairs = setClause.split(",").map(p => p.trim());
      const updates: Record<string, any> = {};
      for (const pair of setPairs) {
        const eqIdx = pair.indexOf("=");
        if (eqIdx === -1) {
          return { columns: [], rows: [], rowCount: 0, error: "Invalid SET syntax. Must be column = value" };
        }
        const col = pair.substring(0, eqIdx).trim();
        let val: any = pair.substring(eqIdx + 1).trim().replace(/^['"]|['"]$/g, "");
        if (["timestamp", "timeLimit", "startTime", "timeRemaining", "answerIndex"].includes(col)) {
          val = Number(val);
        } else if (["isSynchronized"].includes(col)) {
          val = val === "true" || val === "1" || val === true || val === 1;
        }
        updates[col] = val;
      }

      let records = await runInTransaction<any[]>(tableName, "readonly", (store) => store.getAll());
      let updatedCount = 0;

      if (whereClause) {
        const whereCond = parseWhereClause(whereClause);
        if (whereCond.error) {
          return { columns: [], rows: [], rowCount: 0, error: whereCond.error };
        }
        for (const record of records) {
          if (String(record[whereCond.key]) === String(whereCond.value)) {
            const updatedRecord = { ...record, ...updates };
            await runInTransaction<void>(tableName, "readwrite", (store) => {
              store.put(updatedRecord);
            });
            updatedCount++;
          }
        }
      } else {
        for (const record of records) {
          const updatedRecord = { ...record, ...updates };
          await runInTransaction<void>(tableName, "readwrite", (store) => {
            store.put(updatedRecord);
          });
          updatedCount++;
        }
      }

      return {
        columns: ["Status", "Affected Rows"],
        rows: [["Success", updatedCount]],
        rowCount: 1
      };
    }

    // 6. SELECT queries (Extended basic selector)
    const selectMatch = cleanSql.match(/^SELECT\s+(.+?)\s+FROM\s+(\w+)(?:\s+WHERE\s+(.+))?$/i);
    if (!selectMatch) {
      return {
        columns: [],
        rows: [],
        rowCount: 0,
        error: "SQL Execution Error. Supported statements: HELP, SHOW TABLES, SELECT, INSERT, UPDATE, DELETE, and PRAGMA table_info(tableName)."
      };
    }

    const [, fields, tableName, whereClause] = selectMatch;
    const lowerTable = tableName.toLowerCase();

    const validTables = ["exams", "attempts", "answers", "anti_tampering_logs"];
    if (!validTables.includes(lowerTable)) {
      return {
        columns: [],
        rows: [],
        rowCount: 0,
        error: `Table '${tableName}' not found. Available tables: ${validTables.join(", ")}`
      };
    }

    let records: any[] = [];
    try {
      records = await runInTransaction<any[]>(lowerTable, "readonly", (store) => store.getAll());
    } catch (err) {
      return { columns: [], rows: [], rowCount: 0, error: `Database read failed: ${String(err)}` };
    }

    if (whereClause) {
      const whereCond = parseWhereClause(whereClause);
      if (whereCond.error) {
        return { columns: [], rows: [], rowCount: 0, error: whereCond.error };
      }
      records = records.filter(r => String(r[whereCond.key]) === String(whereCond.value));
    }

    if (records.length === 0) {
      return { columns: ["Result"], rows: [["Empty set"]], rowCount: 0 };
    }

    if (fields.trim().toLowerCase() === "count(*)") {
      return {
        columns: ["count(*)"],
        rows: [[records.length]],
        rowCount: 1
      };
    }

    // Map fields
    const allCols = Array.from(new Set(records.flatMap(r => Object.keys(r))));
    const columns = fields.trim() === "*" 
      ? allCols 
      : fields.split(",").map(c => c.trim()).filter(c => allCols.includes(c));

    if (columns.length === 0) {
      return { columns: [], rows: [], rowCount: 0, error: `Selected columns do not exist in table '${tableName}'.` };
    }
    
    const rows = records.map(record => {
      return columns.map(col => {
        const val = record[col];
        if (typeof val === "object" && val !== null) {
          return JSON.stringify(val);
        }
        return val === undefined ? "NULL" : val;
      });
    });

    return {
      columns,
      rows,
      rowCount: records.length
    };
  }
};
