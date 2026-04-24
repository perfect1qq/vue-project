import { ElMessage } from 'element-plus'

const extractMessage = (err, fallback = '操作失败') => {
  if (!err) return fallback
  return err?.response?.data?.message || err?.message || fallback
}

const showError = (err, fallback = '操作失败') => {
  const msg = extractMessage(err, fallback)
  try {
    ElMessage.error(msg)
  } catch (e) {
    console.error('[showError]', msg)
    alert(msg)
  }
}

const showSuccess = (msg = '操作成功') => {
  try {
    ElMessage.success(msg)
  } catch (e) {
    console.log('[showSuccess]', msg)
  }
}

const showWarning = (msg) => {
  try {
    ElMessage.warning(msg)
  } catch (e) {
    console.warn('[showWarning]', msg)
  }
}

const showInfo = (msg) => {
  try {
    ElMessage.info(msg)
  } catch (e) {
    console.info('[showInfo]', msg)
  }
}

export { showError, showSuccess, showWarning, showInfo, extractMessage }
