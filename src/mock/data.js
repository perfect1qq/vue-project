// 报价单模拟数据
export const mockQuotationData = [
  {
    id: 1,
    quotationNo: 'QT-2024-001',
    customerName: 'XX科技有限公司',
    quotationDate: '2024-03-15',
    totalAmount: 125800.00,
    status: '已报价',
    remark: '标准设备报价'
  },
  {
    id: 2,
    quotationNo: 'QT-2024-002',
    customerName: '南方工业集团',
    quotationDate: '2024-03-20',
    totalAmount: 358000.00,
    status: '已确认',
    remark: '含安装调试'
  },
  {
    id: 3,
    quotationNo: 'QT-2024-003',
    customerName: '华威机械有限公司',
    quotationDate: '2024-04-02',
    totalAmount: 89650.00,
    status: '待审核',
    remark: ''
  },
  {
    id: 4,
    quotationNo: 'QT-2024-004',
    customerName: '创新精密制造厂',
    quotationDate: '2024-04-10',
    totalAmount: 226000.00,
    status: '已报价',
    remark: '含税价'
  }
]

// 横梁报价单模拟数据
export const mockBeamQuotationData = [
  {
    id: 1,
    beamModel: 'H-Beam-200',
    length: 6.5,
    quantity: 12,
    unitPrice: 1250,
    totalPrice: 97500,
    material: 'Q235B',
    deliveryDate: '2024-05-10'
  },
  {
    id: 2,
    beamModel: 'I-Beam-300',
    length: 8.2,
    quantity: 8,
    unitPrice: 1850,
    totalPrice: 121360,
    material: 'Q345B',
    deliveryDate: '2024-05-15'
  },
  {
    id: 3,
    beamModel: 'C-Channel-120',
    length: 5.0,
    quantity: 20,
    unitPrice: 560,
    totalPrice: 56000,
    material: 'Q235B',
    deliveryDate: '2024-05-05'
  },
  {
    id: 4,
    beamModel: 'Square Tube 100x100',
    length: 4.8,
    quantity: 15,
    unitPrice: 420,
    totalPrice: 30240,
    material: 'Q195',
    deliveryDate: '2024-05-20'
  }
]