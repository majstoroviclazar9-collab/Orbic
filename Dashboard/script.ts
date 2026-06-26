type Theme = "light" | "dark";

const VIEW_NAMES = ["dashboard", "articles", "report", "institution", "profile", "settings"] as const;
type ViewName = (typeof VIEW_NAMES)[number];
type ArticleFilter = "all" | "published" | "draft";
type ArticleStatus = "Published" | "Draft";

interface Article {
  id: number;
  title: string;
  date: string;
  views: number;
  comments: number;
  status: ArticleStatus;
  summary: string;
  body: string;
}

interface AppUser {
  name: string;
  email: string;
  password: string;
}

type SessionUser = Pick<AppUser, "name" | "email">;

interface Preferences {
  emailNotifications: boolean;
  compactNavigation: boolean;
}

type RendererMap = Record<ViewName, () => string>;

const STORAGE_USERS = "dashboard_users";
const SESSION_USER = "dashboard_logged_user";
const THEME_KEY = "dashboard_theme";
const PREFS_KEY = "dashboard_preferences";

const articles: Article[] = [
  {
    id: 80,
    title: "Designing Clear Analytics Dashboards",
    date: "2026-06-18",
    views: 3240,
    comments: 128,
    status: "Published",
    summary: "A practical framework for turning dense analytics into clear decisions.",
    body: "The strongest dashboards begin with a clear question. Group related metrics, make the hierarchy obvious, and use color only when it adds meaning. Consistency in spacing and labels helps people scan information without relearning the interface.",
  },
  {
    id: 79,
    title: "A Better Content Review Workflow",
    date: "2026-06-12",
    views: 2810,
    comments: 96,
    status: "Published",
    summary: "How a small team can move from draft to publish with less friction.",
    body: "A visible review state keeps content moving. Assign one owner, define a short checklist, and keep feedback attached to the work. The goal is not more process—it is fewer ambiguous handoffs.",
  },
  {
    id: 78,
    title: "Understanding Engagement Quality",
    date: "2026-06-05",
    views: 2460,
    comments: 84,
    status: "Published",
    summary: "Why time, depth, and returning readers matter more than a single count.",
    body: "Engagement is a group of signals rather than one number. Combine time on page, scroll depth, comments, and return visits. Look for patterns across several weeks before making changes.",
  },
  {
    id: 77,
    title: "Monthly Product Notes — June",
    date: "2026-05-29",
    views: 1970,
    comments: 61,
    status: "Published",
    summary: "A concise summary of the latest dashboard and publishing improvements.",
    body: "This month adds faster navigation, a complete theme system, responsive tables, and improved account controls. The visual language remains familiar while the small details become more dependable.",
  },
  {
    id: 76,
    title: "Building Accessible Admin Tools",
    date: "2026-05-20",
    views: 1650,
    comments: 49,
    status: "Published",
    summary: "Keyboard support, focus states, and semantics that improve every workflow.",
    body: "Accessibility is part of product quality. Use semantic controls, visible focus indicators, useful labels, sufficient contrast, and predictable keyboard behavior. These details help all users, not only assistive-technology users.",
  },
  {
    id: 75,
    title: "Content Strategy for Q3",
    date: "2026-05-11",
    views: 920,
    comments: 22,
    status: "Draft",
    summary: "The working plan for tutorials, research reports, and community stories.",
    body: "The Q3 plan balances dependable educational content with timely product research. Each theme has a clear audience, owner, and measurable outcome before production begins.",
  },
  {
    id: 74,
    title: "Reporting Without the Noise",
    date: "2026-04-28",
    views: 1430,
    comments: 37,
    status: "Published",
    summary: "A simpler way to present trends and recommendations to stakeholders.",
    body: "Start with the decision the report should support. Lead with the change, show the evidence, and end with one recommended action. Supporting detail can remain available without competing with the main story.",
  },
  {
    id: 73,
    title: "Community Editorial Guidelines",
    date: "2026-04-16",
    views: 760,
    comments: 18,
    status: "Draft",
    summary: "Shared standards for useful, respectful, and accurate contributions.",
    body: "Good editorial guidelines are specific enough to guide decisions and short enough to remember. Explain the audience, sourcing expectations, tone, and review process with examples.",
  },
];

const fallbackUser: AppUser = { name: "Admin User", email: "admin@dashboard.com", password: "admin123" };
let currentView: ViewName = "dashboard";
let articleQuery = "";
let articleStatus: ArticleFilter = "all";
let profileEditing = false;
let toastTimer: number | undefined;
let lastFocusedElement: HTMLElement | null = null;

function byId<T extends HTMLElement>(id: string): T {
  const element = document.getElementById(id);
  if (!element) {
    throw new Error(`Missing required element: #${id}`);
  }

  return element as T;
}

