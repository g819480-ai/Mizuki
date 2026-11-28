'use strict';

const { MongoClient } = require('mongodb');

const MONGO_URI = process.env.MONGO_URI;
const DB_NAME = 'scanty_md_bot';

let client;
let db;
let collection;

async function getCollection() {
    if (!MONGO_URI) {
        throw new Error('MONGO_URI is missing');
    }

    if (!collection) {
        client = new MongoClient(MONGO_URI);
        await client.connect();

        db = client.db(DB_NAME);
        collection = db.collection('dashboard_state');
    }

    return collection;
}

async function setDashboardState(data = {}) {
    const col = await getCollection();

    await col.updateOne(
        { _id: 'scanty-dashboard' },
        {
            $set: {
                ...data,
                updatedAt: Date.now()
            }
        },
        { upsert: true }
    );
}

async function getDashboardState() {
    const col = await getCollection();

    const state = await col.findOne({
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

async function clearDashboardState() {
    await setDashboardState({
        status: 'Waiting for WhatsApp...',
        qr: null,
        expiresAt: null,
        pairingCode: null
    });
}

module.exports = {
    setDashboardState,
    getDashboardState,
    clearDashboardState
};
