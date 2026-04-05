/**
 * Global Event Map
 * Defines all pub-sub event constants to avoid magic strings throughout the application.
 */
export const EventMap = {
    PASTOR: {
        UPDATED: 'PASTOR_UPDATED',
        CREATED: 'PASTOR_CREATED',
        DELETED: 'PASTOR_DELETED'
    },
    ASSIGNMENT: {
        UPDATED: 'ASSIGNMENT_UPDATED',
        CREATED: 'ASSIGNMENT_CREATED',
        DELETED: 'ASSIGNMENT_DELETED'
    },
    CHURCH: {
        UPDATED: 'CHURCH_UPDATED'
    },
    DISCIPLE: {
        UPDATED: 'DISCIPLE_UPDATED'
    },
    DISTRICT: {
        UPDATED: 'DISTRICT_UPDATED'
    },
    APP: {
        STATE_READY: 'APP_STATE_READY',
        STATE_UPDATED: 'APP_STATE_UPDATED'
    }
};
