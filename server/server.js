require("dotenv").config();
const path = require("node:path");
const crypto = require("node:crypto");
const express = require("express");
const helmet = require("helmet");
const multer = require("multer");
const { oracledb, withConnection, ping, closePool } = require("./db");
const { hashPassword, verifyPassword, signToken, verifyToken } = require("./auth");

const app = express();
const port = Number(process.env.PORT || 4173);
const authSecret = process.env.AUTH_SECRET;
const regions = ["南部大区", "北部大区", "中部大区", "西南大区", "西北大区", "东部大区", "公司本部", "其他"];
const statuses = ["new", "review", "plan", "doing", "verify", "done", "rejected"];
const priorities = ["P0", "P1", "P2", "P3"];
const aiCapableModules = new Set(["菜单总览 / 任务看板", "项目工作台", "系统表单目录", "自定义表单目录", "APP 字段审批配置", "调研确认表（总入口）", "基础数据导入表", "字段属性表", "列表界面表", "表单开发（钱潮）", "方案配置", "报表编制", "看板开发", "预警设置", "打印配置", "操作手册生成", "验收清单", "发布报告与手册"]);
const aiRiskPattern = /权限|密码|口令|token|密钥|数据库|生产|发布失败|数据丢失|删除|审批|金额|合同|安全|客户敏感/i;
const allowedAttachmentTypes = new Set([
  "image/jpeg", "image/png", "image/gif", "image/webp",
  "application/pdf", "text/plain",
  "application/msword", "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
  "application/vnd.ms-excel", "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
  "application/zip", "application/x-zip-compressed"
]);
const allowedAttachmentExtensions = new Set([".jpg", ".jpeg", ".png", ".gif", ".webp", ".pdf", ".txt", ".doc", ".docx", ".xls", ".xlsx", ".zip"]);
const upload = multer({
  storage: multer.memoryStorage(),
  limits: { files: 5, fileSize: 10 * 1024 * 1024, fields: 20, fieldSize: 64 * 1024 },
  fileFilter: (_req, file, callback) => (allowedAttachmentTypes.has(file.mimetype) || allowedAttachmentExtensions.has(path.extname(file.originalname || "").toLowerCase()))
    ? callback(null, true)
    : callback(Object.assign(new Error("不支持该附件类型，请上传图片、PDF、Office、TXT 或 ZIP 文件。"), { statusCode: 415 }))
});

if (!authSecret || authSecret.length < 32) {
  console.error("AUTH_SECRET 必须配置为至少 32 位随机字符串");
  process.exit(1);
}

app.disable("x-powered-by");
app.use(helmet({ contentSecurityPolicy: false }));
app.use(express.json({ limit: "1mb" }));

function fail(res, status, message) {
  return res.status(status).json({ error: message });
}

function publicUser(row) {
  return {
    id: row.ID, name: row.NAME, account: row.ACCOUNT, role: row.ROLE,
    region: row.REGION, status: row.STATUS, created: row.CREATED
  };
}

async function findUser(connection, id) {
  const result = await connection.execute(
    `SELECT ID, NAME, ACCOUNT, PASSWORD_HASH, ROLE, REGION, STATUS,
            TO_CHAR(CREATED_AT, 'YYYY-MM-DD') CREATED
       FROM OPFB_USERS WHERE ID = :id`, { id }
  );
  return result.rows[0] || null;
}

async function requireAuth(req, res, next) {
  try {
    const token = req.get("authorization")?.replace(/^Bearer\s+/i, "");
    const payload = verifyToken(token, authSecret);
    if (!payload) return fail(res, 401, "登录已过期，请重新登录。");
    const user = await withConnection((connection) => findUser(connection, payload.sub));
    if (!user || user.STATUS !== "active") return fail(res, 401, "账号不可用，请联系管理员。");
    req.user = user;
    next();
  } catch (error) {
    next(error);
  }
}

function allow(...roles) {
  return (req, res, next) => roles.includes(req.user.ROLE) ? next() : fail(res, 403, "当前账号没有此操作权限。");
}

