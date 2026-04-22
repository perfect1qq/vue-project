import { to } from '@/utils/async'
import { showError, showSuccess, showWarning } from '@/utils/message'

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
  isManualFinalPrice, // 是否处于手动指定总价模式
  setFinalPriceManual,
  restoreAutoFinalPrice,
  setRows,
  getPayload,
  saveQuotation,
  onSaveSuccess
} = deps

  const handleManualFinalPriceChange = (value) => {
    try {
      if (isViewMode?.value) return
      if (typeof setFinalPriceManual === 'function') {
        setFinalPriceManual(value)
      }
    } catch (error) {
      // handleManualFinalPriceChange 执行失败
    }
  }

  const handleDiscountChange = () => {
    try {
      if (isViewMode?.value) return
      if (isManualFinalPrice?.value && typeof restoreAutoFinalPrice === 'function') {
        restoreAutoFinalPrice()
      }
    } catch (error) {
      // handleDiscountChange 执行失败
    }
  }

  const handleParseText = async () => {
    if (isViewMode.value) return
    const text = String(rawText.value ?? '').trim()
    if (!text) return showWarning('请先粘贴报价内容至编辑框内')

    parsing.value = true
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
    setRows(result.items || [], result.columns || [])
    if (result.warnings?.length) showWarning(result.warnings[0])
    else showSuccess('文本解析完成，已渲染至下方数据表')
    parsing.value = false
  }

  const validateRows = () => {
    const validRows = items.value.filter(row => {
      const hasText = String(row.name || '').trim() || String(row.spec || '').trim()
      const hasQty = String(row.quantity ?? '').trim() !== ''
      const hasUnit = String(row.unitPrice ?? '').trim() !== ''
      const hasTotal = String(row.totalPrice ?? '').trim() !== ''
      const meaningful = hasText || hasQty || hasUnit || hasTotal
      return meaningful ? ((hasQty && hasUnit) || hasTotal) : false
    })
    if (!quotationNo.value.trim()) return showWarning('请先填写名称'), false
    if (!companyName.value.trim()) return showWarning('请先填写公司名称归属'), false
    if (!validRows.length) return showWarning('请先录入或使用 AI 智能粘贴获取报价明细'), false
    if (validRows.length !== items.value.length) return showWarning('表格存在残缺不完整的数据行，请修正后继续'), false
    return true
  }

  const handleSubmit = async () => {
    if (isSubmitting.value) return

    quotationNo.value = formModel.quotationNo
    companyName.value = formModel.companyName

    const [validateErr] = await to(formRef.value?.validate())
    if (validateErr) return
    if (!validateRows()) return

    const payload = getPayload()
    if (editingHistoryId?.value && JSON.stringify(payload) === originalPayloadStr?.value) {
      return showWarning('没有做任何修改，无法保存无用的沉余记录！')
    }

    isSubmitting.value = true
    const [err, result] = await to(saveQuotation(payload, editingHistoryId?.value))
    if (err) {
      showError(err, '入库失败，请稍后刷新重试！')
      isSubmitting.value = false
      return
    }
    if (result) {
      showSuccess(editingHistoryId?.value ? '修改成功' : '成功新增报价单')
      if (onSaveSuccess) onSaveSuccess(result)
    }
    isSubmitting.value = false
  }

  return {
    handleManualFinalPriceChange,
    handleDiscountChange,
    handleParseText,
    validateRows,
    handleSubmit
  }
}

export { useQuotationEditor }
