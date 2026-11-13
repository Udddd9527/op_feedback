require("dotenv").config();
const { withConnection, closePool } = require("./db");
const { hashPassword } = require("./auth");

const admins = [
  ["吴建君", "wujianjun"], ["姜一凡", "jiangyifan"], ["唐浩", "tanghao"],
  ["刘露露", "liululu"], ["仇旭雷", "qiuxulei"], ["李红鹏", "lihongpeng"],
  ["刘秉奇", "liubingqi"], ["刘国政", "liuguozheng"], ["王洋", "wangyang"]
];

const ddl = [
  `CREATE SEQUENCE OPFB_ISSUE_SEQ START WITH 1 INCREMENT BY 1 NOCACHE`,
  `CREATE TABLE OPFB_USERS (
    ID VARCHAR2(36) PRIMARY KEY, NAME VARCHAR2(80) NOT NULL, ACCOUNT VARCHAR2(80) NOT NULL,
    PASSWORD_HASH VARCHAR2(220) NOT NULL, ROLE VARCHAR2(16) NOT NULL, REGION VARCHAR2(40) NOT NULL,
    STATUS VARCHAR2(16) DEFAULT 'active' NOT NULL, CREATED_AT TIMESTAMP DEFAULT SYSTIMESTAMP NOT NULL,
    UPDATED_AT TIMESTAMP DEFAULT SYSTIMESTAMP NOT NULL,
    CONSTRAINT OPFB_UQ_USERS_ACCOUNT UNIQUE (ACCOUNT),
    CONSTRAINT OPFB_CK_USERS_ROLE CHECK (ROLE IN ('user','admin','ai')),
    CONSTRAINT OPFB_CK_USERS_STATUS CHECK (STATUS IN ('active','disabled'))
  )`,
  `CREATE TABLE OPFB_ISSUES (
    ID VARCHAR2(30) PRIMARY KEY, TYPE VARCHAR2(16) NOT NULL, TITLE VARCHAR2(300) NOT NULL,
    MODULE_NAME VARCHAR2(120) NOT NULL, REGION VARCHAR2(40) NOT NULL, REPORTER_ID VARCHAR2(36) NOT NULL,
    STATUS VARCHAR2(16) DEFAULT 'new' NOT NULL, PRIORITY VARCHAR2(4) DEFAULT 'P2' NOT NULL,
    ASSIGNEE_ID VARCHAR2(36), ETA DATE, DESCRIPTION CLOB NOT NULL, REPRODUCE CLOB, IMPACT CLOB NOT NULL,
    DECISION VARCHAR2(16) DEFAULT 'pending' NOT NULL, REJECT_REASON CLOB, CLIENT_REQUEST_ID VARCHAR2(64), AI_SCORE NUMBER(3),
    AI_REASON VARCHAR2(500), AI_RESULT CLOB, AI_TAKEN_DATE DATE,
    CREATED_AT TIMESTAMP DEFAULT SYSTIMESTAMP NOT NULL, UPDATED_AT TIMESTAMP DEFAULT SYSTIMESTAMP NOT NULL,
    CONSTRAINT OPFB_FK_ISSUE_REPORTER FOREIGN KEY (REPORTER_ID) REFERENCES OPFB_USERS(ID),
    CONSTRAINT OPFB_FK_ISSUE_ASSIGNEE FOREIGN KEY (ASSIGNEE_ID) REFERENCES OPFB_USERS(ID),
    CONSTRAINT OPFB_CK_ISSUE_TYPE CHECK (TYPE IN ('issue','idea')),
    CONSTRAINT OPFB_CK_ISSUE_STATUS CHECK (STATUS IN ('new','review','plan','doing','verify','done','rejected'))
  )`,
  `CREATE TABLE OPFB_TIMELINE (
    ID VARCHAR2(36) PRIMARY KEY, ISSUE_ID VARCHAR2(30) NOT NULL, ACTOR_ID VARCHAR2(36),
    ACTOR_NAME VARCHAR2(100) NOT NULL, CONTENT VARCHAR2(2000) NOT NULL,
    CREATED_AT TIMESTAMP DEFAULT SYSTIMESTAMP NOT NULL,
    CONSTRAINT OPFB_FK_TIMELINE_ISSUE FOREIGN KEY (ISSUE_ID) REFERENCES OPFB_ISSUES(ID),
    CONSTRAINT OPFB_FK_TIMELINE_ACTOR FOREIGN KEY (ACTOR_ID) REFERENCES OPFB_USERS(ID)
  )`,
  `CREATE TABLE OPFB_ATTACHMENTS (
    ID VARCHAR2(36) PRIMARY KEY, ISSUE_ID VARCHAR2(30) NOT NULL, FILE_NAME VARCHAR2(255) NOT NULL,
    CONTENT_TYPE VARCHAR2(120) NOT NULL, FILE_SIZE NUMBER(12) NOT NULL, FILE_DATA BLOB NOT NULL,
    UPLOADED_BY VARCHAR2(36) NOT NULL, CREATED_AT TIMESTAMP DEFAULT SYSTIMESTAMP NOT NULL,
    CONSTRAINT OPFB_FK_ATTACH_ISSUE FOREIGN KEY (ISSUE_ID) REFERENCES OPFB_ISSUES(ID),
    CONSTRAINT OPFB_FK_ATTACH_USER FOREIGN KEY (UPLOADED_BY) REFERENCES OPFB_USERS(ID)
  )`,
  `CREATE TABLE OPFB_AI_RUNS (
    ID VARCHAR2(36) PRIMARY KEY, RUN_DATE DATE NOT NULL, SCANNED_COUNT NUMBER DEFAULT 0 NOT NULL,
    CLAIMED_COUNT NUMBER DEFAULT 0 NOT NULL, COMPLETED_COUNT NUMBER DEFAULT 0 NOT NULL,
    SKIPPED_COUNT NUMBER DEFAULT 0 NOT NULL, CREATED_AT TIMESTAMP DEFAULT SYSTIMESTAMP NOT NULL
  )`,
  `CREATE INDEX OPFB_IX_ISSUES_REPORTER ON OPFB_ISSUES(REPORTER_ID)`,
  `CREATE INDEX OPFB_IX_ISSUES_STATUS ON OPFB_ISSUES(STATUS, PRIORITY)`,
  `CREATE INDEX OPFB_IX_TIMELINE_ISSUE ON OPFB_TIMELINE(ISSUE_ID, CREATED_AT)`,
  `CREATE INDEX OPFB_IX_ATTACH_ISSUE ON OPFB_ATTACHMENTS(ISSUE_ID, CREATED_AT)`
];

