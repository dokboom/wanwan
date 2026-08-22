// ==========================================
// X (Twitter) 模擬介面與互動系統 - 完整模組
// ==========================================

const X_POSTS_STORAGE_KEY = 'x_user_posts_v1';
const X_SESSION_UID_KEY = 'x_session_uid_v1';
const X_PROFILE_PREFIX = 'x_profile_v1_';

// --- 1. 登入與頁面導航 ---

function showXLoginPage(options) {
  options = options || {};
  var existing = document.getElementById('x-login-page');
  if (existing) existing.remove();
  if (options.replaceExisting) {
    var xPage = document.getElementById('x-page');
    if (xPage) xPage.remove();
    var profilePage = document.getElementById('x-profile-page');
    if (profilePage) profilePage.remove();
    var editPage = document.getElementById('x-profile-edit-page');
    if (editPage) editPage.remove();
  }

  var page = document.createElement('div');
  page.id = 'x-login-page';
  page.className = 'full-page x-login-page';
  if (options.returnToProfile) page.dataset.returnToProfile = '1';
  page.innerHTML =
    '<button class="x-login-close" type="button" aria-label="返回"><i class="fa fa-angle-left"></i></button>' +
    '<div class="x-login-shell">' +
      '<div class="x-login-logo"><svg viewBox="0 0 24 24"><g><path d="M18.244 2.25h3.308l-7.227 8.26 8.502 11.24H16.17l-5.214-6.817L4.99 21.75H1.68l7.73-8.835L1.254 2.25H8.08l4.713 6.231zm-1.161 17.52h1.833L7.084 4.126H5.117z"></path></g></svg></div>' +
      '<div class="x-login-title">登入 X</div>' +
      '<div class="x-login-subtitle">選擇微信帳號繼續</div>' +
      '<button class="x-login-wechat" id="x-login-wechat" type="button">' +
        getxWeChatSvg() +
        '<span>通過微信登入</span>' +
      '</button>' +
      '<div class="x-login-users" id="x-login-users" hidden></div>' +
    '</div>';

  if (window.openPage) {
    window.openPage(page);
  } else {
    var app = document.getElementById('app') || document.body;
    app.appendChild(page);
  }

  page.querySelector('.x-login-close').addEventListener('click', function() {
    closeXLoginPage();
  });
  page.querySelector('#x-login-wechat').addEventListener('click', function() {
    renderXLoginUsers(page);
  });
}

async function renderXLoginUsers(page) { 
  var list = page.querySelector('#x-login-users'); 
  if (!list) return; 
  list.hidden = false; 
  list.innerHTML = '<div class="x-login-loading"><i class="fa fa-spinner fa-spin"></i></div>'; 
  var users = await getXUserList(); 
  if (!users.length) { 
    list.innerHTML = 
      '<div class="x-login-empty">' + 
      '<div>暫無 USER 帳號</div>' + 
      '<span>請先在角色檔案裡創建 USER 類型角色</span>' + 
      '</div>'; 
    return; 
  } 
  list.innerHTML = users.map(function(user) { 
    var name = getXUserName(user); 
    var account = user.identity && user.identity.account ? '@' + user.identity.account : '微信用戶'; 
    return '<button class="x-login-user" type="button" data-uid="' + xEscape(user.id) + '">' + 
      '<span class="x-login-user-avatar">' + getXAvatarHTML(user) + '</span>' + 
      '<span class="x-login-user-main">' + 
      '<span class="x-login-user-name">' + xEscape(name) + '</span>' + 
      '<span class="x-login-user-account">' + xEscape(account) + '</span>' + 
      '</span>' + 
      '<i class="fa fa-angle-right"></i>' + 
      '</button>'; 
  }).join('');

  list.querySelectorAll('.x-login-user').forEach(function(row) { 
    row.addEventListener('click', async function() { 
      var uid = parseInt(row.dataset.uid); 
      var user = users.find(function(item) { return parseInt(item.id) === uid; }); 
      if (!user) return; 
      setXSessionUser(user); 
      var returnToProfile = page.dataset.returnToProfile === '1'; 
      closeXLoginPage(true); 
      if (window.renderXPage) window.renderXPage(user); 
      if (returnToProfile && window.showXProfilePage) window.showXProfilePage(user); 
    }); 
  }); 
}

