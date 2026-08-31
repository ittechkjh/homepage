
// ====================================================
// Section 3: Full Page Cafe Style Forum Engine
// ====================================================
let activeCategory = 'all';
let currentCafePostId = null;
let currentCafeImageData = null;
let isCafeEditMode = false;

function showForumListView() {
  const listView = document.getElementById('forum-list-view');
  const detailView = document.getElementById('forum-detail-view');
  const writeView = document.getElementById('forum-write-view');

  if (listView) listView.classList.remove('hidden');
  if (detailView) detailView.classList.add('hidden');
  if (writeView) writeView.classList.add('hidden');

  currentCafePostId = null;
  currentCafeImageData = null;
  isCafeEditMode = false;
  renderForumPosts();
  window.scrollTo({ top: 0, behavior: 'smooth' });
}
window.showForumListView = showForumListView;

function showForumWriteView(editPostId = null) {
  const listView = document.getElementById('forum-list-view');
  const detailView = document.getElementById('forum-detail-view');
  const writeView = document.getElementById('forum-write-view');

  if (listView) listView.classList.add('hidden');
  if (detailView) detailView.classList.add('hidden');
  if (writeView) writeView.classList.remove('hidden');

  const heading = document.getElementById('cafe-editor-heading');
  const submitBtn = document.getElementById('cafe-write-submit-btn');
  const titleInput = document.getElementById('cafe-write-title');
  const editor = document.getElementById('cafe-write-content');
  const catSelect = document.getElementById('cafe-write-category');

  if (editPostId) {
    isCafeEditMode = true;
    currentCafePostId = editPostId;
    const posts = getStoredPosts();
    const post = posts.find(p => p.id === editPostId);
    if (post) {
      if (heading) heading.innerText = '게시글 수정하기';
      if (submitBtn) submitBtn.innerHTML = '<i data-lucide="check" class="w-4 h-4"></i> 수정 내용 저장하기';
      if (titleInput) titleInput.value = post.title || '';
      if (editor) editor.innerHTML = post.content || '';
      if (catSelect) catSelect.value = post.category || 'general';
    }
  } else {
    isCafeEditMode = false;
    currentCafePostId = null;
    if (heading) heading.innerText = '커뮤니티 게시글 작성';
    if (submitBtn) submitBtn.innerHTML = '<i data-lucide="send" class="w-4 h-4"></i> 게시글 등록 완료';
    if (titleInput) titleInput.value = '';
    if (editor) editor.innerHTML = '<p>자신의 분석, 생각, 매매 일지, 질문 내용을 자유롭게 작성하세요...</p>';
    if (catSelect) catSelect.value = 'general';
  }

  if (titleInput) setTimeout(() => titleInput.focus(), 100);
  if (typeof lucide !== 'undefined') lucide.createIcons();
  window.scrollTo({ top: 0, behavior: 'smooth' });
}
window.showForumWriteView = showForumWriteView;

function openPostDetailModal(postId) {
  // Seamlessly switch to Full Page Cafe Detail View!
  const listView = document.getElementById('forum-list-view');
  const detailView = document.getElementById('forum-detail-view');
  const writeView = document.getElementById('forum-write-view');

  if (listView) listView.classList.add('hidden');
  if (writeView) writeView.classList.add('hidden');
  if (detailView) detailView.classList.remove('hidden');

  const posts = getStoredPosts();
  const post = posts.find(p => p.id === postId);
  if (!post) return;

  currentCafePostId = postId;
  currentViewingPostId = postId;
  post.views = (post.views || 0) + 1;
  saveStoredPosts(posts);

  const catEl = document.getElementById('cafe-post-category');
  const titleEl = document.getElementById('cafe-post-title');
  const authorEl = document.getElementById('cafe-post-author');
  const timeEl = document.getElementById('cafe-post-time');
  const viewsEl = document.getElementById('cafe-post-views');
  const contentEl = document.getElementById('cafe-post-content');
  const upvotesEl = document.getElementById('cafe-post-upvotes');

  if (catEl) catEl.innerText = post.categoryName;
  if (titleEl) titleEl.innerText = post.title;
  if (authorEl) authorEl.innerText = `${post.author} (${post.authorRank || 'Member'})`;
  if (timeEl) timeEl.innerText = post.time;
  if (viewsEl) viewsEl.innerText = post.views;
  if (contentEl) contentEl.innerHTML = post.content;
  if (upvotesEl) upvotesEl.innerText = post.upvotes || 0;

  const imgContainer = document.getElementById('cafe-post-image-container');
  const imgElement = document.getElementById('cafe-post-image');
  if (imgContainer && imgElement) {
    if (post.image) {
      imgElement.src = post.image;
      imgContainer.classList.remove('hidden');
    } else {
      imgElement.src = '';
      imgContainer.classList.add('hidden');
    }
  }

  // Author / Admin Controls
  const controlsEl = document.getElementById('cafe-post-author-controls');
  const storedUser = localStorage.getItem('coinhub_user') || localStorage.getItem('cryptopnl_user');
  let currentUsername = '';
  let isAdmin = sessionStorage.getItem('coinhub_admin_authenticated') === '1' || sessionStorage.getItem('cryptopnl_admin_authenticated') === '1';
  if (storedUser) {
    try {
      const u = JSON.parse(storedUser);
      if (u && u.username) currentUsername = u.username;
    } catch(e) {}
  }

  const isAuthor = (currentUsername && currentUsername === post.author) || isAdmin;

  if (controlsEl) {
    if (isAuthor) {
      controlsEl.innerHTML = `
        <button onclick="showForumWriteView(${post.id})" class="px-3.5 py-1.5 rounded-xl bg-navy-950 hover:bg-cyan-500 hover:text-navy-950 text-cyan-300 border border-cyan-500/40 text-xs font-bold transition flex items-center gap-1.5">
          <i data-lucide="edit-3" class="w-3.5 h-3.5"></i> 수정
        </button>
        <button onclick="handleDeleteCafePost(${post.id})" class="px-3.5 py-1.5 rounded-xl bg-rose-950/60 hover:bg-rose-600 text-rose-300 hover:text-white border border-rose-500/40 text-xs font-bold transition flex items-center gap-1.5">
          <i data-lucide="trash-2" class="w-3.5 h-3.5"></i> 삭제
        </button>
      `;
      controlsEl.classList.remove('hidden');
    } else {
      controlsEl.innerHTML = '';
      controlsEl.classList.add('hidden');
    }
  }

  renderCafeComments(post.comments || []);
  if (typeof lucide !== 'undefined') lucide.createIcons();
  window.scrollTo({ top: 0, behavior: 'smooth' });
}
window.openPostDetailModal = openPostDetailModal;