async function loadIssues(connection, user) {
  const where = user.ROLE === "user" ? "WHERE i.REPORTER_ID = :userId" : "";
  const binds = user.ROLE === "user" ? { userId: user.ID } : {};
  const result = await connection.execute(
    `SELECT i.ID, i.TYPE, i.TITLE, i.MODULE_NAME, i.REGION, i.REPORTER_ID,
            reporter.NAME REPORTER, reporter.ACCOUNT CONTACT, i.STATUS, i.PRIORITY,
            NVL(assignee.NAME, '待分配') ASSIGNEE, i.ASSIGNEE_ID,
            TO_CHAR(i.ETA, 'YYYY-MM-DD') ETA, i.DESCRIPTION, i.REPRODUCE, i.IMPACT,
            i.DECISION, i.REJECT_REASON, i.AI_SCORE, i.AI_REASON, i.AI_RESULT,
            TO_CHAR(i.AI_TAKEN_DATE, 'YYYY-MM-DD') AI_TAKEN_DATE,
            TO_CHAR(i.CREATED_AT, 'YYYY-MM-DD HH24:MI') CREATED
       FROM OPFB_ISSUES i
       JOIN OPFB_USERS reporter ON reporter.ID = i.REPORTER_ID
       LEFT JOIN OPFB_USERS assignee ON assignee.ID = i.ASSIGNEE_ID
       ${where}
       ORDER BY i.CREATED_AT DESC`, binds
  );
  const ids = result.rows.map((row) => row.ID);
  const timelineMap = new Map(ids.map((id) => [id, []]));
  const attachmentMap = new Map(ids.map((id) => [id, []]));
  if (ids.length) {
    const timeline = await connection.execute(
      `SELECT ISSUE_ID, ACTOR_NAME, CONTENT, TO_CHAR(CREATED_AT, 'YYYY-MM-DD HH24:MI') CREATED
         FROM OPFB_TIMELINE
        WHERE ISSUE_ID IN (${ids.map((_, index) => `:id${index}`).join(",")})
        ORDER BY CREATED_AT`, Object.fromEntries(ids.map((id, index) => [`id${index}`, id]))
    );
    timeline.rows.forEach((row) => timelineMap.get(row.ISSUE_ID)?.push({ at: row.CREATED, by: row.ACTOR_NAME, text: row.CONTENT }));
    const attachments = await connection.execute(
      `SELECT ID, ISSUE_ID, FILE_NAME, CONTENT_TYPE, FILE_SIZE,
              TO_CHAR(CREATED_AT, 'YYYY-MM-DD HH24:MI') CREATED
         FROM OPFB_ATTACHMENTS
        WHERE ISSUE_ID IN (${ids.map((_, index) => `:attachmentId${index}`).join(",")})
        ORDER BY CREATED_AT`, Object.fromEntries(ids.map((id, index) => [`attachmentId${index}`, id]))
    );
    attachments.rows.forEach((row) => attachmentMap.get(row.ISSUE_ID)?.push({
      id: row.ID, name: row.FILE_NAME, type: row.CONTENT_TYPE, size: row.FILE_SIZE,
      created: row.CREATED, url: `/api/attachments/${encodeURIComponent(row.ID)}`
    }));
  }
  return result.rows.map((row) => ({
    id: row.ID, type: row.TYPE, title: row.TITLE, module: row.MODULE_NAME, region: row.REGION,
    reporterId: row.REPORTER_ID, reporter: row.REPORTER, contact: row.CONTACT,
    status: row.STATUS, priority: row.PRIORITY, assignee: row.ASSIGNEE, assigneeId: row.ASSIGNEE_ID,
    eta: row.ETA || "", desc: row.DESCRIPTION, reproduce: row.REPRODUCE || "", impact: row.IMPACT,
    decision: row.DECISION, rejectReason: row.REJECT_REASON || "", aiScore: row.AI_SCORE,
    aiReason: row.AI_REASON || "", aiResult: row.AI_RESULT || "", aiTakenDate: row.AI_TAKEN_DATE || "",
    created: row.CREATED, timeline: timelineMap.get(row.ID) || [], attachments: attachmentMap.get(row.ID) || []
  }));
}