function closeXLoginPage(immediate) { 
  var page = document.getElementById('x-login-page'); 
  if (!page) return; 
  if (immediate) page.remove(); 
  else if (window.closePage) window.closePage('x-login-page'); 
  else page.remove(); 
}

window.closeXCompose = function() { 
  var page = document.getElementById('x-compose'); 
  if (!page) return; 
  if (window.closePage) window.closePage('x-compose'); 
  else page.remove(); 
};

function closeXProfilePage() { 
  var page = document.getElementById('x-profile-page'); 
  if (!page) return; 
  if (window.closePage) window.closePage('x-profile-page'); 
  else page.remove(); 
}

function closeXProfileEditPage(immediate) { 
  var page = document.getElementById('x-profile-edit-page'); 
  if (!page) return; 
  if (immediate) page.remove(); 
  else if (window.closePage) window.closePage('x-profile-edit-page'); 
  else page.remove(); 
}

function closeXPage() { 
  var page = document.getElementById('x-page'); 
  if (!page) return; 
  if (window.closePage) window.closePage('x-page'); 
  else page.remove(); 
}


// --- 2. 貼文與資料管理 ---

async function getXAllPosts(user) { 
  var customPosts = await getXUserPosts(); 
  var defaultPosts = [ 
    { 
      id: 'default_1', 
      avatar: 'img/wanwan.png', 
      name: '彎彎協會', 
      verified: true, 
      handle: '@Wanwan_Offical', 
      time: '2小時', 
      content: '產品上線請多多關注。#AI #Wanwan', 
      comments: 847, 
      retweets: 203, 
      likes: 3654, 
      views: '28.6萬', 
      bookmarks: 0, 
      shares: 0 
    } 
  ]; 
  return customPosts.concat(defaultPosts); 
}

async function getXUserPosts() { 
  try { 
    if (window.db && db.config) { 
      var row = await db.config.get(X_POSTS_STORAGE_KEY); 
      if (row && Array.isArray(row.value)) return row.value; 
    } 
  } catch (e) {} 
  try { 
    var raw = localStorage.getItem(X_POSTS_STORAGE_KEY); 
    return raw ? JSON.parse(raw) : []; 
  } catch (e2) { 
    return []; 
  } 
}

async function saveXUserPost(user, post) { 
  var posts = await getXUserPosts(); 
  posts.unshift(post);
  try { 
    if (window.db && db.config) { 
      await db.config.put({ key: X_POSTS_STORAGE_KEY, value: posts }); 
      return; 
    } 
  } catch (e) {} 
  localStorage.setItem(X_POSTS_STORAGE_KEY, JSON.stringify(posts)); 
}

async function removeXUserPost(postId) { 
  var posts = await getXUserPosts(); 
  posts = posts.filter(function(p) { return p.id !== postId; });
  try { 
    if (window.db && db.config) { 
      await db.config.put({ key: X_POSTS_STORAGE_KEY, value: posts }); 
      return; 
    } 
  } catch (e) {} 
  localStorage.setItem(X_POSTS_STORAGE_KEY, JSON.stringify(posts)); 
}

async function getXUserList() { 
  if (!window.db || !db.characters) return []; 
  try { 
    return await db.characters.where('type').equals('user').toArray(); 
  } catch (e) { 
    return (await db.characters.toArray()).filter(function(user) { return user.type === 'user'; }); 
  } 
}

async function getXSessionUser() { 
  var stored = localStorage.getItem(X_SESSION_UID_KEY); 
  if (!stored) return null; 
  var uid = parseInt(stored); 
  if (!Number.isFinite(uid)) { 
    localStorage.removeItem(X_SESSION_UID_KEY); 
    return null; 
  } 
  var user = window.getCharacter ? await window.getCharacter(uid) : await db.characters.get(uid); 
  if (!user || user.type !== 'user') { 
    localStorage.removeItem(X_SESSION_UID_KEY); 
    return null; 
  } 
  return user; 
}