function renderCafeComments(comments) {
  const container = document.getElementById('cafe-comments-list');
  const countEl = document.getElementById('cafe-comments-count');
  if (countEl) countEl.innerText = comments.length;
  if (!container) return;

  if (comments.length === 0) {
    container.innerHTML = '<div class="p-6 text-center text-slate-500 text-xs bg-navy-950 rounded-2xl border border-navy-800">첫 번째 댓글을 작성하여 소통을 시작해 보세요!</div>';
    return;
  }

  container.innerHTML = comments.map(c => `
    <div class="bg-navy-950 p-4 rounded-2xl border border-navy-800 text-xs space-y-1.5">
      <div class="flex justify-between items-center text-slate-400">
        <span class="font-bold text-slate-200 text-sm">${escapeHtml(c.author)}</span>
        <span class="text-xs text-slate-500 font-mono">${escapeHtml(c.time)}</span>
      </div>
      <p class="text-slate-200 text-sm leading-relaxed">${escapeHtml(c.text)}</p>
    </div>
  `).join('');
}

function handleCafeAddComment() {
  if (!currentCafePostId) return;
  const input = document.getElementById('cafe-new-comment-input');
  const text = input ? input.value.trim() : '';
  if (!text) return;

  const posts = getStoredPosts();
  const post = posts.find(p => p.id === currentCafePostId);
  if (!post) return;

  const storedUser = localStorage.getItem('coinhub_user') || localStorage.getItem('cryptopnl_user');
  let author = '익명 트레이더';
  if (storedUser) {
    try {
      const u = JSON.parse(storedUser);
      if (u && u.username) author = u.username;
    } catch(e) {}
  }

  if (!post.comments) post.comments = [];
  post.comments.push({
    id: Date.now(),
    author: author,
    text: text,
    time: '방금 전'
  });

  saveStoredPosts(posts);
  if (input) input.value = '';
  renderCafeComments(post.comments);
}
window.handleCafeAddComment = handleCafeAddComment;

function handleDeleteCafePost(postId) {
  if (!confirm('정말로 이 게시글을 삭제하시겠습니까?')) return;
  let posts = getStoredPosts();
  posts = posts.filter(p => p.id !== postId);
  saveStoredPosts(posts);
  alert('🗑️ 게시글이 삭제되었습니다.');
  showForumListView();
}
window.handleDeleteCafePost = handleDeleteCafePost;

function handleCafeImageSelect(event) {
  const file = event.target.files[0];
  if (!file) return;
  processCafeImageBlob(file);
}
window.handleCafeImageSelect = handleCafeImageSelect;

function insertInlineImageIntoEditor(base64Data) {
  const editor = document.getElementById('cafe-write-content');
  if (!editor) return;

  const imgHtml = `<div class="my-4 text-center"><img src="${base64Data}" class="max-h-[500px] w-auto max-w-full rounded-2xl border border-navy-700 shadow-2xl inline-block object-contain" alt="첨부 이미지"></div><p><br></p>`;

  // Focus and insert at cursor
  editor.focus();
  const sel = window.getSelection();
  if (sel && sel.rangeCount > 0) {
    const range = sel.getRangeAt(0);
    range.deleteContents();
    const tempDiv = document.createElement('div');
    tempDiv.innerHTML = imgHtml;
    const frag = document.createDocumentFragment();
    let node, lastNode;
    while ((node = tempDiv.firstChild)) {
      lastNode = frag.appendChild(node);
    }
    range.insertNode(frag);
    if (lastNode) {
      range.setStartAfter(lastNode);
      range.collapse(true);
      sel.removeAllRanges();
      sel.addRange(range);
    }
  } else {
    editor.innerHTML += imgHtml;
  }
}

function processCafeImageBlob(file) {
  if (!file || !file.type.startsWith('image/')) return;
  if (file.size > 5 * 1024 * 1024) {
    alert('이미지 용량은 최대 5MB까지 업로드 가능합니다.');
    return;
  }

  const reader = new FileReader();
  reader.onload = function(e) {
    const img = new Image();
    img.onload = function() {
      const canvas = document.createElement('canvas');
      let width = img.width;
      let height = img.height;
      const maxDim = 1400;

      if (width > maxDim || height > maxDim) {
        if (width > height) {
          height = Math.round((height * maxDim) / width);
          width = maxDim;
        } else {
          width = Math.round((width * maxDim) / height);
          height = maxDim;
        }
      }

      canvas.width = width;
      canvas.height = height;
      const ctx = canvas.getContext('2d');
      ctx.drawImage(img, 0, 0, width, height);

      const base64 = canvas.toDataURL('image/jpeg', 0.85);
      insertInlineImageIntoEditor(base64);
    };
    img.src = e.target.result;
  };
  reader.readAsDataURL(file);
}

function removeCafeImage(event) {
  if (event && event.stopPropagation) event.stopPropagation();
  currentCafeImageData = null;
  const fileInput = document.getElementById('cafe-write-image-file');
  if (fileInput) fileInput.value = '';
  const previewContainer = document.getElementById('cafe-write-image-preview-container');
  if (previewContainer) {
    previewContainer.classList.add('hidden');
    previewContainer.style.display = 'none';
  }
}
window.removeCafeImage = removeCafeImage;

