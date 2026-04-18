'use client';
import { useEffect } from 'react';
import { io, Socket } from 'socket.io-client';
import toast from 'react-hot-toast';
import { API_BASE } from '@/lib/api';

let socket: Socket | null = null;

export default function AdminNotificationListener() {
  useEffect(() => {
    // Determine socket URL from API_BASE
    const socketUrl = API_BASE.replace('/api', '');
    
    if (!socket) {
      socket = io(socketUrl, {
        transports: ['websocket'],
        reconnectionAttempts: 5,
      });

      socket.on('connect', () => {
        console.log('Admin connected to notification server');
        // Join admin room
        socket?.emit('join', { userId: 'admins' });
      });

      socket.on('notification', (notif: any) => {
        // Show as a beautiful toast
        toast.custom((t) => (
          <div className={`notification-toast ${t.visible ? 'animate-enter' : 'animate-leave'} ${notif.type || 'info'}`}>
            <div className="notif-icon">
              {notif.type === 'success' ? '✅' : notif.type === 'error' ? '❌' : notif.type === 'warning' ? '⚠️' : '🔔'}
            </div>
            <div className="notif-content">
              <div className="notif-title">{notif.title}</div>
              <div className="notif-body">{notif.body}</div>
            </div>
            <button className="notif-close" onClick={() => toast.dismiss(t.id)}>×</button>
          </div>
        ), { duration: 8000 });
      });
    }

    return () => {
      // Keep connected for the whole admin session
    };
  }, []);

  return null;
}
