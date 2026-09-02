import sys

with open('js/preview-app.js', 'r', encoding='utf-8') as f:
    content = f.read()

# Fix the closest selector bug
content = content.replace('.lg\\\\\\\\:col-span-3', '.lg\\\\:col-span-3')

# Fix Admin isAuthor for editing
old_author_check = \"const isAuthor = Boolean(currentUsername && currentUsername.toLowerCase() === (post.author || '').trim().toLowerCase());\"
new_author_check = \"const isAuthor = Boolean(currentUsername && currentUsername.toLowerCase() === (post.author || '').trim().toLowerCase()) || (typeof isAdmin === 'function' && isAdmin(currentUsername));\"
content = content.replace(old_author_check, new_author_check)

# Fix the online count to reflect actual users in the list
old_count_logic = '''const baseCount = currentChatChannel === 'global' ? 45 : (currentChatChannel === 'trading' ? 32 : 18);
    const fluctuation = Math.floor(Math.random() * 5) - 2; // -2 to +2
    const finalCount = Math.max(1, baseCount + fluctuation);
    el.innerText = finalCount + '疙 立加吝';'''
new_count_logic = '''const userList = document.getElementById('chat-active-users-list');
    const finalCount = userList ? userList.children.length : 1;
    el.innerText = finalCount + '疙 立加吝';'''
content = content.replace(old_count_logic, new_count_logic)

with open('js/preview-app.js', 'w', encoding='utf-8') as f:
    f.write(content)

print('Patched successfully!')
