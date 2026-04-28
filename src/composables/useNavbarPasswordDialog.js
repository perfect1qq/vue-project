import { reactive } from 'vue'
import { ElMessage } from 'element-plus'

/**
 * 顶栏修改密码弹窗逻辑，和视图层解耦。
 */
export const useNavbarPasswordDialog = ({ request, onSuccess, dialogRef }) => {
  const changePassDialog = reactive({
    visible: false,
    form: { oldPassword: '', newPassword: '', confirmPassword: '' }
  })

  const confirmChangePass = async () => {
    const { oldPassword, newPassword, confirmPassword } = changePassDialog.form
    if (!oldPassword || !newPassword) return ElMessage.warning('请填写必填项')
    if (newPassword !== confirmPassword) return ElMessage.warning('两次输入的新密码不一致')
    if (newPassword.length < 6) return ElMessage.warning('密码长度至少为 6 位')

    try {
      await dialogRef?.value?.load(() =>
        request.post('/api/user/change-password', { oldPassword, newPassword })
      )
      ElMessage.success('密码修改成功，请重新登录')
      changePassDialog.visible = false
      onSuccess?.()
    } catch (error) {
      ElMessage.error(error?.response?.data?.message || '修改失败')
    }
  }

  return {
    changePassDialog,
    confirmChangePass
  }
}