async function loadAiState(connection) {
  const result = await connection.execute(
    `SELECT TO_CHAR(RUN_DATE, 'YYYY-MM-DD') LAST_SCAN_DATE,
            TO_CHAR(CREATED_AT, 'YYYY-MM-DD HH24:MI') LAST_SCAN_AT,
            SCANNED_COUNT, CLAIMED_COUNT, COMPLETED_COUNT, SKIPPED_COUNT
       FROM OPFB_AI_RUNS ORDER BY CREATED_AT DESC FETCH FIRST 1 ROWS ONLY`
  );
  const row = result.rows[0];
  return row ? { lastScanDate: row.LAST_SCAN_DATE, lastScanAt: row.LAST_SCAN_AT, scanned: row.SCANNED_COUNT, claimed: row.CLAIMED_COUNT, completed: row.COMPLETED_COUNT, skipped: row.SKIPPED_COUNT }
    : { lastScanDate: "", lastScanAt: "", scanned: 0, claimed: 0, completed: 0, skipped: 0 };
}

async function addTimeline(connection, issueId, user, content) {
  await connection.execute(
    `INSERT INTO OPFB_TIMELINE (ID, ISSUE_ID, ACTOR_ID, ACTOR_NAME, CONTENT)
     VALUES (:id, :issueId, :actorId, :actorName, :content)`,
    { id: crypto.randomUUID(), issueId, actorId: user.ID, actorName: user.ROLE === "admin" ? `${user.NAME}（管理员）` : user.NAME, content }
  );
}

app.get("/health/live", (_req, res) => res.json({ status: "ok" }));
app.get("/health/ready", async (_req, res) => {
  try { await ping(); res.json({ status: "ready", database: "connected" }); }
  catch { res.status(503).json({ status: "not_ready", database: "unavailable" }); }
});

app.post("/api/auth/login", async (req, res, next) => {
  try {
    const account = String(req.body.account || "").trim().toLowerCase();
    const password = String(req.body.password || "");
    const result = await withConnection((connection) => connection.execute(
      `SELECT ID, NAME, ACCOUNT, PASSWORD_HASH, ROLE, REGION, STATUS,
              TO_CHAR(CREATED_AT, 'YYYY-MM-DD') CREATED
         FROM OPFB_USERS WHERE LOWER(ACCOUNT) = :account OR NAME = :rawAccount`,
      { account, rawAccount: String(req.body.account || "").trim() }
    ));
    const user = result.rows[0];
    if (!user || !verifyPassword(password, user.PASSWORD_HASH)) return fail(res, 401, "账号或密码不正确，请检查后重试。");
    if (user.STATUS !== "active") return fail(res, 403, "该账号已停用，请联系管理员恢复。");
    res.json({ token: signToken(publicUser(user), authSecret), user: publicUser(user) });
  } catch (error) { next(error); }
});

app.post("/api/auth/register", async (req, res, next) => {
  try {
    const name = String(req.body.name || "").trim();
    const account = String(req.body.account || "").trim().toLowerCase();
    const password = String(req.body.password || "");
    const region = String(req.body.region || "");
    if (!name || !/^[a-z0-9._-]{3,30}$/i.test(account) || password.length < 8 || !regions.includes(region)) return fail(res, 400, "请完整填写信息；账号为 3–30 位，密码至少 8 位。");
    const user = { id: crypto.randomUUID(), name, account, role: "user", region, status: "active" };
    await withConnection(async (connection) => {
      await connection.execute(
        `INSERT INTO OPFB_USERS (ID, NAME, ACCOUNT, PASSWORD_HASH, ROLE, REGION, STATUS)
         VALUES (:id, :name, :account, :passwordHash, 'user', :region, 'active')`,
        { id: user.id, name, account, passwordHash: hashPassword(password), region }
      );
      await connection.commit();
    });
    res.status(201).json({ token: signToken(user, authSecret), user });
  } catch (error) {
    if (error.errorNum === 1) return fail(res, 409, "该账号已存在，请更换账号或返回登录。");
    next(error);
  }
});

app.get("/api/bootstrap", requireAuth, async (req, res, next) => {
  try {
    const payload = await withConnection(async (connection) => {
      const issues = await loadIssues(connection, req.user);
      const users = req.user.ROLE === "user" ? [publicUser(req.user)] : (await connection.execute(
        `SELECT ID, NAME, ACCOUNT, ROLE, REGION, STATUS, TO_CHAR(CREATED_AT, 'YYYY-MM-DD') CREATED
           FROM OPFB_USERS ORDER BY ROLE, CREATED_AT`
      )).rows.map(publicUser);
      return { user: publicUser(req.user), users, issues, aiState: await loadAiState(connection) };
    });
    res.json(payload);
  } catch (error) { next(error); }
});