function eventTargetElement(target: EventTarget | null): HTMLElement | null {
  return target instanceof HTMLElement ? target : null;
}

function isObject(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null;
}

function isAppUser(value: unknown): value is AppUser {
  return (
    isObject(value) &&
    typeof value.name === "string" &&
    typeof value.email === "string" &&
    typeof value.password === "string"
  );
}

function isSessionUser(value: unknown): value is SessionUser {
  return isObject(value) && typeof value.name === "string" && typeof value.email === "string";
}

function isViewName(value: string | undefined): value is ViewName {
  return typeof value === "string" && VIEW_NAMES.includes(value as ViewName);
}

function isArticleFilter(value: string | undefined): value is ArticleFilter {
  return value === "all" || value === "published" || value === "draft";
}

const authContainer = byId<HTMLElement>("authContainer");
const dashboardContainer = byId<HTMLElement>("dashboardContainer");
const loginForm = byId<HTMLFormElement>("loginForm");
const registerForm = byId<HTMLFormElement>("registerForm");
const loginError = byId<HTMLParagraphElement>("loginError");
const registerError = byId<HTMLParagraphElement>("registerError");
const dynamicContent = byId<HTMLElement>("dynamicContent");
const navContainer = byId<HTMLElement>("navContainer");
const navOverlay = byId<HTMLButtonElement>("navOverlay");
const notificationPanel = byId<HTMLElement>("notificationPanel");
const notificationButton = byId<HTMLButtonElement>("notificationButton");
const modal = byId<HTMLElement>("modal");
const modalContent = byId<HTMLElement>("modalContent");
const toast = byId<HTMLElement>("toast");

function readJson<T>(storage: Storage, key: string, fallback: T): T {
  try {
    const value = storage.getItem(key);
    return value ? (JSON.parse(value) as T) : fallback;
  } catch {
    storage.removeItem(key);
    return fallback;
  }
}

function getUsers(): AppUser[] {
  const users = readJson<unknown>(localStorage, STORAGE_USERS, null);

  if (Array.isArray(users)) {
    const validUsers = users.filter(isAppUser);
    if (validUsers.length > 0) {
      return validUsers;
    }
  }

  const seededUsers = [{ ...fallbackUser }];
  localStorage.setItem(STORAGE_USERS, JSON.stringify(seededUsers));
  return seededUsers;
}

function saveUsers(users: AppUser[]): void {
  localStorage.setItem(STORAGE_USERS, JSON.stringify(users));
}

function getLoggedUser(): SessionUser | null {
  const user = readJson<unknown>(sessionStorage, SESSION_USER, null);
  return isSessionUser(user) ? user : null;
}

function setLoggedUser(user: SessionUser): void {
  sessionStorage.setItem(SESSION_USER, JSON.stringify(user));
}

function getPreferences(): Preferences {
  const stored = readJson<unknown>(localStorage, PREFS_KEY, {});

  return {
    emailNotifications: isObject(stored) && typeof stored.emailNotifications === "boolean" ? stored.emailNotifications : true,
    compactNavigation: isObject(stored) && typeof stored.compactNavigation === "boolean" ? stored.compactNavigation : false,
  };
}

function savePreferences(updates: Partial<Preferences>): Preferences {
  const preferences = { ...getPreferences(), ...updates };
  localStorage.setItem(PREFS_KEY, JSON.stringify(preferences));
  applyPreferences(preferences);
  return preferences;
}

function escapeHtml(value: unknown): string {
  return String(value)
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#039;");
}

function isValidEmail(email: string): boolean {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);
}

function formatNumber(value: number): string {
  return new Intl.NumberFormat("en", {
    notation: value >= 1000 ? "compact" : "standard",
    maximumFractionDigits: 1,
  }).format(value);
}

function formatDate(value: string): string {
  return new Intl.DateTimeFormat("en", { month: "short", day: "numeric", year: "numeric" }).format(
    new Date(`${value}T12:00:00`),
  );
}

function showToast(message: string): void {
  toast.textContent = message;
  toast.classList.add("show");

  if (toastTimer !== undefined) {
    window.clearTimeout(toastTimer);
  }

  toastTimer = window.setTimeout(() => toast.classList.remove("show"), 2600);
}

function getCurrentTheme(): Theme {
  return document.documentElement.dataset.theme === "dark" ? "dark" : "light";
}