function handleCafeSubmitPost(e) {
  if (e && e.preventDefault) e.preventDefault();
  const catSelect = document.getElementById('cafe-write-category');
  const titleInput = document.getElementById('cafe-write-title');
  const editor = document.getElementById('cafe-write-content');

  const category = catSelect ? catSelect.value : 'general';
  const title = titleInput ? titleInput.value.trim() : '';
  const content = editor ? editor.innerHTML.trim() : '';

  if (!title || !content || content === '<p><br></p>' || content === '<br>') {
    alert('제목과 본문 내용을 모두 작성해 주세요.');
    return;
  }

  const categoryNames = {
    general: '💬 자유 토론',
    market: '📊 차트/기술적 분석',
    altcoin: '🚀 알트코인 분석',
    ico: '🪙 ICO / 신규 토큰',
    qna: '❓ 초보 Q&A'
  };

  const storedUser = localStorage.getItem('coinhub_user') || localStorage.getItem('cryptopnl_user');
  let authorName = '익명 트레이더';
  let authorRank = 'PRO';
  if (storedUser) {
    try {
      const u = JSON.parse(storedUser);
      if (u && u.username) {
        authorName = u.username;
        authorRank = u.rank || 'MEMBER';
      }
    } catch(err) {}
  }

  const posts = getStoredPosts();

  if (isCafeEditMode && currentCafePostId) {
    const post = posts.find(p => p.id === currentCafePostId);
    if (post) {
      post.category = category;
      post.categoryName = categoryNames[category] || '💬 자유 토론';
      post.title = title;
      post.content = content;
      post.time = '수정됨 (방금 전)';
      saveStoredPosts(posts);
      alert('✏️ 게시글이 성공적으로 수정되었습니다!');
      openPostDetailModal(currentCafePostId);
      return;
    }
  }

  const newPost = {
    id: Date.now(),
    category,
    categoryName: categoryNames[category] || '💬 자유 토론',
    title,
    content,
    author: authorName,
    authorRank: authorRank,
    upvotes: 1,
    views: 1,
    time: '방금 전',
    timestamp: Date.now(),
    comments: []
  };

  posts.unshift(newPost);
  saveStoredPosts(posts);

  alert('🎉 게시글이 성공적으로 등록되었습니다!');
  showForumListView();
}
window.handleCafeSubmitPost = handleCafeSubmitPost;



function processImageBlob(file, isEdit = false) {
  if (!file || !file.type.startsWith('image/')) return;
  if (file.size > 5 * 1024 * 1024) {
    alert('이미지 용량은 최대 5MB까지 가능합니다.');
    return;
  }

  const reader = new FileReader();
  reader.onload = function(e) {
    const img = new Image();
    img.onload = function() {
      const canvas = document.createElement('canvas');
      let width = img.width;
      let height = img.height;
      const maxDim = 1200;

      if (width > maxDim || height > maxDim) {
        if (width > height) {
          height = Math.round((height * maxDim) / width);
          width = maxDim;
        } else {
          width = Math.round((width * maxDim) / height);
          height = maxDim;
        }
      }

      canvas.width = width;
      canvas.height = height;
      const ctx = canvas.getContext('2d');
      ctx.drawImage(img, 0, 0, width, height);

      const base64Data = canvas.toDataURL('image/jpeg', 0.85);

      if (isEdit) {
        currentEditPostImageData = base64Data;
        const previewContainer = document.getElementById('edit-post-image-preview-container');
        const previewImg = document.getElementById('edit-post-image-preview');
        const compressInfo = document.getElementById('edit-post-image-compress-info');
        if (previewImg) previewImg.src = base64Data;
        if (compressInfo) compressInfo.innerHTML = `<span class="text-cyan-400 font-bold">✓ 사진 첨부됨 (붙여넣기)</span> <span class="text-slate-500 font-mono">(${width}x${height}px)</span>`;
        if (previewContainer) {
          previewContainer.classList.remove('hidden');
          previewContainer.style.display = 'block';
        }
      } else {
        currentPostImageData = base64Data;
        const previewContainer = document.getElementById('post-image-preview-container');
        const previewImg = document.getElementById('post-image-preview');
        const compressInfo = document.getElementById('post-image-compress-info');
        if (previewImg) previewImg.src = base64Data;
        if (compressInfo) compressInfo.innerHTML = `<span class="text-cyan-400 font-bold">✓ 사진 첨부됨 (붙여넣기)</span> <span class="text-slate-500 font-mono">(${width}x${height}px)</span>`;
        if (previewContainer) {
          previewContainer.classList.remove('hidden');
          previewContainer.style.display = 'block';
        }
      }
    };
    img.src = e.target.result;
  };
  reader.readAsDataURL(file);
}

function handlePostImageSelect(event) {
  const file = event.target.files[0];
  if (file) processImageBlob(file, false);
}

function handleEditPostImageSelect(event) {
  const file = event.target.files[0];
  if (file) processImageBlob(file, true);
}

function removePostImage(event) {
  if (event && event.stopPropagation) event.stopPropagation();
  currentPostImageData = null;
  const fileInput = document.getElementById('post-image-file');
  if (fileInput) fileInput.value = '';
  const previewContainer = document.getElementById('post-image-preview-container');
  if (previewContainer) {
    previewContainer.classList.add('hidden');
    previewContainer.style.display = 'none';
  }
}

function removeEditPostImage(event) {
  if (event && event.stopPropagation) event.stopPropagation();
  currentEditPostImageData = null;
  const fileInput = document.getElementById('edit-post-image-file');
  if (fileInput) fileInput.value = '';
  const previewContainer = document.getElementById('edit-post-image-preview-container');
  if (previewContainer) {
    previewContainer.classList.add('hidden');
    previewContainer.style.display = 'none';
  }
}

let currentEditPostImageData = null;
let currentEditingPostId = null;

// Post Edit & Delete Handlers
function openEditPostModal(postId) {
  const posts = getStoredPosts();
  const post = posts.find(p => p.id === postId);
  if (!post) return;

  currentEditingPostId = postId;
  currentEditPostImageData = post.image || null;

  const catSelect = document.getElementById('edit-post-category-select');
  const titleInput = document.getElementById('edit-post-title-input');
  const contentInput = document.getElementById('edit-post-content-input');

  if (catSelect) catSelect.value = post.category || 'general';
  if (titleInput) titleInput.value = post.title || '';
  if (contentInput) contentInput.value = post.content || '';

  const previewContainer = document.getElementById('edit-post-image-preview-container');
  const previewImg = document.getElementById('edit-post-image-preview');
  const compressInfo = document.getElementById('edit-post-image-compress-info');

  if (post.image) {
    if (previewImg) previewImg.src = post.image;
    if (compressInfo) compressInfo.innerHTML = '<span class="text-cyan-400 font-bold">✓ 첨부된 사진</span>';
    if (previewContainer) {
      previewContainer.classList.remove('hidden');
      previewContainer.style.display = 'block';
    }
  } else {
    if (previewContainer) {
      previewContainer.classList.add('hidden');
      previewContainer.style.display = 'none';
    }
  }

  closePostDetailModal();

  const modal = document.getElementById('edit-post-modal');
  if (modal) {
    modal.classList.remove('hidden');
    modal.style.setProperty('display', 'flex', 'important');
    if (typeof lucide !== 'undefined' && lucide.createIcons) lucide.createIcons();
  }
}

