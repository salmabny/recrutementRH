import { Injectable, signal, computed } from '@angular/core';

export interface Notification {
    id: number;
    message: string;
    time: string;
    read: boolean;
    type: 'candidature' | 'offre' | 'info';
    link?: string;
    photoUrl?: string;
}

@Injectable({ providedIn: 'root' })
export class NotificationService {

    private _notifications = signal<Notification[]>([]);

    notifications = this._notifications.asReadonly();

    unreadCount = computed(() => this._notifications().filter(n => !n.read).length);

    add(notif: Omit<Notification, 'id' | 'read' | 'time'>): void {
        const newNotif: Notification = {
            ...notif,
            id: Date.now(),
            read: false,
            time: new Date().toISOString()
        };
        this._notifications.update(list => [newNotif, ...list]);
    }

    markAllAsRead(): void {
        this._notifications.update(list => list.map(n => ({ ...n, read: true })));
    }

    markAsRead(id: number): void {
        this._notifications.update(list =>
            list.map(n => n.id === id ? { ...n, read: true } : n)
        );
    }

    clearAll(): void {
        this._notifications.set([]);
    }

    seedFromCandidatures(candidatures: any[]): void {
        if (this._notifications().length > 0) return; // don't re-seed
        const notifs: Notification[] = candidatures.slice(0, 5).map((c, i) => ({
            id: i + 1,
            message: `${c.candidat?.prenom ?? ''} ${c.candidat?.nom ?? ''} a postulé à "${c.jobOffer?.title ?? 'une offre'}"`,
            time: c.dateCandidature ?? new Date().toISOString(),
            read: false,
            type: 'candidature' as const,
            link: `/recruteur/candidatures/${c.id}`,
            photoUrl: c.candidat?.photoUrl ?? null
        }));
        this._notifications.set(notifs);
    }

    formatTime(isoStr: string): string {
        const date = new Date(isoStr);
        const now = new Date();
        const diff = Math.floor((now.getTime() - date.getTime()) / 1000);
        if (diff < 60) return 'À l\'instant';
        if (diff < 3600) return `${Math.floor(diff / 60)} min`;
        if (diff < 86400) return `${Math.floor(diff / 3600)} h`;
        return date.toLocaleDateString('fr-FR');
    }
}