function setTheme(theme: string | null | undefined, announce = false): void {
  const nextTheme: Theme = theme === "dark" ? "dark" : "light";
  document.documentElement.dataset.theme = nextTheme;
  localStorage.setItem(THEME_KEY, nextTheme);
  document
    .querySelector<HTMLMetaElement>('meta[name="theme-color"]')
    ?.setAttribute("content", nextTheme === "dark" ? "#111321" : "#fafaff");

  document.querySelectorAll<HTMLButtonElement>(".theme-toggle").forEach((button) => {
    const icon = button.querySelector("span");
    if (icon) {
      icon.textContent = nextTheme === "dark" ? "☀" : "☾";
    }

    button.setAttribute("aria-label", `Switch to ${nextTheme === "dark" ? "light" : "dark"} theme`);
  });

  document.querySelectorAll<HTMLButtonElement>("[data-theme-option]").forEach((button) => {
    button.classList.toggle("selected", button.dataset.themeOption === nextTheme);
    button.setAttribute("aria-pressed", String(button.dataset.themeOption === nextTheme));
  });

  if (announce) {
    showToast(`${nextTheme === "dark" ? "Dark" : "Light"} theme enabled`);
  }
}

function toggleTheme(): void {
  setTheme(getCurrentTheme() === "dark" ? "light" : "dark", true);
}

function applyPreferences(preferences = getPreferences()): void {
  document.body.classList.toggle("compact-nav", preferences.compactNavigation);

  const menuButton = byId<HTMLButtonElement>("menuButton");
  if (window.innerWidth > 900) {
    navContainer.classList.toggle("collapsed", preferences.compactNavigation);
    menuButton.setAttribute("aria-expanded", String(!preferences.compactNavigation));
  } else if (!navContainer.classList.contains("mobile-open")) {
    menuButton.setAttribute("aria-expanded", "false");
  }
}

function updateUserHeader(): void {
  const user = getLoggedUser() ?? fallbackUser;
  const firstName = user.name.trim().split(/\s+/)[0] || "User";
  byId<HTMLElement>("userGreeting").textContent = `Hi, ${firstName}`;
  byId<HTMLElement>("profileAvatar").textContent = firstName.charAt(0).toUpperCase();
}

function showLogin(message = ""): void {
  registerForm.classList.add("hidden");
  loginForm.classList.remove("hidden");
  loginError.textContent = message;
  loginError.classList.toggle("success", Boolean(message));
  registerError.textContent = "";
  byId<HTMLInputElement>("loginEmail").focus();
}

function showRegister(): void {
  loginForm.classList.add("hidden");
  registerForm.classList.remove("hidden");
  loginError.textContent = "";
  registerError.textContent = "";
  registerError.classList.remove("success");
  byId<HTMLInputElement>("regName").focus();
}

function loginUser(email: string, password: string): boolean {
  const user = getUsers().find((item) => item.email.toLowerCase() === email.toLowerCase() && item.password === password);

  if (!user) {
    return false;
  }

  setLoggedUser({ name: user.name, email: user.email });
  return true;
}

function registerUser(name: string, email: string, password: string): boolean {
  const users = getUsers();

  if (users.some((item) => item.email.toLowerCase() === email.toLowerCase())) {
    return false;
  }

  users.push({ name, email: email.toLowerCase(), password });
  saveUsers(users);
  return true;
}

function openDashboard(): void {
  authContainer.classList.add("hidden");
  dashboardContainer.classList.remove("hidden");
  updateUserHeader();
  applyPreferences();
  byId<HTMLButtonElement>("menuButton").setAttribute(
    "aria-expanded",
    String(window.innerWidth > 900 && !navContainer.classList.contains("collapsed")),
  );
  loadView("dashboard", false);
}

function logout(): void {
  sessionStorage.removeItem(SESSION_USER);
  dashboardContainer.classList.add("hidden");
  authContainer.classList.remove("hidden");
  loginForm.reset();
  registerForm.reset();
  closeNavigation();
  showLogin();
}

function pageHeading(eyebrow: string, title: string, description: string, action = ""): string {
  return `<div class="page-heading"><div><span class="eyebrow">${escapeHtml(eyebrow)}</span><h1>${escapeHtml(title)}</h1><p>${escapeHtml(description)}</p></div>${action}</div>`;
}

