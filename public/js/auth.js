/* ==========================================================================
   ASIL LOGISTICS - CLIENT-SIDE AUTHENTICATION & ROLE-BASED ACCESS CONTROL
   ========================================================================== */

let currentUser = null;

async function checkAuth() {
  try {
    const res = await api('GET', '/api/auth/me');
    if (res && res.ok) {
      currentUser = res.user;
      return currentUser;
    }
  } catch (e) {
    currentUser = null;
  }
  return null;
}

async function loginUser(username, password) {
  try {
    const res = await api('POST', '/api/auth/login', { username, password });
    if (res && res.ok) {
      currentUser = res.user;
      return { ok: true, user: res.user };
    }
  } catch (err) {
    return { ok: false, error: err.error || 'Invalid credentials' };
  }
}

async function logoutUser() {
  try {
    await api('POST', '/api/auth/logout');
  } catch (e) {}
  currentUser = null;
  window.location.href = '/';
}

// Route Guard for Department Pages
async function enforceDepartmentAccess(departmentName) {
  const user = await checkAuth();
  if (!user) {
    // Show login modal or prompt
    return { allowed: false, reason: 'unauthenticated' };
  }
  if (user.role === 'super_admin') {
    return { allowed: true, user };
  }
  if (user.role === `dept_${departmentName}` || user.department === departmentName) {
    return { allowed: true, user };
  }
  return { allowed: false, reason: 'unauthorized_department' };
}