function closeEditPostModal() {
  const modal = document.getElementById('edit-post-modal');
  if (modal) {
    modal.classList.add('hidden');
    modal.style.setProperty('display', 'none', 'important');
  }
  currentEditingPostId = null;
  currentEditPostImageData = null;
}

function handleUpdatePost(e) {
  if (e && e.preventDefault) e.preventDefault();
  if (!currentEditingPostId) return;

  const catSelect = document.getElementById('edit-post-category-select');
  const titleInput = document.getElementById('edit-post-title-input');
  const contentInput = document.getElementById('edit-post-content-input');

  const category = catSelect ? catSelect.value : 'general';
  const title = titleInput ? titleInput.value.trim() : '';
  const content = contentInput ? contentInput.value.trim() : '';

  if (!title || !content) {
    alert('제목과 내용을 모두 입력해 주세요.');
    return;
  }

  const categoryNames = {
    general: '💬 자유 토론',
    market: '📊 차트/기술적 분석',
    altcoin: '🚀 알트코인 분석',
    ico: '🪙 ICO / 신규 토큰',
    qna: '❓ 초보 Q&A'
  };

  const posts = getStoredPosts();
  const post = posts.find(p => p.id === currentEditingPostId);
  if (!post) return;

  post.category = category;
  post.categoryName = categoryNames[category] || '💬 자유 토론';
  post.title = title;
  post.content = content;
  post.image = currentEditPostImageData || null;
  post.edited = true;
  post.time = '수정됨 (방금 전)';

  saveStoredPosts(posts);
  closeEditPostModal();
  renderForumPosts();
  renderCalendarEvents();
  alert('✏️ 게시글이 성공적으로 수정되었습니다!');
}

function handleDeletePost(postId) {
  if (!confirm('정말로 이 게시글을 영구 삭제하시겠습니까?')) return;

  let posts = getStoredPosts();
  posts = posts.filter(p => p.id !== postId);
  saveStoredPosts(posts);

  closePostDetailModal();
  renderForumPosts();
  alert('🗑️ 게시글이 삭제되었습니다.');
}


// ====================================================
// CryptoPnL – Main Application Engine
// 100% Client-Side Privacy Architecture
// ====================================================

// ----------------------------------------------------
// Section 1: Legal Policy & Modals Handlers (AdSense Compliance)
// ----------------------------------------------------
function openLegalModal(tab) {
  tab = tab || 'privacy';
  const modal = document.getElementById('legal-modal');
  if (modal) {
    modal.style.setProperty('display', 'flex', 'important');
    modal.classList.remove('hidden');
    switchLegalTab(tab);
    if (typeof lucide !== 'undefined' && lucide.createIcons) {
      try { lucide.createIcons(); } catch(e) {}
    }
  }
}
window.openLegalModal = openLegalModal;

function closeLegalModal() {
  const modal = document.getElementById('legal-modal');
  if (modal) {
    modal.style.setProperty('display', 'none', 'important');
    modal.classList.add('hidden');
  }
}
window.closeLegalModal = closeLegalModal;

function switchLegalTab(tab) {
  tab = tab || 'privacy';
  const tabs = ['privacy', 'terms', 'about', 'contact'];
  const titles = {
    privacy: '개인정보처리방침 (Privacy Policy)',
    terms: '서비스 이용약관 & 투자 면책 (Terms of Service)',
    about: 'CryptoPnL 소개 & 100% 로컬 보안 백서 (About)',
    contact: '고객 지원 & 제휴 문의 (Contact: ittechkjh@gmail.com)'
  };

  tabs.forEach(t => {
    const content = document.getElementById('legal-content-' + t);
    const btn = document.getElementById('tab-legal-' + t);
    if (t === tab) {
      if (content) {
        content.style.setProperty('display', 'block', 'important');
        content.classList.remove('hidden');
      }
      if (btn) {
        btn.className = 'py-2.5 px-2 rounded-xl transition text-center bg-cyan-500/20 text-cyan-300 border border-cyan-500/40 font-bold';
      }
    } else {
      if (content) {
        content.style.setProperty('display', 'none', 'important');
        content.classList.add('hidden');
      }
      if (btn) {
        btn.className = 'py-2.5 px-2 rounded-xl transition text-center text-slate-400 hover:text-white border border-transparent font-medium';
      }
    }
  });

  const titleText = document.getElementById('legal-modal-title');
  if (titleText && titles[tab]) {
    titleText.innerText = titles[tab];
  }

  if (typeof lucide !== 'undefined' && lucide.createIcons) {
    try { lucide.createIcons(); } catch(e) {}
  }
}
window.switchLegalTab = switchLegalTab;

window.openExcelGuideModal = function() {
  const modal = document.getElementById('excel-guide-modal');
  if (modal) {
    modal.classList.remove('hidden');
    modal.style.setProperty('display', 'flex', 'important');
    window.showExchangeGuide('upbit');
    if (typeof lucide !== 'undefined' && lucide.createIcons) {
      try { lucide.createIcons(); } catch(e) {}
    }
  }
};

window.closeExcelGuideModal = function() {
  const modal = document.getElementById('excel-guide-modal');
  if (modal) {
    modal.classList.add('hidden');
    modal.style.setProperty('display', 'none', 'important');
  }
};