function renderDashboard(): string {
  const recentRows = articles
    .slice(0, 5)
    .map(
      (article) => `
    <tr>
      <td><strong>${escapeHtml(article.title)}</strong></td>
      <td>${formatNumber(article.views)}</td>
      <td>${article.comments}</td>
      <td><span class="status-pill ${article.status === "Draft" ? "draft" : ""}">${article.status}</span></td>
    </tr>`,
    )
    .join("");

  return `
    ${pageHeading("Overview", "Dashboard", "A clear view of your publishing performance.")}
    <div class="box-container">
      <button class="stat-card" type="button" data-go-view="report"><span><span class="topic-heading">60.5k</span><span class="topic">Article views</span></span><span class="stat-icon">◉</span></button>
      <button class="stat-card" type="button" data-go-view="report"><span><span class="topic-heading">4.8k</span><span class="topic">Likes</span></span><span class="stat-icon">♡</span></button>
      <button class="stat-card" type="button" data-go-view="articles"><span><span class="topic-heading">495</span><span class="topic">Comments</span></span><span class="stat-icon">◇</span></button>
      <button class="stat-card" type="button" data-go-view="articles"><span><span class="topic-heading">70</span><span class="topic">Published</span></span><span class="stat-icon">✓</span></button>
    </div>
    <section class="report-container" aria-labelledby="recentHeading">
      <div class="report-header"><h2 id="recentHeading" class="recent-Articles">Recent Articles</h2><button class="text-button" type="button" data-go-view="articles">View all →</button></div>
      <div class="table-wrap"><table class="data-table"><thead><tr><th>Article</th><th>Views</th><th>Comments</th><th>Status</th></tr></thead><tbody>${recentRows}</tbody></table></div>
    </section>`;
}

function getFilteredArticles(): Article[] {
  const query = articleQuery.trim().toLowerCase();

  return articles.filter((article) => {
    const matchesQuery = !query || `${article.title} ${article.summary}`.toLowerCase().includes(query);
    const matchesStatus = articleStatus === "all" || article.status.toLowerCase() === articleStatus;
    return matchesQuery && matchesStatus;
  });
}

function renderArticles(): string {
  const filteredArticles = getFilteredArticles();
  const cards = filteredArticles
    .map(
      (article) => `
    <article class="article-card">
      <span class="status-pill ${article.status === "Draft" ? "draft" : ""}">${article.status}</span>
      <h2>${escapeHtml(article.title)}</h2>
      <p class="article-meta">${formatDate(article.date)} · ${formatNumber(article.views)} views</p>
      <p class="article-summary">${escapeHtml(article.summary)}</p>
      <div class="article-card-footer"><span class="article-meta">${article.comments} comments</span><button class="text-button" type="button" data-read-article="${article.id}">Read article →</button></div>
    </article>`,
    )
    .join("");

  return `
    ${pageHeading("Content", "All Articles", `${filteredArticles.length} of ${articles.length} articles shown.`)}
    <section class="dyn-card">
      <div class="articles-toolbar">
        <input class="form-control" id="articleSearch" type="search" value="${escapeHtml(articleQuery)}" placeholder="Filter by title or topic" aria-label="Filter articles" />
        <select class="form-control" id="articleStatus" aria-label="Filter by status">
          <option value="all" ${articleStatus === "all" ? "selected" : ""}>All statuses</option>
          <option value="published" ${articleStatus === "published" ? "selected" : ""}>Published</option>
          <option value="draft" ${articleStatus === "draft" ? "selected" : ""}>Draft</option>
        </select>
      </div>
      <div class="articles-grid">${cards || '<div class="empty-state"><strong>No articles found.</strong><p>Try a different search or status.</p></div>'}</div>
    </section>`;
}

function renderReport(): string {
  const months = ["Jan", "Feb", "Mar", "Apr", "May", "Jun"];
  const bars = [42, 55, 49, 68, 76, 88]
    .map(
      (height, index) =>
        `<div class="bar-group"><div class="bar" style="height:${height}%" title="${height} thousand views"></div><span>${months[index]}</span></div>`,
    )
    .join("");

  return `
    ${pageHeading("Analytics", "Performance Report", "Engagement is trending up across the last six months.", '<button class="secondary-button" type="button" id="exportReport">Export CSV</button>')}
    <div class="report-grid">
      <div class="report-metric"><h2>Total views</h2><p>89.2k</p><span class="trend-up">↑ 12% this month</span></div>
      <div class="report-metric"><h2>Avg. engagement</h2><p>4.2 min</p><span class="trend-up">↑ 0.8 min</span></div>
      <div class="report-metric"><h2>Subscribers</h2><p>1,240</p><span class="trend-up">↑ 18% this quarter</span></div>
    </div>
    <section class="dyn-card chart-card"><h2>Monthly views</h2><p class="article-meta">January–June 2026, in thousands</p><div class="bar-chart" role="img" aria-label="Monthly views grew from 42 thousand in January to 88 thousand in June">${bars}</div></section>`;
}

