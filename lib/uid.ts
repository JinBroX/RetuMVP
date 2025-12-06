// 统一的用户ID生成工具函数
export function generateUserId(): string {
  // 使用标准的UUID v4格式，与Supabase的uuid类型兼容
  return crypto.randomUUID();
}
