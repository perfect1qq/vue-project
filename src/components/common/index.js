import AsyncDialog from './AsyncDialog.vue'
import FormDialog from './FormDialog.vue'
import ConfirmDialog from './ConfirmDialog.vue'

export { AsyncDialog, FormDialog, ConfirmDialog }

export default {
  install(app) {
    app.component('AsyncDialog', AsyncDialog)
    app.component('FormDialog', FormDialog)
    app.component('ConfirmDialog', ConfirmDialog)
  }
}
