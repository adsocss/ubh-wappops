import type { IApiContext } from "./IApiContext";
import type { IUser } from "../../model/data-model";
import type { IPushSubscription } from "../../services/NotificationsService";
import { NotificationsService } from "../../services/NotificationsService";

/**
 * Web Push API endpoints for subscription management
 */
export class WebPushAPI {
    
    /**
     * Register a Web Push subscription for the authenticated user
     * POST /api/notifications/push/subscribe
     */
    public static async subscribe(ctx: IApiContext, user: IUser, request: Request): Promise<Response> {
        try {
            ctx.services.logger.logInfo(`🔔 [API] Web Push subscription request from user: ${user.username}`, 'NOTIFICATIONS');
            
            const subscriptionData = await request.json() as {
                subscription: IPushSubscription;
                userAgent?: string;
            };
            
            if (!subscriptionData.subscription || !subscriptionData.subscription.endpoint) {
                ctx.services.logger.logWarning(`🔔 [API] Invalid subscription data`, 'NOTIFICATIONS');
                return new Response(JSON.stringify({ 
                    error: 'Invalid subscription data' 
                }), { 
                    status: 400, 
                    headers: { 'Content-Type': 'application/json' } 
                });
            }
            
            const success = await ctx.services.notifications.registerPushSubscription(
                user, 
                subscriptionData.subscription, 
                subscriptionData.userAgent
            );
            
            if (success) {
                ctx.services.logger.logInfo(`🔔 [API] Web Push subscription registered successfully`, 'NOTIFICATIONS');
                return new Response(JSON.stringify({ 
                    success: true, 
                    message: 'Subscription registered successfully' 
                }), { 
                    status: 200, 
                    headers: { 'Content-Type': 'application/json' } 
                });
            } else {
                ctx.services.logger.logError(`🔔 [API] Failed to register Web Push subscription`, 'NOTIFICATIONS');
                return new Response(JSON.stringify({ 
                    error: 'Failed to register subscription' 
                }), { 
                    status: 500, 
                    headers: { 'Content-Type': 'application/json' } 
                });
            }
            
        } catch (error) {
            ctx.services.logger.logError(`🔔 [API] Error in Web Push subscription: ${error}`, 'NOTIFICATIONS');
            return new Response(JSON.stringify({ 
                error: 'Internal server error' 
            }), { 
                status: 500, 
                headers: { 'Content-Type': 'application/json' } 
            });
        }
    }

    /**
     * Unregister a Web Push subscription for the authenticated user
     * POST /api/notifications/push/unsubscribe
     */
    public static async unsubscribe(ctx: IApiContext, user: IUser, request: Request): Promise<Response> {
        try {
            ctx.services.logger.logInfo(`🔔 [API] Web Push unsubscription request from user: ${user.username}`, 'NOTIFICATIONS');
            
            const { endpoint } = await request.json() as { endpoint: string };
            
            if (!endpoint) {
                ctx.services.logger.logWarning(`🔔 [API] Missing endpoint for unsubscription`, 'NOTIFICATIONS');
                return new Response(JSON.stringify({ 
                    error: 'Missing endpoint' 
                }), { 
                    status: 400, 
                    headers: { 'Content-Type': 'application/json' } 
                });
            }
            
            const success = await ctx.services.notifications.unregisterPushSubscription(user, endpoint);
            
            if (success) {
                ctx.services.logger.logInfo(`🔔 [API] Web Push subscription unregistered successfully`, 'NOTIFICATIONS');
                return new Response(JSON.stringify({ 
                    success: true, 
                    message: 'Subscription unregistered successfully' 
                }), { 
                    status: 200, 
                    headers: { 'Content-Type': 'application/json' } 
                });
            } else {
                ctx.services.logger.logWarning(`🔔 [API] Web Push subscription not found for unregistration`, 'NOTIFICATIONS');
                return new Response(JSON.stringify({ 
                    error: 'Subscription not found' 
                }), { 
                    status: 404, 
                    headers: { 'Content-Type': 'application/json' } 
                });
            }
            
        } catch (error) {
            ctx.services.logger.logError(`🔔 [API] Error in Web Push unsubscription: ${error}`, 'NOTIFICATIONS');
            return new Response(JSON.stringify({ 
                error: 'Internal server error' 
            }), { 
                status: 500, 
                headers: { 'Content-Type': 'application/json' } 
            });
        }
    }