function renderInstitution(): string {
  return `
    ${pageHeading("Organization", "Institution Overview", "The people and details behind this workspace.")}
    <section class="dyn-card">
      <span class="eyebrow">Knowledge network</span><h2>Orbic Knowledge Hub</h2>
      <p class="modal-copy" style="margin-top:10px">An international learning community focused on practical computer science, interview preparation, and professional growth.</p>
      <div class="detail-list">
        <div class="detail-item"><span>Headquarters</span><strong>New York City, USA / Global digital campus</strong></div>
        <div class="detail-item"><span>Founded</span><strong>2009</strong></div>
        <div class="detail-item"><span>Active members</span><strong>4.5 million+</strong></div>
        <div class="detail-item"><span>Certified programs</span><strong>200+</strong></div>
      </div>
      <div class="profile-actions"><button class="primary-button" type="button" id="partnershipButton">Partnership details</button></div>
    </section>`;
}

function renderProfile(): string {
  const user = getLoggedUser() ?? fallbackUser;
  const initial = user.name.trim().charAt(0).toUpperCase() || "U";

  return `
    ${pageHeading("Account", "Profile", "Manage the identity displayed across your dashboard.")}
    <section class="dyn-card">
      <div class="profile-summary"><span class="avatar">${escapeHtml(initial)}</span><div><h2>${escapeHtml(user.name)}</h2><p>${escapeHtml(user.email)}</p><span class="status-pill">Administrator</span></div></div>
      <div class="profile-actions"><button class="primary-button" type="button" id="editProfileButton">${profileEditing ? "Editing profile" : "Edit profile"}</button></div>
      <form id="profileEditForm" class="edit-form ${profileEditing ? "" : "hidden"}" novalidate>
        <div class="form-row"><div class="form-field"><label class="field-label" for="profileName">Full name</label><input class="form-control" id="profileName" name="name" value="${escapeHtml(user.name)}" required /></div><div class="form-field"><label class="field-label" for="profileEmail">Email address</label><input class="form-control" id="profileEmail" name="email" type="email" value="${escapeHtml(user.email)}" required /></div></div>
        <div class="profile-actions"><button class="primary-button" type="submit">Save changes</button><button class="secondary-button" type="button" id="cancelProfileEdit">Cancel</button></div>
        <p id="profileMessage" class="form-message" role="alert"></p>
      </form>
    </section>`;
}

function renderSettings(): string {
  const preferences = getPreferences();
  const theme = getCurrentTheme();

  return `
    ${pageHeading("Workspace", "Settings", "Personalize how your dashboard looks and behaves.")}
    <section class="dyn-card"><div class="settings-grid">
      <div class="setting-card"><h2>Appearance</h2><p>Choose the theme that is easiest on your eyes.</p><div class="segmented-control" aria-label="Color theme"><button type="button" data-theme-option="light" class="${theme === "light" ? "selected" : ""}" aria-pressed="${theme === "light"}">☀ Light</button><button type="button" data-theme-option="dark" class="${theme === "dark" ? "selected" : ""}" aria-pressed="${theme === "dark"}">☾ Dark</button></div></div>
      <div class="setting-card toggle-row"><div><h2>Email notifications</h2><p>Receive weekly reports and article milestones.</p></div><label class="switch"><input id="emailNotifications" type="checkbox" ${preferences.emailNotifications ? "checked" : ""} /><span></span><span class="sr-only">Email notifications</span></label></div>
      <div class="setting-card toggle-row"><div><h2>Compact navigation</h2><p>Use a narrower sidebar on larger screens.</p></div><label class="switch"><input id="compactNavigation" type="checkbox" ${preferences.compactNavigation ? "checked" : ""} /><span></span><span class="sr-only">Compact navigation</span></label></div>
      <div class="setting-card"><h2>Change password</h2><p>Confirm your current password before updating it.</p><button class="secondary-button" type="button" id="openPasswordForm">Update password</button></div>
    </div>
    <form id="passwordForm" class="edit-form hidden" novalidate>
      <div class="form-row"><div class="form-field"><label class="field-label" for="currentPassword">Current password</label><input class="form-control" id="currentPassword" type="password" autocomplete="current-password" required /></div><div class="form-field"><label class="field-label" for="newPassword">New password</label><input class="form-control" id="newPassword" type="password" autocomplete="new-password" placeholder="At least 8 characters" required /></div></div>
      <div class="profile-actions"><button class="primary-button" type="submit">Save password</button><button class="secondary-button" type="button" id="cancelPasswordForm">Cancel</button></div><p id="passwordMessage" class="form-message" role="alert"></p>
    </form></section>`;
}

