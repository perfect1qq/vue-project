# 📚 倍力特货架报价系统 - 后端 API 接口文档

> **版本**: v1.0.0  
> **基础URL**: `http://localhost:3001/api` (开发环境)  
> **认证方式**: Cookie Session (JWT Token)  
> **数据格式**: JSON

---

## 📋 目录

- [🔐 认证与用户管理](#-认证与用户管理)
- [📄 报价单管理](#-报价单管理)
- [✅ 审批管理](#-审批管理)
- [📊 横梁载重单](#-横梁载重单)
- [👥 客户管理](#-客户管理)
- [📝 备忘录管理](#-备忘录管理)
- [💬 留言管理](#-留言管理)
- [🔔 通知中心](#-通知中心)
- [⚙️ 中型货架重量表](#-中型货架重量表)
- [🛠️ 工具接口](#-工具接口)
- [❌ 错误码说明](#-错误码说明)

---

## 🔐 认证与用户管理

### 基础路径: `/api`

| 接口 | 方法 | 路径 | 权限 | 说明 |
|------|------|------|------|------|
| 用户登录 | POST | `/login` | 公开 | 用户名密码登录 |
| 用户注册 | POST | `/register` | 公开+邀请码 | 新用户注册 |
| 获取个人信息 | GET | `/profile` | 已登录 | 获取当前登录用户信息 |
| 获取菜单配置 | GET | `/menu` | 已登录 | 根据角色返回菜单列表 |
| 获取用户列表 | GET | `/users` | Admin | 获取所有用户列表 |
| 创建用户 | POST | `/users` | Admin | 管理员创建新用户 |
| 修改密码 | POST | `/user/change-password` | 已登录 | 当前用户修改密码 |
| 重置密码 | POST | `/users/:id/reset-password` | Admin | 管理员重置用户密码 |
| 修改角色 | PUT | `/users/:id/role` | Admin | 修改用户角色 |
| 修改姓名 | PUT | `/users/:id/name` | Admin | 修改用户显示姓名 |
| 删除用户 | DELETE | `/users/:id` | Admin | 删除用户账号 |
| 退出登录 | POST | `/logout` | 已登录 | 清除会话并登出 |
| 获取邀请码 | GET | `/invite-code` | Admin | 获取当前有效邀请码 |
| 刷新邀请码 | POST | `/invite-code/refresh` | Admin | 生成新的邀请码 |

---

#### 1️⃣ 用户登录

**POST** `/api/login`

**请求参数**:
```json
{
  "username": "string (必填, 最大50字符)",
  "password": "string (必填, 最大100字符)"
}
```

**成功响应** (200):
```json
{
  "success": true,
  "message": "登录成功",
  "data": {
    "user": {
      "id": 1,
      "username": "admin",
      "name": "管理员",
      "role": "admin"
    },
    "permissions": ["user:manage", "quotation:write"],
    "menu": [...]
  }
}
```

**错误响应**:
- `401`: 用户名或密码错误
- `429`: 登录尝试次数过多（每小时限制10次）

---

#### 2️⃣ 用户注册

**POST** `/api/register`

**前置条件**:
- `ALLOW_PUBLIC_REGISTER=true` (环境变量)
- 提供有效的邀请码

**请求参数**:
```json
{
  "username": "string (必填)",
  "password": "string (必填)",
  "name": "string (选填, 显示名称)",
  "inviteCode": "string (必填, 邀请码)"
}
```

**成功响应** (201):
```json
{
  "success": true,
  "message": "注册成功",
  "data": {
    "user": { ... }
  }
}
```

---

#### 3️⃣ 获取个人信息

**GET** `/api/profile` 或 `/api/me`

**请求头**:
```
Cookie: session_token=xxx
```

**成功响应** (200):
```json
{
  "success": true,
  "message": "ok",
  "data": {
    "user": { ... },
    "permissions": [...],
    "menu": [...]
  }
}
```

**缓存策略**: Private Cache 30秒

---

#### 4️⃣ 获取用户列表 (Admin)

**GET** `/api/users`

**权限要求**: `admin` 角色

**成功响应** (200):
```json
{
  "success": true,
  "message": "ok",
  "data": {
    "users": [
      {
        "id": 1,
        "username": "admin",
        "name": "管理员",
        "role": "admin",
        "createdAt": "2024-01-01T00:00:00Z"
      }
    ]
  }
}
```

---

#### 5️⃣ 创建用户 (Admin)

**POST** `/api/users`

**权限要求**: `admin` 角色

**请求参数**:
```json
{
  "username": "string (必填)",
  "password": "string (必填)",
  "name": "string (选填)",
  "role": "string (选填, 默认 'user', 可选: admin/user/guest)"
}
```

**成功响应** (201):
```json
{
  "success": true,
  "message": "创建成功",
  "data": {
    "user": { ... }
  }
}
```

---

## 📄 报价单管理

### 基础路径: `/api/quotations`

| 接口 | 方法 | 路径 | 权限 | 说明 |
|------|------|------|------|------|
| 获取列表 | GET | `/` | 已登录 | 分页查询报价单列表 |
| 检查公司名重复 | GET | `/check-company` | 已登录 | 检查公司名是否已存在 |
| 获取详情 | GET | `/:id` | 已登录 | 获取报价单详情及日志 |
| 创建报价单 | POST | `/` | Admin/User | 新建报价单 |
| 更新报价单 | PUT | `/:id` | Admin/User | 编辑报价单内容 |
| 提交审批 | POST | `/:id/submit` | Admin/User | 提交报价单等待审批 |
| 撤回报价单 | POST | `/:id/recall` | Admin/User | 撤回已提交的报价单 |
| 删除报价单 | DELETE | `/:id` | Admin | 删除报价单(软删除) |
| 审批通过 | POST | `/:id/approve` | Admin | 审核通过报价单 |
| 驳回报价单 | POST | `/:id/reject` | Admin | 驳回报价单 |

---

#### 1️⃣ 获取报价单列表

**GET** `/api/quotations`

**查询参数**:
| 参数 | 类型 | 必填 | 说明 |
|------|------|------|------|
| status | string | 否 | 状态筛选: draft/pending/approved/rejected/deleted |
| keyword | string | 否 | 关键词搜索(公司名/编号) |
| page | number | 否 | 页码(默认1) |
| pageSize | number | 否 | 每页条数(默认20) |

**成功响应** (200):
```json
{
  "success": true,
  "message": "ok",
  "data": {
    "quotations": [...],
    "total": 100,
    "page": 1,
    "pageSize": 20
  }
}
```

**缓存策略**: Private Cache 10秒

---

#### 2️⃣ 创建报价单

**POST** `/api/quotations`

**权限要求**: `admin` 或 `user` 角色

**请求参数** (完整结构):
```json
{
  "quotationNo": "string (报价单编号, 自动生成)",
  "companyName": "string (公司名称, 必填)",
  "remark": "string (备注)",
  "discount": "number (折扣百分比, 0-100)",
  "finalPrice": "number (成交价, 可手动覆盖)",
  "items": [
    {
      "name": "string (项目名称)",
      "spec": "string (规格型号)",
      "quantity": "number (数量)",
      "unitPrice": "number (单价)",
      "totalPrice": "number (总价)"
    }
  ]
}
```

**业务逻辑**:
- 自动生成唯一报价单编号 (`QT-YYYYMMDD-XXXXX`)
- 自动计算小计、优惠金额、成交价
- 支持手动覆盖成交价模式
- 初始状态为 `draft`(草稿)

**成功响应** (201):
```json
{
  "success": true,
  "message": "创建成功",
  "data": {
    "quotation": {
      "id": 1,
      "quotationNo": "QT-20260426-00001",
      "companyName": "武汉测试公司",
      "status": "draft",
      "subtotal": 10000,
      "discountAmount": 500,
      "finalPrice": 9500,
      "createdAt": "..."
    }
  }
}
```

---

#### 3️⃣ 提交审批

**POST** `/api/quotations/:id/submit`

**业务规则**:
- 仅 `draft` 或 `rejected` 状态可提交
- 已通过(`approved`)的报价单不能重复提交
- 提交后状态变为 `pending`
- 自动发送通知给所有管理员

**成功响应** (200):
```json
{
  "success": true,
  "message": "提交成功",
  "data": {
    "quotation": {
      "id": 1,
      "status": "pending",
      "submittedAt": "2026-04-26T10:00:00Z"
    }
  }
}
```

---

#### 4️⃣ 审批操作 (Admin)

**通过审批**: `POST` `/api/quotations/:id/approve`

**驳回报价单**: `POST` `/api/quotations/:id/reject`

**请求参数**:
```json
{
  "comment": "string (审批意见, 选填)"
}
```

**驳回时额外字段**:
```json
{
  "reason": "string (驳回原因, 选填)"
}
```

**成功响应** (200):
```json
{
  "success": true,
  "message": "操作成功",
  "data": {
    "quotation": {
      "id": 1,
      "status": "approved", // 或 "rejected"
      "approvedAt": "...",  // 通过时间
      "reviewComment": "审核意见"
    }
  }
}
```

**副作用**:
- ✅ 通过: 发送通知给报价单创建者
- ❌ 驳回: 发送通知给创建者(含驳回原因)
- 📝 写入审批日志记录

---

## ✅ 审批管理

### 基础路径: `/api/approvals`

| 接口 | 方法 | 路径 | 权限 | 说明 |
|------|------|------|------|------|
| 待审批列表 | GET | `/` | Admin | 获取待审批的报价单 |
| 审批历史 | GET | `/history` | Admin | 获取已审批的历史记录 |
| 审批详情 | GET | `/:id` | Admin | 获取单条审批详情+日志 |

---

#### 1️⃣ 待审批列表

**GET** `/api/approvals`

**查询参数**:
| 参数 | 类型 | 必填 | 说明 |
|------|------|------|------|
| status | string | 否 | 默认 `pending` |
| keyword | string | 否 | 搜索关键词 |
| page | number | 否 | 页码 |
| pageSize | number | 否 | 每页条数 |

**成功响应** (200):
```json
{
  "success": true,
  "message": "ok",
  "data": {
    "approvals": [
      {
        "id": 1,
        "name": "报价单名称",
        "companyName": "公司名",
        "ownerName": "提交人",
        "status": "pending",
        "submittedAt": "2026-04-26T...",
        "subtotal": 10000
      }
    ],
    "total": 5,
    "page": 1,
    "pageSize": 20
  }
}
```

---

#### 2️⃣ 审批历史

**GET** `/api/approvals/history`

**查询参数**: 同待审批列表

**特殊说明**:
- 包含三种状态: `approved`(已通过) + `rejected`(已驳回) + `deleted`(已删除)
- 用于查看所有历史审批记录

---

## 📊 横梁载重单

### 基础路径: `/api/beam-quotations`

| 接口 | 方法 | 路径 | 权限 | 说明 |
|------|------|------|------|------|
| 获取列表 | GET | `/` | 已登录 | 分页查询横梁载重记录 |
| 检查名称重复 | GET | `/check-name` | 已登录 | 检查名称是否已存在 |
| 创建记录 | POST | `/` | Admin/User | 新建横梁载重记录 |
| 更新记录 | PUT | `/:id` | Admin/User | 编辑记录 |
| 删除记录 | DELETE | `/:id` | Admin | 删除记录 |

---

#### 1️⃣ 获取列表

**GET** `/api/beam-quotations`

**查询参数**:
| 参数 | 类型 | 必填 | 说明 |
|------|------|------|------|
| keyword | string | 否 | 名称搜索 |
| page | number | 否 | 页码 |
| pageSize | number | 否 | 每页条数 |

**成功响应** (200):
```json
{
  "success": true,
  "message": "ok",
  "data": {
    "records": [...],
    "total": 50,
    "page": 1,
    "pageSize": 20
  }
}
```

---

#### 2️⃣ 创建记录

**POST** `/api/beam-quotations`

**请求参数** (示例):
```json
{
  "name": "横梁名称",
  "spec": "规格型号",
  "loadCapacity": 1000,
  "unitPrice": 150
}
```

**成功响应** (201):
```json
{
  "success": true,
  "message": "保存成功",
  "data": {
    "record": {
      "id": 1,
      "name": "...",
      "createdAt": "..."
    }
  }
}
```

---

## 👥 客户管理

### 基础路径: `/api/customers`

| 接口 | 方法 | 路径 | 权限 | 说明 |
|------|------|------|------|------|
| 获取列表 | GET | `/` | 已登录 | 分页查询客户列表 |
| 获取详情 | GET | `/:id` | 已登录 | 获取客户详细信息 |
| 创建客户 | POST | `/` | Admin/User | 新建客户档案 |
| 更新客户 | PUT | `/:id` | Admin/User | 编辑客户信息 |
| 删除客户 | DELETE | `/:id` | Admin | 删除客户(软删除) |
| 添加跟进 | POST | `/:id/follow-ups` | Admin/User | 添加跟进记录 |
| 删除跟进 | DELETE | `/follow-ups/:id` | Admin | 删除跟进记录 |

---

#### 1️⃣ 获取客户列表

**GET** `/api/customers`

**查询参数**:
| 参数 | 类型 | 必填 | 说明 |
|------|------|------|------|
| keyword | string | 否 | 搜索(公司名/联系人) |
| page | number | 否 | 页码(默认1) |
| pageSize | number | 否 | 每页条数(默认20) |
| cooperationStatus | string | 否 | 合作状态筛选 |
| customerType | string | 否 | 客户类型筛选 |

**合作状态枚举**:
- `uncontacted` - 未联系
- `contacting` - 联系中
- `cooperating` - 合作中
- `lost` - 流失

**成功响应** (200):
```json
{
  "success": true,
  "message": "ok",
  "data": {
    "customers": [
      {
        "id": 1,
        "companyName": "武汉测试公司",
        "customerName": "张三",
        "contactInfo": "13800138000",
        "cooperationStatus": "cooperating",
        "latestQuotation": {
          "quotationId": 1,
          "status": "approved",
          "quotedAt": "2026-04-26"
        },
        "followUpCount": 5,
        "createdAt": "..."
      }
    ],
    "total": 30,
    "page": 1,
    "pageSize": 20
  }
}
```

**特色功能**:
- ✅ 自动关联最新报价单状态
- ✅ 统计跟进次数
- ✅ 支持多维度筛选

**缓存策略**: Private Cache 30秒

---

#### 2️⃣ 创建客户

**POST** `/api/customers`

**请求参数**:
```json
{
  "companyName": "string (必填, 公司名称)",
  "customerName": "string (必填, 联系人姓名)",
  "contactInfo": "string (选填, 联系方式)",
  "remark": "string (选填, 备注)",
  "cooperationStatus": "string (选填, 默认 uncontacted)",
  "customerType": "string (选填, 默认 '终端')"
}
```

**字段限制**:
- `companyName`: 最大 100 字符
- `customerName`: 最大 100 字符
- `contactInfo`: 最大 200 字符
- `remark`: 最大 2000 字符

**成功响应** (201):
```json
{
  "success": true,
  "message": "客户创建成功",
  "data": {
    "customer": {
      "id": 1,
      "companyName": "武汉测试公司",
      "customerName": "张三",
      "cooperationStatus": "uncontacted",
      "createdAt": "..."
    }
  }
}
```

---

#### 3️⃣ 添加跟进记录

**POST** `/api/customers/:id/follow-ups`

**请求参数**:
```json
{
  "content": "string (必填, 跟进内容, 最大2000字符)",
  "followType": "string (选填, 跟进类型, 默认 '电话')",
  "nextTime": "string (选填, 下次跟进时间, ISO格式)"
}
```

**跟进类型示例**:
- `电话` - 电话沟通
- `微信` - 微信沟通
- `上门` - 上门拜访
- `邮件` - 邮件往来

**成功响应** (201):
```json
{
  "success": true,
  "message": "跟进记录添加成功",
  "data": {
    "followUp": {
      "id": 1,
      "customerId": 1,
      "content": "今日电话沟通了新需求...",
      "followType": "电话",
      "nextTime": "2026-05-01T10:00:00Z",
      "createdBy": "admin",
      "createdAt": "..."
    }
  }
}
```

---

## 📝 备忘录管理

### 基础路径: `/api/memos`

| 接口 | 方法 | 路径 | 权限 | 说明 |
|------|------|------|------|------|
| 获取列表 | GET | `/` | 已登录 | 获取当前用户的备忘录 |
| 获取历史 | GET | `/history` | 已登录 | 获取已完成/删除的历史备忘录 |
| 创建备忘录 | POST | `/` | Admin/User | 新建备忘录任务 |
| 更新备忘录 | PUT | `/:id` | Admin/User | 编辑备忘录内容/状态 |
| 删除备忘录 | DELETE | `/:id` | Admin | 删除备忘录 |
| 获取修改历史 | GET | `/:id/history` | 已登录 | 获取单条备忘录的修改记录 |
| 获取详情 | GET | `/:id` | 已登录 | 获取备忘录详细内容 |

---

#### 1️⃣ 获取备忘录列表

**GET** `/api/memos`

**查询参数**:
| 参数 | 类型 | 必填 | 说明 |
|------|------|------|------|
| keyword | string | 否 | 标题搜索 |
| label | string | 否 | 分类标签筛选 |
| completed | boolean | 否 | 完成状态筛选 |
| page | number | 否 | 页码 |
| pageSize | number | 否 | 每页条数 |

**成功响应** (200):
```json
{
  "success": true,
  "message": "ok",
  "data": {
    "memos": [
      {
        "id": 1,
        "title": "完成报价单审批",
        "content": "待处理事项...",
        "label": "工作",
        "completed": false,
        "remindAt": "2026-04-27T09:00:00Z",
        "priority": "high",
        "createdAt": "..."
      }
    ],
    "total": 10,
    "page": 1,
    "pageSize": 20
  }
}
```

**缓存策略**: No-Store (实时数据)

---

#### 2️⃣ 创建备忘录

**POST** `/api/memos`

**请求参数**:
```json
{
  "title": "string (必填, 任务标题, 最大100字符)",
  "content": "string (必填, 详细说明, 最大2000字符)",
  "label": "string (必填, 分类标签, 最大20字符)",
  "remindAt": "string (选填, 提醒时间, ISO格式)",
  "priority": "string (选填, 优先级: low/medium/high)"
}
```

**业务特性**:
- ⏰ 设置提醒时间后，系统每30秒轮询检查
- 🔔 到期自动发送通知提醒
- ✅ 支持标记完成/未完成

**成功响应** (201):
```json
{
  "success": true,
  "message": "创建成功",
  "data": {
    "memo": {
      "id": 1,
      "title": "完成报价单审批",
      "status": "active",
      "remindAt": "2026-04-27T09:00:00Z",
      "createdAt": "..."
    }
  }
}
```

---

## 💬 留言管理

### 基础路径: `/api/messages`

| 接口 | 方法 | 路径 | 权限 | 说明 |
|------|------|------|------|------|
| 提交留言 | POST | `/submit` | 公开 | 未登录用户提交留言 |
| 获取列表 | GET | `/list` | 已登录 | 获取留言列表(按角色分配) |
| 分配留言 | PUT | `/assign/:id` | Admin | 将留言指派给员工 |
| 添加备注 | PUT | `/:id/remark` | Admin/User | 给留言写备注 |
| 隐藏留言 | PUT | `/:id/hide-from-assignee` | Admin/User | 从我的列表移除 |
| 删除留言 | DELETE | `/:id` | Admin | 删除留言记录 |

---

#### 1️⃣ 公开留言提交

**POST** `/api/messages/submit`

**权限**: 无需登录 (公开接口)

**前置条件**:
- `ALLOW_PUBLIC_MESSAGE_SUBMIT=true` (环境变量)
- 受速率限制保护 (每小时20次)

**请求参数**:
```json
{
  "contactInfo": "string (必填, 联系方式, 最大200字符)",
  "content": "string (必填, 留言内容, 最大5000字符)"
}
```

**安全措施**:
- ✅ XSS 过滤和转义
- ✅ 内容长度校验
- ✅ 速率限制防刷屏

**成功响应** (201):
```json
{
  "success": true,
  "message": "留言提交成功",
  "data": {
    "id": 1,
    "contactInfo": "13800138000",
    "content": "我想咨询货架价格...",
    "status": "pending",
    "createdAt": "..."
  }
}
```

---

#### 2️⃣ 获取留言列表

**GET** `/api/messages/list`

**权限控制逻辑**:
- **Admin**: 可看到所有留言
- **User**: 只能看到分配给自己的留言

**查询参数**:
| 参数 | 类型 | 必填 | 说明 |
|------|------|------|------|
| keyword | string | 否 | 内容搜索 |
| page | number | 否 | 页码(默认1) |
| pageSize | number | 否 | 每页条数(默认10) |

**成功响应** (200):
```json
{
  "success": true,
  "message": "ok",
  "data": {
    "messages": [
      {
        "id": 1,
        "contactInfo": "138****8000",
        "content": "咨询重型货架...",
        "status": "assigned",
        "assignedTo": 2,
        "assigneeName": "张三",
        "remark": "已电话回复",
        "createdAt": "..."
      }
    ],
    "total": 25,
    "page": 1,
    "pageSize": 10
  }
}
```

**缓存策略**: Private Cache 10秒

---

#### 3️⃣ 分配留言 (Admin)

**PUT** `/api/messages/assign/:id`

**权限要求**: `admin` 角色

**请求参数**:
```json
{
  "assignedTo": "number (必填, 目标用户ID)"
}
```

**成功响应** (200):
```json
{
  "success": true,
  "message": "指派成功",
  "data": {
    "id": 1,
    "assignedTo": 2,
    "assignedAt": "2026-04-26T..."
  }
}
```

---

## 🔔 通知中心

### 基础路径: `/api/notifications`

| 接口 | 方法 | 路径 | 权限 | 说明 |
|------|------|------|------|------|
| 获取通知列表 | GET | `/` | 已登录 | 获取当前用户的通知 |
| 获取未读数 | GET | `/unread-count` | 已登录 | 获取未读通知数量 |
| 标记已读 | PUT | `/:id/read` | 已登录 | 标记单条通知为已读 |
| 全部已读 | POST | `/read-all` | 已登录 | 将所有通知标记为已读 |

---

#### 1️⃣ 获取通知列表

**GET** `/api/notifications`

**成功响应** (200):
```json
{
  "success": true,
  "message": "ok",
  "data": {
    "list": [
      {
        "id": 1,
        "content": "您提交的报价单'武汉测试'已通过审批",
        "type": "quotation_approved",
        "relatedId": 1,
        "isRead": false,
        "createdAt": "2026-04-26T10:30:00Z"
      },
      {
        "id": 2,
        "content": "备忘录提醒: 完成报价单审批",
        "type": "memo_reminder",
        "relatedId": 5,
        "isRead": true,
        "createdAt": "2026-04-26T09:00:00Z"
      }
    ]
  }
}
```

**通知类型枚举**:
- `quotation_submitted` - 新报价单待审批 (发给Admin)
- `quotation_approved` - 报价单已通过 (发给创建者)
- `quotation_rejected` - 报价单被驳回 (发给创建者)
- `memo_reminder` - 备忘录到期提醒

---

#### 2️⃣ 获取未读数量

**GET** `/api/notifications/unread-count`

**成功响应** (200):
```json
{
  "success": true,
  "message": "ok",
  "data": {
    "count": 3
  }
}
```

**使用场景**:
- 导航栏铃铛图标角标数字
- 实时刷新未读消息数

---

#### 3️⃣ 全部标记已读

**POST** `/api/notifications/read-all`

**成功响应** (200):
```json
{
  "success": true,
  "message": "全部标记成功",
  "data": null
}
```

---

## ⚙️ 中型货架重量表

### 基础路径: `/api/medium-shelf-weight`

| 接口 | 方法 | 路径 | 权限 | 说明 |
|------|------|------|------|------|
| 获取配置 | GET | `/` | 已登录 | 获取中型货架重量表数据 |
| 更新配置 | PUT | `/` | Admin | 更新整份重量表配置 |

---

#### 1️⃣ 获取配置

**GET** `/api/medium-shelf-weight`

**成功响应** (200):
```json
{
  "success": true,
  "message": "ok",
  "data": {
    "config": {
      "summaryRows": [
        {
          "index": 1,
          "name": "中型货架A型",
          "spec": "2000*600*2000",
          "layers": 4,
          "load": 2000,
          "totalWeight": 150,
          "accessoryWeights": {
            "pillarWeight": 50,
            "beamWeight": 60,
            "shelfWeight": 30,
            "otherWeight": 10
          }
        }
      ],
      "detailRows": [
        {
          "index": 1,
          "summaryId": 1,
          "layers": 2,
          "weight": 80,
          "loadCapacity": 1200,
          "unitPrice": 180
        }
      ]
    }
  }
}
```

**数据结构说明**:
- **summaryRows**: 汇总行（整体规格参数）
  - `layers`: 层数
  - `load`: 额定载重(kg)
  - `totalWeight`: 总自重(kg)
  - `accessoryWeights`: 配件重量拆分
- **detailRows**: 明细行（各层数具体规格）
  - `summaryId`: 关联的汇总行ID
  - `weight`: 该层数自重(kg)
  - `loadCapacity`: 该层数载重能力(kg)

---

## 🛠️ 工具接口

### 基础路径: `/api/tools`

| 接口 | 方法 | 路径 | 权限 | 说明 |
|------|------|------|------|------|
| 报价解析(GET) | GET | `/calculate` | 已登录 | 解析报价文本(计算汇总) |
| 报价解析(POST) | POST | `/calculate` | 已登录 | 解析报价文本(计算汇总) |
| AI智能解析 | POST | `/quotation-parse` | 已登录 | AI解析Word粘贴内容 |
| 性能监控 | GET | `/perf/overview` | Admin | 服务性能指标概览 |

---

#### 1️⃣ 报价单计算解析

**GET/POST** `/api/tools/calculate`

**请求参数**:
```json
{
  "text": "string (要解析的文本内容)",
  "type": "string (解析类型, 如 'beam')"
}
```

**使用场景**:
- 从 Word 表格复制的原始文本
- 自动提取名称、规格、数量、单价等信息
- 计算总价和小计

**成功响应** (200):
```json
{
  "success": true,
  "message": "ok",
  "data": {
    "items": [
      {
        "name": "主架",
        "spec": "2000*600*2000",
        "quantity": 10,
        "unitPrice": 350,
        "totalPrice": 3500
      }
    ],
    "subtotal": 8500,
    "parsedCount": 3
  }
}
```

---

#### 2️⃣ AI 智能解析

**POST** `/api/tools/quotation-parse`

**功能**:
- 使用正则表达式 + 规则引擎解析复杂表格
- 支持 Word/Excel 复制的多行文本
- 自动识别列对应关系
- 智能填充缺失字段

**请求参数**:
```json
{
  "text": "string (从Word复制的表格原文)"
}
```

**成功响应** (200):
```json
{
  "success": true,
  "message": "ok",
  "data": {
    "headers": ["序号", "名称", "规格", "数量", "单价", "总价"],
    "rows": [
      {
        "name": "重型横梁",
        "spec": "2000*80*45",
        "quantity": 20,
        "unitPrice": 85,
        "totalPrice": 1700
      }
    ],
    "confidence": 0.95
  }
}
```

---

#### 3️⃣ 服务性能监控 (Admin)

**GET** `/api/tools/perf/overview`

**权限要求**: `admin` 角色

**用途**:
- 监控服务器运行状态
- 排查慢接口问题
- 查看内存使用情况

**成功响应** (200):
```json
{
  "success": true,
  "message": "ok",
  "data": {
    "serverTime": "2026-04-26T12:00:00Z",
    "uptimeSec": 86400,
    "node": "v18.17.0",
    "memory": {
      "rssMb": 85.32,
      "heapTotalMb": 128.00,
      "heapUsedMb": 65.42,
      "externalMb": 12.56
    },
    "requestMetrics": {
      "totalRequests": 1234,
      "avgResponseTimeMs": 45.6,
      "slowEndpoints": [
        { path: "/api/quotations", avgMs: 230 }
      ]
    }
  }
}
```

**监控指标说明**:
- `rssMb`: 进程常驻内存(MB)
- `heapTotalMb`: V8堆总大小(MB)
- `heapUsedMb`: V8堆已用内存(MB)
- `externalMb`: C++对象绑定内存(MB)
- `requestMetrics`: 请求统计快照

---

## ❌ 错误码说明

### HTTP 状态码

| 状态码 | 含义 | 说明 |
|--------|------|------|
| 200 | 成功 | 请求正常处理 |
| 201 | 创建成功 | 资源创建完成 |
| 400 | 请求错误 | 参数缺失或格式错误 |
| 401 | 未授权 | 未登录或Token过期 |
| 403 | 禁止访问 | 无权限执行该操作 |
| 404 | 资源不存在 | 请求的资源未找到 |
| 409 | 数据冲突 | 唯一约束冲突(如重复创建) |
| 429 | 请求过多 | 触发速率限制 |
| 500 | 服务器错误 | 内部异常(隐藏细节) |
| 503 | 服务不可用 | 数据库连接失败等 |

### 业务错误码

| 错误码 | HTTP状态 | 场景 | 说明 |
|--------|----------|------|------|
| `VALIDATION_FAILED` | 400 | 参数校验 | 必填字段缺失/格式错误 |
| `NOT_FOUND` | 404 | 资源查找 | ID对应的记录不存在 |
| `FORBIDDEN` | 403 | 权限不足 | 角色无权执行此操作 |
| `UNAUTHORIZED` | 401 | 认证失败 | Token无效或已过期 |
| `DUPLICATE_ENTRY` | 409 | 唯一冲突 | 违反数据库唯一约束 |
| `REGISTRATION_DISABLED` | 403 | 功能关闭 | 公开注册功能已禁用 |
| `INVALID_INVITE_CODE` | 403 | 邀请码错误 | 邀请码无效或已过期 |
| `RATE_LIMITED` | 429 | 速率限制 | 请求频率超限 |
| `AUTH_RATE_LIMITED` | 429 | 登录限制 | 登录尝试次数过多 |
| `MESSAGE_RATE_LIMITED` | 429 | 留言限制 | 留言提交频率过高 |
| `CORS_FORBIDDEN` | 403 | 跨域拒绝 | 来源域名不在白名单内 |
| `TOKEN_EXPIRED` | 401 | Token过期 | JWT令牌已过期 |
| `TOKEN_INVALID` | 401 | Token无效 | JWT令牌格式错误 |
| `DATABASE_ERROR` | 500 | 数据库错误 | Prisma查询异常 |
| `INTERNAL_ERROR` | 500 | 内部错误 | 未知的服务器错误 |

### 错误响应格式

**标准错误响应结构**:
```json
{
  "success": false,
  "error": {
    "code": "VALIDATION_FAILED",
    "message": "用户名和密码不能为空",
    "status": 400,
    "requestId": "req_abc123xyz"
  }
}
```

**字段说明**:
- `code`: 业务错误码（用于程序判断）
- `message`: 用户友好的错误描述（可直接展示）
- `status`: HTTP状态码
- `requestId`: 请求追踪ID（用于日志排查）

---

## 🔐 安全机制

### 1. 认证流程

```
用户登录 → 验证凭据 → 生成JWT → 设置HttpOnly Cookie
                                        ↓
后续请求 → Cookie携带Token → 中间件验证 → 注入req.user
```

### 2. CSRF 防护

- 所有 POST/PUT/DELETE 请求需携带 CSRF Token
- Token 通过 Set-Cookie 下发
- 白名单外的来源会被拒绝

### 3. 速率限制

| 限制类型 | 时间窗口 | 限制次数 | 适用范围 |
|----------|----------|----------|----------|
| 全局限制 | 15分钟 | 500次(生产) / 1000次(开发) | 所有请求 |
| 登录限制 | 1小时 | 10次(生产) / 30次(开发) | login/register |
| 留言限制 | 1小时 | 20次(生产) / 60次(开发) | messages/submit |

### 4. 输入安全

- ✅ SQL注入防护 (Prisma ORM参数化查询)
- ✅ XSS防护 (HTML实体转义)
- ✅ 字段长度限制 (防止缓冲区溢出)
- ✅ 特殊字符过滤 (sanitizeField函数)

---

## 📊 数据模型关系图

```
┌─────────────┐     ┌──────────────┐     ┌─────────────┐
│   User      │     │  Quotation   │     │  Customer   │
│─────────────│     │──────────────│     │─────────────│
│ id (PK)     │◄──┐ │ id (PK)      │     │ id (PK)     │
│ username    │   └─│ ownerId (FK) │────►│ companyName │
│ password    │     │ quotationNo  │     │ customerName│
│ name        │     │ companyName  │     │ contactInfo │
│ role        │     │ status       │     │ remark      │
└─────────────┘     │ items[]      │     └──────┬──────┘
                    └──────┬──────┘            │
                           │                    │
              ┌────────────┼────────────┐      │
              ▼            ▼            ▼      ▼
        ┌──────────┐ ┌─────────┐ ┌─────────┐ ┌──────────┐
        │QuotationLog│ │Approval │ │ Memo    │ │FollowUp  │
        │──────────│ │─────────│ │─────────│ │──────────│
        │quotationId│ │quotationId│ │ ownerId │ │customerId│
        │action     │ │ status  │ │ title   │ │ content  │
        └──────────┘ └─────────┘ └────┬────┘ └──────────┘
                                      │
                                      ▼
                               ┌──────────────┐
                               │ Notification │
                               │──────────────│
                               │ userId (FK)  │
                               │ type         │
                               │ isRead       │
                               └──────────────┘
```

---

## 🚀 快速开始

### 1. 安装依赖

```bash
cd server
npm install
```

### 2. 配置环境变量

复制 `.env.example` 为 `.env` 并修改:

```bash
PORT=3001
DATABASE_URL="file:./dev.db"
ALLOW_PUBLIC_REGISTER=true
CORS_ALLOWED_ORIGINS=http://localhost:5173
JWT_SECRET=your-secret-key-here
INVITE_CODE=INITIAL-CODE-2024
```

### 3. 启动服务

```bash
npm run dev
# 或
node index.js
```

### 4. 测试接口

```bash
# 登录获取Token
curl -X POST http://localhost:3001/api/login \
  -H "Content-Type: application/json" \
  -d '{"username":"admin","password":"123456"}'

# 获取用户列表 (需携带Cookie)
curl http://localhost:3001/api/users \
  -H "Cookie: session_token=xxx"
```

---

## 📝 版本历史

| 版本 | 日期 | 变更说明 |
|------|------|----------|
| v1.0.0 | 2026-04-26 | 初始版本，包含完整API文档 |

---

## 📞 技术支持

如有问题，请联系：
- **项目负责人**: 系统管理员
- **技术支持**: 开发团队
- **文档最后更新**: 2026-04-26

---

> 💡 **提示**: 本文档基于后端代码自动生成，确保与实际接口保持同步。
> 
> ⚠️ **注意**: 生产环境部署前请务必修改默认密码、JWT密钥等敏感配置！
