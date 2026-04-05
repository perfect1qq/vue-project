import request from '../utils/request'

/**
 * 官网留言管理 API
 *
 * 对接后端 /api/messages 路由组：
 *   GET  /list        获取留言（根据角色自动过滤）
 *   PUT  /assign/:id  管理员指派留言给业务员
 *   DEL  /:id         管理员删除留言
 */
export const messageApi = {
  /** 获取留言列表 */
  list: () => request.get('/api/messages/list'),

  /** 指派留言给指定用户 */
  assign: (id, userId) =>
    request.put(`/api/messages/assign/${id}`, { assignedTo: userId }),

  /** 删除留言 */
  remove: (id) => request.delete(`/api/messages/${id}`),
}
