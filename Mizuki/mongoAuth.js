
'use strict';

const { MongoClient } = require('mongodb');

const {
    initAuthCreds,
    BufferJSON,
    proto
} = require('@whiskeysockets/baileys');

async function useMongoDBAuthState() {
    const uri = process.env.MONGO_URI;

    if (!uri) {
        throw new Error('MONGO_URI is missing from environment variables');
    }

    const dbName = process.env.MONGO_DB_NAME || 'scanty_md_bot';
    const sessionId = process.env.MONGO_SESSION_ID || 'scanty-md-bot';

    const client = new MongoClient(uri);

    await client.connect();

    const db = client.db(dbName);

    const authCollection = db.collection('whatsapp_auth');
    const keysCollection = db.collection('whatsapp_auth_keys');

    await keysCollection.createIndex(
        { sessionId: 1, type: 1, keyId: 1 },
        { unique: true }
    );

    const serialize = (value) =>
        JSON.stringify(value, BufferJSON.replacer);

    const deserialize = (value) =>
        JSON.parse(value, BufferJSON.reviver);

    const savedAuth = await authCollection.findOne({
        _id: sessionId
    });

    const creds = savedAuth && savedAuth.creds
        ? deserialize(savedAuth.creds)
        : initAuthCreds();

    const keys = {
        get: async (type, ids) => {
            const documents = await keysCollection.find({
                sessionId,
                type,
                keyId: { $in: ids }
            }).toArray();

            const stored = new Map(
                documents.map(doc => [doc.keyId, doc.value])
            );

            const result = {};

            for (const id of ids) {
                let value = stored.has(id)
                    ? deserialize(stored.get(id))
                    : undefined;

                if (type === 'app-state-sync-key' && value) {
                    value = proto.Message.AppStateSyncKeyData.fromObject(value);
                }

                result[id] = value;
            }

            return result;
        },

        set: async (data) => {
            const operations = [];

            for (const category in data) {
                const categoryData = data[category];

                for (const id in categoryData) {
                    const value = categoryData[id];

                    if (value) {
                        operations.push({
                            updateOne: {
                                filter: {
                                    sessionId,
                                    type: category,
                                    keyId: id
                                },
                                update: {
                                    $set: {
                                        value: serialize(value),
                                        updatedAt: new Date()
                                    }
                                },
                                upsert: true
                            }
                        });
                    } else {
                        operations.push({
                            deleteOne: {
                                filter: {
                                    sessionId,
                                    type: category,
                                    keyId: id
                                }
                            }
                        });
                    }
                }
            }

            if (operations.length) {
                await keysCollection.bulkWrite(operations);
            }
        }
    };

    const saveCreds = async () => {
        await authCollection.updateOne(
            { _id: sessionId },
            {
                $set: {
                    creds: serialize(creds),
                    updatedAt: new Date()
                }
            },
            { upsert: true }
        );
    };

    console.log('MongoDB WhatsApp authentication storage ready');
    console.log('MongoDB database:', dbName);

    return {
        state: {
            creds,
            keys
        },
        saveCreds,
        close: async () => {
            await client.close();
        }
    };
}

module.exports = { useMongoDBAuthState };