function setXSessionUser(user) { 
  if (!user || user.type !== 'user') return; 
  localStorage.setItem(X_SESSION_UID_KEY, user.id); 
}


// --- 3. 個人檔案與設定 ---

function getXUserName(user) { 
  return (user && (user.nick || user.name)) || '微信用戶'; 
}

function getXUserHandle(user) { 
  var account = user && user.identity && user.identity.account; 
  account = account ? String(account).replace(/^@+/, '') : ''; 
  return '@' + (account || getXUserName(user).replace(/\s+/g, '_') || 'User'); 
}

async function getXProfile(user) { 
  var fallback = getXDefaultProfile(user); 
  if (!user || user.id == null) return fallback; 
  var key = X_PROFILE_PREFIX + user.id; 
  try { 
    if (window.db && db.config) { 
      var row = await db.config.get(key); 
      return normalizeXProfile(user, row && row.value); 
    } 
  } catch (e) {} 
  try { 
    var raw = localStorage.getItem(key); 
    return normalizeXProfile(user, raw ? JSON.parse(raw) : null); 
  } catch (e2) { 
    return fallback; 
  } 
}

async function saveXProfile(user, profile) { 
  if (!user || user.id == null) return; 
  var normalized = normalizeXProfile(user, profile); 
  var key = X_PROFILE_PREFIX + user.id; 
  try { 
    if (window.db && db.config) { 
      await db.config.put({ key: key, value: normalized }); 
      return; 
    } 
  } catch (e) {} 
  localStorage.setItem(key, JSON.stringify(normalized)); 
}

function getXDefaultProfile(user) { 
  var join = getXDefaultJoinParts(user); 
  return { 
    backgroundImage: '', 
    avatar: '', 
    name: getXUserName(user), 
    handle: stripXAt(getXUserHandle(user)), 
    joinYear: join.year, 
    joinMonth: join.month, 
    following: '0', 
    followers: '0' 
  }; 
}

function normalizeXProfile(user, profile) { 
  var base = getXDefaultProfile(user); 
  if (!profile || typeof profile !== 'object') return base; 
  return { 
    backgroundImage: profile.backgroundImage || '', 
    avatar: profile.avatar || '', 
    name: String(profile.name || base.name), 
    handle: stripXAt(profile.handle || base.handle), 
    joinYear: normalizeXJoinYear(profile.joinYear || base.joinYear, user), 
    joinMonth: normalizeXJoinMonth(profile.joinMonth || base.joinMonth, user), 
    following: normalizeXCount(profile.following), 
    followers: normalizeXCount(profile.followers) 
  }; 
}

function getXProfileName(user, profile) { 
  return (profile && profile.name) || getXUserName(user); 
}

function getXProfileHandle(user, profile) { 
  var handle = profile && profile.handle ? profile.handle : getXUserHandle(user); 
  return '@' + stripXAt(handle); 
}

function getXProfileAvatarHTML(user, profile) { 
  var name = getXProfileName(user, profile); 
  var avatar = profile && profile.avatar ? profile.avatar : (user && user.avatar); 
  if (avatar) return '<img src="' + xEscape(avatar) + '" alt="' + xEscape(name) + '">'; 
  return buildXDefaultAvatarHTML(name); 
}

function stripXAt(value) { 
  return String(value == null ? '' : value).trim().replace(/^@+/, ''); 
}

