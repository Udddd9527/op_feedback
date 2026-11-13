const oracledb = require("oracledb");

oracledb.outFormat = oracledb.OUT_FORMAT_OBJECT;
oracledb.fetchAsString = [oracledb.CLOB];

let pool;

function config() {
  const required = ["ORACLE_CONNECT_STRING", "ORACLE_USER", "ORACLE_PASSWORD"];
  const missing = required.filter((key) => !process.env[key]);
  if (missing.length) throw new Error(`缺少数据库配置：${missing.join(", ")}`);
  return {
    user: process.env.ORACLE_USER,
    password: process.env.ORACLE_PASSWORD,
    connectString: process.env.ORACLE_CONNECT_STRING,
    poolMin: Number(process.env.ORACLE_POOL_MIN || 1),
    poolMax: Number(process.env.ORACLE_POOL_MAX || 8),
    poolIncrement: 1,
    poolTimeout: 60,
    queueTimeout: Number(process.env.ORACLE_QUEUE_TIMEOUT || 5000),
    poolPingInterval: 30,
    poolPingTimeout: Number(process.env.ORACLE_PING_TIMEOUT || 3000),
    connectTimeout: Number(process.env.ORACLE_CONNECT_TIMEOUT || 5),
    transportConnectTimeout: Number(process.env.ORACLE_TRANSPORT_TIMEOUT || 3)
  };
}

async function initPool() {
  if (!pool) pool = await oracledb.createPool(config());
  return pool;
}

async function resetPool() {
  const stalePool = pool;
  pool = null;
  if (stalePool) {
    // 失效池中可能仍有挂起调用；等待 close() 会让后续请求继续卡住。
    // 先切换到新池，旧池在后台尽力释放即可。
    void stalePool.close(0).catch(() => {});
  }
}

async function getConnection(retry = true) {
  try {
    const connection = await (await initPool()).getConnection();
    connection.callTimeout = Number(process.env.ORACLE_CALL_TIMEOUT || 10000);
    return connection;
  } catch (error) {
    const recoverable = error.isRecoverable || ["NJS-040", "NJS-500", "NJS-501"].includes(error.code);
    if (!retry || !recoverable) throw error;
    await resetPool();
    return getConnection(false);
  }
}

async function withConnection(work) {
  const connection = await getConnection();
  let failed = false;
  try {
    return await work(connection);
  } catch (error) {
    failed = true;
    try { await connection.rollback(); }
    catch { /* 超时或断线后回滚可能失败，关闭时直接丢弃物理连接。 */ }
    throw error;
  } finally {
    try { await connection.close(failed ? { drop: true } : undefined); }
    catch { /* 连接已被远端关闭时无需再次抛出。 */ }
  }
}

async function ping() {
  return withConnection(async (connection) => {
    await connection.execute("SELECT 1 AS OK FROM DUAL");
    return true;
  });
}

async function closePool() {
  if (pool) await pool.close(10);
  pool = null;
}

module.exports = { oracledb, initPool, withConnection, ping, closePool };
