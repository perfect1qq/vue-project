/**
 * @file composables/useQuotationEditor.js
 * @description 报价单编辑器交互逻辑（事件处理层）
 *
 * 功能说明：
 * - 封装报价单编辑器的所有用户交互处理函数
 * - 连接 UI 事件与 useQuotationDraft 状态管理
 * - 处理 AI 智能解析、表单验证、提交保存等操作
 *
 * 架构定位：
 * ┌─────────────────────┐     ┌──────────────────────┐
 * │  QuotationList.vue   │────▶│  useQuotationEditor   │
 * │  (视图层)             │     │  (交互逻辑层)          │
 * └─────────────────────┘     └──────────┬───────────┘
 *                                          │ 调用
 *                                          ▼
 *                                ┌──────────────────────┐
 *                                │  useQuotationDraft    │
 *                                │  (状态管理层)          │
 *                                └──────────────────────┘
 *
 * 设计原则：
 * - 本模块不持有任何响应式状态，只接收依赖注入
 * - 所有业务逻辑通过 deps 参数解耦，便于测试和复用
 * - 错误处理统一使用 showError/showWarning
 */

import { to } from '@/utils/async'
import { showError, showSuccess, showWarning } from '@/utils/message'

/**
 * 创建报价单编辑器交互处理器
 *
 * @param {Object} deps - 依赖注入对象
 * @param {import('vue').Ref<boolean>} deps.isViewMode - 是否查看模式
 * @param {import('vue').Ref<boolean>} deps.parsing - 解析加载状态
 * @param {import('vue').Ref<boolean>} deps.isSubmitting - 提交加载状态
 * @param {import('vue').Ref<string>} deps.rawText - 原始文本内容
 * @param {import('vue').Ref<Array>} deps.items - 明细行数据
 * @param {import('vue').Ref<string>} deps.quotationNo - 报价单号
 * @param {import('vue').Ref<string>} deps.companyName - 公司名称
 * @param {import('vue').Ref<Object>} deps.formRef - 表单引用
 * @param {Object} deps.formModel - 表单模型
 * @param {import('vue').Ref<number|null>} deps.editingHistoryId - 编辑中的记录 ID
 * @param {import('vue').Ref<string>} deps.originalPayloadStr - 原始快照
 * @param {import('vue').Ref<boolean>} deps.isManualFinalPrice - 手动成交价模式
 * @param {Function} deps.setFinalPriceManual - 设置手动成交价
 * @param {Function} deps.restoreAutoFinalPrice - 恢复自动成交价
 * @param {Function} deps.setRows - 批量设置行数据
 * @param {Function} deps.getPayload - 获取提交数据
 * @param {Function} deps.saveQuotation - 保存报价单 API
 * @param {Function} [deps.onSaveSuccess] - 保存成功回调
 * @param {Function} deps.parseTextFn - AI 智能解析文本函数
 * @returns {Object} 交互处理方法集合
 */