function normalizeXCount(value) { 
  var str = String(value == null || value === '' ? '0' : value).trim(); 
  if (/^\d+$/.test(str)) return String(parseInt(str, 10)); 
  return str.replace(/[<>"'&]/g, '').slice(0, 12) || '0'; 
}

function pickXImage(callback) { 
  if (window.showImagePicker) { 
    window.showImagePicker(callback); 
  } else { 
    var fileInput = document.createElement('input'); 
    fileInput.type = 'file'; 
    fileInput.accept = 'image/*'; 
    fileInput.style.display = 'none'; 
    fileInput.addEventListener('change', function(e) { 
      var file = e.target.files[0]; 
      if (!file) return; 
      var reader = new FileReader(); 
      reader.onload = function(evt) { 
        if (callback) callback(evt.target.result); 
      }; 
      reader.readAsDataURL(file); 
    }); 
    document.body.appendChild(fileInput); 
    fileInput.click(); 
    fileInput.remove(); 
  } 
}

function getXDefaultJoinParts(user) { 
  var ts = user && (user.createdAt || user.updatedAt || user.idCreatedAt); 
  var date = ts ? new Date(ts) : new Date(2026, 2, 1); 
  if (isNaN(date.getTime())) date = new Date(2026, 2, 1); 
  return { 
    year: String(date.getFullYear()), 
    month: String(date.getMonth() + 1) 
  }; 
}

function normalizeXJoinYear(value, user) { 
  var fallback = getXDefaultJoinParts(user).year; 
  var year = parseInt(String(value == null ? '' : value).replace(/\D/g, ''), 10); 
  if (!Number.isFinite(year) || year < 1900 || year > 2999) return fallback; 
  return String(year); 
}

function normalizeXJoinMonth(value, user) { 
  var fallback = getXDefaultJoinParts(user).month; 
  var month = parseInt(String(value == null ? '' : value).replace(/\D/g, ''), 10); 
  if (!Number.isFinite(month) || month < 1 || month > 12) return fallback; 
  return String(month); 
}

function getXJoinText(user, profile) { 
  var year = normalizeXJoinYear(profile && profile.joinYear, user); 
  var month = normalizeXJoinMonth(profile && profile.joinMonth, user); 
  return '於 ' + year + '年' + month + '月加入'; 
}

function getXAvatarHTML(user) { 
  var name = getXUserName(user); 
  if (user && user.avatar) return '<img src="' + xEscape(user.avatar) + '" alt="' + xEscape(name) + '">'; 
  return buildXDefaultAvatarHTML(name); 
}

function buildXDefaultAvatarHTML(name) { 
  return '<span class="x-avatar-placeholder">' + xEscape((name || '我').slice(0, 1)) + '</span>'; 
}

function getxWeChatSvg() { 
  return '<svg class="x-login-wechat-svg" viewBox="0 0 576 512" aria-hidden="true"><path d="M385.2 167.6c6.4 0 12.6.3 18.8 1.1C387.4 90.3 303.3 32 207.7 32 100.5 32 13 104.8 13 197.4c0 53.4 29.3 97.5 77.9 131.6l-19.3 58.6 68.1-34.1c24.4 4.8 43.8 9.7 68.2 9.7 6.2 0 12.1-.3 18.3-.8-3.9-12.9-6.2-26.6-6.2-40.8-.1-84.9 72.9-154 165.2-154zM280.7 114.7c14.5 0 24.2 9.7 24.2 24.4 0 14.5-9.7 24.2-24.2 24.2-14.8 0-29.3-9.7-29.3-24.2.1-14.7 14.6-24.4 29.3-24.4zm-136.4 48.6c-14.5 0-29.3-9.7-29.3-24.2 0-14.8 14.8-24.4 29.3-24.4 14.8 0 24.4 9.7 24.4 24.4 0 14.6-9.6 24.2-24.4 24.2zM563 319.4c0-77.9-77.9-141.3-165.4-141.3-92.7 0-165.4 63.4-165.4 141.3s72.8 141.3 165.4 141.3c19.3 0 38.9-5.1 58.6-9.9l53.4 29.3-14.8-48.6C534 402.1 563 363.2 563 319.4zM343.9 294.9c-9.7 0-19.3-9.7-19.3-19.4 0-9.9 9.7-19.6 19.3-19.6 14.8 0 24.4 9.7 24.4 19.6 0 9.7-9.6 19.4-24.4 19.4zm107.1 0c-9.7 0-19.3-9.7-19.3-19.4 0-9.9 9.7-19.6 19.3-19.6 14.8 0 24.4 9.7 24.4 19.6.1 9.7-9.5 19.4-24.4 19.4z"></path></svg>'; 
}

function xEscape(str) { 
  return String(str == null ? '' : str).replace(/[&<>"']/g, function(ch) { 
    return ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[ch]; 
  }); 
}

function formatXNumber(n) { 
  if (typeof n === 'string') return n; 
  if (n >= 10000) return (n / 10000).toFixed(1).replace(/\.0$/, '') + '萬'; 
  return String(n); 
}

function formatXContent(str) { 
  return xEscape(str) 
    .replace(/(#[A-Za-z0-9_\u4e00-\u9fa5]+)/g, '<span class="x-hashtag">$1</span>') 
    .replace(/\n/g, '<br>'); 
}

function getXHeartSvg(solid) { 
  return solid 
    ? '<svg viewBox="0 0 24 24"><g><path d="M20.884 13.19c-1.351 2.48-4.001 5.12-8.379 7.67l-.503.3-.504-.3c-4.379-2.55-7.029-5.19-8.382-7.67-1.36-2.5-1.41-4.86-.514-6.67.887-1.79 2.647-2.91 4.601-3.01 1.651-.09 3.368.56 4.798 2.01 1.429-1.45 3.146-2.1 4.796-2.01 1.954.1 3.714 1.22 4.601 3.01.896 1.81.846 4.17-.514 6.67z"></path></g></svg>' 
    : '<svg viewBox="0 0 24 24"><g><path d="M16.697 5.5c-1.222-.06-2.679.51-3.89 2.16l-.805 1.09-.806-1.09C9.984 6.01 8.526 5.44 7.304 5.5c-1.243.07-2.349.78-2.91 1.91-.552 1.12-.633 2.78.479 4.82 1.074 1.97 3.257 4.27 7.129 6.61 3.87-2.34 6.052-4.64 7.126-6.61 1.111-2.04 1.03-3.7.477-4.82-.561-1.13-1.666-1.84-2.908-1.91zm4.187 7.69c-1.351 2.48-4.001 5.12-8.379 7.67l-.503.3-.504-.3c-4.379-2.55-7.029-5.19-8.382-7.67-1.36-2.5-1.41-4.86-.514-6.67.887-1.79 2.647-2.91 4.601-3.01 1.651-.09 3.368.56 4.798 2.01 1.429-1.45 3.146-2.1 4.796-2.01 1.954.1 3.714 1.22 4.601 3.01.896 1.81.846 4.17-.514 6.67z"></path></g></svg>'; 
}


// --- 4. 互動事件綁定 (點讚、轉推、留言 AI 評論) ---

function bindXPostActions(container, user) {
  var likeButtons = container.querySelectorAll('.x-post-action.like');
  likeButtons.forEach(function(button) {
    button.addEventListener('click', function(e) {
      e.preventDefault();
      e.stopPropagation();
      var postEl = button.closest('.x-post');
      var postId = postEl ? postEl.dataset.postId : null;
      var liked = button.dataset.liked === '1';
      var baseCount = Number(button.dataset.baseCount || button.dataset.count || 0);
      var count = Math.max(0, Number(button.dataset.count || baseCount) + (liked ? -1 : 1));
      
      button.dataset.count = String(count);
      button.dataset.liked = liked ? '0' : '1';
      button.classList.toggle('liked', !liked);
      button.innerHTML = getXHeartSvg(!liked) + '<span>' + formatXNumber(count) + '</span>';

      if (postId && window.saveStoredXAction) {
        window.saveStoredXAction(postId, 'liked', !liked);
        window.saveStoredXAction(postId, 'likeCount', count);
      }
    });
  });

  var retweetButtons = container.querySelectorAll('.x-post-action.retweet');
  retweetButtons.forEach(function(button) {
    button.addEventListener('click', function(e) {
      e.preventDefault();
      e.stopPropagation();
      var postEl = button.closest('.x-post');
      var postId = postEl ? postEl.dataset.postId : null;
      var retweeted = button.dataset.retweeted === '1';
      var baseCount = Number(button.dataset.baseCount || button.dataset.count || 0);
      var count = Math.max(0, Number(button.dataset.count || baseCount) + (retweeted ? -1 : 1));
      
      button.dataset.count = String(count);
      button.dataset.retweeted = retweeted ? '0' : '1';
      button.classList.toggle('retweeted', !retweeted);
      var span = button.querySelector('span');
      if (span) span.textContent = formatXNumber(count);

      if (postId && window.saveStoredXAction) {
        window.saveStoredXAction(postId, 'retweeted', !retweeted);
        window.saveStoredXAction(postId, 'retweetCount', count);
      }
    });
  });

  var bookmarkButtons = container.querySelectorAll('.x-post-action.bookmark');
  bookmarkButtons.forEach(function(button) {
    button.addEventListener('click', function(e) {
      e.preventDefault();
      e.stopPropagation();
      var postEl = button.closest('.x-post');
      var postId = postEl ? postEl.dataset.postId : null;
      var bookmarked = button.dataset.bookmarked === '1';
      
      button.dataset.bookmarked = bookmarked ? '0' : '1';
      button.classList.toggle('bookmarked', !bookmarked);

      if (postId && window.saveStoredXAction) {
        window.saveStoredXAction(postId, 'bookmarked', !bookmarked);
      }
    });
  });

  // 點擊留言按鈕：展開/收合 AI 評論與手動輸入框
  var commentButtons = container.querySelectorAll('.x-post-action.comment');
  commentButtons.forEach(function(button) {
    button.addEventListener('click', async function(e) {
      e.preventDefault();
      e.stopPropagation();
      var postEl = button.closest('.x-post');
      if (!postEl) return;
      
      var commentsSection = postEl.querySelector('.x-post-comments-section');
      if (!commentsSection) return;

      if (!commentsSection.dataset.init) {
        commentsSection.dataset.init = 'true';
        commentsSection.innerHTML = 
          '<div class="x-comments-list" style="font-size:13px; color:#8899a6; margin-bottom: 10px;">尚無留言，正在生成 AI 評論...</div>' +
          '<div style="display: flex; gap: 8px; align-items: center; border-top: 1px solid rgba(255,255,255,0.1); padding-top: 8px;">' +
            '<input type="text" class="x-quick-reply-input" placeholder="回覆這篇推文..." style="flex: 1; background: #202327; border: 1px solid #38444d; border-radius: 20px; padding: 6px 12px; color: #fff; font-size: 13px; outline: none;" />' +
            '<button class="x-quick-reply-btn" style="background: #1d9bf0; color: #fff; border: none; padding: 6px 12px; border-radius: 20px; font-weight: bold; cursor: pointer; font-size: 12px;">回覆</button>' +
          '</div>';
      }

      var commentsList = commentsSection.querySelector('.x-comments-list');
      var replyInput = commentsSection.querySelector('.x-quick-reply-input');
      var replyBtn = commentsSection.querySelector('.x-quick-reply-btn');

      if (commentsSection.style.display === 'none' || !commentsSection.style.display) {
        commentsSection.style.display = 'block';

        if (!commentsSection.dataset.loaded) {
          commentsList.innerHTML = '🤖 AI 正在生成評論...';
          try {
            var postContentEl = postEl.querySelector('.x-post-content');
            var postContent = postContentEl ? postContentEl.innerText : '';
            var prompt = '請針對這篇推文生成 2 到 3 則簡短有趣的網友留言或回覆：\n"' + postContent + '"\n請直接回傳文字，每則留言換行。';
            
            var raw = window.callAI ? await window.callAI([{ role: 'user', content: prompt }], { temperature: 0.7 }) : '支援一下！\n寫得真好！';
            
            if (raw) {
              var lines = raw.split('\n').filter(function(l) { return l.trim(); });
              var html = '';
              lines.forEach(function(line) {
                html += '<div style="margin-bottom: 6px; line-height: 1.4;"><span style="color: #1d9bf0; font-weight: bold; margin-right: 6px;">網友</span><span style="color: #fff;">' + line.replace(/^[-*•\d+.]\s*/, '') + '</span></div>';
              });
              commentsList.innerHTML = html;
              commentsSection.dataset.loaded = 'true';
            } else {
              commentsList.innerHTML = '暫無新評論';
            }
          } catch (err) {
            console.error('生成評論失敗', err);
            commentsList.innerHTML = '生成評論失敗';
          }
        }

        if (replyBtn && replyInput && !replyBtn.dataset.bound) {
          replyBtn.dataset.bound = 'true';
          replyBtn.addEventListener('click', function(subE) {
            subE.stopPropagation();
            var text = replyInput.value.trim();
            if (!text) return;

            var userReplyHTML = '<div style="margin-bottom: 6px; line-height: 1.4;"><span style="color: #00ba7c; font-weight: bold; margin-right: 6px;">你</span><span style="color: #fff;">' + xEscape(text) + '</span></div>';
            
            if (commentsList.innerHTML.includes('尚無留言') || commentsList.innerHTML.includes('正在生成')) {
              commentsList.innerHTML = userReplyHTML;
            } else {
              commentsList.innerHTML += userReplyHTML;
            }

            replyInput.value = '';
            if (window.toast) window.toast('回覆成功！');
          });
        }

      } else {
        commentsSection.style.display = 'none';
      }
    });
  });

  var deleteButtons = container.querySelectorAll('.x-post-delete-btn');
  deleteButtons.forEach(function(button) {
    button.addEventListener('click', async function(e) {
      e.preventDefault();
      e.stopPropagation();
      var postEl = button.closest('.x-post');
      var postId = postEl ? postEl.dataset.postId : null;
      if (postId && user) {
        await removeXUserPost(postId);
        if (postEl) postEl.remove();
        if (window.toast) window.toast('貼文已成功刪除');
      }
    });
  });
}


// --- 5. 底部導覽列 ---

function buildXBottomBar() { 
  var items = [ 
    { 
      id: 'home', 
      active: true, 
      defaultSvg: '<svg viewBox="0 0 24 24"><g><path d="M21.591 7.146L12.52 1.157c-.316-.21-.724-.21-1.04 0l-9.071 5.99c-.26.173-.409.456-.409.757v13.183c0 .502.418.913.929.913h6.638c.511 0 .929-.41.929-.913v-7.075h3.008v7.075c0 .502.418.913.929.913h6.638c.511 0 .929-.41.929-.913V7.904c0-.301-.158-.584-.408-.758zM20 20l-4.5.01v-7.09c0-.5-.418-.91-.929-.91H9.43c-.511 0-.929.41-.929.91L8.5 20H4V8.773l8-5.27 8 5.271V20z"></path></g></svg>', 
      activeSvg: '<svg viewBox="0 0 24 24"><g><path d="M21.591 7.146L12.52 1.157c-.316-.21-.724-.21-1.04 0l-9.071 5.99c-.26.173-.409.456-.409.757v13.183c0 .502.418.913.929.913H9.14c.511 0 .929-.41.929-.913v-7.075h3.862v7.075c0 .502.418.913.929.913h6.141c.511 0 .929-.41.929-.913V7.904c0-.301-.158-.584-.408-.758z"></path></g></svg>' 
    }, 
    { 
      id: 'search', 
      active: false, 
      defaultSvg: '<svg viewBox="0 0 24 24"><g><path d="M10.25 3.75c-3.59 0-6.5 2.91-6.5 6.5s2.91 6.5 6.5 6.5c1.795 0 3.419-.726 4.596-1.904 1.178-1.177 1.904-2.801 1.904-4.596 0-3.59-2.91-6.5-6.5-6.5zm-8.5 6.5c0-4.694 3.806-8.5 8.5-8.5s8.5 3.806 8.5 8.5c0 1.986-.682 3.815-1.824 5.262l4.781 4.781-1.414 1.414-4.781-4.781c-1.447 1.142-3.276 1.824-5.262 1.824-4.694 0-8.5-3.806-8.5-8.5z"></path></g></svg>', 
      activeSvg: '<svg viewBox="0 0 24 24"><g><path d="M10.25 3.75c-3.59 0-6.5 2.91-6.5 6.5s2.91 6.5 6.5 6.5c1.795 0 3.419-.726 4.596-1.904 1.178-1.177 1.904-2.801 1.904-4.596 0-3.59-2.91-6.5-6.5-6.5zm-8.5 6.5c0-4.694 3.806-8.5 8.5-8.5s8.5 3.806 8.5 8.5c0 1.986-.682 3.815-1.824 5.262l4.781 4.781-1.414 1.414-4.781-4.781c-1.447 1.142-3.276 1.824-5.262 1.824-4.694 0-8.5-3.806-8.5-8.5z" stroke="currentColor" stroke-width="1.5"></path></g></svg>' 
    }, 
    { 
      id: 'notifications', 
      active: false, 
      defaultSvg: '<svg viewBox="0 0 24 24"><g><path d="M19.993 9.042C19.48 5.017 16.054 2 11.996 2s-7.49 3.021-7.999 7.051L2.866 18H7.1c.463 2.282 2.481 4 4.9 4s4.435-1.718 4.9-4h4.236l-1.143-8.958zM12 20c-1.306 0-2.417-.835-2.829-2h5.658c-.412 1.165-1.523 2-2.829 2zm-6.866-4l.847-6.698C6.364 6.272 8.941 4 11.996 4s5.627 2.268 6.013 5.295L18.858 16H5.134z"></path></g></svg>', 
      activeSvg: '<svg viewBox="0 0 24 24"><g><path d="M11.996 2c-4.062 0-7.49 3.021-7.999 7.051L2.866 18H7.1c.463 2.282 2.481 4 4.9 4s4.435-1.718 4.9-4h4.236l-1.143-8.958C19.48 5.017 16.054 2 11.996 2zM9.171 18h5.658c-.412 1.165-1.523 2-2.829 2s-2.417-.835-2.829-2z"></path></g></svg>' 
    }, 
    { 
      id: 'messages', 
      active: false, 
      defaultSvg: '<svg viewBox="0 0 24 24"><g><path d="M1.998 5.5c0-1.381 1.119-2.5 2.5-2.5h15c1.381 0 2.5 1.119 2.5 2.5v13c0 1.381-1.119 2.5-2.5 2.5h-15c-1.381 0-2.5-1.119-2.5-2.5v-13zm2.5-.5c-.276 0-.5.224-.5.5v2.764l8 5.333 8-5.333V5.5c0-.276-.224-.5-.5-.5h-15zm15.5 5.463l-8 5.334-8-5.334V18.5c0 .276.224.5.5.5h15c.276 0 .5-.224.5-.5v-8.037z"></path></g></svg>', 
      activeSvg: '<svg viewBox="0 0 24 24"><g><path d="M1.998 5.5c0-1.381 1.119-2.5 2.5-2.5h15c1.381 0 2.5 1.119 2.5 2.5v13c0 1.381-1.119 2.5-2.5 2.5h-15c-1.381 0-2.5-1.119-2.5-2.5v-13zm2.5-.5c-.276 0-.5.224-.5.5v2.764l8 5.333 8-5.333V5.5c0-.276-.224-.5-.5-.5h-15zm15.5 5.463l-8 5.334-8-5.334V18.5c0 .276.224.5.5.5h15c.276 0 .5-.224.5-.5v-8.037z" stroke="currentColor" stroke-width="1"></path></g></svg>' 
    } 
  ]; 

  return items.map(function(item) { 
    return '<button class="x-bottombar-item ' + (item.active ? 'active' : '') + '" data-tab="' + item.id + '">' + 
      '<span class="x-icon-default">' + item.defaultSvg + '</span>' + 
      '<span class="x-icon-active">' + item.activeSvg + '</span>' + 
      '</button>'; 
  }).join(''); 
}