app.post("/api/issues", requireAuth, allow("user"), upload.array("attachments", 5), async (req, res, next) => {
  try {
    const { type, title, module, desc, reproduce = "", impact } = req.body;
    const requestId = String(req.body.requestId || "").trim();
    if (!["issue", "idea"].includes(type) || !title?.trim() || !module?.trim() || !desc?.trim() || !impact?.trim()) return fail(res, 400, "请完整填写必填信息。");
    if (!/^[a-zA-Z0-9-]{16,64}$/.test(requestId)) return fail(res, 400, "提交请求号无效，请刷新页面后重试。");
    const id = await withConnection(async (connection) => {
      const existing = await connection.execute(
        "SELECT ID FROM OPFB_ISSUES WHERE REPORTER_ID=:reporterId AND CLIENT_REQUEST_ID=:requestId",
        { reporterId: req.user.ID, requestId }
      );
      if (existing.rows[0]) return existing.rows[0].ID;
      const sequence = await connection.execute("SELECT OPFB_ISSUE_SEQ.NEXTVAL VALUE FROM DUAL");
      const ticketId = `OP-${new Date().toISOString().slice(0, 7).replace("-", "")}-${String(sequence.rows[0].VALUE).padStart(6, "0")}`;
      await connection.execute(
        `INSERT INTO OPFB_ISSUES (ID, TYPE, TITLE, MODULE_NAME, REGION, REPORTER_ID, DESCRIPTION, REPRODUCE, IMPACT, CLIENT_REQUEST_ID)
         VALUES (:id, :type, :title, :moduleName, :region, :reporterId, :description, :reproduce, :impact, :requestId)`,
        { id: ticketId, type, title: title.trim(), moduleName: module.trim(), region: req.user.REGION, reporterId: req.user.ID, description: desc.trim(), reproduce: reproduce.trim(), impact: impact.trim(), requestId }
      );
      await addTimeline(connection, ticketId, req.user, "提交了反馈");
      for (const file of req.files || []) {
        const fileName = String(file.originalname || "附件").replace(/[\r\n\0]/g, "").slice(0, 255);
        await connection.execute(
          `INSERT INTO OPFB_ATTACHMENTS (ID, ISSUE_ID, FILE_NAME, CONTENT_TYPE, FILE_SIZE, FILE_DATA, UPLOADED_BY)
           VALUES (:id, :issueId, :fileName, :contentType, :fileSize, :fileData, :uploadedBy)`,
          {
            id: crypto.randomUUID(), issueId: ticketId, fileName, contentType: file.mimetype,
            fileSize: file.size, fileData: { val: file.buffer, type: oracledb.BLOB }, uploadedBy: req.user.ID
          }
        );
      }
      await connection.commit();
      return ticketId;
    });
    res.status(201).json({ id });
  } catch (error) {
    if (error.errorNum === 1 && req.body?.requestId) {
      try {
        const existing = await withConnection((connection) => connection.execute(
          "SELECT ID FROM OPFB_ISSUES WHERE REPORTER_ID=:reporterId AND CLIENT_REQUEST_ID=:requestId",
          { reporterId: req.user.ID, requestId: String(req.body.requestId) }
        ));
        if (existing.rows[0]) return res.json({ id: existing.rows[0].ID, duplicate: true });
      } catch (lookupError) { return next(lookupError); }
    }
    next(error);
  }
});

async function lobToBuffer(lob) {
  const chunks = [];
  for await (const chunk of lob) chunks.push(chunk);
  return Buffer.concat(chunks);
}