window.showExchangeGuide = function(exchange) {
  const upbitContent = document.getElementById('guide-content-upbit');
  const bithumbContent = document.getElementById('guide-content-bithumb');
  const tabUpbit = document.getElementById('tab-guide-upbit');
  const tabBithumb = document.getElementById('tab-guide-bithumb');

  if (exchange === 'upbit') {
    if (upbitContent) { upbitContent.classList.remove('hidden'); upbitContent.style.display = 'block'; }
    if (bithumbContent) { bithumbContent.classList.add('hidden'); bithumbContent.style.display = 'none'; }
    if (tabUpbit) tabUpbit.className = 'py-2.5 rounded-xl transition text-center bg-cyan-500/20 text-cyan-300 border border-cyan-500/40 font-bold';
    if (tabBithumb) tabBithumb.className = 'py-2.5 rounded-xl transition text-center text-slate-400 hover:text-white';
  } else {
    if (upbitContent) { upbitContent.classList.add('hidden'); upbitContent.style.display = 'none'; }
    if (bithumbContent) { bithumbContent.classList.remove('hidden'); bithumbContent.style.display = 'block'; }
    if (tabBithumb) tabBithumb.className = 'py-2.5 rounded-xl transition text-center bg-amber-500/20 text-amber-300 border border-amber-500/40 font-bold';
    if (tabUpbit) tabUpbit.className = 'py-2.5 rounded-xl transition text-center text-slate-400 hover:text-white';
  }
  if (typeof lucide !== 'undefined') lucide.createIcons();
};

function updateAdminNavVisibility() {
  const isAuth = sessionStorage.getItem('coinhub_admin_authenticated') === '1' || sessionStorage.getItem('cryptopnl_admin_authenticated') === '1';
  const storedUser = localStorage.getItem('coinhub_user') || localStorage.getItem('cryptopnl_user');
  let isAdminUser = false;
  if (storedUser) {
    try {
      const u = JSON.parse(storedUser);
      if (u && (u.username?.toLowerCase() === 'admin' || u.role === 'ADMIN' || u.rank === 'ADMIN')) {
        isAdminUser = true;
      }
    } catch(e) {}
  }

  const navAdmin = document.getElementById('nav-admin');
  const mNavAdmin = document.getElementById('m-nav-admin');

  if (navAdmin) {
    if (isAuth || isAdminUser) {
      navAdmin.classList.remove('hidden');
      navAdmin.classList.add('flex');
    } else {
      navAdmin.classList.add('hidden');
      navAdmin.classList.remove('flex');
    }
  }

  if (mNavAdmin) {
    if (isAuth || isAdminUser) {
      mNavAdmin.classList.remove('hidden');
      mNavAdmin.classList.add('flex');
    } else {
      mNavAdmin.classList.add('hidden');
      mNavAdmin.classList.remove('flex');
    }
  }
}
window.updateAdminNavVisibility = updateAdminNavVisibility;

function updateAuthUI() {
  const isAuth = sessionStorage.getItem('coinhub_admin_authenticated') === '1' || sessionStorage.getItem('cryptopnl_admin_authenticated') === '1';
  const stored = localStorage.getItem('coinhub_user') || localStorage.getItem('cryptopnl_user');
  let user = null;
  let isAdminUser = false;
  if (stored) {
    try {
      user = JSON.parse(stored);
      if (user && (user.username?.toLowerCase() === 'admin' || user.role === 'ADMIN' || user.rank === 'ADMIN')) {
        isAdminUser = true;
      }
    } catch(e) {}
  }

  const authBtn = document.getElementById('btn-header-auth');

  if (isAuth || isAdminUser) {
    if (authBtn) {
      authBtn.innerHTML = '<i data-lucide="shield-check" class="w-4 h-4 text-purple-400"></i><span>👑 관리자 센터 (로그아웃)</span>';
      authBtn.className = 'flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-purple-950/80 border border-purple-500/50 hover:border-purple-400 text-xs font-bold text-purple-300 hover:text-purple-100 transition shadow-sm cursor-pointer';
      authBtn.onclick = function() {
        if (confirm('관리자 세션을 로그아웃하시겠습니까? (취소 시 관리자 센터로 이동합니다)')) {
          handleLogout();
        } else {
          switchTab('admin');
        }
      };
    }
  } else if (user && user.username) {
    if (authBtn) {
      authBtn.innerHTML = `<i data-lucide="user-check" class="w-4 h-4 text-cyan-400"></i><span>${escapeHtml(user.username)} (로그아웃)</span>`;
      authBtn.className = 'flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-navy-900 border border-cyan-500/40 hover:border-rose-500/50 text-xs font-bold text-slate-200 hover:text-rose-300 transition shadow-sm';
      authBtn.onclick = handleLogout;
    }
  } else {
    if (authBtn) {
      authBtn.innerHTML = '<i data-lucide="user" class="w-4 h-4 text-cyan-400"></i><span>로그인</span>';
      authBtn.className = 'flex items-center gap-1.5 px-3.5 py-1.5 rounded-xl bg-navy-900/80 hover:bg-navy-800 border border-cyan-500/40 hover:border-cyan-400 text-xs font-bold text-cyan-300 hover:text-white transition shadow-sm';
      authBtn.onclick = openAuthModal;
    }
  }

  updateAdminNavVisibility();
  if (typeof lucide !== 'undefined' && lucide.createIcons) lucide.createIcons();
}
window.updateAuthUI = updateAuthUI;


