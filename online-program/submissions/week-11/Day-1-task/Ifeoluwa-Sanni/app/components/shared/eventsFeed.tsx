"use client";
import React from 'react';
import { useENSEvents } from '../../hooks/useENSEvents';
import { truncateAddr } from '@/utils/utils';

export const EventsFeed: React.FC = () => {
  const events = useENSEvents();

  return (
    <div className="bg-secondary-purple rounded-2xl p-8 space-y-6 border border-accent-purple shadow-xl hover-lift fade-in">
      <h2 className="text-3xl font-bold text-light-purple">Live ENS Events</h2>
      {events.length === 0 ? (
        <p className="text-light-purple text-sm">No events yet</p>
      ) : (
        <ul className="space-y-4">
          {events.map((event) => (
            <li key={event.id} className="bg-primary-purple border border-light-purple rounded-xl p-4 text-sm text-light-purple shadow-lg hover-lift">
              {event.type === 'NameRegistered' && (
                <div>
                  <span className="text-green-400 font-medium">Registered</span> <span className="font-mono text-light-purple">{event.payload.name}</span> by <span className="font-mono text-accent-purple">{truncateAddr(event.payload.owner)}</span>
                </div>
              )}
              {event.type === 'NameTransferred' && (
                <div>
                  <span className="text-blue-400 font-medium">Transferred</span> <span className="font-mono text-light-purple">{event.payload.name}</span> to <span className="font-mono text-accent-purple">{truncateAddr(event.payload.newOwner)}</span>
                </div>
              )}
              {event.type === 'NameUpdated' && (
                <div>
                  <span className="text-yellow-400 font-medium">Updated</span> <span className="font-mono text-light-purple">{event.payload.name}</span> → <span className="font-mono text-accent-purple">{truncateAddr(event.payload.newAddress)}</span>
                </div>
              )}
              <div className="text-xs text-light-purple mt-2">{new Date(event.timestamp).toLocaleTimeString()}</div>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
};