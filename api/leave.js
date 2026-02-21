/**
 * /api/leave  - 請假系統 API
 *
 * GET  actions (query params):
 *   ?action=my-leaves&userId=xxx          → 員工查自己的請假
 *   ?action=all-leaves&userId=xxx         → 管理員查所有請假
 *   ?action=pending&userId=xxx            → 管理員查待審核
 *
 * POST actions (body JSON):
 *   { action:'apply',  userId, employeeName, leaveType, startDate, endDate, reason }
 *   { action:'review', userId, leaveId, reviewAction:'approve'|'reject', rejectReason? }
 */

const { getEmployeeByUserId } = require('../services/employeeService');
const {
  getAllLeaves,
  getLeavesByUserId,
  getPendingLeaves,
  applyLeave,
  reviewLeave,
} = require('../services/leaveService');

module.exports = async (req, res) => {
  // CORS
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');
  if (req.method === 'OPTIONS') return res.status(200).end();

  try {
    // ── GET ─────────────────────────────────────────────
    if (req.method === 'GET') {
      const { action, userId } = req.query;

      if (!userId) return res.status(400).json({ error: '缺少 userId 參數' });

      const requester = await getEmployeeByUserId(userId);
      if (!requester) return res.status(403).json({ error: '找不到員工資料' });

      switch (action) {
        case 'my-leaves': {
          const leaves = await getLeavesByUserId(userId);
          return res.status(200).json({ success: true, leaves });
        }

        case 'all-leaves': {
          if (requester.role !== 'admin') return res.status(403).json({ error: '權限不足' });
          const leaves = await getAllLeaves();
          return res.status(200).json({ success: true, leaves });
        }

        case 'pending': {
          if (requester.role !== 'admin') return res.status(403).json({ error: '權限不足' });
          const leaves = await getPendingLeaves();
          return res.status(200).json({ success: true, leaves });
        }

        default:
          return res.status(400).json({ error: '無效的 action' });
      }
    }

    // ── POST ────────────────────────────────────────────
    if (req.method === 'POST') {
      const { action, userId } = req.body || {};

      if (!userId) return res.status(400).json({ error: '缺少 userId 參數' });

      const requester = await getEmployeeByUserId(userId);
      if (!requester) return res.status(403).json({ error: '找不到員工資料' });

      switch (action) {
        case 'apply': {
          const { employeeName, leaveType, startDate, endDate, reason } = req.body;

          if (!leaveType || !startDate || !endDate) {
            return res.status(400).json({ error: '請填寫完整請假資訊' });
          }

          const validTypes = ['annual', 'sick', 'personal', 'other'];
          if (!validTypes.includes(leaveType)) {
            return res.status(400).json({ error: '假別不正確' });
          }

          if (startDate > endDate) {
            return res.status(400).json({ error: '結束日期必須大於或等於開始日期' });
          }

          const result = await applyLeave({
            userId,
            employeeName: employeeName || requester.name,
            leaveType,
            startDate,
            endDate,
            reason,
          });

          return res.status(result.success ? 200 : 400).json(result);
        }

        case 'review': {
          if (requester.role !== 'admin') return res.status(403).json({ error: '權限不足' });

          const { leaveId, reviewAction, rejectReason } = req.body;

          if (!leaveId || !reviewAction) {
            return res.status(400).json({ error: '缺少審核資訊' });
          }
          if (!['approve', 'reject'].includes(reviewAction)) {
            return res.status(400).json({ error: '審核動作不正確' });
          }
          if (reviewAction === 'reject' && !rejectReason) {
            return res.status(400).json({ error: '拒絕時需填寫原因' });
          }

          const result = await reviewLeave({
            leaveId,
            action: reviewAction,
            reviewerUserId: userId,
            rejectReason,
          });

          return res.status(result.success ? 200 : 400).json(result);
        }

        default:
          return res.status(400).json({ error: '無效的 action' });
      }
    }

    return res.status(405).json({ error: '不支援的請求方法' });

  } catch (error) {
    console.error('Leave API 錯誤:', error);
    return res.status(500).json({ success: false, error: error.message });
  }
};