// ----------------------------------------------------
// Section 7: Tab Router & Dynamic SEO
// ----------------------------------------------------
const ROUTE_SEO_MAP = {
  analyzer: {
    title: "CryptoPnL – 업비트·빗썸 엑셀 거래내역 실현손익 정밀 분석기",
    desc: "1초 만에 확인하는 내 업비트·빗썸 실현손익, 평단가, 거래소별 수수료, 월별 통계. 서버 전송 없는 100% 로컬 암호화 계산기"
  },
  market: {
    title: "CryptoPnL – 가상자산 실시간 시세 및 트레이딩뷰 차트 분석",
    desc: "비트코인, 이더리움, 주요 알트코인 실시간 시세, 24시간 변동률, 시가총액 순위 및 인터랙티브 인터벌 차트"
  },
  forum: {
    title: "CryptoPnL – 코인 토론 포럼 및 전문 트레이더 인사이트",
    desc: "실시간 거래소 상장 공시, 차트 분석, 알트코인 전망 및 트레이더 커뮤니티 토론장"
  },
  chat: {
    title: "CryptoPnL – 실시간 글로벌 암호화폐 라이브 채팅방",
    desc: "실시간 시장 반응과 트레이딩 아이디어를 나누는 라이브 채팅 및 커뮤니티"
  },
  news: {
    title: "CryptoPnL – 실시간 가상자산 글로벌 속보 및 공시 피드",
    desc: "주요 글로벌 블록체인 미디어 및 금융위 규제 속보를 30초 주기로 자동 수집·업데이트"
  },
  calculators: {
    title: "CryptoPnL – 물타기, 김프, 세금, 선물 청산가 실전 계산기 5종",
    desc: "투자자를 위한 실전 트레이딩 계산기 모음"
  },
  guides: {
    title: "CryptoPnL – 가상자산 세무, 엑셀 분석 & 실전 매매 지식 백서",
    desc: "8편의 전문 가이드와 FAQ 10선"
  },
  
  calendar: {
    title: "CryptoPnL – 2026 주요 가상자산 일정 및 경제 캘린더",
    desc: "FOMC 금리 결정, 대규모 토큰 락업 해제, 메인넷 업그레이드, 글로벌 컨퍼런스 실시간 D-Day 일정"
  },
  admin: {
    title: "CryptoPnL – 최고 관리자(Admin) 전용 센터",
    desc: "CryptoPnL 사이트 운영, 방문자 트래픽 모니터링 및 시스템 관리"
  }
};

function updatePageSEO(tabId) {
  const seo = ROUTE_SEO_MAP[tabId] || ROUTE_SEO_MAP.analyzer;
  document.title = seo.title;
  let metaDesc = document.querySelector('meta[name="description"]');
  if (metaDesc) metaDesc.setAttribute('content', seo.desc);
  let ogTitle = document.querySelector('meta[property="og:title"]');
  if (ogTitle) ogTitle.setAttribute('content', seo.title);
  let ogDesc = document.querySelector('meta[property="og:description"]');
  if (ogDesc) ogDesc.setAttribute('content', seo.desc);
}

function switchTab(tabId, updateHash = true) {
  const tabs = ['analyzer', 'market', 'forum', 'chat', 'news', 'calculators', 'guides', 'calendar', 'admin'];
  if (!tabs.includes(tabId)) tabId = 'analyzer';

  tabs.forEach(t => {
    const el = document.getElementById(`tab-${t}`);
    const navBtn = document.getElementById(`nav-${t}`);
    const mNavBtn = document.getElementById(`m-nav-${t}`);

    if (t === tabId) {
      if (el) {
        el.classList.remove('hidden');
        el.classList.add('block');
        el.style.setProperty('display', 'block', 'important');
      }
      if (navBtn) {
        navBtn.classList.add('active');
        if (t === 'analyzer') {
          navBtn.classList.add('bg-cyan-500/10', 'border-cyan-500/30', 'text-cyan-400');
        } else if (t === 'guides') {
          navBtn.classList.add('bg-indigo-500/10', 'border-indigo-500/30', 'text-indigo-300');
        } else if (t === 'calculators') {
          navBtn.classList.add('bg-amber-500/10', 'border-amber-500/30', 'text-amber-300');
        }
      }
      if (mNavBtn) {
        mNavBtn.classList.add('text-cyan-400', 'font-bold');
        mNavBtn.classList.remove('text-slate-400');
      }
    } else {
      if (el) {
        el.classList.remove('block');
        el.classList.add('hidden');
        el.style.setProperty('display', 'none', 'important');
      }
      if (navBtn) {
        navBtn.classList.remove('active', 'bg-cyan-500/10', 'border-cyan-500/30', 'text-cyan-400', 'bg-indigo-500/10', 'border-indigo-500/30', 'text-indigo-300', 'bg-amber-500/10', 'border-amber-500/30', 'text-amber-300');
      }
      if (mNavBtn) {
        mNavBtn.classList.remove('text-cyan-400', 'font-bold');
        mNavBtn.classList.add('text-slate-400');
      }
    }
  });

  if (tabId === 'calculators' && typeof CoinCalculators !== 'undefined') {
    CoinCalculators.init();
  }
  if (tabId === 'calendar') {
    renderCalendarEvents();
  }

  if (tabId === 'market') {
    fetchMarketData();
    initChart();
  }
  if (tabId === 'admin' && typeof AdminApp !== 'undefined' && typeof AdminApp.checkAdminAccess === 'function') {
    AdminApp.checkAdminAccess();
  }

  if (updateHash && window.location.hash !== `#/${tabId}`) {
    history.replaceState(null, '', `#/${tabId}`);
  }

  updatePageSEO(tabId);

  if (typeof lucide !== 'undefined' && lucide.createIcons) {
    try { lucide.createIcons(); } catch(e) {}
  }
}
window.switchTab = switchTab;


// ----------------------------------------------------
// Section 8: Utilities & Live Simulations
// ----------------------------------------------------
function formatNumber(num) {
  if (num === null || num === undefined) return '0.00';
  return Number(num).toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
}

function formatCompact(num) {
  if (!num) return '0';
  if (num >= 1e9) return (num / 1e9).toFixed(2) + 'B';
  if (num >= 1e6) return (num / 1e6).toFixed(2) + 'M';
  if (num >= 1e3) return (num / 1e3).toFixed(2) + 'K';
  return num.toString();
}

function escapeHtml(str) {
  if (!str) return '';
  return String(str)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#039;');
}

function simulateLiveFluctuations() {
  marketCoins.forEach(coin => {
    const delta = (Math.random() - 0.495) * (coin.current_price * 0.001);
    coin.current_price = Math.max(0.0001, coin.current_price + delta);
  });
  renderMarketUI();
}


