'use client';
import { useEffect } from 'react';
import { io, Socket } from 'socket.io-client';
import toast from 'react-hot-toast';
import { API_BASE } from '@/lib/api';
import { useNotifStore } from '@/store/notifications';

let socket: Socket | null = null;

export default function AdminNotificationListener() {
  const addNotif = useNotifStore((s) => s.addNotif);

  useEffect(() => {
    const socketUrl = API_BASE.replace('/api', '');

    if (!socket) {
      socket = io(socketUrl, {
        transports: ['websocket'],
        reconnectionAttempts: 5,
      });

      socket.on('connect', () => {
        socket?.emit('join-admins');
      });

      socket.on('notification', (notif: any) => {
        addNotif({
          id: notif.id ?? Date.now(),
          title: notif.title,
          body: notif.body,
          type: notif.type || 'info',
          created_at: notif.created_at || new Date().toISOString(),
          is_read: false,
        });

        toast.custom(
          (t) => (
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
          ),
          { duration: 8000 }
        );
      });
    } else {
      // Re-register addNotif on reconnect (closure refresh)
      socket.off('notification');
      socket.on('notification', (notif: any) => {
        addNotif({
          id: notif.id ?? Date.now(),
          title: notif.title,
          body: notif.body,
          type: notif.type || 'info',
          created_at: notif.created_at || new Date().toISOString(),
          is_read: false,
        });

        toast.custom(
          (t) => (
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
          ),
          { duration: 8000 }
        );
      });
    }

    return () => {
      // Keep socket alive for the whole admin session
    };
  }, [addNotif]);

  return null;
}