    /**
     * Get VAPID public key for client subscription setup
     * GET /api/notifications/push/vapid-key
     */
    public static async getVapidKey(ctx: IApiContext): Promise<Response> {
        try {
            ctx.services.logger.logDebug(`🔔 [API] VAPID public key request`, 'NOTIFICATIONS');
            
            const publicKey = ctx.services.notifications.getVAPIDPublicKey();
            
            if (publicKey) {
                return new Response(JSON.stringify({ 
                    publicKey 
                }), { 
                    status: 200, 
                    headers: { 'Content-Type': 'application/json' } 
                });
            } else {
                ctx.services.logger.logError(`🔔 [API] VAPID public key not configured`, 'NOTIFICATIONS');
                return new Response(JSON.stringify({ 
                    error: 'VAPID not configured' 
                }), { 
                    status: 500, 
                    headers: { 'Content-Type': 'application/json' } 
                });
            }
            
        } catch (error) {
            ctx.services.logger.logError(`🔔 [API] Error getting VAPID key: ${error}`, 'NOTIFICATIONS');
            return new Response(JSON.stringify({ 
                error: 'Internal server error' 
            }), { 
                status: 500, 
                headers: { 'Content-Type': 'application/json' } 
            });
        }
    }

    /**
     * Get debug information about push subscriptions (development only)
     * GET /api/notifications/push/debug
     */
    public static async getDebugInfo(ctx: IApiContext): Promise<Response> {
        try {
            // Simple check - if it's not explicitly production, allow debug
            const debugInfo = {
                totalUsers: ctx.services.notifications.getPushSubscriptionsCount(),
                subscriptions: ctx.services.notifications.getPushSubscriptionsDebugInfo()
            };

            return new Response(JSON.stringify(debugInfo), { 
                status: 200, 
                headers: { 'Content-Type': 'application/json' } 
            });
            
        } catch (error) {
            ctx.services.logger.logError(`🔔 [API] Error getting push debug info: ${error}`, 'NOTIFICATIONS');
            return new Response(JSON.stringify({ 
                error: 'Internal server error' 
            }), { 
                status: 500, 
                headers: { 'Content-Type': 'application/json' } 
            });
        }
    }

    /**
     * Test endpoint to manually send a push notification (development only)
     * POST /api/notifications/push/test
     */
    public static async sendTestNotification(ctx: IApiContext, user: IUser, request: Request): Promise<Response> {
        try {
            ctx.services.logger.logInfo(`🔔 [API] Test notification request from user: ${user.username}`, 'NOTIFICATIONS');
            
            const testData = await request.json() as {
                channelId?: string;
                title?: string;
                body?: string;
            };
            
            // Use a default channel if none specified
            const channelId = testData.channelId || 'tasks-1025-2';
            const title = testData.title || 'Test Notification';
            const body = testData.body || 'This is a test notification from the server';
            
            // Get user's notification channels to pick a valid one
            const channels = await NotificationsService.getNotificationsChannels(ctx, user);
            const userChannelIds = channels.map((c: any) => c.id);
            
            ctx.services.logger.logInfo(`🔔 [API] User has access to channels: [${userChannelIds.join(', ')}]`, 'NOTIFICATIONS');
            
            if (!userChannelIds.includes(channelId)) {
                return new Response(JSON.stringify({ 
                    error: `User does not have access to channel: ${channelId}`,
                    availableChannels: userChannelIds
                }), { 
                    status: 400, 
                    headers: { 'Content-Type': 'application/json' } 
                });
            }
            
            ctx.services.logger.logInfo(`🔔 [API] Sending test notification to channel: ${channelId}`, 'NOTIFICATIONS');
            
            // Send the test notification using the new public method
            const success = await ctx.services.notifications.sendTestPushNotification(channelId, title, body);
            
            if (success) {
                return new Response(JSON.stringify({ 
                    success: true, 
                    message: 'Test notification sent successfully',
                    channelId,
                    title,
                    body,
                    userChannels: userChannelIds.length
                }), { 
                    status: 200, 
                    headers: { 'Content-Type': 'application/json' } 
                });
            } else {
                return new Response(JSON.stringify({ 
                    error: 'Failed to send test notification'
                }), { 
                    status: 500, 
                    headers: { 'Content-Type': 'application/json' } 
                });
            }
            
        } catch (error) {
            ctx.services.logger.logError(`🔔 [API] Error sending test notification: ${error}`, 'NOTIFICATIONS');
            return new Response(JSON.stringify({ 
                error: 'Internal server error',
                details: error instanceof Error ? error.message : 'Unknown error'
            }), { 
                status: 500, 
                headers: { 'Content-Type': 'application/json' } 
            });
        }
    }
}