// ----------------------------------------------------
// Section 9: Initialization (DOMContentLoaded & Hashchange)
// ----------------------------------------------------
document.addEventListener('DOMContentLoaded', () => {
  updateAuthUI();
  updateAdminNavVisibility();

  renderMarketUI();
  fetchMarketData();
  initChart();

  renderForumPosts();
  renderNews();
  fetchLatestNews(false);
  initNewsPeriodicUpdater();

  renderChatMessages();

  const initialHash = (window.location.hash || '').replace('#/', '').replace('#', '');
  const initialTab = initialHash || 'analyzer';
  switchTab(initialTab, false);

  if (typeof lucide !== 'undefined') lucide.createIcons();

  
  // Clipboard Image Paste Handler for post content
  const postContentEl = document.getElementById('post-content-input');
  if (postContentEl) {
    postContentEl.addEventListener('paste', function (e) {
      const items = (e.clipboardData || e.originalEvent.clipboardData)?.items;
      if (items) {
        for (let i = 0; i < items.length; i++) {
          if (items[i].type.startsWith('image/')) {
            const blob = items[i].getAsFile();
            processImageBlob(blob, false);
            break;
          }
        }
      }
    });
  }

  const editPostContentEl = document.getElementById('edit-post-content-input');
  if (editPostContentEl) {
    editPostContentEl.addEventListener('paste', function (e) {
      const items = (e.clipboardData || e.originalEvent.clipboardData)?.items;
      if (items) {
        for (let i = 0; i < items.length; i++) {
          if (items[i].type.startsWith('image/')) {
            const blob = items[i].getAsFile();
            processImageBlob(blob, true);
            break;
          }
        }
      }
    });
  }

  
  const cafeTextarea = document.getElementById('cafe-write-content');
  if (cafeTextarea) {
    cafeTextarea.addEventListener('paste', function (e) {
      const items = (e.clipboardData || e.originalEvent.clipboardData)?.items;
      if (items) {
        for (let i = 0; i < items.length; i++) {
          if (items[i].type.startsWith('image/')) {
            const blob = items[i].getAsFile();
            processCafeImageBlob(blob);
            break;
          }
        }
      }
    });
  }

  
  // Global & Textarea Clipboard Image Paste Handler (Ctrl+V)
  document.addEventListener('paste', function (e) {
    const writeView = document.getElementById('forum-write-view');
    if (!writeView || writeView.classList.contains('hidden')) return;

    const items = (e.clipboardData || e.originalEvent?.clipboardData)?.items;
    if (!items) return;

    for (let i = 0; i < items.length; i++) {
      if (items[i].type.startsWith('image/')) {
        const blob = items[i].getAsFile();
        if (blob) {
          processCafeImageBlob(blob);
          e.preventDefault();
          break;
        }
      }
    }
  });

  setInterval(simulateLiveFluctuations, 4000);
});

window.addEventListener('hashchange', function () {
  const h = (window.location.hash || '').replace('#/', '').replace('#', '');
  if (h && typeof switchTab === 'function') {
    switchTab(h, false);
  }
});



// ----------------------------------------------------
// Section 10: Crypto Events Calendar Engine
// ----------------------------------------------------
const CRYPTO_EVENTS = [
  {
    id: 1,
    date: '2026-09-02',
    dday: 'D-2',
    time: '21:30 (KST)',
    category: 'macro',
    categoryName: '🏦 FOMC/거시경제',
    coin: 'MACRO',
    title: '미국 8월 고용보고서 (비농업 고용 및 실업률) 발표',
    desc: '연준(Fed)의 9월 금리 결정 방향성을 가늠할 핵심 경제 지표. 시장 예상치 하회 시 조기 금리 인하 기대감 고조.',
    impact: 'HIGH IMPACT',
    impactColor: 'text-amber-400 bg-amber-500/10 border-amber-500/30'
  },
  {
    id: 2,
    date: '2026-09-05',
    dday: 'D-5',
    time: '18:00 (KST)',
    category: 'unlock',
    categoryName: '🔓 토큰 락업해제',
    coin: 'SUI',
    title: '수이(SUI) 6,400만 개 대규모 토큰 락업 해제',
    desc: '초기 기여자 및 커뮤니티 물량 약 9,500만 달러 상당 해제. 단기 유통량 증가에 따른 가격 변동성 주의 필요.',
    impact: 'VOLATILE',
    impactColor: 'text-rose-400 bg-rose-500/10 border-rose-500/30'
  },
  {
    id: 3,
    date: '2026-09-10',
    dday: 'D-10',
    time: '21:30 (KST)',
    category: 'macro',
    categoryName: '🏦 FOMC/거시경제',
    coin: 'MACRO',
    title: '미국 8월 소비자물가지수(CPI) 발표',
    desc: '인플레이션 둔화 추세 지속 여부 확인. 전년 동기 대비 2.8% 하회 시 위험자산 강세 랠리 촉발 가능성.',
    impact: 'HIGH IMPACT',
    impactColor: 'text-amber-400 bg-amber-500/10 border-amber-500/30'
  },
  {
    id: 4,
    date: '2026-09-16',
    dday: 'D-16',
    time: '03:00 (KST)',
    category: 'macro',
    categoryName: '🏦 FOMC/거시경제',
    coin: 'FED',
    title: '미국 연준(Fed) FOMC 기준금리 결정 및 파월 의장 기자회견',
    desc: '글로벌 유동성 공급과 암호화폐 시장의 향방을 결정지을 2026년 하반기 최대 이벤트.',
    impact: 'CRITICAL',
    impactColor: 'text-purple-400 bg-purple-500/10 border-purple-500/30'
  },
  {
    id: 5,
    date: '2026-09-18',
    dday: 'D-18',
    time: '15:00 (KST)',
    category: 'upgrade',
    categoryName: '🚀 메인넷/업그레이드',
    coin: 'ETH',
    title: '이더리움(ETH) 프라하(Pectra) 하드포크 테스트넷 적용',
    desc: '계정 추상화(EIP-3074) 및 검증자 최대 스테이킹 한도 상향(EIP-7251)을 포함한 대규모 확장성 업그레이드.',
    impact: 'BULLISH',
    impactColor: 'text-crypto-green bg-emerald-500/10 border-emerald-500/30'
  },
  {
    id: 6,
    date: '2026-09-22',
    dday: 'D-22',
    time: '10:00 (KST)',
    category: 'conference',
    categoryName: '🌐 글로벌 컨퍼런스',
    coin: 'SOL',
    title: '솔라나 Breakpoint 2026 글로벌 개발자 컨퍼런스',
    desc: '파이어댄서(Firedancer) 메인넷 정식 출시 발표 및 솔라나 생태계 주요 디앱 신규 로드맵 공개.',
    impact: 'BULLISH',
    impactColor: 'text-crypto-green bg-emerald-500/10 border-emerald-500/30'
  },
  {
    id: 7,
    date: '2026-09-25',
    dday: 'D-25',
    time: '17:00 (KST)',
    category: 'unlock',
    categoryName: '🔓 토큰 락업해제',
    coin: 'ARB',
    title: '아비트럼(ARB) 9,260만 개 팀 및 고문 물량 락업 해제',
    desc: 'L2 생태계 핵심 토큰의 정기 락업 해제. 탈중앙화 거버넌스 투표율 및 스테이킹 보상 정책 연계 주목.',
    impact: 'VOLATILE',
    impactColor: 'text-rose-400 bg-rose-500/10 border-rose-500/30'
  },
  {
    id: 8,
    date: '2026-09-28',
    dday: 'D-28',
    time: '23:00 (KST)',
    category: 'policy',
    categoryName: '⚖️ 규제/법안',
    coin: 'SEC',
    title: '미국 SEC, 신규 가상자산 현물 지수 ETF 승인 심사 기한',
    desc: '솔라나 및 다중 암호화폐 종합 인덱스 ETF에 대한 SEC 최종 승인 여부 판결 기한.',
    impact: 'HIGH IMPACT',
    impactColor: 'text-cyan-400 bg-cyan-500/10 border-cyan-500/30'
  }
];