app.get("/api/attachments/:id", requireAuth, async (req, res, next) => {
  try {
    const attachment = await withConnection(async (connection) => {
      const result = await connection.execute(
        `SELECT a.FILE_NAME, a.CONTENT_TYPE, a.FILE_SIZE, a.FILE_DATA, i.REPORTER_ID
           FROM OPFB_ATTACHMENTS a JOIN OPFB_ISSUES i ON i.ID = a.ISSUE_ID
          WHERE a.ID = :id`, { id: req.params.id }
      );
      const row = result.rows[0];
      if (!row) throw Object.assign(new Error("附件不存在。"), { statusCode: 404 });
      if (req.user.ROLE === "user" && row.REPORTER_ID !== req.user.ID) throw Object.assign(new Error("无权查看该附件。"), { statusCode: 403 });
      return { name: row.FILE_NAME, type: row.CONTENT_TYPE, size: row.FILE_SIZE, data: await lobToBuffer(row.FILE_DATA) };
    });
    const asciiName = attachment.name.replace(/[^a-zA-Z0-9._-]/g, "_") || "attachment";
    res.set({
      "Content-Type": attachment.type,
      "Content-Length": String(attachment.size),
      "Content-Disposition": `attachment; filename="${asciiName}"; filename*=UTF-8''${encodeURIComponent(attachment.name)}`,
      "X-Content-Type-Options": "nosniff",
      "Cache-Control": "private, no-store"
    });
    res.send(attachment.data);
  } catch (error) { next(error); }
});

app.patch("/api/issues/:id", requireAuth, allow("admin"), async (req, res, next) => {
  try {
    const { status, priority, assigneeId = null, eta = null, rejectReason = "" } = req.body;
    if (!statuses.includes(status) || !priorities.includes(priority)) return fail(res, 400, "状态或优先级无效。");
    await withConnection(async (connection) => {
      const before = await connection.execute("SELECT STATUS FROM OPFB_ISSUES WHERE ID = :id", { id: req.params.id });
      if (!before.rows[0]) throw Object.assign(new Error("反馈不存在。"), { statusCode: 404 });
      await connection.execute(
        `UPDATE OPFB_ISSUES SET STATUS=:status, PRIORITY=:priority, ASSIGNEE_ID=:assigneeId,
                ETA=CASE WHEN :etaValue IS NULL THEN NULL ELSE TO_DATE(:etaValue, 'YYYY-MM-DD') END,
                REJECT_REASON=:rejectReason, DECISION=:decision, UPDATED_AT=SYSTIMESTAMP
          WHERE ID=:id`,
        { status, priority, assigneeId: assigneeId || null, etaValue: eta || null, rejectReason: rejectReason || null, decision: status === "rejected" ? "rejected" : status === "new" ? "pending" : "accepted", id: req.params.id }
      );
      const assignee = assigneeId ? await findUser(connection, assigneeId) : null;
      await addTimeline(connection, req.params.id, req.user, `更新处理安排：${before.rows[0].STATUS} → ${status}，负责人 ${assignee?.NAME || "待分配"}${eta ? `，预计 ${eta} 完成` : ""}`);
      await connection.commit();
    });
    res.json({ ok: true });
  } catch (error) { next(error); }
});

app.post("/api/issues/:id/comments", requireAuth, async (req, res, next) => {
  try {
    const content = String(req.body.content || "").trim();
    if (!content || content.length > 2000) return fail(res, 400, "处理记录需为 1–2000 字。");
    await withConnection(async (connection) => {
      const issue = await connection.execute("SELECT REPORTER_ID FROM OPFB_ISSUES WHERE ID=:id", { id: req.params.id });
      if (!issue.rows[0]) throw Object.assign(new Error("反馈不存在。"), { statusCode: 404 });
      if (req.user.ROLE === "user" && issue.rows[0].REPORTER_ID !== req.user.ID) throw Object.assign(new Error("只能补充自己的反馈。"), { statusCode: 403 });
      await addTimeline(connection, req.params.id, req.user, content);
      await connection.commit();
    });
    res.status(201).json({ ok: true });
  } catch (error) { next(error); }
});

app.post("/api/issues/:id/confirm", requireAuth, allow("user"), async (req, res, next) => {
  try {
    const result = await withConnection(async (connection) => {
      const current = await connection.execute(
        "SELECT STATUS, REPORTER_ID FROM OPFB_ISSUES WHERE ID=:id",
        { id: req.params.id }
      );
      const issue = current.rows[0];
      if (!issue) throw Object.assign(new Error("反馈不存在。"), { statusCode: 404 });
      if (issue.REPORTER_ID !== req.user.ID) throw Object.assign(new Error("只能确认自己提交的反馈。"), { statusCode: 403 });
      if (issue.STATUS === "done") return { alreadyClosed: true };
      if (issue.STATUS !== "verify") throw Object.assign(new Error("该反馈当前不是待验证状态，请刷新后查看最新进度。"), { statusCode: 409 });
      await connection.execute(
        "UPDATE OPFB_ISSUES SET STATUS='done', UPDATED_AT=SYSTIMESTAMP WHERE ID=:id",
        { id: req.params.id }
      );
      await addTimeline(connection, req.params.id, req.user, "已验证处理结果，确认问题解决");
      await connection.commit();
      return { alreadyClosed: false };
    });
    res.json({ ok: true, alreadyClosed: result.alreadyClosed });
  } catch (error) { next(error); }
});

