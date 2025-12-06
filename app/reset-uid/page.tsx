'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';

export default function ResetUIDPage() {
  const [status, setStatus] = useState<'initial' | 'clearing' | 'cleared' | 'error'>('clearing');
  const router = useRouter();

  useEffect(() => {
    // 自动清除旧的UID
    try {
      localStorage.removeItem('zen_uid');
      console.log('旧UID已清除，将生成新的UUID格式ID');
      setTimeout(() => setStatus('cleared'), 0);
      
      // 3秒后跳转到首页
      setTimeout(() => {
        router.push('/');
      }, 3000);
    } catch (error) {
      console.error('清除UID失败:', error);
      setTimeout(() => setStatus('error'), 0);
    }
  }, [router]);

  return (
    <div className="min-h-screen bg-black text-white flex flex-col justify-center items-center p-6">
      <h1 className="text-3xl font-bold mb-8">修复用户ID格式</h1>
      
      {status === 'clearing' && (
        <div className="text-xl">正在清除旧的用户ID...</div>
      )}
      
      {status === 'cleared' && (
        <div className="text-center">
          <div className="text-xl mb-4">✅ 旧用户ID已清除</div>
          <div className="text-lg text-green-400 mb-6">
            系统将生成新的标准UUID格式ID
          </div>
          <div className="text-gray-400">3秒后自动返回首页...</div>
        </div>
      )}
      
      {status === 'error' && (
        <div className="text-xl text-red-500">清除失败，请手动在浏览器控制台执行：localStorage.removeItem(&apos;zen_uid&apos;)</div>
      )}
      
      <div className="mt-12 text-gray-500 text-sm max-w-md">
        <p>此页面会自动清除旧格式的用户ID（如 U8f9gxk1g），并在您下次访问时生成标准UUID格式的ID。</p>
        <p className="mt-2">新的UUID格式：xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx</p>
      </div>
    </div>
  );
}