let activeCalendarFilter = 'all';
let currentCalendarView = 'list';

function filterCalendar(cat) {
  activeCalendarFilter = cat;
  const buttons = document.querySelectorAll('#calendar-filter-buttons .category-btn');
  buttons.forEach(btn => {
    if (btn.dataset.calCat === cat) {
      btn.classList.add('active', 'bg-cyan-500/20', 'text-cyan-400', 'border-cyan-500/40');
      btn.classList.remove('bg-navy-950', 'text-slate-400');
    } else {
      btn.classList.remove('active', 'bg-cyan-500/20', 'text-cyan-400', 'border-cyan-500/40');
      btn.classList.add('bg-navy-950', 'text-slate-400');
    }
  });
  renderCalendarEvents();
  renderMonthCalendar();
}

function renderCalendarEvents() {
  const container = document.getElementById('calendar-events-list');
  if (!container) return;

  let events = CRYPTO_EVENTS;
  if (activeCalendarFilter !== 'all') {
    events = events.filter(e => e.category === activeCalendarFilter);
  }

  if (events.length === 0) {
    container.innerHTML = '<div class="p-8 text-center text-slate-500 text-xs bg-navy-900 rounded-3xl border border-navy-800">선택하신 카테고리의 예정된 일정이 없습니다.</div>';
    return;
  }

  container.innerHTML = events.map(ev => `
    <div class="crypto-card bg-navy-900 border border-navy-800 rounded-3xl p-5 sm:p-6 shadow-lg hover:border-cyan-500/40 transition flex items-start justify-between gap-4 group">
      <div class="flex items-start gap-4 flex-1">
        <!-- Date Badge -->
        <div class="w-16 h-16 rounded-2xl bg-navy-950 border border-navy-800 flex flex-col items-center justify-center shrink-0 group-hover:border-cyan-500/40 transition">
          <span class="text-[11px] font-black text-cyan-400 font-mono">${ev.dday}</span>
          <span class="text-xs font-bold text-slate-200 mt-0.5">${ev.date.slice(5)}</span>
        </div>

        <!-- Info -->
        <div class="space-y-1.5 flex-1">
          <div class="flex items-center gap-2 flex-wrap">
            <span class="px-2.5 py-0.5 rounded-lg bg-navy-950 border border-navy-800 text-slate-300 text-xs font-bold font-mono">${ev.coin}</span>
            <span class="px-2.5 py-0.5 rounded-lg bg-cyan-500/10 text-cyan-400 border border-cyan-500/20 text-xs font-semibold">${ev.categoryName}</span>
            <span class="text-xs text-slate-500 font-mono">${ev.time}</span>
            <span class="px-2 py-0.5 rounded-md text-[10px] font-bold border ${ev.impactColor} ml-auto sm:ml-0">${ev.impact}</span>
          </div>
          <h3 class="text-base font-extrabold text-white group-hover:text-cyan-400 transition leading-snug">${escapeHtml(ev.title)}</h3>
          <p class="text-xs text-slate-400 leading-relaxed">${escapeHtml(ev.desc)}</p>
        </div>
      </div>
    </div>
  `).join('');

  if (typeof lucide !== 'undefined') lucide.createIcons();
}

function renderMonthCalendar() {
  const container = document.getElementById('month-calendar-grid');
  if (!container) return;

  let events = CRYPTO_EVENTS;
  if (activeCalendarFilter !== 'all') {
    events = events.filter(e => e.category === activeCalendarFilter);
  }

  const daysInMonth = 30; // Sep 2026
  let gridHtml = '';

  for (let day = 1; day <= daysInMonth; day++) {
    const dateStr = `2026-09-${String(day).padStart(2, '0')}`;
    const dayEvents = events.filter(e => e.date === dateStr);
    const hasEvents = dayEvents.length > 0;

    gridHtml += `
      <div class="min-h-[90px] p-2.5 rounded-2xl bg-navy-950 border ${hasEvents ? 'border-cyan-500/40 bg-cyan-950/20' : 'border-navy-800/80'} flex flex-col justify-between transition hover:border-cyan-400 group">
        <div class="flex items-center justify-between">
          <span class="text-xs font-bold ${hasEvents ? 'text-cyan-400 font-mono' : 'text-slate-400'}">9/${day}</span>
          ${hasEvents ? `<span class="w-2 h-2 rounded-full bg-cyan-400 animate-pulse"></span>` : ''}
        </div>
        <div class="space-y-1 mt-1">
          ${dayEvents.map(e => `
            <div class="text-[10px] px-1.5 py-0.5 rounded bg-navy-900 border border-navy-800 text-slate-200 truncate font-medium" title="${escapeHtml(e.title)}">
              ${escapeHtml(e.coin)}: ${escapeHtml(e.title)}
            </div>
          `).join('')}
        </div>
      </div>
    `;
  }

  container.innerHTML = gridHtml;
}