function loadView(view: ViewName | string | undefined, focusContent = true): void {
  const renderers: RendererMap = {
    dashboard: renderDashboard,
    articles: renderArticles,
    report: renderReport,
    institution: renderInstitution,
    profile: renderProfile,
    settings: renderSettings,
  };
  const safeView: ViewName = isViewName(view) ? view : "dashboard";
  currentView = safeView;
  profileEditing = safeView === "profile" ? profileEditing : false;
  dynamicContent.innerHTML = renderers[safeView]();

  document.querySelectorAll<HTMLButtonElement>(".nav-option[data-view]").forEach((button) => {
    const active = button.dataset.view === safeView;
    button.classList.toggle("active", active);

    if (active) {
      button.setAttribute("aria-current", "page");
    } else {
      button.removeAttribute("aria-current");
    }
  });

  history.replaceState(null, "", `#${safeView}`);
  closeNavigation();
  closeNotifications();

  if (focusContent) {
    byId<HTMLElement>("mainContent").scrollTo({ top: 0, behavior: "smooth" });
    dynamicContent.focus({ preventScroll: true });
  }
}

function openArticle(articleId: string | undefined): void {
  const article = articles.find((item) => item.id === Number(articleId));

  if (!article) {
    return;
  }

  openModal(`<span class="status-pill ${article.status === "Draft" ? "draft" : ""}">${article.status}</span><h2 id="modalTitle" style="margin-top:14px">${escapeHtml(article.title)}</h2><p class="article-meta">${formatDate(article.date)} · ${formatNumber(article.views)} views · ${article.comments} comments</p><p class="modal-copy">${escapeHtml(article.body)}</p>`);
}

function openModal(content: string): void {
  lastFocusedElement = document.activeElement instanceof HTMLElement ? document.activeElement : null;
  modalContent.innerHTML = content;
  modal.classList.remove("hidden");
  document.body.style.overflow = "hidden";
  modal.querySelector<HTMLButtonElement>(".modal-close")?.focus();
}

function closeModal(): void {
  if (modal.classList.contains("hidden")) {
    return;
  }

  modal.classList.add("hidden");
  document.body.style.overflow = "";
  modalContent.innerHTML = "";
  lastFocusedElement?.focus();
}

function closeNavigation(): void {
  if (window.innerWidth <= 900) {
    navContainer.classList.remove("mobile-open");
    navOverlay.classList.add("hidden");
    byId<HTMLButtonElement>("menuButton").setAttribute("aria-expanded", "false");
  }
}

function toggleNavigation(): void {
  const menuButton = byId<HTMLButtonElement>("menuButton");

  if (window.innerWidth <= 900) {
    const open = navContainer.classList.toggle("mobile-open");
    navOverlay.classList.toggle("hidden", !open);
    menuButton.setAttribute("aria-expanded", String(open));
    return;
  }

  const collapsed = navContainer.classList.toggle("collapsed");
  savePreferences({ compactNavigation: collapsed });
  menuButton.setAttribute("aria-expanded", String(!collapsed));
}

function closeNotifications(): void {
  notificationPanel.classList.add("hidden");
  notificationButton.setAttribute("aria-expanded", "false");
}

function toggleNotifications(): void {
  const willOpen = notificationPanel.classList.contains("hidden");
  notificationPanel.classList.toggle("hidden", !willOpen);
  notificationButton.setAttribute("aria-expanded", String(willOpen));
}

function submitGlobalSearch(value: string): void {
  articleQuery = value.trim();
  byId<HTMLInputElement>("desktopSearch").value = articleQuery;
  byId<HTMLInputElement>("mobileSearch").value = articleQuery;
  articleStatus = "all";
  loadView("articles");
}

function exportReport(): void {
  const rows = ["Month,Views (thousands)", "January,42", "February,55", "March,49", "April,68", "May,76", "June,88"];
  const blob = new Blob([rows.join("\n")], { type: "text/csv;charset=utf-8" });
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.href = url;
  link.download = "dashboard-report-2026.csv";
  link.click();
  URL.revokeObjectURL(url);
  showToast("Report exported as CSV");
}

loginForm.addEventListener("submit", (event) => {
  event.preventDefault();

  const email = byId<HTMLInputElement>("loginEmail").value.trim();
  const password = byId<HTMLInputElement>("loginPassword").value;
  loginError.classList.remove("success");

  if (!isValidEmail(email)) {
    loginError.textContent = "Enter a valid email address.";
    return;
  }

  if (!password) {
    loginError.textContent = "Enter your password.";
    return;
  }

  if (!loginUser(email, password)) {
    loginError.textContent = "Invalid email or password.";
    return;
  }

  loginError.textContent = "";
  openDashboard();
});

