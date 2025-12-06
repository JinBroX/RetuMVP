'use client';

import React, { useState, useEffect, useRef, useCallback } from 'react';
import { generateUserId } from '@/lib/uid';

// 扩展window类型
declare global {
  interface Window {
    __ZEN_TAP_CLIENT_IP?: string;
  }
}

// 常量移到组件外部
const colors = ['color-1', 'color-2', 'color-3', 'color-4', 'color-5', 'color-6'];

interface Circle {
  id: number;
  size: number;
  color: string;
  x: number;
  y: number;
  animation: number;
  duration: number;
}

const HomeEntry = () => {
  const [circles, setCircles] = useState<Circle[]>([]);
  const containerRef = useRef<HTMLDivElement>(null);
  const circleCount = 24;

  // 不再需要自定义genUID函数，直接使用import的generateUserId

  const shuffleArray = useCallback(<T,>(a: T[]): T[] => {
    const newArray = [...a];
    for (let i = newArray.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [newArray[i], newArray[j]] = [newArray[j], newArray[i]];
    }
    return newArray;
  }, []);

  const findPos = (size: number, placed: Array<{ x: number; y: number; radius: number }>): { x: number; y: number } => {
    const container = containerRef.current;
    if (!container) return { x: 0, y: 0 };

    const maxA = 200;
    let a = 0;
    const radius = size / 2;

    while (a < maxA) {
      const x = Math.random() * (container.offsetWidth - size);
      const y = Math.random() * (container.offsetHeight - size);

      if (placed.every(p => 
        Math.sqrt((p.x - x) ** 2 + (p.y - y) ** 2) >= (p.radius + radius + 10)
      )) return { x, y };

      a++;
    }

    return {
      x: Math.random() * (container.offsetWidth - size),
      y: Math.random() * (container.offsetHeight - size)
    };
  };

  const createCircles = useCallback(() => {
    const container = containerRef.current;
    if (!container) return;

    const sizes = shuffleArray(Array.from({ length: circleCount }, (_, i) => 
      Math.min(container.offsetWidth, container.offsetHeight) * (1 - i * 0.1) * 0.25
    ));

    const placed: Array<{ x: number; y: number; radius: number }> = [];
    const colorAs = shuffleArray([...colors]);
    const newCircles: Circle[] = [];

    for (let i = 0; i < circleCount; i++) {
      const size = sizes[i];
      const animation = Math.floor(Math.random() * 3) + 1;
      const duration = 7 + Math.random() * 2;
      const pos = findPos(size, placed);

      newCircles.push({
        id: i + 1,
        size,
        color: colorAs[i],
        x: pos.x,
        y: pos.y,
        animation,
        duration
      });

      placed.push({ x: pos.x, y: pos.y, radius: size / 2 });
    }

    setCircles(newCircles);
  }, [shuffleArray]);

  const handleCircleClick = async (e: React.MouseEvent<HTMLDivElement>, circle: Circle) => {
    // Capture currentTarget immediately to avoid null reference after async await
    const circleEl = e.currentTarget;
    
    // eslint-disable-next-line react-hooks/purity
    const ts = Date.now();
    const uid = localStorage.getItem('zen_uid') || generateUserId();
    if (!localStorage.getItem('zen_uid')) localStorage.setItem('zen_uid', uid);
    const ip = window.__ZEN_TAP_CLIENT_IP || '0.0.0.0';
    const x = Math.round(e.clientX);
    const y = Math.round(e.clientY);

    try {
      console.log('Generating hexagram...');
      
      // 调用后端API生成卦象并获取故事
      const res = await fetch('/api/fetch-story', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({ 
          uid,
          seed: { x, y, ts } // 传入时空参数作为种子
        })
      });
      
      if (!res.ok) {
        throw new Error(`API Error: ${res.status}`);
      }
      
      const data = await res.json();
      console.log('Story data received:', data);
      
      // 将数据保存到sessionStorage供ReaderView使用
      sessionStorage.setItem('current_story_data', JSON.stringify(data));
      
      // 动画效果：点击的圆圈放大消失
      circleEl.style.transform = 'scale(2.5)';
      circleEl.style.opacity = '0';

      // 延迟跳转，让动画播放完
      setTimeout(() => {
        // 使用 window.location.href 确保完全刷新，或者使用 router.push
        // 这里使用 window.location.href 以确保状态清理（如果需要）
        // 但为了 SPA 体验，我们使用 router.push (需要引入 useRouter)
        // 由于组件顶部没有引入 useRouter，这里暂时用 location.href
        window.location.href = '/theater'; 
      }, 500);
      
    } catch (error) {
      console.error('Error starting adventure:', error);
      alert('连接全息场失败，请重试');
    }
  };

  useEffect(() => {
    createCircles();

    const handleResize = () => createCircles();
    const handleKeyDown = (e: KeyboardEvent) => e.key.toLowerCase() === 'r' && createCircles();

    window.addEventListener('resize', handleResize);
    document.addEventListener('keydown', handleKeyDown);

    return () => {
      window.removeEventListener('resize', handleResize);
      document.removeEventListener('keydown', handleKeyDown);
    };
  }, [createCircles]);

  return (
    <div 
      ref={containerRef}
      className="relative w-screen h-screen flex flex-col justify-center items-center bg-purple-600 overflow-hidden"
    >
      <style jsx>{`
        .circle {
          position: absolute;
          border-radius: 50%;
          cursor: pointer;
          transition: all .5s ease;
        }
        
        .circle:hover {
          opacity: .9;
          transform: scale(1.05);
        }
        
        .circle.color-1 {
          background: rgba(102,178,255,.6);
        }
        
        .circle.color-2 {
          background: rgba(144,204,144,.6);
        }
        
        .circle.color-3 {
          background: rgba(255,179,179,.6);
        }
        
        .circle.color-4 {
          background: rgba(179,144,255,.6);
        }
        
        .circle.color-5 {
          background: rgba(255,204,128,.6);
        }
        
        .circle.color-6 {
          background: rgba(184,219,230,.6);
        }
        
        @keyframes breathe1 {
          0%,100% {
            transform: scale(1);
            opacity: .4;
          }
          50% {
            transform: scale(2.2);
            opacity: .8;
          }
        }
        
        @keyframes breathe2 {
          0%,100% {
            transform: scale(1);
            opacity: .3;
          }
          50% {
            transform: scale(2.5);
            opacity: .7;
          }
        }
        
        @keyframes breathe3 {
          0%,100% {
            transform: scale(1);
            opacity: .5;
          }
          50% {
            transform: scale(2);
            opacity: .9;
          }
        }
      `}</style>

      <div className="text-9xl font-bold text-white text-center z-10 shadow-lg">Retu</div>
      <div className="text-2xl text-white text-center mt-5 shadow-lg">点击任意圆形获取全息信息</div>

      {circles.map((circle) => (
        <div
          key={circle.id}
          className={`circle ${circle.color}`}
          style={{
            width: `${circle.size}px`,
            height: `${circle.size}px`,
            left: `${circle.x}px`,
            top: `${circle.y}px`,
            animation: `breathe${circle.animation} ${circle.duration}s infinite ease-in-out`
          }}
          onClick={(e) => handleCircleClick(e, circle)}
          data-id={circle.id}
        />
      ))}
    </div>
  );
};

export default HomeEntry;