app.post("/api/admin/users", requireAuth, allow("admin"), async (req, res, next) => {
  try {
    const { name, account, password, region } = req.body;
    if (!name?.trim() || !/^[a-z0-9._-]{3,30}$/i.test(account || "") || String(password || "").length < 8 || !regions.includes(region)) return fail(res, 400, "请填写有效账号，密码至少 8 位。");
    await withConnection(async (connection) => {
      await connection.execute(
        `INSERT INTO OPFB_USERS (ID, NAME, ACCOUNT, PASSWORD_HASH, ROLE, REGION, STATUS)
         VALUES (:id, :name, :account, :passwordHash, 'admin', :region, 'active')`,
        { id: crypto.randomUUID(), name: name.trim(), account: account.toLowerCase(), passwordHash: hashPassword(password), region }
      );
      await connection.commit();
    });
    res.status(201).json({ ok: true });
  } catch (error) {
    if (error.errorNum === 1) return fail(res, 409, "该登录账号已存在。");
    next(error);
  }
});

app.patch("/api/admin/users/:id/status", requireAuth, allow("admin"), async (req, res, next) => {
  try {
    if (req.params.id === req.user.ID) return fail(res, 409, "不能停用当前登录账号。");
    const status = req.body.status;
    if (!["active", "disabled"].includes(status)) return fail(res, 400, "账号状态无效。");
    await withConnection(async (connection) => {
      await connection.execute("UPDATE OPFB_USERS SET STATUS=:status, UPDATED_AT=SYSTIMESTAMP WHERE ID=:id", { status, id: req.params.id });
      await connection.commit();
    });
    res.json({ ok: true });
  } catch (error) { next(error); }
});

function assessForAi(row) {
  if (row.TYPE !== "issue" || !aiCapableModules.has(row.MODULE_NAME)) return { canHandle: false, score: 0, reason: "类型或模块不在自动处理范围" };
  const text = `${row.TITLE} ${row.DESCRIPTION || ""} ${row.IMPACT || ""}`;
  if (aiRiskPattern.test(text)) return { canHandle: false, score: 20, reason: "涉及高风险数据、权限或生产操作" };
  let score = 72;
  if (/错位|样式|显示|格式|文案|响应式|滚动|导出/i.test(text)) score += 16;
  if (row.PRIORITY === "P0") score -= 30;
  if (/不阻断|可复现|缩放|分辨率/i.test(text)) score += 6;
  score = Math.max(0, Math.min(98, score));
  return { canHandle: score >= 75, score, reason: score >= 75 ? "规则明确、风险较低且复现信息完整" : "信息不足或影响较高，转人工评估" };
}

async function aiScanHandler(req, res, next) {
  try {
    const summary = await withConnection(async (connection) => {
      const aiUserResult = await connection.execute("SELECT * FROM OPFB_USERS WHERE ROLE='ai' AND STATUS='active' FETCH FIRST 1 ROWS ONLY");
      const aiUser = aiUserResult.rows[0];
      if (!aiUser) throw new Error("未找到可用的 AI 开发者账号");
      const pending = await connection.execute(
        `SELECT ID, TYPE, TITLE, MODULE_NAME, DESCRIPTION, IMPACT, PRIORITY
           FROM OPFB_ISSUES WHERE STATUS IN ('new','review') AND ASSIGNEE_ID IS NULL
           ORDER BY CREATED_AT`
      );
      const candidates = pending.rows.map((row) => ({ row, assessment: assessForAi(row) })).filter((item) => item.assessment.canHandle).sort((a, b) => b.assessment.score - a.assessment.score).slice(0, 3);
      for (const { row, assessment } of candidates) {
        await connection.execute(
          `UPDATE OPFB_ISSUES SET ASSIGNEE_ID=:aiId, STATUS='doing', ETA=TRUNC(SYSDATE)+1,
                  DECISION='accepted', AI_TAKEN_DATE=TRUNC(SYSDATE), AI_SCORE=:score, AI_REASON=:reason,
                  UPDATED_AT=SYSTIMESTAMP WHERE ID=:id`,
          { aiId: aiUser.ID, score: assessment.score, reason: assessment.reason, id: row.ID }
        );
        await addTimeline(connection, row.ID, aiUser, `每日巡检判定可自动处理（置信度 ${assessment.score}%）：${assessment.reason}。已认领任务，开始复现与修复。`);
      }
      const result = { scanned: pending.rows.length, claimed: candidates.length, completed: 0, skipped: pending.rows.length - candidates.length };
      await connection.execute(
        `INSERT INTO OPFB_AI_RUNS (ID, RUN_DATE, SCANNED_COUNT, CLAIMED_COUNT, COMPLETED_COUNT, SKIPPED_COUNT)
         VALUES (:id, TRUNC(SYSDATE), :scanned, :claimed, :completed, :skipped)`,
        { id: crypto.randomUUID(), ...result }
      );
      await connection.commit();
      return result;
    });
    res.json(summary);
  } catch (error) { next(error); }
}

