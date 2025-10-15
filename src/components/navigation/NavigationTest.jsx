// Navigation Test Component
// Temporary component to verify Phase 1 foundation is working
// Add this to any page to test the NavigationContext

import React from 'react';
import { useNavigationContext } from './NavigationContext';
import { navigationItems } from './navigationConfig';
import {
  isItemVisible,
  getItemRoute,
  getItemBadge,
  formatBadgeCount,
} from './navigationUtils';

const NavigationTest = () => {
  const context = useNavigationContext();

  return (
    <div className="fixed bottom-4 right-4 z-[100] max-w-md p-4
                    bg-synthwave-bg-card/95 backdrop-blur-xl
                    border border-synthwave-neon-cyan/20 rounded-xl
                    shadow-xl">
      <h3 className="font-russo text-white text-sm uppercase mb-3">
        🧪 Navigation Test Panel
      </h3>

      <div className="space-y-2 text-xs font-rajdhani">
        {/* Context State */}
        <div className="p-2 bg-synthwave-bg-primary/30 rounded">
          <div className="text-synthwave-neon-cyan font-bold mb-1">Context State:</div>
          <div className="text-white space-y-1">
            <div>userId: <span className="text-synthwave-neon-pink">{context.userId || 'null'}</span></div>
            <div>coachId: <span className="text-synthwave-neon-pink">{context.coachId || 'null'}</span></div>
            <div>isAuthenticated: <span className="text-synthwave-neon-pink">{String(context.isAuthenticated)}</span></div>
            <div>hasCoachContext: <span className="text-synthwave-neon-pink">{String(context.hasCoachContext)}</span></div>
            <div>currentCoachName: <span className="text-synthwave-neon-pink">{context.currentCoachName || 'null'}</span></div>
          </div>
        </div>

        {/* Badge Counts */}
        <div className="p-2 bg-synthwave-bg-primary/30 rounded">
          <div className="text-synthwave-neon-cyan font-bold mb-1">Badge Counts:</div>
          <div className="text-white space-y-1">
            <div>workouts: <span className="text-synthwave-neon-pink">{context.newItemCounts.workouts}</span></div>
            <div>conversations: <span className="text-synthwave-neon-pink">{context.newItemCounts.conversations}</span></div>
            <div>memories: <span className="text-synthwave-neon-pink">{context.newItemCounts.memories}</span></div>
            <div>reports: <span className="text-synthwave-neon-pink">{context.newItemCounts.reports}</span></div>
          </div>
        </div>

        {/* Primary Nav Items */}
        <div className="p-2 bg-synthwave-bg-primary/30 rounded">
          <div className="text-synthwave-neon-cyan font-bold mb-1">Primary Nav (visible):</div>
          <div className="text-white space-y-1">
            {navigationItems.primary
              .filter(item => isItemVisible(item, context))
              .map(item => (
                <div key={item.id}>
                  {item.label}
                  {getItemBadge(item, context) && (
                    <span className="ml-2 text-synthwave-neon-pink">
                      [{formatBadgeCount(getItemBadge(item, context))}]
                    </span>
                  )}
                </div>
              ))
            }
          </div>
        </div>

        {/* Contextual Nav Items */}
        {context.hasCoachContext && (
          <div className="p-2 bg-synthwave-bg-primary/30 rounded">
            <div className="text-synthwave-neon-cyan font-bold mb-1">Contextual Nav (visible):</div>
            <div className="text-white space-y-1">
              {navigationItems.contextual
                .filter(item => isItemVisible(item, context))
                .map(item => (
                  <div key={item.id}>
                    {item.label}
                    {getItemBadge(item, context) && (
                      <span className="ml-2 text-synthwave-neon-pink">
                        [{formatBadgeCount(getItemBadge(item, context))}]
                      </span>
                    )}
                  </div>
                ))
              }
            </div>
          </div>
        )}

        {/* Helper Functions */}
        <div className="p-2 bg-synthwave-bg-primary/30 rounded">
          <div className="text-synthwave-neon-cyan font-bold mb-1">Helper Functions:</div>
          <div className="text-white space-y-1">
            <div>getHomeRoute: <span className="text-synthwave-neon-pink text-[10px]">{context.getHomeRoute()}</span></div>
            <div>getTrainingRoute: <span className="text-synthwave-neon-pink text-[10px]">{context.getTrainingRoute()}</span></div>
            <div>getProgressRoute: <span className="text-synthwave-neon-pink text-[10px]">{context.getProgressRoute()}</span></div>
          </div>
        </div>

        {/* Status */}
        <div className="text-center text-green-400 font-bold mt-2">
          ✅ Phase 1 Foundation Working!
        </div>
      </div>
    </div>
  );
};

export default NavigationTest;