registerForm.addEventListener("submit", (event) => {
  event.preventDefault();

  const name = byId<HTMLInputElement>("regName").value.trim();
  const email = byId<HTMLInputElement>("regEmail").value.trim();
  const password = byId<HTMLInputElement>("regPassword").value;
  const confirmation = byId<HTMLInputElement>("regConfirmPassword").value;
  registerError.classList.remove("success");

  if (name.length < 2) {
    registerError.textContent = "Enter your full name.";
    return;
  }

  if (!isValidEmail(email)) {
    registerError.textContent = "Enter a valid email address.";
    return;
  }

  if (password.length < 8) {
    registerError.textContent = "Password must be at least 8 characters.";
    return;
  }

  if (password !== confirmation) {
    registerError.textContent = "Passwords do not match.";
    return;
  }

  if (!registerUser(name, email, password)) {
    registerError.textContent = "That email is already registered.";
    return;
  }

  registerForm.reset();
  byId<HTMLInputElement>("loginEmail").value = email;
  showLogin("Account created. You can log in now.");
});

byId<HTMLButtonElement>("showRegisterLink").addEventListener("click", showRegister);
byId<HTMLButtonElement>("showLoginLink").addEventListener("click", () => showLogin());

document.querySelectorAll<HTMLButtonElement>("[data-password-target]").forEach((button) => {
  button.addEventListener("click", () => {
    const targetId = button.dataset.passwordTarget;

    if (!targetId) {
      return;
    }

    const input = byId<HTMLInputElement>(targetId);
    const show = input.type === "password";
    input.type = show ? "text" : "password";
    button.textContent = show ? "Hide" : "Show";
    button.setAttribute("aria-label", `${show ? "Hide" : "Show"} password`);
  });
});

document.querySelectorAll<HTMLButtonElement>(".theme-toggle").forEach((button) => button.addEventListener("click", toggleTheme));

document.querySelectorAll<HTMLButtonElement>(".nav-option[data-view]").forEach((button) => {
  button.addEventListener("click", () => {
    if (isViewName(button.dataset.view)) {
      loadView(button.dataset.view);
    }
  });
});

document.querySelectorAll<HTMLAnchorElement>("[data-nav-view]").forEach((link) => {
  link.addEventListener("click", (event) => {
    event.preventDefault();

    if (isViewName(link.dataset.navView)) {
      loadView(link.dataset.navView);
    }
  });
});

byId<HTMLButtonElement>("menuButton").addEventListener("click", toggleNavigation);
navOverlay.addEventListener("click", closeNavigation);
byId<HTMLButtonElement>("logoutButton").addEventListener("click", logout);
byId<HTMLButtonElement>("profileButton").addEventListener("click", () => loadView("profile"));

notificationButton.addEventListener("click", (event) => {
  event.stopPropagation();
  toggleNotifications();
});
notificationPanel.addEventListener("click", (event) => event.stopPropagation());

byId<HTMLButtonElement>("markReadButton").addEventListener("click", () => {
  byId<HTMLElement>("notificationDot").classList.add("hidden");
  closeNotifications();
  showToast("Notifications marked as read");
});

["desktopSearchForm", "mobileSearchForm"].forEach((formId) => {
  const form = byId<HTMLFormElement>(formId);

  form.addEventListener("submit", (event) => {
    event.preventDefault();
    const input = form.querySelector<HTMLInputElement>("input");

    if (input) {
      submitGlobalSearch(input.value);
    }
  });
});

dynamicContent.addEventListener("click", (event) => {
  const target = eventTargetElement(event.target);

  if (!target) {
    return;
  }

  const goView = target.closest<HTMLElement>("[data-go-view]");
  if (goView) {
    if (isViewName(goView.dataset.goView)) {
      loadView(goView.dataset.goView);
    }
    return;
  }

  const articleButton = target.closest<HTMLElement>("[data-read-article]");
  if (articleButton) {
    openArticle(articleButton.dataset.readArticle);
    return;
  }

  const themeButton = target.closest<HTMLButtonElement>("[data-theme-option]");
  if (themeButton) {
    setTheme(themeButton.dataset.themeOption, true);
    return;
  }

  if (target.closest("#exportReport")) {
    exportReport();
    return;
  }

  if (target.closest("#partnershipButton")) {
    openModal('<h2 id="modalTitle">Partnership program</h2><p class="article-meta">Education · Community · Research</p><p class="modal-copy">Institutional partners can collaborate on certified learning programs, technical events, and original research. Your account manager is available at <strong>partnerships@dashboard.example</strong>.</p>');
    return;
  }

  if (target.closest("#editProfileButton")) {
    profileEditing = true;
    loadView("profile", false);
    byId<HTMLInputElement>("profileName").focus();
    return;
  }

  if (target.closest("#cancelProfileEdit")) {
    profileEditing = false;
    loadView("profile", false);
    return;
  }

  if (target.closest("#openPasswordForm")) {
    byId<HTMLFormElement>("passwordForm").classList.remove("hidden");
    byId<HTMLInputElement>("currentPassword").focus();
    return;
  }

  if (target.closest("#cancelPasswordForm")) {
    const passwordForm = byId<HTMLFormElement>("passwordForm");
    passwordForm.reset();
    passwordForm.classList.add("hidden");
  }
});