const useQuotationEditor = (deps) => {
  const {
    isViewMode,
    parsing,
    isSubmitting,
    rawText,
    items,
    quotationNo,
    companyName,
    formRef,
    formModel,
    editingHistoryId,
    originalPayloadStr,
    isManualFinalPrice,
    setFinalPriceManual,
    restoreAutoFinalPrice,
    setRows,
    getPayload,
    saveQuotation,
    onSaveSuccess,
  } = deps

  /**
   * 处理手动成交价变化
   *
   * 当用户在"成交价"输入框中修改值时触发，
   * 切换到手动模式并反向计算折扣率
   *
   * @param {*} value - 用户输入的成交价值
   */
  const handleManualFinalPriceChange = (value) => {
    try {
      if (isViewMode?.value) return

      if (typeof setFinalPriceManual === 'function') {
        setFinalPriceManual(value)
      }
    } catch (error) {
      // 静默处理异常
    }
  }

  /**
   * 处理折扣值变化
   *
   * 当用户修改折扣时：
   * - 如果当前是手动成交价模式 → 自动恢复为自动模式
   * - 成交价重新跟随折扣计算
   */
  const handleDiscountChange = () => {
    try {
      if (isViewMode?.value) return

      // 如果之前锁定了手动模式，现在改折扣就解锁
      if (
        isManualFinalPrice?.value &&
        typeof restoreAutoFinalPrice === 'function'
      ) {
        restoreAutoFinalPrice()
      }
    } catch (error) {
      // 静默处理异常
    }
  }

  /**
   * 处理 AI 智能解析文本
   *
   * 流程：
   * 1. 检查是否有待解析文本
   * 2. 调用后端 parseText 接口进行智能识别
   * 3. 将解析结果填充到明细表格
   * 4. 显示成功/警告提示
   */
  const handleParseText = async () => {
    if (isViewMode.value) return

    // 检查文本是否为空
    const text = String(rawText.value ?? '').trim()
    if (!text) return showWarning('请先粘贴报价内容至编辑框内')

    parsing.value = true

    // 调用 AI 解析接口
    const [err, result] = await to(deps.parseTextFn(text))
    if (err) {
      showError(err, '解析失败，请检查服务连通性')
      parsing.value = false
      return
    }

    if (!result) {
      parsing.value = false
      return
    }

    // 填充解析结果到表格
    setRows(result.items || [], result.columns || [])

    // 显示提示信息
    if (result.warnings?.length) {
      showWarning(result.warnings[0])
    } else {
      showSuccess('文本解析完成，已渲染至下方数据表')
    }

    parsing.value = false
  }

  /**
   * 验证明细行数据的完整性
   *
   * 校验规则：
   * 1. 报价单号不能为空
   * 2. 公司名称不能为空
   * 3. 至少有一行有效数据
   * 4. 有效行必须有数量+单价 或 小计
   * 5. 不能有残缺不完整的行
   *
   * @returns {boolean} 验证是否通过
   */
  const validateRows = () => {
    // 筛选出有效行（有实际内容的行）
    const validRows = items.value.filter((row) => {
      const hasText =
        String(row.name || '').trim() ||
        String(row.spec || '').trim()
      const hasQty = String(row.quantity ?? '').trim() !== ''
      const hasUnit = String(row.unitPrice ?? '').trim() !== ''
      const hasTotal = String(row.totalPrice ?? '').trim() !== ''
      const meaningful = hasText || hasQty || hasUnit || hasTotal

      // 有效行必须：(有数量且有单价) 或 (有小计)
      return meaningful ? (hasQty && hasUnit) || hasTotal : false
    })

    if (!quotationNo.value.trim()) {
      showWarning('请先填写名称')
      return false
    }
    if (!companyName.value.trim()) {
      showWarning('请先填写公司名称归属')
      return false
    }
    if (!validRows.length) {
      showWarning(
        '请先录入或使用 AI 智能粘贴获取报价明细',
      )
      return false
    }
    if (validRows.length !== items.value.length) {
      showWarning(
        '表格存在残缺不完整的数据行，请修正后继续',
      )
      return false
    }

    return true
  }

  /**
   * 处理表单提交（保存报价单）
   *
   * 完整流程：
   * 1. 同步 formModel 到 ref
   * 2. 触发表单验证
   * 3. 验证明细行完整性
   * 4. 深比对检测是否有实际修改
   * 5. 调用保存接口
   * 6. 成功后执行回调
   */
  const handleSubmit = async () => {
    if (isSubmitting.value) return

    // 同步表单模型到响应式变量
    quotationNo.value = formModel.quotationNo
    companyName.value = formModel.companyName

    // 触发 Element Plus 表单验证
    const [validateErr] = await to(formRef.value?.validate())
    if (validateErr) return

    // 自定义业务验证
    if (!validateRows()) return

    // 获取提交数据并进行深比对
    const payload = getPayload()

    // 如果编辑模式下没有实际修改，拒绝提交
    if (
      editingHistoryId?.value &&
      JSON.stringify(payload) === originalPayloadStr?.value
    ) {
      return showWarning('没有做任何修改，无法保存无用的沉余记录！')
    }

    // 执行保存
    isSubmitting.value = true
    const [err, result] = await to(
      saveQuotation(payload, editingHistoryId?.value),
    )

    if (err) {
      showError(err, '入库失败，请稍后刷新重试！')
      isSubmitting.value = false
      return
    }

    if (result) {
      showSuccess(editingHistoryId?.value ? '修改成功' : '成功新增报价单')

      // 执行保存成功回调（如重置草稿）
      if (onSaveSuccess) onSaveSuccess(result)
    }

    isSubmitting.value = false
  }

  return {
    handleManualFinalPriceChange,
    handleDiscountChange,
    handleParseText,
    validateRows,
    handleSubmit,
  }
}

export { useQuotationEditor }
