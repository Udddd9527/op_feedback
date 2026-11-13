const SESSION_KEY = "op-feedback-session-v1";
const REGIONS = ["南部大区", "北部大区", "中部大区", "西南大区", "西北大区", "东部大区", "公司本部", "其他"];
const OP_MODULE_GROUPS = [
  ["总览与项目", ["菜单总览 / 任务看板", "项目工作台"]],
  ["基础底座", ["连接配置", "系统表单目录", "自定义表单目录", "APP 字段审批配置", "编码与字典规范", "行业/单据模板库"]],
  ["调研确认", ["调研确认表（总入口）", "基础数据导入表", "角色权限表", "字段属性表", "附件必填表", "标题规则表", "列表界面表", "工作流调研表", "打印模板调研表", "APP 界面调研表", "IMP 方案调研表"]],
  ["表单与方案开发", ["表单开发（钱潮）", "方案配置", "拉式方案", "推式生成单据（拆分）", "推式生成单据（不拆分）", "推式生成任务"]],
  ["报表 / 看板 / 预警", ["报表编制", "看板开发", "预警设置", "打印配置"]],
  ["二开与文档", ["二开脚手架", "操作手册生成", "验收清单"]],
  ["配置包与发布", ["配置包预览", "试跑 / 发布", "发布报告与手册", "适配器清单", "审计与环境隔离"]],
  ["其他", ["其他"]]
];
const AI_CAPABLE_MODULES = ["菜单总览 / 任务看板", "项目工作台", "系统表单目录", "自定义表单目录", "APP 字段审批配置", "调研确认表（总入口）", "基础数据导入表", "字段属性表", "列表界面表", "表单开发（钱潮）", "方案配置", "报表编制", "看板开发", "预警设置", "打印配置", "操作手册生成", "验收清单", "发布报告与手册"];
const AI_RISK_PATTERN = /权限|密码|口令|token|密钥|数据库|生产|发布失败|数据丢失|删除|审批|金额|合同|安全|客户敏感/i;

const icons = {
  home: '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="m3 11 9-8 9 8v9a1 1 0 0 1-1 1h-5v-7H9v7H4a1 1 0 0 1-1-1z"/></svg>',
  plus: '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M12 5v14M5 12h14"/></svg>',
  list: '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M8 6h13M8 12h13M8 18h13M3 6h.01M3 12h.01M3 18h.01"/></svg>',
  help: '<svg viewBox="0 0 24 24" aria-hidden="true"><circle cx="12" cy="12" r="9"/><path d="M9.7 9a2.5 2.5 0 1 1 3.4 2.3c-.7.3-1.1.8-1.1 1.7M12 17h.01"/></svg>',
  board: '<svg viewBox="0 0 24 24" aria-hidden="true"><rect x="3" y="3" width="7" height="7" rx="1"/><rect x="14" y="3" width="7" height="7" rx="1"/><rect x="3" y="14" width="7" height="7" rx="1"/><rect x="14" y="14" width="7" height="7" rx="1"/></svg>',
  calendar: '<svg viewBox="0 0 24 24" aria-hidden="true"><rect x="3" y="5" width="18" height="16" rx="2"/><path d="M16 3v4M8 3v4M3 10h18"/></svg>',
  users: '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2M9 11a4 4 0 1 0 0-8 4 4 0 0 0 0 8M22 21v-2a4 4 0 0 0-3-3.87M16 3.13a4 4 0 0 1 0 7.75"/></svg>',
  shield: '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M12 3 4 6v5c0 5 3.4 8.4 8 10 4.6-1.6 8-5 8-10V6z"/><path d="m9 12 2 2 4-4"/></svg>',
  logout: '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M10 17l5-5-5-5M15 12H3M15 4h4a2 2 0 0 1 2 2v12a2 2 0 0 1-2 2h-4"/></svg>',
  search: '<svg viewBox="0 0 24 24" aria-hidden="true"><circle cx="11" cy="11" r="8"/><path d="m21 21-4.35-4.35"/></svg>',
  clock: '<svg viewBox="0 0 24 24" aria-hidden="true"><circle cx="12" cy="12" r="9"/><path d="M12 7v5l3 2"/></svg>',
  alert: '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M10.3 3.7 2.4 18a2 2 0 0 0 1.7 3h15.8a2 2 0 0 0 1.7-3L13.7 3.7a2 2 0 0 0-3.4 0zM12 9v4M12 17h.01"/></svg>',
  check: '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="m5 12 4 4L19 6"/></svg>',
  menu: '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M4 6h16M4 12h16M4 18h16"/></svg>',
  close: '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="m6 6 12 12M18 6 6 18"/></svg>',
  download: '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M12 3v12m0 0 5-5m-5 5-5-5M5 21h14"/></svg>',
  info: '<svg viewBox="0 0 24 24" aria-hidden="true"><circle cx="12" cy="12" r="9"/><path d="M12 11v5M12 8h.01"/></svg>'
};

const statusMap = {
  new: ["待受理", "new"], review: ["评估中", "review"], plan: ["已排期", "plan"],
  doing: ["处理中", "doing"], verify: ["待验证", "verify"], done: ["已完成", "done"], rejected: ["暂不处理", "rejected"]
};
const priorityMap = { P0: "紧急", P1: "高", P2: "中", P3: "低" };

let state = load();
let filters = { status: "all", type: "all", region: "all", q: "" };
let authMode = "login";
let homeSearch = "";
let feedbackSubmitting = false;