dynamicContent.addEventListener("input", (event) => {
  const target = event.target;

  if (!(target instanceof HTMLInputElement) || target.id !== "articleSearch") {
    return;
  }

  articleQuery = target.value;
  const position = target.selectionStart ?? target.value.length;
  dynamicContent.innerHTML = renderArticles();

  const search = byId<HTMLInputElement>("articleSearch");
  search.focus();
  search.setSelectionRange(position, position);
});

dynamicContent.addEventListener("change", (event) => {
  const target = event.target;

  if (target instanceof HTMLSelectElement && target.id === "articleStatus") {
    if (isArticleFilter(target.value)) {
      articleStatus = target.value;
      dynamicContent.innerHTML = renderArticles();
    }
    return;
  }

  if (!(target instanceof HTMLInputElement)) {
    return;
  }

  if (target.id === "emailNotifications") {
    savePreferences({ emailNotifications: target.checked });
    showToast(`Email notifications ${target.checked ? "enabled" : "disabled"}`);
  }

  if (target.id === "compactNavigation") {
    savePreferences({ compactNavigation: target.checked });
    showToast(`Compact navigation ${target.checked ? "enabled" : "disabled"}`);
  }
});

dynamicContent.addEventListener("submit", (event) => {
  event.preventDefault();

  if (!(event.target instanceof HTMLFormElement)) {
    return;
  }

  if (event.target.id === "profileEditForm") {
    const name = byId<HTMLInputElement>("profileName").value.trim();
    const email = byId<HTMLInputElement>("profileEmail").value.trim();
    const message = byId<HTMLParagraphElement>("profileMessage");
    const current = getLoggedUser();

    if (!current) {
      message.textContent = "Please log in again before updating your profile.";
      return;
    }

    if (name.length < 2) {
      message.textContent = "Enter a valid full name.";
      return;
    }

    if (!isValidEmail(email)) {
      message.textContent = "Enter a valid email address.";
      return;
    }

    const users = getUsers();
    const emailAlreadyUsed = users.some(
      (user) => user.email.toLowerCase() === email.toLowerCase() && user.email.toLowerCase() !== current.email.toLowerCase(),
    );

    if (emailAlreadyUsed) {
      message.textContent = "That email is already in use.";
      return;
    }

    const userIndex = users.findIndex((user) => user.email.toLowerCase() === current.email.toLowerCase());

    if (userIndex >= 0) {
      users[userIndex] = { ...users[userIndex], name, email: email.toLowerCase() };
    }

    saveUsers(users);
    setLoggedUser({ name, email: email.toLowerCase() });
    updateUserHeader();
    profileEditing = false;
    loadView("profile", false);
    showToast("Profile updated");
  }

  if (event.target.id === "passwordForm") {
    const currentPassword = byId<HTMLInputElement>("currentPassword").value;
    const newPassword = byId<HTMLInputElement>("newPassword").value;
    const message = byId<HTMLParagraphElement>("passwordMessage");
    const logged = getLoggedUser();

    if (!logged) {
      message.textContent = "Please log in again before changing your password.";
      return;
    }

    const users = getUsers();
    const userIndex = users.findIndex((user) => user.email.toLowerCase() === logged.email.toLowerCase());

    if (userIndex < 0 || users[userIndex].password !== currentPassword) {
      message.textContent = "Current password is incorrect.";
      return;
    }

    if (newPassword.length < 8) {
      message.textContent = "New password must be at least 8 characters.";
      return;
    }

    if (newPassword === currentPassword) {
      message.textContent = "Choose a different password.";
      return;
    }

    users[userIndex].password = newPassword;
    saveUsers(users);
    event.target.reset();
    event.target.classList.add("hidden");
    showToast("Password updated");
  }
});

modal.addEventListener("click", (event) => {
  const target = eventTargetElement(event.target);

  if (target?.closest("[data-close-modal]")) {
    closeModal();
  }
});

document.addEventListener("click", closeNotifications);
document.addEventListener("keydown", (event) => {
  if (event.key === "Escape") {
    closeModal();
    closeNotifications();
    closeNavigation();
  }
});

window.addEventListener("resize", () => {
  if (window.innerWidth > 900) {
    navOverlay.classList.add("hidden");
    navContainer.classList.remove("mobile-open");
    applyPreferences();
  } else {
    navContainer.classList.remove("collapsed");
  }
});

setTheme(localStorage.getItem(THEME_KEY) || getCurrentTheme());
getUsers();

if (getLoggedUser()) {
  openDashboard();
} else {
  authContainer.classList.remove("hidden");
  dashboardContainer.classList.add("hidden");
}