async function objectExists(connection, objectName) {
  const result = await connection.execute(
    "SELECT COUNT(*) AS COUNT_VALUE FROM USER_OBJECTS WHERE OBJECT_NAME = :name",
    { name: objectName }
  );
  return result.rows[0].COUNT_VALUE > 0;
}

async function columnExists(connection, tableName, columnName) {
  const result = await connection.execute(
    "SELECT COUNT(*) AS COUNT_VALUE FROM USER_TAB_COLUMNS WHERE TABLE_NAME=:tableName AND COLUMN_NAME=:columnName",
    { tableName, columnName }
  );
  return result.rows[0].COUNT_VALUE > 0;
}

async function insertUser(connection, { id, name, account, password, role }) {
  await connection.execute(
    `MERGE INTO OPFB_USERS target USING (SELECT :id ID FROM DUAL) source ON (target.ID = source.ID)
     WHEN NOT MATCHED THEN INSERT (ID, NAME, ACCOUNT, PASSWORD_HASH, ROLE, REGION, STATUS)
     VALUES (:id, :name, :account, :passwordHash, :role, '公司本部', 'active')`,
    { id, name, account, passwordHash: hashPassword(password), role }
  );
}

async function migrate() {
  const adminPassword = process.env.SEED_ADMIN_PASSWORD;
  const aiPassword = process.env.SEED_AI_PASSWORD;
  if (!adminPassword || !aiPassword) throw new Error("首次迁移需要 SEED_ADMIN_PASSWORD 和 SEED_AI_PASSWORD");
  await withConnection(async (connection) => {
    for (const statement of ddl) {
      const match = statement.match(/CREATE (?:TABLE|INDEX|SEQUENCE) ([A-Z0-9_]+)/);
      if (match && await objectExists(connection, match[1])) continue;
      await connection.execute(statement);
      console.log(`已创建 ${match?.[1] || "数据库对象"}`);
    }
    if (!await columnExists(connection, "OPFB_ISSUES", "CLIENT_REQUEST_ID")) {
      await connection.execute("ALTER TABLE OPFB_ISSUES ADD CLIENT_REQUEST_ID VARCHAR2(64)");
      console.log("已增加 OPFB_ISSUES.CLIENT_REQUEST_ID");
    }
    if (!await objectExists(connection, "OPFB_UQ_ISSUE_REQUEST")) {
      await connection.execute(`CREATE UNIQUE INDEX OPFB_UQ_ISSUE_REQUEST ON OPFB_ISSUES(
        CASE WHEN CLIENT_REQUEST_ID IS NOT NULL THEN REPORTER_ID END,
        CASE WHEN CLIENT_REQUEST_ID IS NOT NULL THEN CLIENT_REQUEST_ID END
      )`);
      console.log("已创建 OPFB_UQ_ISSUE_REQUEST");
    }
    for (const [name, account] of admins) {
      const index = admins.findIndex((item) => item[1] === account) + 1;
      await insertUser(connection, { id: `A${String(index).padStart(3, "0")}`, name, account, password: adminPassword, role: "admin" });
    }
    await insertUser(connection, { id: "AI001", name: "AI 开发者", account: "ai.developer", password: aiPassword, role: "ai" });
    await connection.commit();
    console.log("数据库迁移完成，已确保 9 个管理员账号和 1 个 AI 开发者账号存在");
  });
}

migrate().catch((error) => {
  console.error(`迁移失败：${error.message}`);
  process.exitCode = 1;
}).finally(closePool);