function load() {
  try {
    const session = JSON.parse(sessionStorage.getItem(SESSION_KEY) || "null");
    return { role:null, route:"login", selectedId:null, session, users:[], issues:[], aiState:{ lastScanDate:"", lastScanAt:"", scanned:0, claimed:0, completed:0, skipped:0 } };
  } catch { return { role:null, route:"login", selectedId:null, session:null, users:[], issues:[], aiState:{} }; }
}
function save() { sessionStorage.setItem(SESSION_KEY, JSON.stringify(state.session)); }
async function api(path, options={}) {
  const {timeoutMs=30000,...requestOptions}=options;
  const isForm=requestOptions.body instanceof FormData;
  const headers={...(isForm?{}:{"Content-Type":"application/json"}), ...(requestOptions.headers||{})};
  if(state.session?.token) headers.Authorization=`Bearer ${state.session.token}`;
  const controller=new AbortController();const timer=setTimeout(()=>controller.abort(),timeoutMs);
  try{
    const response=await fetch(path,{...requestOptions,headers,signal:controller.signal});
    const data=await response.json().catch(()=>({}));
    if(response.status===401){state.session=null;save();throw new Error(data.error||"登录已过期，请重新登录。");}
    if(!response.ok) throw new Error(data.error||"请求失败，请稍后重试。");
    return data;
  }catch(error){if(error.name==='AbortError')throw new Error("请求超时，请检查数据库连接后重试。");throw error;}
  finally{clearTimeout(timer);}
}
async function refreshData() {
  const data=await api("/api/bootstrap");
  state.users=data.users; state.issues=data.issues; state.aiState=data.aiState; state.role=data.user.role;
  state.session.userId=data.user.id;
}
function esc(value="") { return String(value).replace(/[&<>'"]/g, c => ({"&":"&amp;","<":"&lt;",">":"&gt;","'":"&#39;",'"':"&quot;"}[c])); }
function formatDate(value) {
  if (!value) return "—";
  const d = new Date(value.replace(" ", "T") + (value.length === 10 ? "T00:00:00" : ""));
  return new Intl.DateTimeFormat("zh-CN", { month:"2-digit", day:"2-digit", ...(value.length > 10 ? {hour:"2-digit", minute:"2-digit"} : {}) }).format(d);
}
function formatFileSize(bytes=0){
  if(bytes<1024)return `${bytes} B`;
  if(bytes<1024*1024)return `${(bytes/1024).toFixed(1)} KB`;
  return `${(bytes/1024/1024).toFixed(1)} MB`;
}
function statusBadge(s) { const [label, cls] = statusMap[s] || statusMap.new; return `<span class="status ${cls}">${label}</span>`; }
function typeBadge(t) { return `<span class="tag ${t}">${t === "issue" ? "问题" : "建议"}</span>`; }
function issueById(id) { return state.issues.find(x => x.id === id); }
function currentUser() { return state.users.find(x => x.id === state.session?.userId) || null; }
function mine() { const user=currentUser(); return state.issues.filter(x => x.reporter === user?.name); }
function showToast(message) { const el=document.querySelector("#toast"); el.textContent=message; el.classList.add("show"); clearTimeout(showToast.t); showToast.t=setTimeout(()=>el.classList.remove("show"),2600); }

function dateKey(offset=0) {
  const d=new Date(); d.setDate(d.getDate()+offset);
  return new Intl.DateTimeFormat("sv-SE",{timeZone:"Asia/Shanghai",year:"numeric",month:"2-digit",day:"2-digit"}).format(d);
}
function aiAssessment(issue) {
  const text=`${issue.title} ${issue.desc} ${issue.impact}`;
  if(issue.type!=="issue") return {canHandle:false,score:0,reason:"建议类反馈需要产品决策"};
  if(!AI_CAPABLE_MODULES.includes(issue.module)) return {canHandle:false,score:35,reason:"模块暂未纳入 AI 自动处理白名单"};
  if(AI_RISK_PATTERN.test(text)) return {canHandle:false,score:20,reason:"涉及高风险数据、权限或生产操作，转人工处理"};
  let score=72;
  if(/错位|样式|显示|格式|文案|响应式|滚动|导出/i.test(text)) score+=16;
  if(issue.priority==='P0') score-=30;
  if(/不阻断|可复现|缩放|分辨率/i.test(text)) score+=6;
  score=Math.max(0,Math.min(98,score));
  return {canHandle:score>=75,score,reason:score>=75?"规则明确、风险较低且复现信息完整":"信息不足或影响较高，建议人工评估"};
}
async function runAiScan() {
  try{const result=await api("/api/ai/scan",{method:"POST"});await refreshData();render();showToast(`巡检完成：扫描 ${result.scanned} 条，认领 ${result.claimed} 条。`);}catch(error){showToast(error.message);}
}

function navItems() {
  if(state.role === "user") return [
    ["home","home","工作台"],["new","plus","提交反馈"],["mine","list","我的反馈"],["help","help","使用帮助"]
  ];
  if(state.role === "ai") return [
    ["ai","board","AI 任务中心"],["aiTasks","list","我的处理任务"],["aiLog","clock","巡检记录"]
  ];
  return [
    ["admin","board","处理总览"],["issues","list","反馈管理"],["schedule","calendar","排期视图"],["members","users","人员负荷"],["accounts","shield","账号管理"]
  ];
}

function loginPage(mode="login") {
  const register = mode === "register";
  return `<main class="auth-page">
    <section class="auth-brand"><div class="auth-brand-inner"><img class="brand-logo large" src="assets/op-logo.svg" alt="OP 业主方实施加速工具"><p class="auth-eyebrow">业主方事业部</p><h1>实施加速工具反馈中心</h1><p>让每一个问题有记录、每一项建议有回应、每一个处理结果可追踪。</p><div class="auth-flow"><span>提交反馈</span><i></i><span>评估排期</span><i></i><span>处理验证</span><i></i><span>完成闭环</span></div></div></section>
    <section class="auth-panel"><div class="auth-card"><div class="auth-logo-mobile"><img class="brand-logo" src="assets/op-logo.svg" alt="OP"><strong>工具反馈中心</strong></div><h2>${register?"注册用户账号":"登录反馈中心"}</h2><p>${register?"注册后即可提交问题并跟踪处理进度。":"使用你的账号进入对应工作台。"}</p>
      <form id="${register?'registerForm':'loginForm'}" class="auth-form" novalidate>
        ${register?`<div class="auth-grid"><div class="field"><label for="regName">姓名</label><input id="regName" name="name" autocomplete="name" placeholder="请输入真实姓名…"></div><div class="field"><label for="regRegion">所属大区</label><select id="regRegion" name="region">${REGIONS.map(r=>`<option>${r}</option>`).join("")}</select></div></div>`:""}
        <div class="field"><label for="authAccount">账号</label><input id="authAccount" name="account" autocomplete="username" placeholder="请输入账号…"></div>
        <div class="field"><label for="authPassword">密码</label><input id="authPassword" name="password" type="password" autocomplete="${register?'new-password':'current-password'}" placeholder="请输入密码…"></div>
        ${register?`<div class="field"><label for="regConfirm">确认密码</label><input id="regConfirm" name="confirm" type="password" autocomplete="new-password" placeholder="请再次输入密码…"></div>`:""}
        <div id="authError" class="auth-error" role="alert"></div><button class="btn primary auth-submit" type="submit">${register?"注册并登录":"登录"}</button>
      </form>
      <div class="auth-switch">${register?'已有账号？':'还没有账号？'} <button id="authModeBtn">${register?'返回登录':'注册用户账号'}</button></div>
    </div></section>
  </main>`;
}

function shell(content) {
  const user = currentUser();
  const roleLabel = state.role === "user" ? "大区用户" : state.role === "ai" ? "AI 开发者" : "平台管理员";
  return `<div class="app-shell" id="shell">
    <aside class="sidebar" aria-label="主导航">
      <div class="brand"><img class="brand-logo" src="assets/op-logo.svg" alt="OP"><div><div class="brand-title">工具反馈中心</div><div class="brand-sub">问题与建议闭环平台</div></div></div>
      <div class="nav-label">${state.role === "user" ? "反馈服务" : state.role === "ai" ? "自动开发工作台" : "管理工作台"}</div>
      <nav class="nav">${navItems().map(([route,icon,label])=>`<button class="${state.route===route?'active':''}" data-route="${route}">${icons[icon]}<span>${label}</span></button>`).join("")}</nav>
      <div class="sidebar-foot">数据来源：Oracle 共享库<br>数据更新：${new Intl.DateTimeFormat("zh-CN",{hour:"2-digit",minute:"2-digit"}).format(new Date())}</div>
    </aside>
    <section class="workspace">
      <header class="topbar">
        <div class="topbar-left"><button class="icon-btn mobile-menu" id="menuBtn" aria-label="打开导航">${icons.menu}</button><span class="crumb">OP 实施加速工具 / ${roleLabel}</span></div>
        <div class="topbar-right"><div class="profile"><div class="avatar">${esc(user?.name?.slice(0,1)||'用')}</div><div class="profile-meta"><strong>${esc(user?.name||'用户')}</strong><small>${esc(user?.region||'')}</small></div></div><button class="icon-btn" id="logoutBtn" aria-label="退出登录" title="退出登录">${icons.logout}</button></div>
      </header>
      <main id="main" class="content">${content}</main>
    </section>
  </div><div class="drawer-backdrop" id="drawerRoot" aria-hidden="true"></div>`;
}

function pageHead(title, desc, actions="") { return `<div class="page-head"><div><h1>${title}</h1><p>${desc}</p></div>${actions?`<div class="page-actions">${actions}</div>`:""}</div>`; }
function kpi(label, value, foot, icon, cls="") { return `<div class="kpi ${cls}"><div class="kpi-top"><span>${label}</span><span class="kpi-icon">${icons[icon]}</span></div><div class="kpi-value">${value}</div><div class="kpi-foot">${foot}</div></div>`; }

function userHome() {
  const items=mine(), active=items.filter(x=>!["done","rejected"].includes(x.status));
  const done=items.filter(x=>x.status==='done').length;
  const completion=items.length?`${Math.round(done/items.length*100)}%`:'—';
  const keyword=homeSearch.trim().toLowerCase();
  const results=keyword?items.filter(x=>`${x.id} ${x.title} ${x.module} ${x.desc} ${x.impact} ${statusMap[x.status]?.[0]||''}`.toLowerCase().includes(keyword)):active.slice(0,5);
  return pageHead("我的反馈工作台","跟踪你提交的问题与建议，所有处理进展都会在这里同步。",`<button class="btn primary" data-route="new">${icons.plus}提交新反馈</button>`) +
    `<div class="notice">${icons.info}<div><strong>统一反馈，进度不丢失。</strong> 请尽量提供复现步骤和影响范围，紧急阻断问题请在影响说明中明确项目数量与业务节点。</div></div>
    <section class="kpi-grid" aria-label="我的反馈统计">
      ${kpi("累计提交",items.length,"全部问题与建议","list")}${kpi("处理中",active.length,"含评估、排期与验证","clock","info")}${kpi("已完成",done,`累计完成率 ${completion}`,"check","success")}${kpi("待我验证",items.filter(x=>x.status==='verify').length,"请及时确认处理效果","alert","warn")}
    </section>
    <section class="panel"><div class="panel-head"><div><h2>${keyword?'搜索结果':'需要你关注的反馈'}</h2><p>${keyword?`找到 ${results.length} 条与“${esc(homeSearch)}”相关的反馈`:'按最新进展排序 · 数据刚刚同步'}</p></div><button class="btn small" data-route="mine">查看全部</button></div><form class="home-search" id="homeSearchForm" role="search"><label class="sr-only" for="homeSearchInput">查询我的反馈</label><input class="search" id="homeSearchInput" name="q" value="${esc(homeSearch)}" placeholder="输入编号、标题、模块或问题描述…" autocomplete="off"><button class="btn" type="submit">${icons.search}查询</button>${keyword?'<button class="btn ghost" id="clearHomeSearch" type="button">清除</button>':''}</form>${issueTable(results, false)}</section>`;
}

function adminHome() {
  const open=state.issues.filter(x=>!["done","rejected"].includes(x.status));
  const unassigned=open.filter(x=>x.assignee==='待分配');
  const urgent=open.filter(x=>["P0","P1"].includes(x.priority));
  const inTwoDays=dateKey(2), due=open.filter(x=>x.eta && x.eta <= inTwoDays);
  const accepted=state.issues.filter(x=>x.status==='done'||x.status==='verify');
  const completionRate=accepted.length?`${Math.round(accepted.filter(x=>x.status==='done').length/accepted.length*100)}%`:'—';
  const regions={}; state.issues.forEach(x=>regions[x.region]=(regions[x.region]||0)+1);
  const queue=[...open].sort((a,b)=>a.priority.localeCompare(b.priority)||a.created.localeCompare(b.created)).slice(0,5);
  const narrative=open.length?`当前判断：${urgent.length} 个高优先级反馈未闭环，${unassigned.length} 个反馈尚未分配负责人。`:'当前没有未闭环反馈，处理队列处于清空状态。';
  return pageHead("处理总览",narrative,`<button class="btn" id="exportBtn">${icons.download}导出反馈</button><button class="btn primary" data-route="issues">进入处理队列</button>`) +
    `<section class="kpi-grid" aria-label="处理工作统计">${kpi("待受理",state.issues.filter(x=>x.status==='new'||x.status==='review').length,"等待评估或确认范围","alert","warn")}${kpi("处理中",state.issues.filter(x=>x.status==='doing').length,"当前研发执行中","clock","info")}${kpi("高优先级",urgent.length,"P0 / P1 尚未闭环","alert")}${kpi("闭环确认率",completionRate,"已完成 ÷ 已提交验证","check","success")}</section>
    <div class="dashboard-grid"><section class="panel"><div class="panel-head"><div><h2>优先处理：影响业务或临近承诺时间</h2><p>共 ${open.length} 个未闭环反馈 · 更新于刚刚</p></div><button class="btn small" data-route="issues">全部队列</button></div><div class="queue">${queue.length?queue.map(queueItem).join(""):`<div class="empty"><div><strong>处理队列已清空</strong><p>新反馈提交后会显示在这里。</p></div></div>`}</div></section>
    <aside class="panel"><div class="panel-head"><div><h2>反馈主要来自哪些大区</h2><p>累计 ${state.issues.length} 条 · 数据完整度 100%</p></div></div><div class="panel-body">${state.issues.length?`<div class="region-list">${Object.entries(regions).sort((a,b)=>b[1]-a[1]).map(([r,n])=>`<div class="region-row"><div class="region-line"><span>${r}</span><strong>${n} 条</strong></div><div class="progress"><span style="width:${n/state.issues.length*100}%"></span></div></div>`).join("")}</div>`:`<div class="empty"><div><strong>尚无区域反馈</strong><p>数据会在用户提交反馈后自动汇总。</p></div></div>`}<div class="insight"><strong>处理建议：</strong>${unassigned.length?`${unassigned.length} 条尚未分配负责人，建议优先完成需求评估。`:`当前反馈均已明确责任人。`} ${due.length} 条承诺时间在 48 小时内。</div></div></aside></div>`;
}

function queueItem(x) {
  const overdue=x.eta && x.eta < dateKey() && !["done","rejected"].includes(x.status);
  return `<article class="queue-item" data-open="${x.id}" tabindex="0"><div class="priority-box ${x.priority.toLowerCase()}">${x.priority}</div><div><div class="queue-title">${esc(x.title)}</div><div class="queue-meta"><span>${x.id}</span><span>${x.region}</span><span>${x.assignee}</span>${statusBadge(x.status)}</div></div><div class="due ${overdue?'overdue':''}"><strong>${x.eta?formatDate(x.eta):'待排期'}</strong>${overdue?'已逾期':'预计完成'}</div></article>`;
}

function issueTable(items, admin=true) {
  if (!items.length) return `<div class="empty">${icons.search}<div><strong>没有符合条件的反馈</strong><p>可重置筛选条件后查看全部记录。</p></div></div>`;
  return `<div class="table-wrap"><table><thead><tr><th>编号</th><th>反馈内容</th><th>类型</th><th>状态</th>${admin?'<th>优先级</th><th>负责人</th>':''}<th>预计完成</th></tr></thead><tbody>${items.map(x=>`<tr data-open="${x.id}"><td class="ticket-id">${x.id}</td><td class="title-cell"><strong>${esc(x.title)}</strong><small>${x.region} · ${x.module} · ${formatDate(x.created)}</small></td><td>${typeBadge(x.type)}</td><td>${statusBadge(x.status)}</td>${admin?`<td>${x.priority} · ${priorityMap[x.priority]}</td><td>${x.assignee}</td>`:''}<td>${x.eta?formatDate(x.eta):'待排期'}</td></tr>`).join("")}</tbody></table></div>`;
}

function feedbackList(admin) {
  let items = admin ? state.issues : mine();
  items=items.filter(x=>(filters.status==='all'||x.status===filters.status)&&(filters.type==='all'||x.type===filters.type)&&(filters.region==='all'||x.region===filters.region)&&(!filters.q||`${x.id}${x.title}${x.module}${x.reporter}`.toLowerCase().includes(filters.q.toLowerCase())));
  const title=admin?"反馈管理":"我的反馈";
  const desc=admin?"统一受理、评估、分配并跟踪所有大区反馈。":"实时查看每一条反馈的处理状态和完整记录。";
  return pageHead(title,desc, admin?`<button class="btn" id="resetFilters">重置筛选</button>`:`<button class="btn primary" data-route="new">${icons.plus}提交新反馈</button>`) + `<section class="panel"><div class="toolbar"><div class="filters"><input class="search" id="searchInput" aria-label="搜索反馈" placeholder="搜索编号、标题、模块…" value="${esc(filters.q)}"><select class="field-inline" id="statusFilter" aria-label="按状态筛选"><option value="all">全部状态</option>${Object.entries(statusMap).map(([k,v])=>`<option value="${k}" ${filters.status===k?'selected':''}>${v[0]}</option>`).join("")}</select><select class="field-inline" id="typeFilter" aria-label="按类型筛选"><option value="all">全部类型</option><option value="issue" ${filters.type==='issue'?'selected':''}>问题</option><option value="idea" ${filters.type==='idea'?'selected':''}>建议</option></select>${admin?`<select class="field-inline" id="regionFilter" aria-label="按大区筛选"><option value="all">全部大区</option>${REGIONS.map(r=>`<option ${filters.region===r?'selected':''}>${r}</option>`).join("")}</select>`:''}</div><span>共 ${items.length} 条</span></div>${issueTable(items,admin)}</section>`;
}

function newFeedback() {
  const user=currentUser();
  const requestId=crypto.randomUUID?.()||`${Date.now()}-${Math.random().toString(16).slice(2)}`;
  return pageHead("提交反馈","请描述你在使用 OP 实施加速工具时遇到的问题，或希望新增的能力。") + `<div class="form-layout"><form class="panel" id="feedbackForm" novalidate><input type="hidden" name="requestId" value="${requestId}">
    <section class="form-section"><h2>反馈类型</h2><div class="type-options"><label class="type-card"><input type="radio" name="type" value="issue" checked><span><strong>使用问题</strong><small>功能异常、报错、数据不正确或影响使用</small></span></label><label class="type-card"><input type="radio" name="type" value="idea"><span><strong>建议意见</strong><small>新增能力、流程优化或体验改进</small></span></label></div></section>
    <section class="form-section"><h2>基本信息</h2><div class="form-grid"><div class="field full"><label for="title">标题 <span class="required">*</span></label><input id="title" name="title" autocomplete="off" maxlength="60" placeholder="一句话概括问题，例如：批量导入后负责人未回填…"><small>建议包含功能位置和异常表现，最多 60 字。</small></div><div class="field"><label for="module">涉及模块 <span class="required">*</span></label><select id="module" name="module"><option value="">请选择 OP 工具功能</option>${OP_MODULE_GROUPS.map(([group,items])=>`<optgroup label="${group}">${items.map(m=>`<option>${m}</option>`).join("")}</optgroup>`).join("")}</select></div><div class="field"><label for="region">所属大区</label><input id="region" name="region" value="${esc(user?.region||'其他')}" readonly aria-describedby="regionHelp"><small id="regionHelp">由登录账号自动带出，不可修改。</small></div><div class="field full"><label for="desc">问题或建议说明 <span class="required">*</span></label><textarea id="desc" name="desc" placeholder="说明发生了什么、你期望达到什么效果…"></textarea></div><div class="field full"><label for="reproduce">复现步骤</label><textarea id="reproduce" name="reproduce" placeholder="例如：1. 进入系统表单目录；2. 选择表单；3. 点击扫描…"></textarea><small>建议类反馈可不填写。</small></div><div class="field full"><label for="impact">影响范围 <span class="required">*</span></label><textarea id="impact" name="impact" placeholder="说明受影响的项目、人员数量，以及是否阻断当前工作…"></textarea></div><div class="field full"><label for="attachments">附件或问题截图</label><div class="upload-box"><input id="attachments" name="attachments" type="file" multiple accept="image/png,image/jpeg,image/gif,image/webp,.pdf,.txt,.doc,.docx,.xls,.xlsx,.zip" aria-describedby="attachmentHelp attachmentList"><div><strong>选择图片或附件</strong><small id="attachmentHelp">最多 5 个文件，单个不超过 10 MB；支持常用图片、PDF、Office、TXT 和 ZIP。</small></div></div><div id="attachmentList" class="attachment-selection" aria-live="polite"></div></div></div></section>
    <div class="form-footer"><button type="button" class="btn" data-route="home">取消</button><button type="submit" class="btn primary" id="submitFeedbackBtn">提交反馈</button></div>
  </form><aside class="panel guide"><h3>怎样更快得到处理？</h3><ol><li>标题写清功能位置和异常结果。</li><li>提供可重复操作的步骤。</li><li>说明影响项目数和紧急节点。</li><li>不要在描述中填写客户敏感信息。</li></ol><div class="example"><strong>推荐标题</strong><br>批量导入后项目负责人字段未正确回填<br><br><strong>不推荐</strong><br>系统有问题，请尽快看看</div></aside></div>`;
}

function schedulePage() {
  const planned=state.issues.filter(x=>x.eta&&!["done","rejected"].includes(x.status)).sort((a,b)=>a.eta.localeCompare(b.eta));
  return pageHead("排期视图","按承诺日期检查研发安排，优先识别逾期与集中交付风险。")+`<section class="panel"><div class="panel-head"><div><h2>未来交付安排</h2><p>${planned.length} 项已明确预计完成时间 · 数据刚刚同步</p></div></div><div class="queue">${planned.length?planned.map(queueItem).join(""):`<div class="empty"><div><strong>暂无已排期任务</strong><p>管理员设置预计完成时间后会显示在这里。</p></div></div>`}</div></section>`;
}

function memberPage() {
  const names=[...state.users.filter(x=>["admin","ai"].includes(x.role)&&x.status==='active').map(x=>x.name),"待分配"];
  const rows=names.map(n=>{const arr=state.issues.filter(x=>x.assignee===n&&!["done","rejected"].includes(x.status));return {n,all:arr.length,urgent:arr.filter(x=>["P0","P1"].includes(x.priority)).length};});
  return pageHead("人员负荷","根据当前未闭环任务判断分配是否均衡。")+`<section class="panel"><div class="panel-head"><div><h2>当前任务分布</h2><p>建议单人同时处理不超过 4 个高复杂任务</p></div></div><div class="table-wrap"><table><thead><tr><th>成员</th><th>进行中任务</th><th>P0 / P1</th><th>负荷判断</th></tr></thead><tbody>${rows.map(r=>`<tr><td><strong>${r.n}</strong></td><td>${r.all}</td><td>${r.urgent}</td><td>${r.n==='待分配'?'<span class="status new">需要分配</span>':r.all>=4?'<span class="status plan">较高</span>':'<span class="status done">正常</span>'}</td></tr>`).join("")}</tbody></table></div></section>`;
}

function accountsPage() {
  const admins=state.users.filter(x=>x.role==='admin');
  const users=state.users.filter(x=>x.role==='user');
  const aiUsers=state.users.filter(x=>x.role==='ai');
  return pageHead("账号管理","创建管理员账号，并统一查看用户所属大区与账号状态。",`<button class="btn primary" id="showAdminForm">${icons.plus}创建管理员</button>`) +
    `<section class="panel account-create" id="adminCreatePanel" hidden><div class="panel-head"><div><h2>创建管理员账号</h2><p>请为新管理员设置不少于 8 位的初始密码。</p></div></div><form id="adminCreateForm" class="panel-body form-grid" novalidate><div class="field"><label for="newAdminName">姓名</label><input id="newAdminName" name="name" autocomplete="name" placeholder="请输入管理员姓名…"></div><div class="field"><label for="newAdminAccount">登录账号</label><input id="newAdminAccount" name="account" autocomplete="username" placeholder="建议使用姓名拼音…"></div><div class="field"><label for="newAdminRegion">所属组织</label><select id="newAdminRegion" name="region">${REGIONS.map(r=>`<option ${r==='公司本部'?'selected':''}>${r}</option>`).join("")}</select></div><div class="field"><label for="newAdminPassword">初始密码</label><input id="newAdminPassword" name="password" type="password" minlength="8" autocomplete="new-password" placeholder="请设置不少于 8 位的密码…"></div><div class="field full"><div id="adminCreateError" class="auth-error" role="alert"></div><button class="btn primary" type="submit">确认创建管理员</button></div></form></section>
    <section class="panel account-section"><div class="panel-head"><div><h2>管理员账号</h2><p>共 ${admins.length} 人 · 9 位初始管理员已创建</p></div></div>${accountTable(admins)}</section>
    <section class="panel account-section"><div class="panel-head"><div><h2>AI 开发者账号</h2><p>每日自动分析、认领并处理能力范围内的低风险 Bug</p></div></div>${accountTable(aiUsers)}</section>
    <section class="panel account-section"><div class="panel-head"><div><h2>用户管理</h2><p>共 ${users.length} 位注册用户，可停用或恢复账号</p></div></div>${accountTable(users)}</section>`;
}

function accountTable(items) {
  return `<div class="table-wrap"><table><thead><tr><th>姓名</th><th>登录账号</th><th>所属大区 / 组织</th><th>角色</th><th>状态</th><th>创建日期</th><th>操作</th></tr></thead><tbody>${items.map(u=>`<tr><td><strong>${esc(u.name)}</strong></td><td class="ticket-id">${esc(u.account)}</td><td>${esc(u.region)}</td><td>${u.role==='admin'?'管理员':u.role==='ai'?'AI 开发者':'普通用户'}</td><td>${u.status==='active'?'<span class="status done">启用</span>':'<span class="status rejected">已停用</span>'}</td><td>${formatDate(u.created)}</td><td><button class="btn small ${u.status==='active'?'danger':''}" data-toggle-user="${u.id}" ${u.id===state.session?.userId?'disabled title="不能停用当前账号"':''}>${u.status==='active'?'停用':'恢复'}</button></td></tr>`).join("")}</tbody></table></div>`;
}

function aiDashboard() {
  const assigned=state.issues.filter(x=>x.assignee==='AI 开发者');
  const doing=assigned.filter(x=>x.status==='doing');
  const verify=assigned.filter(x=>x.status==='verify');
  const assessable=state.issues.filter(x=>["new","review"].includes(x.status)&&x.assignee==='待分配');
  const safe=assessable.filter(x=>aiAssessment(x).canHandle);
  return pageHead("AI 任务中心","每日巡检各大区反馈，仅认领低风险、可复现且位于能力白名单内的 Bug。",`<button class="btn primary" id="runAiScan">${icons.search}立即执行巡检</button>`) +
    `<div class="notice ai-notice">${icons.shield}<div><strong>自动处理边界：</strong>AI 不处理权限、密码、数据库、生产发布、数据删除、金额审批及客户敏感数据问题；这些反馈始终转人工评估。</div></div>
    <section class="kpi-grid" aria-label="AI 巡检统计">${kpi("今日扫描",state.aiState.scanned||state.issues.length,"覆盖全部大区反馈","search","info")}${kpi("正在处理",doing.length,"已由 AI 认领","clock")}${kpi("等待验证",verify.length,"已提交修复结果","check","success")}${kpi("待人工判断",assessable.length-safe.length,"超出自动处理边界","alert","warn")}</section>
    <div class="dashboard-grid"><section class="panel"><div class="panel-head"><div><h2>AI 当前应优先处理什么</h2><p>按置信度与影响程度排序 · 上次巡检 ${state.aiState.lastScanAt||'尚未执行'}</p></div></div>${aiTaskTable(assigned.filter(x=>!["done","rejected"].includes(x.status)))}</section>
    <aside class="panel"><div class="panel-head"><div><h2>今日巡检结论</h2><p>规则引擎 + 风险白名单</p></div></div><div class="panel-body"><div class="ai-summary"><strong>${state.aiState.claimed||0} 个</strong><span>新认领任务</span></div><div class="ai-summary"><strong>${state.aiState.completed||0} 个</strong><span>自动提交结果</span></div><div class="ai-summary"><strong>${state.aiState.skipped||0} 个</strong><span>保留人工处理</span></div><div class="insight"><strong>下一次自动巡检：</strong>明日平台首次打开时执行。正式版接入服务器定时任务后可在无人登录时运行。</div></div></aside></div>`;
}

function aiTaskTable(items) {
  if(!items.length) return `<div class="empty">${icons.check}<div><strong>当前没有 AI 待处理任务</strong><p>系统会在每日巡检时自动判断并认领适合的 Bug。</p></div></div>`;
  return `<div class="table-wrap"><table><thead><tr><th>反馈</th><th>大区 / 模块</th><th>AI 判断</th><th>状态</th><th>操作</th></tr></thead><tbody>${items.map(x=>`<tr><td class="title-cell"><strong>${esc(x.title)}</strong><small>${x.id}</small></td><td>${x.region}<br><small>${x.module}</small></td><td><span class="ai-score">${x.aiScore||aiAssessment(x).score}%</span><small class="ai-reason">${esc(x.aiReason||aiAssessment(x).reason)}</small></td><td>${statusBadge(x.status)}</td><td>${x.status==='doing'?`<button class="btn small primary" data-ai-complete="${x.id}">提交修复结果</button>`:`<button class="btn small" data-open="${x.id}">查看结果</button>`}</td></tr>`).join("")}</tbody></table></div>`;
}

function aiTasksPage() {
  const items=state.issues.filter(x=>x.assignee==='AI 开发者');
  return pageHead("我的处理任务","查看 AI 已认领、已提交结果和等待用户验证的任务。")+`<section class="panel">${aiTaskTable(items)}</section>`;
}

function aiLogPage() {
  const events=state.issues.flatMap(x=>x.timeline.filter(t=>t.by==='AI 开发者').map(t=>({...t,id:x.id,title:x.title}))).sort((a,b)=>b.at.localeCompare(a.at));
  return pageHead("巡检记录","保留 AI 的认领依据、处理过程和最终反馈，便于管理员审计。")+`<section class="panel"><div class="panel-head"><div><h2>自动处理审计记录</h2><p>最近巡检：${state.aiState.lastScanAt||'尚未执行'} · 数据完整度 100%</p></div></div><div class="queue">${events.length?events.map(e=>`<article class="queue-item" data-open="${e.id}" tabindex="0"><div class="priority-box p2">AI</div><div><div class="queue-title">${esc(e.title)}</div><div class="queue-meta"><span>${e.id}</span><span>${esc(e.text)}</span></div></div><div class="due"><strong>${esc(e.at)}</strong>处理记录</div></article>`).join(""):`<div class="empty">暂无 AI 巡检记录</div>`}</div></section>`;
}

function helpPage() {
  return pageHead("使用帮助","反馈进入平台后会按统一流程完成评估与闭环。")+`<section class="panel"><div class="form-section"><h2>处理流程</h2><div class="detail-copy">提交反馈 → 管理员受理评估 → 确认是否执行 → 分配负责人和预计完成时间 → 开发处理 → 大区验证 → 完成闭环</div></div><div class="form-section"><h2>状态说明</h2><div class="form-grid">${Object.entries(statusMap).map(([k,v])=>`<div class="notice" style="margin:0">${statusBadge(k)}<span>${({new:'已收到反馈，等待管理员查看。',review:'正在判断价值、影响与处理方式。',plan:'已确认执行并给出负责人和时间。',doing:'开发人员正在处理。',verify:'处理已完成，等待反馈人验证。',done:'已确认效果并关闭。',rejected:'当前不执行，详情中会说明原因。'})[k]}</span></div>`).join("")}</div></div></section>`;
}

function render() {
  if (!state.session || !currentUser() || currentUser().status !== "active") {
    state.session=null; state.role=null; state.route="login";
    document.querySelector("#app").innerHTML=loginPage(authMode);
    bindAuth();
    return;
  }
  let content;
  if (state.role === "user") {
    if (!["home","new","mine","help"].includes(state.route)) state.route="home";
    content = state.route === "home" ? userHome() : state.route === "new" ? newFeedback() : state.route === "mine" ? feedbackList(false) : helpPage();
  } else if(state.role === "ai") {
    if(!["ai","aiTasks","aiLog"].includes(state.route)) state.route="ai";
    content=state.route==="ai"?aiDashboard():state.route==="aiTasks"?aiTasksPage():aiLogPage();
  } else {
    if (!["admin","issues","schedule","members","accounts"].includes(state.route)) state.route="admin";
    content = state.route === "admin" ? adminHome() : state.route === "issues" ? feedbackList(true) : state.route === "schedule" ? schedulePage() : state.route === "members" ? memberPage() : accountsPage();
  }
  document.querySelector("#app").innerHTML=shell(content);
  bind();
  if (state.selectedId) openDrawer(state.selectedId);
}

function bind() {
  document.querySelectorAll("[data-route]").forEach(el=>el.addEventListener("click",()=>{ state.route=el.dataset.route; state.selectedId=null; save(); render(); window.scrollTo(0,0); }));
  document.querySelector("#logoutBtn")?.addEventListener("click",()=>{state.session=null;state.role=null;state.route="login";state.selectedId=null;state.users=[];state.issues=[];save();authMode="login";render();});
  document.querySelector("#menuBtn")?.addEventListener("click",()=>document.querySelector("#shell").classList.toggle("menu-open"));
  document.querySelectorAll("[data-open]").forEach(el=>{el.addEventListener("click",()=>openDrawer(el.dataset.open));el.addEventListener("keydown",e=>{if(e.key==='Enter'||e.key===' '){e.preventDefault();openDrawer(el.dataset.open)}})});
  document.querySelector("#feedbackForm")?.addEventListener("submit",submitFeedback);
  document.querySelector("#attachments")?.addEventListener("change",showSelectedAttachments);
  document.querySelector("#homeSearchForm")?.addEventListener("submit",e=>{e.preventDefault();homeSearch=String(new FormData(e.currentTarget).get("q")||"").trim();render();});
  document.querySelector("#clearHomeSearch")?.addEventListener("click",()=>{homeSearch="";render();});
  const mappings=[["searchInput","q","input"],["statusFilter","status","change"],["typeFilter","type","change"],["regionFilter","region","change"]];
  mappings.forEach(([id,key,event])=>document.querySelector(`#${id}`)?.addEventListener(event,e=>{filters[key]=e.target.value; if(event==='input'){clearTimeout(bind.t);bind.t=setTimeout(render,180)}else render();}));
  document.querySelector("#resetFilters")?.addEventListener("click",()=>{filters={status:"all",type:"all",region:"all",q:""};render();});
  document.querySelector("#exportBtn")?.addEventListener("click", exportCsv);
  document.querySelector("#showAdminForm")?.addEventListener("click",()=>{const p=document.querySelector("#adminCreatePanel");p.hidden=!p.hidden;if(!p.hidden)document.querySelector("#newAdminName").focus();});
  document.querySelector("#adminCreateForm")?.addEventListener("submit",createAdmin);
  document.querySelectorAll("[data-toggle-user]").forEach(btn=>btn.addEventListener("click",()=>toggleUser(btn.dataset.toggleUser)));
  document.querySelector("#runAiScan")?.addEventListener("click",runAiScan);
  document.querySelectorAll("[data-ai-complete]").forEach(btn=>btn.addEventListener("click",()=>completeAiTask(btn.dataset.aiComplete)));
}

function bindAuth() {
  document.querySelector("#authModeBtn")?.addEventListener("click",()=>{authMode=authMode==='login'?'register':'login';render();});
  document.querySelector("#loginForm")?.addEventListener("submit",handleLogin);
  document.querySelector("#registerForm")?.addEventListener("submit",handleRegister);
}

function authError(message) { const el=document.querySelector("#authError"); if(el) el.textContent=message; }
async function handleLogin(e) {
  e.preventDefault(); const fd=new FormData(e.currentTarget); const account=String(fd.get("account")||"").trim().toLowerCase(); const password=String(fd.get("password")||"");
  try {
    const result=await api("/api/auth/login",{method:"POST",body:JSON.stringify({account,password})});
    state.session={token:result.token,userId:result.user.id}; state.role=result.user.role; state.route=result.user.role==='admin'?'admin':result.user.role==='ai'?'ai':'home'; save();
    await refreshData(); render(); showToast(`欢迎回来，${result.user.name}。`);
  } catch(error){authError(error.message);}
}
async function handleRegister(e) {
  e.preventDefault(); const fd=new FormData(e.currentTarget); const name=String(fd.get("name")||"").trim(), account=String(fd.get("account")||"").trim().toLowerCase(), password=String(fd.get("password")||""), confirm=String(fd.get("confirm")||"");
  if(!name||!account||!password||!confirm){authError("请完整填写注册信息。");return;} if(!/^[a-z0-9._-]{3,30}$/i.test(account)){authError("账号需为 3–30 位字母、数字、点、下划线或短横线。");return;} if(password.length<8){authError("密码至少需要 8 位。");return;} if(password!==confirm){authError("两次输入的密码不一致。");return;}
  try {
    const result=await api("/api/auth/register",{method:"POST",body:JSON.stringify({name,account,password,region:fd.get("region")})});
    state.session={token:result.token,userId:result.user.id};state.role='user';state.route='home';save();await refreshData();render();showToast("注册成功，欢迎使用反馈中心。");
  } catch(error){authError(error.message);}
}
async function createAdmin(e) {
  e.preventDefault(); const fd=new FormData(e.currentTarget), name=String(fd.get("name")||"").trim(), account=String(fd.get("account")||"").trim().toLowerCase(), password=String(fd.get("password")||""); const error=document.querySelector("#adminCreateError");
  if(!name||!account||password.length<8){error.textContent="请填写姓名、账号和不少于 8 位的密码。";return;}
  try{await api("/api/admin/users",{method:"POST",body:JSON.stringify({name,account,password,region:fd.get("region")})});await refreshData();render();showToast(`管理员 ${name} 已创建。`);}catch(ex){error.textContent=ex.message;}
}
async function toggleUser(id){const user=state.users.find(x=>x.id===id);if(!user||user.id===state.session?.userId)return;const status=user.status==='active'?'disabled':'active';try{await api(`/api/admin/users/${encodeURIComponent(id)}/status`,{method:"PATCH",body:JSON.stringify({status})});await refreshData();render();showToast(`${user.name} 的账号已${status==='active'?'恢复':'停用'}。`);}catch(error){showToast(error.message);}}
async function completeAiTask(id){try{await api(`/api/ai/issues/${encodeURIComponent(id)}/complete`,{method:"POST"});await refreshData();render();showToast(`${id} 已提交修复结果，等待用户验证。`);}catch(error){showToast(error.message);}}

async function submitFeedback(e) {
  e.preventDefault();
  if(feedbackSubmitting)return;
  const form=e.currentTarget; form.querySelectorAll(".field-error").forEach(x=>x.remove());
  const fd=new FormData(form), required=["title","module","desc","impact"]; let first;
  required.forEach(name=>{const el=form.elements[name];if(!String(fd.get(name)||"").trim()){const msg=document.createElement("small");msg.className="field-error";msg.textContent="请填写此项后再提交。";el.closest(".field").appendChild(msg);first ||= el;}});
  if(first){first.focus();return;}
  const files=fd.getAll("attachments").filter(file=>file?.size);
  if(files.length>5){showToast("最多上传 5 个附件。");return;}
  if(files.some(file=>file.size>10*1024*1024)){showToast("单个附件不能超过 10 MB。");return;}
  const submitButton=form.querySelector("#submitFeedbackBtn");
  feedbackSubmitting=true;form.setAttribute("aria-busy","true");submitButton.disabled=true;submitButton.textContent="正在提交…";
  try{const result=await api("/api/issues",{method:"POST",body:fd,timeoutMs:120000});await refreshData();state.route="mine";render();showToast(`反馈 ${result.id} 已提交，管理员将尽快受理。`);}catch(error){showToast(error.message);}
  finally{feedbackSubmitting=false;const current=document.querySelector("#submitFeedbackBtn");if(current){document.querySelector("#feedbackForm")?.removeAttribute("aria-busy");current.disabled=false;current.textContent="提交反馈";}}
}

function showSelectedAttachments(e){
  const list=document.querySelector("#attachmentList");
  const files=[...e.target.files];
  if(!files.length){list.innerHTML="";return;}
  list.innerHTML=files.map(file=>`<span>${esc(file.name)} <small>${formatFileSize(file.size)}</small></span>`).join("");
}

function detailProgress(x){
  const stages=[{key:"new",label:"已提交"},{key:"review",label:"评估排期"},{key:"doing",label:"开发处理"},{key:"verify",label:"用户验证"},{key:"done",label:"完成闭环"}];
  const indexMap={new:0,review:1,plan:1,doing:2,verify:3,done:4,rejected:1};
  const current=indexMap[x.status]??0;
  return `<div class="detail-progress" aria-label="反馈处理进度">${stages.map((stage,index)=>`<div class="progress-step ${index<current?'complete':''} ${index===current?'current':''} ${x.status==='rejected'&&index===current?'stopped':''}"><span>${index<current?icons.check:index+1}</span><strong>${x.status==='rejected'&&index===current?'暂不处理':stage.label}</strong></div>`).join("")}</div>`;
}

function openDrawer(id) {
  const x=issueById(id); if(!x)return; state.selectedId=id; save();
  const root=document.querySelector("#drawerRoot"); root.innerHTML=`<aside class="drawer" role="dialog" aria-modal="true" aria-labelledby="drawerTitle"><div class="drawer-head"><div class="drawer-title-wrap"><div class="drawer-ticket"><span class="ticket-id">${x.id}</span>${typeBadge(x.type)}${statusBadge(x.status)}</div><h2 id="drawerTitle">${esc(x.title)}</h2><p>由 ${esc(x.reporter)} 提交于 ${esc(x.created)} · ${esc(x.region)}</p></div><button class="icon-btn" id="closeDrawer" aria-label="关闭详情">${icons.close}</button></div><div class="drawer-scroll">
    ${detailProgress(x)}
    <section class="detail-section" aria-labelledby="detailOverview"><div class="detail-section-head"><div><span class="section-kicker">OVERVIEW</span><h3 id="detailOverview">反馈概况</h3></div></div><div class="detail-meta"><div><span>所属大区</span><strong>${esc(x.region)}</strong></div><div><span>涉及模块</span><strong>${esc(x.module)}</strong></div><div><span>提交人</span><strong>${esc(x.reporter)}</strong></div><div><span>优先级</span><strong>${x.priority} · ${priorityMap[x.priority]}</strong></div><div><span>开发负责人</span><strong>${esc(x.assignee)}</strong></div><div><span>预计完成</span><strong>${x.eta?formatDate(x.eta):'待排期'}</strong></div></div></section>
    ${state.role==='admin'?adminControls(x):userDecision(x)}
    <section class="detail-section" aria-labelledby="detailContent"><div class="detail-section-head"><div><span class="section-kicker">DETAILS</span><h3 id="detailContent">反馈内容</h3></div></div><div class="detail-content-grid"><div class="detail-copy-block"><span>反馈说明</span><p>${esc(x.desc)}</p></div><div class="detail-copy-block"><span>影响范围</span><p>${esc(x.impact)}</p></div>${x.reproduce?`<div class="detail-copy-block full"><span>复现步骤</span><p>${esc(x.reproduce)}</p></div>`:''}${x.rejectReason?`<div class="detail-copy-block full rejected-copy"><span>暂不处理原因</span><p>${esc(x.rejectReason)}</p></div>`:''}</div></section>
    ${x.attachments?.length?`<section class="detail-section"><div class="detail-section-head"><div><span class="section-kicker">FILES</span><h3>附件与问题截图</h3></div><span class="section-count">${x.attachments.length} 个</span></div><div class="attachment-list">${x.attachments.map(file=>`<div class="attachment-row"><div><strong>${esc(file.name)}</strong><small>${formatFileSize(file.size)} · ${esc(file.created)}</small></div><button class="btn small" data-download-attachment="${file.id}" data-file-name="${esc(file.name)}">${icons.download}下载</button></div>`).join("")}</div></section>`:''}
    <section class="detail-section activity-section"><div class="detail-section-head"><div><span class="section-kicker">ACTIVITY</span><h3>处理记录</h3></div><span class="section-count">${x.timeline.length} 条</span></div><div class="timeline">${x.timeline.map((t,index)=>`<div class="timeline-item"><span class="timeline-marker">${esc((t.by||'?').slice(0,1))}</span><div class="timeline-content"><div><strong>${esc(t.by)}</strong><time>${esc(t.at)}</time></div><p>${esc(t.text)}</p></div></div>`).join("")}</div><div class="comment-box"><input id="commentInput" aria-label="添加处理记录" placeholder="补充处理进展、结论或验证结果…"><button class="btn primary" id="addComment">添加记录</button></div></section>
  </div></aside>`;
  root.classList.add("open"); root.setAttribute("aria-hidden","false"); root.querySelector("#closeDrawer").focus();
  root.addEventListener("click",e=>{if(e.target===root)closeDrawer()}); root.querySelector("#closeDrawer").addEventListener("click",closeDrawer);
  root.querySelector("#saveIssue")?.addEventListener("click",()=>saveAdmin(x.id));
  root.querySelector("#confirmIssue")?.addEventListener("click",()=>confirmIssue(x.id));
  root.querySelector("#addComment").addEventListener("click",()=>addComment(x.id));
  root.querySelectorAll("[data-download-attachment]").forEach(button=>button.addEventListener("click",()=>downloadAttachment(button.dataset.downloadAttachment,button.dataset.fileName)));
  document.addEventListener("keydown", drawerEscape);
}
function drawerEscape(e){if(e.key==='Escape')closeDrawer()}
function closeDrawer(){state.selectedId=null;save();const root=document.querySelector("#drawerRoot");root?.classList.remove("open");root?.setAttribute("aria-hidden","true");document.removeEventListener("keydown",drawerEscape);}

function adminControls(x) {
  const assignees=state.users.filter(u=>["admin","ai"].includes(u.role)&&u.status==='active');
  return `<section class="admin-box"><h3>受理与任务安排</h3><div class="form-grid"><div class="field"><label for="adminStatus">当前状态</label><select id="adminStatus">${Object.entries(statusMap).map(([k,v])=>`<option value="${k}" ${x.status===k?'selected':''}>${v[0]}</option>`).join("")}</select></div><div class="field"><label for="adminPriority">优先级</label><select id="adminPriority">${Object.entries(priorityMap).map(([k,v])=>`<option value="${k}" ${x.priority===k?'selected':''}>${k} · ${v}</option>`).join("")}</select></div><div class="field"><label for="adminAssignee">开发负责人</label><select id="adminAssignee"><option value="">待分配</option>${assignees.map(u=>`<option value="${u.id}" ${x.assigneeId===u.id?'selected':''}>${esc(u.name)}</option>`).join("")}</select></div><div class="field"><label for="adminEta">预计完成时间</label><input id="adminEta" type="date" value="${x.eta||''}"></div><div class="field full"><label for="adminReject">处理结论 / 暂不处理原因</label><textarea id="adminReject" placeholder="说明是否执行、范围与原因…">${esc(x.rejectReason||'')}</textarea></div></div><div class="form-footer" style="padding:14px 0 0"><button class="btn primary" id="saveIssue">保存处理安排</button></div></section>`;
}
function userDecision(x) {
  if(x.status==='verify') return `<section class="admin-box verify-box"><h3>处理已完成，等待你验证</h3><p>请验证问题是否解决。确认后该反馈将完成闭环。</p><div id="confirmIssueError" class="inline-action-error" role="alert" aria-live="polite"></div><button class="btn primary" id="confirmIssue">${icons.check}确认解决并关闭</button></section>`;
  return "";
}
async function saveAdmin(id) {
  const payload={status:document.querySelector("#adminStatus").value,priority:document.querySelector("#adminPriority").value,assigneeId:document.querySelector("#adminAssignee").value||null,eta:document.querySelector("#adminEta").value||null,rejectReason:document.querySelector("#adminReject").value.trim()};
  try{await api(`/api/issues/${encodeURIComponent(id)}`,{method:"PATCH",body:JSON.stringify(payload)});closeDrawer();await refreshData();render();showToast(`${id} 的处理安排已更新。`);}catch(error){showToast(error.message);}
}
async function confirmIssue(id){
  const button=document.querySelector("#confirmIssue"),errorBox=document.querySelector("#confirmIssueError");
  if(!button||button.disabled)return;
  const original=button.innerHTML;button.disabled=true;button.textContent="正在确认…";if(errorBox)errorBox.textContent="";
  try{await api(`/api/issues/${encodeURIComponent(id)}/confirm`,{method:"POST",timeoutMs:30000});closeDrawer();await refreshData();render();showToast(`${id} 已完成闭环。`);}
  catch(error){if(errorBox)errorBox.textContent=error.message;showToast(error.message);button.disabled=false;button.innerHTML=original;}
}
async function addComment(id){const input=document.querySelector("#commentInput"),content=input.value.trim();if(!content){input.focus();return}try{await api(`/api/issues/${encodeURIComponent(id)}/comments`,{method:"POST",body:JSON.stringify({content})});closeDrawer();await refreshData();render();state.selectedId=id;openDrawer(id);showToast("处理记录已添加。");}catch(error){showToast(error.message);}}
async function downloadAttachment(id,fileName){
  try{
    const response=await fetch(`/api/attachments/${encodeURIComponent(id)}`,{headers:{Authorization:`Bearer ${state.session.token}`}});
    if(!response.ok){const data=await response.json().catch(()=>({}));throw new Error(data.error||"附件下载失败。");}
    const url=URL.createObjectURL(await response.blob());const link=document.createElement("a");link.href=url;link.download=fileName||"附件";link.click();setTimeout(()=>URL.revokeObjectURL(url),1000);
  }catch(error){showToast(error.message);}
}
function exportCsv(){const head=["编号","类型","标题","大区","模块","状态","优先级","负责人","预计完成"];const rows=state.issues.map(x=>[x.id,x.type==='issue'?'问题':'建议',x.title,x.region,x.module,statusMap[x.status][0],x.priority,x.assignee,x.eta]);const csv='\ufeff'+[head,...rows].map(r=>r.map(v=>`"${String(v||'').replace(/"/g,'""')}"`).join(',')).join('\n');const a=document.createElement('a');a.href=URL.createObjectURL(new Blob([csv],{type:'text/csv;charset=utf-8'}));a.download='OP工具反馈清单.csv';a.click();URL.revokeObjectURL(a.href);showToast('反馈清单已导出。')}

async function init(){
  if(state.session?.token){
    try{await refreshData();state.route=state.role==='admin'?'admin':state.role==='ai'?'ai':'home';}
    catch{state.session=null;save();}
  }
  render();
}
init();