app.post("/api/ai/scan", requireAuth, allow("ai", "admin"), aiScanHandler);
app.post("/api/internal/ai-scan", (req, res, next) => {
  const expected = process.env.AI_CRON_SECRET;
  const provided = req.get("x-ai-cron-secret") || "";
  if (!expected || expected.length < 24) return fail(res, 503, "AI 定时任务密钥未配置。");
  const left = Buffer.from(provided);
  const right = Buffer.from(expected);
  if (left.length !== right.length || !crypto.timingSafeEqual(left, right)) return fail(res, 401, "定时任务认证失败。");
  req.user = { ROLE: "ai" };
  return aiScanHandler(req, res, next);
});

app.post("/api/ai/issues/:id/complete", requireAuth, allow("ai"), async (req, res, next) => {
  try {
    await withConnection(async (connection) => {
      const resultText = String(req.body?.result || "").trim() || "已完成低风险缺陷修复并通过界面回归检查，请提交人验证实际使用效果。";
      const result = await connection.execute(
        `UPDATE OPFB_ISSUES SET STATUS='verify', ETA=TRUNC(SYSDATE), AI_RESULT=:resultText, UPDATED_AT=SYSTIMESTAMP
          WHERE ID=:id AND ASSIGNEE_ID=:userId AND STATUS='doing'`,
        { resultText, id: req.params.id, userId: req.user.ID }
      );
      if (!result.rowsAffected) throw Object.assign(new Error("该任务当前不能提交结果。"), { statusCode: 409 });
      await addTimeline(connection, req.params.id, req.user, resultText);
      await connection.commit();
    });
    res.json({ ok: true });
  } catch (error) { next(error); }
});

app.use("/api", requireAuth, (_req, res) => fail(res, 404, "接口不存在。"));
app.get(["/", "/index.html"], (_req, res) => res.sendFile(path.join(__dirname, "..", "index.html")));
app.get("/app.js", (_req, res) => res.sendFile(path.join(__dirname, "..", "app.js")));
app.get("/styles.css", (_req, res) => res.sendFile(path.join(__dirname, "..", "styles.css")));
app.use("/assets", express.static(path.join(__dirname, "..", "assets"), { fallthrough: false }));
app.get("*", (_req, res) => res.sendFile(path.join(__dirname, "..", "index.html")));

app.use((error, _req, res, _next) => {
  console.error(error);
  if (res.headersSent) return;
  if (error instanceof multer.MulterError) {
    const message = error.code === "LIMIT_FILE_SIZE" ? "单个附件不能超过 10 MB。" : error.code === "LIMIT_FILE_COUNT" ? "最多上传 5 个附件。" : "附件上传失败，请检查文件后重试。";
    return res.status(400).json({ error: message });
  }
  res.status(error.statusCode || 500).json({ error: error.statusCode ? error.message : "服务暂时不可用，请稍后重试。" });
});

const server = app.listen(port, "0.0.0.0", () => console.log(`OP 工具反馈中心已启动：http://localhost:${port}`));

async function shutdown() {
  server.close(async () => {
    await closePool();
    process.exit(0);
  });
}
process.on("SIGTERM", shutdown);
process.on("SIGINT", shutdown);
