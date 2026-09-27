/**
 * 用户认证与积分 — 全站共享
 * token 存 localStorage，API 请求自动带 Authorization
 */
const Auth = (() => {
  const TOKEN_KEY = "mh252n_token"
  const USER_KEY = "mh252n_user"

  function getToken() {
    return localStorage.getItem(TOKEN_KEY)
  }

  function getUser() {
    try {
      const raw = localStorage.getItem(USER_KEY)
      return raw ? JSON.parse(raw) : null
    } catch {
      return null
    }
  }

  function setSession(token, user) {
    localStorage.setItem(TOKEN_KEY, token)
    localStorage.setItem(USER_KEY, JSON.stringify(user))
    window.dispatchEvent(new CustomEvent("authchange", { detail: { user } }))
  }

  function clearSession() {
    localStorage.removeItem(TOKEN_KEY)
    localStorage.removeItem(USER_KEY)
    window.dispatchEvent(new CustomEvent("authchange", { detail: { user: null } }))
  }

  function authHeaders(extra = {}) {
    const headers = { ...extra }
    const token = getToken()
    if (token) headers.Authorization = `Bearer ${token}`
    return headers
  }

  async function api(url, options = {}) {
    const res = await fetch(url, {
      ...options,
      headers: authHeaders({
        "Content-Type": "application/json",
        ...(options.headers || {})
      }),
      credentials: "include"
    })
    return res.json()
  }

  async function refreshMe() {
    const data = await api("/api/auth/me")
    if (data.loggedIn && data.user) {
      const token = getToken()
      if (token) setSession(token, data.user)
      return data.user
    }
    clearSession()
    return null
  }

  async function login(username, password) {
    const data = await api("/api/auth/login", {
      method: "POST",
      body: JSON.stringify({ username, password })
    })
    if (data.success) setSession(data.token, data.user)
    return data
  }

  async function register(username, password, nickname) {
    const data = await api("/api/auth/register", {
      method: "POST",
      body: JSON.stringify({ username, password, nickname })
    })
    if (data.success) setSession(data.token, data.user)
    return data
  }

  async function logout() {
    await api("/api/auth/logout", { method: "POST" })
    clearSession()
  }

  function isLoggedIn() {
    return !!getToken() && !!getUser()
  }

  /** 渲染顶部用户栏到指定容器 */
  function renderUserBar(container, options = {}) {
    if (!container) return
    const user = getUser()
    const showPoints = options.showPoints !== false

    if (user) {
      container.innerHTML = `
        <div class="auth-bar logged-in">
          <span class="auth-nickname">${escapeHtml(user.nickname || user.username)}</span>
          ${showPoints ? `<span class="auth-points"><i class="fas fa-coins"></i> ${user.points || 0} 积分</span>` : ""}
          <a href="/user-center.html" class="auth-link">个人中心</a>
          <a href="/points-earn.html" class="auth-link earn-link">赚积分</a>
          <button type="button" class="auth-logout-btn" id="authLogoutBtn">退出</button>
        </div>`
      container.querySelector("#authLogoutBtn")?.addEventListener("click", async () => {
        await logout()
        renderUserBar(container, options)
      })
    } else {
      container.innerHTML = `
        <div class="auth-bar logged-out">
          <a href="/login.html" class="auth-login-btn">登录 / 注册</a>
          <a href="/points-earn.html" class="auth-link">赚积分</a>
        </div>`
    }
  }

  function escapeHtml(str) {
    const d = document.createElement("div")
    d.textContent = str
    return d.innerHTML
  }

  /** 注入通用用户栏样式 */
  function injectStyles() {
    if (document.getElementById("auth-bar-styles")) return
    const style = document.createElement("style")
    style.id = "auth-bar-styles"
    style.textContent = `
      .auth-bar-wrap { position: fixed; top: 12px; right: 16px; z-index: 9999; }
      .auth-bar { display: flex; align-items: center; gap: 10px; flex-wrap: wrap;
        background: rgba(0,0,0,0.65); backdrop-filter: blur(8px);
        padding: 8px 14px; border-radius: 40px; font-size: 0.85rem; }
      .auth-nickname { color: #a3e635; font-weight: 600; }
      .auth-points { color: #ffd966; }
      .auth-link { color: #ccc; text-decoration: none; }
      .auth-link:hover { color: #fff; }
      .auth-login-btn, .auth-logout-btn {
        background: linear-gradient(95deg, #7cb518, #5a9e0e);
        border: none; color: #fff; padding: 6px 14px; border-radius: 20px;
        cursor: pointer; font-size: 0.85rem; text-decoration: none; }
      .auth-logout-btn { background: rgba(255,255,255,0.15); }
      .earn-link { color: #ffd966 !important; font-weight: 600; }
      @media (max-width: 550px) {
        .auth-bar-wrap { top: 8px; right: 8px; left: 8px; }
        .auth-bar { justify-content: center; font-size: 0.75rem; padding: 6px 10px; }
      }
    `
    document.head.appendChild(style)
  }

  function mountUserBar(options = {}) {
    injectStyles()
    let wrap = document.getElementById("authBarWrap")
    if (!wrap) {
      wrap = document.createElement("div")
      wrap.id = "authBarWrap"
      wrap.className = "auth-bar-wrap"
      document.body.prepend(wrap)
    }
    renderUserBar(wrap, options)
    window.addEventListener("authchange", () => renderUserBar(wrap, options))
    refreshMe().then(() => renderUserBar(wrap, options))
  }

  return {
    getToken, getUser, setSession, clearSession,
    authHeaders, api, refreshMe, login, register, logout,
    isLoggedIn, renderUserBar, mountUserBar, escapeHtml
  }
})()
