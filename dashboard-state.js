'use strict';

const { MongoClient } = require('mongodb');

const MONGO_URI = process.env.MONGO_URI;
const DB_NAME = 'scanty_md_bot';

let mongoClient = null;
let db = null;

async function getDb() {
    if (!MONGO_URI) {
        throw new Error('MONGO_URI is missing');
    }

    if (!db) {
        mongoClient = new MongoClient(MONGO_URI);
        await mongoClient.connect();
        db = mongoClient.db(DB_NAME);
    }

    return db;
}

async function getStateCollection() {
    const database = await getDb();
    return database.collection('dashboard_state');
}

async function setDashboardState(data = {}) {
    const collection = await getStateCollection();

    await collection.updateOne(
        { _id: 'scanty-dashboard' },
        {
            $set: {
                ...data,
                updatedAt: Date.now()
            }
        },
        {
            upsert: true
        }
    );
}

async function getDashboardState() {
    const collection = await getStateCollection();

    const state = await collection.findOne({
        _id: 'scanty-dashboard'
    });

    if (!state) {
        return {
            status: 'Waiting for WhatsApp...',
            qr: null,
            expiresAt: null,
            pairingCode: null
        };
    }

    return {
        status:
            state.status ||
            'Waiting for WhatsApp...',

        qr:
            state.qr ||
            null,

        expiresAt:
            state.expiresAt ||
            null,

        pairingCode:
            state.pairingCode ||
            null
    };
}

async function createPairingRequest(phone) {
    const collection =
        await getStateCollection();

    const requestId =
        `${Date.now()}-${Math.random()
            .toString(36)
            .slice(2, 8)}`;

    await collection.updateOne(
        { _id: 'scanty-dashboard' },
        {
            $set: {
                pairingRequest: {
                    id: requestId,
                    phone: String(phone),
                    status: 'pending',
                    code: null,
                    error: null,
                    createdAt: Date.now()
                },

                pairingCode: null,

                updatedAt: Date.now()
            }
        },
        {
            upsert: true
        }
    );

    return requestId;
}

async function getPairingRequest() {
    const collection =
        await getStateCollection();

    const state =
        await collection.findOne({
            _id: 'scanty-dashboard'
        });

    return state?.pairingRequest || null;
}

async function updatePairingRequest(
    requestId,
    data = {}
) {
    const collection =
        await getStateCollection();

    await collection.updateOne(
        {
            _id: 'scanty-dashboard',
            'pairingRequest.id': requestId
        },
        {
            $set: {
                'pairingRequest.status':
                    data.status,

                'pairingRequest.code':
                    data.code || null,

                'pairingRequest.error':
                    data.error || null,

                'pairingRequest.updatedAt':
                    Date.now(),

                ...(data.code
                    ? {
                        pairingCode:
                            String(data.code)
                    }
                    : {})
            }
        }
    );
}

module.exports = {
    setDashboardState,
    getDashboardState,
    createPairingRequest,
    getPairingRequest,
    updatePairingRequest
};
