const API_BASE = '/api/v1';

export const api = {
  // Authentication
  async login(email, password) {
    const formData = new URLSearchParams();
    formData.append('username', email);
    formData.append('password', password);
    const res = await fetch(`${API_BASE}/auth/login`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
      body: formData
    });
    if (!res.ok) {
      const err = await res.json();
      throw new Error(err.detail || 'Login failed');
    }
    return res.json();
  },

  async register(data) {
    const res = await fetch(`${API_BASE}/auth/register`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(data)
    });
    if (!res.ok) {
      const err = await res.json();
      throw new Error(err.detail || 'Registration failed');
    }
    return res.json();
  },

  // Candidate Profile (first-time registration form, profile dashboard, settings)
  async completeOnboarding(token, details) {
    const data = await this._sendJson('POST', '/auth/complete-onboarding', token, details, 'Failed to save your profile');
    return data.profile;
  },

  async getProfile(token) {
    const res = await fetch(`${API_BASE}/profile/me`, {
      headers: { 'Authorization': `Bearer ${token}` }
    });
    if (!res.ok) throw new Error(`Failed to load profile (${res.status})`);
    return res.json();
  },

  async updateProfile(token, details) {
    return this._sendJson('PUT', '/profile/me', token, details, 'Failed to update profile');
  },

  async updateAvatar(token, avatarUrl) {
    return this._sendJson('PUT', '/profile/avatar', token, { avatar_url: avatarUrl }, 'Failed to update profile photo');
  },

  async updatePreferences(token, preferences) {
    return this._sendJson('PUT', '/profile/preferences', token, preferences, 'Failed to save settings');
  },

  // JSON request with Bearer auth. `body` is optional (omit it for GET). On a non-2xx
  // response it throws an Error carrying the server's detail and the HTTP `status`.
  async _sendJson(method, path, token, body, fallbackMessage) {
    const headers = { 'Authorization': `Bearer ${token}` };
    if (body !== undefined) headers['Content-Type'] = 'application/json';
    const res = await fetch(`${API_BASE}${path}`, {
      method,
      headers,
      body: body === undefined ? undefined : JSON.stringify(body)
    });
    if (!res.ok) {
      const err = await res.json().catch(() => ({}));
      // FastAPI validation errors arrive as a list of {loc, msg}
      const detail = Array.isArray(err.detail)
        ? err.detail.map((d) => d.msg?.replace(/^Value error, /, '')).filter(Boolean).join(' ')
        : typeof err.detail === 'string'
          ? err.detail
          : err.detail?.message;
      const error = new Error(detail || fallbackMessage);
      error.status = res.status;
      throw error;
    }
    return res.json();
  },

  // Dashboard Overview (The State Hub)
  async getDashboard(token) {
    const res = await fetch(`${API_BASE}/dashboard/overview`, {
      headers: { 'Authorization': `Bearer ${token}` }
    });
    if (!res.ok) throw new Error('Failed to fetch dashboard overview');
    return res.json();
  },

  async setTargetRole(token, targetRole) {
    const res = await fetch(`${API_BASE}/dashboard/set-role`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${token}`
      },
      body: JSON.stringify({ target_role: targetRole })
    });
    if (!res.ok) throw new Error('Failed to switch target role');
    return res.json();
  },

  // Resume Intelligence
  async getSampleResume() {
    const res = await fetch(`${API_BASE}/resume/sample-resume`);
    if (!res.ok) throw new Error('Failed to load sample resume');
    return res.json();
  },

  async analyzeResumeText(token, text, targetRole, customJd = '') {
    const res = await fetch(`${API_BASE}/resume/analyze-text`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${token}`
      },
      body: JSON.stringify({ text, target_role: targetRole, custom_jd: customJd || '' })
    });
    if (!res.ok) {
      const err = await res.json();
      throw new Error(err.detail || 'Failed to analyze resume');
    }
    return res.json();
  },

  async analyzeResumeFile(token, file, customJd = '') {
    const formData = new FormData();
    formData.append('file', file);
    if (customJd && customJd.trim()) {
      formData.append('custom_jd', customJd.trim());
    }
    const res = await fetch(`${API_BASE}/resume/analyze-file`, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${token}`
      },
      body: formData
    });
    if (!res.ok) {
      const err = await res.json();
      throw new Error(err.detail || 'Failed to upload and analyze file');
    }
    return res.json();
  },

  // AI Skill Assessment
  async getAssessmentQuestions(track = 'AI / ML Engineer') {
    const res = await fetch(`${API_BASE}/assessment/questions?track=${encodeURIComponent(track)}`);
    if (!res.ok) throw new Error('Failed to fetch assessment questions');
    return res.json();
  },

  // Resume-matched plan: core-skill match, level, question mix, focus topics and 10 questions.
  async getAssessmentPlan(token, track) {
    return this._sendJson('GET', `/assessment/plan?track=${encodeURIComponent(track)}`, token, undefined, 'Failed to load your assessment plan');
  },

  async submitAssessment(token, track, answers, questionIds, level, attemptId) {
    const body = { track, answers, question_ids: questionIds };
    if (level) body.level = level;
    if (attemptId != null) body.attempt_id = attemptId;
    return this._sendJson('POST', '/assessment/submit', token, body, 'Failed to submit assessment');
  },

  // Adaptive Interviews (Saraswati Chatbot & Legacy)
  async startInterview(token, targetRole, interviewType = 'technical') {
    const res = await fetch(`${API_BASE}/interview/start`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${token}`
      },
      body: JSON.stringify({ target_role: targetRole, interview_type: interviewType })
    });
    if (!res.ok) throw new Error('Failed to start Saraswati interview session');
    return res.json();
  },

  async sendInterviewMessage(token, sessionId, message) {
    const res = await fetch(`${API_BASE}/interview/send-message`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${token}`
      },
      body: JSON.stringify({ session_id: sessionId, message })
    });
    if (!res.ok) throw new Error('Failed to send interview message');
    return res.json();
  },

  async finishInterview(token, sessionId) {
    const res = await fetch(`${API_BASE}/interview/finish`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${token}`
      },
      body: JSON.stringify({ session_id: sessionId })
    });
    if (!res.ok) throw new Error('Failed to generate final report');
    return res.json();
  },

  async getInterviewHistory(token) {
    const res = await fetch(`${API_BASE}/interview/history`, {
      headers: { 'Authorization': `Bearer ${token}` }
    });
    if (!res.ok) throw new Error('Failed to fetch interview history');
    return res.json();
  },

  async getInterviewSession(token, sessionId) {
    const res = await fetch(`${API_BASE}/interview/session/${sessionId}`, {
      headers: { 'Authorization': `Bearer ${token}` }
    });
    if (!res.ok) throw new Error('Failed to fetch interview session detail');
    return res.json();
  },

  async generateInterviewQuestion(token, interviewType = 'technical') {
    const res = await fetch(`${API_BASE}/interview/generate-question`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${token}`
      },
      body: JSON.stringify({ interview_type: interviewType })
    });
    if (!res.ok) throw new Error('Failed to generate interview question');
    return res.json();
  },

  async evaluateInterview(token, sessionId, studentResponse) {
    const res = await fetch(`${API_BASE}/interview/evaluate`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${token}`
      },
      body: JSON.stringify({
        session_id: sessionId,
        student_response: studentResponse
      })
    });
    if (!res.ok) throw new Error('Failed to evaluate response');
    return res.json();
  },

  // Coding Practice & Evaluation
  async getCodingProblems() {
    const res = await fetch(`${API_BASE}/coding/problems`);
    if (!res.ok) throw new Error('Failed to fetch coding problems');
    return res.json();
  },

  async getCodingProgress(token) {
    const res = await fetch(`${API_BASE}/coding/progress`, {
      headers: { 'Authorization': `Bearer ${token}` }
    });
    if (!res.ok) throw new Error('Failed to fetch coding progress');
    return res.json();
  },

  // Runs visible examples only. Nothing is saved.
  // language: 'python' | 'java' | 'cpp'
  async runCode(token, problemId, code, language = 'python') {
    return this._postCode('run', token, problemId, code, language);
  },

  // Runs examples + hidden tests, saves the submission and updates readiness.
  async submitCode(token, problemId, code, language = 'python') {
    return this._postCode('submit', token, problemId, code, language);
  },

  async _postCode(action, token, problemId, code, language = 'python') {
    const res = await fetch(`${API_BASE}/coding/${action}`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${token}`
      },
      body: JSON.stringify({ problem_id: problemId, code, language })
    });
    if (!res.ok) {
      const body = await res.json().catch(() => ({}));
      const detail = typeof body.detail === 'string' ? body.detail : `Request failed (${res.status})`;
      throw new Error(detail);
    }
    return res.json();
  },

  async getCodingSolution(token, problemId, language = 'python') {
    const res = await fetch(`${API_BASE}/coding/solution/${problemId}?language=${encodeURIComponent(language)}`, {
      headers: { 'Authorization': `Bearer ${token}` }
    });
    if (!res.ok) throw new Error('Solve the problem first to unlock the solution');
    return res.json();
  },

  // Roadmap & Recommendations
  // 5-step roadmap with checklist ticks, gate-quiz results and project submissions (all stored server-side).
  // `field` is optional; the server defaults to the user's target role.
  async getRoadmap(token, field) {
    const query = field ? `?field=${encodeURIComponent(field)}` : '';
    return this._sendJson('GET', `/roadmap${query}`, token, undefined, 'Failed to load your roadmap');
  },

  async setRoadmapTopic(token, field, topicId, checked) {
    return this._sendJson('PUT', `/roadmap/topics/${encodeURIComponent(topicId)}`, token, { field, checked }, 'Could not save this topic');
  },

  async startStepQuiz(token, field, step) {
    return this._sendJson('POST', `/roadmap/steps/${encodeURIComponent(step)}/quiz`, token, { field }, 'Could not start the step quiz');
  },

  async submitStepQuiz(token, attemptId, answers) {
    return this._sendJson('POST', `/roadmap/quiz/${encodeURIComponent(attemptId)}/submit`, token, { answers }, 'Could not submit the step quiz');
  },

  async submitProject(token, field, projectId, repoUrl, notes) {
    const trimmedNotes = (notes || '').trim();
    return this._sendJson(
      'PUT',
      `/roadmap/projects/${encodeURIComponent(projectId)}`,
      token,
      { field, repo_url: repoUrl, notes: trimmedNotes || null },
      'Could not save your project link'
    );
  },

  async getRecommendations(token) {
    const res = await fetch(`${API_BASE}/recommendations`, {
      headers: { 'Authorization': `Bearer ${token}` }
    });
    if (!res.ok) throw new Error('Failed to fetch recommendations');
    return res.json();
  }
};
