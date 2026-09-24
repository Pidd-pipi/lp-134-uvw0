export const messages = {
  health: '心理健康互助平台服务正常运行',
  auth: {
    missingToken: '未提供认证令牌',
    inactiveUser: '用户不存在或已被禁用',
    invalidToken: '认证令牌无效或已过期',
    forbidden: '权限不足',
  },
  errors: {
    internal: '服务器内部错误',
    databaseConnected: '数据库连接成功',
    serverStartFailed: '启动服务器失败',
  },
  validation: {
    invalidInput: '输入数据格式不正确',
  },
  socket: {
    connected: '用户连接',
    disconnected: '用户断开连接',
  },
  jobs: {
    started: '定时任务已启动',
    scheduled: '定时任务已设置',
    dailyReminderStarted: '执行每日提醒任务开始',
    dailyReminderCompleted: '每日提醒任务完成',
    dailyReminderFailed: '每日提醒任务错误',
    checkInReminderStarted: '打卡提醒任务开始',
    checkInReminderCompleted: '打卡提醒任务完成',
    checkInReminderFailed: '打卡提醒任务错误',
    appointmentReminderStarted: '预约提醒任务开始',
    appointmentReminderCompleted: '预约提醒任务完成',
    appointmentReminderFailed: '预约提醒任务错误',
  },
};
